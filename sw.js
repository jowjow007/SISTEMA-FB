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
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== CACHE_CDN).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
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
