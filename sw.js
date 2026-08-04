// Service worker do Portal Fonseca e Braga.
// Estrategia "network-first": sempre busca a versao mais nova no servidor;
// so usa a copia salva (cache) quando o celular esta sem internet.
// Isso garante que o app atualiza sozinho a cada alteracao publicada no site,
// sem precisar reinstalar nada.

const CACHE_NAME = 'portal-fb-cache-v1';
const OFFLINE_FALLBACK = './index.html';

self.addEventListener('install', () => {
  self.skipWaiting();
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

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || (req.mode === 'navigate' ? caches.match(OFFLINE_FALLBACK) : undefined)))
  );
});
