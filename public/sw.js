const CACHE_NAME = 'mutants-academy-v6';
const IS_LOCALHOST =
  self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/apple-splash.png',
  '/icons/apple-splash-1290-2796.png',
  '/icons/apple-splash-1179-2556.png',
  '/icons/apple-splash-1170-2532.png',
  '/icons/apple-splash-828-1792.png',
  '/icons/apple-splash-750-1334.png',
  '/logo.png',
];

// Install Event
self.addEventListener('install', (event) => {
  if (IS_LOCALHOST) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA Pre-cache failed:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (IS_LOCALHOST || key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(async () => {
        await self.clients.claim();
        // In local dev, stale unhashed /_next/static chunks freeze UI fixes; clean up and reload once.
        if (IS_LOCALHOST) {
          const windowClients = await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true,
          });
          await self.registration.unregister().catch(() => {});
          await Promise.all(
            windowClients.map((client) => client.navigate(client.url).catch(() => {}))
          );
        }
      })
  );
});

// Fetch Event - Network First with Cache Fallback for dynamic pages, Cache First for static icons/images
self.addEventListener('fetch', (event) => {
  if (IS_LOCALHOST) return;
  // Ignore non-GET requests or server action POSTs or API routes
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Skip external origins, Next.js build/HMR chunks (handled by HTTP cache), and API/auth endpoints
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/')
  ) {
    return;
  }

  // Static assets (images, icons) -> Stale While Revalidate
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // HTML / App Pages -> Network First (so gym subscription data is always real-time)
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          !networkResponse.redirected &&
          !url.pathname.startsWith('/login') &&
          !url.pathname.startsWith('/api/')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return new Response('Network unavailable. Please reconnect to access the latest roster.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});
