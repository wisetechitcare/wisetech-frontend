import type React from 'react';
import { iconFor } from '@/ds/lib/icons/registry';
import { iconPixelSize } from '@/ds/lib/icons/size';

/**
 * Everything an `<i>` could carry is still accepted and forwarded — `title`, `aria-hidden`,
 * `aria-label`, `role`, `data-*`, `onClick`. The tags being migrated use these for tooltips
 * and accessibility, and dropping them on conversion would be a silent regression rather
 * than a visible one.
 */
export interface AppIconProps extends Omit<React.HTMLAttributes<HTMLElement>, 'color' | 'style' | 'className'> {
    /**
     * Any name the app already uses — a keenicon name (`setting-2`), a Bootstrap name
     * (`bi-gear`), or a FontAwesome name (`fa-gear`). All three resolve through
     * `src/ds/lib/icons/registry.ts`, so a call site migrates by changing its element, never its string.
     */
    name: string;
    /**
     * Metronic sizing class (`fs-1`…`fs-10`). Kept as the sizing API because ~570 call
     * sites already pass it; `iconPixelSize` (`@/ds/lib/icons/size`) turns it into the pixel size Lucide wants.
     */
    className?: string;
    /** Painted through `currentColor`, so an icon with no explicit colour follows the theme. */
    color?: string;
    /** Explicit pixel size. Wins over `className` when both are given. */
    fallbackSize?: number;
    /**
     * Passthrough for the non-size, non-colour styles the replaced `<i>` tags carried
     * (margins, verticalAlign, transform…). Do NOT put `fontSize` here — express size as a
     * `fs-*` className or `fallbackSize` instead.
     */
    style?: React.CSSProperties;
}

/**
 * Lucide draws at stroke-width 2 by default, which is correct at 24px and heavy at 16px —
 * where most of this app's icons live. 1.75 keeps them legible next to 13-14px label text
 * without reading as bold.
 */
const STROKE = 1.75;

/**
 * The one icon element in the app.
 *
 * Five icon systems used to draw these — keenicons, Bootstrap Icons, FontAwesome, MUI icons
 * and a little Lucide — which is why the same action looked different depending on which
 * screen you were on. They also cost ~596KB of icon font on every route to draw ~400
 * distinct glyphs, because fonts ship whole and cannot be tree-shaken. This resolves every
 * name through one registry to one library, and only the glyphs named there get bundled.
 *
 * An unresolved name renders nothing rather than a wrong picture, and warns in development
 * naming the icon so it shows up while someone is looking at the screen. A blank gap is a
 * smaller failure than a confidently incorrect glyph, and unlike the old Bootstrap fallback
 * it does not quietly keep a 131KB font alive to serve it.
 */
export function AppIcon({ name, className = 'fs-4', color, fallbackSize, style, ...rest }: AppIconProps) {
    const Glyph = iconFor(name);

    if (!Glyph) {
        if (import.meta.env.DEV) {
            console.warn(`[AppIcon] no icon registered for "${name}" — add it to src/ds/lib/icons/registry.ts`);
        }
        return null;
    }

    const size = fallbackSize ?? iconPixelSize(className);

    return (
        <span
            {...rest}
            /* Forwarded, not merely read for sizing. Call sites use this class for spacing
             * (`me-1`, `me-2`), colour (`text-danger`, `text-white`) and animation
             * (`ci-spin`) as well as size — dropping it detaches icons from their labels and
             * stops spinners spinning, with no error anywhere to say so. The `fs-*` token
             * rides along harmlessly: it sets a font-size the SVG does not size from. */
            className={className}
            style={{
                ...style,
                ...(color ? { color } : null),
                // inline-flex + centred + lineHeight:1 keeps the glyph optically centred on
                // the text baseline next to a label. Without lineHeight the span inherits the
                // parent's line-height and the icon sits high, which is what made icon+label
                // rows read as misaligned.
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                verticalAlign: 'middle',
                flexShrink: 0,
            }}
        >
            <Glyph size={size} strokeWidth={STROKE} aria-hidden />
        </span>
    );
}

export default AppIcon;
