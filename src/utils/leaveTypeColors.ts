/**
 * Single source of truth for leave-type colouring — promoted from the Apply Leave modal (the
 * canonical leave-request design). Every leave UI (Apply, Edit, the My-Leaves detail modal,
 * chips, approvals) must resolve colours through here so a colour change in Settings propagates
 * everywhere and there is exactly ONE leave-type→colour mapping.
 *
 * `resolveLeaveTypeColor` is the config-driven superset (casual/sick/annual[+earned+privilege]/
 * floater/maternal/unpaid/sandwich/half-day). `tintOf`/`borderOf` derive the soft fill + border
 * from a resolved colour — same call signatures Apply Leave already uses, so adoption is drop-in.
 */

/** Shape of the `customColors.leaveTypes` slice (loose — only the keys we read). */
export type LeaveTypeColorConfig = {
    casualLeaveColor?: string;
    sickLeaveColor?: string;
    annualLeaveColor?: string;
    maternalLeaveColor?: string;
    floaterLeaveColor?: string;
    unpaidLeaveColor?: string;
    sandwichColor?: string;
    halfDayColor?: string;
} | null | undefined;

/** Hex (#RRGGBB) → rgba() string. */
export const rgba = (hex: string, a: number): string => {
    const h = hex.replace('#', '');
    return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
};

/** Canonical leave-type → configured colour. Falls back to sensible brand defaults. */
export const resolveLeaveTypeColor = (name: string, c: LeaveTypeColorConfig): string => {
    const n = (name || '').toLowerCase();
    if (n.includes('casual'))                                                    return c?.casualLeaveColor   || '#3498DB';
    if (n.includes('sick'))                                                      return c?.sickLeaveColor     || '#E74C3C';
    if (n.includes('annual') || n.includes('earned') || n.includes('privilege')) return c?.annualLeaveColor   || '#2ECC71';
    if (n.includes('floater'))                                                   return c?.floaterLeaveColor  || '#F39C12';
    if (n.includes('matern'))                                                    return c?.maternalLeaveColor || '#9B59B6';
    if (n.includes('unpaid'))                                                    return c?.unpaidLeaveColor   || '#95A5A6';
    if (n.includes('sandwich'))                                                  return c?.sandwichColor      || '#92400E';
    if (n.includes('half'))                                                      return c?.halfDayColor       || '#1D4ED8';
    return c?.casualLeaveColor || '#3498DB';
};

/** Soft fill / border derived from a resolved colour function (Apply Leave's exact tint math). */
export const tintOf   = (name: string, colorOf: (n: string) => string) => rgba(colorOf(name), 0.12);
export const borderOf = (name: string, colorOf: (n: string) => string) => rgba(colorOf(name), 0.28);
