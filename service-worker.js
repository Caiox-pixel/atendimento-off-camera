const CACHE_NAME = 'tarefa-cache-v1';
const FILES_TO_CACHE = ['./', './index.html', './style.css', './app.js', './manifest.json', './icon-192.svg', './icon-512.svg', './service-worker.js'];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp =>
      resp || fetch(event.request).then(r => {
        const res = r.clone();
        if (event.request.method === 'GET' && r && r.status === 200) {
          caches.open(CACHE_NAME).then(c => c.put(event.request, res));
        }
        return r;
      })
    ).catch(() => caches.match('./index.html'))
  );
});
