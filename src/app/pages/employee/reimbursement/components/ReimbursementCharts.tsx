import { Fragment, useMemo, useState } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Sector } from 'recharts';
import { Dayjs } from 'dayjs';
import {
    buildTrend, buildStatusSlices, buildCategories, buildInsight, buildCycleTimes,
    PeriodGrain, TrendPoint, StatusSlice,
} from '../utils/reimbursementChartData';
import { formatMoney } from '../utils/reimbursementFormat';
import { useSensitiveData } from '@app/modules/common/components/SensitiveData';
import { currencyPrefix } from '@utils/currency';
import { Button } from '@/ds/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ds/ui/card';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/ds/ui/chart';
import { Skeleton } from '@/ds/ui/skeleton';
import { cn } from '@/ds/lib/utils';

/**
 * The three analytics — trend, status, categories — in one row, on the design system's Card and
 * Chart (src/ds). One set of components for all three periods: the toggle changes the
 * aggregation, labels and range, never the design.
 *
 * Left to right they read as the same question narrowing: when did it happen → where does it
 * stand → what was it for.
 *
 * Every card is the same skeleton: a header of fixed height, then a body sharing one height with
 * the other two — that is what keeps a month holding one expense level with a year holding two
 * hundred, instead of the row going ragged. Every figure is tabular and right-aligned to a shared
 * rail. This is money; money should line up.
 *
 * Every chart is a filter, not a picture: clicking a bar opens that period, clicking a slice or a
 * category filters the tables below.
 */

// ── Series ────────────────────────────────────────────────────────────────────
// Theme colours, not hex: the same meaning they carry on the status badges and rails, and correct
// in dark mode. ChartContainer publishes each as `--color-<key>`.

const TREND_CONFIG = {
    approved: { label: 'Approved', color: 'var(--success)' },
    pending: { label: 'Awaiting', color: 'var(--warning)' },
    rejected: { label: 'Rejected', color: 'var(--destructive)' },
    paid: { label: 'Paid out', color: 'var(--info)' },
} satisfies ChartConfig;

/** Status slices arrive named by the chart-data helper; each name has one colour, here. */
const SLICE_COLOR: Record<string, string> = {
    'Paid': 'var(--success)',
    'Awaiting payment': 'var(--info)',
    'Awaiting approval': 'var(--warning)',
    'Needs info': 'color-mix(in oklch, var(--warning) 70%, var(--foreground))',
    'Rejected': 'var(--destructive)',
};
const sliceColor = (s: StatusSlice) => SLICE_COLOR[s.name] ?? s.color;

const INSIGHT_TONE = {
    warn: 'border-[color-mix(in_oklch,var(--warning)_45%,transparent)] bg-warning-soft text-warning-foreground',
    info: 'border-[color-mix(in_oklch,var(--info)_35%,transparent)] bg-info-soft text-info-foreground',
    good: 'border-[color-mix(in_oklch,var(--success)_35%,transparent)] bg-success-soft text-success-foreground',
} as const;

/** One body height for all three cards — the grid stretches the cards, this keeps their insides level. */
const BODY = 'min-h-[210px] sm:min-h-[244px]';
const GRID = 'grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[5fr_3fr_4fr]';
const HINT = 'ml-1.5 text-[11px] font-medium text-muted-foreground/70';
const axisTick = { fontSize: 11, fill: 'var(--muted-foreground)' } as const;
const money = (v: number) => (v >= 1000 ? `${currencyPrefix()}${Math.round(v / 1000)}k` : `${currencyPrefix()}${v}`);

/**
 * A currency figure that obeys the page's eye toggle. Every amount in these cards goes through
 * here, so none can be missed and stay readable while the rest blur. Only the figure is masked,
 * never the bar or the label: a hidden chart still shows the shape of the month.
 */
function Money({ value, className }: { value: number; className?: string }) {
    const { cls } = useSensitiveData();
    return <span className={cn(cls, 'tabular font-bold text-foreground', className)}>{formatMoney(value)}</span>;
}

/** A body that keeps its height when empty, so switching period never makes the row jump. */
function EmptyBody({ text }: { text: string }) {
    return (
        <div className={cn(BODY, 'flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 px-3 text-center text-xs text-muted-foreground')}>
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
        <div className="min-w-44 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
            <div className="font-bold">{label}</div>
            <div className="mb-1.5 text-[11px] text-muted-foreground">
                {point.count} request{point.count === 1 ? '' : 's'} · <Money value={point.total} className="font-semibold text-inherit" />
            </div>
            {rows.map((p: any) => (
                <div key={p.dataKey} className="flex justify-between gap-3.5 leading-[18px]">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <span aria-hidden className="size-2 rounded-[2px]" style={{ background: p.color ?? p.fill }} />
                        {p.name}
                    </span>
                    <Money value={p.value} />
                </div>
            ))}
        </div>
    );
}

