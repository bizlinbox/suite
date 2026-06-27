/* BizlInbox Service Worker — Offline Support */

const CACHE_VERSION = 'bizlinbox-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

const PRECACHE_URLS = [
  '/',
  '/dashboard/inbox',
  '/dashboard/contacts',
  '/dashboard/campaigns',
  '/dashboard/analytics',
  '/dashboard/users',
  '/dashboard/roles',
  '/dashboard/automations',
  '/dashboard/quick-replies',
  '/dashboard/waba-accounts',
  '/dashboard/settings',
  '/offline.html',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
];

// Install: precache core shell + offline fallback
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith('bizlinbox-') && !key.includes(CACHE_VERSION))
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: is API request
function isApiRequest(url) {
  return url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/conversations') ||
    url.pathname.startsWith('/messages') ||
    url.pathname.startsWith('/contacts') ||
    url.pathname.startsWith('/campaigns') ||
    url.pathname.startsWith('/agents') ||
    url.pathname.startsWith('/roles') ||
    url.pathname.startsWith('/automations') ||
    url.pathname.startsWith('/analytics') ||
    url.pathname.startsWith('/quick-replies') ||
    url.pathname.startsWith('/waba-accounts') ||
    url.pathname.startsWith('/templates') ||
    url.pathname.startsWith('/media');
}

// Helper: is static asset
function isStaticAsset(url) {
  return url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.startsWith('/_next/static/');
}

// Helper: is image
function isImage(url) {
  return url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.gif') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.startsWith('/api/media/');
}

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension / non-http requests
  if (!url.protocol.startsWith('http')) return;

  // Static assets: cache-first, stale-while-revalidate
  if (isStaticAsset(url) || isImage(url)) {
    const cacheName = isImage(url) ? IMAGE_CACHE : STATIC_CACHE;
    event.respondWith(
      caches.open(cacheName).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          // Revalidate in background
          fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
          }).catch(() => {});
          return cached;
        }
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // API requests: stale-while-revalidate with fallback
  if (isApiRequest(url)) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => {
            // Return cached version if network fails
            if (cached) return cached;
            // Return empty JSON for API calls when fully offline
            return new Response(JSON.stringify({ offline: true, data: [] }), {
              headers: { 'Content-Type': 'application/json' },
            });
          });

        // Prefer cached immediately, then update
        if (cached) {
          networkPromise.catch(() => {});
          return cached.clone();
        }
        return networkPromise;
      })
    );
    return;
  }

  // HTML/Navigation: network-first, fallback to cache then offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match('/offline.html');
          });
        })
    );
    return;
  }

  // Default: try network, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, response.clone()));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || new Response('Offline', { status: 503 })))
  );
});

// Background sync for outgoing messages
self.addEventListener('sync', (event) => {
  if (event.tag === 'send-message') {
    event.waitUntil(sendPendingMessages());
  }
});

// Message handler for runtime communication
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

async function sendPendingMessages() {
  // Placeholder: in a full implementation, queue messages in IndexedDB
  // and replay them when online
}
