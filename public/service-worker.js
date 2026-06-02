const CACHE_NAME = 'stockflow-manager-v1';
const OFFLINE_URLS = ['/manager.html', '/style.css', '/manager.js', '/samples.js', '/viewer.js', '/admin.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      try {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(()=>{});
      } catch (e) {}
      return res;
    }).catch(()=> caches.match('/manager.html')))
  );
});
