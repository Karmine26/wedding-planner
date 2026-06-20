/* ============================================================
   Service worker — makes the planner installable & offline-tolerant.
   Strategy:
     • Same-origin files (the app shell): stale-while-revalidate, so
       the app opens instantly and offline, then refreshes in the
       background.
     • Supabase API / realtime: never intercepted — always live network.
   Bump CACHE when you change app files to force an update.
   ============================================================ */
const CACHE = 'wed-v6';
const SHELL = [
  './', './index.html', './styles.css', './app.js',
  './config.js', './seed.js', './manifest.json', './icon.png',
];
// Cross-origin libs the app needs to boot. Cached best-effort; a failure
// here must not break install.
const EXTRA = ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL);
    try { await c.addAll(EXTRA); } catch (_) { /* offline at install — fine */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // never cache writes
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isLib = EXTRA.includes(url.href);
  if (!sameOrigin && !isLib) return;                // Supabase REST/realtime → straight to network

  e.respondWith((async () => {
    const cached = await caches.match(req);
    const network = fetch(req).then((res) => {
      if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => cached);
    return cached || network;                        // instant if cached, network otherwise
  })());
});
