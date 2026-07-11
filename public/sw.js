// Import Firebase scripts for FCM compatibility in Service Worker
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

  // Initialize Firebase App in Service Worker
  firebase.initializeApp({
    apiKey: "AIzaSyA5rOQQ4-SzzHFggZzoBRwXR8gW8_Dwz10",
    authDomain: "noted-yarrow-0x6pd.firebaseapp.com",
    projectId: "noted-yarrow-0x6pd",
    storageBucket: "noted-yarrow-0x6pd.firebasestorage.app",
    messagingSenderId: "920988104854",
    appId: "1:920988104854:web:c02b29069fe20821042ab7"
  });

  const messaging = firebase.messaging();

  // Listen for background push notifications
  messaging.onBackgroundMessage((payload) => {
    console.log('[sw.js] Received background push message:', payload);
    const notificationTitle = payload.notification?.title || payload.data?.title || 'تنبيه من checkInTime ⏰';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'تذكير جديد بخصوص نظام التحضير الذكي للحضور والانصراف.',
      icon: '/icon.png',
      badge: '/icon.png',
      vibrate: [200, 100, 200],
      data: { url: self.location.origin }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.error('Failed to initialize Firebase Messaging in Service Worker:', err);
}

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

// ==========================================
// Smart Notification Scheduling (Offline/PWA)
// ==========================================

async function getAlertsConfig() {
  try {
    const cache = await caches.open('checkintime-alerts');
    const response = await cache.match('/sw-alerts-config.json');
    if (response) {
      return await response.json();
    }
  } catch (err) {
    console.error('Error getting alerts config:', err);
  }
  return null;
}

// Global active timers object to avoid duplicate background timers
let activeTimers = {
  checkInTimer: null,
  checkOutTimer: null
};

function scheduleNextReminders(config) {
  if (!config || !config.workStartTime || !config.workEndTime) return;

  // Clear existing timeouts
  if (activeTimers.checkInTimer) clearTimeout(activeTimers.checkInTimer);
  if (activeTimers.checkOutTimer) clearTimeout(activeTimers.checkOutTimer);

  const now = new Date();
  
  // Parse work times
  const [startHour, startMin] = config.workStartTime.split(':').map(Number);
  const [endHour, endMin] = config.workEndTime.split(':').map(Number);

  // Notify 5 minutes before
  let reminderStartHour = startHour;
  let reminderStartMin = startMin - 5;
  if (reminderStartMin < 0) {
    reminderStartHour = (reminderStartHour - 1 + 24) % 24;
    reminderStartMin += 60;
  }

  let reminderEndHour = endHour;
  let reminderEndMin = endMin - 5;
  if (reminderEndMin < 0) {
    reminderEndHour = (reminderEndHour - 1 + 24) % 24;
    reminderEndMin += 60;
  }

  // Target for Check-in (today or tomorrow)
  const targetCheckIn = new Date(now);
  targetCheckIn.setHours(reminderStartHour, reminderStartMin, 0, 0);
  if (targetCheckIn < now) {
    targetCheckIn.setDate(targetCheckIn.getDate() + 1);
  }

  // Target for Check-out (today or tomorrow)
  const targetCheckOut = new Date(now);
  targetCheckOut.setHours(reminderEndHour, reminderEndMin, 0, 0);
  if (targetCheckOut < now) {
    targetCheckOut.setDate(targetCheckOut.getDate() + 1);
  }

  const delayCheckIn = targetCheckIn.getTime() - now.getTime();
  const delayCheckOut = targetCheckOut.getTime() - now.getTime();

  console.log(`Scheduling check-in reminder in ${delayCheckIn / 1000}s and check-out in ${delayCheckOut / 1000}s`);

  // Set timeout reminders (works when browser/worker is active)
  activeTimers.checkInTimer = setTimeout(() => {
    showCheckInNotification(config);
    scheduleNextReminders(config);
  }, delayCheckIn);

  activeTimers.checkOutTimer = setTimeout(() => {
    showCheckOutNotification(config);
    scheduleNextReminders(config);
  }, delayCheckOut);

  // Modern browser Notification Trigger fallback (guarantees offline/closed-app delivery)
  // If 'showTrigger' is supported, it lets the browser OS schedule it!
  if ('showTrigger' in Notification.prototype) {
    try {
      // Register for next 3 days
      for (let i = 0; i < 3; i++) {
        const startDay = new Date(now);
        startDay.setDate(startDay.getDate() + i);
        startDay.setHours(reminderStartHour, reminderStartMin, 0, 0);

        const endDay = new Date(now);
        endDay.setDate(endDay.getDate() + i);
        endDay.setHours(reminderEndHour, reminderEndMin, 0, 0);

        if (startDay > now) {
          self.registration.showNotification('⏰ حان وقت تحضير الدخول!', {
            body: `مرحباً ${config.employeeName}، يبدأ دوامك في ${config.companyName || 'الشركة'} بعد 5 دقائق (الساعة ${config.workStartTime}). تذكر تسجيل حضورك! ✨`,
            icon: '/icon.png',
            badge: '/icon.png',
            tag: `checkin-trigger-${i}`,
            // @ts-ignore
            showTrigger: new TimestampTrigger(startDay.getTime())
          });
        }

        if (endDay > now) {
          self.registration.showNotification('🚪 حان وقت تسجيل الانصراف!', {
            body: `مرحباً ${config.employeeName}، ينتهي دوامك بعد 5 دقائق (الساعة ${config.workEndTime}). يرجى التأكد من تسجيل انصرافك! 🌟`,
            icon: '/icon.png',
            badge: '/icon.png',
            tag: `checkout-trigger-${i}`,
            // @ts-ignore
            showTrigger: new TimestampTrigger(endDay.getTime())
          });
        }
      }
    } catch (err) {
      console.warn('Notification Trigger registration failed:', err);
    }
  }
}

function showCheckInNotification(config) {
  self.registration.showNotification('⏰ تذكير بالتحضير اليومي', {
    body: `مرحباً ${config.employeeName}، يبدأ الدوام بعد 5 دقائق (الساعة ${config.workStartTime}). فضلاً قم بتسجيل حضورك الآن لتجنب الاحتساب المتأخر. ✨`,
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200],
    tag: 'checkin-reminder',
    data: { url: self.location.origin }
  });
}

