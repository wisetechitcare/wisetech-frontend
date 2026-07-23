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
 * Tint formula matches utils/leaveTypeColors.ts (bg 12%, border 28%) so a leave chip rendered here
 * is pixel-identical to the same leave inside ApplyLeave's calendar.
 */
import { Chip, type ChipProps } from '@mui/material';
// Canonical module, not the ./tokens shim — that file's own docblock says new consumers must
// import from @app/theme/tokens directly (DESIGN_SYSTEM.md Phase 1).
import { tonePair, type SemanticTone } from '@app/theme/tokens';

/** hex → rgba at the given alpha. Accepts #rgb or #rrggbb. */
const rgba = (hex: string, a: number): string => {
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
    const fg = color ?? tonePair(tone).fg;
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
                    backgroundColor: solid ? fg : rgba(fg, 0.12),
                    color: solid ? '#fff' : fg,
                    border: `1px solid ${solid ? 'transparent' : rgba(fg, 0.28)}`,
                    '& .MuiChip-label': { px: dense ? 0.75 : 1, overflow: 'hidden', textOverflow: 'ellipsis' },
                },
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
            {...rest}
        />
    );
}
