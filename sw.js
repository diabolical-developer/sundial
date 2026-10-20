/*
 * Sundial service worker: makes the web app installable and lets it open with no connection.
 *
 * - The page itself (index.html) is network-first, so a new release shows up on the next launch,
 *   with the cached copy as the offline fallback.
 * - Build files under _expo/ and assets/ have content hashes in their names and never change,
 *   so they're served from the cache first.
 * - Tasks live in the browser's own storage, so they're there offline too.
 *
 * Bump VERSION only when this file's caching logic changes; normal releases don't need it.
 */
const VERSION = 'sundial-v1';
const SHELL = `${VERSION}-shell`;
const BUILD = `${VERSION}-build`;

// "/sundial/" on GitHub Pages, "/" on a root domain.
const BASE = new URL('./', self.location).pathname;
const SHELL_FILES = ['', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'].map((p) => BASE + p);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// On the first visit the page loads before this worker is in control, so it sends over the
// files it already fetched (the JS bundle, fonts). That makes even the first visit work offline.
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'cache-urls' || !Array.isArray(data.urls)) return;
  event.waitUntil(
    caches.open(BUILD).then((cache) =>
      Promise.all(
        data.urls
          .filter((u) => isBuildFile(new URL(u, self.location)))
          .map((u) => cache.match(u).then((hit) => hit || cache.add(u).catch(() => {}))),
      ),
    ),
  );
});

function isBuildFile(url) {
  return url.origin === self.location.origin && (url.pathname.startsWith(BASE + '_expo/') || url.pathname.startsWith(BASE + 'assets/'));
}

async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL).then((cache) => cache.put(BASE, copy));
          }
          return res;
        })
        .catch(() => caches.match(BASE)),
    );
    return;
  }

  if (isBuildFile(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(BUILD).then((cache) => cache.put(req, copy).then(() => trim(BUILD, 40)));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Manifest and icons: answer from the cache straight away, refresh it in the background.
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || network;
    }),
  );
});
