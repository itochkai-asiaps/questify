const CACHE_NAME = "questify-v1";
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

// Activate: claim clients and clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        }),
      );
    })(),
  );
});

// Fetch: network-first for navigation/API, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and non-http(s) requests
  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // Cache-first for static assets (images, fonts, scripts, styles)
  if (
    url.pathname.match(
      /\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|css|js)(\?.*)?$/,
    )
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Network-first for navigation and API calls
  if (
    request.mode === "navigate" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/")
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first for everything else (shell pages)
  event.respondWith(cacheFirst(request));
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
