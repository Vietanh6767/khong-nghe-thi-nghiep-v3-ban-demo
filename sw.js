const CACHE = "khong-nghe-thi-nghiep-v5";
const THREE = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      await cache.addAll(FILES);

      // Three.js là tài nguyên bổ sung; nếu CDN không truy cập được,
      // vẫn có thể cài Service Worker cho các file cục bộ.
      try {
        await cache.add(new Request(THREE, { mode: "cors" }));
      } catch (error) {
        console.warn("Không lưu được Three.js để dùng offline:", error);
      }
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isThree = request.url === THREE;

  if (!sameOrigin && !isThree) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put("./index.html", copy));
          return response;
        })
        .catch(async () => {
          return (
            await caches.match("./index.html") ||
            await caches.match("./")
          );
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
