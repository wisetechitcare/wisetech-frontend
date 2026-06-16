import React, { useMemo } from 'react';
import { Box, Paper, Typography, Skeleton } from '@mui/material';
import { YearlyAnalytics } from '../../../../../../../../services/incrementService';
import { formatCurrencyRounded } from '@utils/currency';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RemoveIcon from '@mui/icons-material/Remove';

interface YearSummaryPanelProps {
    analytics: YearlyAnalytics;
    year: string;
    showSensitiveData: boolean;
    loading: boolean;
}

interface SalarySegment {
    salary: number;
    months: string[];
    monthCount: number;
    pct: number;
}

function buildSegments(graphData: { label: string; salary: number }[]): SalarySegment[] {
    if (!graphData.length) return [];

    const groups: SalarySegment[] = [];
    let current: SalarySegment | null = null;

    for (const point of graphData) {
        if (!current || current.salary !== point.salary) {
            if (current) groups.push(current);
            current = { salary: point.salary, months: [point.label], monthCount: 1, pct: 0 };
        } else {
            current.months.push(point.label);
            current.monthCount++;
        }
    }
    if (current) groups.push(current);

    // Compute percentage of year each segment occupies
    groups.forEach(g => { g.pct = Math.round((g.monthCount / 12) * 100); });
    return groups;
}

