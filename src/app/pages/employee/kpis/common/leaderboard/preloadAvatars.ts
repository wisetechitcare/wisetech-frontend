/**
 * Preloads avatar images so the slot-machine reel never flashes a broken image
 * mid-spin. Resolves on load OR error (never rejects) — a failed image simply
 * falls back to the SafeAvatar background at render time.
 */
export function preloadAvatars(urls: string[]): Promise<void> {
  const unique = Array.from(new Set(urls.filter(Boolean)));
  return Promise.all(
    unique.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
        })
    )
  ).then(() => undefined);
}