/** The hover-expanded donut slice, matching the payroll pie's feel. */
function ActiveSlice(props: any) {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 5} startAngle={startAngle} endAngle={endAngle} fill={fill} />;
}

/**
 * How long a claim takes to clear. Sits under the status ring because it answers the question the
 * ring raises — "mine says awaiting payment, so how long is that?" — with the period's own number.
 */
function CycleStrip({ approval, payment, total }: { approval: number | null; payment: number | null; total: number | null }) {
    const days = (v: number | null) => (v === null ? '—' : v.toFixed(1));
    const cells: { label: string; value: string; strong?: boolean }[] = [
        { label: 'Avg approval', value: days(approval) },
        { label: 'Avg payment', value: days(payment) },
        { label: 'Total', value: days(total), strong: true },
    ];
    return (
        <div className="grid grid-cols-3 border-t border-border pt-2">
            {cells.map((c) => (
                <div key={c.label} className="min-w-0 border-l border-muted px-2 first:border-l-0">
                    <div className="truncate text-[10px] text-muted-foreground">{c.label}</div>
                    <div className={cn('tabular text-[13px]', c.strong ? 'font-extrabold text-foreground' : 'font-bold text-foreground/80')}>
                        {c.value}
                        {/* A real space, not a margin: screen readers and copy-paste read "4.0 days", not "4.0days". */}
                        {c.value !== '—' && <> <span className="text-[10px] font-medium text-muted-foreground">days</span></>}
                    </div>
                </div>
            ))}
        </div>
    );
}

/** The series key, from the chart's own config — one place says what each colour means. */
function SeriesKey({ config }: { config: ChartConfig }) {
    return (
        <div className="flex flex-wrap items-center gap-2.5">
            {Object.entries(config).map(([key, c]) => (
                <span key={key} className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                    <span aria-hidden className="size-2 rounded-[2px]" style={{ background: c.color }} />
                    {c.label}
                </span>
            ))}
        </div>
    );
}

