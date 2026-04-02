// import { useEffect, useState } from 'react';
// import ApexCharts from 'react-apexcharts';

// interface MonthlySalaryComparisonProps {
//     ComparisonData: any[];
// }
// const MonthlySalaryComparison = ({ComparisonData}:MonthlySalaryComparisonProps) => {
//     console.log("Received ComparisonData: ===================>", ComparisonData);
//      const [incrementsChartData, setIncrementsChartData] = useState<any[]>([]);
//     const [growthPercentage, setGrowthPercentage] = useState<string>('0%');
//     // Bar chart data (with dummy data for grouped bars)
//     const [barChartData] = useState<any[]>([
//         {
//             name: 'Basic Salary',
//             data: [...ComparisonData.map(item => {
//                 // parse amounts (handles "₹15,168" or objects with netAmount/grossAmount)
//                 const raw = typeof item === "string"
//                     ? item
//                     : item?.netAmount
//                     ? item.netAmount
//                     : "";
//                 const cleaned = String(raw).replace(/₹|,/g, "").trim();
//                 const num = Number(cleaned);
//                 return isNaN(num) ? 0 : num;
            
//             })]
//         },
//         {
//             name: 'Net Salary',
//             data: [...ComparisonData.map(item => {
//                 // parse amounts (handles "₹15,168" or objects with netAmount/grossAmount)
//                 const raw = typeof item === "string"
//                     ? item
//                     : item?.basicSalary
//                     ? item.basicSalary
//                     : "";
//                 const cleaned = String(raw).replace(/₹|,/g, "").trim();
//                 const num = Number(cleaned);
//                 return isNaN(num) ? 0 : num;
//             })]
//         }
//     ]);

//     const [barChartOptions,setIncrementsChartOptions] = useState({
//         chart: {
//             id: 'salary-bar-chart',
//             type: 'bar' as 'bar',
//             height: 350,
//             toolbar: {
//                 show: true,
//                 tools: {
//                     zoom: false,
//                     zoomin: false,
//                     zoomout: false,
//                     pan: false,
//                     reset: false,
//                     download: true,
//                 },
//             }
//         },
//         plotOptions: {
//             bar: {
//                 horizontal: false,
//                 columnWidth: '55%',
//                 endingShape: 'rounded',
//                 borderRadius: 4,
//                 dataLabels: {
//                     position: 'center'
//                 }
//             },
//         },
//         dataLabels: {
//             enabled: true,
//             formatter: function (val: number) {
//                 return '₹' + val.toLocaleString()
//             },
//             offsetY: 0,
//             offsetX: 0,
//             style: {
//                 fontSize: '11px',
//                 colors: ['#fff'],
//                 fontWeight: 600
//             },
//             background: {
//                 enabled: false,
//                 dropShadow: {
//                     enabled: false,
//                     top: 0,
//                     left: 0,
//                     blur: 0,
//                     opacity: 0
//                 }
//             },
//             textAnchor: 'middle' as 'middle',
//             distributed: false
//         },
//         stroke: {
//             show: true,
//             width: 2,
//             colors: ['transparent']
//         },
//         grid: {
//             show: false
//         },
//         series: [],
//         noData: {
//             text: 'No data available'
//         },
//         xaxis: {
//             categories: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
//             labels: {
//                 rotate: -45,
//                 style: {
//                     fontSize: '12px'
//                 },
//             },
//         },
//         yaxis: {
//             title: {
//                 text: 'Amount (₹)'
//             }
//         },
//         fill: {
//             opacity: 1
//         },
//         tooltip: {
//             y: {
//                 formatter: function (val: number) {
//                     return "₹ " + val.toLocaleString()
//                 }
//             }
//         },
//         colors: ['#FBD678', '#A1F56D'],
//         legend: {
//             position: 'bottom' as 'bottom',
//             horizontalAlign: 'left' as 'left'
//         }
//     });
//      useEffect(() => {
//         if (!ComparisonData || ComparisonData.length === 0) return;
    
//         // months from ComparisonData
//         const dynamicMonths = ComparisonData.map((item: any) => item.month);
    
