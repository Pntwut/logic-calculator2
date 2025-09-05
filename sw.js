// เปลี่ยนเลขเวอร์ชันทุกครั้งที่อัปเดตไฟล์ เพื่อบังคับล้างแคชเก่า
const CACHE_STATIC = 'lc-static-v1.0.4';

const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json'
];

// ================== ฟัง message จากหน้าเว็บ ==================
// ใช้กับปุ่ม "อัปเดตตอนนี้" → ให้ service worker ใหม่ข้าม waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ================== Install ==================
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

// ================== Activate ==================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_STATIC && caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// ================== Fetch strategy ==================
// - HTML → network-first (เห็นไฟล์ล่าสุดไว)
// - CSS/JS/รูป → stale-while-revalidate (โหลดเร็ว อัปเดตตามหลัง)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const accept = req.headers.get('accept') || '';

  // จัดการหน้า HTML
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

  // จัดการไฟล์คงที่ (CSS/JS/รูป)
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



