import { useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_APP_WISE_TECH_BACKEND as string;

/** Converts a base64url VAPID public key to the Uint8Array that the browser expects. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const { data } = await axios.get(`${API_BASE}/api/employee/push-vapid-key`);
    return data?.data?.publicKey ?? null;
  } catch {
    return null;
  }
}

async function saveSubscription(employeeId: string, subscription: PushSubscription): Promise<void> {
  const token = localStorage.getItem('token');
  await axios.post(
    `${API_BASE}/api/employee/push-subscription`,
    {
      employeeId,
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent,
    },
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

/**
 * Registers the Service Worker, requests notification permission, subscribes
 * to Web Push and syncs the subscription with the backend.
 *
 * Call once when the user is authenticated. Idempotent — safe to re-run.
 */
export function usePushSubscription(employeeId: string | null | undefined): void {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!employeeId || registeredRef.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    let cancelled = false;

    async function register() {
      try {
        // 1. Register the service worker
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/',
        });

        // 2. Ask for notification permission (browser shows the allow/block prompt)
        const permission = await Notification.requestPermission();
        if (permission !== 'granted' || cancelled) return;

        // 3. Get the VAPID public key from the backend
        const vapidPublicKey = await fetchVapidPublicKey();
        if (!vapidPublicKey || cancelled) return;

        // 4. Subscribe via PushManager
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        if (cancelled) return;

        // 5. Save subscription to backend so it can send pushes to this device
        await saveSubscription(employeeId!, subscription);

        registeredRef.current = true;
      } catch (err) {
        // Don't surface this error to the user — push is progressive enhancement
        console.warn('[PushSubscription] Setup skipped:', err);
      }
    }

    register();
    return () => { cancelled = true; };
  }, [employeeId]);
}
