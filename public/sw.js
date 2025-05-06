// This is the service worker with the combined offline experience and notification handling

const CACHE = "moneyflow-offline-v2";
const OFFLINE_URL = "offline.html";

// Assets to cache for offline use
const ASSETS_TO_CACHE = [
  OFFLINE_URL,
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-72x72.png",
  "/icons/icon-96x96.png",
  "/icons/icon-128x128.png",
  "/icons/icon-144x144.png",
  "/icons/icon-152x152.png",
  "/icons/icon-192x192.png",
  "/icons/icon-384x384.png",
  "/icons/icon-512x512.png",
  "/apple-touch-icon.png",
  "/favicon.ico"
];

// Install stage sets up the offline page in the cache and opens a new cache
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      console.log('Caching app shell and content for offline use');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName.startsWith("moneyflow-"))
          .filter(cacheName => cacheName !== CACHE)
          .map(cacheName => {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('Service Worker activated and controlling the page');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache if possible, otherwise fetch from network
self.addEventListener("fetch", event => {
  // Skip cross-origin requests
  if (event.request.mode === "navigate" || 
      (event.request.method === "GET" && 
       event.request.headers.get("accept")?.includes("text/html"))) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          console.log('Fallback to offline page for navigation request');
          return caches.match(OFFLINE_URL);
        })
    );
  } else {
    // For non-HTML requests, try the network first, fall back to the cache
    event.respondWith(
      (async () => {
        // Don't attempt to cache chrome-extension URLs
        if (event.request.url.startsWith('chrome-extension://')) {
          return fetch(event.request);
        }
        
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        try {
          const networkResponse = await fetch(event.request);
          
          // If this is a valid response, clone it and store in cache
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
            const responseToCache = networkResponse.clone();
            const cache = await caches.open(CACHE);
            try {
              await cache.put(event.request, responseToCache);
            } catch (error) {
              console.warn('Failed to cache:', error);
            }
          }
          
          return networkResponse;
        } catch (error) {
          console.error('Fetch failed:', error);
          throw error;
        }
      })()
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event.notification.tag);
  event.notification.close();

  // This looks to see if the current is already open and focuses it
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then(clientList => {
      // If a matching window is already open, focus it
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle push notifications (for future implementation)
self.addEventListener('push', event => {
  let notificationData = {};
  
  try {
    notificationData = event.data.json();
  } catch (e) {
    notificationData = {
      title: 'Moneyflow Update',
      body: event.data ? event.data.text() : 'New trading signal available!',
      icon: '/icons/icon-192x192.png'
    };
  }
  
  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: notificationData.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});
