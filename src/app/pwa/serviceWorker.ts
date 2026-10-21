export const PWA_UPDATE_EVENT = 'wt:pwa-update';

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (registrationPromise) return registrationPromise;
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);

  registrationPromise = navigator.serviceWorker
    .register('/service-worker.js', { scope: '/' })
    .then((registration) => {
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing || !navigator.serviceWorker.controller) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed') window.dispatchEvent(new Event(PWA_UPDATE_EVENT));
        });
      });
      return registration;
    })
    .catch((error) => {
      console.warn('[PWA] Service worker registration skipped:', error);
      return null;
    });

  return registrationPromise;
}

export function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  return registerServiceWorker();
}
