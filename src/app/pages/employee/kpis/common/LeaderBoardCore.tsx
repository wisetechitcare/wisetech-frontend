
// import { Dayjs } from "dayjs";
// import React, { useEffect, useState, useMemo, useCallback } from "react";
// import { Col, Container, Modal, Row, Table, Accordion } from "react-bootstrap";
// import { useDispatch, useSelector } from "react-redux";
// import { miscellaneousIcons } from "../../../../../_metronic/assets/miscellaneousicons";
// import SVG from "react-inlinesvg";
// import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
// import { maleIcons } from "@metronic/assets/sidepanelicons";
// import { fetchLeaderboard } from "@utils/statistics";
// import { Spinner } from "react-bootstrap";
// import axios from "axios";
// import { EMPLOYEE } from "@constants/api-endpoint";
// const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

// // ==============================
// // CONSTANTS & STYLES
// // ==============================

// const STYLES = {
//   factorCard: {
//     padding: "20px 28px",
//     borderRadius: "12px",
//     boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
//     marginBottom: "20px",
//     position: 'relative' as const
//   },
//   factorTitle: {
//     color: "#000",
//     fontFamily: "Barlow",
//     fontSize: "16px",
//     fontWeight: 600,
//     letterSpacing: "0.16px"
//   },
//   viewAllBtn: {
//     fontSize: '11px',
//     fontWeight: 800,
//     borderRadius: '10px',
//     padding: '6px 16px',
//     backgroundColor: 'white',
//     boxShadow: '0px 2px 6px rgba(0,0,0,0.05)',
//     textTransform: 'uppercase' as const
//   },
//   sectionHeader: {
//     fontSize: "14px",
//     fontWeight: 800,
//     textTransform: 'uppercase' as const,
//     letterSpacing: '0.05em',
//     marginBottom: "8px",
//     display: 'flex',
//     alignItems: 'center',
//     gap: '10px'
//   },
//   divider: {
//     height: '1px',
//     opacity: 0.2,
//     marginBottom: '20px'
//   },
//   moduleItem: {
//     backgroundColor: "#ffffff",
//     borderRadius: "8px",
//     border: "1.5px solid #D4DBE4",
//     padding: "12px",
//     height: "100%"
//   }
// };

// const COLORS = {
//   positive: { bg: "#eaf3de", title: "#1B8459", score: "#1B8459", accent: "#1B8459" },
//   negative: { bg: "#fbecec", title: "#B51919", score: "#D9214E", accent: "#D9214E" },
//   leaves: { accent: "#70829A" },
//   gray: "#70829A",
//   black: "#000000"
// };

// interface OverviewData {
//   icon: string;
//   label: string;
//   score: number;
// }
// type StarEmployee = {
//   employeeId: string;
//   score: string;
//   value: string;
//   employee: {
//     firstName: string;
//     lastName: string;
//     avatar: string;
//     gender: number;
//   };
// };

// type KpiScore = {
//   factorId: string;
//   score: string | number;
//   factor: { name: string; type?: "POSITIVE" | "NEGATIVE" };
//   employee: {
//     avatar: string;
//     gender: number;
//     users: { firstName: string; lastName: string };
//   };
// };
// // ==============================
// // REUSABLE SUB-COMPONENTS
// // ==============================

// const RankBadge = React.memo(({ rank, size = 24, offset = -12 }: { rank: number; size?: number; offset?: number }) => (
//   <span className="position-absolute top-100 start-100 translate-middle badge rounded-pill" style={{ zIndex: 1 }}>
//     <SVG
//       src={miscellaneousIcons[`StarEmployeeRank${rank}` as keyof typeof miscellaneousIcons] || miscellaneousIcons.StarEmployeeRank1}
//       className="menu-svg-icon"
//       style={{ width: `${size}px`, height: `${size}px`, marginTop: `${offset}px`, marginLeft: `${offset}px` }}
//     />
//   </span>
// ));

// const ScoreDisplay = React.memo(({ 
//   value, 
//   maxValue, 
//   score, 
//   maxScore, 
//   isModule = false,
//   customScoreColor 
// }: { 
//   value?: any, 
//   maxValue?: any, 
//   score: any, 
//   maxScore?: any,
//   isModule?: boolean,
//   customScoreColor?: string
// }) => {
//   const scoreVal = Number(score);
//   const color = customScoreColor || (scoreVal >= 0 ? COLORS.positive.score : COLORS.negative.score);
  
//   return (
//     <div style={{ display: "flex", flexDirection: "column" }}>
//       {(value !== null && value !== undefined) && (
//         <span style={{ fontSize: "11px", color: COLORS.gray, fontWeight: 500 }}>
//           Value: {parseFloat(Number(value).toFixed(2))}
//           {maxValue !== null && maxValue !== undefined && Number(maxValue) !== 0 && (
//             <span> / {maxValue}</span>
//           )}
//         </span>
//       )}
//       <span style={{ 
//         fontSize: isModule ? "14px" : "13px", 
//         fontWeight: "bold", 
//         color: color 
//       }}>
//         {isModule ? "" : "Score: "}
//         {isNaN(scoreVal) ? "-NA-" : scoreVal.toFixed(2)}
//         {maxScore !== null && maxScore !== undefined && Number(maxScore) !== 0 && (
//           <span style={{ fontWeight: 400, opacity: 0.7, color: COLORS.gray }}> / {maxScore}</span>
//         )}
//       </span>
//     </div>
//   );
// });

// const EmployeeCard = React.memo(({ 
//   emp, 
//   rank, 
//   size = "md",
//   scoreData
// }: { 
//   emp: any, 
//   rank?: number, 
//   size?: "sm" | "md" | "lg",
//   scoreData: { value?: any, maxValue?: any, score: any, maxScore?: any, customScoreColor?: string, isModule?: boolean }
// }) => {
//   const imgSize = size === "sm" ? "40px" : size === "lg" ? "56px" : "56px";
//   const nameSize = size === "sm" ? "12px" : "15px";

//   return (
//     <div className="d-flex flex-row align-items-center gap-2">
//       <div className="position-relative" style={{ flexShrink: 0 }}>
//         <img
//           src={emp.avatar}
//           alt={emp.name}
//           className="rounded-circle shadow-sm"
//           style={{ width: imgSize, height: imgSize, border: `2px solid white`, objectFit: 'cover' }}
//         />
//         {rank && <RankBadge rank={rank} size={size === "sm" ? 24 : 28} offset={size === "sm" ? -12 : -14} />}
//       </div>
//       <div className="d-flex flex-column ms-2">
//         <span style={{ fontSize: nameSize, color: "black", fontWeight: 600 }}>{emp.name || `${emp.firstName} ${emp.lastName}`}</span>
//         <ScoreDisplay {...scoreData} />
//       </div>
//     </div>
//   );
// });

// const FactorLeaderboardCard = React.memo(({ 
//   factor, 
//   startDateStr, 
//   endDateStr, 
//   onViewAll 
// }: { 
//   factor: any, 
//   startDateStr: string, 
//   endDateStr: string,
//   onViewAll: (factor: any, rankings: any[]) => void
// }) => {
//   const [rankings, setRankings] = useState<any[]>([]);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     if (!startDateStr || !endDateStr || !factor.id) return;
//     const controller = new AbortController();
    
//     (async () => {
//       try {
//         setLoading(true);
//         const res = await axios.get(`${API_BASE_URL}/${EMPLOYEE.FETCH_ALL_STAR_EMPLOYEES_BY_FACTOR_ID}`, {
//           params: { startDate: startDateStr, endDate: endDateStr, factorId: factor.id },
//           signal: controller.signal
//         });
//         setRankings(res.data?.data?.scores || []);
//       } catch (err: any) {
//         if (!axios.isCancel(err)) console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     })();
//     return () => controller.abort();
//   }, [startDateStr, endDateStr, factor.id]);

