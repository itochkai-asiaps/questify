const CACHE_NAME = "questify-v2";
const SHELL_URLS = ["/", "/dashboard", "/tasks", "/plans"];

// Install: cache the app shell and skip waiting
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(SHELL_URLS);
      await self.skipWaiting();
    })(),
  );
});

// Activate: claim clients and clean ALL old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      // Re-cache shell after clearing
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(SHELL_URLS);
    })(),
  );
});

// Fetch: network-first always — Next.js chunks are content-hashed,
// so each deploy has unique filenames. Caching old JS = broken app.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // Cache-first for static images/fonts only (never change)
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf)(\?.*)?$/)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Network-first for everything else (JS, CSS, navigation, API)
  event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response("Offline", { status: 503 });
  }
}
