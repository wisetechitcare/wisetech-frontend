import { useState, useEffect, useMemo, memo } from 'react';
import ApexCharts from 'react-apexcharts';

interface IncrementsProps {
    salaryData: any[];
    loading?: boolean;
}

const Increments = memo(({ salaryData, loading = false }: IncrementsProps) => {
    console.log("Increments Component Rendered - salaryData length:", salaryData?.length, "loading:", loading);
    const [incrementsChartData, setIncrementsChartData] = useState<any[]>([]);
    const [growthPercentage, setGrowthPercentage] = useState<string>('0%');
    const [incrementsChartOptions, setIncrementsChartOptions] = useState({
        chart: {
            id: 'salary-increments-chart',
            type: 'area' as 'area',
            height: 350,
            toolbar: {
                show: true,
                tools: {
                    zoom: false,
                    zoomin: false,
                    zoomout: false,
                    pan: false,
                    reset: false,
                    download: true,
                },
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function (val: number) {
                return '₹' + val.toLocaleString()
            },
            offsetY: -10,
            style: {
                fontSize: '12px',
                colors: ['#0096FF'],
                fontWeight: 600
                
            },
            background: {
                enabled: true,
                foreColor: '#fff',
                borderRadius: 2,
                padding: 4,
                opacity: 1,
                borderWidth: 1,
                borderColor: '#fff',
                dropShadow: {
                    enabled: false,
                    top: 0,
                    left: 0,
                    blur: 0,
                    opacity: 0
                }
            }
        },
        stroke: {
            curve: 'smooth' as 'smooth',
            width: 2,
            colors: ['#2E93FA']
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.1,
                stops: [0, 90, 100]
            },
            colors: ['#EFF7FF']
        },
        grid: {
            borderColor: '#DDE2E4',
            strokeDashArray: 0,
            position: 'back' as 'back',
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
            categories: ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'],
            labels: {
                rotate: -70, trim: false,
                style: {
                    fontSize: '14px',
                    fontFamily: 'Inter, sans-serif',
                    colors: '#000'
                }
            },
            axisBorder: {
                show: false
            },
            axisTicks: {
                show: false
            },
            // labels: {  style: { fontSize: '12px' } },
  tickAmount: 11

        },
        yaxis: {
            labels: {
                style: {
                    fontSize: '11px',
                    fontFamily: 'Lato, sans-serif',
                    colors: '#111618'
                },
                formatter: function (val: number) {
                    return val.toFixed(0)
                }
            }
        },
        colors: ['#2E93FA'],
        markers: {
            size: 0,
            colors: ['#2E93FA'],
            strokeColors: '#fff',
            strokeWidth: 2,
            hover: {
                size: 7
            }
        },
        tooltip: {
            y: {
                formatter: function (val: number) {
                    return "₹ " + val.toLocaleString()
                }
            }
        }
    });

    // useEffect(() => {
    //     if (!salaryData || salaryData.length === 0) return;

    //     // const amounts = salaryData.map((value: any) => {
    //     //     // item.netAmount or item.grossAmount based on requirement
    //     //     const cleaned = value.replace(/₹|,/g, "");
    //     //     return Number(cleaned);
    //     // });
    //     // console.log("Parsed Amounts for Increments Chart: ===================>", amounts);
    //     const amounts = salaryData.map((value: any) => {
    //     // value might be a string like "₹15,168" OR an object like { netAmount: "₹15,168", ... }
    //     const raw = typeof value === 'string' ? value : (value?.netAmount ?? value?.grossAmount ?? '');
    //     const cleaned = String(raw).replace(/₹|,/g, "").trim();
    //     const num = Number(cleaned);
    //     return isNaN(num) ? 0 : num;
    // });

    // console.log("Parsed Amounts for Increments Chart: ===================>", amounts);
       
    //     // Calculate increments data (month-over-month changes)
    //     const incrementsData: number[] = [];
    //     for (let i = 0; i < amounts.length; i++) {
    //         console.log("Amount for month", i, ":", amounts[i]);
    //         // const increment = amounts[i] / 1000; // Convert to thousands for better Y-axis display
    //         const increment = amounts[i];
    //         incrementsData.push(increment);
    //     }

        

    //     // Calculate growth percentage (comparing last month to first month)
    //     if (amounts.length >= 2) {
    //         const firstAmount = amounts[0];
    //         const lastAmount = amounts[amounts.length - 1];
    //         const growth = ((lastAmount - firstAmount) / firstAmount * 100);
    //         const growthFormatted = growth.toFixed(0);
    //         setGrowthPercentage(growth > 0 ? `+${growthFormatted}%` : `${growthFormatted}%`);
    //     }

    //     setIncrementsChartData([
    //         {
    //             name: 'Salary',
    //             data: incrementsData,
    //         },
    //     ]);
    // }, [salaryData]);

//     useEffect(() => {
//     if (!salaryData || salaryData.length === 0) return;

//     const months = [
//         'April','May','June','July','August','September',
//         'October','November','December','January','February','March'
//     ];

//     // helper to get numeric value from various formats
//     const toNum = (raw: any) => {
//         if (raw === null || raw === undefined) return NaN;
//         if (typeof raw === 'number') return raw;
//         const s = String(raw).replace(/₹|,/g, '').trim();
//         const n = Number(s);
//         return isNaN(n) ? NaN : n;
//     };

//     // If salaryData items contain a month property, find by month.
//     // If salaryData is already ordered and length==12, this will still work.
//     const incrementsData: number[] = months.map((m) => {
//         // find entry for this month name (case-sensitive as your data shows)
//         const entry = salaryData.find((it: any) => String(it?.month).toLowerCase() === m.toLowerCase());

//         if (entry) {
//             // prefer netAmount then grossAmount then any numeric value
//             const raw = entry.netAmount ?? entry.grossAmount ?? entry.amount ?? entry.value ?? entry;
//             const num = toNum(raw);
//             // return 0 instead of NaN so chart shows a point — switch to `null` if you want a gap
//             return Number.isFinite(num) ? num : 0;
//         }

//         // missing month -> show 0 (or return null to show gap)
//         return 0;
//     });

//     console.log("Aligned incrementsData:", incrementsData);

//     // compute growth (guard divide-by-zero)
//     if (incrementsData.length >= 2) {
//         const first = incrementsData[0];
//         const last = incrementsData[incrementsData.length - 1];
//         if (first !== 0) {
//             const growth = ((last - first) / first) * 100;
//             const growthFormatted = growth.toFixed(0);
//             setGrowthPercentage(growth > 0 ? `+${growthFormatted}%` : `${growthFormatted}%`);
//         } else {
//             setGrowthPercentage("0%");
//         }
//     }

//     setIncrementsChartData([
//         {
//             name: 'Salary',
//             data: incrementsData,
//         },
//     ]);
// }, [salaryData]);

    // Memoize processed chart data for better performance
    const processedData = useMemo(() => {
        console.log("Processing chart data - salaryData length:", salaryData?.length);

        if (!salaryData || salaryData.length === 0) {
            console.log("No salary data available");
            return {
                chartData: [{ name: 'Salary', data: [] }],
                growthPercentage: "0%",
                categories: []
            };
        }

        // months from salaryData
        const dynamicMonths = salaryData.map((item: any) => item.month);

        // parse amounts (handles "₹15,168" or objects with netAmount/grossAmount)
        const amounts = salaryData.map((value: any) => {
            const raw = typeof value === "string"
                ? value
                : value?.annualCTC
                ? value.annualCTC / 12
                : "";
            const cleaned = String(raw).replace(/₹|,/g, "").trim();
            const num = Number(cleaned);
            return isNaN(num) ? 0 : num;
        });

        console.log("Parsed Amounts:", amounts.length, "months:", dynamicMonths.length);

        const incrementsData: number[] = [...amounts];

        // Calculate growth percentage
        let growth = "0%";
        if (incrementsData.length >= 2) {
            const firstAmount = incrementsData[0];
            const lastAmount = incrementsData[incrementsData.length - 1];
            if (firstAmount !== 0) {
                const growthVal = ((lastAmount - firstAmount) / firstAmount) * 100;
                const growthFormatted = growthVal.toFixed(0);
                growth = growthVal > 0 ? `+${growthFormatted}%` : `${growthFormatted}%`;
            }
        }

        return {
            chartData: [{ name: 'Salary', data: incrementsData }],
            growthPercentage: growth,
            categories: dynamicMonths
        };
    }, [salaryData]);

    // Update chart options when categories change
    useEffect(() => {
        if (processedData.categories.length > 0) {
            setIncrementsChartOptions((prev: any) => ({
                ...prev,
                xaxis: {
                    ...prev.xaxis,
                    categories: processedData.categories
                }
            }));
        }
    }, [processedData.categories]);

    // Update chart data and growth percentage
    useEffect(() => {
        setIncrementsChartData(processedData.chartData);
        setGrowthPercentage(processedData.growthPercentage);
    }, [processedData]);

    // console.log("Increments Chart Data: ===================>", incrementsChartData);

    // Skeleton loader component
    const SkeletonLoader = ({ width = "100%", height = "20px" }: { width?: string; height?: string }) => (
        <div style={{
            width,
            height,
            backgroundColor: "#e0e0e0",
            borderRadius: "4px",
            animation: "pulse 1.5s ease-in-out infinite"
        }} />
    );

    // Add keyframe animation
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    `;
    if (!document.querySelector('style[data-skeleton-animation]')) {
        styleElement.setAttribute('data-skeleton-animation', 'true');
        document.head.appendChild(styleElement);
    }

    if (loading) {
        return (
            <div className="card p-4 mb-5" style={{ boxShadow: '8px 8px 16px 0px rgba(0, 0, 0, 0.04)', borderRadius: '12px' }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <SkeletonLoader width="120px" height="24px" />
                    <SkeletonLoader width="100px" height="24px" />
                </div>
                <div className="card p-4" style={{ minHeight: '350px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <SkeletonLoader width="100%" height="300px" />
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <SkeletonLoader width="80px" height="12px" />
                            <SkeletonLoader width="80px" height="12px" />
                            <SkeletonLoader width="80px" height="12px" />
                            <SkeletonLoader width="80px" height="12px" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card p-4 mb-5" style={{ boxShadow: '8px 8px 16px 0px rgba(0, 0, 0, 0.04)', borderRadius: '12px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="mb-0" style={{ fontSize: '19px', fontWeight: 600, letterSpacing: '0.19px' }}>
                    Increments
                </h4>
                <span style={{ fontSize: '19px', fontWeight: 600, color: '#28a41d', letterSpacing: '0.19px' }}>
                    {growthPercentage} Growth
                </span>
            </div>
            <div className="card p-2 mb-5">
                {incrementsChartData.length > 0 && incrementsChartData[0]?.data?.length > 0 ? (
                    <ApexCharts
                        key={`increments-chart-${salaryData.length}-${salaryData[0]?.month}-${salaryData[salaryData.length - 1]?.month}`}
                        options={incrementsChartOptions}
                        series={incrementsChartData}
                        type="area"
                        height={350}
                    />
                ) : (
                    <div style={{
                        height: '350px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#666'
                    }}>
                        No data available
                    </div>
                )}
            </div>
        </div>
    );
});

Increments.displayName = 'Increments';

export default Increments;
