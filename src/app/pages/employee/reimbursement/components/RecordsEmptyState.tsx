import { Box, ButtonBase } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { WtButton } from '@app/modules/common/components/ui/buttons';
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
        // One strip, not a panel. This used to be a centred stack — icon, headline, sentence,
        // button — inside 2rem of padding, so an empty month left a ~230px hole and two empty
        // sections filled a screen with nothing. Same words, laid along one line: it reads at a
        // glance and the table below stays where the eye expects it.
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                flexWrap: 'wrap',
                px: 2,
                py: 1.25,
                borderRadius: '10px',
                border: '1px dashed',
                borderColor: 'divider',
                bgcolor: 'action.hover',
            }}
        >
            <Box
                aria-hidden="true"
                sx={{
                    width: 28, height: 28, borderRadius: '8px', display: 'grid', placeItems: 'center',
                    flexShrink: 0, color: 'primary.main', bgcolor: 'background.paper',
                    border: '1px solid', borderColor: 'divider',
                }}
            >
                <KTIcon iconName="document" className="fs-6" />
            </Box>

            <Box sx={{ minWidth: 0, flex: '1 1 auto', fontSize: '0.82rem', lineHeight: 1.5 }}>
                <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {isFiltered
                        ? `No ${activeStatusFilter!.toLowerCase()} expenses in ${periodLabel}`
                        : `No expenses in ${periodLabel}`}
                </Box>
                {((!isFiltered && elsewhere.length > 0) || isFiltered) && (
                    <Box component="span" sx={{ color: 'text.secondary' }}>
                        {' — '}
                        {isFiltered ? (
                            `other statuses are hidden by this filter.`
                        ) : (
                            <>
                                found{' '}
                                {elsewhere.map((p, i) => (
                                    <span key={p.date.toISOString()}>
                                        {i > 0 && (i === elsewhere.length - 1 ? ' and ' : ', ')}
                                        <ButtonBase
                                            onClick={() => onGoToPeriod?.(p.date)}
                                            sx={{
                                                font: 'inherit', fontWeight: 700, color: 'primary.main',
                                                textDecoration: 'underline', textUnderlineOffset: '2px',
                                                verticalAlign: 'baseline',
                                            }}
                                        >
                                            {p.count} in {p.date.format('MMMM YYYY')}
                                        </ButtonBase>
                                    </span>
                                ))}
                            </>
                        )}
                    </Box>
                )}
            </Box>

            {isFiltered && onClearStatusFilter && (
                <WtButton ghost size="small" onClick={onClearStatusFilter}>
                    Show all statuses
                </WtButton>
            )}
            {!isFiltered && onAddExpense && (
                <WtButton size="small" onClick={onAddExpense}>
                    Add an expense
                </WtButton>
            )}
        </Box>
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
