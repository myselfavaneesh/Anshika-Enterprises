const CACHE_NAME = 'anshika-app-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png'
];

// Install event - cache core shell assets safely
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((asset) => cache.add(asset).catch((err) => {
          console.warn(`[SW] Pre-caching skipped for ${asset}:`, err);
        }))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Network-first with cache fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }

  // Only intercept same-origin requests!
  // Ignores Render backend, Google Analytics, external CDNs, extensions, etc.
  if (url.origin !== self.location.origin) return;

  // Skip API calls and websockets
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket')) {
    return;
  }

  // Only handle HTTP/HTTPS protocols
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(event.request);
        // Cache successful basic responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          }).catch(() => {});
        }
        return networkResponse;
      } catch (err) {
        // Network failure / offline
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // For SPA client-side routing, fallback to cached index.html or root
        if (event.request.mode === 'navigate') {
          const indexFallback = (await caches.match('/index.html')) || (await caches.match('/'));
          if (indexFallback) {
            return indexFallback;
          }
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Meri Dukan - Offline</title></head><body><div style="font-family: sans-serif; text-align: center; padding: 50px;"><h2>You are offline</h2><p>Please check your internet connection and refresh.</p></div></body></html>',
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            }
          );
        }

        return new Response(null, { status: 504, statusText: 'Gateway Timeout' });
      }
    })()
  );
});

