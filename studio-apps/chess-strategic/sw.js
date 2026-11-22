const prefix = "ljv-portfolio-chess-strategic-";
const cacheName = prefix + "43dfe0f085";
const assets = [
  "./app.js",
  "./assets/apple-touch-icon.png",
  "./assets/favicon.png",
  "./assets/favicon.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./index.html",
  "./manifest.webmanifest",
  "./preview.webp",
  "./pwa-register.js",
  "./pwa.js",
  "./strategies.js",
  "./styles.css"
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(prefix) && key !== cacheName).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.registration.scope)) return;
  event.respondWith(caches.open(cacheName).then(async cache => {
    const url = new URL(event.request.url);
    if (url.pathname.endsWith('/')) url.pathname += 'index.html';
    return await cache.match(url, {ignoreSearch:true}) || fetch(event.request);
  }));
});
