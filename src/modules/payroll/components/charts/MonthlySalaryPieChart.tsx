import React, { useMemo, useState } from 'react';
import { Box, Paper, Typography, LinearProgress } from '@mui/material';
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
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#f43f5e', '#ec4899'
];

const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
        <g>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 8}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                style={{ filter: `drop-shadow(0px 4px 10px ${fill}40)` }}
                cursor="pointer"
                className="transition-all duration-300"
            />
        </g>
    );
};

const MonthlySalaryPieChart: React.FC<MonthlySalaryPieChartProps> = ({ salarySlipProps, showSensitiveData = true }) => {
    const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
    const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';

    const { grossPay, netPay, totalDeductions, retainPercentage } = useMemo(() => {
        if (!salarySlipProps) return { grossPay: 0, netPay: 0, totalDeductions: 0, retainPercentage: 0 };

        const gross = parseFloat(salarySlipProps.totalGrossPayEarned.replace(/,/g, '')) || 0;
        const net = parseFloat(salarySlipProps.finalAmount.replace(/,/g, '')) || 0;
        
        let deductions = gross - net;
        if (deductions < 0) deductions = 0;

        const retainPct = gross > 0 ? (net / gross) * 100 : 0;

        return { grossPay: gross, netPay: net, totalDeductions: deductions, retainPercentage: retainPct };
    }, [salarySlipProps]);

    const data = useMemo(() => {
        if (!salarySlipProps || grossPay === 0) return [];
        
        const chartData: Array<{ name: string; value: number; color: string }> = [];
        let earningIndex = 0;
        let deductionIndex = 0;
        
        // 1. Work Earnings (Variable & Fixed)
        salarySlipProps.grossPayVariable.forEach((item) => {
            const val = parseFloat(item.earned.replace(/,/g, '')) || 0;
            if (val > 0) {
                chartData.push({
                    name: item.name || 'Work Earning',
                    value: val,
                    color: EARNING_COLORS[earningIndex % EARNING_COLORS.length]
                });
                earningIndex++;
            }
        });
        salarySlipProps.grossPayFixed.forEach((item) => {
            const val = parseFloat(item.earned.replace(/,/g, '')) || 0;
            if (val > 0) {
                chartData.push({
                    name: item.name || 'Fixed Earning',
                    value: val,
                    color: EARNING_COLORS[earningIndex % EARNING_COLORS.length]
                });
                earningIndex++;
            }
        });
        
        // 2. Attendance Adjustments (Variable Deductions)
        salarySlipProps.deductions.forEach((deduction) => {
            const val = parseFloat(deduction.earned.replace(/,/g, '')) || 0;
            if (val > 0) {
                chartData.push({
                    name: deduction.name || 'Attendance Adjustment',
                    value: val,
                    color: DEDUCTION_COLORS[deductionIndex % DEDUCTION_COLORS.length]
                });
                deductionIndex++;
            }
        });

        // 3. Government & Payroll Deductions (Fixed Deductions)
        salarySlipProps.taxes.forEach((tax) => {
            const val = parseFloat(tax.earned.replace(/,/g, '')) || 0;
            if (val > 0) {
                chartData.push({
                    name: tax.name || 'Govt/Payroll Deduction',
                    value: val,
                    color: DEDUCTION_COLORS[deductionIndex % DEDUCTION_COLORS.length]
                });
                deductionIndex++;
            }
        });

        return chartData;
    }, [salarySlipProps, grossPay]);

    if (!salarySlipProps || grossPay === 0) {
        return (
            <Paper elevation={0} sx={{ p: 3, borderRadius: '24px', border: '1px solid #e2e8f0', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">No payroll data available</Typography>
            </Paper>
        );
    }

    const onPieEnter = (_: any, index: number) => {
        setActiveIndex(index);
    };

    const onPieLeave = () => {
        setActiveIndex(undefined);
    };

    // Determine Center Text
    let centerLabel = 'Gross Salary';
    let centerValue = formatCurrencyRounded(grossPay);
    
    if (activeIndex !== undefined && data[activeIndex]) {
        centerLabel = data[activeIndex].name;
        centerValue = formatCurrencyRounded(data[activeIndex].value);
    }

    // Determine Insights
    let insightTitle = '';
    let insightDesc = '';
    let insightColor = '';

    if (totalDeductions === 0) {
        insightTitle = 'Perfect Attendance 🎉';
        insightDesc = '100% of your gross salary was retained this month.';
        insightColor = '#22c55e';
    } else if ((totalDeductions / grossPay) > 0.4) {
        insightTitle = '⚠ High Deductions Detected';
        insightDesc = `Deductions account for ${((totalDeductions / grossPay) * 100).toFixed(1)}% of your gross pay.`;
        insightColor = '#ef4444';
    } else {
        insightTitle = '✅ Excellent Payroll Efficiency';
        insightDesc = `${retainPercentage.toFixed(1)}% salary retained successfully.`;
        insightColor = '#22c55e';
    }

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                borderRadius: '16px',
                backgroundColor: '#ffffff',
                border: '1px solid #f1f5f9',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box mb={1.5}>
                <Typography sx={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', mb: 0.2, letterSpacing: '-0.02em' }}>
                    Salary Breakdown
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                    Monthly Payroll Overview
                </Typography>
            </Box>

            <Box sx={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', width: '100%', gap: 2 }}>
                    <Box sx={{ width: { xs: '100%', md: '45%' }, height: 180, position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                {/* @ts-ignore */}
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={80}
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                    cornerRadius={4}
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
                        
                        {/* Center Text overlay */}
                        <Box
                            sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                textAlign: 'center',
                                pointerEvents: 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 100,
                            }}
                        >
                            <Typography sx={{ fontSize: '1rem', color: '#0f172a', fontWeight: 800, lineHeight: 1.2, mb: 0.2 }} className={sensitiveCls}>
                                {centerValue}
                            </Typography>
                            <Typography sx={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {centerLabel}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Custom Legend (Vertical on the right) */}
                    <Box sx={{ width: { xs: '100%', md: '55%' }, display: 'flex', flexDirection: 'column', gap: 0.75, justifyContent: 'center' }}>
                        {data.map((entry, index) => (
                            <Box key={index} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color }} />
                                    <Typography sx={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{entry.name}</Typography>
                                </Box>
                                <Typography sx={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 700 }} className={sensitiveCls}>{formatCurrencyRounded(entry.value)}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Progress Bar visualization */}
                <Box sx={{ width: '100%', mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                            Net Received
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#0f172a', fontWeight: 700 }}>
                            {retainPercentage.toFixed(1)}%
                        </Typography>
                    </Box>
                    <LinearProgress 
                        variant="determinate" 
                        value={retainPercentage} 
                        sx={{ 
                            height: 6, 
                            borderRadius: 3, 
                            backgroundColor: '#f1f5f9',
                            '& .MuiLinearProgress-bar': {
                                backgroundColor: EARNING_COLORS[0],
                                borderRadius: 3
                            }
                        }} 
                    />
                </Box>

                {/* Smart Insights */}
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
