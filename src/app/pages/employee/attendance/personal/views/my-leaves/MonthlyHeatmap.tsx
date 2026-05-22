// import React, { useMemo } from 'react';
// import dayjs from 'dayjs';
// import { computeLeaveUsage } from './utils/calculations';

// interface MonthlyHeatmapProps {
//   leaves: any[];
//   holidays: Set<string>;
// }

// const MonthlyHeatmap: React.FC<MonthlyHeatmapProps> = ({ leaves, holidays }) => {
//   const heatmapData = useMemo(() => {
//     const data: Record<string, { totalLeaves: number; totalDaysOff: number }> = {};
    
//     // Initialize 12 months
//     for (let i = 0; i < 12; i++) {
//       const monthStr = dayjs().month(i).format('MMM');
//       data[monthStr] = { totalLeaves: 0, totalDaysOff: 0 };
//     }

//     const validLeaves = leaves?.filter(l => l.status !== 2) || [];
//     validLeaves.forEach(leave => {
//       if (!leave.dateFrom || !leave.dateTo) return;
//       const start = new Date(leave.dateFrom);
//       const end = new Date(leave.dateTo);
//       const monthStr = dayjs(start).format('MMM');
      
//       const usage = computeLeaveUsage(start, end, holidays);
      
//       if (data[monthStr]) {
//         data[monthStr].totalLeaves += usage.leaveDays;
//         data[monthStr].totalDaysOff += usage.daysOff;
//       }
//     });

//     return Object.keys(data).map(month => {
//       const { totalLeaves, totalDaysOff } = data[month];
//       const efficiency = totalLeaves === 0 ? 0 : totalDaysOff / totalLeaves;
      
//       let colorClass = 'bg-light';
//       let textClass = 'text-muted';
      
//       if (totalLeaves > 0) {
//         if (efficiency >= 2.0) {
//           colorClass = 'bg-success';
//           textClass = 'text-white';
//         } else if (efficiency >= 1.2) {
//           colorClass = 'bg-warning';
//           textClass = 'text-white';
//         } else {
//           colorClass = 'bg-danger';
//           textClass = 'text-white';
//         }
//       }

//       return {
//         month,
//         totalLeaves,
//         totalDaysOff,
//         efficiency,
//         colorClass,
//         textClass
//       };
//     });
//   }, [leaves, holidays]);

//   return (
//     <div className="card shadow-sm mb-5 border-0">
//       <div className="card-header border-0 bg-white pt-5 pb-2">
//         <h3 className="card-title align-items-start flex-column">
//           <span className="card-label fw-bold fs-3 mb-1 text-dark">Leave Efficiency Heatmap</span>
//           <span className="text-muted fw-semibold fs-7">How efficiently you scheduled time off throughout the year</span>
//         </h3>
//       </div>
//       <div className="card-body py-4">
//         <div className="d-flex flex-wrap gap-3">
//           {heatmapData.map((item, idx) => (
//             <div 
//               key={idx} 
//               className={`rounded p-3 d-flex flex-column align-items-center justify-content-center flex-grow-1 ${item.colorClass}`}
//               style={{ minWidth: '80px', height: '90px', transition: 'transform 0.2s', cursor: 'default' }}
//               title={item.totalLeaves > 0 ? `${item.totalLeaves} Leaves → ${item.totalDaysOff} Days Off` : 'No leaves taken'}
//               onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
//               onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
//             >
//               <span className={`fw-bold fs-5 mb-1 ${item.textClass}`}>{item.month}</span>
//               {item.totalLeaves > 0 ? (
//                 <span className={`fs-8 fw-semibold ${item.textClass}`} style={{ opacity: 0.9 }}>
//                   {item.efficiency.toFixed(1)}x
//                 </span>
//               ) : (
//                 <span className="text-muted fs-8">-</span>
//               )}
//             </div>
//           ))}
//         </div>
        
//         <div className="d-flex align-items-center justify-content-end mt-4 gap-4 fs-8 text-muted fw-semibold">
//           <div className="d-flex align-items-center gap-2">
//             <div className="rounded" style={{ width: 12, height: 12, backgroundColor: '#f5f8fa' }}></div> None
//           </div>
//           <div className="d-flex align-items-center gap-2">
//             <div className="rounded bg-danger" style={{ width: 12, height: 12 }}></div> Low (1.0x)
//           </div>
//           <div className="d-flex align-items-center gap-2">
//             <div className="rounded bg-warning" style={{ width: 12, height: 12 }}></div> Avg (1.5x)
//           </div>
//           <div className="d-flex align-items-center gap-2">
//             <div className="rounded bg-success" style={{ width: 12, height: 12 }}></div> High (2.0x+)
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default MonthlyHeatmap;
