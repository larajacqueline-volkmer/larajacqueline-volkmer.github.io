const prefix = "ljv-portfolio-studytown3d-";
const cacheName = prefix + "4c4dc443fc";
const assets = [
  "./app.js",
  "./assets/avatars/Car.png",
  "./assets/avatars/GirlAvatar.png",
  "./assets/avatars/GoldenTrophy.png",
  "./assets/avatars/Penguin.png",
  "./assets/avatars/PrincessPeach.png",
  "./assets/avatars/Robot.png",
  "./assets/avatars/TrophyPinkball.png",
  "./assets/textures/glass_facade.png",
  "./assets/textures/grassland_panorama.png",
  "./assets/textures/neon_room.png",
  "./assets/textures/paving_herringbone.png",
  "./assets/textures/roof.png",
  "./config.js",
  "./data/modules.json",
  "./icon-192.png",
  "./icon-512.png",
  "./index.html",
  "./manifest.webmanifest",
  "./pwa-register.js",
  "./styles.css",
  "./vendor/OrbitControls.js",
  "./vendor/three.min.js"
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