//   if (loading) return (
//     <div style={{ minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//       <Spinner animation="border" size="sm" variant="primary" />
//     </div>
//   );
//   if (rankings.length === 0) return null;

//   const isNegative = factor.type === "NEGATIVE";
//   const theme = isNegative ? COLORS.negative : COLORS.positive;

//   return (
//     <div style={{ ...STYLES.factorCard, background: theme.bg }}>
//       <div className="d-flex justify-content-between align-items-center mb-4">
//         <div style={STYLES.factorTitle}>{factor.name}</div>
//         <button 
//           className={`btn btn-sm ${isNegative ? "btn-outline-danger" : "btn-outline-success"}`}
//           onClick={() => onViewAll(factor, rankings)}
//           style={STYLES.viewAllBtn}
//         >
//           View All
//         </button>
//       </div>
//       <div className="d-flex flex-wrap gap-10 align-items-start">
//         {rankings.slice(0, 5).map((item, i) => (
//           <EmployeeCard 
//             key={i} 
//             emp={item.employee} 
//             rank={i + 1} 
//             scoreData={{
//               value: item.value,
//               maxValue: item.maxValue,
//               score: item.score,
//               maxScore: item.maxScore
//             }}
//           />
//         ))}
//       </div>
//     </div>
//   );
// });

// function LeaderBoardCore({
//   startDate,
//   endDate,
//   fromAdmin = false,
//   resourseAndView,
//   overviewData,
//   finalMaxTotalScore: propMaxTotalScore, // 👈 IMPORTANT
// }: {
//   startDate?: Dayjs;
//   endDate?: Dayjs;
//   fromAdmin?: boolean;
//   resourseAndView?: resourseAndView[];
//   overviewData?: OverviewData[];
//   finalMaxTotalScore?: number;
// }) {
//   const toggleChange = useSelector(
//     (state: RootState) => state.attendanceStats.toggleChange
//   );
//   const selectedEmployeeId = useSelector(
//     (state: RootState) =>
//       state.employee.selectedEmployee?.id || state.employee.currentEmployee.id
//   );
//   const [showFactorModal, setShowFactorModal] = useState(false);
//   const [selectedFactor, setSelectedFactor] = useState<any>(null);
//   const [selectedFactorRankings, setSelectedFactorRankings] = useState<any[]>([]);
//   const [showAllOverAllEmployeeByScore, setShowAllOverAllEmployeeByScore] = useState(false);
//   const [allEmployeesByScore, setAllEmployeesByScore] = useState<any[]>([]);
//   const [moduleChampions, setModuleChampions] = useState<any[]>([]);
//   const finalMaxTotalScore = Number(propMaxTotalScore) || 0;
//   const [topFive, setTopFive] = useState<any[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [allKPIFactors, setAllKPIFactors] = useState<any[]>([]);

//   const startDateStr = startDate?.format("YYYY-MM-DD");
//   const endDateStr = endDate?.format("YYYY-MM-DD");


//   useEffect(() => {
//     const loadFactors = async () => {
//       try {
//         const res = await getAllKpiFactors();
//         setAllKPIFactors(res?.data?.factors || []);
//       } catch (e) {
//         console.error("Factor fetch error", e);
//       }
//     };

//     loadFactors();
//   }, []);

//   const allemployees = useSelector((state: RootState) => state.allEmployees?.list);
//   const dispatch = useDispatch<AppDispatch>();

//   useEffect(() => {
//     if (!startDateStr || !endDateStr) return;

//     const controller = new AbortController();

//     const loadCoreLeaderboardData = async () => {
//       try {
//         setLoading(true);

//         // 🔥 Optimized Parallel Fetching
//         const [lbData, moduleRes] = await Promise.all([
//           fetchLeaderboard(startDateStr, endDateStr, controller.signal),
//           axios.get(`${API_BASE_URL}/${EMPLOYEE.GET_ALL_STAR_EMPLOYEES_BY_EACH_FACTOR}`, {
//             params: { startDate: startDateStr, endDate: endDateStr },
//             signal: controller.signal
//           })
//         ]);

//         setTopFive(lbData?.topFive || []);
//         setAllEmployeesByScore(lbData?.fullList || []);
//         setModuleChampions(moduleRes.data?.result || []);

//       } catch (error: any) {
//         if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
//           console.error("🔥 Core Leaderboard loading error:", error);
//         }
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadCoreLeaderboardData();

//     return () => controller.abort();
//   }, [startDateStr, endDateStr, toggleChange]);

//   const headerStyle: React.CSSProperties = {
//     color: "#70829A",
//     fontWeight: 500,
//     fontFamily: "Inter, sans-serif",
//   };

//   const factorsStyle: React.CSSProperties = {
//     color: "#000000",
//     fontWeight: 500,
//   };

//   const getEmployeeAvatar = useCallback((avatar: string | undefined, gender: number | undefined) => {
//     const avatarUrl = getAvatar(avatar || "", gender as 0 | 1 | 2);
//     return (avatarUrl && avatarUrl.trim() !== '') ? avatarUrl : maleIcons.maleIcon?.default;
//   }, []);

//   const normalizeEmployee = useCallback((emp: any = {}) => {
//     const firstName = emp?.employee?.users?.firstName || emp?.employee?.firstName || "";
//     const lastName = emp?.employee?.users?.lastName || emp?.employee?.lastName || "";
//     const avatar = emp?.employee?.avatar || "";
//     const gender = emp?.employee?.gender || 0;

//     return {
//       name: `${firstName} ${lastName}`.trim() || "-NA-",
//       avatar: getEmployeeAvatar(avatar, gender),
//       score: Number(emp?.totalScore || emp?.score || 0),
//       maxScore: emp?.maxScore ?? emp?.maxTotal ?? null,
//       value: emp?.value ?? null,
//       maxValue: emp?.maxValue ?? null,
//       employeeId: emp?.employeeId || "",
//     };
//   }, [getEmployeeAvatar]);

//   const normalizedTopFive = useMemo(() => topFive.map(normalizeEmployee), [topFive, normalizeEmployee]);
//   const normalizedAllEmployeesByScore = useMemo(() => allEmployeesByScore.map(normalizeEmployee), [allEmployeesByScore, normalizeEmployee]);

//   const leaveFactorNames = useMemo(() => ["Total Paid Leaves Taken", "Total Unpaid Leaves Taken"], []);
  
//   const factorsGroups = useMemo(() => {
//     const allFactorsArray = Array.isArray(allKPIFactors) ? allKPIFactors : [];
//     return {
//       leave: allFactorsArray.filter((f: any) => leaveFactorNames.includes(f.name)),
//       positive: allFactorsArray.filter((f: any) => f.type === "POSITIVE" && !leaveFactorNames.includes(f.name)),
//       negative: allFactorsArray.filter((f: any) => f.type === "NEGATIVE" && !leaveFactorNames.includes(f.name))
//     };
//   }, [allKPIFactors, leaveFactorNames]);

//   const handleViewAllFactor = useCallback((f: any, r: any[]) => {
//     setSelectedFactor(f);
//     setSelectedFactorRankings(r);
//     setShowFactorModal(true);
//   }, []);

//   const formatScore = useCallback((score: any) => {
//     const val = Number(score);
//     return isNaN(val) ? "-NA-" : val.toFixed(2);
//   }, []);

