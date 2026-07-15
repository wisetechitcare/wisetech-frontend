import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RemoveIcon from '@mui/icons-material/Remove';
import { YearlyAnalytics } from '@services/incrementService';
import { formatCurrencyRounded } from '@utils/currency';
import { T } from '@app/modules/common/components/ui/tokens';
import { SkeletonBlock } from '@app/modules/common/components/Skeleton';
import { Panel, FooterStat } from './widgets';

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

    groups.forEach(g => { g.pct = Math.round((g.monthCount / 12) * 100); });
    return groups;
}

const YearSummaryPanel = ({ analytics, year, showSensitiveData, loading }: YearSummaryPanelProps) => {
    const segments = useMemo(() => buildSegments(analytics?.graphData ?? []), [analytics]);

    if (loading) {
        return <SkeletonBlock height={260} radius={T.radius.lg} />;
    }

    const blur = !showSensitiveData;
    const growthPct = analytics.startingSalaryForYear > 0
        ? Math.round((analytics.yearIncrementAmount / analytics.startingSalaryForYear) * 100)
        : 0;

    const isGrowth = analytics.yearIncrementAmount > 0;
    const isFlat = analytics.yearIncrementAmount === 0;
    const trendColor = isFlat ? T.color.inkFaint : isGrowth ? T.color.success : T.color.danger;
    const pillTone = isGrowth
        ? { fg: T.color.success, soft: T.color.successSoft }
        : { fg: T.color.danger, soft: T.color.dangerSoft };

    return (
        <Panel
            title="Year Summary"
            subtitle={`Salary behaviour across ${year}`}
            padded={false}
            sx={{ height: '100%' }}
            footer={
                <FooterStat
                    label="Avg Monthly Salary"
                    value={analytics.avgMonthlySalary > 0 ? formatCurrencyRounded(analytics.avgMonthlySalary) : '—'}
                    blur={blur}
                />
            }
        >
            {/* Salary range visual */}
            <Box sx={{ px: 2.5, pb: 2, borderBottom: `1px solid ${T.color.lineSoft}` }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.25 }}>
                    <Box>
                        <Typography sx={{ color: T.color.inkFaint, fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.3 }}>
                            Start of Year
                        </Typography>
                        <Typography sx={{
                            color: T.color.inkSoft, fontSize: '1.05rem', fontWeight: 700,
                            filter: blur ? 'blur(5px)' : 'none',
                        }}>
                            {analytics.startingSalaryForYear > 0
                                ? formatCurrencyRounded(analytics.startingSalaryForYear)
                                : '—'}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', color: trendColor }}>
                        {isFlat ? <RemoveIcon sx={{ fontSize: 18 }} /> : <TrendingUpIcon sx={{ fontSize: 18 }} />}
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ color: T.color.inkFaint, fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.3 }}>
                            End of Year
                        </Typography>
                        <Typography sx={{
                            color: T.color.ink, fontSize: '1.15rem', fontWeight: 900,
                            filter: blur ? 'blur(5px)' : 'none',
                        }}>
                            {formatCurrencyRounded(analytics.currentSalaryForYear)}
                        </Typography>
                    </Box>
                </Box>

                {!isFlat && (
                    <Box sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.75,
                        px: 1.5, py: 0.5, borderRadius: `${T.radius.pill}px`,
                        bgcolor: pillTone.soft,
                        border: `1px solid ${pillTone.fg}33`,
                        mb: 1.25,
                    }}>
                        <Typography sx={{ color: pillTone.fg, fontSize: '0.78rem', fontWeight: 800, filter: blur ? 'blur(4px)' : 'none' }}>
                            {isGrowth ? '+' : ''}{formatCurrencyRounded(analytics.yearIncrementAmount)}/mo
                        </Typography>
                        <Typography sx={{ color: pillTone.fg, fontSize: '0.75rem', fontWeight: 700 }}>
                            ({isGrowth ? '+' : ''}{growthPct}%)
                        </Typography>
                    </Box>
                )}

                {/* Segmented salary bar across the year */}
                <Box sx={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', height: 8, gap: 0.25 }}>
                    {segments.map((seg, i) => (
                        <Box
                            key={i}
                            sx={{
                                height: '100%',
                                flex: seg.pct,
                                borderRadius: i === 0 ? '6px 0 0 6px' : i === segments.length - 1 ? '0 6px 6px 0' : 0,
                                bgcolor: i === 0 && segments.length > 1 ? T.color.inkFaint : T.color.accent,
                                opacity: i === segments.length - 1 ? 1 : 0.4 + (i / Math.max(segments.length, 1)) * 0.5,
                            }}
                        />
                    ))}
                </Box>
            </Box>

            {/* Monthly distribution */}
            <Box sx={{ px: 2.5, py: 2 }}>
                <Typography sx={{ color: T.color.inkSoft, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.25 }}>
                    Monthly Distribution
                </Typography>

                {segments.length === 0 || (segments.length === 1 && segments[0].salary === 0) ? (
                    <Typography sx={{ color: T.color.inkFaint, fontSize: '0.82rem' }}>No salary data this year.</Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {segments.map((seg, i) => {
                            const isLatest = i === segments.length - 1;
                            return (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Typography sx={{ color: T.color.inkSoft, fontSize: '0.78rem', fontWeight: 600, minWidth: 70 }}>
                                        {seg.months.length === 1
                                            ? seg.months[0]
                                            : `${seg.months[0]}–${seg.months[seg.months.length - 1]}`
                                        }
                                    </Typography>

                                    <Box sx={{ flex: 1, height: 5, borderRadius: '3px', bgcolor: T.color.lineSoft, overflow: 'hidden' }}>
                                        <Box sx={{
                                            height: '100%',
                                            width: `${seg.pct}%`,
                                            borderRadius: '3px',
                                            bgcolor: isLatest ? T.color.accent : T.color.inkFaint,
                                        }} />
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 90, justifyContent: 'flex-end' }}>
                                        <Typography sx={{
                                            color: isLatest ? T.color.ink : T.color.inkSoft,
                                            fontSize: '0.8rem',
                                            fontWeight: isLatest ? 800 : 600,
                                            filter: blur ? 'blur(4px)' : 'none',
                                        }}>
                                            {seg.salary > 0 ? formatCurrencyRounded(seg.salary) : '—'}
                                        </Typography>
                                        <Typography sx={{ color: T.color.inkFaint, fontSize: '0.72rem', fontWeight: 600 }}>
                                            ×{seg.monthCount}
                                        </Typography>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Box>
        </Panel>
    );
};

export default YearSummaryPanel;
