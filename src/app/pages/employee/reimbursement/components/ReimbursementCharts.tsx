import { useMemo, useState } from 'react';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Sector,
} from 'recharts';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { Dayjs } from 'dayjs';
import {
    buildTrend, buildStatusSlices, buildCategories, buildInsight, buildCycleTimes,
    PeriodGrain, TrendPoint, StatusSlice,
} from '../utils/reimbursementChartData';
import { formatINR } from '../utils/reimbursementFormat';

/**
 * The three analytics — trend, status, categories — in one row. One set of components for all
 * three periods: the toggle changes the aggregation, labels and range, never the design.
 *
 * Left to right they read as the same question narrowing: when did it happen → where does it
 * stand → what was it for.
 *
 * Every card is the same skeleton: a header block of fixed height, then a body sharing one height
 * with the other two. That is what keeps a month holding one expense level with a year holding
 * two hundred, instead of the row going ragged.
 *
 * Every figure is set in tabular numerals and right-aligned to a shared rail, so amounts line up
 * down and across the cards. This is money; money should line up.
 *
 * `recharts@3.8.1` is already a dependency and already used by the payroll module. The
 * interaction conventions (hover-linked legend, live centre label, null-as-gap) are the salary
 * module's, so the two read as one product.
 *
 * Every chart is a filter, not a picture: clicking a bar opens that period, clicking a slice or a
 * category filters the tables below.
 */

// ── Tokens ────────────────────────────────────────────────────────────────────

const INK = '#0f172a';
const MUTED = '#64748b';
const FAINT = '#94a3b8';
const LINE = '#e2e8f0';
const RAIL = '#f1f5f9';

const SERIES = {
    approved: '#16a34a',
    pending: '#d97706',
    rejected: '#dc2626',
    paid: '#2563eb',
    spend: '#7c3aed',
} as const;

const TONE_BG = { warn: '#fffbeb', info: '#eff6ff', good: '#f0fdf4' } as const;
const TONE_BD = { warn: '#fcd34d', info: '#bfdbfe', good: '#bbf7d0' } as const;
const TONE_FG = { warn: '#92400e', info: '#1e40af', good: '#166534' } as const;

/** One card skeleton for all three, so the row can never look ragged. */
const CARD: React.CSSProperties = {
    background: '#fff',
    border: `1px solid ${LINE}`,
    borderRadius: 14,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
};
/** Both header lines always render, so every card's body starts on the same line. */
const HEADER: React.CSSProperties = { minHeight: 36, marginBottom: 10 };
const TITLE: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: INK, lineHeight: '18px' };
const SUBTITLE: React.CSSProperties = { fontSize: 11, color: FAINT, lineHeight: '16px', marginTop: 1 };
const HINT: React.CSSProperties = { fontWeight: 500, color: FAINT, marginLeft: 6, fontSize: 11 };
/** The ledger rail: every amount in these cards uses it. */
const FIGURE: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: INK };
const FOOTER: React.CSSProperties = { borderTop: `1px solid ${LINE}`, marginTop: 8, paddingTop: 8, flexShrink: 0 };

