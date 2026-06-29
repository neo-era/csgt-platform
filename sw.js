/* Service Worker chung cho CSGT Platform (gộp khaosat + dentat)
 * Chiến lược kế thừa từ 2 dự án cũ:
 *  - HTML/JS app: network-first (luôn lấy code mới, fallback cache khi offline)
 *  - Map tiles: cache-first, giới hạn số lượng
 *  - CDN libs: cache-first
 *  - docs.google.com / script.google.com: KHÔNG cache (luôn lấy dữ liệu mới)
 */
const VERSION   = 'csgt-v5';
const SHELL     = 'csgt-shell-' + VERSION;
const TILES     = 'csgt-tiles-' + VERSION;
const LIBS      = 'csgt-libs-'  + VERSION;
const TILE_MAX  = 300;

const SHELL_ASSETS = [
  './', './index.html', './manifest.json',
  './core/core-config.js', './core/core-sync.js', './core/core-auth.js',
  './core/core-map.js', './core/core-image.js', './core/core-geo.js', './core/core-export.js',
  './khaosat/index.html', './dentat/index.html',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > max) await cache.delete(keys[0]);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Dữ liệu động: không cache
  if (url.hostname.includes('docs.google.com') || url.hostname.includes('script.google.com')) {
    return; // để trình duyệt fetch trực tiếp
  }

  // Map tiles: cache-first, giới hạn
  if (/tile|google\.com\/vt|basemaps\.cartocdn/.test(url.href)) {
    e.respondWith(
      caches.open(TILES).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        cache.put(req, res.clone());
        trimCache(TILES, TILE_MAX);
        return res;
      }).catch(() => fetch(req))
    );
    return;
  }

  // CDN libs: cache-first
  if (/cdnjs|cdn\.jsdelivr|unpkg|fonts\.(googleapis|gstatic)/.test(url.href)) {
    e.respondWith(
      caches.open(LIBS).then(async (cache) => {
        const hit = await cache.match(req);
        return hit || fetch(req).then((res) => { cache.put(req, res.clone()); return res; });
      }).catch(() => fetch(req))
    );
    return;
  }

  // App shell (HTML/JS): network-first
  e.respondWith(
    fetch(req)
      .then((res) => { caches.open(SHELL).then((c) =