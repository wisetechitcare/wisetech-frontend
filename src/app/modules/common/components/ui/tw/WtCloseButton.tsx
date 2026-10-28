import { forwardRef, type CSSProperties } from 'react';
import { Button } from '@/ds/ui/button';

/**
 * WtCloseButton — the canonical close (×) control for the whole app, rendered by the v2 kit Button.
 *
 * Use this everywhere a dialog/drawer/panel needs a dismiss affordance instead of
 * hand-rolling a `<button>×</button>`. Crisp inline-SVG glyph (never a blank/missing
 * icon-font glyph), circular hit target, and three surfaces, each a kit variant:
 *   • `light` (default) — `secondary`: soft chip, for white/light surfaces
 *   • `dark` — `tinted` in white: white glyph on translucent white, for colored/gradient headers
 *   • `plain` — `ghost`: the bare glyph, no chip, for quiet headers that want no second
 *     shape competing with the title
 */

export interface WtCloseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Surface the button sits on. Default 'light'. */
    variant?: 'light' | 'dark' | 'plain';
    /** Square px size of the hit target. Default 36. */
    size?: number;
}

const KIT_VARIANT = { light: 'secondary', dark: 'tinted', plain: 'ghost' } as const;
const ON_HEADER = { '--tint': 'white', '--tint-ink': 'white' } as CSSProperties;

export const WtCloseButton = forwardRef<HTMLButtonElement, WtCloseButtonProps>(function WtCloseButton(
    { variant = 'light', size = 36, className, style, type = 'button', 'aria-label': ariaLabel = 'Close', ...rest }, ref,
) {
    return (
        <Button
            ref={ref}
            type={type}
            variant={KIT_VARIANT[variant]}
            size="icon"
            aria-label={ariaLabel}
            title={ariaLabel}
            className={className}
            style={{ ...(variant === 'dark' ? ON_HEADER : null), width: size, height: size, ...style }}
            {...rest}
        >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
            </svg>
        </Button>
    );
});
