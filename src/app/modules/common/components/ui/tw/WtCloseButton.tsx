import { forwardRef, type CSSProperties } from 'react';
import { Button } from '@/ds/ui/button';

/**
 * WtCloseButton — the canonical close (×) control for the whole app, rendered by the v2 kit Button.
 *
 * Use this everywhere a dialog/drawer/panel needs a dismiss affordance instead of
 * hand-rolling a `<button>×</button>`. Crisp inline-SVG glyph (never a blank/missing
 * icon-font glyph) and circular hit target. It is one of the tinted icon buttons (the kit's
 * `tinted` variant, the same recipe as ActionIconButton / WtIconButton), so a close sits beside
 * the other icon actions as one family:
 *   • `light` (default) and `plain` — neutral slate tint, for white/light surfaces and quiet headers
 *   • `dark` — the same recipe in white, for coloured/gradient headers (where slate would not read)
 */

export interface WtCloseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Surface the button sits on. Default 'light'. */
    variant?: 'light' | 'dark' | 'plain';
    /** Square px size of the hit target. Default 36. */
    size?: number;
}

const NEUTRAL = { '--tint': 'var(--muted-foreground)' } as CSSProperties;
const ON_HEADER = { '--tint': 'white', '--tint-ink': 'white' } as CSSProperties;

export const WtCloseButton = forwardRef<HTMLButtonElement, WtCloseButtonProps>(function WtCloseButton(
    { variant = 'light', size = 36, className, style, type = 'button', 'aria-label': ariaLabel = 'Close', ...rest }, ref,
) {
    return (
        <Button
            ref={ref}
            type={type}
            variant="tinted"
            size="icon"
            aria-label={ariaLabel}
            title={ariaLabel}
            className={className}
            style={{ ...(variant === 'dark' ? ON_HEADER : NEUTRAL), width: size, height: size, ...style }}
            {...rest}
        >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
            </svg>
        </Button>
    );
});
