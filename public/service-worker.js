/* ==========================================================================
   WiseTech Attendance — Service Worker
   Handles browser push notifications (Web Push API).
   Served at /service-worker.js from the public/ folder.
   ========================================================================== */

const APP_NAME = 'WiseTech HR';
const OFFLINE_CACHE = 'wisetech-offline-v1';
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

  const title   = payload.title  ?? APP_NAME;
  const options = {
    body:               payload.body              ?? '',
    icon:               payload.icon              ?? '/WT-logo.ico',
    badge:              payload.badge             ?? '/WT-logo.ico',
    tag:                payload.tag               ?? 'wisetech-attendance',
    data:               payload.data              ?? { path: '/' },
    vibrate:            payload.vibrate           ?? [200, 100, 200],
    requireInteraction: payload.requireInteraction ?? false,
    silent:             false,
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

  const path = event.notification.data?.path ?? '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If the app is already open in a tab, focus it and navigate
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.navigate(self.location.origin + path);
            return;
          }
        }
        // Otherwise open a new tab at the target path
        return clients.openWindow(self.location.origin + path);
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
