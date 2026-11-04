import { forwardRef, type CSSProperties } from 'react';
import { Button } from '@/ds/ui/button';
import { cn } from './cn';
import { titleCaseNode } from '../text';
import { KT_ICON_FULL } from '../buttons';

/**
 * Tailwind-side CTA primitives (no MUI). Same public API as before (tone / ghost / inverted, and for
 * the icon button `color` + `title` + `size`), rendered by the v2 kit Button (src/ds/ui/button.tsx),
 * so they look exactly like WtButton / WtIconButton.
 *
 * Tone mapping: `primary` and `accent` → the kit's `default` (default always, 2026-10-28; `primary`
 * is kept in the type only so existing call sites compile), `danger` → `destructive`,
 * `success` → `success`. `ghost` here was always the quiet text button → kit `ghost`;
 * `inverted` → kit `inverted`.
 */

export type WtCtaTone = 'primary' | 'accent' | 'danger' | 'success';

const KIT_TONE = { primary: 'default', accent: 'default', danger: 'destructive', success: 'success' } as const;

export interface WtButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** CTA tone. Ignored when `ghost`/`inverted`. Every tone but danger/success renders `default`. */
  tone?: WtCtaTone;
  /** Quiet text button. */
  ghost?: boolean;
  /** White pill, brand text — secondary/launch actions. */
  inverted?: boolean;
  /** Node rendered before the label. */
  startIcon?: React.ReactNode;
}

export const WtButton = forwardRef<HTMLButtonElement, WtButtonProps>(function WtButton(
  { tone = 'accent', ghost = false, inverted = false, startIcon, className, children, type = 'button', ...rest }, ref,
) {
  const cta = !ghost && !inverted;
  return (
    <Button
      ref={ref}
      type={type}
      variant={ghost ? 'ghost' : inverted ? 'inverted' : KIT_TONE[tone]}
      className={cn(cta && KT_ICON_FULL, className)}
      {...rest}
    >
      {startIcon && <span data-icon="inline-start" className="inline-flex">{startIcon}</span>}
      {/* Same rule as the MUI twin — see buttons.tsx. */}
      {titleCaseNode(children)}
    </Button>
  );
});

export interface WtIconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  /** Tone hex (or CSS colour) — the kit's `tinted` variant is toned from it. */
  color?: string;
  /** Tooltip + aria-label. */
  title?: string;
  /** Square px size. Default 40. */
  size?: number;
}

/** Tinted icon button (the kit's `tinted` variant). Pass the glyph as children. */
export const WtIconButton = forwardRef<HTMLButtonElement, WtIconButtonProps>(function WtIconButton(
  { color = '#64748b', title, size = 40, className, children, style, type = 'button', ...rest }, ref,
) {
  return (
    <Button
      ref={ref}
      type={type}
      variant="tinted"
      size="icon"
      aria-label={title}
      title={title}
      className={cn(KT_ICON_FULL, className)}
      style={{ '--tint': color, width: size, height: size, ...style } as CSSProperties}
      {...rest}
    >
      {children}
    </Button>
  );
});
