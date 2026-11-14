// عند نشر نسخة جديدة: غيّر رقم الإصدار هنا ليظهر للمستخدمين شريط "يوجد تحديث جديد"
const VERSION = "2.2.0";
const CACHE = "falaj-batin-" + VERSION;
const RUNTIME = "falaj-batin-runtime";

const ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];
// مكتبات وخطوط خارجية نحفظها لتعمل الواجهة بدون إنترنت
const CDN_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com", "www.gstatic.com"];

self.addEventListener("install", (evt) => {
  evt.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    // الانتقال من النسخة الأولى (falaj-app-v1) يتم مباشرة لأنها لا تعرض شريط التحديث
    const keys = await caches.keys();
    if (keys.includes("falaj-app-v1")) self.skipWaiting();
  })());
});

self.addEventListener("activate", (evt) => {
  evt.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE && k !== RUNTIME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (evt) => {
  if (evt.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", (evt) => {
  const req = evt.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // صفحة التطبيق: من الشبكة أولاً (لتصل التعديلات فوراً)، ومن الذاكرة عند انقطاع الإنترنت
  if (req.mode === "navigate") {
    evt.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put("./index.html", res.clone());
        return res;
      } catch (e) {
        return (await caches.match("./index.html")) || (await caches.match("./"));
      }
    })());
    return;
  }

  // ملفات التطبيق نفسه: من الذاكرة مع تحديثها في الخلفية
  if (url.origin === self.location.origin) {
    evt.respondWith((async () => {
      const cached = await caches.match(req);
      const net = fetch(req).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || net;
    })());
    return;
  }

  // الخطوط ومكتبات Firebase: من الذاكرة إن وُجدت
  if (CDN_HOSTS.includes(url.hostname)) {
    evt.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res.ok || res.type === "opaque") (await caches.open(RUNTIME)).put(req, res.clone());
      return res;
    })());
  }
  // أي طلب آخر (مثل قاعدة البيانات) يمر للشبكة مباشرة
});
