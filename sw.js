const CACHE_STATIC = 'lc-static-v1.0.5';
const PRECACHE_URLS = ['./','./index.html','./styles.css','./script.js','./pwa.js','./manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_STATIC).then(cache => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_STATIC && caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const accept = req.headers.get('accept') || '';
  if (req.mode === 'navigate' || accept.includes('text/html')) {
    event.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(req).then(res => res || fetch(req).then(net => {
    caches.open(CACHE_STATIC).then(c => c.put(req, net.clone())); return net;
  })));
});
