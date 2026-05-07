/* ==========================================================================
   WiseTech Attendance — Service Worker
   Handles browser push notifications (Web Push API).
   Served at /service-worker.js from the public/ folder.
   ========================================================================== */

const APP_NAME = 'WiseTech HR';

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
    icon:               payload.icon              ?? '/favicon.ico',
    badge:              payload.badge             ?? '/favicon.ico',
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
self.addEventListener('install',  (event) => { event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', (event) => { event.waitUntil(clients.claim()); });