const axisTick = { fontSize: 11, fill: MUTED } as const;
const money = (v: number) => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`);

/** A body that keeps its height when empty, so switching period never makes the row jump. */
function EmptyBody({ text, height }: { text: string; height: number }) {
    return (
        <div style={{
            flex: 1, minHeight: height, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: FAINT, fontSize: 12, textAlign: 'center', padding: '0 12px',
            border: `1px dashed ${LINE}`, borderRadius: 10, background: '#fcfdfe',
        }}>
            {text}
        </div>
    );
}

/** Amount, request count and the bucket total — never a raw float. */
function TrendTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const point: TrendPoint | undefined = payload[0]?.payload;
    const rows = payload.filter((p: any) => p?.value);
    if (!point || rows.length === 0) return null;
    return (
        <div style={{
            background: '#fff', border: `1px solid ${LINE}`, borderRadius: 10,
            padding: '9px 11px', boxShadow: '0 8px 20px rgba(15,23,42,0.08)', fontSize: 12, minWidth: 180,
        }}>
            <div style={{ fontWeight: 700, color: INK }}>{label}</div>
            <div style={{ color: FAINT, fontSize: 11, marginBottom: 6 }}>
                {point.count} request{point.count === 1 ? '' : 's'} · {formatINR(point.total)}
            </div>
            {rows.map((p: any) => (
                <div key={p.dataKey} style={{ display: 'flex', gap: 14, justifyContent: 'space-between', lineHeight: '18px' }}>
                    <span style={{ color: p.color ?? p.fill }}>{p.name}</span>
                    <span style={FIGURE}>{formatINR(p.value)}</span>
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
            innerRadius={innerRadius} outerRadius={outerRadius + 5}
            startAngle={startAngle} endAngle={endAngle}
            fill={fill}
        />
    );
}

/**
 * How long a claim takes to clear. Sits under the status ring because it answers the question the
 * ring raises — "mine says awaiting payment, so how long is that?" — with the period's own number
 * instead of an expectation the reader has to invent.
 */
function CycleStrip({ approval, payment, total }: { approval: number | null; payment: number | null; total: number | null }) {
    const days = (v: number | null) => (v === null ? '—' : v.toFixed(1));
    const cells: { label: string; value: string; strong?: boolean }[] = [
        { label: 'Avg approval', value: days(approval) },
        { label: 'Avg payment', value: days(payment) },
        { label: 'Total', value: days(total), strong: true },
    ];
    return (
        <div style={{ ...FOOTER, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            {cells.map((c, i) => (
                <div key={c.label} style={{ padding: '0 8px', minWidth: 0, borderLeft: i === 0 ? 'none' : `1px solid ${RAIL}` }}>
                    <div style={{ fontSize: 10, color: FAINT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.label}
                    </div>
                    <div style={{ ...FIGURE, fontSize: 13, fontWeight: c.strong ? 800 : 700, color: c.strong ? INK : '#334155' }}>
                        {c.value}
                        <span style={{ fontSize: 10, fontWeight: 500, color: FAINT, marginLeft: 3 }}>days</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function SeriesKey({ items }: { items: { label: string; color: string }[] }) {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            {items.map((s) => (
                <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: MUTED }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                    {s.label}
                </span>
            ))}
        </div>
    );
}

export interface ReimbursementChartsProps {
    /** The period's rows — the same array the KPI cards summarise. */
    rows: any[];
    /** Which aggregation to bucket into: week / month / year. */
    grain: PeriodGrain;
    /** The selected month, financial year or (for all time) today. */
    anchor: Dayjs;
    /** First month of the selected financial year, from the org's configured fiscal year. */
    fyStart?: Dayjs | null;
    /** e.g. "FY 2026-27", for the yearly subtitle. */
    fyLabel?: string;
    /** Clicking a bar opens that period — `YYYY-MM` (a month) or `YYYY` (a year). */
    onSelectPeriod?: (key: string) => void;
    /** Clicking a slice filters the tables to that approval status. */
    onSelectStatus?: (status: number) => void;
    /** Clicking a category filters the tables to that expense category. */
    onSelectCategory?: (name: string) => void;
    activeCategory?: string | null;
    loading?: boolean;
}

export default function ReimbursementCharts({
    rows, grain, anchor, fyStart, fyLabel,
    onSelectPeriod, onSelectStatus, onSelectCategory, activeCategory = null, loading = false,
}: ReimbursementChartsProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [activeSlice, setActiveSlice] = useState<number | undefined>(undefined);
    const [showAllCategories, setShowAllCategories] = useState(false);

    const trend = useMemo(() => buildTrend(rows, grain, anchor, fyStart), [rows, grain, anchor, fyStart]);
    const slices = useMemo(() => buildStatusSlices(rows), [rows]);
    const { items: categories, total: categoryTotal } = useMemo(() => buildCategories(rows), [rows]);
    const insight = useMemo(() => buildInsight(rows), [rows]);
    const cycle = useMemo(() => buildCycleTimes(rows), [rows]);

    // ONE body height for all three cards. They sit in a single row, so anything else shows up
    // immediately as a ragged edge; the grid stretches the cards, this keeps their insides level.
    const BODY = isMobile ? 210 : 244;

    const hasTrend = trend.some((p) => p.count > 0);

    const { title, subtitle } = grain === 'monthly'
        ? { title: 'Weekly Reimbursement Trend', subtitle: `Reimbursement activity for ${anchor.format('MMMM YYYY')}` }
        : grain === 'yearly'
            ? { title: 'Monthly Reimbursement Trend', subtitle: `Reimbursement activity for ${fyLabel || `FY ${anchor.format('YYYY')}`}` }
            : { title: 'Yearly Reimbursement Trend', subtitle: 'Reimbursement activity across all years' };

    const slicesTotal = slices.reduce((sum, s) => sum + s.value, 0);
    const centre = activeSlice !== undefined && slices[activeSlice]
        ? { label: slices[activeSlice].name, value: slices[activeSlice].value }
        : { label: 'Total claimed', value: slicesTotal };

    // Top five, with the tail named rather than dropped — a list that silently omits categories
    // reads as a complete breakdown and its total doesn't match the KPI card.
    const TOP = 5;
    const visibleCategories = showAllCategories ? categories : categories.slice(0, TOP);
    const hiddenCategories = Math.max(0, categories.length - visibleCategories.length);

    // 5 / 3 / 4 of twelve: the trend carries an axis and needs the width, the donut needs the
    // least, the category list wants room for names.
    const ROW = { xs: '1fr', md: '1fr 1fr', lg: '5fr 3fr 4fr' };

    if (loading) {
        return (
            <Box sx={{ mb: 2, display: 'grid', gap: 1.5, gridTemplateColumns: ROW }}>
                {[0, 1, 2].map((i) => <div key={i} style={{ ...CARD, height: BODY + 92, background: '#f8fafc' }} />)}
            </Box>
        );
    }

    return (
        <Box sx={{ mb: 2, display: 'grid', gap: 1.5 }}>
            {/*
              * The insight line. One sentence, above the charts, doing the interpretation the
              * reader would otherwise do by cross-referencing two tables. It always renders —
              * when there is nothing to flag it says the good news, because a strip that only
              * appears on bad news reads as "not loaded yet" the rest of the time.
              */}
            <div style={{
                background: TONE_BG[insight.tone],
                border: `1px solid ${TONE_BD[insight.tone]}`,
                borderRadius: 12, padding: '9px 14px', marginTop: 8,
                display: 'flex', alignItems: 'center', gap: 10,
            }}>
                <span style={{ fontSize: 14, lineHeight: 1 }} aria-hidden>{insight.icon}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: TONE_FG[insight.tone] }}>
                    {insight.text}
                </span>
            </div>

            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: ROW, alignItems: 'stretch' }}>
                {/* ── 1 · Trend — week / month / year, one chart ────────────────────── */}
                <div style={CARD}>
                    <div style={HEADER}>
                        <div style={TITLE}>
                            {title}
                            {onSelectPeriod && grain !== 'monthly' && hasTrend && <span style={HINT}>· click a bar</span>}
                        </div>
                        <div style={SUBTITLE}>{subtitle}</div>
                    </div>

                    {!hasTrend ? (
                        <EmptyBody text="No reimbursement data for this period" height={BODY} />
                    ) : (
                        <div style={{ flex: 1, minHeight: BODY }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart
                                    data={trend}
                                    margin={{ top: 6, right: 8, bottom: 0, left: 0 }}
                                    barCategoryGap="34%"
                                    onClick={(state: any) => {
                                        const point: TrendPoint | undefined = state?.activePayload?.[0]?.payload;
                                        if (point?.key) onSelectPeriod?.(point.key);
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke={RAIL} vertical={false} />
                                    <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} interval={0} />
                                    <YAxis tickFormatter={money} tick={axisTick} axisLine={false} tickLine={false} width={48} />
                                    <Tooltip content={<TrendTooltip />} cursor={{ fill: '#f8fafc' }} />
                                    {/* Stacked: approved + awaiting + rejected = what was claimed. Paid is
                                        a subset of approved, so it rides above as a line rather than a
                                        fourth bar counting the same money twice.
                                        maxBarSize is what stops a single week's expense being drawn as a
                                        wall across the whole card. */}
                                    <Bar dataKey="approved" name="Approved" stackId="s" fill={SERIES.approved} maxBarSize={38} cursor={onSelectPeriod ? 'pointer' : undefined} />
                                    <Bar dataKey="pending" name="Awaiting approval" stackId="s" fill={SERIES.pending} maxBarSize={38} cursor={onSelectPeriod ? 'pointer' : undefined} />
                                    <Bar dataKey="rejected" name="Rejected" stackId="s" fill={SERIES.rejected} maxBarSize={38} radius={[5, 5, 0, 0]} cursor={onSelectPeriod ? 'pointer' : undefined} />
                                    <Line dataKey="paid" name="Paid out" stroke={SERIES.paid} strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* The key sits under the chart rather than in the header — headers stay one
                        shape across all three cards, which is what keeps the row's top edge straight. */}
                    <div style={FOOTER}>
                        <SeriesKey items={[
                            { label: 'Approved', color: SERIES.approved },
                            { label: 'Awaiting', color: SERIES.pending },
                            { label: 'Rejected', color: SERIES.rejected },
                            { label: 'Paid out', color: SERIES.paid },
                        ]} />
                    </div>
                </div>

                {/* ── 2 · Status ────────────────────────────────────────────────────── */}
                <div style={CARD}>
                    <div style={HEADER}>
                        <div style={TITLE}>
                            Reimbursement by Status
                            {onSelectStatus && slices.length > 0 && <span style={HINT}>· click to filter</span>}
                        </div>
                        <div style={SUBTITLE}>
                            {slices.length === 0 ? 'Where the money stands' : `${formatINR(slicesTotal)} claimed in this period`}
                        </div>
                    </div>

                    {slices.length === 0 ? (
                        <EmptyBody text="No status data available" height={BODY} />
                    ) : (
                        <div style={{ flex: 1, minHeight: BODY, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ position: 'relative', height: 142, flexShrink: 0 }}>
                                <ResponsiveContainer width="100%" height={142}>
                                    <PieChart>
                                        <Pie
                                            data={slices} dataKey="value" nameKey="name"
                                            cx="50%" cy="50%" innerRadius={44} outerRadius={65}
                                            // A lone slice with padding renders as a broken ring — it
                                            // read as a gauge, not a total.
                                            paddingAngle={slices.length > 1 ? 3 : 0}
                                            cornerRadius={slices.length > 1 ? 4 : 0}
                                            startAngle={90} endAngle={-270}
                                            activeShape={ActiveSlice}
                                            onMouseEnter={(_: unknown, i: number) => setActiveSlice(i)}
                                            onMouseLeave={() => setActiveSlice(undefined)}
                                            onClick={(_: unknown, i: number) => onSelectStatus?.(slices[i].status)}
                                            cursor={onSelectStatus ? 'pointer' : undefined}
                                        >
                                            {slices.map((sl: StatusSlice) => <Cell key={sl.name} fill={sl.color} stroke="none" />)}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>

                                {/* Live centre label — swaps to whatever is hovered, in the donut hole. */}
                                <div style={{
                                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
                                }}>
                                    <span style={{ fontSize: 9.5, color: FAINT }}>{centre.label}</span>
                                    <span style={{ ...FIGURE, fontSize: 14, fontWeight: 800 }}>{formatINR(centre.value)}</span>
                                </div>
                            </div>

                            {/* Legend rows highlight their slice, and vice-versa. */}
                            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', marginTop: 2 }}>
                                {slices.map((sl, i) => (
                                    <div
                                        key={sl.name}
                                        role={onSelectStatus ? 'button' : undefined}
                                        tabIndex={onSelectStatus ? 0 : undefined}
                                        onMouseEnter={() => setActiveSlice(i)}
                                        onMouseLeave={() => setActiveSlice(undefined)}
                                        onClick={() => onSelectStatus?.(sl.status)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectStatus?.(sl.status); }
                                        }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 7,
                                            padding: '4px 6px', borderRadius: 8, fontSize: 11.5,
                                            background: activeSlice === i ? '#f8fafc' : 'transparent',
                                            cursor: onSelectStatus ? 'pointer' : undefined,
                                        }}
                                    >
                                        <span style={{ width: 8, height: 8, borderRadius: 2, background: sl.color, flexShrink: 0 }} />
                                        <span style={{ color: '#475569', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {sl.name}
                                        </span>
                                        <span style={{ color: FAINT, fontSize: 10.5, fontVariantNumeric: 'tabular-nums' }}>{sl.count}</span>
                                        <span style={{ ...FIGURE, fontSize: 11.5, minWidth: 76, textAlign: 'right' }}>{formatINR(sl.value)}</span>
                                    </div>
                                ))}
                            </div>

                            <CycleStrip approval={cycle.approval} payment={cycle.payment} total={cycle.total} />
                        </div>
                    )}
                </div>

                {/*
                  * ── 3 · Where it went ──────────────────────────────────────────────
                  * CSS bars, not a chart canvas: the rows sit at a readable fixed height instead
                  * of one category being stretched across a whole empty card.
                  */}
                <div style={CARD}>
                    <div style={HEADER}>
                        <div style={TITLE}>
                            Where It Went
                            {onSelectCategory && categories.length > 0 && <span style={HINT}>· click to filter</span>}
                        </div>
                        <div style={SUBTITLE}>
                            {categories.length === 0
                                ? 'Spend by expense category'
                                : `${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} · ${formatINR(categoryTotal)}`}
                        </div>
                    </div>

                    {categories.length === 0 ? (
                        <EmptyBody text="No expense data for this period" height={BODY} />
                    ) : (
                        <div style={{ flex: 1, minHeight: BODY, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'grid', gap: 3, alignContent: 'start' }}>
                                {visibleCategories.map((c) => {
                                    const selected = activeCategory === c.name;
                                    return (
                                        <div
                                            key={c.name}
                                            role={onSelectCategory ? 'button' : undefined}
                                            tabIndex={onSelectCategory ? 0 : undefined}
                                            onClick={() => onSelectCategory?.(c.name)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectCategory?.(c.name); }
                                            }}
                                            style={{
                                                padding: '6px 8px', borderRadius: 10,
                                                border: `1px solid ${selected ? '#c7d2fe' : 'transparent'}`,
                                                background: selected ? '#eef2ff' : 'transparent',
                                                cursor: onSelectCategory ? 'pointer' : undefined,
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 11.5 }}>
                                                <span style={{ color: INK, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {c.name}
                                                </span>
                                                <span style={{ color: FAINT, fontSize: 10.5, fontVariantNumeric: 'tabular-nums' }}>{c.count}×</span>
                                                <span style={{ ...FIGURE, fontSize: 11.5, minWidth: 76, textAlign: 'right' }}>{formatINR(c.value)}</span>
                                                <span style={{ color: MUTED, fontSize: 10.5, width: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                                    {c.pct.toFixed(0)}%
                                                </span>
                                            </div>
                                            <div style={{ height: 5, borderRadius: 3, background: RAIL, marginTop: 5, overflow: 'hidden' }}>
                                                <div style={{ width: `${Math.max(2, c.pct)}%`, height: '100%', borderRadius: 3, background: SERIES.spend }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {(hiddenCategories > 0 || showAllCategories) && (
                                <button
                                    type="button"
                                    onClick={() => setShowAllCategories((v) => !v)}
                                    style={{
                                        flexShrink: 0, marginTop: 4, border: 'none', background: 'transparent',
                                        color: '#4f46e5', fontSize: 11, fontWeight: 600, padding: '4px 8px',
                                        textAlign: 'left', cursor: 'pointer',
                                    }}
                                >
                                    {showAllCategories ? 'Show top 5' : `Show ${hiddenCategories} more`}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </Box>
        </Box>
    );
}
