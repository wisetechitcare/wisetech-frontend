import { forwardRef } from 'react';
import { cn } from './cn';

/**
 * WtCloseButton — the canonical close (×) control for the whole app.
 *
 * Use this everywhere a dialog/drawer/panel needs a dismiss affordance instead of
 * hand-rolling a `<button>×</button>`. Crisp inline-SVG glyph (never a blank/missing
 * icon-font glyph), circular hit target, kit press physics, and two surfaces:
 *   • `light` (default) — slate glyph on a soft chip, for white/light surfaces
 *   • `dark` — white glyph on translucent white, for colored/gradient headers
 */

export interface WtCloseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Surface the button sits on. Default 'light'. */
    variant?: 'light' | 'dark';
    /** Square px size of the hit target. Default 36. */
    size?: number;
}

export const WtCloseButton = forwardRef<HTMLButtonElement, WtCloseButtonProps>(function WtCloseButton(
    { variant = 'light', size = 36, className, type = 'button', 'aria-label': ariaLabel = 'Close', ...rest }, ref,
) {
    return (
        <button
            ref={ref}
            type={type}
            aria-label={ariaLabel}
            title={ariaLabel}
            className={cn(
                'inline-grid place-items-center rounded-full shrink-0 outline-none',
                'transition-[background,color,transform,box-shadow] duration-150 ease-[cubic-bezier(.22,.61,.36,1)]',
                'hover:-translate-y-px active:translate-y-0 active:scale-90',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0',
                variant === 'dark'
                    ? 'text-white/85 bg-white/10 hover:bg-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50'
                    : 'text-slate-400 bg-slate-100/80 hover:bg-slate-200 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-slate-300',
                className,
            )}
            style={{ width: size, height: size }}
            {...rest}
        >
            <svg
                width={Math.round(size * 0.44)}
                height={Math.round(size * 0.44)}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                aria-hidden="true"
            >
                <path d="M6 6l12 12M18 6L6 18" />
            </svg>
        </button>
    );
});
