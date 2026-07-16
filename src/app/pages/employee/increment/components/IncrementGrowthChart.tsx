import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrencyRounded } from '@utils/currency';
import { T } from '@app/modules/common/components/ui/tokens';
import { SkeletonBlock } from '@app/modules/common/components/Skeleton';
import { Panel, EmptyState } from './widgets';

interface ChartProps {
    data: { label: string; salary: number }[] | undefined;
    loading: boolean;
    showSensitiveData: boolean;
    title?: string;
    subtitle?: string;
    /** 'step' = stepAfter line (yearly monthly chart), 'smooth' = monotone (all-time career chart) */
    chartType?: 'step' | 'smooth';
    accentColor?: string;
    height?: number;
}

const CustomTooltip = ({ active, payload, label, showSensitiveData }: any) => {
    if (active && payload && payload.length) {
        return (
            <Paper elevation={3} sx={{
                p: '8px 12px',
                borderRadius: `${T.radius.sm}px`,
                border: `1px solid ${T.color.line}`,
                bgcolor: 'rgba(255,255,255,0.97)',
                minWidth: 110,
            }}>
                <Typography sx={{
                    color: T.color.inkSoft, fontSize: '0.72rem', fontWeight: 700, mb: 0.4,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                    {label}
                </Typography>
                <Typography sx={{ color: T.color.ink, fontSize: '0.95rem', fontWeight: 800 }}>
                    {showSensitiveData ? formatCurrencyRounded(payload[0].value) : '••••••'}
                </Typography>
            </Paper>
        );
    }
    return null;
};

const IncrementGrowthChart = ({
    data,
    loading,
    showSensitiveData,
    title = 'Salary Growth',
    subtitle = 'Historical progression of monthly salary',
    chartType = 'step',
    accentColor = T.color.brand,
    height = 240,
}: ChartProps) => {
    if (loading) {
        return <SkeletonBlock height={height + 80} radius={T.radius.lg} />;
    }

    const gradientId = `grad_${accentColor.replace('#', '')}`;
    const interpType = chartType === 'smooth' ? 'monotone' : 'stepAfter';

    return (
        <Panel title={title} subtitle={subtitle}>
            {!data || data.length === 0 ? (
                <EmptyState title="No salary data" subtitle="No revisions have been recorded for this period yet." />
            ) : (
                <Box sx={{ width: '100%', height, mt: 1 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={accentColor} stopOpacity={0.18} />
                                    <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.color.lineSoft} />
                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: T.color.inkFaint, fontSize: 11, fontWeight: 600 }}
                                dy={8}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: T.color.inkFaint, fontSize: 11, fontWeight: 600 }}
                                tickFormatter={(v) => showSensitiveData ? `₹${(v / 1000).toFixed(0)}k` : '•••'}
                                width={58}
                            />
                            <Tooltip
                                content={<CustomTooltip showSensitiveData={showSensitiveData} />}
                                cursor={{ stroke: accentColor, strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Area
                                type={interpType as any}
                                dataKey="salary"
                                stroke={accentColor}
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill={`url(#${gradientId})`}
                                activeDot={{ r: 5, strokeWidth: 0, fill: accentColor }}
                                dot={data.length <= 6 ? { r: 4, fill: accentColor, strokeWidth: 0 } : false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </Box>
            )}
        </Panel>
    );
};

export default IncrementGrowthChart;
