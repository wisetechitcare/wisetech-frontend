import { useState, useMemo } from 'react';
import ApexCharts from 'react-apexcharts';

interface AllTimeIncrementsProps {
    salaryData: any[];
    SalaryDataCtc: any[];
    loading?: boolean;
}

const AllTimeIncrements = ({ salaryData, SalaryDataCtc, loading = false }: AllTimeIncrementsProps) => {
    const [curveType, setCurveType] = useState<'smooth' | 'stepline'>('stepline');

    const months = SalaryDataCtc.map((d) => `${d.month} ${d.year}`);
    const values = SalaryDataCtc.map((d) => d.monthlyCTC);

    const firstSalary = values.length > 0 ? values[0] : 0;
    const currentSalary = values.length > 0 ? values[values.length - 1] : 0;
    const totalIncrement = Math.max(0, currentSalary - firstSalary);
    const totalGrowthPercent = firstSalary > 0 ? (totalIncrement / firstSalary) * 100 : 0;

    // Detect individual salary increment jumps and build point annotations
    const pointAnnotations = useMemo(() => {
        const ann: any[] = [];
        for (let i = 1; i < values.length; i++) {
            const prev = values[i - 1];
            const curr = values[i];
            if (curr > prev && prev > 0) {
                const diff = curr - prev;
                ann.push({
                    x: months[i],
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
                            padding: { left: 4, right: 4, top: 2, bottom: 2 }
                        },
                        text: `+₹${diff.toLocaleString('en-IN')}`
                    }
                });
            }
        }
        return ann;
    }, [values, months]);

    const seriesData = [
        {
            name: "Monthly CTC",
            data: values
        }
    ];

    const chartOptions: any = {
        chart: {
            id: 'alltime-increments-chart',
            type: 'area' as 'area',
            height: 350,
            toolbar: { show: false },
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
                    { offset: 0, color: '#2E93FA', opacity: 0.35 },
                    { offset: 100, color: '#EFF7FF', opacity: 0.05 }
                ]
            }
        },
        grid: {
            borderColor: '#f1f5f9',
            strokeDashArray: 4,
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } }
        },
        xaxis: {
            categories: months,
            axisBorder: { show: true, color: '#e2e8f0' },
            axisTicks: { show: false },
            labels: {
                style: { colors: '#64748b', fontSize: '12px', fontWeight: 500 }
            }
        },
        yaxis: {
            labels: {
                minWidth: 54,
                maxWidth: 54,
                formatter: function (val: number) {
                    return '₹' + Math.round(val).toLocaleString('en-IN');
                },
                style: { colors: '#64748b', fontSize: '12px', fontWeight: 500 }
            },
            title: {
                text: 'Salary (₹)',
                style: { color: '#64748b', fontSize: '13px', fontWeight: 600 }
            }
        },
        colors: ['#2E93FA'],
        markers: {
            size: 5,
            colors: ['#ffffff'],
            strokeColors: '#2E93FA',
            strokeWidth: 3,
            hover: { size: 7 }
        },
        annotations: {
            points: pointAnnotations
        },
        dataLabels: {
            enabled: false
        },
        tooltip: {
            shared: true,
            intersect: false,
            y: {
                formatter: (val: number) => '₹ ' + Math.round(val).toLocaleString('en-IN')
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
            <div className="card mb-5" style={{ padding: '24px', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <SkeletonLoader width="300px" height="32px" />
                </div>
                <div style={{ minHeight: '350px' }}>
                    <SkeletonLoader width="100%" height="300px" />
                </div>
            </div>
        );
    }

    return (
        <div className="card mb-5" style={{
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            borderRadius: '16px',
            backgroundColor: '#ffffff',
            border: '1px solid #f1f5f9',
            fontFamily: 'Inter, sans-serif'
        }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
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
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Increments</h3>
                        <span style={{ fontSize: '12.5px', color: '#64748b' }}>Salary increment growth over time</span>
                    </div>
                </div>

                {/* Growth Badge & Controls */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
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
                                padding: '6px 12px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
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
                                padding: '6px 12px',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
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

                    {/* Premium Growth Badge */}
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#d1fae5',
                        color: '#065f46',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '13px',
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
            <div className="area-chart-container" style={{ minHeight: '350px', marginBottom: 0 }}>
                {values.length > 0 ? (
                    <ApexCharts
                        options={chartOptions}
                        series={seriesData}
                        type="area"
                        height={350}
                    />
                ) : (
                    <div style={{
                        height: '350px',
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
        </div>
    );
};

export default AllTimeIncrements;
