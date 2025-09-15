// เปลี่ยนเลขเวอร์ชันทุกครั้งที่แก้ไฟล์ (สำคัญมาก)
const CACHE_STATIC = "lc-static-v1.0.0";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./styles.css",
  "./script.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

// ติดตั้ง: แคชไฟล์พื้นฐาน
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_STATIC).then((c) => c.addAll(PRECACHE_URLS)));
});

// เปิดใช้งาน: ลบแคชเก่า + ควบคุมลูกค้าทันที
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((k) => (k !== CACHE_STATIC ? caches.delete(k) : Promise.resolve())))
      )
      .then(() => self.clients.claim())
  );
});

// กลยุทธ์:
// - หน้า HTML → network-first (ได้เวอร์ชันใหม่ไว)
// - ไฟล์ static อื่น ๆ → stale-while-revalidate (เร็ว + อัปเดตตามหลัง)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const accept = req.headers.get("accept") || "";

  // HTML
  if (req.mode === "navigate" || accept.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_STATIC).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  // อื่น ๆ
  event.respondWith(
    caches.match(req).then((cacheRes) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          caches.open(CACHE_STATIC).then((c) => c.put(req, networkRes.clone()));
          return networkRes;
        })
        .catch(() => cacheRes);
      return cacheRes || fetchPromise;
    })
  );
});

// รับคำสั่งข้ามคิวจากหน้าเว็บ
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
