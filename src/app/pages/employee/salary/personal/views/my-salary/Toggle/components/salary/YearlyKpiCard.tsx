import { Box, Chip, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { ReactNode } from 'react';

type KpiTone = 'green' | 'blue' | 'amber' | 'purple';

const toneMap: Record<KpiTone, { icon: string; tint: string; border: string; shadow: string }> = {
    green: { icon: '#15803d', tint: '#ecfdf3', border: '#ccefd8', shadow: 'rgba(21, 128, 61, 0.08)' },
    blue: { icon: '#2563eb', tint: '#eef5ff', border: '#dbe8ff', shadow: 'rgba(37, 99, 235, 0.08)' },
    amber: { icon: '#d97706', tint: '#fff7e8', border: '#fde7c3', shadow: 'rgba(217, 119, 6, 0.08)' },
    purple: { icon: '#7c3aed', tint: '#f5efff', border: '#e7dbff', shadow: 'rgba(124, 58, 237, 0.08)' },
};

interface YearlyKpiCardProps {
    icon: ReactNode;
    label: string;
    value: string;
    footer: string;
    tone: KpiTone;
}

const YearlyKpiCard = ({ icon, label, value, footer, tone }: YearlyKpiCardProps) => {
    const palette = toneMap[tone];

    return (
        <Paper
            elevation={0}
            sx={{
                minHeight: 104,
                p: 1.75,
                borderRadius: '16px',
                background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
                border: `1px solid ${palette.border}`,
                boxShadow: `0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 20px ${palette.shadow}`,
                transition: 'transform 180ms ease, box-shadow 180ms ease',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 2px 4px rgba(15, 23, 42, 0.04), 0 14px 24px ${palette.shadow}`,
                },
            }}
        >
            <Stack spacing={0.85} sx={{ height: '100%' }}>
                <Box
                    sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '10px',
                        display: 'grid',
                        placeItems: 'center',
                        color: palette.icon,
                        backgroundColor: palette.tint,
                    }}
                >
                    {icon}
                </Box>
                <Typography sx={{ fontSize: 10.5, color: '#64748b', fontWeight: 800, lineHeight: 1.2, letterSpacing: '0.08em' }}>
                    {label}
                </Typography>
                <Tooltip title={value} arrow>
                    <Typography
                        sx={{
                            fontSize: { xs: 21, md: 23 },
                            fontWeight: 800,
                            color: '#0f172a',
                            lineHeight: 1.1,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {value}
                    </Typography>
                </Tooltip>
                <Chip
                    size="small"
                    label={footer}
                    sx={{
                        alignSelf: 'flex-start',
                        mt: 'auto',
                        height: 22,
                        borderRadius: '999px',
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: palette.icon,
                        backgroundColor: palette.tint,
                        '& .MuiChip-label': { px: 0.95 },
                    }}
                />
            </Stack>
        </Paper>
    );
};

export default YearlyKpiCard;
