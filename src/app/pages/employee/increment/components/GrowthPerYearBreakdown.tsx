import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import dayjs from 'dayjs';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { IncrementRecord, AllTimeAnalytics } from '@services/incrementService';
import { formatCurrencyRounded } from '@utils/currency';
import { T } from '@app/modules/common/components/ui/tokens';
import { SkeletonBlock } from '@app/modules/common/components/Skeleton';
import { Panel, FooterStat, EmptyState } from './widgets';

interface GrowthPerYearBreakdownProps {
    records: IncrementRecord[];      // descending (newest first)
    analytics: AllTimeAnalytics;
    showSensitiveData: boolean;
    loading: boolean;
}

interface YearRow {
    year: string;
    endingSalary: number;
    incrementAmount: number;
    incrementPct: number;
    revisionCount: number;
    isFirstYear: boolean;
    isCurrentYear: boolean;
    isBestYear: boolean;
}

function buildYearRows(records: IncrementRecord[]): YearRow[] {
    const asc = [...records].reverse(); // oldest first
    const years = Array.from(new Set(asc.map(r => dayjs(r.effectiveDate).format('YYYY'))));
    const currentYear = dayjs().format('YYYY');

    const rows: YearRow[] = [];
    let priorSalary = 0;

    for (let i = 0; i < years.length; i++) {
        const yr = years[i];
        const yearRecords = asc.filter(r => dayjs(r.effectiveDate).format('YYYY') === yr);
        const endingSalary = yearRecords[yearRecords.length - 1].newSalary;
        const startingSalary = i === 0 ? yearRecords[0].previousSalary : priorSalary;

        const incrementAmount = endingSalary - startingSalary;
        const incrementPct = startingSalary > 0
            ? Number(((incrementAmount / startingSalary) * 100).toFixed(1))
            : 0;

        rows.push({
            year: yr,
            endingSalary,
            incrementAmount,
            incrementPct,
            revisionCount: yearRecords.length,
            isFirstYear: i === 0,
            isCurrentYear: yr === currentYear,
            isBestYear: false,
        });

        priorSalary = endingSalary;
    }

    // Mark the year with highest growth %
    if (rows.length > 1) {
        const maxPct = Math.max(...rows.filter(r => !r.isFirstYear).map(r => r.incrementPct));
        const bestIdx = rows.findIndex(r => r.incrementPct === maxPct && !r.isFirstYear);
        if (bestIdx >= 0) rows[bestIdx].isBestYear = true;
    }

    return rows.reverse(); // newest first for display
}

const GrowthPerYearBreakdown = ({ records, analytics, showSensitiveData, loading }: GrowthPerYearBreakdownProps) => {
    const rows = useMemo(() => buildYearRows(records ?? []), [records]);

    if (loading) {
        return <SkeletonBlock height={280} radius={T.radius.lg} />;
    }

    const blur = !showSensitiveData;
    const maxIncrement = Math.max(...rows.map(r => r.incrementAmount), 1);

    return (
        <Panel
            title="Year-by-Year Growth"
            subtitle="Annual salary progression"
            padded={false}
            sx={{ height: '100%' }}
            footer={<FooterStat label="Total Revisions" value={analytics.totalRevisions} />}
        >
            {rows.length === 0 ? (
                <EmptyState title="No history yet" subtitle="Year-by-year growth appears after the first revision." />
            ) : (
                <Box sx={{ overflow: 'auto', maxHeight: 320 }}>
                    {rows.map((row, i) => {
                        const isPositive = row.incrementAmount > 0;
                        const isFirst = row.isFirstYear;

                        return (
                            <Box
                                key={row.year}
                                sx={{
                                    px: 2.5, py: 1.5,
                                    borderBottom: i < rows.length - 1 ? `1px solid ${T.color.lineSoft}` : 'none',
                                    '&:hover': { bgcolor: T.color.panel },
                                    transition: 'background 0.12s',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                    <Box sx={{
                                        minWidth: 50,
                                        px: 1, py: 0.5,
                                        borderRadius: '7px',
                                        bgcolor: row.isCurrentYear ? T.color.accentSoft : T.color.panel,
                                        border: `1px solid ${row.isCurrentYear ? `${T.color.accent}33` : T.color.line}`,
                                        textAlign: 'center',
                                        flexShrink: 0,
                                    }}>
                                        <Typography sx={{ color: row.isCurrentYear ? T.color.accent : T.color.inkSoft, fontSize: '0.75rem', fontWeight: 800, lineHeight: 1.2 }}>
                                            {row.year}
                                        </Typography>
                                        {row.isCurrentYear && (
                                            <Typography sx={{ color: T.color.accent, fontSize: '0.58rem', fontWeight: 700, lineHeight: 1 }}>
                                                current
                                            </Typography>
                                        )}
                                    </Box>

                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                                            <Typography sx={{
                                                color: T.color.ink, fontSize: '0.95rem', fontWeight: 800,
                                                filter: blur ? 'blur(5px)' : 'none',
                                            }}>
                                                {formatCurrencyRounded(row.endingSalary)}/mo
                                            </Typography>

                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                {row.isBestYear && (
                                                    <EmojiEventsIcon sx={{ fontSize: 13, color: T.color.warning }} />
                                                )}
                                                {!isFirst && (
                                                    <Box sx={{
                                                        px: 0.9, py: 0.2,
                                                        borderRadius: '5px',
                                                        bgcolor: isPositive ? T.color.successSoft : T.color.panel,
                                                        border: `1px solid ${isPositive ? `${T.color.success}33` : T.color.line}`,
                                                    }}>
                                                        <Typography sx={{
                                                            color: isPositive ? T.color.success : T.color.inkFaint,
                                                            fontSize: '0.7rem', fontWeight: 800,
                                                        }}>
                                                            {isPositive ? '+' : ''}{row.incrementPct}%
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>

                                        {!isFirst && isPositive ? (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ flex: 1, height: 4, borderRadius: '2px', bgcolor: T.color.lineSoft, overflow: 'hidden' }}>
                                                    <Box sx={{
                                                        height: '100%',
                                                        width: `${Math.min(100, (row.incrementAmount / maxIncrement) * 100)}%`,
                                                        borderRadius: '2px',
                                                        bgcolor: row.isBestYear ? T.color.warning : T.color.success,
                                                        transition: 'width 0.4s ease',
                                                    }} />
                                                </Box>
                                                <Typography sx={{
                                                    color: T.color.success, fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
                                                    filter: blur ? 'blur(4px)' : 'none',
                                                }}>
                                                    +{formatCurrencyRounded(row.incrementAmount)}
                                                </Typography>
                                            </Box>
                                        ) : isFirst ? (
                                            <Typography sx={{ color: T.color.inkFaint, fontSize: '0.72rem', fontWeight: 600 }}>
                                                Initial salary · {row.revisionCount} record{row.revisionCount > 1 ? 's' : ''}
                                            </Typography>
                                        ) : (
                                            <Typography sx={{ color: T.color.inkFaint, fontSize: '0.72rem' }}>
                                                No growth this year
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            )}
        </Panel>
    );
};

export default GrowthPerYearBreakdown;
