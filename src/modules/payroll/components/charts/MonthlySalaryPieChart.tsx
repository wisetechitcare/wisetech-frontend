import React, { useMemo, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { SalarySlipProps } from '@pages/employee/salary/utils/salarySlipDataTransformer';
import { formatCurrencyRounded } from '@utils/currency';

interface MonthlySalaryPieChartProps {
    salarySlipProps: SalarySlipProps | null;
    showSensitiveData?: boolean;
}

const PALETTE = {
    fixed:     { gradient: 'linear-gradient(90deg,#6366f1,#8b5cf6)', solid: '#6366f1', bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.18)' },
    extra:     { gradient: 'linear-gradient(90deg,#10b981,#06d6a0)', solid: '#10b981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.18)' },
    deduction: { gradient: 'linear-gradient(90deg,#ef4444,#f97316)', solid: '#ef4444', bg: 'rgba(239,68,68,0.06)',  border: 'rgba(239,68,68,0.18)' },
    net:       { gradient: 'linear-gradient(90deg,#3b82f6,#6366f1)', solid: '#3b82f6', bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.18)' },
};

function isExtraEarning(name: string): boolean {
    const n = name.toLowerCase();
    return (
        n.includes('over time') || n.includes('overtime') ||
        n === 'ot' || n.startsWith('ot ') || n.includes(' ot') ||
        n.includes('holiday') || n.includes('weekend')
    );
}

const parse = (s: string) => parseFloat(s.replace(/,/g, '')) || 0;

const MonthlySalaryPieChart: React.FC<MonthlySalaryPieChartProps> = ({
    salarySlipProps,
    showSensitiveData = true,
}) => {
    const [hoveredBar, setHoveredBar] = useState<string | null>(null);
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);
    const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';

    const data = useMemo(() => {
        if (!salarySlipProps) return null;

        const fixedItems = salarySlipProps.grossPayFixed
            .map(i => ({ name: i.name || 'Fixed Pay', value: parse(i.earned) }))
            .filter(i => i.value > 0);

        const workItems: Array<{ name: string; value: number }> = [];
        const extraItems: Array<{ name: string; value: number }> = [];
        salarySlipProps.grossPayVariable.forEach(i => {
            const v = parse(i.earned);
            if (v <= 0) return;
            (isExtraEarning(i.name) ? extraItems : workItems).push({ name: i.name, value: v });
        });

        const deductionItems = [
            ...salarySlipProps.deductions.map(i => ({ name: i.name || 'Deduction', value: parse(i.earned) })),
            ...salarySlipProps.taxes.map(i => ({
                name: i.name === 'Professional Fees' ? 'TDS' : (i.name || 'Tax'),
                value: parse(i.earned),
            })),
        ].filter(i => i.value > 0);

        const allFixed      = [...fixedItems, ...workItems];
        const fixedTotal    = allFixed.reduce((s, i) => s + i.value, 0);
        const extraTotal    = extraItems.reduce((s, i) => s + i.value, 0);
        const dedTotal      = deductionItems.reduce((s, i) => s + i.value, 0);
        const grossTotal    = fixedTotal + extraTotal;
        const netTotal      = grossTotal - dedTotal;
        const retainPct     = grossTotal > 0 ? Math.min(Math.max((netTotal / grossTotal) * 100, 0), 100) : 0;

        const bars = [
            { id: 'fixed',     label: 'Fixed Salary',   items: allFixed,        total: fixedTotal, palette: PALETTE.fixed },
            { id: 'extra',     label: 'Extra Earnings',  items: extraItems,      total: extraTotal, palette: PALETTE.extra },
            { id: 'deduction', label: 'Deductions',      items: deductionItems,  total: dedTotal,   palette: PALETTE.deduction },
        ].filter(b => b.total > 0);

        return { bars, fixedTotal, extraTotal, dedTotal, netTotal, grossTotal, retainPct };
    }, [salarySlipProps]);

    if (!data || data.grossTotal === 0) {
        return (
            <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', border: '1px solid #e2e8f0', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary" sx={{ fontSize: '0.85rem' }}>No payroll data available</Typography>
            </Paper>
        );
    }

    const { bars, fixedTotal, extraTotal, dedTotal, netTotal, grossTotal, retainPct } = data;

    const kpiCards = [
        { id: 'fixed',     label: 'Fixed Salary',   value: fixedTotal,  palette: PALETTE.fixed,     icon: '▪' },
        { id: 'extra',     label: 'Extra Earnings',  value: extraTotal,  palette: PALETTE.extra,     icon: '+' },
        { id: 'deduction', label: 'Deductions',      value: dedTotal,    palette: PALETTE.deduction, icon: '−' },
        { id: 'net',       label: 'Net Received',    value: netTotal,    palette: PALETTE.net,       icon: '✓' },
    ];

    const healthColor = retainPct > 85 ? '#10b981' : retainPct > 65 ? '#f59e0b' : '#ef4444';
    const healthGrad  = retainPct > 85
        ? 'linear-gradient(90deg,#10b981,#06d6a0)'
        : retainPct > 65
            ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
            : 'linear-gradient(90deg,#ef4444,#f97316)';
    const healthMsg   = retainPct > 85
        ? 'Excellent payroll efficiency'
        : retainPct > 65
            ? 'Good payroll efficiency'
            : 'High deductions detected';

    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 2, md: 2.5 },
                borderRadius: '20px',
                background: '#ffffff',
                border: '1px solid #f1f5f9',
                boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
            }}
        >
            {/* ── Header ─────────────────────────────────── */}
            <Box>
                <Typography sx={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    Payroll Analytics
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500, mt: 0.3 }}>
                    Monthly earning distribution
                </Typography>
            </Box>

            {/* ── Chart + KPI Cards ───────────────────────── */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2.5, flex: 1, alignItems: 'flex-start' }}>

                {/* Segmented earnings bars */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                    {bars.map((bar, idx) => {
                        const widthPct = (bar.total / grossTotal) * 100;
                        const isHov = hoveredBar === bar.id;

                        return (
                            <motion.div
                                key={bar.id}
                                initial={{ opacity: 0, x: -18 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.11, duration: 0.45 }}
                            >
                                {/* Row label */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.55 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                        <Box sx={{
                                            width: 7, height: 7, borderRadius: '50%',
                                            background: bar.palette.solid,
                                            boxShadow: `0 0 5px ${bar.palette.solid}80`,
                                        }} />
                                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>
                                            {bar.label}
                                        </Typography>
                                    </Box>
                                    <Typography sx={{ fontSize: '0.73rem', fontWeight: 700, color: '#0f172a' }} className={sensitiveCls}>
                                        {formatCurrencyRounded(bar.total)}
                                    </Typography>
                                </Box>

                                {/* Bar track */}
                                <Box
                                    sx={{ position: 'relative', height: 26, borderRadius: '8px', background: '#f8fafc', border: '1px solid #f1f5f9', overflow: 'hidden', cursor: 'pointer' }}
                                    onMouseEnter={() => setHoveredBar(bar.id)}
                                    onMouseLeave={() => setHoveredBar(null)}
                                >
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${widthPct}%` }}
                                        transition={{ delay: 0.35 + idx * 0.15, duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
                                        whileHover={{ filter: 'brightness(1.08)' }}
                                        style={{
                                            height: '100%',
                                            background: bar.palette.gradient,
                                            borderRadius: '7px',
                                            position: 'relative',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {/* Shimmer sweep */}
                                        <motion.div
                                            animate={{ x: ['-120%', '220%'] }}
                                            transition={{ repeat: Infinity, duration: 2.6, ease: 'linear', delay: idx * 0.7 }}
                                            style={{
                                                position: 'absolute', top: 0, left: 0,
                                                width: '35%', height: '100%',
                                                background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)',
                                                pointerEvents: 'none',
                                            }}
                                        />
                                        {/* Percentage label inside bar */}
                                        {widthPct > 14 && (
                                            <Box sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
                                                <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.88)', letterSpacing: '0.02em' }}>
                                                    {widthPct.toFixed(0)}%
                                                </Typography>
                                            </Box>
                                        )}
                                    </motion.div>
                                </Box>

                                {/* Hover breakdown pills */}
                                <AnimatePresence>
                                    {isHov && bar.items.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4, height: 0 }}
                                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                                            exit={{ opacity: 0, y: -4, height: 0 }}
                                            transition={{ duration: 0.17 }}
                                            style={{ overflow: 'hidden' }}
                                        >
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.65 }}>
                                                {bar.items.map((item, i) => (
                                                    <Box
                                                        key={i}
                                                        sx={{
                                                            px: 1, py: 0.3, borderRadius: '6px',
                                                            background: bar.palette.bg,
                                                            border: `1px solid ${bar.palette.border}`,
                                                        }}
                                                    >
                                                        <Typography sx={{ fontSize: '0.62rem', color: bar.palette.solid, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                            {item.name} · {formatCurrencyRounded(item.value)}
                                                        </Typography>
                                                    </Box>
                                                ))}
                                            </Box>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </Box>

                {/* KPI cards grid */}
                <Box sx={{ width: { xs: '100%', md: 192 }, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
                    {kpiCards.map((card, idx) => {
                        const isHov = hoveredCard === card.id;
                        return (
                            <motion.div
                                key={card.id}
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.18 + idx * 0.08, duration: 0.4 }}
                                whileHover={{ y: -2, transition: { duration: 0.14 } }}
                                onHoverStart={() => setHoveredCard(card.id)}
                                onHoverEnd={() => setHoveredCard(null)}
                            >
                                <Box sx={{
                                    p: 1.25,
                                    borderRadius: '12px',
                                    background: isHov ? card.palette.bg : '#f8fafc',
                                    border: `1px solid ${isHov ? card.palette.border : '#f1f5f9'}`,
                                    boxShadow: isHov ? `0 4px 14px ${card.palette.solid}18` : 'none',
                                    transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
                                    cursor: 'default',
                                }}>
                                    <Box sx={{
                                        width: 22, height: 22, borderRadius: '7px',
                                        background: card.palette.gradient,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        mb: 0.75,
                                    }}>
                                        <Typography sx={{ fontSize: '0.7rem', color: 'white', fontWeight: 800, lineHeight: 1 }}>
                                            {card.icon}
                                        </Typography>
                                    </Box>
                                    <Typography sx={{ fontSize: '0.58rem', color: '#94a3b8', fontWeight: 600, lineHeight: 1.3, mb: 0.3 }}>
                                        {card.label}
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1 }} className={sensitiveCls}>
                                        {formatCurrencyRounded(card.value)}
                                    </Typography>
                                </Box>
                            </motion.div>
                        );
                    })}
                </Box>
            </Box>

            {/* ── Payroll Health Indicator ────────────────── */}
            <Box sx={{ pt: 1.5, borderTop: '1px solid #f8fafc' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.7 }}>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8' }}>
                        Payroll Retention
                    </Typography>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: healthColor }}>
                            {retainPct.toFixed(1)}%
                        </Typography>
                    </motion.div>
                </Box>
                <Box sx={{ position: 'relative', height: 3, borderRadius: '4px', background: '#f1f5f9', overflow: 'hidden' }}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${retainPct}%` }}
                        transition={{ delay: 1.1, duration: 1, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: '4px', background: healthGrad }}
                    />
                </Box>
                <Typography sx={{ fontSize: '0.64rem', color: '#cbd5e1', mt: 0.55, fontWeight: 500 }}>
                    {healthMsg}
                </Typography>
            </Box>
        </Paper>
    );
};

export default MonthlySalaryPieChart;
