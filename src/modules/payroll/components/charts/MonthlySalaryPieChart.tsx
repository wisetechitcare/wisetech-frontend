import React, { useMemo, useState } from 'react';
import { Box, Paper, Typography, LinearProgress, Chip } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { SalarySlipProps } from '@pages/employee/salary/utils/salarySlipDataTransformer';
import { formatCurrencyRounded } from '@utils/currency';

interface MonthlySalaryPieChartProps {
    salarySlipProps: SalarySlipProps | null;
    showSensitiveData?: boolean;
}

const EARNING_COLORS = [
    '#22c55e', '#10b981', '#14b8a6', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6'
];

const DEDUCTION_COLORS = [
    '#ef4444', '#f43f5e', '#ec4899', '#dc2626',
];

const OT_COLOR = '#f59e0b';

function isOvertime(name: string): boolean {
    const n = name.toLowerCase();
    return (
        n.includes('over time') || n.includes('overtime') ||
        n === 'ot' || n.startsWith('ot ') || n.includes(' ot')
    );
}

const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
        <g>
            <Sector
                cx={cx} cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 8}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                style={{ filter: `drop-shadow(0px 4px 10px ${fill}40)` }}
                cursor="pointer"
            />
        </g>
    );
};

const MonthlySalaryPieChart: React.FC<MonthlySalaryPieChartProps> = ({ salarySlipProps, showSensitiveData = true }) => {
    const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
    const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';

    const { grossPay, totalDeductions } = useMemo(() => {
        if (!salarySlipProps) return { grossPay: 0, totalDeductions: 0 };
        const gross = parseFloat(salarySlipProps.totalGrossPayEarned.replace(/,/g, '')) || 0;
        const net   = parseFloat(salarySlipProps.finalAmount.replace(/,/g, '')) || 0;
        let deductions = gross - net;
        if (deductions < 0) deductions = 0;
        return { grossPay: gross, totalDeductions: deductions };
    }, [salarySlipProps]);

    const { data, overtimeItems } = useMemo(() => {
        if (!salarySlipProps || grossPay === 0) return { data: [], overtimeItems: [] };

        const chartData: Array<{ name: string; value: number; color: string; kind: 'earning' | 'deduction' | 'overtime' }> = [];
        const otItems:   Array<{ name: string; value: number }> = [];
        let earningIdx = 0, deductionIdx = 0;

        // Fixed earnings — always part of salary
        salarySlipProps.grossPayFixed.forEach((item) => {
            const val = parseFloat(item.earned.replace(/,/g, '')) || 0;
            if (val > 0) {
                chartData.push({ name: item.name || 'Fixed Earning', value: val, color: EARNING_COLORS[earningIdx % EARNING_COLORS.length], kind: 'earning' });
                earningIdx++;
            }
        });

        // Variable earnings — OT gets its own segment + callout, rest stays in chart
        salarySlipProps.grossPayVariable.forEach((item) => {
            const val = parseFloat(item.earned.replace(/,/g, '')) || 0;
            if (val <= 0) return;
            if (isOvertime(item.name)) {
                otItems.push({ name: item.name, value: val });
                chartData.push({ name: item.name, value: val, color: OT_COLOR, kind: 'overtime' });
            } else {
                chartData.push({ name: item.name || 'Work Earning', value: val, color: EARNING_COLORS[earningIdx % EARNING_COLORS.length], kind: 'earning' });
                earningIdx++;
            }
        });

        // Deductions
        salarySlipProps.deductions.forEach((d) => {
            const val = parseFloat(d.earned.replace(/,/g, '')) || 0;
            if (val > 0) {
                chartData.push({ name: d.name || 'Deduction', value: val, color: DEDUCTION_COLORS[deductionIdx % DEDUCTION_COLORS.length], kind: 'deduction' });
                deductionIdx++;
            }
        });
        salarySlipProps.taxes.forEach((t) => {
            const val = parseFloat(t.earned.replace(/,/g, '')) || 0;
            if (val > 0) {
                let name = t.name || 'Tax';
                if (name === 'Professional Fees') name = 'TDS';
                chartData.push({ name, value: val, color: DEDUCTION_COLORS[deductionIdx % DEDUCTION_COLORS.length], kind: 'deduction' });
                deductionIdx++;
            }
        });

        return { data: chartData, overtimeItems: otItems };
    }, [salarySlipProps, grossPay]);

    if (!salarySlipProps || grossPay === 0) {
        return (
            <Paper elevation={0} sx={{ p: 3, borderRadius: '24px', border: '1px solid #e2e8f0', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">No payroll data available</Typography>
            </Paper>
        );
    }

    const onPieEnter = (_: any, index: number) => setActiveIndex(index);
    const onPieLeave = () => setActiveIndex(undefined);

    let centerLabel = 'Total Salary';
    let centerValue = formatCurrencyRounded(grossPay);
    if (activeIndex !== undefined && data[activeIndex]) {
        centerLabel = data[activeIndex].name;
        centerValue = formatCurrencyRounded(data[activeIndex].value);
    }

    // Group legend by kind — OT segments are represented by the callout below
    const earningRows   = data.filter(d => d.kind === 'earning');
    const deductionRows = data.filter(d => d.kind === 'deduction');
    const totalOT       = overtimeItems.reduce((s, i) => s + i.value, 0);
    const otSegmentIdx  = data.findIndex(d => d.kind === 'overtime');

    const monthlySalary = salarySlipProps.baseMonthlySalary ?? Math.max(0, grossPay - totalOT);
    const totalPct      = monthlySalary > 0 ? (grossPay / monthlySalary) * 100 : 0;

    let insightTitle = '';
    let insightDesc  = '';
    let insightColor = '';
    if (totalDeductions === 0) {
        insightTitle = 'Perfect Attendance 🎉';
        insightDesc  = '100% of your gross salary was retained this month.';
        insightColor = '#22c55e';
    } else if ((totalDeductions / grossPay) > 0.4) {
        insightTitle = '⚠ High Deductions Detected';
        insightDesc  = `Deductions account for ${((totalDeductions / grossPay) * 100).toFixed(1)}% of your gross pay.`;
        insightColor = '#ef4444';
    } else {
        insightTitle = '✅ Excellent Payroll Efficiency';
        insightDesc  = `${totalPct.toFixed(1)}% of monthly salary earned this month.`;
        insightColor = '#22c55e';
    }

    const LegendRow = ({ entry, index }: { entry: typeof data[0]; index: number }) => {
        const globalIdx = data.indexOf(entry);
        const isActive  = activeIndex === globalIdx;
        return (
            <Box
                key={index}
                onMouseEnter={() => setActiveIndex(globalIdx)}
                onMouseLeave={() => setActiveIndex(undefined)}
                sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
                    px: 0.75, py: 0.4, borderRadius: '8px', cursor: 'pointer',
                    background: isActive ? `${entry.color}12` : 'transparent',
                    transition: 'background 0.15s',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{entry.name}</Typography>
                </Box>
                <Typography sx={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 700 }} className={sensitiveCls}>
                    {formatCurrencyRounded(entry.value)}
                </Typography>
            </Box>
        );
    };

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2, borderRadius: '16px', backgroundColor: '#ffffff',
                border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                height: '100%', display: 'flex', flexDirection: 'column',
            }}
        >
            {/* Header */}
            <Box mb={1.5}>
                <Typography sx={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', mb: 0.2, letterSpacing: '-0.02em' }}>
                    Salary Breakdown
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                    Monthly Payroll Overview
                </Typography>
            </Box>

            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', width: '100%', gap: 2 }}>
                    {/* Donut Chart */}
                    <Box sx={{ width: { xs: '100%', md: '45%' }, height: 180, position: 'relative' }}>
                        <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                                {/* @ts-ignore */}
                                <Pie
                                    data={data}
                                    cx="50%" cy="50%"
                                    innerRadius={55} outerRadius={80}
                                    paddingAngle={3} dataKey="value"
                                    stroke="none" cornerRadius={4}
                                    {...{ activeIndex } as any}
                                    activeShape={renderActiveShape}
                                    onMouseEnter={onPieEnter}
                                    onMouseLeave={onPieLeave}
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center text */}
                        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none', width: 100 }}>
                            <Typography sx={{ fontSize: '1rem', color: '#0f172a', fontWeight: 800, lineHeight: 1.2, mb: 0.2 }} className={sensitiveCls}>
                                {centerValue}
                            </Typography>
                            <Typography sx={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {centerLabel}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Legend */}
                    <Box sx={{ width: { xs: '100%', md: '55%' }, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        {/* Salary earnings */}
                        {earningRows.map((entry, i) => <LegendRow key={i} entry={entry} index={i} />)}

                        {/* Deductions separator */}
                        {deductionRows.length > 0 && (
                            <>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, mb: 0.25 }}>
                                    <Box sx={{ flex: 1, height: '1px', background: '#f1f5f9' }} />
                                    <Chip
                                        label="Deductions"
                                        size="small"
                                        sx={{ fontSize: '0.58rem', fontWeight: 700, height: 16, px: 0.5, backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', '& .MuiChip-label': { px: 0.75 } }}
                                    />
                                    <Box sx={{ flex: 1, height: '1px', background: '#f1f5f9' }} />
                                </Box>
                                {deductionRows.map((entry, i) => <LegendRow key={i} entry={entry} index={i} />)}
                            </>
                        )}

                        {/* Overtime callout — legend for the OT chart segment */}
                        {totalOT > 0 && (
                            <Box
                                onMouseEnter={() => otSegmentIdx >= 0 && setActiveIndex(otSegmentIdx)}
                                onMouseLeave={() => setActiveIndex(undefined)}
                                sx={{ mt: 1, p: 1, borderRadius: '10px', background: 'linear-gradient(135deg,#fef9c3,#fef3c7)', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, cursor: 'pointer' }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <Box sx={{ width: 22, height: 22, borderRadius: '6px', background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Typography sx={{ fontSize: '0.65rem', color: '#fff', fontWeight: 800, lineHeight: 1 }}>OT</Typography>
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#92400e', lineHeight: 1.2 }}>
                                            {overtimeItems.length === 1 ? overtimeItems[0].name : 'Overtime Pay'}
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.6rem', color: '#b45309', fontWeight: 500 }}>Extra · Not part of fixed salary</Typography>
                                    </Box>
                                </Box>
                                <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: '#92400e' }} className={sensitiveCls}>
                                    +{formatCurrencyRounded(totalOT)}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* Total salary (before deductions) vs monthly salary */}
                <Box sx={{ width: '100%', mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography sx={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                            Total Salary{' '}
                            <Typography component="span" sx={{ fontSize: '0.75rem', color: '#0f172a', fontWeight: 700 }} className={sensitiveCls}>
                                {formatCurrencyRounded(grossPay)}
                            </Typography>
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#0f172a', fontWeight: 700 }}>
                            
                            <Typography component="span" sx={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                                Monthly Salary{' '}
                                <Typography component="span" sx={{ fontSize: '0.75rem', color: '#0f172a', fontWeight: 700 }} className={sensitiveCls}>
                                    {formatCurrencyRounded(monthlySalary)}
                                </Typography>
                            </Typography>
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={Math.min(100, totalPct)}
                        sx={{
                            height: 6, borderRadius: 3, backgroundColor: '#f1f5f9',
                            '& .MuiLinearProgress-bar': { backgroundColor: totalPct > 100 ? OT_COLOR : EARNING_COLORS[0], borderRadius: 3 },
                        }}
                    />
                </Box>

                {/* Smart insights */}
                <Box sx={{ width: '100%', mt: 1.5, p: 1.25, borderRadius: 2, backgroundColor: `${insightColor}10`, border: `1px solid ${insightColor}20` }}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: insightColor, mb: 0.25 }}>
                        {insightTitle}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>
                        {insightDesc}
                    </Typography>
                </Box>
            </Box>
        </Paper>
    );
};

export default MonthlySalaryPieChart;
