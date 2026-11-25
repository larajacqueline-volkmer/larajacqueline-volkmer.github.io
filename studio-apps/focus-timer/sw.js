const CACHE_NAME = "flow-focus-timer-by-ljv-cache-studio-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./hourglass.webp",
  "./icon-32.png",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("flow-focus-timer-by-ljv-cache-") && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  if (!isSameOrigin) return;

  const isHtmlRequest = event.request.mode === "navigate" || event.request.headers.get("accept")?.includes("text/html");

  if (isHtmlRequest) {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put("./index.html", networkResponse.clone());
        return networkResponse;
      } catch {
        return (await caches.match(event.request)) || (await caches.match("./index.html"));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cachedResponse = await caches.match(event.request);
    if (cachedResponse) return cachedResponse;

    const networkResponse = await fetch(event.request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(event.request, networkResponse.clone());
    return networkResponse;
  })());
});
