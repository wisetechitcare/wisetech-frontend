import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import dayjs from 'dayjs';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import FlagIcon from '@mui/icons-material/Flag';
import { IncrementRecord } from '@services/incrementService';
import { formatCurrencyDecimal } from '@utils/currency';
import { T } from '@app/modules/common/components/ui/tokens';
import { SkeletonBlock } from '@app/modules/common/components/Skeleton';
import { Panel, EmptyState } from './widgets';

interface TimelineProps {
    data: IncrementRecord[];
    loading: boolean;
    showSensitiveData: boolean;
    /** When true, display oldest record first (career journey mode). Default: newest first. */
    chronological?: boolean;
    /** When true, labels the oldest record as the joining record with its initial salary. */
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
        return <SkeletonBlock height={360} radius={T.radius.lg} />;
    }

    const displayed = chronological ? [...data].reverse() : data;
    const oldestId = chronological ? displayed[0]?.id : displayed[displayed.length - 1]?.id;
    const latestId = chronological ? displayed[displayed.length - 1]?.id : displayed[0]?.id;
    const blur = !showSensitiveData;

    return (
        <Panel title={title} subtitle={subtitle}>
            {displayed.length === 0 ? (
                <EmptyState title="No revisions yet" subtitle="Salary revisions will appear here once recorded." />
            ) : (
                <Box sx={{ position: 'relative', ml: 1, mt: 1 }}>
                    {displayed.map((record, index) => {
                        const isFirst = record.id === oldestId;
                        const isLatest = record.id === latestId;
                        const isLast = index === displayed.length - 1;
                        const isJoining = showFirstAsJoining && isFirst;

                        const dotColor = isJoining ? T.color.accent : T.color.success;
                        const dotBg = isJoining ? T.color.accentSoft : T.color.successSoft;

                        return (
                            <Box key={record.id} sx={{ position: 'relative', pl: 4.5, pb: isLast ? 0 : 3.5, minHeight: 72 }}>
                                {!isLast && (
                                    <Box sx={{
                                        position: 'absolute', left: 15, top: 32, bottom: -6,
                                        width: 2, bgcolor: T.color.line, zIndex: 0,
                                    }} />
                                )}

                                <Box sx={{
                                    position: 'absolute', left: 0, top: 0,
                                    width: 32, height: 32, borderRadius: '50%',
                                    bgcolor: dotBg,
                                    border: `2px solid ${dotColor}`,
                                    color: dotColor,
                                    display: 'grid', placeItems: 'center', zIndex: 1,
                                }}>
                                    {isJoining
                                        ? <FlagIcon sx={{ fontSize: 15 }} />
                                        : <TrendingUpIcon sx={{ fontSize: 15 }} />
                                    }
                                </Box>

                                <Box sx={{ pt: 0.2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.4 }}>
                                        <Typography sx={{ color: T.color.ink, fontWeight: 700, fontSize: '0.88rem' }}>
                                            {dayjs(record.effectiveDate).format('MMM YYYY')}
                                        </Typography>

                                        {isJoining && (
                                            <Chip
                                                label="Joined"
                                                size="small"
                                                sx={{
                                                    height: 18, fontSize: '0.65rem', fontWeight: 700,
                                                    bgcolor: T.color.accentSoft, color: T.color.accent,
                                                    border: `1px solid ${T.color.accent}33`,
                                                }}
                                            />
                                        )}
                                        {isLatest && !isJoining && (
                                            <Chip
                                                label="Current"
                                                size="small"
                                                icon={<WorkspacePremiumIcon sx={{ fontSize: '12px !important', color: `${T.color.cyan} !important` }} />}
                                                sx={{
                                                    height: 18, fontSize: '0.65rem', fontWeight: 700,
                                                    bgcolor: T.color.cyanSoft, color: T.color.cyan,
                                                    border: `1px solid ${T.color.cyan}33`, pl: 0.3,
                                                }}
                                            />
                                        )}
                                    </Box>

                                    {isJoining ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography sx={{ color: T.color.ink, fontWeight: 800, fontSize: '0.95rem', filter: blur ? 'blur(4px)' : 'none' }}>
                                                {formatCurrencyDecimal(record.newSalary)}
                                            </Typography>
                                            <Typography sx={{ color: T.color.inkFaint, fontSize: '0.78rem' }}>Initial salary</Typography>
                                        </Box>
                                    ) : (
                                        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                                            <Typography sx={{ color: T.color.inkFaint, fontSize: '0.82rem', filter: blur ? 'blur(4px)' : 'none' }}>
                                                {formatCurrencyDecimal(record.previousSalary)}
                                            </Typography>
                                            <Typography sx={{ color: T.color.inkFaint, fontSize: '0.82rem' }}>→</Typography>
                                            <Typography sx={{ color: T.color.ink, fontWeight: 700, fontSize: '0.88rem', filter: blur ? 'blur(4px)' : 'none' }}>
                                                {formatCurrencyDecimal(record.newSalary)}
                                            </Typography>
                                            <Box sx={{
                                                px: 0.9, py: 0.2,
                                                borderRadius: '5px',
                                                bgcolor: T.color.successSoft,
                                                color: T.color.success,
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
            )}
        </Panel>
    );
};

export default IncrementTimeline;