//   return (
//     <>
//     {loading ? (
//       <Container
//         fluid
//         className="d-flex justify-content-center align-items-center"
//         style={{ minHeight: "300px" }}
//       >
//         <Spinner animation="border" variant="primary" />
//       </Container>
//     ) : (
//       <>
//       {/* 1. TOP 5 OVERALL SECTION */}
//       <Row className="mt-7">
//         <CommonCard>
//           <div className="d-flex flex-row align-items-center justify-content-between">
//             <h3 style={{ fontSize: "18px", fontWeight: "bold" }}>
//               Top 5 Overall
//               {finalMaxTotalScore > 0 && (
//                 <span style={{ fontWeight: "normal", fontSize: "14px", color: "#70829A", marginLeft: "8px" }}>
//                   (out of {finalMaxTotalScore})
//                 </span>
//               )}
//             </h3>
//             <button className="btn btn-primary" onClick={() => setShowAllOverAllEmployeeByScore(true)}>View All</button>
//           </div>
//           <div className="overflow-scroll no-scrollbar my-5">
//             <div className="d-flex flex-row align-items-center justify-content-between gap-10 py-5">
//                 {normalizedTopFive.slice(0, 5).map((emp, i) => (
//                   <EmployeeCard 
//                     key={i} 
//                     emp={emp} 
//                     rank={i + 1} 
//                     size="lg"
//                     scoreData={{
//                       value: emp.value,
//                       maxValue: emp.maxValue,
//                       score: emp.score,
//                       maxScore: emp.maxScore,
//                       customScoreColor: "black"
//                     }}
//                   />
//                 ))}
//             </div>
//           </div>
//         </CommonCard>
//       </Row>

//       {/* 2. TOP EMPLOYEES BY FACTORS (MODULE-WISE SUMMARY) */}
//       <Row className="mt-7">
//         <CommonCard>
//           <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "20px" }}>Top Performers By Modules</h3>
//           <Row className="gy-3 gx-2">
//             {overviewData?.map((item, index) => {
//               const moduleChampion = moduleChampions?.find(
//                 (m: any) => m?.moduleName?.toLowerCase()?.trim() === item.label?.toLowerCase()?.trim()
//               );
//               const emp = normalizeEmployee(moduleChampion?.topEmployee);

//               return (
//                 <Col key={index} xs={12} sm={6} md={4}>
//                   <div className="d-flex align-items-center justify-content-between" style={STYLES.moduleItem}>
//                     <div className="d-flex align-items-center gap-2" style={{ padding: "6px 8px" }}>
//                       <img src={item.icon} alt={item.label} style={{ width: "20px", height: "20px" }} />
//                       <span>{item.label}</span>
//                     </div>
//                     {moduleChampion?.topEmployee && (
//                       <EmployeeCard 
//                         emp={emp} 
//                         size="sm"
//                         scoreData={{
//                           value: emp.value,
//                           maxValue: emp.maxValue,
//                           score: emp.score,
//                           maxScore: emp.maxScore,
//                           isModule: true,
//                           customScoreColor: "black"
//                         }}
//                       />
//                     )}
//                   </div>
//                 </Col>
//               );
//             })}
//           </Row>
//         </CommonCard>
//       </Row>

//       {/* 3. STAR EMPLOYEES SECTION (FACTOR-WISE DETAILED) */}
//       <Row className="mt-7">
//         <CommonCard>
//           <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "24px" }}>Top Performers By KPI Factors</h3>
//           {(!Array.isArray(allKPIFactors) || allKPIFactors.length === 0) ? (
//             <div style={{ padding: "20px", color: "#70829A" }}>
//               No Factors Configured
//             </div>
//           ) : (
//             <>
//               {/* Positive Factors Group */}
//               {factorsGroups.positive.length > 0 && (
//                 <div style={{ marginBottom: '32px' }}>
//                   <div style={{ ...STYLES.sectionHeader, color: COLORS.positive.accent }}>
//                     <div style={{ width: '4px', height: '16px', backgroundColor: COLORS.positive.accent, borderRadius: '2px' }}></div>
//                     Positive KPI Factors
//                   </div>
//                   <div style={{ ...STYLES.divider, background: `linear-gradient(90deg, ${COLORS.positive.accent} 0%, rgba(27, 132, 89, 0) 100%)` }}></div>
//                   {factorsGroups.positive.map((factor: any, index: number) => (
//                     <FactorLeaderboardCard
//                       key={factor.id || `pos-${index}`}
//                       factor={factor}
//                       startDateStr={startDateStr || ""}
//                       endDateStr={endDateStr || ""}
//                       onViewAll={handleViewAllFactor}
//                     />
//                   ))}
//                 </div>
//               )}

//               {/* Negative Factors Group */}
//               {factorsGroups.negative.length > 0 && (
//                 <div style={{ marginBottom: '32px' }}>
//                   <div style={{ ...STYLES.sectionHeader, color: COLORS.negative.accent }}>
//                     <div style={{ width: '4px', height: '16px', backgroundColor: COLORS.negative.accent, borderRadius: '2px' }}></div>
//                     Negative KPI Factors
//                   </div>
//                   <div style={{ ...STYLES.divider, background: `linear-gradient(90deg, ${COLORS.negative.accent} 0%, rgba(217, 33, 78, 0) 100%)` }}></div>
//                   {factorsGroups.negative.map((factor: any, index: number) => (
//                     <FactorLeaderboardCard
//                       key={factor.id || `neg-${index}`}
//                       factor={factor}
//                       startDateStr={startDateStr || ""}
//                       endDateStr={endDateStr || ""}
//                       onViewAll={handleViewAllFactor}
//                     />
//                   ))}
//                 </div>
//               )}

//               {/* Leaves Group */}
//               {factorsGroups.leave.length > 0 && (
//                 <div style={{ marginBottom: '16px' }}>
//                   <div style={{ ...STYLES.sectionHeader, color: COLORS.leaves.accent }}>
//                     <div style={{ width: '4px', height: '16px', backgroundColor: COLORS.leaves.accent, borderRadius: '2px' }}></div>
//                     Leaves
//                   </div>
//                   <div style={{ ...STYLES.divider, background: `linear-gradient(90deg, ${COLORS.leaves.accent} 0%, rgba(112, 130, 154, 0) 100%)` }}></div>
//                   {factorsGroups.leave.map((factor: any, index: number) => (
//                     <FactorLeaderboardCard
//                       key={factor.id || `leave-${index}`}
//                       factor={factor}
//                       startDateStr={startDateStr || ""}
//                       endDateStr={endDateStr || ""}
//                       onViewAll={handleViewAllFactor}
//                     />
//                   ))}
//                 </div>
//               )}
//             </>
//           )}
//         </CommonCard>
//       </Row>
//       </>
//     )}

