// FinFlow service worker. Covers the whole app (not just the old /v2 shell).
// It never touches /login or any non-GET request. /api/* is untouched here (see the dedicated
// financials-offline-copy branch this file grows in Step B Task 3) — it always hits the network,
// so a write can never silently appear to succeed while offline.
const SHELL_CACHE = 'finflow-shell-1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.add('/offline.html')).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.mode !== 'navigate') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never /login — a stale cached login page could show a logged-in shell with the wrong session.
  if (url.pathname === '/login' || url.pathname.startsWith('/login/')) return;
  event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
});
