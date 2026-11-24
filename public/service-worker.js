/* ==========================================================================
   WiseTech Attendance — Service Worker
   Handles browser push notifications (Web Push API).
   Served at /service-worker.js from the public/ folder.
   ========================================================================== */

const APP_NAME = 'KAIZNOVA';
const OFFLINE_CACHE = 'wisetech-offline-v2'; // v2: the new WiseTech emblem icons
const OFFLINE_ASSETS = [
  '/offline.html',
  '/icons/pwa-192.png',
  '/icons/pwa-512.png',
];

// ── Push event: browser/OS receives a push from the backend ──────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: APP_NAME, body: event.data.text(), data: { path: '/' } };
  }

  // Clear/replace: punch handlers send { data: { action: 'close', tag } } so stale
  // "Time to check in" banners disappear after the employee already punched.
  const closeTag =
    payload?.data?.action === 'close'
      ? (payload.data.tag || payload.tag)
      : null;
  if (closeTag) {
    event.waitUntil(
      self.registration.getNotifications({ tag: closeTag }).then((list) => {
        list.forEach((n) => n.close());
      }),
    );
    return;
  }

  const title   = payload.title  ?? APP_NAME;
  const options = {
    body:               payload.body              ?? '',
    // The app icon, and a transparent badge: Android paints the badge's alpha only, so it must have no solid fill.
    icon:               payload.icon              ?? '/icons/pwa-192.png',
    badge:              payload.badge             ?? '/icons/badge-96.png',
    tag:                payload.tag               ?? 'wisetech-attendance',
    data:               payload.data              ?? { path: '/' },
    vibrate:            payload.vibrate           ?? [200, 100, 200],
    requireInteraction: payload.requireInteraction ?? false,
    silent:             false,
    renotify:           !!payload.tag,
    actions:            payload.actions           ?? [
      { action: 'view',    title: '👁 View Details' },
      { action: 'dismiss', title: '✕ Dismiss'       },
    ],
    // Rich styling — matches the WiseTech brand
    image:  payload.image  ?? undefined,
    dir:    'ltr',
    lang:   'en',
  };

  event.waitUntil(
    self.registration.showNotification(title, options),
  );
});

// ── Notification click: open or focus the app tab ────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const data = event.notification.data || {};
  const path = typeof data.path === 'string' && data.path.startsWith('/') ? data.path : '/';
  // Prefer absolute https URL from the API (tenant host). Relative-only payloads still
  // open on this SW's origin — which is wrong for stale Amplify subscriptions after cutover.
  const absolute =
    typeof data.url === 'string' && /^https:\/\//i.test(data.url) ? data.url : null;
  const targetUrl = absolute || `${self.location.origin}${path}`;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Prefer an already-open tab on the same origin as the click target
        let targetOrigin = self.location.origin;
        try {
          targetOrigin = new URL(targetUrl).origin;
        } catch {
          /* keep SW origin */
        }
        for (const client of windowClients) {
          if (client.url.includes(targetOrigin) || client.url.includes(self.location.origin)) {
            client.focus();
            if (typeof client.navigate === 'function') {
              client.navigate(targetUrl);
            }
            return;
          }
        }
        return clients.openWindow(targetUrl);
      }),
  );
});

// ── Notification close: optional analytics hook ──────────────────────────────
self.addEventListener('notificationclose', (_event) => {
  // Could send a "dismissed" event to analytics here
});

// ── Install / Activate: skip waiting so the new SW activates immediately ─────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE)
      .then((cache) => cache.addAll(OFFLINE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('wisetech-offline-') && key !== OFFLINE_CACHE).map((key) => caches.delete(key))))
      .then(() => clients.claim()),
  );
});

// Network-only for normal app navigation; the cache is a fallback document only.
// API requests, authenticated pages, tokens and mutation payloads are never cached.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate' || event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
});