//       {/* MODALS */}
//       <Modal show={showAllOverAllEmployeeByScore} onHide={() => setShowAllOverAllEmployeeByScore(false)}>
//         <Modal.Body style={{ padding: "40px" }}>
//           <div className="d-flex justify-content-between align-items-center">
//             <div style={{ fontSize: "17px", fontWeight: "bold" }}>All Employees Ranking Overall</div>
//             <div className="d-flex flex-column">
//               <div style={{ color: "#70829A", fontSize: "12px" }}>Max Possible</div>
//               <div style={{ fontWeight: "bold" }}>
//                 {allEmployeesByScore[0]?.maxScore ?? allEmployeesByScore[0]?.maxTotal ?? (finalMaxTotalScore > 0 ? finalMaxTotalScore : "-NA-")}
//               </div>
//             </div>
//           </div>
//           <Table responsive style={{ marginTop: "20px", borderCollapse: "separate", borderSpacing: "0 10px" }}>
//             <thead>
//               <tr style={{ color: "#70829A", fontWeight: "16px" }}>
//                 <th>Rank</th>
//                 <th>Employee</th>
//                 <th>Score</th>
//               </tr>
//             </thead>
//             <tbody>
//               {normalizedAllEmployeesByScore?.map((emp, index) => {
//                 const bagColor = emp.score >= 0 ? "#EBFAE6" : "#FAE8E6";
//                 return (
//                   <tr key={index} style={{ backgroundColor: "transparent" }}>
//                     <td style={{ 
//                       backgroundColor: bagColor, 
//                       borderTopLeftRadius: "10px", 
//                       borderBottomLeftRadius: "10px",
//                       padding: "12px",
//                       textAlign: 'center'
//                     }}>
//                       {index + 1}.
//                     </td>
//                     <td style={{ backgroundColor: bagColor, padding: "12px" }}>
//                       <EmployeeCard 
//                         emp={emp} 
//                         rank={index <= 2 ? index + 1 : undefined}
//                         size="sm"
//                         scoreData={{
//                           value: emp.value,
//                           maxValue: emp.maxValue,
//                           score: emp.score,
//                           maxScore: emp.maxScore,
//                           customScoreColor: "transparent" // We'll handle score color in the next cell
//                         }}
//                       />
//                     </td>
//                     <td style={{ 
//                       backgroundColor: bagColor, 
//                       borderTopRightRadius: "10px", 
//                       borderBottomRightRadius: "10px",
//                       padding: "12px",
//                       textAlign: 'center',
//                       color: emp.score >= 0 ? COLORS.positive.score : COLORS.negative.score,
//                       fontWeight: 'bold'
//                     }}>
//                       {formatScore(emp.score)}
//                       {(emp.maxScore ?? (finalMaxTotalScore > 0 ? finalMaxTotalScore : null)) !== null && Number(emp.maxScore ?? finalMaxTotalScore) !== 0 && (
//                         <span style={{ color: COLORS.gray, fontWeight: "normal" }}> / {emp.maxScore ?? finalMaxTotalScore}</span>
//                       )}
//                     </td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//           </Table>
//         </Modal.Body>
//       </Modal>

//       {/* 4. FACTOR DETAILS MODAL */}
//       <Modal show={showFactorModal} onHide={() => setShowFactorModal(false)} size="lg" centered dialogClassName="kpi-modal-width">
//         <Modal.Header closeButton style={{ borderBottom: '2px solid #EFF2F5', padding: '24px 32px' }}>
//           <Modal.Title style={{ fontSize: '22px', fontWeight: 800, color: '#181C32' }}>
//             {selectedFactor?.name} Leaderboard
//           </Modal.Title>
//         </Modal.Header>
//         <Modal.Body style={{ maxHeight: '75vh', overflowY: 'auto', padding: '32px' }}>
//           <Table responsive style={{ borderCollapse: "separate", borderSpacing: "0 10px" }}>
//             <thead>
//               <tr style={{ color: "#B5B5C3", fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
//                 <th style={{ width: '80px' }}>Rank</th>
//                 <th>Employee Details</th>
//                 <th style={{ textAlign: 'right', width: '120px' }}>KPI Score</th>
//               </tr>
//             </thead>
//             <tbody>
//               {selectedFactorRankings.map((item, index) => {
//                 const emp = item.employee;
//                 const avatarUrl = getAvatar(emp.avatar || "", emp.gender as 0 | 1 | 2) || maleIcons.maleIcon?.default;
                
//                 const bagColor = Number(item.score) >= 0 ? "#EBFAE6" : "#FAE8E6";
//                 return (
//                   <tr key={index} style={{ verticalAlign: 'middle' }}>
//                     <td style={{ 
//                       backgroundColor: bagColor, 
//                       borderTopLeftRadius: "10px", 
//                       borderBottomLeftRadius: "10px",
//                       padding: "12px",
//                       textAlign: 'center'
//                     }}>
//                       {index + 1}.
//                     </td>
//                     <td style={{ backgroundColor: bagColor, padding: "12px" }}>
//                       <div className="d-flex align-items-center">
//                         <div className="symbol symbol-45px me-5 position-relative">
//                           <img src={avatarUrl} alt="Avatar" className="rounded-circle" style={{ width: '45px', height: '45px', objectFit: 'cover', border: '2px solid white' }} />
//                           {index <= 2 && <RankBadge rank={index + 1} size={24} offset={-12} />}
//                         </div>
//                         <div className="d-flex flex-column">
//                           <span style={{ fontWeight: 800, color: '#181C32', fontSize: '15px' }}>
//                             {emp.firstName} {emp.lastName}
//                           </span>
//                           <span style={{ color: '#70829A', fontWeight: 600, fontSize: '12px' }}>
//                             Value: {(item.value !== null && item.value !== undefined) ? parseFloat(Number(item.value).toFixed(2)) : 0}
//                             {item.maxValue !== null && item.maxValue !== undefined && Number(item.maxValue) !== 0 && (
//                               <span> / {item.maxValue}</span>
//                             )}
//                           </span>
//                         </div>
//                       </div>
//                     </td>
//                     <td style={{ 
//                       backgroundColor: bagColor, 
//                       borderTopRightRadius: "10px", 
//                       borderBottomRightRadius: "10px",
//                       padding: "12px",
//                       textAlign: 'right'
//                     }}>
//                       <div className="d-flex flex-column align-items-end">
//                         <span className="fw-boldest fs-6" style={{ color: Number(item.score) >= 0 ? "#1B8459" : "#D9214E" }}>
//                           {Number(item.score).toFixed(2)}
//                           {item.maxScore !== null && item.maxScore !== undefined && Number(item.maxScore) !== 0 && (
//                             <span style={{ color: "#70829A", fontWeight: 400 }}> / {item.maxScore}</span>
//                           )}
//                         </span>
//                         <span style={{ fontSize: '11px', color: '#70829A', fontWeight: 500 }}>KPI Score</span>
//                       </div>
//                     </td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//           </Table>
//         </Modal.Body>
//       </Modal>

//     </>
//   );
// };

// export default LeaderBoardCore;
import CommonCard from "@app/modules/common/components/CommonCard";
import { resourseAndView } from "@models/company";
import { AppDispatch, RootState } from "@redux/store";
import {
  getAllKpiFactors,
} from "@services/employee";
import { getAvatar } from "@utils/avatar";
import { Dayjs } from "dayjs";
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Col, Container, Modal, Row, Table } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { miscellaneousIcons } from "../../../../../_metronic/assets/miscellaneousicons";
import SVG from "react-inlinesvg";
import { maleIcons } from "@metronic/assets/sidepanelicons";
import { fetchLeaderboard } from "@utils/statistics";
import { Spinner } from "react-bootstrap";
import axios from "axios";
import { EMPLOYEE } from "@constants/api-endpoint";
const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

// ==============================
// CONSTANTS & STYLES
// ==============================

const STYLES = {
  factorCard: {
    padding: "20px 28px",
    borderRadius: "12px",
    boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
    marginBottom: "20px",
    position: 'relative' as const
  },
  factorTitle: {
    color: "#000",
    fontFamily: "Barlow",
    fontSize: "16px",
    fontWeight: 600,
    letterSpacing: "0.16px"
  },
  viewAllBtn: {
    fontSize: '11px',
    fontWeight: 800,
    borderRadius: '10px',
    padding: '6px 16px',
    backgroundColor: 'white',
    boxShadow: '0px 2px 6px rgba(0,0,0,0.05)',
    textTransform: 'uppercase' as const
  },
  sectionHeader: {
    fontSize: "14px",
    fontWeight: 800,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: "8px",
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  divider: {
    height: '1px',
    opacity: 0.2,
    marginBottom: '20px'
  },
  moduleItem: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    border: "1.5px solid #D4DBE4",
    padding: "12px",
    height: "100%"
  }
};

