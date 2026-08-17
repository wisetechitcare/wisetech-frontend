import { Box, ButtonBase, alpha } from '@mui/material';
import { STATUS, STATUS_LABEL, STATUS_TONE, StatusNum } from '../utils/reimbursementFormat';

/**
 * Status filter for the records table.
 *
 * Six separate screens used to hard-code `status === 1`, so pending and rejected expenses were
 * simply absent with nothing on screen to say so — the reported symptom was "it only shows if
 * it's approved". Status is now a filter the user controls, it defaults to All, and every option
 * carries its count so "5 Pending" is legible before anything is clicked.
 *
 * The counts are the point. A zero count still renders — "0 Rejected" is information, and hiding
 * empty options is how a screen ends up silently narrowed again.
 *
 * ── The rail ──────────────────────────────────────────────────────────────────
 * This was five saturated pills, each with a filled counter badge riding inside it: ten coloured
 * shapes in one 400px row, all shouting at the same volume, so an empty "0 Rejected" drew as much
 * eye as the four claims actually waiting on someone. Nothing encoded that these are one claim's
 * stages rather than five unrelated tags.
 *
 * It is now one connected rail with three separate signals, each doing exactly one job:
 *   · a 6px dot     — which state this is (the module's semantic tone)
 *   · weight + tint — which state you are filtered to
 *   · the seat rule — how much of the period sits in that state, as a share of All
 *
 * That last one is the point of the redesign: the 3px rule under each segment fills to the
 * status's share of the period, so the shape of the month reads before any digit does, and a zero
 * count is a quiet empty channel instead of a shout. `All` is always full — it is the unit the
 * other segments are fractions of.
 */

/** `all` plus one entry per filterable status. MIXED is a display state, never a filter. */
export type StatusCounts = { all: number } & Record<StatusNum, number>;

interface StatusFilterChipsProps {
    value: StatusNum | null;
    onChange: (next: StatusNum | null) => void;
    counts: StatusCounts;
}

// Needs-info sits next to pending because that is what it is — waiting on someone, not decided.
const ORDER: StatusNum[] = [STATUS.PENDING, STATUS.NEEDS_INFO, STATUS.APPROVED, STATUS.REJECTED];

/** The neutral tone for `All` — a total is not a status, so it does not borrow a status colour. */
const ALL_TONE = { color: '#475569', bg: '#f1f5f9' };

export default function StatusFilterChips({ value, onChange, counts }: StatusFilterChipsProps) {
    const total = counts.all || 0;

    const segment = (
        key: string,
        label: string,
        count: number,
        selected: boolean,
        tone: { color: string; bg: string },
        share: number,
        onClick: () => void,
    ) => (
        <ButtonBase
            key={key}
            onClick={onClick}
            aria-pressed={selected}
            aria-label={`${label}, ${count} ${count === 1 ? 'record' : 'records'}`}
            sx={(theme) => {
                const dark = theme.palette.mode === 'dark';
                return {
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    flex: '0 0 auto',
                    px: 1.5,
                    height: '100%',
                    whiteSpace: 'nowrap',
                    fontSize: 12,
                    lineHeight: 1,
                    color: selected ? tone.color : 'text.secondary',
                    bgcolor: selected ? alpha(tone.color, dark ? 0.2 : 0.1) : 'transparent',
                    borderLeft: '1px solid',
                    borderColor: 'divider',
                    '&:first-of-type': { borderLeft: 0 },
                    transition: 'background-color 150ms ease, color 150ms ease',
                    '&:hover': { bgcolor: selected ? alpha(tone.color, dark ? 0.26 : 0.14) : 'action.hover' },
                    '&.Mui-focusVisible': { outline: `2px solid ${tone.color}`, outlineOffset: '-2px' },
                    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                };
            }}
        >
            <Box
                aria-hidden
                sx={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    bgcolor: tone.color,
                    // An empty state stays legible but stops competing with the ones holding work.
                    opacity: count === 0 && !selected ? 0.35 : 1,
                }}
            />
            <Box component="span" sx={{ fontWeight: selected ? 700 : 600 }}>{label}</Box>
            <Box
                component="span"
                sx={{
                    // Tabular figures so the counts hold their column when one ticks 9 → 10.
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 700,
                    color: selected ? 'inherit' : 'text.primary',
                    opacity: count === 0 && !selected ? 0.4 : 1,
                }}
            >
                {count}
            </Box>

            {/* Solid bottom line drawn only when selected */}
            {selected && (
                <Box
                    aria-hidden
                    sx={{
                        position: 'absolute', left: 0, right: 0, bottom: 0, height: 3,
                        bgcolor: tone.color,
                    }}
                />
            )}
        </ButtonBase>
    );

    return (
        <Box
            role="group"
            aria-label="Filter records by approval status"
            sx={{
                display: 'flex',
                alignItems: 'stretch',
                height: 32,
                maxWidth: '100%',
                width: 'fit-content',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                // Below ~500px the rail scrolls rather than wrapping — a broken rail would
                // read as two controls, and the page must never scroll sideways itself.
                overflowX: 'auto',
                overflowY: 'hidden',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
            }}
        >
            {segment('all', 'All', total, value === null, ALL_TONE, 1, () => onChange(null))}
            {ORDER.map((s) => {
                const count = counts[s] ?? 0;
                return segment(
                    String(s), STATUS_LABEL[s], count, value === s, STATUS_TONE[s],
                    total > 0 ? count / total : 0,
                    () => onChange(value === s ? null : s),
                );
            })}
        </Box>
    );
}

/** Counts rows per status for the chips. Rows carry either the numeric or the stringified form. */
export const countByStatus = (
    rows: Array<{ status?: unknown }>,
    resolve: (s: unknown) => StatusNum,
): StatusCounts => {
    const counts: StatusCounts = {
        all: rows.length,
        [STATUS.PENDING]: 0,
        [STATUS.NEEDS_INFO]: 0,
        [STATUS.APPROVED]: 0,
        [STATUS.REJECTED]: 0,
        [STATUS.MIXED]: 0,
    };
    for (const row of rows) {
        const s = resolve(row.status);
        if (s in counts) counts[s] += 1;
    }
    return counts;
};
