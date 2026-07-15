import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import dayjs from 'dayjs';
import { YearlyAnalytics, AllTimeAnalytics } from '@services/incrementService';
import { formatCurrencyRounded } from '@utils/currency';
import { T } from '@app/modules/common/components/ui/tokens';
import { SkeletonBlock } from '@app/modules/common/components/Skeleton';
import { IncrementMode } from '../useIncrementData';

interface IncrementInsightsProps {
    mode: IncrementMode;
    yearly?: YearlyAnalytics | null;
    allTime?: AllTimeAnalytics | null;
    year?: string;
    loading: boolean;
}

interface Insight {
    text: string;
    highlight: boolean;
}

function buildYearlyInsights(analytics: YearlyAnalytics, year: string): Insight[] {
    const insights: Insight[] = [];

    if (analytics.revisionCount === 0) {
        insights.push({ text: `No salary revisions occurred in ${year}.`, highlight: true });
        if (analytics.startingSalaryForYear > 0) {
            insights.push({
                text: `Salary remained at ${formatCurrencyRounded(analytics.startingSalaryForYear)}/month throughout the year.`,
                highlight: false,
            });
        }
        return insights;
    }

    if (analytics.yearIncrementPercentage > 0) {
        insights.push({
            text: `Salary grew by ${analytics.yearIncrementPercentage}% in ${year}, adding ${formatCurrencyRounded(analytics.yearIncrementAmount)}/month.`,
            highlight: true,
        });
    }

    insights.push({
        text: analytics.revisionCount === 1
            ? `A single revision was made in ${analytics.lastRevisionMonth || year}.`
            : `${analytics.revisionCount} salary revisions were recorded this year.`,
        highlight: false,
    });

    if (analytics.avgMonthlySalary > 0) {
        insights.push({
            text: `Average monthly salary for ${year} was ${formatCurrencyRounded(analytics.avgMonthlySalary)}.`,
            highlight: false,
        });
    }

    if (analytics.revisionCount > 1 && analytics.highestSingleIncrement > 0) {
        insights.push({
            text: `Highest single increment was ${formatCurrencyRounded(analytics.highestSingleIncrement)}/month.`,
            highlight: false,
        });
    }

    return insights;
}

function buildAllTimeInsights(analytics: AllTimeAnalytics): Insight[] {
    const insights: Insight[] = [];

    if (analytics.totalGrowthPercentage > 0) {
        insights.push({
            text: `Total compensation grew by ${analytics.totalGrowthPercentage}% since the first salary record.`,
            highlight: true,
        });
    }

    if (analytics.highestSingleIncrementAmount > 0) {
        insights.push({
            text: `Highest single increment was ${formatCurrencyRounded(analytics.highestSingleIncrementAmount)}/month (+${analytics.highestSingleIncrementPercentage}%).`,
            highlight: false,
        });
    }

    if (analytics.yearsWithRevisions > 1) {
        const avgYearly = (analytics.totalGrowthPercentage / analytics.yearsWithRevisions).toFixed(1);
        insights.push({
            text: `Average annual growth across ${analytics.yearsWithRevisions} years is ~${avgYearly}%.`,
            highlight: false,
        });
    }

    if (analytics.totalRevisions > 0) {
        insights.push({
            text: `Last revision was in ${dayjs(analytics.lastRevisionDate).format('MMMM YYYY')}.`,
            highlight: false,
        });
    }

    return insights;
}

/** Warning-toned "smart insights" panel — compact single-row variant for yearly,
 *  bullet-list variant for all-time. */
const IncrementInsights = ({ mode, yearly, allTime, year, loading }: IncrementInsightsProps) => {
    if (loading) {
        return <SkeletonBlock height={mode === 'yearly' ? 88 : 150} radius={T.radius.md} style={{ marginBottom: 24 }} />;
    }

    const isYearly = mode === 'yearly';
    const insights = isYearly
        ? (yearly ? buildYearlyInsights(yearly, year ?? '') : [])
        : (allTime ? buildAllTimeInsights(allTime) : []);

    if (insights.length === 0) return null;

    return (
        <Paper
            elevation={0}
            sx={{
                p: isYearly ? '14px 18px' : { xs: 2.5, md: 3 },
                borderRadius: `${T.radius.md}px`,
                border: `1px solid ${T.color.warning}33`,
                background: `linear-gradient(135deg, ${T.color.warningSoft} 0%, ${T.color.surface} 100%)`,
                mb: 3,
                display: isYearly ? 'flex' : 'block',
                alignItems: 'flex-start',
                gap: 1.5,
            }}
        >
            {isYearly ? (
                <>
                    <Box sx={{
                        width: 28, height: 28, borderRadius: `${T.radius.sm}px`,
                        bgcolor: `${T.color.warning}22`, color: T.color.warning,
                        display: 'grid', placeItems: 'center', flexShrink: 0, mt: 0.1,
                    }}>
                        <AutoAwesomeIcon sx={{ fontSize: 15 }} />
                    </Box>
                    <Box>
                        <Typography sx={{ color: T.color.warning, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 }}>
                            {year} Insights
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px' }}>
                            {insights.map((insight, i) => (
                                <Typography key={i} sx={{ color: T.color.ink, fontSize: '0.85rem', fontWeight: insight.highlight ? 600 : 400 }}>
                                    {i > 0 && <Box component="span" sx={{ color: T.color.warning, mr: 0.5 }}>·</Box>}
                                    {insight.text}
                                </Typography>
                            ))}
                        </Box>
                    </Box>
                </>
            ) : (
                <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Box sx={{
                            width: 30, height: 30, borderRadius: `${T.radius.sm}px`,
                            bgcolor: `${T.color.warning}22`, color: T.color.warning,
                            display: 'grid', placeItems: 'center',
                        }}>
                            <LightbulbOutlinedIcon sx={{ fontSize: 17 }} />
                        </Box>
                        <Typography sx={{ color: T.color.warning, fontSize: '0.95rem', fontWeight: 800 }}>
                            Smart Insights
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                        {insights.map((insight, idx) => (
                            <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                                <AutoAwesomeIcon sx={{ fontSize: 15, color: insight.highlight ? T.color.warning : T.color.inkFaint, mt: 0.25, flexShrink: 0 }} />
                                <Typography sx={{ color: T.color.inkSoft, fontSize: '0.85rem', fontWeight: insight.highlight ? 600 : 400, lineHeight: 1.55 }}>
                                    {insight.text}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </>
            )}
        </Paper>
    );
};

export default IncrementInsights;