const COLORS = {
  positive: { bg: "#eaf3de", title: "#1B8459", score: "#1B8459", accent: "#1B8459" },
  negative: { bg: "#fbecec", title: "#B51919", score: "#D9214E", accent: "#D9214E" },
  leaves: { accent: "#70829A" },
  gray: "#70829A",
  black: "#000000"
};

// ==============================
// METRIC LABEL UTILITY
// ==============================

/**
 * Returns a business-friendly label for the "value" field based on the KPI factor.
 * Priority: factor.unit → factor.name keywords → fallback "Value"
 */
function getMetricLabel(factor: any): string {
  const name: string = (factor?.name || "").toLowerCase();
  const unit: string = (factor?.unit || "").toLowerCase();

  if (name.includes("leave")) return "Leaves";
  if (name.includes("request")) return "Requests";
  if (unit === "hours" || name.includes("hour") || name.includes("overtime") || name.includes("over time")) return "Hours";
  if (unit === "days" || name.includes("day") || name.includes("attendance") || name.includes("checkin") || name.includes("checkout") || name.includes("check in") || name.includes("check out") || name.includes("extra")) return "Days";
  return "Value";
}

// ==============================
// SKELETON COMPONENTS
// ==============================

const shimmerStyle: React.CSSProperties = {
  background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.4s infinite",
  borderRadius: "6px",
};

// Inject keyframes once
if (typeof document !== "undefined" && !document.getElementById("shimmer-keyframes")) {
  const style = document.createElement("style");
  style.id = "shimmer-keyframes";
  style.innerHTML = `@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`;
  document.head.appendChild(style);
}

const SkeletonBox = ({ width = "100%", height = "16px", style = {} }: { width?: string; height?: string; style?: React.CSSProperties }) => (
  <div style={{ ...shimmerStyle, width, height, ...style }} />
);

const SkeletonEmployeeCard = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const imgSize = size === "sm" ? "40px" : "56px";
  return (
    <div className="d-flex flex-row align-items-center gap-2" style={{ minWidth: "140px" }}>
      <SkeletonBox width={imgSize} height={imgSize} style={{ borderRadius: "50%", flexShrink: 0 }} />
      <div className="d-flex flex-column gap-1 ms-2" style={{ flex: 1 }}>
        <SkeletonBox width="90px" height="14px" />
        <SkeletonBox width="60px" height="11px" />
      </div>
    </div>
  );
};

