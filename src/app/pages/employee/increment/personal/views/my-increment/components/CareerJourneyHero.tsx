import React from 'react';
import { Box, Paper, Typography, Skeleton } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { formatCurrencyDecimal, formatCurrencyRounded } from '@utils/currency';
import { AllTimeAnalytics } from '../../../../../../../../services/incrementService';
import dayjs from 'dayjs';

interface HeroProps {
    analytics: AllTimeAnalytics;
    joiningDate?: string;   // ISO date from employee.dateOfJoining
    showSensitiveData: boolean;
    loading: boolean;
}

function careerDuration(joiningDate?: string): string {
    if (!joiningDate) return '—';
    const start = dayjs(joiningDate);
    const now = dayjs();
    const months = now.diff(start, 'month');
    if (months < 1) return 'Less than a month';
    if (months < 12) return `${months} month${months > 1 ? 's' : ''}`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (rem === 0) return `${years} year${years > 1 ? 's' : ''}`;
    return `${years}y ${rem}m`;
}

const CareerJourneyHero = ({ analytics, joiningDate, showSensitiveData, loading }: HeroProps) => {
    if (loading) {
        return <Skeleton variant="rounded" height={120} sx={{ borderRadius: '16px', mb: 3 }} />;
    }

    const blur = !showSensitiveData;
    const duration = careerDuration(joiningDate);
    const isPositiveGrowth = analytics.totalGrowthAmount > 0;

    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #1e3a5f 100%)',
                border: '1px solid #1e293b',
                mb: 3,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Decorative glow */}
            <Box sx={{
                position: 'absolute',
                top: -40,
                right: -40,
                width: 180,
                height: 180,
                borderRadius: '50%',
                bgcolor: 'rgba(170,57,61,0.12)',
                filter: 'blur(40px)',
                pointerEvents: 'none',
            }} />

            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'auto 1fr auto auto auto' },
                alignItems: 'center',
                gap: { xs: 2, md: 3 },
            }}>
                {/* Label */}
                <Box>
                    <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>
                        Salary Journey
                    </Typography>
                    <Typography sx={{ color: '#fff', fontSize: '1.05rem', fontWeight: 800 }}>
                        Career Compensation
                    </Typography>
                </Box>

                {/* Joining salary */}
                <Box sx={{ textAlign: { xs: 'left', md: 'center' } }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.3 }}>
                        Joining Salary
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.3rem', fontWeight: 800, filter: blur ? 'blur(6px)' : 'none' }}>
                        {formatCurrencyRounded(analytics.joiningSalary)}
                    </Typography>
                </Box>

                {/* Arrow */}
                <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', color: 'rgba(255,255,255,0.25)' }}>
                    <ArrowForwardIcon sx={{ fontSize: 22 }} />
                </Box>

                {/* Current salary */}
                <Box sx={{ textAlign: { xs: 'left', md: 'center' } }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.3 }}>
                        Current Salary
                    </Typography>
                    <Typography sx={{ color: '#fff', fontSize: '1.6rem', fontWeight: 900, filter: blur ? 'blur(6px)' : 'none' }}>
                        {formatCurrencyRounded(analytics.currentSalary)}
                    </Typography>
                </Box>

                {/* Stats row */}
                <Box sx={{ display: 'flex', gap: { xs: 2, md: 3 }, flexWrap: 'wrap', ml: { md: 1 } }}>
                    {/* Net growth */}
                    <Box sx={{
                        px: 2,
                        py: 1.25,
                        borderRadius: '10px',
                        bgcolor: isPositiveGrowth ? 'rgba(22,163,74,0.2)' : 'rgba(239,68,68,0.2)',
                        border: `1px solid ${isPositiveGrowth ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        textAlign: 'center',
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center', mb: 0.25 }}>
                            <TrendingUpIcon sx={{ fontSize: 13, color: isPositiveGrowth ? '#4ade80' : '#f87171' }} />
                            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Net Growth
                            </Typography>
                        </Box>
                        <Typography sx={{ color: isPositiveGrowth ? '#4ade80' : '#f87171', fontSize: '1rem', fontWeight: 800, filter: blur ? 'blur(4px)' : 'none' }}>
                            {isPositiveGrowth ? '+' : ''}{formatCurrencyDecimal(analytics.totalGrowthAmount)}
                        </Typography>
                        <Typography sx={{ color: isPositiveGrowth ? 'rgba(74,222,128,0.75)' : 'rgba(248,113,113,0.75)', fontSize: '0.75rem', fontWeight: 700 }}>
                            ({isPositiveGrowth ? '+' : ''}{analytics.totalGrowthPercentage}%)
                        </Typography>
                    </Box>

                    {/* Duration */}
                    <Box sx={{
                        px: 2,
                        py: 1.25,
                        borderRadius: '10px',
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
