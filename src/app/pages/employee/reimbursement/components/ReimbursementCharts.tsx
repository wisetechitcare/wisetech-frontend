import { useMemo, useState } from 'react';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Sector, BarChart,
} from 'recharts';
import { Box } from '@mui/material';
import {
    buildTrend, buildStatusSlices, buildCategoryBars, buildInsight,
    TrendPoint, StatusSlice,
} from '../utils/reimbursementChartData';
import { formatINR } from '../utils/reimbursementFormat';

/**
 * The chart row.
 *
 * `recharts@3.8.1` is already a dependency and already used by the payroll module — no new
 * charting library, per the plan. The interaction conventions (hover-linked legend, live centre
 * label, null-as-gap) are the salary module's, so the two read as one product.
 *
 * Every chart is a filter, not a picture: clicking a trend bar moves the period, clicking a donut
 * slice filters the table. A chart you cannot act on is decoration, and this module already has a
 * table for looking at numbers.
 */

const TONE_BG = { warn: '#fffbeb', info: '#eff6ff', good: '#f0fdf4' } as const;
const TONE_BD = { warn: '#fcd34d', info: '#bfdbfe', good: '#bbf7d0' } as const;
const TONE_FG = { warn: '#92400e', info: '#1e40af', good: '#166534' } as const;

const CARD = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '18px 20px',
};

const TITLE = { fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14 } as const;

/** Money in the tooltip, never a raw float. */
function INRTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const rows = payload.filter((p: any) => p?.value !== null && p?.value !== undefined);
    if (rows.length === 0) return null;
    return (
        <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
            padding: '10px 12px', boxShadow: '0 8px 20px rgba(15,23,42,0.08)', fontSize: 12,
        }}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{label}</div>
            {rows.map((p: any) => (
                <div key={p.dataKey} style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                    <span style={{ color: p.color ?? p.fill }}>{p.name}</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatINR(p.value)}</span>
                </div>
            ))}
        </div>
    );
}

/** The hover-expanded donut slice, matching the payroll pie's feel. */
function ActiveSlice(props: any) {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
        <Sector
            cx={cx} cy={cy}
            innerRadius={innerRadius} outerRadius={outerRadius + 6}
            startAngle={startAngle} endAngle={endAngle}
            fill={fill}
        />
    );
}

export interface ReimbursementChartsProps {
    /** The period's rows — the same array the KPI cards summarise. */
    rows: any[];
    /** All the employee's rows, for the 12-month trend. Falls back to `rows`. */
    trendRows?: any[];
    /** Clicking a trend bar moves the page to that month (`YYYY-MM`). */
    onSelectMonth?: (monthKey: string) => void;
    /** Clicking a donut slice filters the table to that approval status. */
    onSelectStatus?: (status: number) => void;
    loading?: boolean;
}

