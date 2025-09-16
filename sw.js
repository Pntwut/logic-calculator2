// เปลี่ยนเลขเวอร์ชันทุกครั้งที่อัปเดตไฟล์ เพื่อบังคับล้างแคชเก่า
const CACHE_STATIC = 'lc-static-v1.0.11';

const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json'
];

// ติดตั้ง: แคชไฟล์พื้นฐาน
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

// เปิดใช้งาน: ลบแคชเก่า และยึดควบคุมทันที
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_STATIC && caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// กลยุทธ์หลัก:
// - HTML = network-first (จะได้เห็นเวอร์ชันล่าสุดไว)
// - ไฟล์คงที่ (CSS/JS/รูป) = stale-while-revalidate
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const accept = req.headers.get('accept') || '';

  if (req.mode === 'navigate' || accept.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE_STATIC).then(cache => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cacheRes => {
      const fetchPromise = fetch(req).then(networkRes => {
        caches.open(CACHE_STATIC).then(cache => cache.put(req, networkRes.clone()));
        return networkRes;
      }).catch(() => cacheRes);
      return cacheRes || fetchPromise;
    })
  );
});

