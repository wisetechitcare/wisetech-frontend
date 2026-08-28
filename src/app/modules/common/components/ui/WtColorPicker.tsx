import React, { useId, useMemo } from 'react';
import { Box, Stack, TextField, Tooltip } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { TRIO, type Trio } from './patterns';

/**
 * WtColorPicker — the app's colour control: a curated palette plus a custom
 * colour, in one component.
 *
 * Before this, colour picking was a raw `<input type="color">` with Bootstrap
 * `form-control` classes (Public Holiday form, Appearance settings) — both
 * banned by the UI standard, neither themed, and no palette to keep choices
 * coherent. Anything letting a user colour a record should use this.
 *
 * Three ways to choose, in increasing precision: the kit palette for the common
 * case, the custom swatch for a free choice, and the hex field for an exact
 * brand value.
 *
 * The custom swatch opens the BROWSER's colour picker. That is a deliberate
 * trade-off, chosen over a themed in-app popover: it gives a real gradient +
 * eyedropper on every platform, works on touch, is keyboard-accessible, and
 * costs nothing in bundle size. The price is that the popup itself is OS chrome
 * and does not follow the app theme — unlike `<input type="date">`, which is
 * banned here, the colour popup neither formats data by locale nor hides its
 * value, so the mismatch is cosmetic and confined to the moment of picking.
 *
 * Values are a palette entry's `value` (a kit tone name) or a hex string.
 */

export interface ColorSwatch {
    /** Stored value. A kit tone name (`blue`) or a hex — the caller decides. */
    value: string;
    /** Rendered colour. */
    hex: string;
    label: string;
}

/** The kit palette, so a colour chosen here always matches a TRIO surface. */
export const KIT_SWATCHES: readonly ColorSwatch[] = (
    Object.entries(TRIO) as [string, Trio][]
).map(([name, trio]) => ({
    value: name,
    hex: trio.c,
    label: name.charAt(0).toUpperCase() + name.slice(1),
}));

/** True when a stored value is a literal colour rather than a palette name. */
export const isHexColor = (value: unknown): value is string =>
    typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());

/**
 * Resolve any stored value to a renderable hex.
 * A palette name resolves through the palette; a hex passes through; anything
 * unrecognised falls back so a bad value never renders as a broken swatch.
 */
export const resolveSwatchHex = (
    value: string | null | undefined,
    palette: readonly ColorSwatch[] = KIT_SWATCHES,
    fallback = TRIO.slate.c,
): string => {
    // Normalise first: the type predicate would otherwise narrow `value` to
    // null|undefined for the palette lookup below, which never matches.
    const raw = typeof value === 'string' ? value.trim() : '';
    if (isHexColor(raw)) return raw;
    const match = palette.find((swatch) => swatch.value === raw);
    return match?.hex ?? fallback;
};

export interface WtColorPickerProps {
    /** Stored value: a palette entry's `value`, or a hex. */
    value: string;
    onChange: (value: string) => void;
    /** Defaults to the kit palette. */
    palette?: readonly ColorSwatch[];
    /** Accessible name for the group, e.g. "Section colour". */
    label: string;
    /** Offer a custom colour beyond the palette. Default true. */
    allowCustom?: boolean;
    size?: number;
    disabled?: boolean;
}

export function WtColorPicker({
    value, onChange, palette = KIT_SWATCHES, label, allowCustom = true, size = 36, disabled,
}: WtColorPickerProps) {
    const inputId = useId();
    const currentHex = useMemo(() => resolveSwatchHex(value, palette), [value, palette]);
    const isCustom = useMemo(
        () => isHexColor(value) && !palette.some((swatch) => swatch.hex.toLowerCase() === value.toLowerCase()),
        [value, palette],
    );

    return (
        <Stack spacing={1.25}>
            <Box role="radiogroup" aria-label={label} sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {palette.map((swatch) => {
                    const selected = !isCustom && (value === swatch.value || value?.toLowerCase() === swatch.hex.toLowerCase());
                    return (
                        <Tooltip key={swatch.value} title={swatch.label}>
                            <Box
                                component="button"
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                aria-label={swatch.label}
                                disabled={disabled}
                                onClick={() => onChange(swatch.value)}
                                sx={{
                                    width: size,
                                    height: size,
                                    display: 'grid',
                                    placeItems: 'center',
                                    borderRadius: '10px',
                                    cursor: disabled ? 'not-allowed' : 'pointer',
                                    bgcolor: swatch.hex,
                                    color: '#fff',
                                    border: '2px solid',
                                    borderColor: selected ? 'text.primary' : 'transparent',
                                    transform: selected ? 'scale(1.08)' : 'none',
                                    transition: 'transform .15s, border-color .15s',
                                    opacity: disabled ? 0.5 : 1,
                                    '&:focus-visible': { outline: '2px solid', outlineColor: 'text.primary', outlineOffset: 2 },
                                }}
                            >
                                {/* A tick, not colour alone — colour-only state fails WCAG 1.4.1. */}
                                {selected && <KTIcon iconName="check" className="fs-7" />}
                            </Box>
                        </Tooltip>
                    );
                })}

                {allowCustom && (
                    <Tooltip title="Custom colour">
                        <Box
                            component="label"
                            htmlFor={inputId}
                            sx={{
                                width: size,
                                height: size,
                                display: 'grid',
                                placeItems: 'center',
                                borderRadius: '10px',
                                cursor: disabled ? 'not-allowed' : 'pointer',
                                border: '2px solid',
                                borderColor: isCustom ? 'text.primary' : 'divider',
                                transform: isCustom ? 'scale(1.08)' : 'none',
                                transition: 'transform .15s, border-color .15s',
                                // The sweep reads as "any colour" without claiming
                                // to be one of the palette entries.
                                background: isCustom
                                    ? currentHex
                                    : 'conic-gradient(#ef4444,#f59e0b,#22c55e,#06b6d4,#3b82f6,#a855f7,#ef4444)',
                                color: '#fff',
                                '&:focus-within': { outline: '2px solid', outlineColor: 'text.primary', outlineOffset: 2 },
                            }}
                        >
                            {isCustom && <KTIcon iconName="check" className="fs-7" />}
                            {/* Visually hidden, but still a real focusable input so
                                the swatch is reachable by keyboard. */}
                            <Box
                                component="input"
                                id={inputId}
                                type="color"
                                aria-label={`${label} — custom colour`}
                                disabled={disabled}
                                value={currentHex}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
                                sx={{ width: 0, height: 0, opacity: 0, position: 'absolute', pointerEvents: 'none' }}
                            />
                        </Box>
                    </Tooltip>
                )}
            </Box>

            {allowCustom && (
                <TextField
                    size="small"
                    label="Hex"
                    value={currentHex.toUpperCase()}
                    disabled={disabled}
                    onChange={(event) => {
                        const next = event.target.value.trim();
                        // Only commit a complete, valid hex — a partial one would
                        // repaint the preview to the fallback on every keystroke.
                        if (isHexColor(next)) onChange(next);
                    }}
                    inputProps={{ maxLength: 7, spellCheck: false }}
                    sx={{ width: 140 }}
                />
            )}

        </Stack>
    );
}

export default WtColorPicker;
