const CACHE_STATIC = 'lc-static-v1.0.0';

const PRECACHE_URLS = [
  './','./index.html','./styles.css','./script.js','./manifest.json',
  './icon-192.png','./icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_STATIC).then(c=>c.addAll(PRECACHE_URLS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_STATIC?caches.delete(k):Promise.resolve())))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const accept = req.headers.get('accept') || '';

  if (req.mode === 'navigate' || accept.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then(res => { caches.open(CACHE_STATIC).then(c=>c.put(req,res.clone())); return res; })
        .catch(()=>caches.match(req).then(c=>c||caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cacheRes=>{
      const fetchPromise = fetch(req).then(networkRes=>{
        caches.open(CACHE_STATIC).then(c=>c.put(req, networkRes.clone()));
        return networkRes;
      }).catch(()=>cacheRes);
      return cacheRes || fetchPromise;
    })
  );
});