//         // parse amounts (handles "₹15,168" or objects with netAmount/grossAmount)
//         const amounts = ComparisonData.map((value: any) => {
//             // const raw = typeof value === 'string' ? value : (value?.annualCTC/12 ??'');
//             const raw = typeof value === "string"
//                 ? value
//                 : value?.annualCTC
//                 ? value.annualCTC / 12
//                 : "";
//             const cleaned = String(raw).replace(/₹|,/g, "").trim();
//             const num = Number(cleaned);
//             return isNaN(num) ? 0 : num;
//         });
    
//         console.log("Parsed Amounts for Increments Chart: ===================>", amounts);
//         console.log("Dynamic months for categories: ===================>", dynamicMonths);
    
//         // update x-axis categories dynamically (requires setIncrementsChartOptions)
//         if (typeof setIncrementsChartOptions === 'function') {
//             setIncrementsChartOptions((prev: any) => ({
//                 ...prev,
//                 xaxis: {
//                     ...prev.xaxis,
//                     categories: dynamicMonths
//                 }
//             }));
//         }
    
//         // build increments data (same order as dynamicMonths)
//         // if ComparisonData is already in the same order as dynamicMonths, amounts is fine;
//         // otherwise you'd map months -> find entry like in other solution.
//         const incrementsData: number[] = [...amounts];
    
//         // Calculate growth percentage (compare first -> last), guard divide-by-zero
//         if (incrementsData.length >= 2) {
//             const firstAmount = incrementsData[0];
//             const lastAmount = incrementsData[incrementsData.length - 1];
//             if (firstAmount !== 0) {
//                 const growth = ((lastAmount - firstAmount) / firstAmount) * 100;
//                 const growthFormatted = growth.toFixed(0);
//                 setGrowthPercentage(growth > 0 ? `+${growthFormatted}%` : `${growthFormatted}%`);
//             } else {
//                 setGrowthPercentage("0%");
//             }
//         } else {
//             setGrowthPercentage("0%");
//         }
    
//         // set chart series
//         setIncrementsChartData([
//             {
//                 // name: 'Salary',
//                 data: incrementsData,

//             },
//         ]);
//     }, [ComparisonData]);

//     // console.log("Bar Chart Options: ======================>", incrementsChartData);

//     return (
//         <div className="card p-5 mb-5">
//             <h4 className="mb-4">Monthly Salary Comparison</h4>
//             <div className="bar-chart-container">
//                 <style dangerouslySetInnerHTML={{
//                     __html: `
//                         .bar-chart-container .apexcharts-datalabels text {
//                             writing-mode: vertical-rl;
//                             text-orientation: mixed;
//                         }
//                     `
//                 }} />
//                 <ApexCharts
//                     options={barChartOptions}
//                     series={barChartData}
//                     type="bar"
//                     height={350}
//                 />
//             </div>
//         </div>
//     );
// };

// export default MonthlySalaryComparison;
import { useEffect, useState } from 'react';
import ApexCharts from 'react-apexcharts';

