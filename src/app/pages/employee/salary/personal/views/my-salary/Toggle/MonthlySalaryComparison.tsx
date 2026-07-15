import { useEffect, useState } from 'react';
import ApexCharts from 'react-apexcharts';

interface MonthlySalaryComparisonProps {
    ComparisonData: any[];
    loading?: boolean;
    compact?: boolean;
    showSensitiveData?: boolean;
}

// ── Deduction key matchers (same logic as Yearly.tsx) ──────────────────────
const isPfKey   = (k: string) => k.includes('provident fund') || k.includes('pf');
const isPtaxKey = (k: string) => k.includes('professional tax') || k.includes('ptax');
const isTdsKey  = (k: string) => k.includes('tds') || k.includes('tax deducted') || k.includes('professional fees');
const isTds2Key = (k: string) => k.includes('tds 2') || k.includes('tds2') || k.includes('tds ii');

const sumBreakdown = (breakdown: any, matcher: (k: string) => boolean): number => {
    if (!breakdown || typeof breakdown !== 'object') return 0;
    return Object.entries(breakdown).reduce((sum, [key, item]: [string, any]) => {
        const earned = Number(item?.earned || 0);
        if (item?.isActive === false || earned <= 0) return sum;
        return matcher(key.toLowerCase()) ? sum + earned : sum;
    }, 0);
};

const getDeduction = (row: any, matcher: (k: string) => boolean): number =>
    sumBreakdown(row?.deductionBreakdown?.fixed, matcher) +
    sumBreakdown(row?.deductionBreakdown?.variable, matcher);

// ── Color palette ──────────────────────────────────────────────────────────
const COLOR_BASIC  = '#FBD678'; // warm gold  — Basic Salary
const COLOR_NET    = '#58C25D'; // soft green — Net Payable
const COLOR_PF     = '#3B82F6'; // bright blue    — PF
const COLOR_PTAX   = '#8B5CF6'; // vivid purple   — PTax
const COLOR_TDS    = '#EF4444'; // vivid red       — TDS
const COLOR_TDS2   = '#F97316'; // vivid orange    — TDS2
const COLOR_LINE   = '#1E3A8A'; // dark crimson   — Average line

