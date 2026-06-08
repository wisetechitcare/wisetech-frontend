import React from 'react';
import { Box, Paper, Typography, Chip, Skeleton } from '@mui/material';
import { IncrementRecord } from '../../../../../../../../services/incrementService';
import dayjs from 'dayjs';
import { formatCurrencyDecimal } from '@utils/currency';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import FlagIcon from '@mui/icons-material/Flag';

interface TimelineProps {
    data: IncrementRecord[];
    loading: boolean;
    showSensitiveData: boolean;
    /** When true, display oldest record first (career journey mode). Default: newest first. */
    chronological?: boolean;
    /** When true, labels the oldest record as "Joined Company – Initial Salary". */
    showFirstAsJoining?: boolean;
    title?: string;
    subtitle?: string;
}

const IncrementTimeline = ({
    data,
    loading,
    showSensitiveData,
    chronological = false,
    showFirstAsJoining = false,
    title = 'Revision Timeline',
    subtitle = 'Chronological history of salary updates',
}: TimelineProps) => {
    if (loading) {
        return <Skeleton variant="rounded" height={360} sx={{ borderRadius: '16px', width: '100%' }} />;
    }

    if (!data || data.length === 0) return null;

    // Determine display order
    const displayed = chronological ? [...data].reverse() : data;
    const oldestId = chronological ? displayed[0]?.id : displayed[displayed.length - 1]?.id;
    const latestId  = chronological ? displayed[displayed.length - 1]?.id : displayed[0]?.id;

    const blur = !showSensitiveData;

    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: '16px',
                border: '1px solid #e9eef5',
                boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
            }}
        >
            <Box sx={{ mb: 2.5 }}>
                <Typography sx={{ color: '#0f172a', fontSize: '1rem', fontWeight: 800 }}>{title}</Typography>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem', mt: 0.2 }}>{subtitle}</Typography>
            </Box>

            <Box sx={{ position: 'relative', ml: 1 }}>
                {displayed.map((record, index) => {
                    const isFirst = record.id === oldestId;
                    const isLatest = record.id === latestId;
                    const isLast = index === displayed.length - 1;
                    const isJoining = showFirstAsJoining && isFirst;

                    const dotColor = isJoining ? '#AA393D' : '#16a34a';
                    const dotBg   = isJoining ? '#fff1f2' : '#f0fdf4';

                    return (
                        <Box key={record.id} sx={{ position: 'relative', pl: 4.5, pb: isLast ? 0 : 3.5, minHeight: 72 }}>
                            {/* Connector line */}
                            {!isLast && (
                                <Box sx={{
                                    position: 'absolute',
                                    left: 15,
                                    top: 32,
                                    bottom: -6,
                                    width: 2,
                                    bgcolor: '#e2e8f0',
                                    zIndex: 0,
                                }} />
                            )}

                            {/* Timeline dot */}
                            <Box sx={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                bgcolor: dotBg,
                                border: `2px solid ${dotColor}`,
                                color: dotColor,
                                display: 'grid',
                                placeItems: 'center',
                                zIndex: 1,
                            }}>
                                {isJoining
                                    ? <FlagIcon sx={{ fontSize: 15 }} />
                                    : <TrendingUpIcon sx={{ fontSize: 15 }} />
                                }
                            </Box>

                            <Box sx={{ pt: 0.2 }}>
                                {/* Date + badges */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.4 }}>
                                    <Typography sx={{ color: '#374151', fontWeight: 700, fontSize: '0.88rem' }}>
                                        {dayjs(record.effectiveDate).format('MMM YYYY')}
                                    </Typography>

                                    {isJoining && (
                                        <Chip
                                            label="Joined"
                                            size="small"
                                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#fff1f2', color: '#AA393D', border: '1px solid #fecdd3' }}
                                        />
                                    )}
                                    {isLatest && !isJoining && (
                                        <Chip
                                            label="Current"
                                            size="small"
                                            icon={<WorkspacePremiumIcon sx={{ fontSize: '12px !important', color: '#0891b2 !important' }} />}
                                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#ecfeff', color: '#0891b2', border: '1px solid #cffafe', pl: 0.3 }}
                                        />
                                    )}
                                </Box>

                                {/* Salary movement */}
                                {isJoining ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography sx={{ color: '#0f172a', fontWeight: 800, fontSize: '0.95rem', filter: blur ? 'blur(4px)' : 'none' }}>
                                            {formatCurrencyDecimal(record.newSalary)}
                                        </Typography>
                                        <Typography sx={{ color: '#94a3b8', fontSize: '0.78rem' }}>Initial salary</Typography>
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                                        <Typography sx={{ color: '#94a3b8', fontSize: '0.82rem', filter: blur ? 'blur(4px)' : 'none' }}>
                                            {formatCurrencyDecimal(record.previousSalary)}
                                        </Typography>
                                        <Typography sx={{ color: '#cbd5e1', fontSize: '0.82rem' }}>→</Typography>
                                        <Typography sx={{ color: '#0f172a', fontWeight: 700, fontSize: '0.88rem', filter: blur ? 'blur(4px)' : 'none' }}>
                                            {formatCurrencyDecimal(record.newSalary)}
                                        </Typography>
                                        <Box sx={{
                                            px: 0.9,
                                            py: 0.2,
                                            borderRadius: '5px',
                                            bgcolor: '#f0fdf4',
                                            color: '#16a34a',
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            filter: blur ? 'blur(4px)' : 'none',
                                        }}>
                                            +{record.incrementPercentage}%
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </Paper>
    );
};

export default IncrementTimeline;
