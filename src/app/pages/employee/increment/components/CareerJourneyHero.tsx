import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import dayjs from 'dayjs';
import { formatCurrencyDecimal, formatCurrencyRounded } from '@utils/currency';
import { AllTimeAnalytics } from '@services/incrementService';
import { T } from '@app/modules/common/components/ui/tokens';
import { SkeletonBlock } from '@app/modules/common/components/Skeleton';

interface HeroProps {
    analytics: AllTimeAnalytics;
    joiningDate?: string;   // ISO date from employee.dateOfJoining
    showSensitiveData: boolean;
    loading: boolean;
}

function careerDuration(joiningDate?: string): string {
    if (!joiningDate) return '—';
    const months = dayjs().diff(dayjs(joiningDate), 'month');
    if (months < 1) return 'Less than a month';
    if (months < 12) return `${months} month${months > 1 ? 's' : ''}`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (rem === 0) return `${years} year${years > 1 ? 's' : ''}`;
    return `${years}y ${rem}m`;
}

const CareerJourneyHero = ({ analytics, joiningDate, showSensitiveData, loading }: HeroProps) => {
    if (loading) {
        return <SkeletonBlock height={120} radius={T.radius.lg} style={{ marginBottom: 24 }} />;
    }

    const blur = !showSensitiveData;
    const duration = careerDuration(joiningDate);
    const isPositiveGrowth = analytics.totalGrowthAmount > 0;
    const growthColor = isPositiveGrowth ? '#7BD8AC' : '#F5A19A';

    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: `${T.radius.lg}px`,
                background: `linear-gradient(135deg, ${T.color.brandActive} 0%, ${T.color.brand} 100%)`,
                mb: 3,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Decorative accent glow */}
            <Box sx={{
                position: 'absolute', top: -40, right: -40,
                width: 180, height: 180, borderRadius: '50%',
                bgcolor: 'rgba(192,57,43,0.18)',
                filter: 'blur(40px)',
                pointerEvents: 'none',
            }} />

            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'auto 1fr auto auto auto' },
                alignItems: 'center',
                gap: { xs: 2, md: 3 },
            }}>
                <Box>
                    <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>
                        Salary Journey
                    </Typography>
                    <Typography sx={{ color: '#fff', fontSize: '1.05rem', fontWeight: 800 }}>
                        Career Compensation
                    </Typography>
                </Box>

                <Box sx={{ textAlign: { xs: 'left', md: 'center' } }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.3 }}>
                        Joining Salary
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.3rem', fontWeight: 800, filter: blur ? 'blur(6px)' : 'none' }}>
                        {formatCurrencyRounded(analytics.joiningSalary)}
                    </Typography>
                </Box>

                <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', color: 'rgba(255,255,255,0.25)' }}>
                    <ArrowForwardIcon sx={{ fontSize: 22 }} />
                </Box>

                <Box sx={{ textAlign: { xs: 'left', md: 'center' } }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.3 }}>
                        Current Salary
                    </Typography>
                    <Typography sx={{ color: '#fff', fontSize: '1.6rem', fontWeight: 900, filter: blur ? 'blur(6px)' : 'none' }}>
                        {formatCurrencyRounded(analytics.currentSalary)}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: { xs: 2, md: 3 }, flexWrap: 'wrap', ml: { md: 1 } }}>
                    <Box sx={{
                        px: 2, py: 1.25,
                        borderRadius: `${T.radius.sm}px`,
                        bgcolor: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        textAlign: 'center',
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center', mb: 0.25 }}>
                            <TrendingUpIcon sx={{ fontSize: 13, color: growthColor }} />
                            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Net Growth
                            </Typography>
                        </Box>
                        <Typography sx={{ color: growthColor, fontSize: '1rem', fontWeight: 800, filter: blur ? 'blur(4px)' : 'none' }}>
                            {isPositiveGrowth ? '+' : ''}{formatCurrencyDecimal(analytics.totalGrowthAmount)}
                        </Typography>
                        <Typography sx={{ color: growthColor, opacity: 0.8, fontSize: '0.75rem', fontWeight: 700 }}>
                            ({isPositiveGrowth ? '+' : ''}{analytics.totalGrowthPercentage}%)
                        </Typography>
                    </Box>

                    <Box sx={{
                        px: 2, py: 1.25,
                        borderRadius: `${T.radius.sm}px`,
                        bgcolor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        textAlign: 'center',
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center', mb: 0.25 }}>
                            <AccessTimeIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }} />
                            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Duration
                            </Typography>
                        </Box>
                        <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', fontWeight: 800 }}>
                            {duration}
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', fontWeight: 600 }}>
                            {analytics.totalRevisions} revision{analytics.totalRevisions !== 1 ? 's' : ''}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Paper>
    );
};

export default CareerJourneyHero;
