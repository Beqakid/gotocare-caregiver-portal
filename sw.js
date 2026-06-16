// Carehia Caregiver Portal — Service Worker
// Handles: PWA caching, push notifications, notification clicks
const CACHE_NAME = 'carehia-cgp-v12';
const STATIC_ASSETS = ['/styles.css'];

// ── Install ──────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch Strategy ────────────────────────────────────────────────────
// index.html: always network-first so new builds always load fresh HTML
// dist/ JS bundles: always network-first (chunks change hash every build)
// Everything else: cache-first
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) return;

  // Network-first for HTML entry point and JS bundles
  if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname.startsWith('/dist/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets (CSS, fonts, icons)
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => caches.match('/index.html')))
  );
});

// ── Push Notification Handler ─────────────────────────────────────────
self.addEventListener('push', (event) => {
  let notifData = {
    title: 'New Care Request Near You!',
    body: 'Tap to review — a family needs care in your area.',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: 'care-request-' + Date.now(),
    data: { url: '/#requests' },
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      notifData = { ...notifData, ...parsed };
    } catch (_) {
      const text = event.data.text();
      if (text) notifData.body = text;
    }
  }

  const options = {
    body: notifData.body,
    icon: notifData.icon,
    badge: notifData.badge,
    tag: notifData.tag,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'view', title: '\u2705 View Request' },
      { action: 'dismiss', title: '\u2715 Dismiss' },
    ],
    data: notifData.data || { url: '/#requests' },
  };

  // Show OS notification AND postMessage to all open app windows (in-app inbox)
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(notifData.title, options),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        const msg = {
          type: 'NEW_NOTIFICATION',
          notification: {
            id: Date.now(),
            title: notifData.title,
            body: notifData.body,
            timestamp: Date.now(),
            read: false,
          },
        };
        clientList.forEach((c) => c.postMessage(msg));
      }),
    ])
  );
});

// ── Notification Click Handler ────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;
  const data = event.notification.data || {};

  if (action === 'dismiss') return;

  const targetUrl = data.url || '/#requests';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.hostname) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

// ── Background Sync (for future use) ────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-requests') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((cs) =>
        cs.forEach((c) => c.postMessage({ type: 'SYNC_REQUESTS' }))
      )
    );
  }
});