const YearSummaryPanel = ({ analytics, year, showSensitiveData, loading }: YearSummaryPanelProps) => {
    if (loading) {
        return <Skeleton variant="rounded" height={260} sx={{ borderRadius: '16px' }} />;
    }

    const blur = !showSensitiveData;
    const segments = useMemo(() => buildSegments(analytics.graphData), [analytics.graphData]);

    const growthPct = analytics.startingSalaryForYear > 0
        ? Math.round((analytics.yearIncrementAmount / analytics.startingSalaryForYear) * 100)
        : 0;

    const isGrowth = analytics.yearIncrementAmount > 0;
    const isFlat   = analytics.yearIncrementAmount === 0;

    const progressValue = analytics.startingSalaryForYear === 0
        ? 100
        : Math.min(100, Math.round((analytics.currentSalaryForYear / (analytics.currentSalaryForYear * 1.25)) * 100));

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
            <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
                <Typography sx={{ color: '#0f172a', fontSize: '0.95rem', fontWeight: 800, mb: 0.2 }}>
                    Year Summary
                </Typography>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                    Salary behaviour across {year}
                </Typography>
            </Box>

            {/* Salary Range Visual */}
            <Box sx={{ px: 2.5, pb: 2, borderBottom: '1px solid #f1f5f9' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.25 }}>
                    <Box>
                        <Typography sx={{ color: '#94a3b8', fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.3 }}>
                            Start of Year
                        </Typography>
                        <Typography sx={{
                            color: '#475569', fontSize: '1.05rem', fontWeight: 700,
                            filter: blur ? 'blur(5px)' : 'none',
                        }}>
                            {analytics.startingSalaryForYear > 0
                                ? formatCurrencyRounded(analytics.startingSalaryForYear)
                                : '—'}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', color: isFlat ? '#94a3b8' : isGrowth ? '#16a34a' : '#dc2626' }}>
                        {isFlat ? <RemoveIcon sx={{ fontSize: 18 }} /> : <TrendingUpIcon sx={{ fontSize: 18 }} />}
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ color: '#94a3b8', fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.3 }}>
                            End of Year
                        </Typography>
                        <Typography sx={{
                            color: '#0f172a', fontSize: '1.15rem', fontWeight: 900,
                            filter: blur ? 'blur(5px)' : 'none',
                        }}>
                            {formatCurrencyRounded(analytics.currentSalaryForYear)}
                        </Typography>
                    </Box>
                </Box>

                {/* Growth pill */}
                {!isFlat && (
                    <Box sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.75,
                        px: 1.5, py: 0.5, borderRadius: '20px',
                        bgcolor: isGrowth ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${isGrowth ? '#bbf7d0' : '#fecaca'}`,
                        mb: 1.25,
                    }}>
                        <Typography sx={{ color: isGrowth ? '#16a34a' : '#dc2626', fontSize: '0.78rem', fontWeight: 800, filter: blur ? 'blur(4px)' : 'none' }}>
                            {isGrowth ? '+' : ''}{formatCurrencyRounded(analytics.yearIncrementAmount)}/mo
                        </Typography>
                        <Typography sx={{ color: isGrowth ? '#16a34a' : '#dc2626', fontSize: '0.75rem', fontWeight: 700 }}>
                            ({isGrowth ? '+' : ''}{growthPct}%)
                        </Typography>
                    </Box>
                )}

                {/* Segmented progress bar */}
                <Box sx={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', height: 8, gap: 0.25 }}>
                    {segments.map((seg, i) => (
                        <Box
                            key={i}
                            sx={{
                                height: '100%',
                                flex: seg.pct,
                                borderRadius: i === 0 ? '6px 0 0 6px' : i === segments.length - 1 ? '0 6px 6px 0' : 0,
                                bgcolor: i === 0 && segments.length > 1 ? '#cbd5e1' : '#AA393D',
                                opacity: i === segments.length - 1 ? 1 : 0.4 + (i / segments.length) * 0.5,
                            }}
                        />
                    ))}
                </Box>
            </Box>

            {/* Monthly distribution */}
            <Box sx={{ px: 2.5, py: 2, flex: 1 }}>
                <Typography sx={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.25 }}>
                    Monthly Distribution
                </Typography>

                {segments.length === 0 || (segments.length === 1 && segments[0].salary === 0) ? (
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.82rem' }}>No salary data this year.</Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {segments.map((seg, i) => {
                            const isLatest = i === segments.length - 1;
                            return (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    {/* Month range */}
                                    <Typography sx={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600, minWidth: 70 }}>
                                        {seg.months.length === 1
                                            ? seg.months[0]
                                            : `${seg.months[0]}–${seg.months[seg.months.length - 1]}`
                                        }
                                    </Typography>

                                    {/* Mini bar */}
                                    <Box sx={{ flex: 1, height: 5, borderRadius: '3px', bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                                        <Box sx={{
                                            height: '100%',
                                            width: `${seg.pct}%`,
                                            borderRadius: '3px',
                                            bgcolor: isLatest ? '#AA393D' : '#cbd5e1',
                                        }} />
                                    </Box>

                                    {/* Salary + months count */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 90, justifyContent: 'flex-end' }}>
                                        <Typography sx={{
                                            color: isLatest ? '#0f172a' : '#64748b',
                                            fontSize: '0.8rem',
                                            fontWeight: isLatest ? 800 : 600,
                                            filter: blur ? 'blur(4px)' : 'none',
                                        }}>
                                            {seg.salary > 0 ? formatCurrencyRounded(seg.salary) : '—'}
                                        </Typography>
                                        <Typography sx={{ color: '#cbd5e1', fontSize: '0.72rem', fontWeight: 600 }}>
                                            ×{seg.monthCount}
                                        </Typography>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Box>

            {/* Footer: avg monthly salary */}
            <Box sx={{
                px: 2.5, py: 1.25,
                borderTop: '1px solid #f1f5f9',
                bgcolor: '#fafbfc',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Avg Monthly Salary
                </Typography>
                <Typography sx={{
                    color: '#0f172a', fontSize: '0.88rem', fontWeight: 800,
                    filter: blur ? 'blur(4px)' : 'none',
                }}>
                    {analytics.avgMonthlySalary > 0 ? formatCurrencyRounded(analytics.avgMonthlySalary) : '—'}
                </Typography>
            </Box>
        </Paper>
    );
};

export default YearSummaryPanel;
