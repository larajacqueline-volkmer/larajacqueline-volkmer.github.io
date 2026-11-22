const prefix = "ljv-portfolio-vocara-";
const cacheName = prefix + "15564b7b59";
const assets = [
  "./add.html",
  "./apple-touch-icon.png",
  "./favicon-32.png",
  "./file.html",
  "./index.html",
  "./list.html",
  "./manifest.json",
  "./pwa-register.js",
  "./script.js",
  "./style.css",
  "./vocara_192.png",
  "./vocara_any_512.png",
  "./vocara_maskable_512.png"
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
