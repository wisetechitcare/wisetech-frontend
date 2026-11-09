import { SegmentedFilter, type SegmentOption, type SegmentTone } from '@/ds/patterns/segmented-filter';
import { STATUS, STATUS_LABEL, StatusNum, STATUS_TONE } from '../utils/reimbursementFormat';

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

/** Each status's accent — the same meaning it has on the record chips. */
// The module's one status palette (utils/reimbursementFormat STATUS_TONE).
const TONE: Record<StatusNum, SegmentTone> = STATUS_TONE;

/** Rendered by the design system's `SegmentedFilter`; this file only says which statuses, in which order. */
export default function StatusFilterChips({ value, onChange, counts }: StatusFilterChipsProps) {
    const options: SegmentOption[] = [
        { value: 'all', label: 'All', count: counts.all || 0, tone: 'neutral' },
        ...ORDER.map((s) => ({ value: String(s), label: STATUS_LABEL[s], count: counts[s] ?? 0, tone: TONE[s] })),
    ];
    return (
        <SegmentedFilter
            aria-label="Filter records by approval status"
            options={options}
            value={value === null ? 'all' : String(value)}
            // Clicking the selected status again returns to All.
            onValueChange={(v) => onChange(v === 'all' || v === String(value) ? null : (Number(v) as StatusNum))}
        />
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
