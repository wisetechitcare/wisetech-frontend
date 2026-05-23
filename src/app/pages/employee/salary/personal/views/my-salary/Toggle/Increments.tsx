import { useState, useEffect, useMemo, memo } from 'react';
import ApexCharts from 'react-apexcharts';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';

interface IncrementsProps {
    salaryData: any[];
    loading?: boolean;
    compact?: boolean;
}

const Increments = memo(({ salaryData, loading = false, compact = false }: IncrementsProps) => {
    // Read employeeId for Redis/localStorage key persistence
    const employeeId = useSelector((state: RootState) => state.employee?.currentEmployee?.id || 'default_user');

    // State for period selector persisted in localStorage (fallback from Redis-key naming)
    const [period, setPeriod] = useState<'Monthly' | 'Quarterly' | 'Yearly'>(() => {
        try {
            const saved = localStorage.getItem(`increment_graph_period:${employeeId}`);
            if (saved === 'Monthly' || saved === 'Quarterly' || saved === 'Yearly') {
                return saved;
            }
        } catch (e) {
            console.error(e);
        }
        return 'Monthly';
    });

    // Custom Interactive Feature: Curve Style Toggle (Smooth Curve vs step-line real increments jumps!)
    const [curveType, setCurveType] = useState<'smooth' | 'stepline'>('smooth');

    // Local state for formatted monthly values
    const [monthlyStats, setMonthlyStats] = useState<any[]>([]);

    // Standard Indian Fiscal Year Category Order
    const standardMonths = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

    // Helper to parse amount robustly
    const parseAmount = (raw: any) => {
        if (raw === null || raw === undefined) return 0;
        if (typeof raw === 'number') return raw;
        const cleaned = String(raw).replace(/₹|,/g, "").trim();
        const n = Number(cleaned);
        return Number.isFinite(n) ? n : 0;
    };

    const formatCurrency = (val: number | string | null | undefined) => {
        if (val === null || val === undefined) return '₹0';
        const num = typeof val === 'number' ? val : Number(String(val).replace(/₹|,/g, '').trim());
        if (isNaN(num)) return '₹0';
        return '₹' + num.toLocaleString('en-IN');
    };

    useEffect(() => {
        // Map months to index based on Indian Fiscal Year order (Apr to Mar)
        const monthMapper: { [key: string]: number } = {
            'apr': 0, 'april': 0,
            'may': 1,
            'jun': 2, 'june': 2,
            'jul': 3, 'july': 3,
            'aug': 4, 'august': 4,
            'sep': 5, 'september': 5,
            'oct': 6, 'october': 6,
            'nov': 7, 'november': 7,
            'dec': 8, 'december': 8,
            'jan': 9, 'january': 9,
            'feb': 10, 'february': 10,
            'mar': 11, 'march': 11
        };

        const stats = standardMonths.map(m => ({
            month: m,
            basicSalary: 0
        }));

        if (salaryData && Array.isArray(salaryData)) {
            salaryData.forEach((item: any) => {
                if (!item || !item.month) return;
                const lowerMonth = String(item.month).toLowerCase().trim();
                const index = monthMapper[lowerMonth];
                if (index !== undefined) {
                    let basic = 0;
                    if (item.basicSalary) basic = parseAmount(item.basicSalary);
                    else if (item.netAmount) basic = parseAmount(item.netAmount);
                    else if (item.annualCTC) basic = parseAmount(item.annualCTC / 12);
                    
                    stats[index].basicSalary = basic;
                }
            });
        }

        // Forward-fill the last known salary so the chart doesn't drop to 0
        let lastKnownSalary = 0;
        for (let i = 0; i < stats.length; i++) {
            if (stats[i].basicSalary > 0) {
                lastKnownSalary = stats[i].basicSalary;
            } else if (lastKnownSalary > 0) {
                stats[i].basicSalary = lastKnownSalary;
            }
        }

        setMonthlyStats(stats);
    }, [salaryData]);

    const handlePeriodChange = (newPeriod: 'Monthly' | 'Quarterly' | 'Yearly') => {
        setPeriod(newPeriod);
        try {
            localStorage.setItem(`increment_graph_period:${employeeId}`, newPeriod);
        } catch (e) {
            console.error(e);
        }
    };

    // Process and Group Data based on selected Period
    const processedChart = useMemo(() => {
        if (period === 'Monthly') {
            return {
                categories: monthlyStats.map(item => item.month),
                data: monthlyStats.map(item => item.basicSalary)
            };
        } else if (period === 'Quarterly') {
            const quarters = [
                { name: 'Q1 (Apr-Jun)', months: ['Apr', 'May', 'Jun'] },
                { name: 'Q2 (Jul-Sep)', months: ['Jul', 'Aug', 'Sep'] },
                { name: 'Q3 (Oct-Dec)', months: ['Oct', 'Nov', 'Dec'] },
                { name: 'Q4 (Jan-Mar)', months: ['Jan', 'Feb', 'Mar'] }
            ];

            const quarterData = quarters.map(q => {
                const active = monthlyStats.filter(item => {
                    const m = item.month.toLowerCase();
                    return q.months.some(qm => m.startsWith(qm.toLowerCase()));
                });
                const nonZero = active.filter(item => item.basicSalary > 0);
                const salary = nonZero.length > 0 ? nonZero[nonZero.length - 1].basicSalary : 0;
                return { label: q.name, salary };
            });

            return {
                categories: quarterData.map(q => q.label),
                data: quarterData.map(q => q.salary)
            };
        } else {
            // Yearly
            const nonZero = monthlyStats.filter(item => item.basicSalary > 0);
            const latestSalary = nonZero.length > 0 ? nonZero[nonZero.length - 1].basicSalary : 0;
            return {
                categories: ['FY 2024-25'],
                data: [latestSalary]
            };
        }
    }, [monthlyStats, period]);

    // Compute key growth stats
    const activeStats = monthlyStats.filter(item => item.basicSalary > 0);
    const currentSalary = activeStats.length > 0 ? activeStats[activeStats.length - 1].basicSalary : 0;
    const firstSalary = activeStats.length > 0 ? activeStats[0].basicSalary : 0;
    
    // Total Increment Amount
    const totalIncrement = Math.max(0, currentSalary - firstSalary);
    
    // Average Growth %
    const totalGrowthPercent = firstSalary > 0 ? (totalIncrement / firstSalary) * 100 : 0;

    // Detect individual salary increment jumps and build point annotations
    const pointAnnotations = useMemo(() => {
        const ann: any[] = [];
        if (period !== 'Monthly') return ann; // Point annotations are optimized for monthly storytelling view

        for (let i = 1; i < monthlyStats.length; i++) {
            const prev = monthlyStats[i - 1].basicSalary;
            const curr = monthlyStats[i].basicSalary;
            if (curr > prev && prev > 0) {
                const diff = curr - prev;
                ann.push({
                    x: monthlyStats[i].month,
                    y: curr,
                    marker: {
                        size: 4,
                        fillColor: '#10B981',
                        strokeColor: '#ffffff',
                        strokeWidth: 2,
                    },
                    label: {
                        borderColor: '#10B981',
                        offsetY: -28,
                        style: {
                            color: '#fff',
                            background: '#10B981',
                            fontSize: '8.5px',
                            fontWeight: 700,
                            padding: {
                                left: 4,
                                right: 4,
                                top: 2,
                                bottom: 2
                            }
                        },
                        text: `+${formatCurrency(diff)}`
                    }
                });
            }
        }
        return ann;
    }, [monthlyStats, period]);

    // Calculate maximum single increment jump for insights KPI
    const highestJump = useMemo(() => {
        let maxJump = 0;
        for (let i = 1; i < monthlyStats.length; i++) {
            const jump = monthlyStats[i].basicSalary - monthlyStats[i - 1].basicSalary;
            if (jump > maxJump) {
                maxJump = jump;
            }
        }
        return maxJump;
    }, [monthlyStats]);

    function getFullMonthName(shortMonth: string) {
        const mapping: { [key: string]: string } = {
            'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
            'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
            'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
        };
        return mapping[shortMonth] || shortMonth;
    }

    // Chart Series configuration
    const series = [
        {
            name: 'Salary',
            data: processedChart.data
        }
    ];

    // Chart Options configuration
    const chartOptions: any = {
        chart: {
            id: 'salary-increments-chart',
            type: 'area' as 'area',
            height: compact ? 330 : 430,
            parentHeightOffset: 0,
            offsetY: compact ? 18 : 0,
            toolbar: {
                show: false
            },
            fontFamily: 'Inter, sans-serif',
        },
        stroke: {
            curve: curveType === 'stepline' ? ('stepline' as 'stepline') : ('smooth' as 'smooth'),
            width: 3,
            colors: ['#2E93FA']
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.35,
                opacityTo: 0.05,
                stops: [0, 95, 100],
                colorStops: [
                    {
                        offset: 0,
                        color: '#2E93FA',
                        opacity: 0.35
                    },
                    {
                        offset: 100,
                        color: '#EFF7FF',
                        opacity: 0.05
                    }
                ]
            }
        },
        grid: {
            borderColor: '#f1f5f9',
            strokeDashArray: 4,
            xaxis: {
                lines: {
                    show: false
                }
            },
            yaxis: {
                lines: {
                    show: true
                }
            }
        },
        xaxis: {
            categories: processedChart.categories,
            axisBorder: {
                show: true,
                color: '#e2e8f0'
            },
            axisTicks: {
                show: false
            },
            labels: {
                style: {
                    colors: '#64748b',
                    fontSize: '12px',
                    fontWeight: 500
                }
            }
        },
        yaxis: {
            labels: {
                minWidth: 54,
                maxWidth: 54,
                formatter: function (val: number) {
                    return '₹' + val.toLocaleString('en-IN');
                },
                style: {
                    colors: '#64748b',
                    fontSize: '12px',
                    fontWeight: 500
                }
            },
            title: {
                text: 'Salary (₹)',
                style: {
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: 600
                }
            }
        },
        colors: ['#2E93FA'],
        markers: {
            size: 5,
            colors: ['#ffffff'],
            strokeColors: '#2E93FA',
            strokeWidth: 3,
            hover: {
                size: 7
            }
        },
        annotations: {
            points: pointAnnotations
        },
        tooltip: {
            shared: true,
            intersect: false,
            custom: function({ series, seriesIndex, dataPointIndex, w }: any) {
                const month = w.globals.categoryHeaders[dataPointIndex];
                const curr = series[0][dataPointIndex] || 0;
                const prev = dataPointIndex > 0 ? series[0][dataPointIndex - 1] : 0;
                const diff = curr - prev;
                const percent = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
                
                let incrementHTML = '';
                if (diff > 0 && prev > 0) {
                    incrementHTML = `
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-size: 12px; color: #10B981; font-weight: 600;">
                            <span style="display: inline-flex; align-items: center; gap: 6px;">
                                <span style="width: 8px; height: 8px; border-radius: 50%; background-color: #10B981; display: inline-block;"></span>
                                Increment:
                            </span>
                            <span>+₹${diff.toLocaleString('en-IN')}</span>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #10B981; font-weight: 600;">
                            <span style="display: inline-flex; align-items: center; gap: 6px;">
                                <span style="width: 8px; height: 8px; border-radius: 50%; background-color: #10B981; display: inline-block;"></span>
                                Growth:
                            </span>
                            <span>+${percent.toFixed(0)}%</span>
                        </div>
                    `;
                } else {
                    incrementHTML = `
                        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #64748b;">
                            <span style="display: inline-flex; align-items: center; gap: 6px;">
                                <span style="width: 8px; height: 8px; border-radius: 50%; background-color: #94a3b8; display: inline-block;"></span>
                                Increment:
                            </span>
                            <span style="font-weight: 600;">None</span>
                        </div>
                    `;
                }

                return `
                    <div style="
                        padding: 12px 16px;
                        background: #ffffff;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                        font-family: 'Inter', sans-serif;
                        min-width: 200px;
                    ">
                        <div style="font-weight: 600; font-size: 13px; color: #1e293b; margin-bottom: 8px;">${getFullMonthName(month)}</div>
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
                            <span style="display: inline-flex; align-items: center; gap: 6px; color: #64748b;">
                                <span style="width: 8px; height: 8px; border-radius: 50%; background-color: #2E93FA; display: inline-block;"></span>
                                Salary:
                            </span>
                            <span style="font-weight: 600; color: #1e293b;">₹${curr.toLocaleString('en-IN')}</span>
                        </div>
                        ${prev > 0 ? `
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-size: 12px; color: #64748b;">
                            <span style="display: inline-flex; align-items: center; gap: 6px;">
                                <span style="width: 8px; height: 8px; border-radius: 50%; background-color: #64748b; display: inline-block;"></span>
                                Prev Salary:
                            </span>
                            <span style="font-weight: 600; color: #1e293b;">₹${prev.toLocaleString('en-IN')}</span>
                        </div>
                        ` : ''}
                        <div style="border-top: 1px solid #f1f5f9; padding-top: 6px; margin-top: 6px;">
                            ${incrementHTML}
                        </div>
                    </div>
                `;
            }
        }
    };

    // Skeleton loader component
    const SkeletonLoader = ({ width = "100%", height = "20px" }: { width?: string; height?: string }) => (
        <div style={{
            width,
            height,
            backgroundColor: "#f1f5f9",
            borderRadius: "6px",
            animation: "pulse-shim 1.6s ease-in-out infinite"
        }} />
    );

    if (loading) {
        return (
            <div className="card mb-5" style={{ padding: compact ? '16px' : '24px', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <SkeletonLoader width="300px" height="32px" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: compact ? '10px' : '16px', marginBottom: compact ? '12px' : '24px' }}>
                    {[...Array(4)].map((_, i) => <SkeletonLoader key={i} height={compact ? '58px' : '80px'} />)}
                </div>
                <div style={{ minHeight: compact ? '255px' : '350px' }}>
                    <SkeletonLoader width="100%" height={compact ? '240px' : '300px'} />
                </div>
            </div>
        );
    }

    return (
        <div className="card mb-5" style={{
            padding: compact ? '16px' : '24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            borderRadius: '16px',
            backgroundColor: '#ffffff',
            border: '1px solid #f1f5f9',
            fontFamily: 'Inter, sans-serif'
        }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: compact ? '12px' : '24px', flexWrap: 'wrap', gap: compact ? '10px' : '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: compact ? '34px' : '40px',
                        height: compact ? '34px' : '40px',
                        backgroundColor: '#2e93fa10',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#2E93FA'
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="19" x2="12" y2="5"/>
                            <polyline points="5 12 12 5 19 12"/>
                        </svg>
                    </div>
                    <div>
                        <h3 style={{ fontSize: compact ? '16px' : '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Increments</h3>
                        <span style={{ fontSize: compact ? '11.5px' : '12.5px', color: '#64748b' }}>Salary increment growth over time</span>
                    </div>
                </div>

                {/* Growth Badge & Controls */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: compact ? 'flex-start' : 'flex-end', gap: compact ? '8px' : '16px', flexWrap: 'wrap' }}>
                    {/* Curve Type Selector Toggle */}
                    <div style={{
                        display: 'inline-flex',
                        backgroundColor: '#f1f5f9',
                        padding: '4px',
                        borderRadius: '8px'
                    }}>
                        <button
                            onClick={() => setCurveType('smooth')}
                            style={{
                                padding: compact ? '5px 9px' : '6px 12px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: compact ? '11px' : '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                backgroundColor: curveType === 'smooth' ? '#ffffff' : 'transparent',
                                color: curveType === 'smooth' ? '#1e293b' : '#64748b',
                                boxShadow: curveType === 'smooth' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                            }}
                        >
                            Smooth
                        </button>
                        <button
                            onClick={() => setCurveType('stepline')}
                            style={{
                                padding: compact ? '5px 9px' : '6px 12px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: compact ? '11px' : '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                backgroundColor: curveType === 'stepline' ? '#ffffff' : 'transparent',
                                color: curveType === 'stepline' ? '#1e293b' : '#64748b',
                                boxShadow: curveType === 'stepline' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                            }}
                        >
                            Step-Line
                        </button>
                    </div>

                    {/* Period Tabs Button Group */}
                    <div style={{
                        display: 'inline-flex',
                        backgroundColor: '#f1f5f9',
                        padding: '4px',
                        borderRadius: '8px'
                    }}>
                        {(['Monthly', 'Quarterly', 'Yearly'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => handlePeriodChange(p)}
                                style={{
                                    padding: compact ? '5px 8px' : '6px 12px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: compact ? '11px' : '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    backgroundColor: period === p ? '#ffffff' : 'transparent',
                                    color: period === p ? '#1e293b' : '#64748b',
                                    boxShadow: period === p ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                                }}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    {/* Premium Growth Badge */}
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#d1fae5',
                        color: '#065f46',
                        padding: compact ? '5px 10px' : '6px 14px',
                        borderRadius: '20px',
                        fontSize: compact ? '11.5px' : '13px',
                        fontWeight: 700
                    }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                            <polyline points="17 6 23 6 23 12"/>
                        </svg>
                        {totalGrowthPercent > 0 ? `+${totalGrowthPercent.toFixed(0)}%` : '0%'} Growth
                    </div>
                </div>
            </div>

            {/* The Main Area + Line Chart */}
            <div className="area-chart-container" style={{ minHeight: compact ? '330px' : '430px', marginBottom: 0, paddingTop: compact ? '12px' : 0 }}>
                {processedChart.data.length > 0 ? (
                    <ApexCharts
                        key={`increments-combo-${period}-${curveType}-${monthlyStats.length}`}
                        options={chartOptions}
                        series={series}
                        type="area"
                        height={compact ? 330 : 430}
                    />
                ) : (
                    <div style={{
                        height: compact ? '330px' : '430px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                        fontSize: '14px'
                    }}>
                        No increment data available
                    </div>
                )}
            </div>

            {/* Bottom Insights Grid */}
            <div style={{ display: 'none', gridTemplateColumns: compact ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: compact ? '10px' : '16px' }}>
                {/* Current Salary Card */}
                <div style={{
                    padding: compact ? '10px 12px' : '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="2" y="4" width="20" height="16" rx="2"/>
                            <line x1="12" y1="4" x2="12" y2="20"/>
                        </svg>
                    </div>
                    <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 500, color: '#64748b', marginBottom: '2px' }}>Current Salary</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{formatCurrency(currentSalary)}</div>
                    </div>
                </div>

                {/* Highest Single Increment Jump Card */}
                <div style={{
                    padding: compact ? '10px 12px' : '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: '#d1fae5',
                        color: '#065f46',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                            <polyline points="17 6 23 6 23 12"/>
                        </svg>
                    </div>
                    <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 500, color: '#64748b', marginBottom: '2px' }}>Highest Increment</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{formatCurrency(highestJump)}</div>
                    </div>
                </div>

                {/* Average Growth Rate Card */}
                <div style={{
                    padding: compact ? '10px 12px' : '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: '#f3e8ff',
                        color: '#6b21a8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
                            <path d="M22 12A10 10 0 0 0 12 2v10z"/>
                        </svg>
                    </div>
                    <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 500, color: '#64748b', marginBottom: '2px' }}>Average Growth</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{totalGrowthPercent.toFixed(1)}%</div>
                    </div>
                </div>

                {/* Total Increments Sum Card */}
                <div style={{
                    padding: compact ? '10px 12px' : '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: '#ffedd5',
                        color: '#9a3412',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="1" x2="12" y2="23"/>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                    </div>
                    <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 500, color: '#64748b', marginBottom: '2px' }}>Total Increment</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{formatCurrency(totalIncrement)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
});

Increments.displayName = 'Increments';

export default Increments;

