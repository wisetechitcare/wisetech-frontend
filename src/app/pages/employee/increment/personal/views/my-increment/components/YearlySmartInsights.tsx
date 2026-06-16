import React from 'react';
import { Box, Paper, Typography, Skeleton } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { YearlyAnalytics } from '../../../../../../../../services/incrementService';
import { formatCurrencyRounded } from '@utils/currency';

interface Props {
    analytics: YearlyAnalytics | null;
    year: string;
    loading: boolean;
}

function buildInsights(analytics: YearlyAnalytics, year: string): string[] {
    const insights: string[] = [];

    if (analytics.revisionCount === 0) {
        insights.push(`No salary revisions occurred in ${year}.`);
        if (analytics.startingSalaryForYear > 0) {
            insights.push(`Salary remained at ${formatCurrencyRounded(analytics.startingSalaryForYear)}/month throughout the year.`);
        }
        return insights;
    }

    if (analytics.yearIncrementPercentage > 0) {
        insights.push(`Salary grew by ${analytics.yearIncrementPercentage}% in ${year}, adding ${formatCurrencyRounded(analytics.yearIncrementAmount)}/month.`);
    }

    if (analytics.revisionCount === 1) {
        insights.push(`A single revision was made in ${analytics.lastRevisionMonth || year}.`);
    } else {
        insights.push(`${analytics.revisionCount} salary revisions were recorded this year.`);
    }

    if (analytics.avgMonthlySalary > 0) {
        insights.push(`Average monthly salary for ${year} was ${formatCurrencyRounded(analytics.avgMonthlySalary)}.`);
    }

    if (analytics.revisionCount > 1 && analytics.highestSingleIncrement > 0) {
        insights.push(`Highest single increment was ${formatCurrencyRounded(analytics.highestSingleIncrement)}/month.`);
    }

    return insights;
}

const YearlySmartInsights = ({ analytics, year, loading }: Props) => {
    if (loading) {
        return <Skeleton variant="rounded" height={88} sx={{ borderRadius: '12px', mb: 3 }} />;
    }

    if (!analytics) return null;

    const insights = buildInsights(analytics, year);

    return (
        <Paper
            elevation={0}
            sx={{
                p: '14px 18px',
                borderRadius: '12px',
                border: '1px solid #fde68a',
                background: 'linear-gradient(135deg, #fefce8 0%, #ffffff 100%)',
                mb: 3,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
            }}
        >
            <Box sx={{
                width: 28,
                height: 28,
                borderRadius: '8px',
                bgcolor: '#fef08a',
                color: '#ca8a04',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                mt: 0.1,
            }}>
                <AutoAwesomeIcon sx={{ fontSize: 15 }} />
            </Box>

            <Box>
                <Typography sx={{ color: '#92400e', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75 }}>
                    {year} Insights
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px' }}>
                    {insights.map((text, i) => (
                        <Typography key={i} sx={{ color: '#78350f', fontSize: '0.85rem', fontWeight: i === 0 ? 600 : 400 }}>
                            {i > 0 && <Box component="span" sx={{ color: '#d97706', mr: 0.5 }}>·</Box>}
                            {text}
                        </Typography>
                    ))}
                </Box>
            </Box>
        </Paper>
    );
};

export default YearlySmartInsights;
