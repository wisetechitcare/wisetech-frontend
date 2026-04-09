import CommonCard from "@app/modules/common/components/CommonCard";
import { resourseAndView } from "@models/company";
import { AppDispatch, RootState } from "@redux/store";
import {
  fetchAllStarEmployeeByStartAndEndDate,
  fetchKpiLeaderboardOverall,
  fetchEmpAttendanceStatistics,
  getAllKPIModules,
} from "@services/employee";
import { getAvatar } from "@utils/avatar";
import { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { Col, Container, Modal, Row, Table, Accordion } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { miscellaneousIcons } from "../../../../../_metronic/assets/miscellaneousicons";
import SVG from "react-inlinesvg";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import { maleIcons } from "@metronic/assets/sidepanelicons";
import { getFactorUnit } from "./kpiUtils";
import { getWorkingDaysInRange, filterLeavesPublicHolidays } from "@utils/statistics";
import PerformanceBadge from "../personal/components/PerformanceBadge";
// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────


interface EmployeeRank {
  name: string;
  totalScore: number;
  avatar: string;
  employeeId: string;
  rank: number;
  totalTimeHours: number;
  totalOvertimeHours: number;
  totalRegularHours: number;
}

interface OverviewData {
  icon: string;
  label: string;
  totalScore: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
// ── Star Employee Factor Priority Order ────────────────────────────────────
const STAR_EMPLOYEE_FACTOR_ORDER = [
  "late attendance",
  "working hour",
  "total late hours",
  "working days",
  "late days",
  "extra days",
  "on time attendance",
  "total working hour",
  "absent",
];

const getFactorPriority = (factorName: string): number => {
  const name = factorName.toLowerCase().trim();
  const index = STAR_EMPLOYEE_FACTOR_ORDER.findIndex((item) => {
    if (item === "working hour" && name.includes("total working hour")) return false;
    return name.includes(item);
  });
  return index === -1 ? 999 : index;
};

// ── Real attendance stats per employee (from attendance API) ────────────────
const DEFAULT_EMPLOYEE: EmployeeRank = {
  name: "-NA-",
  totalScore: 0,
  avatar: "",
  employeeId: "",
  rank: 0,
  totalTimeHours: 0,
  totalOvertimeHours: 0,
  totalRegularHours: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

function LeaderBoardCore({
  startDate,
  endDate,
  fromAdmin = false,
  resourseAndView,
  overviewData,
  onRankResolved,
  // Add these new props
  externalRank,
  externalYourPoints,
  externalMaxTotal,
  externalRemark,
  externalRankLoading,
}: {
  startDate?: Dayjs;
  endDate?: Dayjs;
  fromAdmin?: boolean;
  resourseAndView?: resourseAndView[];
  overviewData?: OverviewData[];
  onRankResolved?: (rank: number | null, maxTotal: number, yourPoints: number) => void;
  // New props for external rank data
  externalRank?: number | null;
  externalYourPoints?: number;
  externalMaxTotal?: number;
  externalRemark?: string;
  externalRankLoading?: boolean;
}){
  // Add this component inside your LeaderBoardCore component
const AttendanceStatisticsDisplay = ({ employeeId }: { employeeId: string }) => {
  const stats = attendanceStatsMap.get(employeeId);
  
  if (!stats) return null;
  
  // Define the fields in your desired order
  const orderedFields = [
    { key: 'lateAttendanceDays', label: 'Late attendance' },
    { key: 'workingHour', label: 'Working hour' },
    { key: 'totalLateHours', label: 'Total late hours' },
    { key: 'workingDays', label: 'Working days' },
    { key: 'lateDays', label: 'Late days' },
    { key: 'extraDays', label: 'Extra days' },
    { key: 'onTimeDays', label: 'On time attendance' },
    { key: 'totalWorkingHours', label: 'Total working hour' },
    { key: 'absentDays', label: 'Absent days' }
  ];
  
  return (
    <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
      <h4>Attendance Statistics</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
        {orderedFields.map((field) => (
          <div key={field.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #e9ecef' }}>
            <span style={{ fontWeight: 500 }}>{field.label}:</span>
            <span>{stats[field.key] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
  const toggleChange = useSelector(
    (state: RootState) => state.attendanceStats.toggleChange
  );
  const selectedEmployeeId = useSelector(
    (state: RootState) =>
      state.employee.selectedEmployee?.id || state.employee.currentEmployee.id
  );

  // ── Overall leaderboard state ──────────────────────────────────────────────
  const [allEmployeesByScore, setAllEmployeesByScore] = useState<EmployeeRank[]>([]);
  const [attendanceStatsMap, setAttendanceStatsMap] = useState<Map<string, any>>(new Map());
  const [maxTotalScore, setMaxTotalScore] = useState<number>(0);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // ── Top 5 slots (derived from allEmployeesByScore) ─────────────────────────
  const top5 = allEmployeesByScore.slice(0, 5);
  while (top5.length < 5) {
    top5.push({ ...DEFAULT_EMPLOYEE, avatar: getAvatar("", 0) });
  }
  const [starEmployee1, starEmployee2, starEmployee3, starEmployee4, starEmployee5] = top5;

  // ── Factor / module leaderboard state ─────────────────────────────────────
  const [topEmployeeByFactor, setTopEmployeeByFactor] = useState<any[]>([]);
  const [topEmployeeByModule, setTopEmployeeByModule] = useState<any[]>([]);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"points" | "time">("points");
  const [showAllStarEmployeesByAFactor, setShowAllStarEmployeesByAFactor] = useState(false);
  const [starEmployeeDataByAFactor, setStarEmployeeDataByAFactor] = useState<any[]>([]);
  const [starEmployeeDataFactorName, setStarEmployeeDataFactorName] = useState("");
  const [showAllOverAllEmployeeByScore, setShowAllOverAllEmployeeByScore] = useState(false);

  const allemployees = useSelector((state: RootState) => state.allEmployees?.list);
  const dispatch = useDispatch<AppDispatch>();

  const holidays = useSelector((state: RootState) => state.attendanceStats.filteredPublicHolidays);
  const workingDaysConfig = useSelector(
    (state: RootState) => state.employee.currentEmployee?.branches?.workingAndOffDays
  );

  const allWeekends = workingDaysConfig ? JSON.parse(workingDaysConfig) : {};

  const safeStartDate = startDate ? startDate.clone().startOf("day") : undefined;
  const safeEndDate = endDate ? endDate.clone().startOf("day") : undefined;

  const filteredHolidaysData =
    safeStartDate && safeEndDate
      ? (filterLeavesPublicHolidays(
        safeStartDate.format("YYYY-MM-DD"),
        safeEndDate.format("YYYY-MM-DD"),
        true,
        false,
        true
      ) as any)
      : undefined;

  const resolvedHolidays = filteredHolidaysData?.publicHolidays || holidays;

  // ── Working Days Calculation ───────────────────────────────────────────────
  const workingDays =
    safeStartDate && safeEndDate
      ? getWorkingDaysInRange(safeStartDate, safeEndDate, true, allWeekends, resolvedHolidays)
      : 0;

  const findIsWeekendTrueAndCount = resolvedHolidays.filter(
    (holiday: any) => holiday.isWeekend === true
  ).length;

  const actualTotalWorkingDay = Math.max(0, workingDays - findIsWeekendTrueAndCount);

  console.log("=== KPI MODULE ===");
  console.log("WorkingDays (Raw):", workingDays);
  console.log("ActualWorkingDays (Adjusted):", actualTotalWorkingDay);
  console.log("StartDate:", safeStartDate?.format("YYYY-MM-DD"));
  console.log("EndDate:", safeEndDate?.format("YYYY-MM-DD"));
  console.log("Holidays Array:", resolvedHolidays);
  console.log("Weekend Override Count:", findIsWeekendTrueAndCount);
  console.log("WorkingConfig:", allWeekends);
  console.log("==================");

  // ── Max Value Helper ───────────────────────────────────────────────────────
// ── Max Value Helper — uses REAL attendance stats if available, falls back to workingDays ──
  const getMaxValueFromFactor = (factorName: string, employeeId?: string): number => {
    const name = factorName?.toLowerCase();
    const realStats = employeeId ? attendanceStatsMap.get(employeeId) : undefined;

    if (name?.includes("hour")) {
      // Use actual total working hours from attendance API
      if (realStats?.totalWorkingHours != null) return Number(realStats.totalWorkingHours);
      return workingDays * 9; // fallback
    }
    if (name?.includes("working day")) {
      if (realStats?.workingDays != null) return Number(realStats.workingDays);
      return workingDays;
    }
    if (name?.includes("on time") || name?.includes("ontime")) {
      if (realStats?.onTimeDays != null) return Number(realStats.onTimeDays);
      return workingDays;
    }
    if (name?.includes("late") || name?.includes("late attendance")) {
      if (realStats?.lateAttendanceDays != null) return Number(realStats.lateAttendanceDays);
      return workingDays;
    }
    if (name?.includes("absent")) {
      if (realStats?.absentDays != null) return Number(realStats.absentDays);
      return workingDays;
    }
    if (name?.includes("day") || name?.includes("attendance") || name?.includes("leave")) {
      return workingDays; // generic day-based fallback
    }
    if (name?.includes("request")) return 10;
    return 0;
  };

  useEffect(() => {
    dispatch(loadAllEmployeesIfNeeded());
  }, [dispatch]);

  // ── Main data fetch ────────────────────────────────────────────────────────

  async function fetchAllTheStarEmployeesByStartAndEndDate() {
    const formattedStart = startDate?.format("YYYY-MM-DD") || "";
    const formattedEnd = endDate?.format("YYYY-MM-DD") || "";

    if (!formattedStart || !formattedEnd) return;

    setLeaderboardLoading(true);
    setLeaderboardError(null);

    // ── 1. OVERALL LEADERBOARD ────────────────────────────────────────────────
    let leaderboardData: any[] = [];
    let overallFetchFailed = false;

    try {
      const overallResponse = await fetchKpiLeaderboardOverall(formattedStart, formattedEnd);

      if (Array.isArray(overallResponse)) {
        leaderboardData = overallResponse;
      } else if (overallResponse && Array.isArray((overallResponse as any).data)) {
        leaderboardData = (overallResponse as any).data;
      } else {
        console.error("Leaderboard API returned unexpected shape:", overallResponse);
        overallFetchFailed = true;
      }
    } catch (err) {
      console.error("Overall leaderboard fetch failed:", err);
      overallFetchFailed = true;
    }

    if (overallFetchFailed) {
      setLeaderboardError("Failed to load leaderboard rankings. Please try again.");
      setAllEmployeesByScore([]);
      setMaxTotalScore(0);
      setLeaderboardLoading(false);
      // ✅ Notify parent of failure so badge shows "-" not "Loading..."
      onRankResolved?.(null, 0, 0);
      await fetchFactorData(formattedStart, formattedEnd);
      return;
    }

    // ── 2. BUILD EMPLOYEE DISPLAY MAP ─────────────────────────────────────────
    const enrichedEmployees: EmployeeRank[] = leaderboardData.map((entry: any) => {
      const empDetails = (allemployees || []).find(
        (e: any) => e.employeeId === entry.employeeId || e.id === entry.employeeId
      );

      return {
        employeeId: entry.employeeId,
        rank: entry.rank,                              // ✅ Always from backend
        totalScore: Number(entry.totalScore ?? 0),
        totalTimeHours: Number(entry.totalTimeHours ?? 0),
        totalOvertimeHours: Number(entry.totalOvertimeHours ?? 0),
        totalRegularHours: Number(entry.totalRegularHours ?? 0),
        name: empDetails?.employeeName || "-NA-",
        avatar: empDetails
          ? getAvatar(empDetails.avatar, Number(empDetails.gender) as any)
          : getAvatar("", 0),
      };
    });

    enrichedEmployees.sort((a, b) => a.rank - b.rank);

    const topEntry = leaderboardData.find((e: any) => e.rank === 1);
    setMaxTotalScore(topEntry?.maxTotal ?? 0);
    setAllEmployeesByScore(enrichedEmployees);
    setLeaderboardLoading(false);

    // ── 3. FIRE RANK CALLBACK ─────────────────────────────────────────────────
    // Finds the logged-in employee in the enriched list and reports their
    // backend rank upward to the parent — never derived from array index.
    if (onRankResolved) {
      const currentEmpEntry = enrichedEmployees.find(
        (e) => e.employeeId === selectedEmployeeId
      );
      onRankResolved(
        currentEmpEntry?.rank ?? null,
        topEntry?.maxTotal ?? 0,
        currentEmpEntry?.totalScore ?? 0
      );
    }

    // ── 4. FACTOR DATA ────────────────────────────────────────────────────────
    await fetchFactorData(formattedStart, formattedEnd);
  }

  async function fetchFactorData(formattedStart: string, formattedEnd: string) {
    let factorResponse: any = {};
    let modulesResponse: any = {};

    try {
      factorResponse = await fetchAllStarEmployeeByStartAndEndDate(formattedStart, formattedEnd);
    } catch (err) {
      console.error("Factor leaderboard fetch failed:", err);
    }

    try {
      modulesResponse = await getAllKPIModules();
    } catch (err) {
      console.error("Modules fetch failed:", err);
    }

    const factorData =
      factorResponse?.data?.result || factorResponse?.result || [];

    const modules =
      modulesResponse?.data?.modules ||
      modulesResponse?.modules ||
      (Array.isArray(modulesResponse?.data) ? modulesResponse.data : []) ||
      [];

    const employeeTrackByModuleMap = new Map<string, any[]>();

    for (const module of modules) {
      const moduleId = module?.id;
      const moduleName = module?.name;
      const rows = factorData.filter((row: any) => row?.moduleId === moduleId);
      employeeTrackByModuleMap.set(moduleName, rows);
    }

    if (modules.length === 0 && factorData.length > 0) {
      for (const factorRow of factorData) {
        const moduleName = factorRow?.moduleName || factorRow?.module?.name || "Unknown";
        const existing = employeeTrackByModuleMap.get(moduleName) || [];
        existing.push(factorRow);
        employeeTrackByModuleMap.set(moduleName, existing);
      }
    }

    // ── Sort factors within each module ─────────────────────────────────────
    for (const [moduleName, factors] of employeeTrackByModuleMap.entries()) {
      factors.sort((a, b) => {
        const priorityA = getFactorPriority(a.factorName || "");
        const priorityB = getFactorPriority(b.factorName || "");
        return priorityA - priorityB;
      });
    }

    // ── Fetch real attendance stats for every employee in the date range ────────
const statsMap = new Map<string, any>();
const employeeIds = (allemployees || []).map((e: any) => e.employeeId).filter(Boolean);

await Promise.allSettled(
  employeeIds.map(async (empId: string) => {
    try {
      const res = await fetchEmpAttendanceStatistics(empId, formattedStart, formattedEnd);
      const stats = res?.data?.empAttendanceStatistics;
      if (stats) statsMap.set(empId, stats);
    } catch {
      // silently skip — fallback to workingDays will be used
    }
  })
);
setAttendanceStatsMap(statsMap);
// ─────────────────────────────────────────────────────────────────────────────

setTopEmployeeByFactor([...employeeTrackByModuleMap.entries()]);
  }

  useEffect(() => {
    fetchAllTheStarEmployeesByStartAndEndDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, allemployees]);

  // ── Build per-module top employees ────────────────────────────────────────

  useEffect(() => {
    if (!topEmployeeByFactor?.length) return;

    const result: any[] = [];

    for (const [factorName, factorData] of topEmployeeByFactor) {
      const employeeScoreMap = new Map<string, any>();

      for (const factorRow of factorData) {
        for (const empEntry of factorRow?.starEmployees || []) {
          const existing = employeeScoreMap.get(empEntry.employeeId);
          if (existing) {
            existing.score = Number(existing.score) + Number(empEntry.score || 0);
          } else {
            employeeScoreMap.set(empEntry.employeeId, {
              employeeId: empEntry.employeeId,
              score: Number(empEntry.score || 0),
              employeeData: empEntry,
            });
          }
        }
      }

      const sorted = [...employeeScoreMap.values()].sort(
        (a, b) => Number(b.score) - Number(a.score)
      );

      result.push({ moduleName: factorName, employees: sorted });
    }

    setTopEmployeeByModule(result);
  }, [topEmployeeByFactor]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const formatNumber = (value: any, decimals = 2): string => {
    if (value === null || value === undefined || isNaN(Number(value))) return "0";
    return parseFloat(Number(value).toFixed(decimals)).toString();
  };

  const getContextLabel = (factorName: string, value: any) => {
    const name = factorName?.toLowerCase() || "";
    if (name.includes("hour")) return `${formatNumber(value)} hrs worked`;
    if (name.includes("day") || name.includes("attendance")) return `${value} days`;
    if (name.includes("request")) return `${value} requests`;
    return "";
  };

  const formatScore = (score: any): string => {
    if (score === "-NA-" || score === null || score === undefined) return "-NA-";
    return parseFloat(Number(score).toFixed(2)).toString();
  };

  const getEmployeeAvatar = (avatar: string | undefined, gender: number | undefined) => {
    const url = getAvatar(avatar || "", gender as 0 | 1 | 2);
    return url?.trim() || maleIcons.maleIcon?.default;
  };

  const renderEmployeeStats = (employee: EmployeeRank) => {
    if (viewMode === "points") {
      return (
        <span style={{ color: "#295d8e", fontWeight: "bold", fontSize: "16px" }}>
          {formatScore(employee.totalScore)}
          {maxTotalScore > 0 && (
            <span style={{ color: "#295d8e", fontWeight: "600", fontSize: "13px", marginLeft: "4px" }}>
              / {maxTotalScore}
            </span>
          )}
        </span>
      );
    }
    return (
      <span style={{ color: "#295d8e", fontWeight: "bold", fontSize: "16px" }}>
        {formatNumber(employee.totalTimeHours || 0)}h
        {(employee.totalOvertimeHours || 0) > 0 && (
          <span style={{ fontSize: "12px", marginLeft: "4px", fontWeight: "500" }}>
            ({formatNumber(employee.totalOvertimeHours)}h OT)
          </span>
        )}
      </span>
    );
  };

  // ── Rank badge colors ──────────────────────────────────────────────────────
  const rankBadgeColor = (rank: number) => {
    if (rank === 1) return "#f1b900e5";
    if (rank === 2) return "#C0C0C0";
    if (rank === 3) return "#CD7F32";
    return "#F5F8FA";
  };

  const rankTextColor = (rank: number) => (rank <= 3 ? "white" : "#70829A");

  const rankSvg = (rank: number) => {

    return null;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Top 5 Overall ───────────────────────────────────────────────────── */}
      <Row className="mt-7">
        <CommonCard>
          <div className="d-flex flex-row align-items-center justify-content-between">
            <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: 0 }}>
              Top 5 Overall
              {maxTotalScore > 0 && (
                <span style={{ fontWeight: "normal", fontSize: "14px", color: "#70829A", marginLeft: "8px" }}>
                  (out of {maxTotalScore})
                </span>
              )}
            </h3>

            <div className="d-flex align-items-center gap-2">
              <div style={{ display: "flex", border: "1px solid #A94442", borderRadius: "6px", overflow: "hidden" }}>
                <button
                  onClick={() => setViewMode("points")}
                  style={{
                    padding: "5px 12px",
                    background: viewMode === "points" ? "#A94442" : "white",
                    color: viewMode === "points" ? "white" : "#A94442",
                    border: "none",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  Points
                </button>
                <button
                  onClick={() => setViewMode("time")}
                  style={{
                    padding: "5px 12px",
                    background: viewMode === "time" ? "#A94442" : "white",
                    color: viewMode === "time" ? "white" : "#A94442",
                    border: "none",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  Time
                </button>
              </div>

              <button
                className="btn"
                style={{
                  backgroundColor: "#A94442",
                  color: "white",
                  borderRadius: "6px",
                  padding: "6px 14px",
                  fontWeight: 500,
                }}
                onClick={() => setShowAllOverAllEmployeeByScore(true)}
              >
                View All
              </button>
            </div>
          </div>

          {leaderboardError && (
            <div
              style={{
                marginTop: "20px",
                padding: "16px",
                backgroundColor: "#FAE8E6",
                borderRadius: "8px",
                color: "#A94442",
                fontWeight: 500,
              }}
            >
              ⚠️ {leaderboardError}
            </div>
          )}

          {leaderboardLoading && !leaderboardError && (
            <div style={{ marginTop: "20px", color: "#70829A" }}>Loading rankings…</div>
          )}

          {!leaderboardLoading && !leaderboardError && (
            <div className="overflow-scroll no-scrollbar my-5">
              <div className="d-flex flex-row align-items-center justify-content-between gap-10 py-5">
                {[starEmployee1, starEmployee2, starEmployee3, starEmployee4, starEmployee5].map(
                  (emp, i) => (
                    <div key={i} className="d-flex flex-row align-items-center gap-2 px-3 py-2 rounded-1">
                      <div className="position-relative">
                        <img
                          src={emp.avatar}
                          alt="Avatar"
                          className="rounded-circle shadow-sm"
                          style={{ width: "72px", height: "72px", border: "2px solid #E4E7EB" }}
                        />
                      </div>
                      <div className="d-flex flex-column ms-3">
                        <span style={{ fontSize: "16px", color: "black", fontWeight: "600" }}>
                          {emp.name}
                        </span>
                        <span style={{ fontSize: "15px", color: "black", fontWeight: "bold", whiteSpace: "nowrap" }}>
                          {renderEmployeeStats(emp)}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </CommonCard>
      </Row>

      {/* ── Overall Rankings Modal ───────────────────────────────────────────── */}
      <Modal
        show={showAllOverAllEmployeeByScore}
        onHide={() => setShowAllOverAllEmployeeByScore(false)}
      >
        <Modal.Body style={{ padding: "40px" }}>
          <div className="d-flex justify-content-between align-items-center">
            <div style={{ fontSize: "17px", fontWeight: "bold" }}>All Employees Ranking Overall</div>
            <div className="d-flex flex-column align-items-end">
              <div style={{ color: "#70829A" }}>Max Possible</div>
              <div className="my-2">{maxTotalScore > 0 ? maxTotalScore : "—"}</div>
            </div>
          </div>

          <Table
            responsive
            style={{ marginTop: "20px", borderCollapse: "separate", borderSpacing: "0 10px" }}
          >
            <thead>
              <tr style={{ color: "#70829A" }}>
                <th>Rank</th>
                <th>Employee</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {allEmployeesByScore.map((employee) => {
                const bagColor = Number(employee.totalScore) > 0 ? "#EBFAE6" : "#FAE8E6";
                const svgSrc = rankSvg(employee.rank);

                return (
                  <tr key={employee.employeeId} style={{ backgroundColor: "transparent" }}>
                    <td
                      style={{
                        borderTopLeftRadius: "10px",
                        borderBottomLeftRadius: "10px",
                        backgroundColor: bagColor,
                        fontSize: "14px",
                        textAlign: "center",
                        padding: "12px 8px",
                      }}
                    >
                      <div
                        className="d-flex align-items-center justify-content-center me-3"
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          backgroundColor: rankBadgeColor(employee.rank),
                          color: rankTextColor(employee.rank),
                          fontWeight: "bold",
                          fontSize: "14px",
                        }}
                      >
                        {employee.rank}
                      </div>
                    </td>

                    <td style={{ backgroundColor: bagColor, padding: "12px 8px" }}>
                      <div className="d-flex flex-row align-items-center gap-2">
                        <div className="position-relative">
                          <img
                            src={employee.avatar}
                            alt="Avatar"
                            className="rounded-circle"
                            style={{ width: "30px", height: "30px" }}
                          />
                          {svgSrc && (
                            <span className="position-absolute top-100 start-100 translate-middle badge rounded-pill">
                              <SVG
                                src={svgSrc}
                                className="menu-svg-icon"
                                style={{ marginTop: "-20px", marginLeft: "-20px" }}
                              />
                            </span>
                          )}
                        </div>
                        <div className="d-flex flex-column ms-2">
                          <span style={{ fontSize: "15px", color: "black" }}>{employee.name}</span>
                        </div>
                      </div>
                    </td>

                    <td
                      style={{
                        borderTopRightRadius: "10px",
                        borderBottomRightRadius: "10px",
                        backgroundColor: bagColor,
                        fontSize: "14px",
                        color: "black",
                        textAlign: "center",
                        padding: "12px 8px",
                      }}
                    >
                      {renderEmployeeStats(employee)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      {/* ── Top Employees By Factors ─────────────────────────────────────────── */}
      <Row>
        <CommonCard>
          <h3>Top Employees By Factors</h3>
          <Row className="gy-3 gx-2">
            {topEmployeeByModule?.length > 0 &&
              overviewData?.map((item, index) => {
                const moduleName = item.label.toLowerCase().trim();
                const topEmployee = topEmployeeByModule.find(
                  (m: any) => m.moduleName.toLowerCase().trim() === moduleName
                );
                const employee = topEmployee?.employees?.[0]?.employeeData;
                const scoreToShow = topEmployee?.employees?.[0]?.score;

                return (
                  <Col key={index} xs={12} sm={6} md={4}>
                    <div
                      className="d-flex align-items-center justify-content-between"
                      style={{
                        backgroundColor: "#ffffff",
                        borderRadius: "8px",
                        border: "1.5px solid #D4DBE4",
                        padding: "12px",
                        height: "100%",
                      }}
                    >
                      <div className="d-flex align-items-center gap-2" style={{ padding: "6px 8px" }}>
                        <img
                          src={item.icon}
                          alt={item.label}
                          style={{ width: "20px", height: "20px" }}
                        />
                        <span>{item.label}</span>
                      </div>
                      <div className="d-flex flex-row align-items-center gap-2">
                        <div className="position-relative">
                          <img
                            src={getEmployeeAvatar(
                              employee?.employee?.avatar,
                              employee?.employee?.gender || 0
                            )}
                            alt="Avatar"
                            className="rounded-circle"
                            style={{ width: "40px", height: "40px" }}
                          />
                        </div>
                        <div className="d-flex flex-column ms-2">
                          <span style={{ fontSize: "12px", color: "black" }}>
                            {employee?.employee?.firstName && employee?.employee?.lastName
                              ? `${employee.employee.firstName} ${employee.employee.lastName}`
                              : "-NA-"}
                          </span>
                          <span style={{ fontSize: "14px", color: "black" }}>
                            {Number(scoreToShow) > 0
                              ? `+${formatScore(scoreToShow)}`
                              : formatScore(Number(scoreToShow) || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Col>
                );
              })}
          </Row>
        </CommonCard>
      </Row>

      {/* ── Star Employees Section ───────────────────────────────────────────── */}
      <Row>
        <CommonCard>
          <h3>Star Employees</h3>

          {topEmployeeByFactor.map((item: any, index: number) => {
            const employeeData: any[] = item[1];
            const moduleName: string = item[0];

            return (
              <div key={index}>
                {/* Module header */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#E4E7EB",
                    }}
                  >
                    {moduleName === "Attendance" ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <g clipPath="url(#clip0_15710_47268)">
                          <path
                            d="M19.5 3.75H4.5C4.08579 3.75 3.75 4.08579 3.75 4.5V19.5C3.75 19.9142 4.08579 20.25 4.5 20.25H19.5C19.9142 20.25 20.25 19.9142 20.25 19.5V4.5C20.25 4.08579 19.9142 3.75 19.5 3.75Z"
                            stroke="#6C6F74"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M16.5 2.25V5.25"
                            stroke="#6C6F74"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M7.5 2.25V5.25"
                            stroke="#6C6F74"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M3.75 8.25H20.25"
                            stroke="#6C6F74"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M8.625 14.25L10.875 16.5L15.375 12"
                            stroke="#6C6F74"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_15710_47268">
                            <rect width="24" height="24" fill="white" />
                          </clipPath>
                        </defs>
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <g clipPath="url(#clip0_15710_47285)">
                          <path
                            d="M11.9992 5.25L14.9992 4.5C14.9992 4.5 17.4817 8.37656 18.6461 12.7228C18.7497 13.1039 18.777 13.5016 18.7265 13.8933C18.676 14.2849 18.5487 14.6627 18.3518 15.005C18.155 15.3474 17.8925 15.6475 17.5794 15.8881C17.2663 16.1288 16.9088 16.3052 16.5274 16.4074C16.1459 16.5096 15.7481 16.5355 15.3566 16.4835C14.9652 16.4316 14.5878 16.3029 14.2462 16.1048C13.9046 15.9067 13.6055 15.6432 13.366 15.3292C13.1265 15.0153 12.9513 12.4071 12.8505 14.2753C11.6861 9.92906 11.9992 5.25 11.9992 5.25Z"
                            stroke="#6C6F74"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M16.5254 16.3965L17.8716 21.4187"
                            stroke="#6C6F74"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M20.25 20.7812L15.75 21.9869"
                            stroke="#6C6F74"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M11.9999 3L8.99993 2.25C8.99993 2.25 6.51743 6.12656 5.35305 10.4728C5.24949 10.8539 5.22218 11.2516 5.27268 11.6433C5.32319 12.0349 5.45051 12.4127 5.64736 12.755C5.8442 13.0974 6.10669 13.3975 6.41977 13.6381C6.73285 13.8788 7.09036 14.0552 7.47179 14.1574C7.85323 14.2596 8.25108 14.2855 8.64253 14.2335C9.03399 14.1816 9.41134 14.0529 9.75294 13.8548C10.0945 13.6567 10.3937 13.3932 10.6332 13.0792C10.8727 12.7653 11.0479 12.4071 11.1487 12.0253C12.2146 7.66875 11.9999 3 11.9999 3Z"
                            stroke="#6C6F74"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M7.47516 14.1465L6.12891 19.1687"
                            stroke="#6C6F74"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M3.75 18.5312L8.25 19.7369"
                            stroke="#6C6F74"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12.0469 9.17625L16.8703 7.96875"
                            stroke="#6C6F74"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M11.8987 7.09992L7.05273 5.88867"
                            stroke="#6C6F74"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M18 3.75L19.5 3"
                            stroke="#6C6F74"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M19.5 6.75H21"
                            stroke="#6C6F74"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M5.25 3L3.75 2.25"
                            stroke="#6C6F74"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M3.75 6H2.25"
                            stroke="#6C6F74"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_15710_47285">
                            <rect width="24" height="24" fill="white" />
                          </clipPath>
                        </defs>
                      </svg>
                    )}
                  </div>
                  <h4
                    style={{
                      color: "#fffcfc",
                      fontFamily: "Barlow",
                      fontSize: "19px",
                      fontWeight: 600,
                      lineHeight: "normal",
                      letterSpacing: "0.19px",
                      margin: "20px 0",
                    }}
                  >
                    {moduleName}
                  </h4>
                </div>

                {/* Factor rows */}
                <div>
                  {employeeData.map((employee: any, empIndex: number) => {
                    const factorType = employee?.starEmployees?.[0]?.factor?.type;

                    const starEmployeeIds = new Set(
                      (employee?.starEmployees || []).map((se: any) => se.employeeId)
                    );

                    const missingAsStarEmployees = (allemployees || [])
                      .filter((emp: any) => !starEmployeeIds.has(emp.employeeId))
                      .map((emp: any) => ({
                        employeeId: emp.employeeId,
                        value: "0",
                        score: "0",
                        module: null,
                        factor: employee?.starEmployees?.[0]?.factor || null,
                        employee: {
                          id: emp.employeeId,
                          avatar: emp.avatar,
                          firstName: emp.employeeName?.split(" ")[0] || "",
                          lastName: emp.employeeName?.split(" ").slice(1).join(" ") || "",
                          gender: emp.gender,
                        },
                      }));

                    const allStarEmployees: any[] = [
                      ...(employee?.starEmployees || []).map((emp: any) => ({
                        ...emp,
                        maxValue: getMaxValueFromFactor(employee.factorName, emp.employeeId),
                      })),
                      ...missingAsStarEmployees.map((emp: any) => ({
                        ...emp,
                        maxValue: getMaxValueFromFactor(employee.factorName, emp.employeeId),
                      })),
                    ];

                    const sortedStarEmployees = [...allStarEmployees].sort((a, b) => {
                      const scoreA = Number(a.score);
                      const scoreB = Number(b.score);
                      return factorType === "NEGATIVE" ? scoreA - scoreB : scoreB - scoreA;
                    });

                    const getEmpName = (empEntry: any) => {
                      const first = empEntry?.employee?.firstName || "";
                      const last = empEntry?.employee?.lastName || "";
                      return (first + " " + last).trim() || "-NA-";
                    };

                    const rankColors = ["#2bb07b", "#b58320", "#7959db", "#717171", "#717171"];
                    const rankLabels = [
                      { num: "1", suffix: "st" },
                      { num: "2", suffix: "nd" },
                      { num: "3", suffix: "rd" },
                      { num: "4", suffix: "th" },
                      { num: "5", suffix: "th" },
                    ];

                    return (
                      <div key={empIndex} style={{ marginBottom: "20px" }}>
                        <div
                          style={{
                            background: factorType === "NEGATIVE" ? "#fbecec" : "#eaf3de",
                            padding: "20px 28px",
                            borderRadius: "12px",
                            boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
                          }}
                        >
                          <div style={{ marginBottom: "16px" }}>
                            <div
                              style={{
                                color: "#000",
                                fontFamily: "Barlow",
                                fontSize: "16px",
                                fontWeight: 600,
                                letterSpacing: "0.16px",
                              }}
                            >
                              {employee.factorName}
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexDirection: "row",
                              gap: "16px",
                              alignItems: "center",
                              overflowX: "auto",
                              overflowY: "hidden",
                              minHeight: "80px",
                            }}
                            className="no-scrollbar"
                          >
                            {[0, 1, 2, 3, 4].map((slotIdx) => {
                              const empEntry = sortedStarEmployees[slotIdx];
                              if (!empEntry) return null;

                              return (
                                <div
                                  key={slotIdx}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "16px",
                                    minWidth: "180px",
                                    flexShrink: 0,
                                  }}
                                >
                                  <div className="position-relative" style={{ flexShrink: 0 }}>
                                    <img
                                      src={getEmployeeAvatar(
                                        empEntry?.employee?.avatar || "",
                                        empEntry?.employee?.gender || 0
                                      )}
                                      alt="Avatar"
                                      className="rounded-circle shadow-sm"
                                      style={{
                                        width: "80px",
                                        height: "80px",
                                        border: "1px solid #ffffffff",
                                        objectFit: "cover",
                                      }}
                                    />
                                    <div
                                      style={{
                                        position: "absolute",
                                        bottom: "-4px",
                                        left: "32px",
                                        background: rankColors[slotIdx],
                                        borderRadius: "32px",
                                        width: "28px",
                                        height: "28px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        border: "2px solid white",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontFamily: "Inter",
                                          fontSize: "12px",
                                          fontWeight: 600,
                                          color: "white",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {rankLabels[slotIdx].num}
                                        <span style={{ fontSize: "10px" }}>
                                          {rankLabels[slotIdx].suffix}
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "4px",
                                      flex: 1,
                                      overflow: "hidden",
                                      minWidth: 0,
                                    }}
                                  >
                                    <span
                                      style={{
                                        color: "#000000",
                                        fontFamily: "Inter",
                                        fontSize: "15px",
                                        fontWeight: 600,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                    >
                                      {getEmpName(empEntry)}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: "14px",
                                        fontWeight: 700,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                    >
                                      {formatNumber(empEntry?.score)} /{" "}
                                      {formatNumber(
                                        empEntry?.maxValue || employee?.factor?.employeeMaxScore || 0
                                      )}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: "14px",
                                        color: "#295d8e",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                    >
                                      {formatNumber(empEntry?.value)} /{" "}
                                      {formatNumber(empEntry?.maxValue || 0)}{" "}
                                      {getFactorUnit(employee.factorName)}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: "13px",
                                        color: "#6c757d",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                    >
                                      {getContextLabel(employee.factorName, empEntry?.value)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                width: "100%",
                              }}
                            >
                              {/* LEFT SIDE → Employees */}
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "row",
                                  justifyContent: "space-between", // 🔥 KEY FIX
                                  alignItems: "center",
                                  width: "100%",
                                }}
                              >
                                {/* your employee cards here */}
                              </div>

                              {/* RIGHT SIDE → View All */}
                              <button
                                className="btn btn-link"
                                style={{
                                  color: "#9D4141",
                                  cursor: "pointer",
                                  textDecoration: "none",
                                  fontSize: "14px",
                                  fontWeight: 500,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  padding: "4px 8px",
                                  flexShrink: 0,
                                  marginLeft: "auto", // 🔥 KEY FIX
                                }}
                                onClick={() => {
                                  const sorted = [...allStarEmployees].sort((a, b) => {
                                    const scoreA = Number(a.score);
                                    const scoreB = Number(b.score);
                                    return factorType === "NEGATIVE"
                                      ? scoreA - scoreB
                                      : scoreB - scoreA;
                                  });

                                  setStarEmployeeDataByAFactor(sorted);
                                  setStarEmployeeDataFactorName(employee?.factorName);
                                  setShowAllStarEmployeesByAFactor(true);
                                }}
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                >
                                  <path
                                    d="M8 4V12M4 8H12"
                                    stroke="#9D4141"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                View All
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CommonCard>
      </Row>

      {/* ── Star Employees by Factor Modal ──────────────────────────────────── */}
      <Modal
        show={showAllStarEmployeesByAFactor}
        onHide={() => setShowAllStarEmployeesByAFactor(false)}
        dialogClassName="custom-modal-width"
        centered
      >
        <Modal.Body style={{ padding: "30px 40px" }}>
          <style jsx>{`
            .custom-modal-width {
              max-width: 700px !important;
              width: 95%;
            }
          `}</style>

          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              paddingBottom: "12px",
            }}
          >
            <div>
              <div style={{ fontSize: "20px", fontWeight: "bold" }}>Star Employees</div>
              <div style={{ fontSize: "16px", fontWeight: "bold" }}>
                {starEmployeeDataFactorName}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#70829A",
                  minWidth: "100px",
                  textAlign: "center",
                }}
              >
                Score
              </div>
              <div style={{ height: "20px", width: "1px", backgroundColor: "#D4DBE4" }} />
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#70829A",
                  minWidth: "120px",
                  textAlign: "center",
                }}
              >
                {getFactorUnit(starEmployeeDataFactorName) === "req"
                  ? "Request"
                  : getFactorUnit(starEmployeeDataFactorName) || "Metrics"}
              </div>
            </div>
          </div>

          {/* List */}
          <div
            style={{
              marginTop: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {starEmployeeDataByAFactor.map((employee: any, index: number) => {
              const bagColor = Number(employee?.score) > 0 ? "#EBFAE6" : "#FAE8E6";
              const svgSrc = rankSvg(index + 1);

              const employeeName =
                `${employee?.employee?.firstName || ""} ${employee?.employee?.lastName || ""}`.trim() ||
                "-NA-";

              const avatar = getEmployeeAvatar(
                employee?.employee?.avatar || "",
                employee?.employee?.gender || 0
              );

              const score = employee?.score;
              const maxScore = employee?.factor?.employeeMaxScore || 0;
              const value = employee?.value;
              const maxValue = employee?.maxValue;
              const unit = getFactorUnit(starEmployeeDataFactorName);

              return (
                <div
                  key={employee.employeeId || index}
                  style={{
                    backgroundColor: bagColor,
                    borderRadius: "12px",
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "bold",
                      color: "#70829A",
                      minWidth: "24px",
                    }}
                  >
                    {index + 1}.
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <img
                        src={avatar}
                        alt="Avatar"
                        style={{
                          width: "50px",
                          height: "50px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "1px solid #E4E7EB",
                        }}
                      />
                      {svgSrc && (
                        <span className="position-absolute top-100 start-100 translate-middle">
                          <SVG
                            src={svgSrc}
                            style={{
                              width: "18px",
                              height: "18px",
                              marginTop: "-16px",
                              marginLeft: "-16px",
                            }}
                          />
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        flex: 1,
                        minWidth: "200px",
                        marginRight: "10px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "15px",
                          fontWeight: 600,
                          color: "#212529",
                          whiteSpace: "normal",
                          wordBreak: "normal",
                          overflowWrap: "break-word",
                        }}
                      >
                        {employeeName}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ minWidth: "100px", textAlign: "center" }}>
                        <span style={{ fontSize: "14px", fontWeight: 700 }}>
                          {formatNumber(score)} / {formatNumber(maxScore)}
                        </span>
                      </div>

                      <div
                        style={{ height: "28px", width: "1px", backgroundColor: "#D4DBE4" }}
                      />

                      <div style={{ minWidth: "120px", textAlign: "center" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#295d8e" }}>
                          {formatNumber(value)} / {formatNumber(maxValue)} {unit}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default LeaderBoardCore;

// import CommonCard from "@app/modules/common/components/CommonCard";
// import { resourseAndView } from "@models/company";
// import { AppDispatch, RootState } from "@redux/store";
// import {
//   fetchAllStarEmployeeByStartAndEndDate,
//   fetchKpiLeaderboardOverall,
//   getAllKPIModules,
// } from "@services/employee";
// import { getAvatar } from "@utils/avatar";
// import { Dayjs } from "dayjs";
// import { useEffect, useState } from "react";
// import { Col, Container, Modal, Row, Table, Accordion } from "react-bootstrap";
// import { useDispatch, useSelector } from "react-redux";
// import { miscellaneousIcons } from "../../../../../_metronic/assets/miscellaneousicons";
// import SVG from "react-inlinesvg";
// import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
// import { maleIcons } from "@metronic/assets/sidepanelicons";
// import { getFactorUnit } from "./kpiUtils";
// import { getWorkingDaysInRange, filterLeavesPublicHolidays } from "@utils/statistics";

// // ─────────────────────────────────────────────────────────────────────────────
// // Types
// // ─────────────────────────────────────────────────────────────────────────────

// interface EmployeeRank {
//   name: string;
//   totalScore: number;
//   avatar: string;
//   employeeId: string;
//   rank: number;
//   totalTimeHours: number;
//   totalOvertimeHours: number;
//   totalRegularHours: number;
// }

// interface OverviewData {
//   icon: string;
//   label: string;
//   totalScore: number;
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Constants
// // ─────────────────────────────────────────────────────────────────────────────

// const DEFAULT_EMPLOYEE: EmployeeRank = {
//   name: "-NA-",
//   totalScore: 0,
//   avatar: "",
//   employeeId: "",
//   rank: 0,
//   totalTimeHours: 0,
//   totalOvertimeHours: 0,
//   totalRegularHours: 0,
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Component
// // ─────────────────────────────────────────────────────────────────────────────

// function LeaderBoardCore({
//   startDate,
//   endDate,
//   fromAdmin = false,
//   resourseAndView,
//   overviewData,
//   onRankResolved,   // ✅ Fixed — plain prop name, no JSX value assigned here
// }: {
//   startDate?: Dayjs;
//   endDate?: Dayjs;
//   fromAdmin?: boolean;
//   resourseAndView?: resourseAndView[];
//   overviewData?: OverviewData[];
//   onRankResolved?: (rank: number | null, maxTotal: number, yourPoints: number) => void;
// }) {
//   const toggleChange = useSelector(
//     (state: RootState) => state.attendanceStats.toggleChange
//   );
//   const selectedEmployeeId = useSelector(
//     (state: RootState) =>
//       state.employee.selectedEmployee?.id || state.employee.currentEmployee.id
//   );

//   // ── Overall leaderboard state ──────────────────────────────────────────────
//   const [allEmployeesByScore, setAllEmployeesByScore] = useState<EmployeeRank[]>([]);
//   const [maxTotalScore, setMaxTotalScore] = useState<number>(0);
//   const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
//   const [leaderboardLoading, setLeaderboardLoading] = useState(false);

//   // ── Top 5 slots (derived from allEmployeesByScore) ─────────────────────────
//   const top5 = allEmployeesByScore.slice(0, 5);
//   while (top5.length < 5) {
//     top5.push({ ...DEFAULT_EMPLOYEE, avatar: getAvatar("", 0) });
//   }
//   const [starEmployee1, starEmployee2, starEmployee3, starEmployee4, starEmployee5] = top5;

//   // ── Factor / module leaderboard state ─────────────────────────────────────
//   const [topEmployeeByFactor, setTopEmployeeByFactor] = useState<any[]>([]);
//   const [topEmployeeByModule, setTopEmployeeByModule] = useState<any[]>([]);

//   // ── Modal state ────────────────────────────────────────────────────────────
//   const [viewMode, setViewMode] = useState<"points" | "time">("points");
//   const [showAllStarEmployeesByAFactor, setShowAllStarEmployeesByAFactor] = useState(false);
//   const [starEmployeeDataByAFactor, setStarEmployeeDataByAFactor] = useState<any[]>([]);
//   const [starEmployeeDataFactorName, setStarEmployeeDataFactorName] = useState("");
//   const [showAllOverAllEmployeeByScore, setShowAllOverAllEmployeeByScore] = useState(false);

//   const allemployees = useSelector((state: RootState) => state.allEmployees?.list);
//   const dispatch = useDispatch<AppDispatch>();

//   const holidays = useSelector((state: RootState) => state.attendanceStats.filteredPublicHolidays);
//   const workingDaysConfig = useSelector(
//     (state: RootState) => state.employee.currentEmployee?.branches?.workingAndOffDays
//   );

//   const allWeekends = workingDaysConfig ? JSON.parse(workingDaysConfig) : {};

//   const safeStartDate = startDate ? startDate.clone().startOf("day") : undefined;
//   const safeEndDate = endDate ? endDate.clone().startOf("day") : undefined;

//   const filteredHolidaysData =
//     safeStartDate && safeEndDate
//       ? (filterLeavesPublicHolidays(
//           safeStartDate.format("YYYY-MM-DD"),
//           safeEndDate.format("YYYY-MM-DD"),
//           true,
//           false,
//           true
//         ) as any)
//       : undefined;

//   const resolvedHolidays = filteredHolidaysData?.publicHolidays || holidays;

//   // ── Working Days Calculation ───────────────────────────────────────────────
//   const workingDays =
//     safeStartDate && safeEndDate
//       ? getWorkingDaysInRange(safeStartDate, safeEndDate, true, allWeekends, resolvedHolidays)
//       : 0;

//   const findIsWeekendTrueAndCount = resolvedHolidays.filter(
//     (holiday: any) => holiday.isWeekend === true
//   ).length;

//   const actualTotalWorkingDay = Math.max(0, workingDays - findIsWeekendTrueAndCount);

//   console.log("=== KPI MODULE ===");
//   console.log("WorkingDays (Raw):", workingDays);
//   console.log("ActualWorkingDays (Adjusted):", actualTotalWorkingDay);
//   console.log("StartDate:", safeStartDate?.format("YYYY-MM-DD"));
//   console.log("EndDate:", safeEndDate?.format("YYYY-MM-DD"));
//   console.log("Holidays Array:", resolvedHolidays);
//   console.log("Weekend Override Count:", findIsWeekendTrueAndCount);
//   console.log("WorkingConfig:", allWeekends);
//   console.log("==================");

//   // ── Max Value Helper ───────────────────────────────────────────────────────
//   const getMaxValueFromFactor = (factorName: string) => {
//     const name = factorName?.toLowerCase();
//     const hoursPerDay = 9;
//     if (name?.includes("hour")) return actualTotalWorkingDay * hoursPerDay;
//     if (name?.includes("day") || name?.includes("attendance") || name?.includes("leave"))
//       return actualTotalWorkingDay;
//     if (name?.includes("request")) return 10;
//     return 0;
//   };

//   useEffect(() => {
//     dispatch(loadAllEmployeesIfNeeded());
//   }, [dispatch]);

//   // ── Main data fetch ────────────────────────────────────────────────────────

//   async function fetchAllTheStarEmployeesByStartAndEndDate() {
//     const formattedStart = startDate?.format("YYYY-MM-DD") || "";
//     const formattedEnd = endDate?.format("YYYY-MM-DD") || "";

//     if (!formattedStart || !formattedEnd) return;

//     setLeaderboardLoading(true);
//     setLeaderboardError(null);

//     // ── 1. OVERALL LEADERBOARD ────────────────────────────────────────────────
//     let leaderboardData: any[] = [];
//     let overallFetchFailed = false;

//     try {
//       const overallResponse = await fetchKpiLeaderboardOverall(formattedStart, formattedEnd);

//       if (Array.isArray(overallResponse)) {
//         leaderboardData = overallResponse;
//       } else if (overallResponse && Array.isArray((overallResponse as any).data)) {
//         leaderboardData = (overallResponse as any).data;
//       } else {
//         console.error("Leaderboard API returned unexpected shape:", overallResponse);
//         overallFetchFailed = true;
//       }
//     } catch (err) {
//       console.error("Overall leaderboard fetch failed:", err);
//       overallFetchFailed = true;
//     }

//     if (overallFetchFailed) {
//       setLeaderboardError("Failed to load leaderboard rankings. Please try again.");
//       setAllEmployeesByScore([]);
//       setMaxTotalScore(0);
//       setLeaderboardLoading(false);
//       // ✅ Notify parent of failure so badge shows "-" not "Loading..."
//       onRankResolved?.(null, 0, 0);
//       await fetchFactorData(formattedStart, formattedEnd);
//       return;
//     }

//     // ── 2. BUILD EMPLOYEE DISPLAY MAP ─────────────────────────────────────────
//     const enrichedEmployees: EmployeeRank[] = leaderboardData.map((entry: any) => {
//       const empDetails = (allemployees || []).find(
//         (e: any) => e.employeeId === entry.employeeId || e.id === entry.employeeId
//       );

//       return {
//         employeeId: entry.employeeId,
//         rank: entry.rank,                              // ✅ Always from backend
//         totalScore: Number(entry.totalScore ?? 0),
//         totalTimeHours: Number(entry.totalTimeHours ?? 0),
//         totalOvertimeHours: Number(entry.totalOvertimeHours ?? 0),
//         totalRegularHours: Number(entry.totalRegularHours ?? 0),
//         name: empDetails?.employeeName || "-NA-",
//         avatar: empDetails
//           ? getAvatar(empDetails.avatar, Number(empDetails.gender) as any)
//           : getAvatar("", 0),
//       };
//     });

//     enrichedEmployees.sort((a, b) => a.rank - b.rank);

//     const topEntry = leaderboardData.find((e: any) => e.rank === 1);
//     setMaxTotalScore(topEntry?.maxTotal ?? 0);
//     setAllEmployeesByScore(enrichedEmployees);
//     setLeaderboardLoading(false);

//     // ── 3. FIRE RANK CALLBACK ─────────────────────────────────────────────────
//     // Finds the logged-in employee in the enriched list and reports their
//     // backend rank upward to the parent — never derived from array index.
//     if (onRankResolved) {
//       const currentEmpEntry = enrichedEmployees.find(
//         (e) => e.employeeId === selectedEmployeeId
//       );
//       onRankResolved(
//         currentEmpEntry?.rank ?? null,
//         topEntry?.maxTotal ?? 0,
//         currentEmpEntry?.totalScore ?? 0
//       );
//     }

//     // ── 4. FACTOR DATA ────────────────────────────────────────────────────────
//     await fetchFactorData(formattedStart, formattedEnd);
//   }

//   async function fetchFactorData(formattedStart: string, formattedEnd: string) {
//     let factorResponse: any = {};
//     let modulesResponse: any = {};

//     try {
//       factorResponse = await fetchAllStarEmployeeByStartAndEndDate(formattedStart, formattedEnd);
//     } catch (err) {
//       console.error("Factor leaderboard fetch failed:", err);
//     }

//     try {
//       modulesResponse = await getAllKPIModules();
//     } catch (err) {
//       console.error("Modules fetch failed:", err);
//     }

//     const factorData =
//       factorResponse?.data?.result || factorResponse?.result || [];

//     const modules =
//       modulesResponse?.data?.modules ||
//       modulesResponse?.modules ||
//       (Array.isArray(modulesResponse?.data) ? modulesResponse.data : []) ||
//       [];

//     const employeeTrackByModuleMap = new Map<string, any[]>();

//     for (const module of modules) {
//       const moduleId = module?.id;
//       const moduleName = module?.name;
//       const rows = factorData.filter((row: any) => row?.moduleId === moduleId);
//       employeeTrackByModuleMap.set(moduleName, rows);
//     }

//     if (modules.length === 0 && factorData.length > 0) {
//       for (const factorRow of factorData) {
//         const moduleName = factorRow?.moduleName || factorRow?.module?.name || "Unknown";
//         const existing = employeeTrackByModuleMap.get(moduleName) || [];
//         existing.push(factorRow);
//         employeeTrackByModuleMap.set(moduleName, existing);
//       }
//     }

//     setTopEmployeeByFactor([...employeeTrackByModuleMap.entries()]);
//   }

//   useEffect(() => {
//     fetchAllTheStarEmployeesByStartAndEndDate();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [startDate, endDate, allemployees]);

//   // ── Build per-module top employees ────────────────────────────────────────

//   useEffect(() => {
//     if (!topEmployeeByFactor?.length) return;

//     const result: any[] = [];

//     for (const [factorName, factorData] of topEmployeeByFactor) {
//       const employeeScoreMap = new Map<string, any>();

//       for (const factorRow of factorData) {
//         for (const empEntry of factorRow?.starEmployees || []) {
//           const existing = employeeScoreMap.get(empEntry.employeeId);
//           if (existing) {
//             existing.score = Number(existing.score) + Number(empEntry.score || 0);
//           } else {
//             employeeScoreMap.set(empEntry.employeeId, {
//               employeeId: empEntry.employeeId,
//               score: Number(empEntry.score || 0),
//               employeeData: empEntry,
//             });
//           }
//         }
//       }

//       const sorted = [...employeeScoreMap.values()].sort(
//         (a, b) => Number(b.score) - Number(a.score)
//       );

//       result.push({ moduleName: factorName, employees: sorted });
//     }

//     setTopEmployeeByModule(result);
//   }, [topEmployeeByFactor]);

//   // ── Helpers ────────────────────────────────────────────────────────────────

//   const formatNumber = (value: any, decimals = 2): string => {
//     if (value === null || value === undefined || isNaN(Number(value))) return "0";
//     return Number(value).toFixed(decimals);
//   };

//   const getContextLabel = (factorName: string, value: any) => {
//     const name = factorName?.toLowerCase() || "";
//     if (name.includes("hour")) return `${formatNumber(value)} hrs worked`;
//     if (name.includes("day") || name.includes("attendance")) return `${value} days`;
//     if (name.includes("request")) return `${value} requests`;
//     return "";
//   };

//   const formatScore = (score: any): string => {
//     if (score === "-NA-" || score === null || score === undefined) return "-NA-";
//     return Number(score).toFixed(2);
//   };

//   const getEmployeeAvatar = (avatar: string | undefined, gender: number | undefined) => {
//     const url = getAvatar(avatar || "", gender as 0 | 1 | 2);
//     return url?.trim() || maleIcons.maleIcon?.default;
//   };

//   const renderEmployeeStats = (employee: EmployeeRank) => {
//     if (viewMode === "points") {
//       return (
//         <span style={{ color: "#295d8e", fontWeight: "bold", fontSize: "16px" }}>
//           {formatScore(employee.totalScore)}
//           {maxTotalScore > 0 && (
//             <span style={{ color: "#295d8e", fontWeight: "600", fontSize: "13px", marginLeft: "4px" }}>
//               / {maxTotalScore}
//             </span>
//           )}
//         </span>
//       );
//     }
//     return (
//       <span style={{ color: "#295d8e", fontWeight: "bold", fontSize: "16px" }}>
//         {employee.totalTimeHours || 0}h
//         {(employee.totalOvertimeHours || 0) > 0 && (
//           <span style={{ fontSize: "12px", marginLeft: "4px", fontWeight: "500" }}>
//             ({employee.totalOvertimeHours}h OT)
//           </span>
//         )}
//       </span>
//     );
//   };

//   // ── Rank badge colors ──────────────────────────────────────────────────────
//   const rankBadgeColor = (rank: number) => {
//     if (rank === 1) return "#f1b900e5";
//     if (rank === 2) return "#C0C0C0";
//     if (rank === 3) return "#CD7F32";
//     return "#F5F8FA";
//   };

//   const rankTextColor = (rank: number) => (rank <= 3 ? "white" : "#70829A");

//   const rankSvg = (rank: number) => {
    
//     return null;
//   };

//   // ── Render ─────────────────────────────────────────────────────────────────

//   return (
//     <>
//       {/* ── Top 5 Overall ───────────────────────────────────────────────────── */}
//       <Row className="mt-7">
//         <CommonCard>
//           <div className="d-flex flex-row align-items-center justify-content-between">
//             <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: 0 }}>
//               Top 5 Overall
//               {maxTotalScore > 0 && (
//                 <span style={{ fontWeight: "normal", fontSize: "14px", color: "#70829A", marginLeft: "8px" }}>
//                   (out of {maxTotalScore})
//                 </span>
//               )}
//             </h3>

//             <div className="d-flex align-items-center gap-2">
//               <div style={{ display: "flex", border: "1px solid #A94442", borderRadius: "6px", overflow: "hidden" }}>
//                 <button
//                   onClick={() => setViewMode("points")}
//                   style={{
//                     padding: "5px 12px",
//                     background: viewMode === "points" ? "#A94442" : "white",
//                     color: viewMode === "points" ? "white" : "#A94442",
//                     border: "none",
//                     fontSize: "14px",
//                     fontWeight: 500,
//                   }}
//                 >
//                   Points
//                 </button>
//                 <button
//                   onClick={() => setViewMode("time")}
//                   style={{
//                     padding: "5px 12px",
//                     background: viewMode === "time" ? "#A94442" : "white",
//                     color: viewMode === "time" ? "white" : "#A94442",
//                     border: "none",
//                     fontSize: "14px",
//                     fontWeight: 500,
//                   }}
//                 >
//                   Time
//                 </button>
//               </div>

//               <button
//                 className="btn"
//                 style={{
//                   backgroundColor: "#A94442",
//                   color: "white",
//                   borderRadius: "6px",
//                   padding: "6px 14px",
//                   fontWeight: 500,
//                 }}
//                 onClick={() => setShowAllOverAllEmployeeByScore(true)}
//               >
//                 View All
//               </button>
//             </div>
//           </div>

//           {leaderboardError && (
//             <div
//               style={{
//                 marginTop: "20px",
//                 padding: "16px",
//                 backgroundColor: "#FAE8E6",
//                 borderRadius: "8px",
//                 color: "#A94442",
//                 fontWeight: 500,
//               }}
//             >
//               ⚠️ {leaderboardError}
//             </div>
//           )}

//           {leaderboardLoading && !leaderboardError && (
//             <div style={{ marginTop: "20px", color: "#70829A" }}>Loading rankings…</div>
//           )}

//           {!leaderboardLoading && !leaderboardError && (
//             <div className="overflow-scroll no-scrollbar my-5">
//               <div className="d-flex flex-row align-items-center justify-content-between gap-10 py-5">
//               {[starEmployee1, starEmployee2, starEmployee3, starEmployee4, starEmployee5].map(
//                 (emp, i) => (
//                   <div key={i} className="d-flex flex-row align-items-center gap-2 px-3 py-2 rounded-1">
//                     <div className="position-relative">
//                       <img
//                         src={emp.avatar}
//                         alt="Avatar"
//                         className="rounded-circle shadow-sm"
//                         style={{ width: "72px", height: "72px", border: "2px solid #E4E7EB" }}
//                       />
//                     </div>
//                     <div className="d-flex flex-column ms-3">
//                       <span style={{ fontSize: "16px", color: "black", fontWeight: "600" }}>
//                         {emp.name}
//                       </span>
//                       <span style={{ fontSize: "15px", color: "black", fontWeight: "bold", whiteSpace: "nowrap" }}>
//                         {renderEmployeeStats(emp)}
//                       </span>
//                     </div>
//                   </div>
//                 )
//               )}
//             </div>
//             </div>
//           )}
//         </CommonCard>
//       </Row>

//       {/* ── Overall Rankings Modal ───────────────────────────────────────────── */}
//       <Modal
//         show={showAllOverAllEmployeeByScore}
//         onHide={() => setShowAllOverAllEmployeeByScore(false)}
//       >
//         <Modal.Body style={{ padding: "40px" }}>
//           <div className="d-flex justify-content-between align-items-center">
//             <div style={{ fontSize: "17px", fontWeight: "bold" }}>All Employees Ranking Overall</div>
//             <div className="d-flex flex-column align-items-end">
//               <div style={{ color: "#70829A" }}>Max Possible</div>
//               <div className="my-2">{maxTotalScore > 0 ? maxTotalScore : "—"}</div>
//             </div>
//           </div>

//           <Table
//             responsive
//             style={{ marginTop: "20px", borderCollapse: "separate", borderSpacing: "0 10px" }}
//           >
//             <thead>
//               <tr style={{ color: "#70829A" }}>
//                 <th>Rank</th>
//                 <th>Employee</th>
//                 <th>Score</th>
//               </tr>
//             </thead>
//             <tbody>
//               {allEmployeesByScore.map((employee) => {
//                 const bagColor = Number(employee.totalScore) > 0 ? "#EBFAE6" : "#FAE8E6";
//                 const svgSrc = rankSvg(employee.rank);

//                 return (
//                   <tr key={employee.employeeId} style={{ backgroundColor: "transparent" }}>
//                     <td
//                       style={{
//                         borderTopLeftRadius: "10px",
//                         borderBottomLeftRadius: "10px",
//                         backgroundColor: bagColor,
//                         fontSize: "14px",
//                         textAlign: "center",
//                         padding: "12px 8px",
//                       }}
//                     >
//                       <div
//                         className="d-flex align-items-center justify-content-center me-3"
//                         style={{
//                           width: "32px",
//                           height: "32px",
//                           borderRadius: "50%",
//                           backgroundColor: rankBadgeColor(employee.rank),
//                           color: rankTextColor(employee.rank),
//                           fontWeight: "bold",
//                           fontSize: "14px",
//                         }}
//                       >
//                         {employee.rank}
//                       </div>
//                     </td>

//                     <td style={{ backgroundColor: bagColor, padding: "12px 8px" }}>
//                       <div className="d-flex flex-row align-items-center gap-2">
//                         <div className="position-relative">
//                           <img
//                             src={employee.avatar}
//                             alt="Avatar"
//                             className="rounded-circle"
//                             style={{ width: "30px", height: "30px" }}
//                           />
//                           {svgSrc && (
//                             <span className="position-absolute top-100 start-100 translate-middle badge rounded-pill">
//                               <SVG
//                                 src={svgSrc}
//                                 className="menu-svg-icon"
//                                 style={{ marginTop: "-20px", marginLeft: "-20px" }}
//                               />
//                             </span>
//                           )}
//                         </div>
//                         <div className="d-flex flex-column ms-2">
//                           <span style={{ fontSize: "15px", color: "black" }}>{employee.name}</span>
//                         </div>
//                       </div>
//                     </td>

//                     <td
//                       style={{
//                         borderTopRightRadius: "10px",
//                         borderBottomRightRadius: "10px",
//                         backgroundColor: bagColor,
//                         fontSize: "14px",
//                         color: "black",
//                         textAlign: "center",
//                         padding: "12px 8px",
//                       }}
//                     >
//                       {renderEmployeeStats(employee)}
//                     </td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//           </Table>
//         </Modal.Body>
//       </Modal>

//       {/* ── Top Employees By Factors ─────────────────────────────────────────── */}
//       <Row>
//         <CommonCard>
//           <h3>Top Employees By Factors</h3>
//           <Row className="gy-3 gx-2">
//             {topEmployeeByModule?.length > 0 &&
//               overviewData?.map((item, index) => {
//                 const moduleName = item.label.toLowerCase().trim();
//                 const topEmployee = topEmployeeByModule.find(
//                   (m: any) => m.moduleName.toLowerCase().trim() === moduleName
//                 );
//                 const employee = topEmployee?.employees?.[0]?.employeeData;
//                 const scoreToShow = topEmployee?.employees?.[0]?.score;

//                 return (
//                   <Col key={index} xs={12} sm={6} md={4}>
//                     <div
//                       className="d-flex align-items-center justify-content-between"
//                       style={{
//                         backgroundColor: "#ffffff",
//                         borderRadius: "8px",
//                         border: "1.5px solid #D4DBE4",
//                         padding: "12px",
//                         height: "100%",
//                       }}
//                     >
//                       <div className="d-flex align-items-center gap-2" style={{ padding: "6px 8px" }}>
//                         <img
//                           src={item.icon}
//                           alt={item.label}
//                           style={{ width: "20px", height: "20px" }}
//                         />
//                         <span>{item.label}</span>
//                       </div>
//                       <div className="d-flex flex-row align-items-center gap-2">
//                         <div className="position-relative">
//                           <img
//                             src={getEmployeeAvatar(
//                               employee?.employee?.avatar,
//                               employee?.employee?.gender || 0
//                             )}
//                             alt="Avatar"
//                             className="rounded-circle"
//                             style={{ width: "40px", height: "40px" }}
//                           />
//                         </div>
//                         <div className="d-flex flex-column ms-2">
//                           <span style={{ fontSize: "12px", color: "black" }}>
//                             {employee?.employee?.firstName && employee?.employee?.lastName
//                               ? `${employee.employee.firstName} ${employee.employee.lastName}`
//                               : "-NA-"}
//                           </span>
//                           <span style={{ fontSize: "14px", color: "black" }}>
//                             {Number(scoreToShow) > 0
//                               ? `+${formatScore(scoreToShow)}`
//                               : formatScore(Number(scoreToShow) || 0)}
//                           </span>
//                         </div>
//                       </div>
//                     </div>
//                   </Col>
//                 );
//               })}
//           </Row>
//         </CommonCard>
//       </Row>

//       {/* ── Star Employees Section ───────────────────────────────────────────── */}
//       <Row>
//         <CommonCard>
//           <h3>Star Employees</h3>

//           {topEmployeeByFactor.map((item: any, index: number) => {
//             const employeeData: any[] = item[1];
//             const moduleName: string = item[0];

//             return (
//               <div key={index}>
//                 {/* Module header */}
//                 <div
//                   style={{
//                     display: "flex",
//                     flexDirection: "row",
//                     alignItems: "center",
//                     gap: "10px",
//                   }}
//                 >
//                   <div
//                     style={{
//                       width: 40,
//                       height: 40,
//                       borderRadius: "50%",
//                       display: "flex",
//                       alignItems: "center",
//                       justifyContent: "center",
//                       backgroundColor: "#E4E7EB",
//                     }}
//                   >
//                     {moduleName === "Attendance" ? (
//                       <svg
//                         xmlns="http://www.w3.org/2000/svg"
//                         width="24"
//                         height="24"
//                         viewBox="0 0 24 24"
//                         fill="none"
//                       >
//                         <g clipPath="url(#clip0_15710_47268)">
//                           <path
//                             d="M19.5 3.75H4.5C4.08579 3.75 3.75 4.08579 3.75 4.5V19.5C3.75 19.9142 4.08579 20.25 4.5 20.25H19.5C19.9142 20.25 20.25 19.9142 20.25 19.5V4.5C20.25 4.08579 19.9142 3.75 19.5 3.75Z"
//                             stroke="#6C6F74"
//                             strokeWidth="1.5"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           />
//                           <path
//                             d="M16.5 2.25V5.25"
//                             stroke="#6C6F74"
//                             strokeWidth="1.5"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           />
//                           <path
//                             d="M7.5 2.25V5.25"
//                             stroke="#6C6F74"
//                             strokeWidth="1.5"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           />
//                           <path
//                             d="M3.75 8.25H20.25"
//                             stroke="#6C6F74"
//                             strokeWidth="1.5"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           />
//                           <path
//                             d="M8.625 14.25L10.875 16.5L15.375 12"
//                             stroke="#6C6F74"
//                             strokeWidth="1.5"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           />
//                         </g>
//                         <defs>
//                           <clipPath id="clip0_15710_47268">
//                             <rect width="24" height="24" fill="white" />
//                           </clipPath>
//                         </defs>
//                       </svg>
//                     ) : (
//                       <svg
//                         xmlns="http://www.w3.org/2000/svg"
//                         width="24"
//                         height="24"
//                         viewBox="0 0 24 24"
//                         fill="none"
//                       >
//                         <g clipPath="url(#clip0_15710_47285)">
//                           <path
//                             d="M11.9992 5.25L14.9992 4.5C14.9992 4.5 17.4817 8.37656 18.6461 12.7228C18.7497 13.1039 18.777 13.5016 18.7265 13.8933C18.676 14.2849 18.5487 14.6627 18.3518 15.005C18.155 15.3474 17.8925 15.6475 17.5794 15.8881C17.2663 16.1288 16.9088 16.3052 16.5274 16.4074C16.1459 16.5096 15.7481 16.5355 15.3566 16.4835C14.9652 16.4316 14.5878 16.3029 14.2462 16.1048C13.9046 15.9067 13.6055 15.6432 13.366 15.3292C13.1265 15.0153 12.9513 12.4071 12.8505 14.2753C11.6861 9.92906 11.9992 5.25 11.9992 5.25Z"
//                             stroke="#6C6F74"
//                             strokeWidth="1.5"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           />
//                           <path
//                             d="M16.5254 16.3965L17.8716 21.4187"
//                             stroke="#6C6F74"
//                             strokeWidth="1.5"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           />
//                           <path
//                             d="M20.25 20.7812L15.75 21.9869"
//                             stroke="#6C6F74"
//                             strokeWidth="1.5"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           />
//                           <path
//                             d="M11.9999 3L8.99993 2.25C8.99993 2.25 6.51743 6.12656 5.35305 10.4728C5.24949 10.8539 5.22218 11.2516 5.27268 11.6433C5.32319 12.0349 5.45051 12.4127 5.64736 12.755C5.8442 13.0974 6.10669 13.3975 6.41977 13.6381C6.73285 13.8788 7.09036 14.0552 7.47179 14.1574C7.85323 14.2596 8.25108 14.2855 8.64253 14.2335C9.03399 14.1816 9.41134 14.0529 9.75294 13.8548C10.0945 13.6567 10.3937 13.3932 10.6332 13.0792C10.8727 12.7653 11.0479 12.4071 11.1487 12.0253C12.2146 7.66875 11.9999 3 11.9999 3Z"
//                             stroke="#6C6F74"
//                             strokeWidth="1.5"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           />
//                           <path
//                             d="M7.47516 14.1465L6.12891 19.1687"
//                             stroke="#6C6F74"
//                             strokeWidth="1.5"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           />
//                           <path
//                             d="M3.75 18.5312L8.25 19.7369"
//                             stroke="#6C6F74"
//                             strokeWidth="1.5"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           />
//                           <path
//                             d="M12.0469 9.17625L16.8703 7.96875"
//                             stroke="#6C6F74"
//                             strokeWidth="1.5"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           />
//                           <path
//                             d="M11.8987 7.09992L7.05273 5.88867"
//                             stroke="#6C6F74"
//                             strokeWidth="1.5"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           />
//                           <path
//                             d="M18 3.75L19.5 3"
//                             stroke="#6C6F74"
//                             strokeWidth="1.5"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           />
//                           <path
//                             d="M19.5 6.75H21"
//                             stroke="#6C6F74"
//                             strokeWidth="1.5"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           />
//                           <path
//                             d="M5.25 3L3.75 2.25"
//                             stroke="#6C6F74"
//                             strokeWidth="1.5"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           />
//                           <path
//                             d="M3.75 6H2.25"
//                             stroke="#6C6F74"
//                             strokeWidth="1.5"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           />
//                         </g>
//                         <defs>
//                           <clipPath id="clip0_15710_47285">
//                             <rect width="24" height="24" fill="white" />
//                           </clipPath>
//                         </defs>
//                       </svg>
//                     )}
//                   </div>
//                   <h4
//                     style={{
//                       color: "#000",
//                       fontFamily: "Barlow",
//                       fontSize: "19px",
//                       fontWeight: 600,
//                       lineHeight: "normal",
//                       letterSpacing: "0.19px",
//                       margin: "20px 0",
//                     }}
//                   >
//                     {moduleName}
//                   </h4>
//                 </div>

//                 {/* Factor rows */}
//                 <div>
//                   {employeeData.map((employee: any, empIndex: number) => {
//                     const factorType = employee?.starEmployees?.[0]?.factor?.type;

//                     const starEmployeeIds = new Set(
//                       (employee?.starEmployees || []).map((se: any) => se.employeeId)
//                     );

//                     const missingAsStarEmployees = (allemployees || [])
//                       .filter((emp: any) => !starEmployeeIds.has(emp.employeeId))
//                       .map((emp: any) => ({
//                         employeeId: emp.employeeId,
//                         value: "0",
//                         score: "0",
//                         module: null,
//                         factor: employee?.starEmployees?.[0]?.factor || null,
//                         employee: {
//                           id: emp.employeeId,
//                           avatar: emp.avatar,
//                           firstName: emp.employeeName?.split(" ")[0] || "",
//                           lastName: emp.employeeName?.split(" ").slice(1).join(" ") || "",
//                           gender: emp.gender,
//                         },
//                       }));

//                     const allStarEmployees: any[] = [
//                       ...(employee?.starEmployees || []).map((emp: any) => ({
//                         ...emp,
//                         maxValue: getMaxValueFromFactor(employee.factorName),
//                       })),
//                       ...missingAsStarEmployees.map((emp: any) => ({
//                         ...emp,
//                         maxValue: getMaxValueFromFactor(employee.factorName),
//                       })),
//                     ];

//                     const sortedStarEmployees = [...allStarEmployees].sort((a, b) => {
//                       const scoreA = Number(a.score);
//                       const scoreB = Number(b.score);
//                       return factorType === "NEGATIVE" ? scoreA - scoreB : scoreB - scoreA;
//                     });

//                     const getEmpName = (empEntry: any) => {
//                       const first = empEntry?.employee?.firstName || "";
//                       const last = empEntry?.employee?.lastName || "";
//                       return (first + " " + last).trim() || "-NA-";
//                     };

//                     const rankColors = ["#2bb07b", "#b58320", "#7959db", "#717171", "#717171"];
//                     const rankLabels = [
//                       { num: "1", suffix: "st" },
//                       { num: "2", suffix: "nd" },
//                       { num: "3", suffix: "rd" },
//                       { num: "4", suffix: "th" },
//                       { num: "5", suffix: "th" },
//                     ];

//                     return (
//                       <div key={empIndex} style={{ marginBottom: "20px" }}>
//                         <div
//                           style={{
//                             background: factorType === "NEGATIVE" ? "#fbecec" : "#eaf3de",
//                             padding: "20px 28px",
//                             borderRadius: "12px",
//                             boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
//                           }}
//                         >
//                           <div style={{ marginBottom: "16px" }}>
//                             <div
//                               style={{
//                                 color: "#000",
//                                 fontFamily: "Barlow",
//                                 fontSize: "16px",
//                                 fontWeight: 600,
//                                 letterSpacing: "0.16px",
//                               }}
//                             >
//                               {employee.factorName}
//                             </div>
//                           </div>

//                           <div
//                             style={{
//                               display: "flex",
//                               flexDirection: "row",
//                               gap: "16px",
//                               alignItems: "center",
//                               overflowX: "auto",
//                               overflowY: "hidden",
//                               minHeight: "80px",
//                             }}
//                             className="no-scrollbar"
//                           >
//                             {[0, 1, 2, 3, 4].map((slotIdx) => {
//                               const empEntry = sortedStarEmployees[slotIdx];
//                               if (!empEntry) return null;

//                               return (
//                                 <div
//                                   key={slotIdx}
//                                   style={{
//                                     display: "flex",
//                                     alignItems: "center",
//                                     gap: "16px",
//                                     minWidth: "180px",
//                                     flexShrink: 0,
//                                   }}
//                                 >
//                                   <div className="position-relative" style={{ flexShrink: 0 }}>
//                                     <img
//                                       src={getEmployeeAvatar(
//                                         empEntry?.employee?.avatar || "",
//                                         empEntry?.employee?.gender || 0
//                                       )}
//                                       alt="Avatar"
//                                       className="rounded-circle shadow-sm"
//                                       style={{
//                                         width: "80px",
//                                         height: "80px",
//                                         border: "1px solid #ffffffff",
//                                         objectFit: "cover",
//                                       }}
//                                     />
//                                     <div
//                                       style={{
//                                         position: "absolute",
//                                         bottom: "-4px",
//                                         left: "32px",
//                                         background: rankColors[slotIdx],
//                                         borderRadius: "32px",
//                                         width: "28px",
//                                         height: "28px",
//                                         display: "flex",
//                                         alignItems: "center",
//                                         justifyContent: "center",
//                                         border: "2px solid white",
//                                       }}
//                                     >
//                                       <span
//                                         style={{
//                                           fontFamily: "Inter",
//                                           fontSize: "12px",
//                                           fontWeight: 600,
//                                           color: "white",
//                                           whiteSpace: "nowrap",
//                                         }}
//                                       >
//                                         {rankLabels[slotIdx].num}
//                                         <span style={{ fontSize: "9px" }}>
//                                           {rankLabels[slotIdx].suffix}
//                                         </span>
//                                       </span>
//                                     </div>
//                                   </div>
//                                   <div
//                                     style={{
//                                       display: "flex",
//                                       flexDirection: "column",
//                                       gap: "3px",
//                                       flex: 1,
//                                       overflow: "hidden",
//                                       minWidth: 0,
//                                     }}
//                                   >
//                                     <span
//                                       style={{
//                                         color: "#000",
//                                         fontFamily: "Inter",
//                                         fontSize: "16px",
//                                         fontWeight: 600,
//                                         whiteSpace: "nowrap",
//                                         overflow: "hidden",
//                                         textOverflow: "ellipsis",
//                                       }}
//                                     >
//                                       {getEmpName(empEntry)}
//                                     </span>
//                                     <span
//                                       style={{
//                                         fontSize: "15px",
//                                         fontWeight: 700,
//                                         whiteSpace: "nowrap",
//                                         overflow: "hidden",
//                                         textOverflow: "ellipsis",
//                                       }}
//                                     >
//                                       {formatNumber(empEntry?.score)} /{" "}
//                                       {formatNumber(
//                                         empEntry?.maxValue || employee?.factor?.employeeMaxScore || 0
//                                       )}
//                                     </span>
//                                     <span
//                                       style={{
//                                         fontSize: "14px",
//                                         color: "#295d8e",
//                                         whiteSpace: "nowrap",
//                                         overflow: "hidden",
//                                         textOverflow: "ellipsis",
//                                       }}
//                                     >
//                                       {formatNumber(empEntry?.value)} /{" "}
//                                       {formatNumber(empEntry?.maxValue || 0)}{" "}
//                                       {getFactorUnit(employee.factorName)}
//                                     </span>
//                                     <span
//                                       style={{
//                                         fontSize: "13px",
//                                         color: "#6c757d",
//                                         whiteSpace: "nowrap",
//                                         overflow: "hidden",
//                                         textOverflow: "ellipsis",
//                                       }}
//                                     >
//                                       {getContextLabel(employee.factorName, empEntry?.value)}
//                                     </span>
//                                   </div>
//                                 </div>
//                               );
//                             })}

//                             {/* View All */}
//                             <button
//                               className="btn btn-link"
//                               style={{
//                                 color: "#9D4141",
//                                 cursor: "pointer",
//                                 textDecoration: "none",
//                                 fontSize: "14px",
//                                 fontWeight: 500,
//                                 display: "flex",
//                                 alignItems: "center",
//                                 gap: "8px",
//                                 padding: "4px 8px",
//                                 flexShrink: 0,
//                               }}
//                               onClick={() => {
//                                 const sorted = [...allStarEmployees].sort((a, b) => {
//                                   const scoreA = Number(a.score);
//                                   const scoreB = Number(b.score);
//                                   return factorType === "NEGATIVE"
//                                     ? scoreA - scoreB
//                                     : scoreB - scoreA;
//                                 });
//                                 setStarEmployeeDataByAFactor(sorted);
//                                 setStarEmployeeDataFactorName(employee?.factorName);
//                                 setShowAllStarEmployeesByAFactor(true);
//                               }}
//                             >
//                               <svg
//                                 width="16"
//                                 height="16"
//                                 viewBox="0 0 16 16"
//                                 fill="none"
//                                 xmlns="http://www.w3.org/2000/svg"
//                               >
//                                 <path
//                                   d="M8 4V12M4 8H12"
//                                   stroke="#9D4141"
//                                   strokeWidth="2"
//                                   strokeLinecap="round"
//                                   strokeLinejoin="round"
//                                 />
//                               </svg>
//                               View All
//                             </button>
//                           </div>
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
//             );
//           })}
//         </CommonCard>
//       </Row>

//       {/* ── Star Employees by Factor Modal ──────────────────────────────────── */}
//       <Modal
//         show={showAllStarEmployeesByAFactor}
//         onHide={() => setShowAllStarEmployeesByAFactor(false)}
//         dialogClassName="custom-modal-width"
//         centered
//       >
//         <Modal.Body style={{ padding: "30px 40px" }}>
//           <style jsx>{`
//             .custom-modal-width {
//               max-width: 700px !important;
//               width: 95%;
//             }
//           `}</style>

//           {/* Header */}
//           <div
//             style={{
//               display: "flex",
//               justifyContent: "space-between",
//               alignItems: "flex-end",
//               paddingBottom: "12px",
//             }}
//           >
//             <div>
//               <div style={{ fontSize: "20px", fontWeight: "bold" }}>Star Employees</div>
//               <div style={{ fontSize: "16px", fontWeight: "bold" }}>
//                 {starEmployeeDataFactorName}
//               </div>
//             </div>

//             <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
//               <div
//                 style={{
//                   fontSize: "16px",
//                   fontWeight: "bold",
//                   color: "#70829A",
//                   minWidth: "100px",
//                   textAlign: "center",
//                 }}
//               >
//                 Score
//               </div>
//               <div style={{ height: "20px", width: "1px", backgroundColor: "#D4DBE4" }} />
//               <div
//                 style={{
//                   fontSize: "16px",
//                   fontWeight: "bold",
//                   color: "#70829A",
//                   minWidth: "120px",
//                   textAlign: "center",
//                 }}
//               >
//                 {getFactorUnit(starEmployeeDataFactorName) === "req"
//                   ? "Request"
//                   : getFactorUnit(starEmployeeDataFactorName) || "Metrics"}
//               </div>
//             </div>
//           </div>

//           {/* List */}
//           <div
//             style={{
//               marginTop: "20px",
//               display: "flex",
//               flexDirection: "column",
//               gap: "12px",
//             }}
//           >
//             {starEmployeeDataByAFactor.map((employee: any, index: number) => {
//               const bagColor = Number(employee?.score) > 0 ? "#EBFAE6" : "#FAE8E6";
//               const svgSrc = rankSvg(index + 1);

//               const employeeName =
//                 `${employee?.employee?.firstName || ""} ${employee?.employee?.lastName || ""}`.trim() ||
//                 "-NA-";

//               const avatar = getEmployeeAvatar(
//                 employee?.employee?.avatar || "",
//                 employee?.employee?.gender || 0
//               );

//               const score = employee?.score;
//               const maxScore = employee?.factor?.employeeMaxScore || 0;
//               const value = employee?.value;
//               const maxValue = employee?.maxValue;
//               const unit = getFactorUnit(starEmployeeDataFactorName);

//               return (
//                 <div
//                   key={employee.employeeId || index}
//                   style={{
//                     backgroundColor: bagColor,
//                     borderRadius: "12px",
//                     padding: "14px 18px",
//                     display: "flex",
//                     alignItems: "center",
//                     gap: "16px",
//                   }}
//                 >
//                   <div
//                     style={{
//                       fontSize: "14px",
//                       fontWeight: "bold",
//                       color: "#70829A",
//                       minWidth: "24px",
//                     }}
//                   >
//                     {index + 1}.
//                   </div>

//                   <div
//                     style={{
//                       display: "flex",
//                       alignItems: "center",
//                       gap: "14px",
//                       flex: 1,
//                       minWidth: 0,
//                     }}
//                   >
//                     <div style={{ position: "relative", flexShrink: 0 }}>
//                       <img
//                         src={avatar}
//                         alt="Avatar"
//                         style={{
//                           width: "50px",
//                           height: "50px",
//                           borderRadius: "50%",
//                           objectFit: "cover",
//                           border: "1px solid #E4E7EB",
//                         }}
//                       />
//                       {svgSrc && (
//                         <span className="position-absolute top-100 start-100 translate-middle">
//                           <SVG
//                             src={svgSrc}
//                             style={{
//                               width: "18px",
//                               height: "18px",
//                               marginTop: "-16px",
//                               marginLeft: "-16px",
//                             }}
//                           />
//                         </span>
//                       )}
//                     </div>

//                     <div
//                       style={{
//                         flex: 1,
//                         minWidth: "200px",
//                         marginRight: "10px",
//                       }}
//                     >
//                       <span
//                         style={{
//                           fontSize: "15px",
//                           fontWeight: 600,
//                           color: "#212529",
//                           whiteSpace: "normal",
//                           wordBreak: "normal",
//                           overflowWrap: "break-word",
//                         }}
//                       >
//                         {employeeName}
//                       </span>
//                     </div>

//                     <div
//                       style={{
//                         display: "flex",
//                         alignItems: "center",
//                         gap: "16px",
//                         flexShrink: 0,
//                       }}
//                     >
//                       <div style={{ minWidth: "100px", textAlign: "center" }}>
//                         <span style={{ fontSize: "14px", fontWeight: 700 }}>
//                           {formatNumber(score)} / {formatNumber(maxScore)}
//                         </span>
//                       </div>

//                       <div
//                         style={{ height: "28px", width: "1px", backgroundColor: "#D4DBE4" }}
//                       />

//                       <div style={{ minWidth: "120px", textAlign: "center" }}>
//                         <span style={{ fontSize: "13px", fontWeight: 600, color: "#295d8e" }}>
//                           {formatNumber(value)} / {formatNumber(maxValue)} {unit}
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </Modal.Body>
//       </Modal>
//     </>
//   );
// }

// export default LeaderBoardCore;