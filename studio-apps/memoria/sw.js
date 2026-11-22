const prefix = "ljv-portfolio-memoria-";
const cacheName = prefix + "38a4e5de36";
const assets = [
  "./decks.html",
  "./icon-192.png",
  "./icon-512.png",
  "./index.html",
  "./learn.html",
  "./main.js",
  "./manifest.webmanifest",
  "./pdf.html",
  "./preview.webp",
  "./pwa-register.js",
  "./quests.html",
  "./settings.html",
  "./stats.html",
  "./style.css"
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