/** The card frame all three share: same header block, same body height, optional footer. */
function ChartCard({ title, hint, subtitle, footer, children }: {
    title: string; hint?: string | false; subtitle: React.ReactNode; footer?: React.ReactNode; children: React.ReactNode;
}) {
    return (
        <Card size="sm" variant="panel" className="min-w-0 gap-2.5">
            <CardHeader className="min-h-9 gap-0.5">
                <CardTitle className="text-[13px] font-bold">
                    {title}
                    {hint && <span className={HINT}>· {hint}</span>}
                </CardTitle>
                <CardDescription className="text-[11px]">{subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">{children}</CardContent>
            {footer && <CardFooter className="block border-t border-border pt-2.5">{footer}</CardFooter>}
        </Card>
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
    const [activeSlice, setActiveSlice] = useState<number | undefined>(undefined);
    const [showAllCategories, setShowAllCategories] = useState(false);
    const { cls } = useSensitiveData();

    const trend = useMemo(() => buildTrend(rows, grain, anchor, fyStart), [rows, grain, anchor, fyStart]);
    const slices = useMemo(() => buildStatusSlices(rows), [rows]);
    const { items: categories, total: categoryTotal } = useMemo(() => buildCategories(rows), [rows]);
    const insight = useMemo(() => buildInsight(rows), [rows]);
    const cycle = useMemo(() => buildCycleTimes(rows), [rows]);
    const sliceConfig = useMemo(
        () => Object.fromEntries(slices.map((s, i) => [`s${i}`, { label: s.name, color: sliceColor(s) }])) satisfies ChartConfig,
        [slices],
    );

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

    if (loading) {
        return (
            <div className={cn(GRID, 'mb-4')} aria-busy="true">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[300px] w-full rounded-2xl sm:h-[336px]" />)}
            </div>
        );
    }

    return (
        <div className="mb-4 grid gap-3">
            {/* The insight line: one sentence doing the interpretation the reader would otherwise do
                by cross-referencing two tables. It always renders — a strip that only appears on bad
                news reads as "not loaded yet" the rest of the time. */}
            <div className={cn('mt-2 flex items-center gap-2.5 rounded-xl border px-3.5 py-2', INSIGHT_TONE[insight.tone])}>
                <span aria-hidden className="text-sm leading-none">{insight.icon}</span>
                {/* Only the amounts blur under "Hide amounts" — the message itself must stay readable. */}
                <span className="text-[12.5px] font-semibold">
                    {insight.parts.map((p, i) => (typeof p === 'string'
                        ? <Fragment key={i}>{p}</Fragment>
                        : <span key={i} className={cls}>{formatMoney(p.money)}</span>))}
                </span>
            </div>

            <div className={cn(GRID, 'items-stretch')}>
                {/* ── 1 · Trend — week / month / year, one chart ────────────────────── */}
                <ChartCard
                    title={title}
                    hint={onSelectPeriod && grain !== 'monthly' && hasTrend && 'click a bar'}
                    subtitle={subtitle}
                    // The key sits under the chart, not in the header — headers stay one shape across
                    // all three cards, which keeps the row's top edge straight.
                    footer={<SeriesKey config={TREND_CONFIG} />}
                >
                    {!hasTrend ? (
                        <EmptyBody text="No reimbursement data for this period" />
                    ) : (
                        <ChartContainer config={TREND_CONFIG} className={cn(BODY, 'aspect-auto w-full flex-1')}>
                            <ComposedChart
                                data={trend}
                                margin={{ top: 6, right: 8, bottom: 0, left: 0 }}
                                barCategoryGap="34%"
                                onClick={(state: any) => {
                                    const point: TrendPoint | undefined = state?.activePayload?.[0]?.payload;
                                    if (point?.key) onSelectPeriod?.(point.key);
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--muted)" vertical={false} />
                                <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} interval={0} />
                                <YAxis tickFormatter={money} tick={axisTick} axisLine={false} tickLine={false} width={48} />
                                <ChartTooltip content={<TrendTooltip />} cursor={{ fill: 'var(--muted)' }} />
                                {/* Stacked: approved + awaiting + rejected = what was claimed. Paid is a
                                    subset of approved, so it rides above as a line rather than a fourth
                                    bar counting the same money twice. maxBarSize stops a single week's
                                    expense being drawn as a wall across the whole card. */}
                                <Bar dataKey="approved" name="Approved" stackId="s" fill="var(--color-approved)" maxBarSize={38} cursor={onSelectPeriod ? 'pointer' : undefined} />
                                <Bar dataKey="pending" name="Awaiting approval" stackId="s" fill="var(--color-pending)" maxBarSize={38} cursor={onSelectPeriod ? 'pointer' : undefined} />
                                <Bar dataKey="rejected" name="Rejected" stackId="s" fill="var(--color-rejected)" maxBarSize={38} radius={[5, 5, 0, 0]} cursor={onSelectPeriod ? 'pointer' : undefined} />
                                <Line dataKey="paid" name="Paid out" stroke="var(--color-paid)" strokeWidth={2} dot={{ r: 2.5, fill: 'var(--color-paid)' }} connectNulls />
                            </ComposedChart>
                        </ChartContainer>
                    )}
                </ChartCard>

                {/* ── 2 · Status ────────────────────────────────────────────────────── */}
                <ChartCard
                    title="Reimbursement by Status"
                    hint={onSelectStatus && slices.length > 0 && 'click to filter'}
                    subtitle={slices.length === 0
                        ? 'Where the money stands'
                        : <><Money value={slicesTotal} className="font-semibold text-inherit" /> claimed in this period</>}
                >
                    {slices.length === 0 ? (
                        <EmptyBody text="No status data available" />
                    ) : (
                        <div className={cn(BODY, 'flex flex-1 flex-col')}>
                            <div className="relative h-[142px] shrink-0">
                                <ChartContainer config={sliceConfig} className="aspect-auto h-[142px] w-full">
                                    <PieChart>
                                        <Pie
                                            data={slices} dataKey="value" nameKey="name"
                                            cx="50%" cy="50%" innerRadius={44} outerRadius={65}
                                            // A lone slice with padding renders as a broken ring — it read
                                            // as a gauge, not a total.
                                            paddingAngle={slices.length > 1 ? 3 : 0}
                                            cornerRadius={slices.length > 1 ? 4 : 0}
                                            startAngle={90} endAngle={-270}
                                            activeShape={ActiveSlice}
                                            onMouseEnter={(_: unknown, i: number) => setActiveSlice(i)}
                                            onMouseLeave={() => setActiveSlice(undefined)}
                                            onClick={(_: unknown, i: number) => onSelectStatus?.(slices[i].status)}
                                            cursor={onSelectStatus ? 'pointer' : undefined}
                                        >
                                            {slices.map((sl, i) => <Cell key={sl.name} fill={`var(--color-s${i})`} stroke="none" />)}
                                        </Pie>
                                    </PieChart>
                                </ChartContainer>

                                {/* Live centre label — swaps to whatever is hovered, in the donut hole. */}
                                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-[9.5px] text-muted-foreground">{centre.label}</span>
                                    <Money value={centre.value} className="text-sm font-extrabold" />
                                </div>
                            </div>

                            {/* Legend rows highlight their slice, and vice-versa. */}
                            <div className="mt-0.5 min-h-0 flex-1 overflow-y-auto">
                                {slices.map((sl, i) => (
                                    <div data-wt-control="row"
                                        key={sl.name}
                                        role={onSelectStatus ? 'button' : undefined}
                                        tabIndex={onSelectStatus ? 0 : undefined}
                                        onMouseEnter={() => setActiveSlice(i)}
                                        onMouseLeave={() => setActiveSlice(undefined)}
                                        onClick={() => onSelectStatus?.(sl.status)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectStatus?.(sl.status); }
                                        }}
                                        className={cn(
                                            'flex items-center gap-2 rounded-lg px-1.5 py-1 text-[11.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                            activeSlice === i && 'bg-muted',
                                            onSelectStatus && 'cursor-pointer',
                                        )}
                                    >
                                        <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ background: sliceColor(sl) }} />
                                        <span className="min-w-0 flex-1 truncate text-muted-foreground">{sl.name}</span>
                                        <span className="tabular text-[10.5px] text-muted-foreground/70">{sl.count}</span>
                                        <Money value={sl.value} className="min-w-[76px] text-right text-[11.5px]" />
                                    </div>
                                ))}
                            </div>

                            <CycleStrip approval={cycle.approval} payment={cycle.payment} total={cycle.total} />
                        </div>
                    )}
                </ChartCard>

                {/* ── 3 · Where it went — CSS bars, not a chart canvas: rows sit at a readable fixed
                    height instead of one category being stretched across a whole empty card. ── */}
                <ChartCard
                    title="Where It Went"
                    hint={onSelectCategory && categories.length > 0 && 'click to filter'}
                    subtitle={categories.length === 0
                        ? 'Spend by expense category'
                        : <>{categories.length} categor{categories.length === 1 ? 'y' : 'ies'} · <Money value={categoryTotal} className="font-semibold text-inherit" /></>}
                >
                    {categories.length === 0 ? (
                        <EmptyBody text="No expense data for this period" />
                    ) : (
                        <div className={cn(BODY, 'flex flex-1 flex-col')}>
                            <div className="grid min-h-0 flex-1 content-start gap-0.5 overflow-y-auto">
                                {visibleCategories.map((c) => {
                                    const selected = activeCategory === c.name;
                                    return (
                                        <div data-wt-control="row"
                                            key={c.name}
                                            role={onSelectCategory ? 'button' : undefined}
                                            tabIndex={onSelectCategory ? 0 : undefined}
                                            aria-pressed={onSelectCategory ? selected : undefined}
                                            onClick={() => onSelectCategory?.(c.name)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectCategory?.(c.name); }
                                            }}
                                            className={cn(
                                                'rounded-xl border px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                                selected ? 'border-[color-mix(in_oklch,var(--primary)_30%,transparent)] bg-accent' : 'border-transparent',
                                                onSelectCategory && 'cursor-pointer',
                                            )}
                                        >
                                            <div className="flex items-baseline gap-2 text-[11.5px]">
                                                <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{c.name}</span>
                                                <span className="tabular text-[10.5px] text-muted-foreground/70">{c.count}×</span>
                                                <Money value={c.value} className="min-w-[76px] text-right text-[11.5px]" />
                                                <span className="tabular w-8 text-right text-[10.5px] text-muted-foreground">{c.pct > 0 && c.pct < 1 ? '<1' : c.pct.toFixed(0)}%</span>
                                            </div>
                                            <div className="mt-1.5 h-[5px] overflow-hidden rounded-[3px] bg-muted">
                                                <div className="h-full rounded-[3px] bg-[oklch(0.55_0.22_293)]" style={{ width: `${Math.max(2, c.pct)}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {(hiddenCategories > 0 || showAllCategories) && (
                                <Button variant="link" size="xs" className="mt-1 shrink-0 self-start" type="button" onClick={() => setShowAllCategories((v) => !v)}>
                                    {showAllCategories ? 'Show top 5' : `Show ${hiddenCategories} more`}
                                </Button>
                            )}
                        </div>
                    )}
                </ChartCard>
            </div>
        </div>
    );
}
