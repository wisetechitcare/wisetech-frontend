export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPrompt: InstallPromptEvent | null = null;
const promptListeners = new Set<(prompt: InstallPromptEvent | null) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as InstallPromptEvent;
    promptListeners.forEach((listener) => listener(deferredPrompt));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    promptListeners.forEach((listener) => listener(null));
  });
}

export const getInstallPrompt = (): InstallPromptEvent | null => deferredPrompt;

export function subscribeToInstallPrompt(listener: (prompt: InstallPromptEvent | null) => void): () => void {
  promptListeners.add(listener);
  return () => promptListeners.delete(listener);
}

export function clearInstallPrompt(): void {
  deferredPrompt = null;
  promptListeners.forEach((listener) => listener(null));
}

export const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

export const isIos = (): boolean =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !('MSStream' in window);