function showCheckOutNotification(config) {
  self.registration.showNotification('🚪 تذكير بتسجيل الانصراف', {
    body: `مرحباً ${config.employeeName}، ينتهي الدوام بعد 5 دقائق (الساعة ${config.workEndTime}). تذكر تسجيل انصرافك لحفظ ساعات العمل اليوم! 🌟`,
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200],
    tag: 'checkout-reminder',
    data: { url: self.location.origin }
  });
}

// Restore timers on activation
self.addEventListener('activate', (e) => {
  e.waitUntil(
    getAlertsConfig().then((config) => {
      if (config) {
        scheduleNextReminders(config);
      }
    })
  );
});

// Message listener
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'TEST_NOTIFICATION') {
    self.registration.showNotification('🧪 اختبار نظام الإشعارات الذكي', {
      body: `مرحباً ${event.data.employeeName}، هذا إشعار تجريبي للتأكد من وصول التنبيهات بنجاح! تم ضبط منبهات الدوام بذكاء لتبدأ وتتنهي قبل الدوام بـ 5 دقائق ✨`,
      icon: '/icon.png',
      badge: '/icon.png',
      vibrate: [100, 50, 100],
      tag: 'test-notification',
      data: { url: self.location.origin }
    });
  }

  if (event.data.type === 'SET_ALERTS_CONFIG') {
    const { employeeName, workStartTime, workEndTime, companyName } = event.data;
    const config = { employeeName, workStartTime, workEndTime, companyName, timestamp: Date.now() };
    
    caches.open('checkintime-alerts').then((cache) => {
      cache.put(
        new Request('/sw-alerts-config.json'),
        new Response(JSON.stringify(config), {
          headers: { 'Content-Type': 'application/json' }
        })
      );
      scheduleNextReminders(config);
    });
  }
});

// Click action on Notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || self.location.origin;
  
  // @ts-ignore
  event.waitUntil(
    // @ts-ignore
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // @ts-ignore
      if (clients.openWindow) {
        // @ts-ignore
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
