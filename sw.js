const CACHE_NAME = "falaj-app-v1";

const FILES_TO_CACHE = [
  "./",
  "./falaj_app.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// تثبيت الخدمة
self.addEventListener("install", (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// تفعيل الخدمة
self.addEventListener("activate", (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

// جلب الموارد
self.addEventListener("fetch", (evt) => {
  evt.respondWith(
    caches.match(evt.request).then((response) => {
      return response || fetch(evt.request);
    })
  );
});
