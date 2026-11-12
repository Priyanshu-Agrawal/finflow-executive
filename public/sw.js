// FinFlow service worker (Phase 0 skeleton). Caches only the offline page.
// It never touches /api/*, /login, non-GET requests, or anything outside /v2 navigations.
const CACHE = 'finflow-shell-1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add('/offline.html')).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.mode !== 'navigate') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/v2')) return;
  event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
});
