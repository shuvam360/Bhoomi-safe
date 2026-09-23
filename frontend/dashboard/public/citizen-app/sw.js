/**
 * BhoomiSafe — Citizen Portal Service Worker
 * Enables offline capability and PWA installation criteria.
 */

const CACHE_NAME = 'bhoomisafe-citizen-v2';
const STATIC_ASSETS = [
  './index.html',
  './report.html',
  './style.css',
  './app.js',
  './i18n.js',
  './manifest.json',
  './favicon.svg',
  './icon-192.png',
  './icon-512.png',
  './locales/en.json',
  './locales/hi.json',
  './locales/as.json',
  './locales/kha.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching offline citizen assets');
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) => cache.add(asset))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purging outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip POST requests or external analytics
  if (request.method !== 'GET') {
    return;
  }

  // Network-first for API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ offline: true, error: 'Offline - request queued' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Network-first with cache fallback for citizen portal assets
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback to report.html if navigating
          if (request.mode === 'navigate') {
            return caches.match('./report.html');
          }
        });
      })
  );
});
