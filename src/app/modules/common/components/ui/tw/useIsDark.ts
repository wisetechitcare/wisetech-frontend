import { useSyncExternalStore } from 'react';
import type { Trio } from './tokens';

/**
 * `useIsDark` — reactive read of the app-wide dark signal for the (MUI-free) Tailwind kit.
 *
 * ColorModeProvider stamps `.dark` on <html>; className-based `dark:` utilities pick that up
 * automatically, but atoms that emit an arbitrary per-tone hex via inline `style` (IconBox,
 * StatusBadge) can't. They read this hook and swap to translucent tints in dark. A MutationObserver
 * on the root class keeps it live across toggles without any MUI/theme dependency.
 */
function subscribe(cb: () => void): () => void {
  if (typeof MutationObserver === 'undefined') return () => {};
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => obs.disconnect();
}
function getSnapshot(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Light uses the designed pastels; dark derives translucent tints from the tone color so a tile/pill
 * reads on a dark surface instead of a near-white block. Foreground (icon/text) keeps the tone hue. */
export function toneSurface(trio: Trio, dark: boolean): { bg: string; bd: string; fg: string } {
  if (!dark) return { bg: trio.bg, bd: trio.bd, fg: trio.c };
  return { bg: hexA(trio.c, 0.22), bd: hexA(trio.c, 0.44), fg: trio.c };
}

/** Append an alpha to a #rrggbb hex → 8-digit hex. Falls back to the input if not a 6-digit hex. */
function hexA(hex: string, alpha: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}
