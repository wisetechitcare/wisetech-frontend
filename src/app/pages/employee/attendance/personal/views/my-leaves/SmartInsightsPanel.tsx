// import React from 'react';
// import { LeaveInsight } from './utils/insightGenerator';

// interface SmartInsightsPanelProps {
//   insights: LeaveInsight[];
// }

// const SmartInsightsPanel: React.FC<SmartInsightsPanelProps> = ({ insights }) => {
//   if (!insights || insights.length === 0) return null;

//   return (
//     <div className="card shadow-sm mb-5 border-0">
//       <div className="card-header border-0 bg-light py-4">
//         <h3 className="card-title align-items-start flex-column">
//           <span className="card-label fw-bold fs-3 mb-1 text-primary">🧠 Smart Leave Insights</span>
//           <span className="text-muted fw-semibold fs-7">Personalized analysis to help you optimize your time off</span>
//         </h3>
//       </div>
//       <div className="card-body py-4">
//         <div className="row g-4">
//           {insights.map((insight, idx) => (
//             <div key={idx} className="col-12 col-md-6 col-lg-4">
//               <div 
//                 className={`p-4 rounded-3 h-100 d-flex flex-column border ${
//                   insight.type === 'opportunity' ? 'bg-light-primary border-primary border-opacity-25' :
//                   insight.type === 'tip' ? 'bg-light-warning border-warning border-opacity-25' :
//                   'bg-light-success border-success border-opacity-25'
//                 }`}
//               >
//                 <div className="d-flex justify-content-between align-items-center mb-3">
//                   <h4 className={`fs-5 fw-bold mb-0 ${
//                     insight.type === 'opportunity' ? 'text-primary' :
//                     insight.type === 'tip' ? 'text-warning' :
//                     'text-success'
//                   }`}>
//                     {insight.title}
//                   </h4>
//                   {insight.score && (
//                     <span className={`badge px-3 py-2 rounded-pill fw-bold ${
//                       insight.type === 'opportunity' ? 'badge-light-primary text-primary' :
//                       'badge-light-success text-success'
//                     }`}>
//                       {insight.score} Impact
//                     </span>
//                   )}
//                 </div>
//                 <div className="text-gray-700 fw-medium fs-6">
//                   {insight.message}
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default SmartInsightsPanel;
