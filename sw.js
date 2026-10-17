// Guarda o app no aparelho para funcionar sem internet.
// Ao publicar uma nova versão, aumente o número abaixo.
const VERSION = 'meu-closet-v9';
const FILES = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/db.js', './js/store.js', './js/ui.js', './js/util.js', './js/catalog.js',
  './js/color.js', './js/images.js', './js/zip.js', './js/ficha.js', './js/suggest.js', './js/share.js', './js/describe.js', './js/config.js', './js/remote.js', './js/weather.js', './js/fun.js',
  './js/views/armario.js', './js/views/peca.js', './js/views/looks.js', './js/views/planejar.js',
  './js/views/hub.js', './js/views/backup.js', './js/views/lote.js', './js/views/conferir.js', './js/views/painel.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Usa o que está guardado e, em segundo plano, busca a versão nova.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // avisos e painel administrativo sempre vêm da internet, nunca do cache
  if (/\/(avisos\.json|admin\.html)$/.test(url.pathname)) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request, { cache: 'no-cache' }).then(r => { if (r.ok) cache.put(e.request, r.clone()); return r; }).catch(() => cached);
    return cached || net;
  }));
});
