import { KTIcon } from '@metronic/helpers';
import dayjs, { Dayjs } from 'dayjs';

/**
 * The empty state for the records table.
 *
 * This component exists because of a support ticket. An employee filed May and June expenses in
 * July, opened June, saw nothing, and reported the module as broken. It was — the table was
 * anchored on the submission date (fixed in Phase 3) — but the empty panel made it worse by
 * saying only "No records found", which is true, useless, and reads as data loss.
 *
 * So this panel does one job: say why the period is empty, and where the records actually are.
 * When we know expenses exist in neighbouring months, we say so and offer to go there. That
 * sentence is the whole point of the component; everything else here is deliberately quiet.
 */

export interface NeighbouringPeriod {
    /** The month that does contain records, e.g. dayjs('2026-06-01'). */
    date: Dayjs;
    count: number;
}

interface RecordsEmptyStateProps {
    /** The period the user is currently looking at. */
    periodLabel: string;
    /** Months near the current one that DO have expenses. Empty when there are none. */
    elsewhere?: NeighbouringPeriod[];
    /** Jumps the page period to a month that has records. */
    onGoToPeriod?: (date: Dayjs) => void;
    /** Set when a status filter is narrowing the view — the records may exist but be filtered out. */
    activeStatusFilter?: string | null;
    onClearStatusFilter?: () => void;
    /** Opens the intake form. Omitted on views where the reader cannot file an expense. */
    onAddExpense?: () => void;
}

export default function RecordsEmptyState({
    periodLabel,
    elsewhere = [],
    onGoToPeriod,
    activeStatusFilter,
    onClearStatusFilter,
    onAddExpense,
}: RecordsEmptyStateProps) {
    // A filtered-empty view is a different situation from a genuinely empty one, and the way out
    // is different too: clear the filter, don't file an expense.
    const isFiltered = Boolean(activeStatusFilter);

    return (
        <div
            style={{
                padding: '2rem 1.5rem',
                borderRadius: '14px',
                backgroundColor: '#f8fafc',
                border: '1px dashed #d6e0ea',
                textAlign: 'center',
            }}
        >
            <div
                style={{
                    width: 38, height: 38, borderRadius: '11px', display: 'grid', placeItems: 'center',
                    color: '#2563eb', backgroundColor: '#eff6ff', border: '1px solid #dbeafe',
                    margin: '0 auto 0.875rem',
                }}
                aria-hidden="true"
            >
                <KTIcon iconName="document" className="fs-4" />
            </div>

            <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.35rem' }}>
                {isFiltered
                    ? `No ${activeStatusFilter!.toLowerCase()} expenses in ${periodLabel}`
                    : `No expenses dated ${periodLabel}`}
            </p>

            {/* The sentence this component exists for. */}
            {!isFiltered && elsewhere.length > 0 && (
                <p style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '1rem', lineHeight: 1.55 }}>
                    Expenses are dated by when the money was spent, not when you submitted them. You
                    have{' '}
                    {elsewhere.map((p, i) => (
                        <span key={p.date.toISOString()}>
                            {i > 0 && (i === elsewhere.length - 1 ? ' and ' : ', ')}
                            <button
                                type="button"
                                onClick={() => onGoToPeriod?.(p.date)}
                                style={{
                                    background: 'none', border: 'none', padding: 0,
                                    color: '#2563eb', fontWeight: 700, cursor: 'pointer',
                                    textDecoration: 'underline', textUnderlineOffset: '2px',
                                }}
                            >
                                {p.count} in {p.date.format('MMMM YYYY')}
                            </button>
                        </span>
                    ))}
                    .
                </p>
            )}

            {!isFiltered && elsewhere.length === 0 && (
                <p style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '1rem', lineHeight: 1.55 }}>
                    Expenses appear in the month they were incurred, whenever you submit them.
                </p>
            )}

            {isFiltered && (
                <p style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '1rem', lineHeight: 1.55 }}>
                    Other expenses in {periodLabel} are hidden by this filter.
                </p>
            )}

            <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap">
                {isFiltered && onClearStatusFilter && (
                    <button type="button" className="btn btn-sm btn-light-primary" onClick={onClearStatusFilter}>
                        Show all statuses
                    </button>
                )}
                {!isFiltered && onAddExpense && (
                    <button type="button" className="btn btn-sm btn-light-primary" onClick={onAddExpense}>
                        Add an expense
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * Finds nearby months that DO have expenses, so the empty state can point at them.
 *
 * Deliberately looks at expense dates only — pointing the user at "the month you submitted in"
 * would re-teach the wrong mental model, which is what caused the confusion in the first place.
 * Returns at most two, nearest first, so the sentence stays a sentence.
 */
export const findExpensesElsewhere = (
    allRows: Array<{ expenseDate?: string | Date | null }>,
    currentPeriod: Dayjs,
): NeighbouringPeriod[] => {
    const counts = new Map<string, number>();
    for (const row of allRows) {
        if (!row.expenseDate) continue;
        const d = dayjs(row.expenseDate);
        if (!d.isValid()) continue;
        const key = d.format('YYYY-MM');
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const currentKey = currentPeriod.format('YYYY-MM');
    return [...counts.entries()]
        .filter(([key]) => key !== currentKey)
        .map(([key, count]) => ({ date: dayjs(`${key}-01`), count }))
        .sort((a, b) =>
            Math.abs(a.date.diff(currentPeriod, 'month')) - Math.abs(b.date.diff(currentPeriod, 'month')))
        .slice(0, 2);
};
