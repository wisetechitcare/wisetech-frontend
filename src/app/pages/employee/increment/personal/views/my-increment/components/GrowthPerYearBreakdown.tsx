import React, { useMemo } from 'react';
import { Box, Paper, Typography, Skeleton } from '@mui/material';
import { IncrementRecord, AllTimeAnalytics } from '../../../../../../../../services/incrementService';
import { formatCurrencyRounded } from '@utils/currency';
import dayjs from 'dayjs';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

interface GrowthPerYearBreakdownProps {
    records: IncrementRecord[];      // descending (newest first)
    analytics: AllTimeAnalytics;
    showSensitiveData: boolean;
    loading: boolean;
}

interface YearRow {
    year: string;
    endingSalary: number;
    startingSalary: number;
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
            startingSalary,
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
    if (loading) {
        return <Skeleton variant="rounded" height={280} sx={{ borderRadius: '16px' }} />;
    }

    if (!records || records.length === 0) return null;

    const blur = !showSensitiveData;
    const rows = useMemo(() => buildYearRows(records), [records]);

    // Max increment amount for relative bar width
    const maxIncrement = Math.max(...rows.map(r => r.incrementAmount), 1);

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: '16px',
                border: '1px solid #e9eef5',
                boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Header */}
            <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                <Typography sx={{ color: '#0f172a', fontSize: '0.95rem', fontWeight: 800, mb: 0.2 }}>
                    Year-by-Year Growth
                </Typography>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                    Annual salary progression
                </Typography>
            </Box>

            {/* Rows */}
            <Box sx={{ flex: 1, overflow: 'auto', maxHeight: 320 }}>
                {rows.map((row, i) => {
                    const isPositive = row.incrementAmount > 0;
                    const isFirst = row.isFirstYear;

                    return (
                        <Box
                            key={row.year}
                            sx={{
                                px: 2.5,
                                py: 1.5,
                                borderBottom: i < rows.length - 1 ? '1px solid #f8fafc' : 'none',
                                bgcolor: row.isCurrentYear ? 'rgba(170,57,61,0.02)' : 'transparent',
                                '&:hover': { bgcolor: '#fafbfc' },
                                transition: 'background 0.12s',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                {/* Year badge */}
                                <Box sx={{
                                    minWidth: 50,
                                    px: 1, py: 0.5,
                                    borderRadius: '7px',
                                    bgcolor: row.isCurrentYear ? '#fff1f2' : '#f8fafc',
                                    border: `1px solid ${row.isCurrentYear ? '#fecdd3' : '#e2e8f0'}`,
                                    textAlign: 'center',
                                    flexShrink: 0,
                                }}>
                                    <Typography sx={{ color: row.isCurrentYear ? '#AA393D' : '#475569', fontSize: '0.75rem', fontWeight: 800, lineHeight: 1.2 }}>
                                        {row.year}
                                    </Typography>
                                    {row.isCurrentYear && (
                                        <Typography sx={{ color: '#AA393D', fontSize: '0.58rem', fontWeight: 700, lineHeight: 1 }}>
                                            current
                                        </Typography>
                                    )}
                                </Box>

                                {/* Main content */}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    {/* Salary + growth chip */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                                        <Typography sx={{
                                            color: '#0f172a', fontSize: '0.95rem', fontWeight: 800,
                                            filter: blur ? 'blur(5px)' : 'none',
                                        }}>
                                            {formatCurrencyRounded(row.endingSalary)}/mo
                                        </Typography>

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                            {row.isBestYear && (
                                                <EmojiEventsIcon sx={{ fontSize: 13, color: '#d97706' }} />
                                            )}
                                            {!isFirst && (
                                                <Box sx={{
                                                    px: 0.9, py: 0.2,
                                                    borderRadius: '5px',
                                                    bgcolor: isPositive ? '#f0fdf4' : '#f8fafc',
                                                    border: `1px solid ${isPositive ? '#bbf7d0' : '#e2e8f0'}`,
                                                }}>
                                                    <Typography sx={{
                                                        color: isPositive ? '#16a34a' : '#94a3b8',
                                                        fontSize: '0.7rem', fontWeight: 800,
                                                    }}>
                                                        {isPositive ? '+' : ''}{row.incrementPct}%
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>

                                    {/* Growth bar + increment amount */}
                                    {!isFirst && isPositive ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ flex: 1, height: 4, borderRadius: '2px', bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                                                <Box sx={{
                                                    height: '100%',
                                                    width: `${Math.min(100, (row.incrementAmount / maxIncrement) * 100)}%`,
                                                    borderRadius: '2px',
                                                    bgcolor: row.isBestYear ? '#d97706' : '#16a34a',
                                                    transition: 'width 0.4s ease',
                                                }} />
                                            </Box>
                                            <Typography sx={{
                                                color: '#16a34a', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
                                                filter: blur ? 'blur(4px)' : 'none',
                                            }}>
                                                +{formatCurrencyRounded(row.incrementAmount)}
                                            </Typography>
                                        </Box>
                                    ) : isFirst ? (
                                        <Typography sx={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600 }}>
                                            Initial salary · {row.revisionCount} record{row.revisionCount > 1 ? 's' : ''}
                                        </Typography>
                                    ) : (
                                        <Typography sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                                            No growth this year
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        </Box>
                    );
                })}
            </Box>

            {/* Footer: total revisions */}
            <Box sx={{
                px: 2.5, py: 1.25,
                borderTop: '1px solid #f1f5f9',
                bgcolor: '#fafbfc',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Total Revisions
                </Typography>
                <Typography sx={{ color: '#0f172a', fontSize: '0.88rem', fontWeight: 800 }}>
                    {analytics.totalRevisions}
                </Typography>
            </Box>
        </Paper>
    );
};

export default GrowthPerYearBreakdown;
