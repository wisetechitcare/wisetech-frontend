/**
 * Tailwind kit design tokens — the single source of truth for the Tailwind
 * re-platform of the WiseTech glass UI kit.
 *
 * Mirrors the brand values from `@app/theme/tokens` (`T`) but expressed as
 * plain data + Tailwind class strings so the kit has ZERO MUI dependency.
 *
 * Two token shapes:
 *  - `BRAND` / `SHADOW` — static hex + shadow strings (used in inline styles or
 *    arbitrary Tailwind values where a utility would be noise).
 *  - `TRIO` — the per-tone accent triple `{ c: fg, bg: fill, bd: border }`,
 *    identical to the MUI kit's palette so a surface's tone choices carry over
 *    verbatim during migration.
 */

export const BRAND = {
  navy: '#1E3A8A',
  navyHover: '#172554',
  navySoft: '#EAF0FA',
  accent: '#C0392B',
  line: '#E6E9EE',
  panelAlt: '#F1F5F9',
} as const;

export const SHADOW = {
  rest: '0 1px 2px rgba(15,23,42,0.04), 0 8px 16px rgba(15,23,42,0.035)',
  hover: '0 2px 4px rgba(15,23,42,0.04), 0 14px 22px rgba(15,23,42,0.055)',
  card: '0 1px 3px rgba(16,24,40,0.05), 0 8px 24px rgba(16,24,40,0.03)',
  dialog: '0 24px 64px -12px rgba(16,24,40,0.28), 0 8px 20px -8px rgba(16,24,40,0.18)',
} as const;

/**
 * DARK — the app-wide dark-mode benchmark surface/text palette.
 *
 * The reference any surface should match when it renders dark via inline styles or Bootstrap
 * (i.e. outside the MUI palette). Values track `wisetechTheme`'s dark palette (paper #1E222C,
 * text rgba-white .92/.62) so hand-styled modals, the glass kit, and MUI screens read identically
 * in dark. Pair with `toneSurface(trio, true)` for accent tiles/pills.
 */
export const DARK = {
  surface: '#1E222C',        // primary card / modal background (matches MUI paper)
  surfaceAlt: '#252A35',     // elevated inner surface (wells, headers)
  rowBg: 'rgba(255,255,255,0.045)',   // unselected list/option row on a dark surface
  rowHover: 'rgba(255,255,255,0.09)',
  border: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.16)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.45)',
} as const;

export type Trio = { c: string; bg: string; bd: string };

export type ToneName = 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'cyan' | 'slate';

export const TRIO: Record<ToneName, Trio> = {
  blue:   { c: '#2563eb', bg: '#eff6ff', bd: '#dbeafe' },
  green:  { c: '#16a34a', bg: '#f0fdf4', bd: '#dcfce7' },
  purple: { c: '#7c3aed', bg: '#f5f3ff', bd: '#ede9fe' },
  amber:  { c: '#d97706', bg: '#fffbeb', bd: '#fde68a' },
  rose:   { c: '#e11d48', bg: '#fff1f2', bd: '#fecdd3' },
  cyan:   { c: '#0891b2', bg: '#ecfeff', bd: '#cffafe' },
  slate:  { c: '#64748b', bg: '#f8fafc', bd: '#e2e8f0' },
};

/** Spring-ish easing shared with the MUI kit's CTA physics. */
export const EASE = 'cubic-bezier(.22,.61,.36,1)';
