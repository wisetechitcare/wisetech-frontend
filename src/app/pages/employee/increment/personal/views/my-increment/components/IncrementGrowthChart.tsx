import React from 'react';
import { Box, Paper, Typography, Skeleton } from '@mui/material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatCurrencyRounded } from '@utils/currency';

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
            <Paper
                elevation={3}
                sx={{
                    p: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    bgcolor: 'rgba(255,255,255,0.97)',
                    minWidth: 110,
                }}
            >
                <Typography sx={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, mb: 0.4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {label}
                </Typography>
                <Typography sx={{ color: '#0f172a', fontSize: '0.95rem', fontWeight: 800 }}>
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
    accentColor = '#2563eb',
    height = 240,
}: ChartProps) => {
    if (loading) {
        return <Skeleton variant="rounded" height={height + 80} sx={{ borderRadius: '16px', width: '100%', mb: 3 }} />;
    }

    if (!data || data.length === 0) return null;

    const gradientId = `grad_${accentColor.replace('#', '')}`;
    const interpType = chartType === 'smooth' ? 'monotone' : 'stepAfter';

    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: '16px',
                border: '1px solid #e9eef5',
                mb: 3,
                boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
            }}
        >
            <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography sx={{ color: '#0f172a', fontSize: '1rem', fontWeight: 800 }}>{title}</Typography>
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem', mt: 0.2 }}>{subtitle}</Typography>
                </Box>
            </Box>

            <Box sx={{ width: '100%', height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor={accentColor} stopOpacity={0.18} />
                                <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f4f8" />
                        <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                            dy={8}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                            tickFormatter={(v) => showSensitiveData ? `₹${(v / 1000).toFixed(0)}k` : '•••'}
                            width={58}
                        />
                        <Tooltip content={<CustomTooltip showSensitiveData={showSensitiveData} />} cursor={{ stroke: accentColor, strokeWidth: 1, strokeDasharray: '4 4' }} />
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
        </Paper>
    );
};

export default IncrementGrowthChart;
