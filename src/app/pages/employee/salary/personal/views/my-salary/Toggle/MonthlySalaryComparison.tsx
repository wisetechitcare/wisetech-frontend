import { useEffect, useState } from 'react';
import ApexCharts from 'react-apexcharts';

interface MonthlySalaryComparisonProps {
    ComparisonData: any[];
    loading?: boolean;
    compact?: boolean;
}

const MonthlySalaryComparison = ({ ComparisonData, loading = false, compact = false }: MonthlySalaryComparisonProps) => {
    const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
    
    // Standard Indian Fiscal Year: April to March order
    const standardMonths = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    
    // Helper to parse amount strings or numbers robustly
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
            basicSalary: 0,
            netSalary: 0,
            difference: 0
        }));

        if (ComparisonData && Array.isArray(ComparisonData)) {
            ComparisonData.forEach((item: any) => {
                if (!item || !item.month) return;
                const lowerMonth = String(item.month).toLowerCase().trim();
                const index = monthMapper[lowerMonth];
                if (index !== undefined) {
                    // Extract basic salary or fallbacks
                    let basic = 0;
                    if (item.basicSalary && item.basicSalary !== '-') basic = parseAmount(item.basicSalary);
                    else if (item.netAmount && item.netAmount !== '-') basic = parseAmount(item.netAmount);
                    else if (item.annualCTC) basic = parseAmount(item.annualCTC / 12);

                    // Extract net salary or fallbacks
                    let net = 0;
                    if (item.netAmount && item.netAmount !== '-') net = parseAmount(item.netAmount);
                    else if (item.amountPaid && item.amountPaid !== '-') net = parseAmount(item.amountPaid);
                    else if (item.paidAmount && item.paidAmount !== '-') net = parseAmount(item.paidAmount);
                    else if (item.basicSalary && item.basicSalary !== '-') net = parseAmount(item.basicSalary);

                    // Perfect visual difference ALWAYS matches the absolute gap between the two rendered bars
                    const diff = Math.abs(basic - net);

                    stats[index].basicSalary = basic;
                    stats[index].netSalary = net;
                    stats[index].difference = diff;
                }
            });
        }
        setMonthlyStats(stats);
    }, [ComparisonData]);

    // Compute KPI values
    const totalBasic = monthlyStats.reduce((sum, item) => sum + item.basicSalary, 0);
    const totalNet = monthlyStats.reduce((sum, item) => sum + item.netSalary, 0);
    
    const activeMonths = monthlyStats.filter(item => item.basicSalary > 0);
    const activeCount = activeMonths.length > 0 ? activeMonths.length : 12;

    const avgBasic = Math.round(totalBasic / activeCount);
    const avgNet = Math.round(totalNet / activeCount);

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
            name: 'Basic Salary',
            type: 'column',
            data: monthlyStats.map(item => item.basicSalary)
        },
        {
            name: 'Net Salary',
            type: 'column',
            data: monthlyStats.map(item => item.netSalary)
        },
        {
            name: 'Difference',
            type: 'line',
            data: monthlyStats.map(item => item.difference)
        }
    ];

    // Chart Options configuration with high-visibility floating labels
    const chartOptions: any = {
        chart: {
            id: 'salary-combo-chart',
            type: 'line' as 'line',
            height: compact ? 300 : 430,
            toolbar: {
                show: false
            },
            fontFamily: 'Inter, sans-serif',
        },
        stroke: {
            width: [0, 0, 3], // Columns have no border stroke; line series has 3px width
            curve: 'straight' as 'straight',
            colors: ['transparent', 'transparent', '#AA393D']
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '55%',
                borderRadius: 4,
                endingShape: 'rounded',
                borderRadiusApplication: 'around' as 'around',
                borderRadiusWhenStacked: 'all' as 'all',
                dataLabels: {
                    position: 'top',
                }
            }
        },
        colors: ['#FBD678', '#58C25D', '#AA393D'], // Warm gold, Soft premium green, Deep dark crimson/red theme color
        dataLabels: {
            enabled: true,
            enabledOnSeries: [0, 1], // Display small, premium labels only above the bar columns
            formatter: function (val: number) {
                if (!val || val === 0) return '';
                return '₹' + (val / 1000).toFixed(0) + 'k';
            },
                offsetY: compact ? -14 : -22,
            style: {
                    fontSize: compact ? '9px' : '11px',
                fontWeight: 700,
                colors: ['#334155', '#334155'] // Fixed colors array: very bold, dark color to be 100% visible on white bg!
            },
            background: {
                enabled: false // DISABLED dark badge background to solve color visibility issue entirely
            }
        },
        xaxis: {
            categories: standardMonths,
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
                text: 'Amount (₹)',
                style: {
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: 600
                }
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
        markers: {
            size: [0, 0, 5], // Markers only show on the line series (Difference)
            colors: ['#AA393D'],
            strokeColors: '#ffffff',
            strokeWidth: 2,
            hover: {
                size: 7
            }
        },
        tooltip: {
            shared: true,
            intersect: false,
            custom: function({ series, seriesIndex, dataPointIndex, w }: any) {
                const month = w.globals.categoryHeaders[dataPointIndex];
                const basic = series[0][dataPointIndex] || 0;
                const net = series[1][dataPointIndex] || 0;
                const diff = series[2][dataPointIndex] || 0;
                
                return `
                    <div style="
                        padding: 12px 16px;
                        background: #ffffff;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                        font-family: 'Inter', sans-serif;
                        min-width: 180px;
                    ">
                        <div style="font-weight: 600; font-size: 13px; color: #1e293b; margin-bottom: 8px;">${getFullMonthName(month)}</div>
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
                            <span style="display: inline-flex; align-items: center; gap: 6px; color: #64748b;">
                                <span style="width: 8px; height: 8px; border-radius: 50%; background-color: #FBD678; display: inline-block;"></span>
                                Basic Salary:
                            </span>
                            <span style="font-weight: 600; color: #1e293b;">₹${basic.toLocaleString('en-IN')}</span>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
                            <span style="display: inline-flex; align-items: center; gap: 6px; color: #64748b;">
                                <span style="width: 8px; height: 8px; border-radius: 50%; background-color: #58C25D; display: inline-block;"></span>
                                Net Salary:
                            </span>
                            <span style="font-weight: 600; color: #1e293b;">₹${net.toLocaleString('en-IN')}</span>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 6px; margin-top: 6px;">
                            <span style="display: inline-flex; align-items: center; gap: 6px; color: #64748b;">
                                <span style="width: 8px; height: 8px; border-radius: 50%; background-color: #AA393D; display: inline-block;"></span>
                                Difference:
                            </span>
                            <span style="font-weight: 600; color: #AA393D;">₹${diff.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                `;
            }
        },
        legend: {
            show: false // Custom elegant legend is rendered
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

    useEffect(() => {
        const styleElement = document.createElement('style');
        styleElement.innerHTML = `
            @keyframes pulse-shim {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.45; }
            }
            .kpi-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06) !important;
            }
        `;
        if (!document.querySelector('style[data-skeleton-animation]')) {
            styleElement.setAttribute('data-skeleton-animation', 'true');
            document.head.appendChild(styleElement);
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

    return (
        <div className="card mb-5" style={{
            padding: compact ? '16px' : '24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            borderRadius: '16px',
            backgroundColor: '#ffffff',
            border: '1px solid #f1f5f9',
            fontFamily: 'Inter, sans-serif'
        }}>
            {/* Top Header Section - Only essential title & subtitle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: compact ? '14px' : '24px' }}>
                <div style={{
                    width: compact ? '34px' : '40px',
                    height: compact ? '34px' : '40px',
                    backgroundColor: '#8a1c1410',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#AA393D'
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: compact ? '16px' : '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Monthly Salary Comparison</h3>
                    <span style={{ fontSize: compact ? '11.5px' : '12.5px', color: '#64748b' }}>Basic vs Net salary by month</span>
                </div>
            </div>

            {/* Premium Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: compact ? '12px' : '24px', margin: compact ? '4px 0 2px 0' : '16px 0 24px 0', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>
                    <span style={{ width: '20px', height: '10px', backgroundColor: '#FBD678', borderRadius: '2px', display: 'inline-block' }}></span>
                    Basic Salary (₹)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>
                    <span style={{ width: '20px', height: '10px', backgroundColor: '#58C25D', borderRadius: '2px', display: 'inline-block' }}></span>
                    Net Salary (₹)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>
                    <span style={{
                        width: '20px',
                        height: '2px',
                        backgroundColor: '#AA393D',
                        position: 'relative',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <span style={{ width: '6px', height: '6px', backgroundColor: '#AA393D', borderRadius: '50%', display: 'inline-block' }}></span>
                    </span>
                    Difference (₹)
                </div>
            </div>

            {/* Grouped Connected Bar Chart */}
            <div className="bar-chart-container" style={{ minHeight: compact ? '300px' : '430px' }}>
                <ApexCharts
                    options={chartOptions}
                    series={series}
                    type="line"
                    height={compact ? 300 : 430}
                />
            </div>

            {/* Footer notes */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: compact ? '2px' : '24px',
                paddingTop: compact ? '8px' : '16px',
                borderTop: '1px solid #f1f5f9',
                fontSize: '12.5px',
                color: '#94a3b8',
                flexWrap: 'wrap',
                gap: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    Net Salary includes all deductions (PF, Tax, Insurance, etc.)
                </div>
                <div>All amounts are in Indian Rupees (₹)</div>
            </div>
        </div>
    );
};

export default MonthlySalaryComparison;
