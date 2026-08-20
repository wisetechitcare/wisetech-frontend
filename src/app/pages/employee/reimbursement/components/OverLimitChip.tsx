import { Tooltip } from '@mui/material';

/**
 * Marks an expense that exceeded a spend limit.
 *
 * This was communicated by turning the amount red and nothing else — no label, no icon, no
 * tooltip. Colour alone is not information: it is invisible to a screen reader, invisible to
 * roughly one man in twelve, and it does not say what the limit was even to someone who sees it
 * perfectly. An approver looking at a red number could not tell whether it was over a category
 * cap, over the employee's per-request limit, or simply large.
 *
 * The chip carries the word as well as the colour, and names the cap when it is known.
 */

interface OverLimitChipProps {
    /** The cap that was breached, when the caller knows it. Renders a bare chip when it does not. */
    limit?: number | string | null;
    /** What the cap belongs to, e.g. "Travel" — used in the tooltip. */
    limitLabel?: string | null;
}

export default function OverLimitChip({ limit, limitLabel }: OverLimitChipProps) {
    const cap = Number(limit ?? NaN);
    const hasCap = Number.isFinite(cap) && cap > 0;
    const tooltip = hasCap
        ? `Over the ${limitLabel ? `${limitLabel} ` : ''}limit of ₹${cap.toLocaleString('en-IN')}`
        : 'This expense exceeded a spend limit';

    return (
        <Tooltip title={tooltip} arrow>
            <span
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    fontSize: 10, fontWeight: 800, lineHeight: 1.6,
                    padding: '1px 7px', borderRadius: 999,
                    color: '#b45309', backgroundColor: '#fffbeb', border: '1px solid #fde68a',
                    whiteSpace: 'nowrap', cursor: 'help',
                }}
            >
                {/* aria-hidden on the glyph — the word next to it is the accessible name. */}
                <span aria-hidden="true">⚠</span>
                Over limit
            </span>
        </Tooltip>
    );
}
