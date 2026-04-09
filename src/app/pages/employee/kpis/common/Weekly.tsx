import React, { useEffect, useMemo, useState } from "react";
import { Container, Spinner } from "react-bootstrap";
import { useSelector } from "react-redux";
import dayjs, { Dayjs } from "dayjs";

import { RootState } from "@redux/store";
import { fetchEmpWeeklyKpiStatistics } from "@utils/statistics";
import PerformanceBadge from "../personal/components/PerformanceBadge";
import ScoreOverview from "../personal/components/ScoreOverview";
import KpiStatisticsTable from "../personal/components/KpiStatisticsTable";

import AttendanceIcon from "@metronic/assets/miscellaneousicons/attendance.svg";
import LeavesIcon from "@metronic/assets/miscellaneousicons/leaves.svg";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission } from "@constants/statistics";
import { useLeaderboardRank } from "../personal/hooks/useLeaderboardRank";
import LeaderBoardCore from "./LeaderBoardCore";

const iconMapping: Record<string, string> = {
  Attendance: AttendanceIcon,
  Leaves: LeavesIcon,
  Projects: AttendanceIcon,
  Tasks: AttendanceIcon,
  Sale: AttendanceIcon,
  Target: AttendanceIcon,
  Performance: AttendanceIcon,
  "Ratings & Reviews": AttendanceIcon,
};

interface WeeklyProps {
  startWeek: Dayjs;
  endWeek: Dayjs;
  fromAdmin?: boolean;
  dateSettingsEnabled?: boolean;
  resourseAndView: any[];
  dashboardView?: boolean;
}

const Weekly: React.FC<WeeklyProps> = ({
  startWeek,
  endWeek,
  fromAdmin = false,
  resourseAndView,
  dateSettingsEnabled = false,
  dashboardView = true,
}) => {
  const toggleChange = useSelector(
    (state: RootState) => state.attendanceStats.toggleChange
  );

  const selectedEmployeeId = useSelector((state: RootState) =>
    fromAdmin
      ? state.employee.selectedEmployee?.id
      : state.employee.currentEmployee.id
  );

  const [data, setData] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee?.id
  );
  const [showData, setShowData] = useState(false);
  const [remark, setRemark] = useState<string>("");
  const [yourPoints, setYourPoints] = useState<number>(0);
  const [maxTotal, setMaxTotal] = useState<number>(0);

  const today = dayjs();
  const isCurrentWeek =
    (today.isAfter(startWeek, "day") && today.isBefore(endWeek, "day")) ||
    today.isSame(startWeek, "day") ||
    today.isSame(endWeek, "day");
  const effectiveEndDate = dateSettingsEnabled && isCurrentWeek ? today : endWeek;

  // FIX: Memoize date strings so useLeaderboardRank deps are stable strings,
  // not Dayjs objects (which create new references on every render).
  const startDateStr = useMemo(
    () => startWeek.format("YYYY-MM-DD"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startWeek.format("YYYY-MM-DD")]
  );
  const endDateStr = useMemo(
    () => effectiveEndDate.format("YYYY-MM-DD"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveEndDate.format("YYYY-MM-DD")]
  );

  // FIX: useLeaderboardRank must use the SAME date range as the KPI data fetch.
  // Previously effectiveEndDate was computed inside a closure but the hook
  // received a potentially stale value. Now both use the memoized string.
  const { rank, rankLoading } = useLeaderboardRank({
    employeeId: selectedEmployeeId,
    startDate: startDateStr,
    endDate: endDateStr,
  });

  useEffect(() => {
    if (!selectedEmployeeId) return;

    const loadData = async () => {
      setDataLoaded(true);
      try {
        const response = await fetchEmpWeeklyKpiStatistics(
          startWeek,
          effectiveEndDate,
          fromAdmin
        );
        if (response) {
          setData(response.modules || []);
          setRemark(response.remark || "");
          setYourPoints(response.yourPoints || 0);
          setMaxTotal(response.maxTotal || 0);
        }
      } catch (error) {
        console.error("Error fetching Weekly KPI Statistics:", error);
      } finally {
        setDataLoaded(false);
      }
    };

    loadData();
  }, [selectedEmployeeId, startDateStr, endDateStr, toggleChange]);

  useEffect(() => {
    if (!employeeId) return;
    const res = hasPermission(
      resourseAndView[0]?.resource,
      permissionConstToUseWithHasPermission.readOthers
    );
    if (res) setShowData(true);
  }, [employeeId]);

  const overviewData = [
    "Attendance",
    "Leaves",
    "Projects",
    "Tasks",
    "Sale",
    "Target",
    "Performance",
    "Ratings & Reviews",
  ].map((label) => ({
    icon: iconMapping[label],
    label,
    totalScore: data.find((m) => m.moduleName === label)?.totalScore ?? 0,
  }));

  if (dataLoaded) {
    return (
      <Container
        fluid
        className="my-4 w-100 px-0 d-flex justify-content-center align-items-center"
        style={{ minHeight: "300px" }}
      >
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  if (!showData) return <h2 className="text-center">Not Allowed To View</h2>;

  return (
    <>
      <LeaderBoardCore
        overviewData={overviewData}
        startDate={startWeek}
        endDate={effectiveEndDate}
        fromAdmin={fromAdmin}
        resourseAndView={resourseAndView}
      />
    </>
  );
};

export default Weekly;