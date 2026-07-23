import { forwardRef } from 'react';
import { cn } from './cn';

/**
 * Tailwind CTA primitives — the WtButton / WtIconButton physics, re-platformed
 * off MUI onto pure Tailwind. Same public API (tone / ghost / inverted, and for
 * the icon button `color` + `title`) so surfaces migrate 1:1.
 *
 * Recipe (unchanged from the MUI kit): 135° gradient to a darker shade of the
 * hue · triple shadow (crisp + long colored glow + inset white top-highlight) ·
 * hover -1px lift · active scale(.98) press.
 */

export type WtCtaTone = 'primary' | 'accent' | 'danger' | 'success';

// Gradient + glow per tone, as Tailwind arbitrary-value utility fragments.
const CTA: Record<WtCtaTone, string> = {
  primary: 'from-[#1E3A8A] to-[#172554] shadow-[0_1px_2px_rgba(30,58,138,0.35),0_10px_22px_-10px_rgba(30,58,138,0.65),inset_0_1px_0_rgba(255,255,255,0.14)] hover:shadow-[0_2px_4px_rgba(30,58,138,0.35),0_14px_26px_-10px_rgba(30,58,138,0.75),inset_0_1px_0_rgba(255,255,255,0.14)]',
  accent:  'from-[#2563EB] to-[#1E3A8A] shadow-[0_1px_2px_rgba(37,99,235,0.35),0_10px_22px_-10px_rgba(37,99,235,0.65),inset_0_1px_0_rgba(255,255,255,0.14)] hover:shadow-[0_2px_4px_rgba(37,99,235,0.35),0_14px_26px_-10px_rgba(37,99,235,0.75),inset_0_1px_0_rgba(255,255,255,0.14)]',
  danger:  'from-[#e11d48] to-[#9f1239] shadow-[0_1px_2px_rgba(225,29,72,0.35),0_10px_22px_-10px_rgba(225,29,72,0.65),inset_0_1px_0_rgba(255,255,255,0.14)] hover:shadow-[0_2px_4px_rgba(225,29,72,0.35),0_14px_26px_-10px_rgba(225,29,72,0.75),inset_0_1px_0_rgba(255,255,255,0.14)]',
  success: 'from-[#16a34a] to-[#15803d] shadow-[0_1px_2px_rgba(22,163,74,0.35),0_10px_22px_-10px_rgba(22,163,74,0.65),inset_0_1px_0_rgba(255,255,255,0.14)] hover:shadow-[0_2px_4px_rgba(22,163,74,0.35),0_14px_26px_-10px_rgba(22,163,74,0.75),inset_0_1px_0_rgba(255,255,255,0.14)]',
};

const CTA_BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white ' +
  'bg-gradient-to-br transition-[transform,box-shadow,background] duration-150 ease-[cubic-bezier(.22,.61,.36,1)] ' +
  'hover:-translate-y-px active:translate-y-0 active:scale-[.98] select-none ' +
  'disabled:cursor-not-allowed disabled:bg-none disabled:!bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:translate-y-0';

const GHOST =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-500 ' +
  'transition-colors duration-150 hover:bg-slate-100 hover:text-slate-800 select-none ' +
  'disabled:cursor-not-allowed disabled:text-slate-300';

const INVERTED =
  'inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-semibold text-[#1E3A8A] ' +
  'bg-white border border-blue-100 shadow-[0_1px_2px_rgba(16,24,40,0.06)] ' +
  'transition-[transform,box-shadow,background,border-color] duration-150 ease-[cubic-bezier(.22,.61,.36,1)] ' +
  'hover:bg-[#EAF0FA] hover:border-blue-200 hover:-translate-y-px active:translate-y-0 active:scale-[.98] select-none ' +
  'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:shadow-none';

export interface WtButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** CTA gradient tone. Ignored when `ghost`/`inverted`. Default 'primary'. */
  tone?: WtCtaTone;
  /** Quiet text button (the standard Cancel). */
  ghost?: boolean;
  /** White pill, navy text — secondary/launch actions. */
  inverted?: boolean;
  /** Node rendered before the label. */
  startIcon?: React.ReactNode;
}

export const WtButton = forwardRef<HTMLButtonElement, WtButtonProps>(function WtButton(
  { tone = 'primary', ghost = false, inverted = false, startIcon, className, children, type = 'button', ...rest }, ref,
) {
  const base = ghost ? GHOST : inverted ? INVERTED : cn(CTA_BASE, CTA[tone]);
  return (
    <button ref={ref} type={type} className={cn(base, className)} {...rest}>
      {startIcon}
      {children}
    </button>
  );
});

export interface WtIconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  /** Tone hex — tint derives from it (bg 8%, border 24%), deepens on hover. */
  color?: string;
  /** Tooltip + aria-label. */
  title?: string;
  /** Square px size (applied via inline style so it always wins). Default 40. */
  size?: number;
}

/** Tinted-ghost icon button with the kit's press physics. Pass the glyph as children. */
export const WtIconButton = forwardRef<HTMLButtonElement, WtIconButtonProps>(function WtIconButton(
  { color = '#64748b', title, size = 40, className, children, style, ...rest }, ref,
) {
  return (
    <button
      ref={ref}
      aria-label={title}
      title={title}
      className={cn(
        'inline-grid place-items-center rounded-[10px] border transition-[transform,background,border-color,box-shadow] duration-150 ease-[cubic-bezier(.22,.61,.36,1)]',
        'hover:-translate-y-px active:translate-y-0 active:scale-[.94] disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0',
        'wt-iconbtn',
        className,
      )}
      style={{ ['--wt' as any]: color, color, backgroundColor: `${color}14`, borderColor: `${color}3D`, width: size, height: size, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
});
