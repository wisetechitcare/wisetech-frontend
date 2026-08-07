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
 */

/** `all` plus one entry per filterable status. MIXED is a display state, never a filter. */
export type StatusCounts = { all: number } & Record<StatusNum, number>;

interface StatusFilterChipsProps {
    value: StatusNum | null;
    onChange: (next: StatusNum | null) => void;
    counts: StatusCounts;
}

const ORDER: StatusNum[] = [STATUS.PENDING, STATUS.APPROVED, STATUS.REJECTED];

export default function StatusFilterChips({ value, onChange, counts }: StatusFilterChipsProps) {
    const chip = (
        key: string,
        label: string,
        count: number,
        selected: boolean,
        tone: { color: string; bg: string },
        onClick: () => void,
    ) => (
        <button
            key={key}
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 30, padding: '0 12px', borderRadius: 999,
                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                color: selected ? '#ffffff' : tone.color,
                backgroundColor: selected ? tone.color : tone.bg,
                border: `1px solid ${selected ? tone.color : 'transparent'}`,
                transition: 'background-color 150ms ease, color 150ms ease',
            }}
        >
            {label}
            <span
                style={{
                    fontSize: '0.7rem', fontWeight: 800,
                    padding: '1px 6px', borderRadius: 999,
                    color: selected ? tone.color : '#ffffff',
                    backgroundColor: selected ? '#ffffff' : tone.color,
                }}
            >
                {count}
            </span>
        </button>
    );

    return (
        <div
            className="d-flex align-items-center gap-2 flex-wrap"
            role="group"
            aria-label="Filter records by approval status"
        >
            {chip('all', 'All', counts.all, value === null, { color: '#475569', bg: '#f1f5f9' }, () => onChange(null))}
            {ORDER.map((s) =>
                chip(String(s), STATUS_LABEL[s], counts[s] ?? 0, value === s, STATUS_TONE[s], () =>
                    onChange(value === s ? null : s)),
            )}
        </div>
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
        [STATUS.APPROVED]: 0,
        [STATUS.REJECTED]: 0,
        [STATUS.MIXED]: 0,
    };
    for (const row of rows) {
        const s = resolve(row.status);
        if (s === STATUS.PENDING || s === STATUS.APPROVED || s === STATUS.REJECTED) counts[s] += 1;
    }
    return counts;
};
