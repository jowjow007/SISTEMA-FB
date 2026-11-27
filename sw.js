// Service worker do Portal Fonseca e Braga.
// Estrategia "network-first": sempre busca a versao mais nova no servidor;
// so usa a copia salva (cache) quando o celular esta sem internet.
// Isso garante que o app atualiza sozinho a cada alteracao publicada no site,
// sem precisar reinstalar nada.

// v4 (revisão de segurança, 01/11/2026): trocar o nome faz o "activate" apagar o cache antigo, que podia guardar
// cópias offline das páginas de Números e Condomínios com dados de clientes (versões anteriores do portal).
const CACHE_NAME = 'portal-fb-cache-v5';
const OFFLINE_FALLBACK = './index.html';
const CACHE_CDN = 'portal-fb-cdn-v1';
const CDN_FIXOS = [
  'https://www.gstatic.com/firebasejs/',
  'https://cdnjs.cloudflare.com/ajax/libs/',
  'https://cdn.jsdelivr.net/npm/',
  'https://fonts.googleapis.com/css',
  'https://fonts.gstatic.com/s/'
];

self.addEventListener('install', () => {
  // Não ativa sozinho: fica "esperando" até o usuário clicar em "Atualizar"
  // no Portal (veja o botão de atualização em index.html). Isso evita trocar
  // o app debaixo do usuário no meio de uma tarefa.
});

// App para Windows: depois do login, o portal pede para guardar todas as ferramentas, para abrirem sem internet
// mesmo as que a pessoa ainda não abriu. (Os dados não ficam aqui: ficam no cache do Firestore, ligado só no app.)
const FERRAMENTAS = ['academia-teste', 'aniversariantes', 'assistente-ia', 'calculadoras', 'chat', 'cobrancas', 'condominios',
  'conferencia-emails', 'contratos', 'documentos', 'gestao', 'gmail', 'matriz-demandas', 'minhas-anotacoes', 'noticias',
  'numeros-escritorio', 'organograma', 'perfil', 'peticoes', 'pop', 'remuneracao', 'sessoes-julgamento', 'sistemas',
  'sugestoes', 'treinamentos'];
const PAGINAS_EXTRAS = ['./index.html', './', './firebase-config.js', './comunicados.js', './contrato-associacao.js', './manifest.json',
  './tools/contratos/associacao.html', './tools/contratos/associacao-documento.html', './tools/documentos/historico.html',
  './tools/gestao/termo-patrimonio.html', './tools/peticoes/historico.html', './assets/timbrado-bg.png'];