const MonthlySalaryComparison = ({
    ComparisonData,
    loading = false,
    compact = false,
    showSensitiveData = true,
}: MonthlySalaryComparisonProps) => {
    const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';

    const standardMonths = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

    const monthMapper: Record<string, number> = {
        'apr': 0, 'april': 0, 'may': 1, 'jun': 2, 'june': 2,
        'jul': 3, 'july': 3, 'aug': 4, 'august': 4, 'sep': 5, 'september': 5,
        'oct': 6, 'october': 6, 'nov': 7, 'november': 7, 'dec': 8, 'december': 8,
        'jan': 9, 'january': 9, 'feb': 10, 'february': 10, 'mar': 11, 'march': 11,
    };

    const parseAmount = (raw: any): number => {
        if (raw === null || raw === undefined) return 0;
        if (typeof raw === 'number') return raw;
        const n = Number(String(raw).replace(/₹|,/g, '').trim());
        return Number.isFinite(n) ? n : 0;
    };

    interface MonthStat {
        month: string;
        basicSalary: number | null;
        netTakeHome: number | null;   // net after all deductions
        pf: number | null;
        ptax: number | null;
        tds: number | null;
        tds2: number | null;
        average: number | null;
    }

    const [monthlyStats, setMonthlyStats] = useState<MonthStat[]>([]);
    const [hasPf, setHasPf]     = useState(false);
    const [hasPtax, setHasPtax] = useState(false);
    const [hasTds, setHasTds]   = useState(false);
    const [hasTds2, setHasTds2] = useState(false);

    useEffect(() => {
        const stats: MonthStat[] = standardMonths.map(m => ({
            month: m,
            basicSalary: null, netTakeHome: null,
            pf: null, ptax: null, tds: null, tds2: null, average: null,
        }));

        let _pf = false, _ptax = false, _tds = false, _tds2 = false;

        if (ComparisonData && Array.isArray(ComparisonData)) {
            ComparisonData.forEach((item: any) => {
                if (!item || !item.month) return;
                const idx = monthMapper[String(item.month).toLowerCase().trim()];
                if (idx === undefined) return;

                // Basic salary
                let basic = 0;
                if (item.basicSalary && item.basicSalary !== '-') basic = parseAmount(item.basicSalary);
                else if (item.netAmount && item.netAmount !== '-')  basic = parseAmount(item.netAmount);
                else if (item.annualCTC) basic = parseAmount(item.annualCTC / 12);

                // Net salary (payable / take-home). item.netAmount is ALREADY net of all
                // deductions — it equals "intermediate salary − fixed deductions" and matches
                // the PAYABLE SALARY summary card exactly.
                let netSalary = 0;
                if (item.netAmount && item.netAmount !== '-') netSalary = parseAmount(item.netAmount);
                else if (item.amountPaid && item.amountPaid !== '-') netSalary = parseAmount(item.amountPaid);
                else if (item.basicSalary && item.basicSalary !== '-') netSalary = parseAmount(item.basicSalary);

                // Deductions from breakdown — stacked ON TOP of the net bar, so the full
                // stacked column reconstructs the gross (net salary + deductions = total).
                const pf   = getDeduction(item, isPfKey);
                const ptax = getDeduction(item, isPtaxKey);
                const tds  = getDeduction(item, isTdsKey);
                const tds2 = getDeduction(item, isTds2Key);

                // Green bar shows the true net salary itself. Do NOT subtract deductions here:
                // netAmount is already net, so subtracting would double-count TDS/PF/PTax.
                const netTakeHome = netSalary;

                if (pf   > 0) _pf   = true;
                if (ptax > 0) _ptax = true;
                if (tds  > 0) _tds  = true;
                if (tds2 > 0) _tds2 = true;

                const avg = (basic + netSalary) / 2;

                stats[idx] = {
                    month: standardMonths[idx],
                    basicSalary: basic     > 0 ? basic       : null,
                    netTakeHome: netSalary > 0 ? netTakeHome : null,
                    pf:   pf   > 0 ? pf   : null,
                    ptax: ptax > 0 ? ptax : null,
                    tds:  tds  > 0 ? tds  : null,
                    tds2: tds2 > 0 ? tds2 : null,
                    average: netSalary > 0 ? avg : null,
                };
            });
        }

        setMonthlyStats(stats);
        setHasPf(_pf); setHasPtax(_ptax); setHasTds(_tds); setHasTds2(_tds2);
    }, [ComparisonData]);

    // ── Build series ─────────────────────────────────────────────────────────
    // Series order matters for stacking. ApexCharts stacks from first to last.
    // We want: Basic (ungrouped), then stacked group: NetTakeHome, PF, PTax, TDS, TDS2, Average (line).
    const get = (key: keyof MonthStat) => monthlyStats.map(s => s[key] as number | null);

    const series: any[] = [
        { name: 'Basic Salary', type: 'column', data: get('basicSalary'), group: 'basic' },
        { name: 'Net Payable', type: 'column', data: get('netTakeHome'), group: 'salary' },
        ...(hasPf   ? [{ name: 'PF',   type: 'column', data: get('pf'),   group: 'salary' }] : []),
        ...(hasPtax ? [{ name: 'PTax', type: 'column', data: get('ptax'), group: 'salary' }] : []),
        ...(hasTds  ? [{ name: 'TDS',  type: 'column', data: get('tds'),  group: 'salary' }] : []),
        ...(hasTds2 ? [{ name: 'TDS2', type: 'column', data: get('tds2'), group: 'salary' }] : []),
        { name: 'Average', type: 'line', data: get('average'), dataLabels: { enabled: false } },
    ];

    const stackedSeriesCount = 1 + (hasPf ? 1 : 0) + (hasPtax ? 1 : 0) + (hasTds ? 1 : 0) + (hasTds2 ? 1 : 0);
    const totalSeriesCount   = series.length;

    const colorsArr = [
        COLOR_BASIC, COLOR_NET,
        ...(hasPf   ? [COLOR_PF]   : []),
        ...(hasPtax ? [COLOR_PTAX] : []),
        ...(hasTds  ? [COLOR_TDS]  : []),
        ...(hasTds2 ? [COLOR_TDS2] : []),
        COLOR_LINE,
    ];

    // stroke: 0 for all column series, 3 for the line
    const strokeWidths = Array.from({ length: totalSeriesCount - 1 }, () => 0);
    strokeWidths.push(3);
    const strokeColors = Array.from({ length: totalSeriesCount - 1 }, () => 'transparent');
    strokeColors.push(COLOR_LINE);

    // dataLabels on Basic Salary (0) and Net Payable (1)
    const labelsEnabledOn = [0, 1];

    function getFullMonthName(s: string) {
        const m: Record<string, string> = {
            'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
            'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
            'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December',
        };
        return m[s] || s;
    }

    const chartOptions: any = {
        chart: {
            id: 'salary-combo-chart',
            type: 'line' as const,
            height: compact ? 300 : 430,
            stacked: true, // enables grouping + stacking
            toolbar: { show: false },
            fontFamily: 'Inter, sans-serif',
            selection: { enabled: false },
            zoom: { enabled: false },
        },
        stroke: {
            width: strokeWidths,
            curve: 'straight' as const,
            colors: strokeColors,
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '55%',
                borderRadius: 4,
                borderRadiusApplication: 'around' as const,
                borderRadiusWhenStacked: 'all' as const,
                dataLabels: {
                    position: 'center',
                    orientation: 'vertical' as const,
                },
            },
        },
        colors: colorsArr,
        dataLabels: {
            enabled: true,
            enabledOnSeries: labelsEnabledOn,
            formatter: (val: number, opts: any) => {
                if (!val || val === 0) return '';
                let displayVal = val;
                if (opts?.seriesIndex === 1 && opts?.w?.config?.series) {
                    const series = opts.w.config.series;
                    const dpi = opts.dataPointIndex;
                    let total = 0;
                    for (let i = 1; i < series.length; i++) {
                        if (series[i].group === 'salary') {
                            total += (series[i].data[dpi] || 0);
                        }
                    }
                    if (total > 0) displayVal = total;
                }
                return '₹' + (displayVal / 1000).toFixed(0) + 'k';
            },
            offsetY: 0,
            style: {
                fontSize: compact ? '9px' : '11px',
                fontWeight: 700,
                colors: ['#ffffff'],
            },
            background: { enabled: false },
        },
        xaxis: {
            categories: standardMonths,
            axisBorder: { show: true, color: '#e2e8f0' },
            axisTicks: { show: false },
            labels: { style: { colors: '#64748b', fontSize: '12px', fontWeight: 500 } },
        },
        yaxis: {
            labels: {
                minWidth: 54,
                maxWidth: 54,
                formatter: (val: number) => '₹' + val.toLocaleString('en-IN'),
                style: { colors: '#64748b', fontSize: '12px', fontWeight: 500 },
            },
            title: {
                text: 'Amount (₹)',
                style: { color: '#64748b', fontSize: '13px', fontWeight: 600 },
            },
        },
        grid: {
            borderColor: '#f1f5f9',
            strokeDashArray: 4,
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } },
        },
        markers: {
            size: [...Array(totalSeriesCount - 1).fill(0), 5],
            colors: [COLOR_LINE],
            strokeColors: '#ffffff',
            strokeWidth: 2,
            hover: { size: 7 },
        },
        tooltip: {
            shared: true,
            intersect: false,
            custom: ({ series: sv, dataPointIndex, w }: any) => {
                const month    = w.globals.categoryHeaders?.[dataPointIndex] ?? '';
                const basic    = sv[0]?.[dataPointIndex] ?? 0;
                const net      = sv[1]?.[dataPointIndex] ?? 0;
                let si = 2;
                const pfVal    = hasPf   ? (sv[si++]?.[dataPointIndex] ?? 0) : 0;
                const ptaxVal  = hasPtax ? (sv[si++]?.[dataPointIndex] ?? 0) : 0;
                const tdsVal   = hasTds  ? (sv[si++]?.[dataPointIndex] ?? 0) : 0;
                const tds2Val  = hasTds2 ? (sv[si++]?.[dataPointIndex] ?? 0) : 0;
                const avgVal   = sv[si]?.[dataPointIndex] ?? 0;
                const totalNet = net + pfVal + ptaxVal + tdsVal + tds2Val;

                const row = (color: string, label: string, val: number) =>
                    val > 0 ? `
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;font-size:12px;">
                        <span style="display:inline-flex;align-items:center;gap:6px;color:#64748b;">
                            <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;"></span>
                            ${label}:
                        </span>
                        <span style="font-weight:600;color:#1e293b;">₹${val.toLocaleString('en-IN')}</span>
                    </div>` : '';

                return `
                    <div style="padding:12px 16px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;
                        box-shadow:0 4px 12px rgba(0,0,0,.08);font-family:'Inter',sans-serif;min-width:210px;">
                        <div style="font-weight:700;font-size:13px;color:#1e293b;margin-bottom:8px;">${getFullMonthName(month)}</div>
                        ${row(COLOR_BASIC, 'Basic Salary', basic)}
                        <div style="border-top:1px solid #f1f5f9;margin:6px 0;"></div>
                        ${row(COLOR_NET,   'Net Payable', net)}
                        ${row(COLOR_PF,    'PF', pfVal)}
                        ${row(COLOR_PTAX,  'PTax', ptaxVal)}
                        ${row(COLOR_TDS,   'TDS', tdsVal)}
                        ${row(COLOR_TDS2,  'TDS2', tds2Val)}
                        ${totalNet > 0 ? `<div style="font-size:11.5px;color:#94a3b8;margin-top:4px;">
                            Total: ₹${totalNet.toLocaleString('en-IN')}</div>` : ''}
                        ${avgVal > 0 ? `
                        <div style="display:flex;align-items:center;justify-content:space-between;
                            border-top:1px solid #f1f5f9;padding-top:6px;margin-top:6px;font-size:12px;">
                            <span style="display:inline-flex;align-items:center;gap:6px;color:#64748b;">
                                <span style="width:8px;height:8px;border-radius:50%;background:${COLOR_LINE};display:inline-block;"></span>
                                Average:
                            </span>
                            <span style="font-weight:600;color:${COLOR_LINE};">₹${avgVal.toLocaleString('en-IN')}</span>
                        </div>` : ''}
                    </div>`;
            },
        },
        legend: { show: false },
    };

    // ── Skeleton ─────────────────────────────────────────────────────────────
    const SkeletonLoader = ({ width = '100%', height = '20px' }: { width?: string; height?: string }) => (
        <div style={{ width, height, backgroundColor: '#f1f5f9', borderRadius: '6px', animation: 'pulse-shim 1.6s ease-in-out infinite' }} />
    );

    useEffect(() => {
        if (!document.querySelector('style[data-skeleton-animation]')) {
            const s = document.createElement('style');
            s.setAttribute('data-skeleton-animation', 'true');
            s.innerHTML = `@keyframes pulse-shim{0%,100%{opacity:1}50%{opacity:0.45}}`;
            document.head.appendChild(s);
        }
    }, []);

    if (loading) {
        return (
            <div className="card mb-5" style={{ padding: compact ? '16px' : '24px', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <SkeletonLoader width="300px" height="32px" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: compact ? '10px' : '16px', marginBottom: compact ? '12px' : '24px' }}>
                    {[...Array(4)].map((_, i) => <SkeletonLoader key={i} height={compact ? '64px' : '100px'} />)}
                </div>
                <div style={{ marginTop: compact ? '12px' : '24px', minHeight: compact ? '255px' : '350px' }}>
                    <SkeletonLoader width="100%" height={compact ? '240px' : '300px'} />
                </div>
            </div>
        );
    }

    // ── Legend items ─────────────────────────────────────────────────────────
    const legendItems: { color: string; label: string; line?: boolean }[] = [
        { color: COLOR_BASIC, label: 'Basic Salary' },
        { color: COLOR_NET,   label: 'Net Payable' },
        ...(hasPf   ? [{ color: COLOR_PF,   label: 'PF' }]   : []),
        ...(hasPtax ? [{ color: COLOR_PTAX, label: 'PTax' }] : []),
        ...(hasTds  ? [{ color: COLOR_TDS,  label: 'TDS' }]  : []),
        ...(hasTds2 ? [{ color: COLOR_TDS2, label: 'TDS2' }] : []),
        { color: COLOR_LINE, label: 'Average', line: true },
    ];

    return (
        <div className="card mb-5" style={{
            padding: compact ? '16px' : '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,.04)',
            borderRadius: '16px',
            backgroundColor: '#ffffff',
            border: '1px solid #f1f5f9',
            fontFamily: 'Inter, sans-serif',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: compact ? '10px' : '20px' }}>
                <div style={{
                    width: compact ? '34px' : '40px', height: compact ? '34px' : '40px',
                    backgroundColor: '#8a1c1410', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLOR_LINE,
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: compact ? '16px' : '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Monthly Salary Comparison</h3>
                    <span style={{ fontSize: compact ? '11.5px' : '12.5px', color: '#64748b' }}>Basic vs Net salary with deduction breakdown</span>
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: compact ? '8px 14px' : '8px 20px', margin: compact ? '2px 0 4px' : '12px 0 18px' }}>
                {legendItems.map(({ color, label, line }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, color: '#475569' }}>
                        {line ? (
                            <span style={{ width: '18px', height: '2px', background: color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                <span style={{ width: '5px', height: '5px', background: color, borderRadius: '50%', display: 'inline-block' }} />
                            </span>
                        ) : (
                            <span style={{ width: '16px', height: '10px', background: color, borderRadius: '2px', display: 'inline-block' }} />
                        )}
                        {label}
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div className={`bar-chart-container ${sensitiveCls}`} style={{ minHeight: compact ? '300px' : '430px' }}>
                <ApexCharts options={chartOptions} series={series} type="line" height={compact ? 300 : 430} />
            </div>

            {/* Footer */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: compact ? '2px' : '20px', paddingTop: compact ? '8px' : '14px',
                borderTop: '1px solid #f1f5f9', fontSize: '12px', color: '#94a3b8',
                flexWrap: 'wrap', gap: '8px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    Stacked bar = Net Payable + applicable deductions (PF, TDS, PTax…)
                </div>
                <div>All amounts in ₹ (Indian Rupees)</div>
            </div>
        </div>
    );
};

export default MonthlySalaryComparison;
