import React from 'react';
import { Box, Typography } from '@mui/material';
import { T, SemanticTone, tonePair } from '@app/modules/common/components/ui/tokens';
import { SkeletonKpiCard } from '@app/modules/common/components/Skeleton';

export interface KPICardConfig {
    label: string;
    value: string;
    subValue?: string;          // secondary small value below main
    icon: React.ReactNode;
    tone: SemanticTone;
    footer?: string;            // left-side footer label
    footerValue?: string;       // right-side footer value
    footerTone?: SemanticTone;  // colour of footer strip
    isSensitive?: boolean;
    showSensitiveData?: boolean;
}

interface KPISectionProps {
    cards: KPICardConfig[];
    loading: boolean;
    skeletonCount?: number;
    columns?: number;
}

const MetricCard = ({
    label, value, subValue, icon, tone,
    footer, footerValue, footerTone = 'neutral',
    isSensitive, showSensitiveData = true,
}: KPICardConfig) => {
    const palette = tonePair(tone);
    const fp = tonePair(footerTone);
    const blur = isSensitive && !showSensitiveData;

    return (
        <Box sx={{
            bgcolor: T.color.surface,
            border: `1px solid ${T.color.line}`,
            borderRadius: `${T.radius.md}px`,
            boxShadow: T.shadow.xs,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
        }}>
            <Box sx={{ p: '14px 16px', flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
                    <Box sx={{
                        width: 36, height: 36, borderRadius: `${T.radius.sm}px`,
                        display: 'grid', placeItems: 'center',
                        color: palette.fg, bgcolor: palette.soft,
                        flexShrink: 0,
                    }}>
                        {icon}
                    </Box>
                    <Typography sx={{
                        color: T.color.inkFaint, fontWeight: 700, fontSize: '0.67rem',
                        textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.3,
                    }}>
                        {label}
                    </Typography>
                </Box>

                <Typography sx={{
                    color: T.color.ink, fontSize: '1.35rem', fontWeight: 900, lineHeight: 1.1,
                    filter: blur ? 'blur(6px)' : 'none',
                    userSelect: blur ? 'none' : 'auto',
                }}>
                    {value}
                </Typography>

                {subValue && (
                    <Typography sx={{
                        color: T.color.inkSoft, fontSize: '0.78rem', fontWeight: 600, mt: 0.4,
                        filter: blur ? 'blur(4px)' : 'none',
                    }}>
                        {subValue}
                    </Typography>
                )}
            </Box>

            {footer && (
                <Box sx={{
                    bgcolor: fp.soft,
                    borderTop: `1px solid ${T.color.lineSoft}`,
                    px: 2, py: 0.75,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    minHeight: 32,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: fp.fg, flexShrink: 0 }} />
                        <Typography sx={{ color: fp.fg, fontSize: '0.72rem', fontWeight: 700 }}>{footer}</Typography>
                    </Box>
                    {footerValue && (
                        <Typography sx={{ color: fp.fg, fontSize: '0.72rem', fontWeight: 800 }}>{footerValue}</Typography>
                    )}
                </Box>
            )}
        </Box>
    );
};

const IncrementKPISection = ({ cards, loading, skeletonCount, columns }: KPISectionProps) => {
    const count = skeletonCount ?? cards.length;
    const cols = columns ?? (count <= 4 ? count : 4);
    const smCols = Math.min(cols, 3);

    const gridSx = {
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', sm: `repeat(${smCols}, 1fr)`, lg: `repeat(${cols}, 1fr)` },
        gap: 1.25,
        mb: 3,
    };

    if (loading) {
        return (
            <Box sx={gridSx}>
                {Array.from({ length: count }).map((_, i) => (
                    <SkeletonKpiCard key={i} iconSize={36} />
                ))}
            </Box>
        );
    }

    return (
        <Box sx={gridSx}>
            {cards.map((card, idx) => (
                <MetricCard key={idx} {...card} />
            ))}
        </Box>
    );
};

export default IncrementKPISection;
