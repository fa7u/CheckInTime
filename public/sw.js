const CACHE_NAME = 'checkintime-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png'
];

// Config Cache Helpers
async function saveActiveConfig(tenant, portal, company) {
  try {
    const cache = await caches.open('checkintime-config');
    const data = { tenant, portal, company, timestamp: Date.now() };
    await cache.put(
      new Request('/sw-active-config.json'),
      new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
  } catch (err) {
    console.error('Error saving active config:', err);
  }
}

async function getActiveConfig() {
  try {
    const cache = await caches.open('checkintime-config');
    const response = await cache.match('/sw-active-config.json');
    if (response) {
      return await response.json();
    }
  } catch (err) {
    console.error('Error getting active config:', err);
  }
  return null;
}

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

  // Capture active config from query params of any local page request
  const tenantParam = url.searchParams.get('tenant');
  if (tenantParam && tenantParam !== 'default' && url.origin === self.location.origin) {
    const portalParam = url.searchParams.get('portal') || 'admin';
    const companyParam = url.searchParams.get('company') || 'checkInTime';
    saveActiveConfig(tenantParam, portalParam, companyParam);
  }

  // Dynamic PWA Manifest interception for absolute link isolation
  if (url.pathname === '/manifest.json') {
    e.respondWith(
      (async () => {
        let tenant = url.searchParams.get('tenant');
        let portal = url.searchParams.get('portal');
        let company = url.searchParams.get('company');

        // If parameters are missing or default, try to retrieve from persistent SW config cache
        if (!tenant || tenant === 'default') {
          const cachedConfig = await getActiveConfig();
          if (cachedConfig) {
            tenant = cachedConfig.tenant || tenant;
            portal = cachedConfig.portal || portal;
            company = cachedConfig.company || company;
          }
        }

        tenant = tenant || 'default';
        portal = portal || 'admin';
        company = company || 'checkInTime';

        try {
          const response = await fetch('/manifest.json');
          const manifest = await response.json();
          manifest.name = company === 'checkInTime' ? 'checkInTime - النظام الذكي للحضور والانصراف' : `${company} - checkInTime`;
          manifest.short_name = company;
          manifest.start_url = `/?tenant=${tenant}&portal=${portal}`;
          
          return new Response(JSON.stringify(manifest), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        } catch (err) {
          // Fallback if network fails, fetch cached static manifest and inject dynamic params
          const cachedRes = await caches.match('/manifest.json');
          let manifest = cachedRes ? await cachedRes.json() : null;
          if (manifest) {
            manifest.name = company === 'checkInTime' ? 'checkInTime - النظام الذكي للحضور والانصراف' : `${company} - checkInTime`;
            manifest.short_name = company;
            manifest.start_url = `/?tenant=${tenant}&portal=${portal}`;
            return new Response(JSON.stringify(manifest), {
              headers: { 'Content-Type': 'application/json; charset=utf-8' }
            });
          }
          // Absolute fallback if no cache
          const fallbackManifest = {
            "name": company === 'checkInTime' ? 'checkInTime - النظام الذكي للحضور والانصراف' : `${company} - checkInTime`,
            "short_name": company,
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
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        }
      })()
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
