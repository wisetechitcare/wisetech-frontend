import React from 'react';
import { Box, Paper } from '@mui/material';
import { SxProps } from '@mui/system';
import { Theme } from '@mui/material/styles';
import type { YearlyKpiCardProps } from './YearlyKpiCard';

/**
 * The salary KPIs on a phone, as a payslip statement rather than a stack of cards.
 *
 * These are not independent KPIs — they are a single sum: salary, less what was deducted,
 * equals what is payable. As separate cards each one spent a label, a sublabel, a
 * decorative icon tile and a full-width status strip, so three related numbers filled the
 * screen before anything else appeared AND the arithmetic between them was invisible.
 *
 * So it is shaped like the artifact it describes. Deductions carry a real minus sign, the
 * payable line is ruled off and banded as the total, and — the one piece of emphasis this
 * component spends — a meter under that total shows how much of it has actually arrived.
 * "₹87,746 payable, ₹35,878 pending" are two numbers you have to subtract in your head;
 * the meter is the answer, and it is the question this screen exists for.
 *
 * Shared because the Monthly view (PayrollStatsCards) and the Yearly view (Yearly.tsx)
 * build the same KPI list independently — the desktop cards are already duplicated, and a
 * second copy of this would be a third place for them to drift.
 *
 * Render it beside the desktop grid and let each own its breakpoint; it does not hide itself.
 */

export interface KpiCompactListProps {
    cards: Pick<YearlyKpiCardProps, 'label' | 'value' | 'footer' | 'footerValue'>[];
    /**
     * Long label → short one. The desktop labels stand alone in a card ("TOTAL SALARY AFTER
     * ATTENDANCE ADJUSTMENTS"); stacked directly above one another the qualifier is carried
     * by the neighbours, and the long form is just wrapping.
     */
    shortLabels?: Record<string, string>;
    /** The row that is the ANSWER — ruled off, banded, and given the meter. */
    resultLabel?: string;
    /** Paints the result red: a negative payable is money owed, not money earned. */
    resultIsNegative?: boolean;
    showSensitiveData?: boolean;
    sx?: SxProps<Theme>;
}

const INK = '#0f172a';
const MUTED = '#64748b';
const RULE = '#eef2f7';
const PAID = '#16a34a';
const DUE = '#dc2626';

/** "₹87,746" → 87746. Null when there is no number to find, which disables the meter
 *  rather than guessing — these figures are formatted upstream and this is presentation
 *  only, so a parse failure must never be louder than the numbers themselves. */
const parseAmount = (value?: string): number | null => {
    if (!value) return null;
    const digits = value.replace(/[^0-9.-]/g, '');
    if (!digits) return null;
    const parsed = Number(digits);
    return Number.isFinite(parsed) ? Math.abs(parsed) : null;
};

const KpiCompactList: React.FC<KpiCompactListProps> = ({
    cards,
    shortLabels = {},
    resultLabel = 'PAYABLE SALARY',
    resultIsNegative = false,
    showSensitiveData = true,
    sx,
}) => {
    const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';
    const resultTone = resultIsNegative ? DUE : PAID;

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: '14px',
                border: '1px solid #e9eef5',
                bgcolor: 'background.paper',
                boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 20px rgba(15,23,42,0.05)',
                overflow: 'hidden',
                ...sx,
            }}
        >
            <Box sx={{ px: 1.75, pt: 1.25, pb: 0.5 }}>
                {cards.filter((c) => c.label !== resultLabel).map((card) => {
                    // A deduction is subtracted. Printed bare it read as another amount you
                    // were getting — the minus is the difference between a list and a sum.
                    const isDeduction = card.label.includes('DEDUCTION');
                    const pending = card.footer?.toLowerCase().includes('pending') ? card.footerValue : null;

                    return (
                        <Box
                            key={card.label}
                            sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.5, py: 0.7 }}
                        >
                            <Box sx={{ minWidth: 0 }}>
                                <Box sx={{ fontSize: 12.5, fontWeight: 600, color: MUTED }}>
                                    {shortLabels[card.label] ?? card.label}
                                </Box>
                                {/* Only the exception earns a second line — "FY 2026-2027"
                                    and "0 pending" say nothing worth the height. */}
                                {pending && (
                                    <Box className={sensitiveCls} sx={{ fontSize: 10.5, fontWeight: 700, color: DUE, mt: 0.1 }}>
                                        {pending} pending
                                    </Box>
                                )}
                            </Box>
                            <Box
                                className={sensitiveCls}
                                sx={{
                                    fontSize: 15, fontWeight: 700, lineHeight: 1.15,
                                    whiteSpace: 'nowrap', color: isDeduction ? MUTED : INK,
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {isDeduction ? '− ' : ''}{card.value}
                            </Box>
                        </Box>
                    );
                })}
            </Box>

            {cards.filter((c) => c.label === resultLabel).map((card) => {
                const payable = parseAmount(card.value);
                const outstanding = card.footer?.toLowerCase().includes('pending')
                    ? parseAmount(card.footerValue)
                    : 0;
                // The meter only claims something it can prove.
                const canMeter = payable !== null && payable > 0 && outstanding !== null;
                const received = canMeter ? Math.max(0, payable - (outstanding as number)) : 0;
                const receivedPct = canMeter ? Math.min(100, Math.round((received / (payable as number)) * 100)) : 0;

                return (
                    <Box
                        key={card.label}
                        sx={{
                            borderTop: `1px solid ${RULE}`,
                            bgcolor: resultIsNegative ? 'rgba(220,38,38,0.04)' : 'rgba(22,163,74,0.045)',
                            px: 1.75, py: 1.25,
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.5 }}>
                            <Box sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: MUTED }}>
                                {shortLabels[card.label] ?? card.label}
                            </Box>
                            <Box
                                className={sensitiveCls}
                                sx={{
                                    fontSize: 21, fontWeight: 800, lineHeight: 1.1,
                                    letterSpacing: '-0.5px', whiteSpace: 'nowrap',
                                    color: resultTone, fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {card.value}
                            </Box>
                        </Box>

                        {/* The signature: how much of what you are owed has actually arrived.
                            Hidden at 100% — a full bar labelled "fully paid" is decoration. */}
                        {canMeter && (outstanding as number) > 0 && (
                            <Box sx={{ mt: 1 }}>
                                <Box sx={{ height: 5, borderRadius: 99, bgcolor: 'rgba(15,23,42,0.08)', overflow: 'hidden' }}>
                                    <Box sx={{ width: `${receivedPct}%`, height: '100%', borderRadius: 99, bgcolor: PAID }} />
                                </Box>
                                <Box
                                    className={sensitiveCls}
                                    sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.6, fontSize: 10.5, fontWeight: 700 }}
                                >
                                    <Box component="span" sx={{ color: PAID }}>{receivedPct}% received</Box>
                                    <Box component="span" sx={{ color: DUE }}>{card.footerValue} pending</Box>
                                </Box>
                            </Box>
                        )}
                    </Box>
                );
            })}
        </Paper>
    );
};

export default React.memo(KpiCompactList);
