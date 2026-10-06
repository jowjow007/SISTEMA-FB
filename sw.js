// Service worker do Portal Fonseca e Braga.
// Estrategia "network-first": sempre busca a versao mais nova no servidor;
// so usa a copia salva (cache) quando o celular esta sem internet.
// Isso garante que o app atualiza sozinho a cada alteracao publicada no site,
// sem precisar reinstalar nada.

const CACHE_NAME = 'portal-fb-cache-v2';
const OFFLINE_FALLBACK = './index.html';

self.addEventListener('install', () => {
  // Não ativa sozinho: fica "esperando" até o usuário clicar em "Atualizar"
  // no Portal (veja o botão de atualização em index.html). Isso evita trocar
  // o app debaixo do usuário no meio de uma tarefa.
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // nao mexe em ferramentas/embeds de outros dominios

  // 'reload' ignora o cache HTTP do navegador e força ir buscar no servidor -
  // sem isso, o fetch() abaixo podia ser satisfeito por uma cópia guardada
  // pelo próprio navegador (o GitHub Pages manda guardar por 10 minutos),
  // fazendo o app parecer não ter atualizado mesmo já publicado o novo HTML.
  const reqFresca = new Request(req, { cache: 'reload' });

  event.respondWith(
    fetch(reqFresca)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || (req.mode === 'navigate' ? caches.match(OFFLINE_FALLBACK) : undefined)))
  );
});