export default function ReimbursementCharts({
    rows, trendRows, onSelectMonth, onSelectStatus, loading = false,
}: ReimbursementChartsProps) {
    const [activeSlice, setActiveSlice] = useState<number | undefined>(undefined);

    const trend = useMemo(() => buildTrend(trendRows ?? rows), [trendRows, rows]);
    const slices = useMemo(() => buildStatusSlices(rows), [rows]);
    const categories = useMemo(() => buildCategoryBars(rows), [rows]);
    const insight = useMemo(() => buildInsight(rows), [rows]);

    const slicesTotal = slices.reduce((sum, s) => sum + s.value, 0);
    const centre = activeSlice !== undefined && slices[activeSlice]
        ? { label: slices[activeSlice].name, value: slices[activeSlice].value }
        : { label: 'Total claimed', value: slicesTotal };

    if (loading) {
        return (
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, mb: 2 }}>
                {[0, 1].map((i) => (
                    <div key={i} style={{ ...CARD, height: 300, background: '#f8fafc' }} />
                ))}
            </Box>
        );
    }

    return (
        <Box sx={{ mb: 2 }}>
            {/*
              * The insight line. One sentence, above the charts, doing the interpretation the
              * reader would otherwise do by cross-referencing two tables. It always renders —
              * when there is nothing to flag it says the good news, because a strip that only
              * appears on bad news reads as "not loaded yet" the rest of the time.
              */}
            <div style={{
                background: TONE_BG[insight.tone],
                border: `1px solid ${TONE_BD[insight.tone]}`,
                borderRadius: 12, padding: '11px 16px', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 10,
            }}>
                <span style={{ fontSize: 16, lineHeight: 1 }} aria-hidden>{insight.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: TONE_FG[insight.tone] }}>
                    {insight.text}
                </span>
            </div>

            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' } }}>
                {/* ── Chart 1 · 12-month trend ─────────────────────────────────────── */}
                <div style={CARD}>
                    <div style={TITLE}>
                        Last 12 months
                        {onSelectMonth && (
                            <span style={{ fontWeight: 500, color: '#94a3b8', marginLeft: 8 }}>
                                · click a month to open it
                            </span>
                        )}
                    </div>
                    <ResponsiveContainer width='100%' height={240}>
                        <ComposedChart
                            data={trend}
                            onClick={(state: any) => {
                                const point: TrendPoint | undefined = state?.activePayload?.[0]?.payload;
                                if (point?.key) onSelectMonth?.(point.key);
                            }}
                        >
                            <CartesianGrid strokeDasharray='3 3' stroke='#f1f5f9' vertical={false} />
                            <XAxis dataKey='month' tick={{ fontSize: 11.5, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis
                                tickFormatter={(v: number) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
                                tick={{ fontSize: 11.5, fill: '#64748b' }} axisLine={false} tickLine={false}
                            />
                            <Tooltip content={<INRTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey='approved' name='Approved' stackId='s' fill='#16a34a' cursor={onSelectMonth ? 'pointer' : undefined} />
                            <Bar dataKey='pending' name='Pending' stackId='s' fill='#d97706' cursor={onSelectMonth ? 'pointer' : undefined} />
                            <Bar dataKey='rejected' name='Rejected' stackId='s' fill='#dc2626' radius={[6, 6, 0, 0]} cursor={onSelectMonth ? 'pointer' : undefined} />
                            <Line dataKey='avg' name='Avg per expense' stroke='#7c3aed' strokeWidth={2} dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* ── Chart 2 · status donut ───────────────────────────────────────── */}
                <div style={CARD}>
                    <div style={TITLE}>
                        By status
                        {onSelectStatus && slices.length > 0 && (
                            <span style={{ fontWeight: 500, color: '#94a3b8', marginLeft: 8 }}>· click to filter</span>
                        )}
                    </div>
                    {slices.length === 0 ? (
                        <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12.5 }}>
                            Nothing to show for this period
                        </div>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            <ResponsiveContainer width='100%' height={170}>
                                <PieChart>
                                    <Pie
                                        data={slices} dataKey='value' nameKey='name'
                                        cx='50%' cy='50%' innerRadius={55} outerRadius={80}
                                        paddingAngle={3} cornerRadius={4}
                                        activeShape={ActiveSlice}
                                        onMouseEnter={(_: unknown, i: number) => setActiveSlice(i)}
                                        onMouseLeave={() => setActiveSlice(undefined)}
                                        onClick={(_: unknown, i: number) => onSelectStatus?.(slices[i].status)}
                                        cursor={onSelectStatus ? 'pointer' : undefined}
                                    >
                                        {slices.map((s: StatusSlice) => <Cell key={s.name} fill={s.color} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Live centre label — swaps to whatever is hovered, in the donut hole. */}
                            <div style={{
                                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
                            }}>
                                <span style={{ fontSize: 10.5, color: '#94a3b8', letterSpacing: '0.4px' }}>
                                    {centre.label}
                                </span>
                                <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                                    {formatINR(centre.value)}
                                </span>
                            </div>

                            {/* Legend rows highlight their slice, and vice-versa. */}
                            <div style={{ marginTop: 10 }}>
                                {slices.map((s, i) => (
                                    <div
                                        key={s.name}
                                        role={onSelectStatus ? 'button' : undefined}
                                        tabIndex={onSelectStatus ? 0 : undefined}
                                        onMouseEnter={() => setActiveSlice(i)}
                                        onMouseLeave={() => setActiveSlice(undefined)}
                                        onClick={() => onSelectStatus?.(s.status)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectStatus?.(s.status); }
                                        }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '5px 8px', borderRadius: 8, fontSize: 12,
                                            background: activeSlice === i ? '#f8fafc' : 'transparent',
                                            cursor: onSelectStatus ? 'pointer' : undefined,
                                        }}
                                    >
                                        <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                                        <span style={{ color: '#475569', flex: 1 }}>{s.name} ({s.count})</span>
                                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatINR(s.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Box>

            {/* ── Chart 3 · category breakdown ─────────────────────────────────────── */}
            {categories.length > 0 && (
                <div style={{ ...CARD, marginTop: 12 }}>
                    <div style={TITLE}>Where it went</div>
                    <ResponsiveContainer width='100%' height={Math.max(140, categories.length * 34)}>
                        <BarChart data={categories} layout='vertical' margin={{ left: 8, right: 24 }}>
                            <CartesianGrid strokeDasharray='3 3' stroke='#f1f5f9' horizontal={false} />
                            <XAxis
                                type='number'
                                tickFormatter={(v: number) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
                                tick={{ fontSize: 11.5, fill: '#64748b' }} axisLine={false} tickLine={false}
                            />
                            <YAxis
                                type='category' dataKey='name' width={130}
                                tick={{ fontSize: 11.5, fill: '#475569' }} axisLine={false} tickLine={false}
                            />
                            <Tooltip content={<INRTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey='value' name='Spend' fill='#7c3aed' radius={[0, 8, 8, 0]} barSize={18} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Box>
    );
}