function guardarParaOffline() {
  const lista = PAGINAS_EXTRAS.slice();
  FERRAMENTAS.forEach((f) => { lista.push('./tools/' + f + '/index.html', './tools/' + f + '/'); });
  return caches.open(CACHE_NAME).then((cache) => Promise.all(lista.map((u) =>
    fetch(new Request(u, { cache: 'reload' })).then((res) => { if (res && res.ok) return cache.put(u, res); }).catch(() => {})
  )));
}

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.tipo === 'guardar-para-offline') event.waitUntil(guardarParaOffline());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== CACHE_CDN && k !== CACHE_MIDIA).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fotos e áudios do Chat (26/11/2026): o que já foi aberto fica guardado neste aparelho e abre sem internet
// (app do Windows e celular). Só a pasta chat/ do Storage; guarda até MIDIA_MAX arquivos (os mais antigos saem).
const CACHE_MIDIA = 'portal-fb-chat-midia-v1';
const MIDIA_MAX = 400;
function ehMidiaChat(url) {
  return url.hostname === 'firebasestorage.googleapis.com' && /\/o\/chat%2F/i.test(url.pathname) && url.searchParams.get('alt') === 'media';
}
function podarMidia(cache) {
  return cache.keys().then((ks) => Promise.all(ks.slice(0, Math.max(0, ks.length - MIDIA_MAX)).map((k) => cache.delete(k)))).catch(() => null);
}
// áudio pede pedaços (Range): responde o pedaço a partir do arquivo inteiro guardado
function pedacoDe(res, range) {
  return res.arrayBuffer().then((buf) => {
    const m = /bytes=(\d*)-(\d*)/.exec(range || '');
    const total = buf.byteLength;
    let ini = m && m[1] !== '' ? parseInt(m[1], 10) : 0, fim = m && m[2] !== '' ? parseInt(m[2], 10) : total - 1;
    if (m && m[1] === '' && m[2] !== '') { ini = Math.max(0, total - parseInt(m[2], 10)); fim = total - 1; }
    fim = Math.min(fim, total - 1);
    return new Response(buf.slice(ini, fim + 1), { status: 206, statusText: 'Partial Content', headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream', 'Content-Range': 'bytes ' + ini + '-' + fim + '/' + total,
      'Content-Length': String(fim - ini + 1), 'Accept-Ranges': 'bytes' } });
  });
}
function midiaChat(req) {
  const chave = req.url, range = req.headers.get('range');
  return caches.open(CACHE_MIDIA).then((cache) => cache.match(chave).then((guardado) => {
    if (guardado) return range ? pedacoDe(guardado, range) : guardado;
    return fetch(chave, { mode: 'cors', credentials: 'omit' }).then((res) => {
      if (!res || !res.ok) return res;
      return cache.put(chave, res.clone()).then(() => { podarMidia(cache); return range ? pedacoDe(res, range) : res; });
    }).catch(() => fetch(req));
  })).catch(() => fetch(req));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (ehMidiaChat(url)) { event.respondWith(midiaChat(req)); return; }
  // Bibliotecas de CDN com versão fixa no endereço (Firebase, html2pdf, jsPDF, fontes): guardadas na primeira vez,
  // para o portal abrir sem internet (app para Windows). O endereço muda quando a versão muda, então não envelhecem.
  if (CDN_FIXOS.some((p) => req.url.indexOf(p) === 0)) {
    event.respondWith(
      caches.open(CACHE_CDN).then((cache) => cache.match(req).then((cached) => cached || fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      })))
    );
    return;
  }
  if (url.origin !== self.location.origin) return; // nao mexe em ferramentas/embeds de outros dominios
  // vídeos (Treinamentos e comunicados) vão direto à rede: são grandes e chegam em pedaços (Range/206)
  if (req.destination === 'video' || req.destination === 'audio' || /\.(mp4|webm|m4v)$/i.test(url.pathname)) return;

  // 'reload' ignora o cache HTTP do navegador e força ir buscar no servidor -
  // sem isso, o fetch() abaixo podia ser satisfeito por uma cópia guardada
  // pelo próprio navegador (o GitHub Pages manda guardar por 10 minutos),
  // fazendo o app parecer não ter atualizado mesmo já publicado o novo HTML.
  const reqFresca = new Request(req, { cache: 'reload' });

  // Imagens (logos, fundos, ícones) quase nunca mudam: saem do cache na hora e são
  // atualizadas em segundo plano. Antes até a logomarca era baixada de novo a cada
  // abertura, o que deixava a entrada lenta no celular. HTML e scripts continuam
  // "network-first" (sempre a versão publicada mais nova).
  if (req.destination === 'image' || /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => cache.match(req).then((cached) => {
        const rede = fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => cached);
        return cached || rede;
      }))
    );
    return;
  }

  event.respondWith(
    fetch(reqFresca)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      // sem internet: a cópia guardada; as abas abrem com "?_v=…" e outros parâmetros que não mudam o arquivo
      .catch(() => caches.match(req).then((cached) => cached || caches.match(req, { ignoreSearch: true }))
        .then((cached) => cached || (req.mode === 'navigate' ? caches.match(OFFLINE_FALLBACK) : undefined)))
  );
});

// ---------- Notificações do Chat (26/11/2026) ----------
// O Worker portal-fb-push manda pelo Firebase Cloud Messaging só dados (título, texto, conversa, link);
// aqui o celular mostra a notificação. Uma notificação por conversa (a nova substitui a anterior e toca de novo).
self.addEventListener('push', (event) => {
  let d = {};
  try { const j = event.data ? event.data.json() : {}; d = j.data || j || {}; } catch (e) { d = {}; }
  const titulo = d.title || 'Portal FB';
  const opcoes = {
    body: d.body || 'Nova mensagem no Chat',
    icon: './assets/icons/icon-192.png',
    badge: './assets/icons/badge-96.png',
    tag: d.tag || 'chat',
    renotify: true,
    data: { link: d.link || './', conversaId: d.conversaId || '' }
  };
  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const dados = event.notification.data || {};
  const conversaId = dados.conversaId || '';
  const link = new URL(dados.link || './', self.location.href).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
    // cada ferramenta do portal é um quadro (iframe) que também aparece aqui: a mensagem tem de ir para a janela
    // principal, senão ela só volta para a frente na tela em que estava (era o caso: abria na página inicial)
    const aberto = lista.find((c) => c.url.indexOf(self.location.origin) === 0 && c.frameType !== 'nested' && c.url.indexOf('/tools/') < 0);
    if (aberto) {
      return aberto.focus().catch(() => null).then(() => { aberto.postMessage({ fbAbrirConversa: conversaId }); });
    }
    return self.clients.openWindow(link);
  }));
});
