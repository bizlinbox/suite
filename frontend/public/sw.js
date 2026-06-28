/* BizlInbox Service Worker — Offline Support + Push Notifications */

const CACHE_VERSION = 'bizlinbox-v2';
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
  '/dashboard/settings/notifications',
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
  // Auth endpoints should NEVER be cached
  if (url.pathname.startsWith('/auth/')) return false;

  return url.pathname.startsWith('/api/') ||
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

// Helper: is Next.js internal request (RSC, _next, webpack HMR)
function isNextInternal(url, request) {
  return url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/__nextjs') ||
    url.searchParams.has('__rsc') ||
    url.searchParams.has('_rsc') ||
    request.headers.get('RSC') === '1' ||
    request.headers.get('Next-Action') ||
    request.headers.get('Accept') === 'text/x-component';
}

// Safe clone helper: catches body-already-used errors
function safeClone(response) {
  try {
    return response.clone();
  } catch {
    return null;
  }
}

// Safe cache put
function safeCachePut(cache, request, response) {
  const clone = safeClone(response);
  if (clone) {
    cache.put(request, clone).catch(() => {});
  }
}

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension / non-http requests
  if (!url.protocol.startsWith('http')) return;

  // Skip Next.js internal requests (RSC fetches, webpack HMR, etc.)
  if (isNextInternal(url, request)) return;

  // Auth endpoints: always hit the network, never cache
  if (url.pathname.startsWith('/auth/')) return;

  // Static assets: cache-first, stale-while-revalidate
  if (isStaticAsset(url) || isImage(url)) {
    const cacheName = isImage(url) ? IMAGE_CACHE : STATIC_CACHE;
    event.respondWith(
      caches.open(cacheName).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          // Revalidate in background
          fetch(request).then((response) => {
            if (response.ok) safeCachePut(cache, request, response);
          }).catch(() => {});
          return cached;
        }
        const response = await fetch(request);
        if (response.ok) safeCachePut(cache, request, response);
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
            if (response.ok) safeCachePut(cache, request, response);
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
          const clone = safeClone(cached);
          return clone || cached;
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
            caches.open(STATIC_CACHE).then((cache) => {
              safeCachePut(cache, request, response);
            }).catch(() => {});
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
          caches.open(STATIC_CACHE).then((cache) => {
            safeCachePut(cache, request, response);
          }).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || new Response('Offline', { status: 503 })))
  );
});

// ============================================================
// Push Notifications
// ============================================================

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'BizlInbox', body: event.data.text() };
  }

  const title = payload.title || 'BizlInbox';
  const options = {
    body: payload.body || 'New message received',
    icon: payload.icon || '/icons/icon-192x192.svg',
    badge: payload.badge || '/icons/icon-192x192.svg',
    tag: payload.tag || 'bizlinbox-message',
    requireInteraction: payload.requireInteraction ?? false,
    data: payload.data || {},
    actions: payload.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const conversationId = data.conversationId;
  const url = conversationId
    ? `/dashboard/inbox/${conversationId}`
    : data.url || '/dashboard/inbox';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window/tab is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.navigate(url).then(() => client.focus()).catch(() => client.focus());
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(url);
    })
  );
});

// ============================================================
// Background Sync & Runtime Messages
// ============================================================

self.addEventListener('sync', (event) => {
  if (event.tag === 'send-message') {
    event.waitUntil(sendPendingMessages());
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
  // Handle SHOW_NOTIFICATION from the frontend
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data.payload || {};
    if (title) {
      self.registration.showNotification(title, options || {});
    }
  }
});

async function sendPendingMessages() {
  // Placeholder: in a full implementation, queue messages in IndexedDB
  // and replay them when online
}
