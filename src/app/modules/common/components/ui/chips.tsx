/**
 * ToneChip — the ONE chip/badge primitive.
 *
 * Replaces the hand-rolled `<span className='badge' style={{backgroundColor, color:'white'}}>`
 * pattern scattered across the app (saturated solid fills, per-file padding/radius drift) with a
 * single themed MUI Chip. Two ways to colour it, and only two:
 *
 *   <ToneChip tone="success" label="Approved" />       // semantic state → tonePair()
 *   <ToneChip color={cfgColor} label="Casual Leaves"/> // config-driven identity (leave types)
 *
 * `tone` is for meaning (approved/rejected/pending). `color` is for identity that an admin
 * configures (leave-type colours) — it wins over `tone`. Never pass a raw hex for something that
 * has a semantic tone; that's how palettes drift.
 *
 * Tint formula matches utils/leaveTypeColors.ts (bg 18%, border 40%) so a leave chip rendered here
 * is pixel-identical to the same leave inside ApplyLeave's calendar. Soft alphas are raised so
 * status + meta chips stay readable on glass cards without a second MetaPill primitive.
 */
import React from 'react';
import { Box, Chip, type ChipProps } from '@mui/material';
// Canonical module, not the ./tokens shim — that file's own docblock says new consumers must
// import from @app/theme/tokens directly (DESIGN_SYSTEM.md Phase 1).
import { tonePair, type SemanticTone } from '@app/theme/tokens';

/**
 * hex → rgba at the given alpha. Accepts #rgb or #rrggbb.
 *
 * Exported because it IS the kit's tint formula: any surface that needs a soft
 * tone fill (chips, count badges, accent tiles) must derive it here rather than
 * hand-rolling an rgba, and must not use `tonePair().soft` — those pastels are
 * light-mode values and wash out on the dark canvas, whereas an alpha tint over
 * the surface stays correct in both modes.
 */
export const toneAlpha = (hex: string, a: number): string => {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    if (Number.isNaN(n) || h.length !== 6) return hex;
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export interface ToneChipProps extends Omit<ChipProps, 'color' | 'variant'> {
    /** Semantic meaning. Ignored when `color` is given. */
    tone?: SemanticTone;
    /** Explicit identity colour (e.g. an admin-configured leave-type colour). Overrides `tone`. */
    color?: string;
    /** Solid fill instead of the default soft tint. Use sparingly — soft is the standard. */
    solid?: boolean;
    /** Denser variant for in-table use. */
    dense?: boolean;
}

export function ToneChip({ tone = 'neutral', color, solid = false, dense = false, sx, ...rest }: ToneChipProps) {
    const fg = color ?? tonePair(tone)?.fg ?? '#2563eb';
    return (
        <Chip
            size='small'
            sx={[
                {
                    height: dense ? 20 : 24,
                    fontSize: dense ? '0.7rem' : '0.75rem',
                    fontWeight: 600,
                    borderRadius: 999,
                    maxWidth: '100%',
                    backgroundColor: solid ? fg : toneAlpha(fg, 0.18),
                    color: solid ? '#fff' : fg,
                    border: `1px solid ${solid ? 'transparent' : toneAlpha(fg, 0.4)}`,
                    '& .MuiChip-label': { px: dense ? 0.75 : 1, overflow: 'hidden', textOverflow: 'ellipsis' },
                },
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
            {...rest}
        />
    );
}

/**
 * StatusPill — the Leads table's status badge: solid admin-configured colour, 6px corners,
 * white dot + white label. For CONFIGURED statuses (lead/project/agenda statuses carry their own
 * colour); semantic states still use ToneChip.
 *
 * Pass `onClick` and it becomes a real button (keyboard-operable, focus ring) — e.g. a status you
 * can change in place; `endIcon` then carries the affordance (a chevron).
 */
export function StatusPill({
    label,
    color,
    onClick,
    endIcon,
    disabled,
    ...aria
}: {
    label: React.ReactNode;
    color?: string | null;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    endIcon?: React.ReactNode;
    disabled?: boolean;
    'aria-label'?: string;
    'aria-haspopup'?: 'menu' | 'listbox';
    'aria-expanded'?: boolean;
}) {
    const interactive = !!onClick;
    return (
        <Box
            component={interactive ? 'button' : 'span'}
            type={interactive ? 'button' : undefined}
            onClick={interactive && !disabled ? onClick : undefined}
            disabled={interactive ? disabled : undefined}
            {...aria}
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                maxWidth: '100%',
                bgcolor: color || '#64748B',
                color: '#fff',
                borderRadius: '6px',
                border: 0,
                p: '4px 10px 4px 8px',
                font: 'inherit',
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.4,
                whiteSpace: 'nowrap',
                cursor: interactive && !disabled ? 'pointer' : 'default',
                opacity: disabled ? 0.6 : 1,
                ...(interactive && {
                    '&:hover': { filter: 'brightness(0.93)' },
                    '&:focus-visible': { outline: '2px solid', outlineColor: color || '#64748B', outlineOffset: 2 },
                }),
            }}
        >
            <Box component="span" aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#fff', flexShrink: 0 }} />
            <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</Box>
            {endIcon && <Box component="span" aria-hidden sx={{ display: 'inline-flex', ml: '-2px' }}>{endIcon}</Box>}
        </Box>
    );
}
