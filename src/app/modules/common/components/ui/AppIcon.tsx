import { KTIcon } from '@metronic/helpers';
import { keeniconFor } from './iconMap';

/**
 * Everything an `<i>` could carry is still accepted and forwarded — `title`, `aria-hidden`,
 * `aria-label`, `role`, `data-*`, `onClick`. The tags being migrated use these for tooltips
 * and accessibility, and dropping them on conversion would be a silent regression rather
 * than a visible one.
 */
export interface AppIconProps extends Omit<React.HTMLAttributes<HTMLElement>, 'color' | 'style' | 'className'> {
    /**
     * Either a Bootstrap Icon name (`bi-gear`) — translated to its keenicon through
     * `iconMap` — or a keenicon name directly (`setting-2`). Both are accepted so a call
     * site can be migrated without its parent having to change at the same time.
     */
    name: string;
    /**
     * Keenicon sizing class (`fs-1`…`fs-8`).
     *
     * Defaults to `fs-4` (16.25px) rather than inheriting. Inheriting looked correct on paper
     * — the Bootstrap `<i>` tags it replaced inherited too — but keenicons draw noticeably
     * smaller inside the em box than Bootstrap Icons do, so at an inherited 11-13px they came
     * out cramped and, against a light background, close to invisible. A real default is the
     * fix; call sites that had an explicit pixel size still pass their own class.
     */
    className?: string;
    /** Painted via `currentColor` on a wrapper, since KTIcon takes no style prop. */
    color?: string;
    /** Font size for the Bootstrap fallback only; keenicons size via `className`. */
    fallbackSize?: number;
    /**
     * Passthrough for the non-size, non-colour styles the replaced `<i>` tags carried
     * (margins, verticalAlign, transform…). Do NOT put `fontSize` here — express size as a
     * `fs-*` className instead, or the inline value and the class will fight each other.
     */
    style?: React.CSSProperties;
}

/**
 * The one icon element in the app.
 *
 * Bootstrap Icons and keenicons had been used side by side, which is why the same action
 * looked different depending on which screen you were on — a Configure pencil on a config
 * page did not match the Configure pencil on an MUI-kit page. This resolves a `bi-*` name
 * to its keenicon and renders KTIcon.
 *
 * An unmapped name still renders its Bootstrap glyph. That is deliberate: a slightly
 * off-family icon is a much smaller failure than a blank square or a confidently wrong
 * picture, and it makes the remaining migration visible rather than silent.
 */
export function AppIcon({ name, className = 'fs-4', color, fallbackSize, style, ...rest }: AppIconProps) {
    // Already a keenicon name (no `bi-` prefix) → pass straight through.
    const keenicon = name.startsWith('bi-') ? keeniconFor(name) : name;

    if (!keenicon) {
        return (
            <i
                {...rest}
                className={`bi ${name}`}
                style={{
                    ...style,
                    ...(fallbackSize ? { fontSize: `${fallbackSize}px` } : null),
                    ...(color ? { color } : null),
                }}
            />
        );
    }
    return (
        <span
            {...rest}
            style={{
                // `color` is only emitted when given, so an icon with no explicit colour
                // inherits `currentColor` from its container and follows the app theme
                // (including dark mode) instead of being pinned to a literal.
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
            <KTIcon iconName={keenicon} className={className} />
        </span>
    );
}

export default AppIcon;
