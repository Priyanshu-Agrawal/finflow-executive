// FinFlow service worker. Covers the whole app (not just the old /v2 shell).
// It never touches /login or any non-GET request. /api/* is untouched except for the one
// read-only offline copy below (GET /api/financials): every other /api/* route always hits the
// network, so a write can never silently appear to succeed while offline.
const SHELL_CACHE = 'finflow-shell-1';
const DATA_CACHE = 'finflow-financials-1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.add('/offline.html')).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Never /login — a stale cached login page could show a logged-in shell with the wrong session.
    if (url.pathname === '/login' || url.pathname.startsWith('/login/')) return;
    event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    return;
  }

  // The one read-only offline figure: the last successful balance read, whatever its query
  // string (refDate/budget params change, the figure is still "the last one we had"). Network
  // first; on success, replace the cached copy; on failure, serve it if there is one. No other
  // /api/* path is ever cached — see the comment above.
  if (url.pathname === '/api/financials') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            // .clone() must happen synchronously, right here, before the response body starts
            // being read anywhere (including by the page this responds to) — once consumption
            // starts, clone() throws "body is already used". event.waitUntil then keeps the
            // worker alive long enough for the async cache write itself to finish.
            const copy = res.clone();
            event.waitUntil(caches.open(DATA_CACHE).then((c) => c.put('/api/financials', copy)));
          }
          return res;
        })
        .catch(() =>
          caches.open(DATA_CACHE)
            .then((c) => c.match('/api/financials'))
            .then((cached) => cached || Response.error())
        )
    );
  }
});

// The client clears this cache itself on sign-out (direct Cache API access from the page, no
// need to round-trip through the service worker) — see AppFrame's logout handler.
