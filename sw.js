const CACHE_NAME = 'logic-cache-v2'; // เปลี่ยนเลขนี้ทุกครั้งที่อัปเดตไฟล์
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './script.js'
];

// ติดตั้ง Service Worker และเก็บไฟล์ในแคช
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// ดัก fetch ให้โหลดจากแคชก่อน
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// ลบแคชเก่าที่ไม่ใช้แล้ว
self.addEventListener('activate', (event) => {
  const keep = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => !keep.includes(key) && caches.delete(key)))
    )
  );
});