interface MonthlySalaryComparisonProps {
    ComparisonData: any[];
    loading?: boolean;
}
const MonthlySalaryComparison = ({ ComparisonData, loading = false }: MonthlySalaryComparisonProps) => {
    console.log("Received ComparisonData: ===================>", ComparisonData);

    const [incrementsChartData, setIncrementsChartData] = useState<any[]>([]);
    const [growthPercentage, setGrowthPercentage] = useState<string>('0%');

    // make options updatable by keeping setter
    const [barChartOptions, setBarChartOptions] = useState<any>({
        chart: {
            id: 'salary-bar-chart',
            type: 'bar' as 'bar',
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
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '55%',
                endingShape: 'rounded',
                borderRadius: 4,
                dataLabels: {
                    position: 'center'
                }
            },
        },
        dataLabels: {
            enabled: true,
            formatter: function (val: number) {
                return '₹' + val.toLocaleString()
            },
            offsetY: 0,
            offsetX: 0,
            style: {
                fontSize: '11px',
                colors: ['#fff'],
                fontWeight: 600
            },
            background: { enabled: false },
            textAnchor: 'middle' as 'middle',
            distributed: false
        },
        stroke: { show: true, width: 2, colors: ['transparent'] },
        grid: { show: false },
        series: [],
        noData: { text: 'No data available' },
        xaxis: {
            categories: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
            labels: { rotate: -90, style: { fontSize: '12px' } },
        },
        yaxis: { title: { text: 'Amount (₹)' } },
        fill: { opacity: 1 },
        tooltip: { y: { formatter: (val: number) => "₹ " + val.toLocaleString() } },
        colors: ['#FBD678', '#A1F56D'],
        legend: { position: 'bottom' as 'bottom', horizontalAlign: 'left' as 'left' }
    });

    // series state — will be set from ComparisonData
    const [barChartData, setBarChartData] = useState<any[]>([]);

    useEffect(() => {
        if (!ComparisonData || ComparisonData.length === 0) {
            // clear chart if no data
            setBarChartData([]);
            setIncrementsChartData([]);
            setGrowthPercentage('0%');
            return;
        }

        // derive dynamic months (categories) from ComparisonData (preserve order)
        const dynamicMonths = ComparisonData.map((item: any) => item.month ?? '');

        // helper to parse amount strings like "₹15,168" or numbers
        const parseAmount = (raw: any) => {
            if (raw === null || raw === undefined) return 0;
            if (typeof raw === 'number') return raw;
            const cleaned = String(raw).replace(/₹|,/g, "").trim();
            const n = Number(cleaned);
            return Number.isFinite(n) ? n : 0;
        };

        // prepare two series arrays (basicSalary and netSalary)
        const basicSeries = ComparisonData.map((item: any) => {
            // prefer basicSalary then netAmount then annualCTC/12
            if (item?.basicSalary) return parseAmount(item.basicSalary);
            if (item?.netAmount) return parseAmount(item.netAmount);
            if (item?.annualCTC) return parseAmount(item.annualCTC / 12);
            return 0;
        });

        const netSeries = ComparisonData.map((item: any) => {
            // prefer netAmount then basicSalary then annualCTC/12
            if (item?.netAmount) return parseAmount(item.netAmount);
            if (item?.basicSalary) return parseAmount(item.basicSalary);
            if (item?.annualCTC) return parseAmount(item.annualCTC / 12);
            return 0;
        });

        // set chart categories dynamically
        setBarChartOptions((prev: any) => ({
            ...prev,
            xaxis: {
                ...prev.xaxis,
                categories: dynamicMonths
            }
        }));

        // set series (order must match options.categories)
        const series = [
            { name: 'Basic Salary', data: basicSeries },
            { name: 'Net Salary', data: netSeries }
        ];
        setBarChartData(series);

        // optional: compute growth based on basicSeries (or pick preferred)
        if (basicSeries.length >= 2) {
            const first = basicSeries[0];
            const last = basicSeries[basicSeries.length - 1];
            if (first !== 0) {
                const growth = ((last - first) / first) * 100;
                setGrowthPercentage(growth > 0 ? `+${growth.toFixed(0)}%` : `${growth.toFixed(0)}%`);
            } else {
                setGrowthPercentage('0%');
            }
        } else {
            setGrowthPercentage('0%');
        }

        // keep incrementsChartData (you used earlier) — here simply use basicSeries
        setIncrementsChartData([{ name: 'Basic Salary', data: basicSeries }]);
    }, [ComparisonData]);

    console.log("Bar Chart Options: ======================>", barChartOptions);
    console.log("Bar Chart Series: ======================>", barChartData);

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
            <div className="card p-5 mb-5">
                <SkeletonLoader width="250px" height="24px" />
                <div style={{ marginTop: '24px', minHeight: '350px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <SkeletonLoader width="100%" height="300px" />
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <SkeletonLoader width="100px" height="12px" />
                            <SkeletonLoader width="100px" height="12px" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card p-5 mb-5">
            <h4 className="mb-4">Monthly Salary Comparison</h4>
            <div className="bar-chart-container">
                <style dangerouslySetInnerHTML={{
                    __html: `
                        .bar-chart-container .apexcharts-datalabels text {
                            writing-mode: vertical-rl;
                            text-orientation: mixed;
                        }
                    `
                }} />
                <ApexCharts
                    options={barChartOptions}
                    series={barChartData}
                    type="bar"
                    height={350}
                />
            </div>
        </div>
    );
};

export default MonthlySalaryComparison;

