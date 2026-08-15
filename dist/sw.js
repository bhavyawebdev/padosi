/* LocalPulse service worker — network-first, cache fallback.
   Registered only in production builds (see src/main.tsx), so it never
   interferes with the Vite dev server. Bump CACHE when deploying a new
   build so stale entries are purged on activate. */
// Known limitation: we don't precache the app shell at install time, so a
// first load while fully offline won't work — network-first + cache-after-load
// only helps repeat visits. Acceptable for this scope; add cache.addAll()
// in the install handler if true offline-first is ever required.
const CACHE = "localpulse-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("localpulse-") && key !== CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches
            .open(CACHE)
            .then((cache) => cache.put(request, copy))
            .catch(() => {});
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || Response.error()),
      ),
  );
});
