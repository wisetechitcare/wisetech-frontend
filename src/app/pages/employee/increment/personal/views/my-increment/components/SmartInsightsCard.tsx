import React from 'react';
import { Box, Paper, Typography, Skeleton } from '@mui/material';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { AllTimeAnalytics } from '../../../../../../../../services/incrementService';
import { formatCurrencyRounded } from '@utils/currency';
import dayjs from 'dayjs';

interface InsightsProps {
    analytics: AllTimeAnalytics | null;
    loading: boolean;
}

function buildAllTimeInsights(analytics: AllTimeAnalytics): Array<{ text: string; highlight: boolean }> {
    const insights: Array<{ text: string; highlight: boolean }> = [];

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
        const avgYearly = analytics.yearsWithRevisions > 0
            ? (analytics.totalGrowthPercentage / analytics.yearsWithRevisions).toFixed(1)
            : '0';
        insights.push({
            text: `Average annual growth across ${analytics.yearsWithRevisions} year${analytics.yearsWithRevisions > 1 ? 's' : ''} is ~${avgYearly}%.`,
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

const SmartInsightsCard = ({ analytics, loading }: InsightsProps) => {
    if (loading) {
        return <Skeleton variant="rounded" height={150} sx={{ borderRadius: '16px', width: '100%', mb: 3 }} />;
    }

    if (!analytics) return null;

    const insights = buildAllTimeInsights(analytics);

    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: '16px',
                border: '1px solid #fde68a',
                background: 'linear-gradient(180deg, #fefce8 0%, #ffffff 100%)',
                mb: 3,
                boxShadow: '0 1px 2px rgba(234,179,8,0.05)',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '8px',
                    bgcolor: '#fef08a',
                    color: '#ca8a04',
                    display: 'grid',
                    placeItems: 'center',
                }}>
                    <LightbulbOutlinedIcon sx={{ fontSize: 17 }} />
                </Box>
                <Typography sx={{ color: '#854d0e', fontSize: '0.95rem', fontWeight: 800 }}>
                    Smart Insights
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {insights.map((insight, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                        <AutoAwesomeIcon sx={{ fontSize: 15, color: insight.highlight ? '#ca8a04' : '#d1d5db', mt: 0.25, flexShrink: 0 }} />
                        <Typography sx={{ color: '#4b5563', fontSize: '0.85rem', fontWeight: insight.highlight ? 600 : 400, lineHeight: 1.55 }}>
                            {insight.text}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Paper>
    );
};

export default SmartInsightsCard;
