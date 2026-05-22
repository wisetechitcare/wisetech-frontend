// import React, { useMemo } from 'react';
// import ReactApexChart from 'react-apexcharts';
// import dayjs from 'dayjs';
// import { computeLeaveUsage } from './utils/calculations';

// interface LeaveUsageGraphProps {
//   leaves: any[];
//   holidays: Set<string>;
// }

// const LeaveUsageGraph: React.FC<LeaveUsageGraphProps> = ({ leaves, holidays }) => {
//   const chartData = useMemo(() => {
//     // 1. Initialize data for 12 months (e.g. Apr to Mar for fiscal year, or Jan to Dec)
//     // For simplicity, we'll group by month name for any leaves present
//     const monthlyData: Record<string, { leavesTaken: number; daysOff: number }> = {};
    
//     // Setup empty months based on current year to ensure consistent sorting
//     for (let i = 0; i < 12; i++) {
//       const monthStr = dayjs().month(i).format('MMM');
//       monthlyData[monthStr] = { leavesTaken: 0, daysOff: 0 };
//     }

//     // 2. Populate data
//     const validLeaves = leaves?.filter(l => l.status !== 2) || [];
//     validLeaves.forEach(leave => {
//       if (!leave.dateFrom || !leave.dateTo) return;
//       const start = new Date(leave.dateFrom);
//       const end = new Date(leave.dateTo);
//       const monthStr = dayjs(start).format('MMM');
      
//       const usage = computeLeaveUsage(start, end, holidays);
      
//       if (monthlyData[monthStr]) {
//         monthlyData[monthStr].leavesTaken += usage.leaveDays;
//         monthlyData[monthStr].daysOff += usage.daysOff;
//       }
//     });

//     const categories = Object.keys(monthlyData);
//     const leavesTakenData = categories.map(m => monthlyData[m].leavesTaken);
//     const daysOffData = categories.map(m => monthlyData[m].daysOff);

//     return { categories, leavesTakenData, daysOffData };
//   }, [leaves, holidays]);

//   const options: any = {
//     chart: {
//       type: 'bar',
//       height: 350,
//       toolbar: { show: false },
//       fontFamily: 'Inter, sans-serif'
//     },
//     plotOptions: {
//       bar: {
//         horizontal: false,
//         columnWidth: '55%',
//         borderRadius: 4
//       },
//     },
//     dataLabels: { enabled: false },
//     stroke: { show: true, width: 2, colors: ['transparent'] },
//     xaxis: {
//       categories: chartData.categories,
//       axisBorder: { show: false },
//       axisTicks: { show: false }
//     },
//     yaxis: {
//       title: { text: 'Days' }
//     },
//     fill: { opacity: 1 },
//     colors: ['#0d6efd', '#20c997'], // Blue for leaves, Green for days off
//     tooltip: {
//       y: { formatter: (val: number) => val + " days" }
//     },
//     legend: {
//       position: 'top',
//       horizontalAlign: 'right'
//     }
//   };

//   const series = [
//     { name: 'Leaves Consumed', data: chartData.leavesTakenData },
//     { name: 'Total Days Off Gained', data: chartData.daysOffData }
//   ];

//   return (
//     <div className="card shadow-sm mb-5 border-0">
//       <div className="card-header border-0 bg-white pt-5">
//         <h3 className="card-title align-items-start flex-column">
//           <span className="card-label fw-bold fs-3 mb-1 text-dark">Leave Usage Analysis</span>
//           <span className="text-muted fw-semibold fs-7">Compare leaves consumed vs. actual days off gained per month</span>
//         </h3>
//       </div>
//       <div className="card-body py-4">
//         <ReactApexChart options={options} series={series} type="bar" height={350} />
//       </div>
//     </div>
//   );
// };

// export default LeaveUsageGraph;
