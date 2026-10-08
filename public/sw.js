const CACHE_NAME = 'prepwise-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/logo.png',
  '/prepwise_dashboard_preview.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA: Failed to cache some static assets during install', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
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

  // Bypass cache for API requests, SSE, media range requests, and video/audio files
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/events') ||
    request.headers.has('range') ||
    url.pathname.match(/\.(mp4|webm|ogv|mp3|wav|ogg)$/i)
  ) {
    return;
  }

  // Network-first strategy for page routes & assets to keep app updated
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
          }
        });
      })
  );
});
