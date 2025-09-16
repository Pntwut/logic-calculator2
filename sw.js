// เปลี่ยนเลขเวอร์ชันทุกครั้งที่อัปเดต เพื่อเคลียร์แคชเก่า
const CACHE_STATIC = 'lc-static-v1.0.6';

const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './pwa.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_STATIC).then(cache => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_STATIC && caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const accept = req.headers.get('accept') || '';

  // HTML → network-first
  if (req.mode === 'navigate' || accept.includes('text/html')) {
    event.respondWith(
      fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE_STATIC).then(c => c.put(req, clone));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static → stale-while-revalidate
  event.respondWith(
    caches.match(req).then(cacheRes => {
      const fetchPromise = fetch(req).then(net => {
        caches.open(CACHE_STATIC).then(c => c.put(req, net.clone()));
        return net;
      }).catch(() => cacheRes);
      return cacheRes || fetchPromise;
    })
  );
});
