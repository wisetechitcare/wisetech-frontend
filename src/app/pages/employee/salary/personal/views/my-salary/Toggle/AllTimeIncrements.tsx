// import { useState, useEffect } from 'react';
// import ApexCharts from 'react-apexcharts';

// interface AllTimeIncrementsProps {
//     salaryData: any[];
// }

// const AllTimeIncrements = ({ salaryData }: AllTimeIncrementsProps) => {
//     console.log("All Time Increments salaryData ===>", salaryData);
//     const [incrementsChartData, setIncrementsChartData] = useState<any[]>(salaryData);
//     const [incrementsChartOptions] = useState<any>({
//         chart: {
//             id: 'alltime-increments-chart',
//             type: 'area',
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
//         dataLabels: {
//             enabled: true,
//             formatter: function (val: number) {
//                 return '₹' + val.toLocaleString()
//             },
//             offsetY: -10,
//             style: {
//                 fontSize: '12px',
//                 colors: ['#fff'],
//                 fontWeight: 600
//             },
//             background: {
//                 enabled: true,
//                 foreColor: '#2E93FA',
//                 borderRadius: 2,
//                 padding: 4,
//                 opacity: 1,
//                 borderWidth: 1,
//                 borderColor: '#fff',
//                 dropShadow: {
//                     enabled: false,
//                     top: 0,
//                     left: 0,
//                     blur: 0,
//                     opacity: 0
//                 }
//             }
//         },
//         stroke: {
//             curve: 'smooth',
//             width: 2,
//             colors: ['#2E93FA']
//         },
//         fill: {
//             type: 'gradient',
//             gradient: {
//                 shadeIntensity: 1,
//                 opacityFrom: 0.4,
//                 opacityTo: 0.1,
//                 stops: [0, 90, 100]
//             },
//             colors: ['#EFF7FF']
//         },
//         grid: {
//             borderColor: '#DDE2E4',
//             strokeDashArray: 0,
//             position: 'back',
//             xaxis: {
//                 lines: {
//                     show: false
//                 }
//             },
//             yaxis: {
//                 lines: {
//                     show: true
//                 }
//             }
//         },
//         xaxis: {
//             categories: [],
//             labels: {
//                 style: {
//                     fontSize: '12px',
//                     fontFamily: 'Inter, sans-serif',
//                     colors: '#66717b'
//                 }
//             },
//             axisBorder: {
//                 show: false
//             },
//             axisTicks: {
//                 show: false
//             }
//         },
//         yaxis: {
//             labels: {
//                 style: {
//                     fontSize: '11px',
//                     fontFamily: 'Lato, sans-serif',
//                     colors: '#111618'
//                 },
//                 formatter: function (val: number) {
//                     return val.toFixed(0)
//                 }
//             }
//         },
//         colors: ['#2E93FA'],
//         markers: {
//             size: 0,
//             colors: ['#2E93FA'],
//             strokeColors: '#fff',
//             strokeWidth: 2,
//             hover: {
//                 size: 7
//             }
//         },
//         tooltip: {
//             y: {
//                 formatter: function (val: number) {
//                     return "₹ " + val.toLocaleString()
//                 }
//             }
//         }
//     });


//     return (
//         <div className="card p-4 mb-5" style={{
//             boxShadow: '8px 8px 16px 0px rgba(0, 0, 0, 0.04)',
//             borderRadius: '12px'
//         }}>
//             <h4 className="mb-4" style={{
//                 fontSize: '22px',
//                 fontWeight: 600,
//                 fontFamily: 'Lato, sans-serif',
//                 color: '#111618'
//             }}>
//                 Increments
//             </h4>
//             {incrementsChartData.length > 0 ? (
//                 <div className="card p-2">
//                     <ApexCharts
//                         options={incrementsChartOptions}
//                         series={salaryData}
//                         type="area"
//                         height={350}
//                     />
//                 </div>
//             ) : (
//                 <div className="card p-4 text-center" style={{ minHeight: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//                     <p className="text-muted">No salary data available</p>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default AllTimeIncrements;

import { useState, useEffect } from 'react';
import ApexCharts from 'react-apexcharts';

interface AllTimeIncrementsProps {
    salaryData: any[];
    SalaryDataCtc: any[];
    loading?: boolean;
}

const AllTimeIncrements = ({ salaryData, SalaryDataCtc, loading = false }: AllTimeIncrementsProps) => {
    console.log("All Time Increments salaryData ===>", salaryData);

    const months = SalaryDataCtc.map((d) => `${d.month} ${d.year}`);
    const values = SalaryDataCtc.map((d) => d.monthlyCTC);

    const seriesData = [
        {
            name: "Monthly CTC",
            data: values
        }
    ];

    const options: any = {
        chart: {
            id: 'alltime-increments-chart',
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
                    download: false,
                },
            }
        },
        xaxis: {
            categories: months,
            labels: {
                style: {
                    fontSize: '12px',
                    colors: '#66717b'
                }
            }
        },
        yaxis: {
            labels: {
                style: {
                    fontSize: '11px',
                    fontFamily: 'Lato, sans-serif',
                    colors: '#111618'
                },
                formatter: function (val: number) {
                    return Math.round(val);
                }
            }
        },

        dataLabels: {
            enabled: true,
            formatter: (val: number) => '₹' + Math.round(val).toLocaleString(),
            
        },
        tooltip: {
            y: {
                formatter: (val: number) => '₹ ' + Math.round(val).toLocaleString()
            }

        },
        stroke: {
            curve: 'smooth',
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
    };

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

    return (
        <div className="card p-4 mb-5" style={{
            boxShadow: '8px 8px 16px 0px rgba(0, 0, 0, 0.04)',
            borderRadius: '12px'
        }}>
            <h4 className="mb-4" style={{
                fontSize: '22px',
                fontWeight: 600,
                fontFamily: 'Lato, sans-serif',
                color: '#111618'
            }}>
                Increments
            </h4>

            {loading ? (
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
            ) : salaryData.length > 0 ? (
                <div className="card p-2">
                    <ApexCharts
                        options={options}
                        series={seriesData}

                        type="area"
                        height={350}
                    />
                </div>
            ) : (
                <div className="text-center p-4">No salary data available</div>
            )}
        </div>
    );
};

export default AllTimeIncrements;
