const CACHE_NAME = 'checkintime-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png'
];

// Install Service Worker
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Service Worker
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Interceptor (Network-first with Cache fallback)
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Dynamic PWA Manifest interception for absolute link isolation
  if (url.pathname === '/manifest.json') {
    const tenant = url.searchParams.get('tenant') || 'default';
    const portal = url.searchParams.get('portal') || 'admin';

    e.respondWith(
      fetch('/manifest.json')
        .then((response) => response.json())
        .then((manifest) => {
          // Forcefully override the start_url with current active portal and tenant parameters
          manifest.start_url = `/?tenant=${tenant}&portal=${portal}`;
          
          return new Response(JSON.stringify(manifest), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
        .catch(() => {
          // Fallback if network fails, fetch cached static manifest and inject dynamic params
          return caches.match('/manifest.json')
            .then((res) => res ? res.json() : null)
            .then((manifest) => {
              if (manifest) {
                manifest.start_url = `/?tenant=${tenant}&portal=${portal}`;
                return new Response(JSON.stringify(manifest), {
                  headers: { 'Content-Type': 'application/json' }
                });
              }
              // Absolute fallback if no cache
              const fallbackManifest = {
                "name": "checkInTime - النظام الذكي للحضور والانصراف",
                "short_name": "checkInTime",
                "start_url": `/?tenant=${tenant}&portal=${portal}`,
                "display": "standalone",
                "background_color": "#0A0A0B",
                "theme_color": "#D4AF37",
                "icons": [
                  {
                    "src": "/icon.png",
                    "sizes": "512x512",
                    "type": "image/png"
                  }
                ]
              };
              return new Response(JSON.stringify(fallbackManifest), {
                headers: { 'Content-Type': 'application/json' }
              });
            });
        })
    );
    return;
  }

  // Only handle GET requests and local assets
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // If valid response, clone and cache it
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, serve from cache
        return caches.match(e.request);
      })
  );
});
