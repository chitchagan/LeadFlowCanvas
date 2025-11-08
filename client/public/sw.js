const CACHE_VERSION = '1.0.1'; // Increment this when deploying updates
const CACHE_NAME = `lead-manager-v${CACHE_VERSION}`;
const RUNTIME_CACHE = `lead-manager-runtime-v${CACHE_VERSION}`;

// Only cache essential files that exist in both dev and production
// Other assets will be cached on-demand via the fetch event
const STATIC_ASSETS = [
  '/',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing new version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Don't skip waiting automatically - let the user decide
        console.log('[Service Worker] New version ready to activate');
        // Notify all clients that an update is available
        return self.registration.update();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    }).then(() => {
      // Notify all clients that the update is complete
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'UPDATE_COMPLETE',
            version: CACHE_VERSION
          });
        });
      });
    })
  );
});

// Fetch event - network first for HTML, cache first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response before caching
          const responseToCache = response.clone();
          
          // Only cache successful responses
          if (response.status === 200) {
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return a custom offline response for API calls
            return new Response(
              JSON.stringify({ 
                error: 'Offline', 
                message: 'You are currently offline. Please check your connection.' 
              }),
              { 
                status: 503, 
                headers: { 'Content-Type': 'application/json' } 
              }
            );
          });
        })
    );
    return;
  }

  // Handle HTML with network-first strategy to get updates quickly
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/');
          });
        })
    );
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        });
      })
      .catch(() => {
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Skipping waiting and activating new version');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }

  if (event.data && event.data.type === 'CHECK_UPDATE') {
    // Check if there's a waiting service worker
    self.registration.update().then(() => {
      if (self.registration.waiting) {
        event.ports[0].postMessage({ 
          updateAvailable: true,
          version: CACHE_VERSION
        });
      } else {
        event.ports[0].postMessage({ 
          updateAvailable: false,
          version: CACHE_VERSION
        });
      }
    });
  }
});

// Background sync for offline actions (if supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-leads') {
    event.waitUntil(syncLeads());
  }
});

async function syncLeads() {
  // This would sync any offline changes when connection is restored
  console.log('[Service Worker] Syncing leads...');
  // Implementation would depend on your offline data strategy
}

// Notify clients when a new service worker is waiting
self.addEventListener('controllerchange', () => {
  console.log('[Service Worker] Controller changed');
});