const SkeletonFactorCard = ({ isNegative = false }: { isNegative?: boolean }) => {
  const bg = isNegative ? COLORS.negative.bg : COLORS.positive.bg;
  return (
    <div style={{ ...STYLES.factorCard, background: bg }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <SkeletonBox width="140px" height="18px" />
        <SkeletonBox width="72px" height="30px" style={{ borderRadius: "10px" }} />
      </div>
      <div className="d-flex flex-wrap gap-10 align-items-start">
        {[1, 2, 3].map(i => <SkeletonEmployeeCard key={i} />)}
      </div>
    </div>
  );
};

const SkeletonTopFive = () => (
  <div className="d-flex flex-row align-items-center justify-content-between gap-10 py-5">
    {[1, 2, 3, 4, 5].map(i => <SkeletonEmployeeCard key={i} size="lg" />)}
  </div>
);

const SkeletonModuleRow = () => (
  <Row className="gy-3 gx-2">
    {[1, 2, 3, 4, 5, 6].map(i => (
      <Col key={i} xs={12} sm={6} md={4}>
        <div style={{ ...STYLES.moduleItem, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <SkeletonBox width="100px" height="20px" />
          <SkeletonEmployeeCard size="sm" />
        </div>
      </Col>
    ))}
  </Row>
);

// ==============================
// TYPES
// ==============================

interface OverviewData {
  icon: string;
  label: string;
  score: number;
}

type StarEmployee = {
  employeeId: string;
  score: string;
  value: string;
  employee: {
    firstName: string;
    lastName: string;
    avatar: string;
    gender: number;
  };
};

type KpiScore = {
  factorId: string;
  score: string | number;
  factor: { name: string; type?: "POSITIVE" | "NEGATIVE" };
  employee: {
    avatar: string;
    gender: number;
    users: { firstName: string; lastName: string };
  };
};

// ==============================
// REUSABLE SUB-COMPONENTS
// ==============================

const RankBadge = React.memo(({ rank, size = 24, offset = -12 }: { rank: number; size?: number; offset?: number }) => (
  <span className="position-absolute top-100 start-100 translate-middle badge rounded-pill" style={{ zIndex: 1 }}>
    <SVG
      src={miscellaneousIcons[`StarEmployeeRank${rank}` as keyof typeof miscellaneousIcons] || miscellaneousIcons.StarEmployeeRank1}
      className="menu-svg-icon"
      style={{ width: `${size}px`, height: `${size}px`, marginTop: `${offset}px`, marginLeft: `${offset}px` }}
    />
  </span>
));

const ScoreDisplay = React.memo(({
  value,
  maxValue,
  score,
  maxScore,
  isModule = false,
  customScoreColor,
  valueLabel = "Value"
}: {
  value?: any,
  maxValue?: any,
  score: any,
  maxScore?: any,
  isModule?: boolean,
  customScoreColor?: string,
  valueLabel?: string
}) => {
  const scoreVal = Number(score);
  const color = customScoreColor || (scoreVal >= 0 ? COLORS.positive.score : COLORS.negative.score);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {(value !== null && value !== undefined) && (
        <span style={{ fontSize: "11px", color: COLORS.gray, fontWeight: 500 }}>
          {valueLabel}: {parseFloat(Number(value).toFixed(2))}
          {maxValue !== null && maxValue !== undefined && Number(maxValue) !== 0 && (
            <span> / {maxValue}</span>
          )}
        </span>
      )}
      <span style={{
        fontSize: isModule ? "14px" : "13px",
        fontWeight: "bold",
        color: color
      }}>
        {isModule ? "" : "Score: "}
        {isNaN(scoreVal) ? "-NA-" : scoreVal.toFixed(2)}
        {maxScore !== null && maxScore !== undefined && Number(maxScore) !== 0 && (
          <span style={{ fontWeight: 400, opacity: 0.7, color: COLORS.gray }}> / {maxScore}</span>
        )}
      </span>
    </div>
  );
});

const EmployeeCard = React.memo(({
  emp,
  rank,
  size = "md",
  scoreData
}: {
  emp: any,
  rank?: number,
  size?: "sm" | "md" | "lg",
  scoreData: { value?: any, maxValue?: any, score: any, maxScore?: any, customScoreColor?: string, isModule?: boolean, valueLabel?: string }
}) => {
  const imgSize = size === "sm" ? "40px" : size === "lg" ? "56px" : "56px";
  const nameSize = size === "sm" ? "12px" : "15px";

  return (
    <div className="d-flex flex-row align-items-center gap-2">
      <div className="position-relative" style={{ flexShrink: 0 }}>
        <img
          src={emp.avatar}
          alt={emp.name}
          className="rounded-circle shadow-sm"
          style={{ width: imgSize, height: imgSize, border: `2px solid white`, objectFit: 'cover' }}
        />
        {rank && <RankBadge rank={rank} size={size === "sm" ? 24 : 28} offset={size === "sm" ? -12 : -14} />}
      </div>
      <div className="d-flex flex-column ms-2">
        <span style={{ fontSize: nameSize, color: "black", fontWeight: 600 }}>{emp.name || `${emp.firstName} ${emp.lastName}`}</span>
        <ScoreDisplay {...scoreData} />
      </div>
    </div>
  );
});

// ==============================
// FACTOR CARD — Now receives pre-fetched data, no internal fetching
// ==============================

const FactorLeaderboardCard = React.memo(({
  factor,
  rankings,
  onViewAll
}: {
  factor: any,
  rankings: any[],
  onViewAll: (factor: any, rankings: any[]) => void
}) => {
  if (!rankings || rankings.length === 0) return null;

  const isNegative = factor.type === "NEGATIVE";
  const theme = isNegative ? COLORS.negative : COLORS.positive;
  const valueLabel = getMetricLabel(factor);

  return (
    <div style={{ ...STYLES.factorCard, background: theme.bg }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div style={STYLES.factorTitle}>{factor.name}</div>
        <button
          className={`btn btn-sm ${isNegative ? "btn-outline-danger" : "btn-outline-success"}`}
          onClick={() => onViewAll(factor, rankings)}
          style={STYLES.viewAllBtn}
        >
          View All
        </button>
      </div>
      <div className="d-flex flex-wrap gap-10 align-items-start">
        {rankings.slice(0, 5).map((item, i) => (
          <EmployeeCard
            key={i}
            emp={item.employee}
            rank={i + 1}
            scoreData={{
              value: item.value,
              maxValue: item.maxValue,
              score: item.score,
              maxScore: item.maxScore,
              valueLabel
            }}
          />
        ))}
      </div>
    </div>
  );
});

// ==============================
// CACHE — persists across re-renders for same date range
// ==============================

const leaderboardCache = new Map<string, any>();

function getCacheKey(prefix: string, startDate: string, endDate: string) {
  return `${prefix}__${startDate}__${endDate}`;
}

// ==============================
// MAIN COMPONENT
// ==============================

function LeaderBoardCore({
  startDate,
  endDate,
  fromAdmin = false,
  resourseAndView,
  overviewData,
  finalMaxTotalScore: propMaxTotalScore,
}: {
  startDate?: Dayjs;
  endDate?: Dayjs;
  fromAdmin?: boolean;
  resourseAndView?: resourseAndView[];
  overviewData?: OverviewData[];
  finalMaxTotalScore?: number;
}) {
  const toggleChange = useSelector((state: RootState) => state.attendanceStats.toggleChange);
  const selectedEmployeeId = useSelector(
    (state: RootState) => state.employee.selectedEmployee?.id || state.employee.currentEmployee.id
  );

  const [showFactorModal, setShowFactorModal] = useState(false);
  const [selectedFactor, setSelectedFactor] = useState<any>(null);
  const [selectedFactorRankings, setSelectedFactorRankings] = useState<any[]>([]);
  const [showAllOverAllEmployeeByScore, setShowAllOverAllEmployeeByScore] = useState(false);

  const finalMaxTotalScore = Number(propMaxTotalScore) || 0;

  // ── Loading states (granular so each section renders as it arrives) ──
  const [topFiveLoading, setTopFiveLoading] = useState(true);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [factorsLoading, setFactorsLoading] = useState(true);

  // ── Data states ──
  const [topFive, setTopFive] = useState<any[]>([]);
  const [allEmployeesByScore, setAllEmployeesByScore] = useState<any[]>([]);
  const [moduleChampions, setModuleChampions] = useState<any[]>([]);
  const [allKPIFactors, setAllKPIFactors] = useState<any[]>([]);

  // factorRankingsMap: { [factorId]: rankings[] }
  const [factorRankingsMap, setFactorRankingsMap] = useState<Record<string, any[]>>({});

  const startDateStr = startDate?.format("YYYY-MM-DD") ?? "";
  const endDateStr = endDate?.format("YYYY-MM-DD") ?? "";

  const getEmployeeAvatar = useCallback((avatar: string | undefined, gender: number | undefined) => {
    const avatarUrl = getAvatar(avatar || "", gender as 0 | 1 | 2);
    return (avatarUrl && avatarUrl.trim() !== '') ? avatarUrl : maleIcons.maleIcon?.default;
  }, []);

  const normalizeEmployee = useCallback((emp: any = {}) => {
    const firstName = emp?.employee?.users?.firstName || emp?.employee?.firstName || "";
    const lastName = emp?.employee?.users?.lastName || emp?.employee?.lastName || "";
    const avatar = emp?.employee?.avatar || "";
    const gender = emp?.employee?.gender || 0;
    return {
      name: `${firstName} ${lastName}`.trim() || "-NA-",
      avatar: getEmployeeAvatar(avatar, gender),
      score: Number(emp?.totalScore || emp?.score || 0),
      maxScore: emp?.maxScore ?? emp?.maxTotal ?? null,
      value: emp?.value ?? null,
      maxValue: emp?.maxValue ?? null,
      employeeId: emp?.employeeId || "",
    };
  }, [getEmployeeAvatar]);

  // ── 1. Fetch static KPI factors (unlikely to change, cache indefinitely) ──
  useEffect(() => {
    const cachedFactors = leaderboardCache.get("kpi_factors");
    if (cachedFactors) {
      setAllKPIFactors(cachedFactors);
      return;
    }
    getAllKpiFactors()
      .then(res => {
        const factors = res?.data?.factors || [];
        leaderboardCache.set("kpi_factors", factors);
        setAllKPIFactors(factors);
      })
      .catch(e => console.error("Factor fetch error", e));
  }, []);

  // ── 2. Fetch leaderboard + modules in parallel, then factor rankings all at once ──
  useEffect(() => {
    if (!startDateStr || !endDateStr) return;
    const controller = new AbortController();

    const lbKey = getCacheKey("leaderboard", startDateStr, endDateStr);
    const modKey = getCacheKey("modules", startDateStr, endDateStr);
    const factKey = getCacheKey("factor_rankings", startDateStr, endDateStr);

    // ── Section A: Top 5 + All employees (leaderboard) ──
    const loadLeaderboard = async () => {
      if (leaderboardCache.has(lbKey)) {
        const cached = leaderboardCache.get(lbKey);
        setTopFive(cached.topFive);
        setAllEmployeesByScore(cached.fullList);
        setTopFiveLoading(false);
        return;
      }
      try {
        setTopFiveLoading(true);
        const lbData = await fetchLeaderboard(startDateStr, endDateStr, controller.signal);
        const result = { topFive: lbData?.topFive || [], fullList: lbData?.fullList || [] };
        leaderboardCache.set(lbKey, result);
        setTopFive(result.topFive);
        setAllEmployeesByScore(result.fullList);
      } catch (e: any) {
        if (e?.name !== 'CanceledError' && e?.name !== 'AbortError') console.error(e);
      } finally {
        setTopFiveLoading(false);
      }
    };

    // ── Section B: Module champions ──
    const loadModules = async () => {
      if (leaderboardCache.has(modKey)) {
        setModuleChampions(leaderboardCache.get(modKey));
        setModulesLoading(false);
        return;
      }
      try {
        setModulesLoading(true);
        const moduleRes = await axios.get(`${API_BASE_URL}/${EMPLOYEE.GET_ALL_STAR_EMPLOYEES_BY_EACH_FACTOR}`, {
          params: { startDate: startDateStr, endDate: endDateStr },
          signal: controller.signal
        });
        const result = moduleRes.data?.result || [];
        leaderboardCache.set(modKey, result);
        setModuleChampions(result);
      } catch (e: any) {
        if (!axios.isCancel(e)) console.error(e);
      } finally {
        setModulesLoading(false);
      }
    };

    // ── Section C: All factor rankings in ONE parallel batch ──
    const loadAllFactorRankings = async (factors: any[]) => {
      if (!factors.length) { setFactorsLoading(false); return; }

      if (leaderboardCache.has(factKey)) {
        setFactorRankingsMap(leaderboardCache.get(factKey));
        setFactorsLoading(false);
        return;
      }

      try {
        setFactorsLoading(true);
        // Fire ALL factor requests simultaneously
        const results = await Promise.allSettled(
          factors.map(factor =>
            axios.get(`${API_BASE_URL}/${EMPLOYEE.FETCH_ALL_STAR_EMPLOYEES_BY_FACTOR_ID}`, {
              params: { startDate: startDateStr, endDate: endDateStr, factorId: factor.id },
              signal: controller.signal
            }).then(res => ({ factorId: factor.id, scores: res.data?.data?.scores || [] }))
          )
        );

        const map: Record<string, any[]> = {};
        results.forEach(result => {
          if (result.status === "fulfilled") {
            map[result.value.factorId] = result.value.scores;
          }
        });

        leaderboardCache.set(factKey, map);
        setFactorRankingsMap(map);
      } catch (e: any) {
        if (!axios.isCancel(e)) console.error(e);
      } finally {
        setFactorsLoading(false);
      }
    };

    // ── Kick off A and B in parallel immediately, C needs factors ──
    loadLeaderboard();
    loadModules();

    // For C: use cached factors if available, otherwise wait for state
    const cachedFactors: any[] | undefined = leaderboardCache.get("kpi_factors");
    if (cachedFactors?.length) {
      loadAllFactorRankings(cachedFactors);
    }
    // If factors aren't cached yet, the second useEffect below handles it

    return () => controller.abort();
  }, [startDateStr, endDateStr, toggleChange]);

  // ── When factors arrive (from state), trigger factor rankings load if not already done ──
  useEffect(() => {
    if (!allKPIFactors.length || !startDateStr || !endDateStr) return;
    const factKey = getCacheKey("factor_rankings", startDateStr, endDateStr);
    if (leaderboardCache.has(factKey)) {
      setFactorRankingsMap(leaderboardCache.get(factKey));
      setFactorsLoading(false);
      return;
    }

    const controller = new AbortController();
    setFactorsLoading(true);

    Promise.allSettled(
      allKPIFactors.map(factor =>
        axios.get(`${API_BASE_URL}/${EMPLOYEE.FETCH_ALL_STAR_EMPLOYEES_BY_FACTOR_ID}`, {
          params: { startDate: startDateStr, endDate: endDateStr, factorId: factor.id },
          signal: controller.signal
        }).then(res => ({ factorId: factor.id, scores: res.data?.data?.scores || [] }))
      )
    ).then(results => {
      const map: Record<string, any[]> = {};
      results.forEach(result => {
        if (result.status === "fulfilled") {
          map[result.value.factorId] = result.value.scores;
        }
      });
      leaderboardCache.set(factKey, map);
      setFactorRankingsMap(map);
    }).catch(e => {
      if (!axios.isCancel(e)) console.error(e);
    }).finally(() => {
      setFactorsLoading(false);
    });

    return () => controller.abort();
  }, [allKPIFactors, startDateStr, endDateStr]);

  const leaveFactorNames = useMemo(() => ["Total Paid Leaves Taken", "Total Unpaid Leaves Taken"], []);

  const factorsGroups = useMemo(() => {
    const arr = Array.isArray(allKPIFactors) ? allKPIFactors : [];
    return {
      leave: arr.filter((f: any) => leaveFactorNames.includes(f.name)),
      positive: arr.filter((f: any) => f.type === "POSITIVE" && !leaveFactorNames.includes(f.name)),
      negative: arr.filter((f: any) => f.type === "NEGATIVE" && !leaveFactorNames.includes(f.name))
    };
  }, [allKPIFactors, leaveFactorNames]);

  const normalizedTopFive = useMemo(() => topFive.map(normalizeEmployee), [topFive, normalizeEmployee]);
  const normalizedAllEmployeesByScore = useMemo(() => allEmployeesByScore.map(normalizeEmployee), [allEmployeesByScore, normalizeEmployee]);

  const handleViewAllFactor = useCallback((f: any, r: any[]) => {
    setSelectedFactor(f);
    setSelectedFactorRankings(r);
    setShowFactorModal(true);
  }, []);

  const formatScore = useCallback((score: any) => {
    const val = Number(score);
    return isNaN(val) ? "-NA-" : val.toFixed(2);
  }, []);

  const renderFactorGroup = (factors: any[], groupLabel: string, accentColor: string) => (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ ...STYLES.sectionHeader, color: accentColor }}>
        <div style={{ width: '4px', height: '16px', backgroundColor: accentColor, borderRadius: '2px' }} />
        {groupLabel}
      </div>
      <div style={{ ...STYLES.divider, background: `linear-gradient(90deg, ${accentColor} 0%, transparent 100%)` }} />
      {factorsLoading
        ? factors.map((_, i) => <SkeletonFactorCard key={i} isNegative={accentColor === COLORS.negative.accent} />)
        : factors.map((factor: any, index: number) => (
          <FactorLeaderboardCard
            key={factor.id || index}
            factor={factor}
            rankings={factorRankingsMap[factor.id] || []}
            onViewAll={handleViewAllFactor}
          />
        ))
      }
    </div>
  );

  return (
    <>
      {/* 1. TOP 5 OVERALL SECTION */}
      <Row className="mt-7">
        <CommonCard>
          <div className="d-flex flex-row align-items-center justify-content-between">
            <h3 style={{ fontSize: "18px", fontWeight: "bold" }}>
              Top 5 Overall
              {finalMaxTotalScore > 0 && (
                <span style={{ fontWeight: "normal", fontSize: "14px", color: "#70829A", marginLeft: "8px" }}>
                  (out of {finalMaxTotalScore})
                </span>
              )}
            </h3>
            <button className="btn btn-primary" onClick={() => setShowAllOverAllEmployeeByScore(true)}>View All</button>
          </div>
          <div className="overflow-scroll no-scrollbar my-5">
            {topFiveLoading
              ? <SkeletonTopFive />
              : (
                <div className="d-flex flex-row align-items-center justify-content-between gap-10 py-5">
                  {normalizedTopFive.slice(0, 5).map((emp, i) => (
                    <EmployeeCard
                      key={i}
                      emp={emp}
                      rank={i + 1}
                      size="lg"
                      scoreData={{
                        value: emp.value,
                        maxValue: emp.maxValue,
                        score: emp.score,
                        maxScore: emp.maxScore,
                        customScoreColor: "black"
                      }}
                    />
                  ))}
                </div>
              )
            }
          </div>
        </CommonCard>
      </Row>

      {/* 2. TOP EMPLOYEES BY MODULES */}
      <Row className="mt-7">
        <CommonCard>
          <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "20px" }}>Top Performers By Modules</h3>
          {modulesLoading
            ? <SkeletonModuleRow />
            : (
              <Row className="gy-3 gx-2">
                {overviewData?.map((item, index) => {
                  const moduleChampion = moduleChampions?.find(
                    (m: any) => m?.moduleName?.toLowerCase()?.trim() === item.label?.toLowerCase()?.trim()
                  );
                  const emp = normalizeEmployee(moduleChampion?.topEmployee);

                  return (
                    <Col key={index} xs={12} sm={6} md={4}>
                      <div className="d-flex align-items-center justify-content-between" style={STYLES.moduleItem}>
                        <div className="d-flex align-items-center gap-2" style={{ padding: "6px 8px" }}>
                          <img src={item.icon} alt={item.label} style={{ width: "20px", height: "20px" }} />
                          <span>{item.label}</span>
                        </div>
                        {moduleChampion?.topEmployee && (
                          <EmployeeCard
                            emp={emp}
                            size="sm"
                            scoreData={{
                              value: emp.value,
                              maxValue: emp.maxValue,
                              score: emp.score,
                              maxScore: emp.maxScore,
                              isModule: true,
                              customScoreColor: "black"
                            }}
                          />
                        )}
                      </div>
                    </Col>
                  );
                })}
              </Row>
            )
          }
        </CommonCard>
      </Row>

      {/* 3. STAR EMPLOYEES — FACTOR-WISE */}
      <Row className="mt-7">
        <CommonCard>
          <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "24px" }}>Star Employees</h3>
          {(!Array.isArray(allKPIFactors) || allKPIFactors.length === 0) && !factorsLoading ? (
            <div style={{ padding: "20px", color: "#70829A" }}>No Factors Configured</div>
          ) : (
            <>
              {factorsGroups.positive.length > 0 && renderFactorGroup(
                factorsGroups.positive, "Positive KPI Factors", COLORS.positive.accent
              )}
              {factorsGroups.negative.length > 0 && renderFactorGroup(
                factorsGroups.negative, "Negative KPI Factors", COLORS.negative.accent
              )}
              {factorsGroups.leave.length > 0 && renderFactorGroup(
                factorsGroups.leave, "Leaves", COLORS.leaves.accent
              )}
            </>
          )}
        </CommonCard>
      </Row>

      {/* MODAL: All Employees Overall */}
      <Modal show={showAllOverAllEmployeeByScore} onHide={() => setShowAllOverAllEmployeeByScore(false)}>
        <Modal.Body style={{ padding: "40px" }}>
          <div className="d-flex justify-content-between align-items-center">
            <div style={{ fontSize: "17px", fontWeight: "bold" }}>All Employees Ranking Overall</div>
            <div className="d-flex flex-column">
              <div style={{ color: "#70829A", fontSize: "12px" }}>Max Possible</div>
              <div style={{ fontWeight: "bold" }}>
                {allEmployeesByScore[0]?.maxScore ?? allEmployeesByScore[0]?.maxTotal ?? (finalMaxTotalScore > 0 ? finalMaxTotalScore : "-NA-")}
              </div>
            </div>
          </div>
          <Table responsive style={{ marginTop: "20px", borderCollapse: "separate", borderSpacing: "0 10px" }}>
            <thead>
              <tr style={{ color: "#70829A", fontWeight: 700, textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em' }}>
                <th style={{ fontWeight: 900 }}>Rank</th>
                <th style={{ fontWeight: 900 }}>Employee</th>
                <th style={{ fontWeight: 900 }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {normalizedAllEmployeesByScore?.map((emp, index) => {
                const bagColor = emp.score >= 0 ? "#EBFAE6" : "#FAE8E6";
                return (
                  <tr key={index} style={{ backgroundColor: "transparent" }}>
                    <td style={{ backgroundColor: bagColor, borderTopLeftRadius: "10px", borderBottomLeftRadius: "10px", padding: "12px", textAlign: 'center' }}>
                      {index + 1}.
                    </td>
                    <td style={{ backgroundColor: bagColor, padding: "12px" }}>
                      <EmployeeCard
                        emp={emp}
                        rank={index <= 2 ? index + 1 : undefined}
                        size="sm"
                        scoreData={{
                          value: emp.value,
                          maxValue: emp.maxValue,
                          score: emp.score,
                          maxScore: emp.maxScore,
                          customScoreColor: "transparent"
                        }}
                      />
                    </td>
                    <td style={{
                      backgroundColor: bagColor,
                      borderTopRightRadius: "10px",
                      borderBottomRightRadius: "10px",
                      padding: "12px",
                      textAlign: 'center',
                      color: emp.score >= 0 ? COLORS.positive.score : COLORS.negative.score,
                      fontWeight: 'bold'
                    }}>
                      {formatScore(emp.score)}
                      {(emp.maxScore ?? (finalMaxTotalScore > 0 ? finalMaxTotalScore : null)) !== null && Number(emp.maxScore ?? finalMaxTotalScore) !== 0 && (
                        <span style={{ color: COLORS.gray, fontWeight: "normal" }}> / {emp.maxScore ?? finalMaxTotalScore}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      {/* MODAL: Factor Details */}
      <Modal show={showFactorModal} onHide={() => setShowFactorModal(false)} size="lg" centered dialogClassName="kpi-modal-width">
        <Modal.Header closeButton style={{ borderBottom: '2px solid #EFF2F5', padding: '24px 32px' }}>
          <Modal.Title style={{ fontSize: '22px', fontWeight: 800, color: '#181C32' }}>
            {selectedFactor?.name} Leaderboard
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '75vh', overflowY: 'auto', padding: '32px' }}>
          <Table responsive style={{ borderCollapse: "separate", borderSpacing: "0 10px" }}>
            <thead>
              <tr style={{ color: "#70829A", fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                <th style={{ width: '80px', fontWeight: 900, fontSize: '12px' }}>Rank</th>
                <th style={{ fontWeight: 900, fontSize: '12px' }}>Employee Details</th>
                <th style={{ textAlign: 'right', width: '120px', fontWeight: 900, fontSize: '12px' }}>KPI Score</th>
              </tr>
            </thead>
            <tbody>
              {selectedFactorRankings.map((item, index) => {
                const emp = item.employee;
                const avatarUrl = getAvatar(emp.avatar || "", emp.gender as 0 | 1 | 2) || maleIcons.maleIcon?.default;
                const bagColor = Number(item.score) >= 0 ? "#EBFAE6" : "#FAE8E6";
                const modalValueLabel = getMetricLabel(selectedFactor);
                return (
                  <tr key={index} style={{ verticalAlign: 'middle' }}>
                    <td style={{ backgroundColor: bagColor, borderTopLeftRadius: "10px", borderBottomLeftRadius: "10px", padding: "12px", textAlign: 'center' }}>
                      {index + 1}.
                    </td>
                    <td style={{ backgroundColor: bagColor, padding: "12px" }}>
                      <div className="d-flex align-items-center">
                        <div className="symbol symbol-45px me-5 position-relative">
                          <img src={avatarUrl} alt="Avatar" className="rounded-circle" style={{ width: '45px', height: '45px', objectFit: 'cover', border: '2px solid white' }} />
                          {index <= 2 && <RankBadge rank={index + 1} size={24} offset={-12} />}
                        </div>
                        <div className="d-flex flex-column">
                          <span style={{ fontWeight: 800, color: '#181C32', fontSize: '15px' }}>
                            {emp.firstName} {emp.lastName}
                          </span>
                          <span style={{ color: '#70829A', fontWeight: 600, fontSize: '12px' }}>
                            {modalValueLabel}: {(item.value !== null && item.value !== undefined) ? parseFloat(Number(item.value).toFixed(2)) : 0}
                            {item.maxValue !== null && item.maxValue !== undefined && Number(item.maxValue) !== 0 && (
                              <span> / {item.maxValue}</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ backgroundColor: bagColor, borderTopRightRadius: "10px", borderBottomRightRadius: "10px", padding: "12px", textAlign: 'right' }}>
                      <div className="d-flex flex-column align-items-end">
                        <span className="fw-boldest fs-6" style={{ color: Number(item.score) >= 0 ? "#1B8459" : "#D9214E" }}>
                          {Number(item.score).toFixed(2)}
                          {item.maxScore !== null && item.maxScore !== undefined && Number(item.maxScore) !== 0 && (
                            <span style={{ color: "#70829A", fontWeight: 400 }}> / {item.maxScore}</span>
                          )}
                        </span>
                        <span style={{ fontSize: '11px', color: '#70829A', fontWeight: 500 }}>KPI Score</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default LeaderBoardCore;