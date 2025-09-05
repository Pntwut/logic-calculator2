// ===============================================
// LogicCalc Service Worker (sw.js) – Ready to use
// - เปลี่ยนเลขเวอร์ชันทุกครั้งที่ deploy
// - HTML: network-first
// - Static assets: stale-while-revalidate
// - รองรับปุ่ม "อัปเดตตอนนี้" (SKIP_WAITING)
// ===============================================

// ✅ เปลี่ยนเลขเวอร์ชันทุกครั้งที่อัปเดตไฟล์ เพื่อบังคับล้างแคชเก่า
const CACHE_STATIC = 'lc-static-v1.0.13';

// ไฟล์พื้นฐานที่ควรแคชไว้ล่วงหน้า
const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ติดตั้ง: แคชไฟล์พื้นฐาน
self.addEventListener('install', (event) => {
  self.skipWaiting(); // ลงปุ๊บพร้อมรอ activate
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

// เปิดใช้งาน: ลบแคชเก่าทิ้ง และคุมหน้าให้เร็วที่สุด
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_STATIC ? caches.delete(k) : null)))
    ).then(() => self.clients.claim())
  );
});

// รับคำสั่งจากหน้าเว็บ (เช่น "อัปเดตตอนนี้")
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    // ข้าม waiting → ไป activate ทันที
    self.skipWaiting();
  }
});

// กลยุทธ์หลัก:
// - HTML (นำทาง/ขอ text/html) = network-first (จะได้เห็นเวอร์ชันล่าสุดไว)
// - ไฟล์คงที่ (CSS/JS/รูป/manifest) = stale-while-revalidate (โหลดเร็ว + อัปเดตตามหลัง)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const accept = req.headers.get('accept') || '';

  // จัดการหน้า HTML / การนำทาง
  const isHTML = req.mode === 'navigate' || accept.includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // เก็บสำเนาไว้ใช้ตอนออฟไลน์
          const copy = res.clone();
          caches.open(CACHE_STATIC).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          // ออฟไลน์: ให้ไฟล์ในแคชก่อน หรือ index.html เป็น fallback
          caches.match(req).then((c) => c || caches.match('./index.html'))
        )
    );
    return;
  }

  // จัดการไฟล์คงที่ (CSS / JS / รูป / manifest)
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          // เก็บของใหม่ลงแคช (ถ้าสำเร็จ)
          caches.open(CACHE_STATIC).then((c) => c.put(req, networkRes.clone()));
          return networkRes;
        })
        .catch(() => cached); // ออฟไลน์: ใช้ที่มีในแคช

      // ถ้ามีของในแคชแล้ว ส่งก่อน → เร็ว
      return cached || fetchPromise;
    })
  );
});
