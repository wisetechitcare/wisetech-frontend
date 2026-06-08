import React, { useEffect, useState } from "react";
import { Container, Spinner } from "react-bootstrap";
import { useSelector } from "react-redux";
import dayjs, { Dayjs } from "dayjs";

import { RootState } from "@redux/store";
import { fetchEmpWeeklyKpiStatistics } from "@utils/statistics";
import PerformanceBadge from "../../components/PerformanceBadge";
import ScoreOverview from "../../components/ScoreOverview";
import KpiStatisticsTable from "../../components/KpiStatisticsTable";

import AttendanceIcon from "@metronic/assets/miscellaneousicons/attendance.svg";
import LeavesIcon from "@metronic/assets/miscellaneousicons/leaves.svg";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission } from "@constants/statistics";

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
      : state.employee.currentEmployee?.id
  );

  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee?.id
  );

  const [data, setData] = useState<any>(null); // ✅ FIXED
  const [loading, setLoading] = useState(false);
  const [showData, setShowData] = useState(false);

  useEffect(() => {
    if (!selectedEmployeeId) return;

    const loadData = async () => {
      setLoading(true);

      try {
        const today = dayjs();

        const isCurrentWeek =
          (today.isAfter(startWeek, "day") && today.isBefore(endWeek, "day")) ||
          today.isSame(startWeek, "day") ||
          today.isSame(endWeek, "day");

        const effectiveEndDate =
          dateSettingsEnabled && isCurrentWeek ? today : endWeek;

        const response = await fetchEmpWeeklyKpiStatistics(
          startWeek,
          effectiveEndDate,
          fromAdmin
        );

        console.log("🔥 KPI RESPONSE:", response); // ✅ MANDATORY LOG

        if (response) {
          setData(response); // ✅ FIXED
        }
      } catch (error) {
        console.error("Error fetching Weekly KPI Statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedEmployeeId, startWeek, endWeek, toggleChange, dateSettingsEnabled]);

  useEffect(() => {
    if (!employeeId) return;

    const res = hasPermission(
      resourseAndView[0]?.resource,
      permissionConstToUseWithHasPermission.readOthers
    );

    if (res) setShowData(true);
  }, [employeeId]);

  // ✅ SAFE EXTRACTION
  const modules = data?.modules || [];
  const yourPoints = data?.yourPoints ?? 0;
  
  // 🔥 FINAL SAFE RANK CODE
  const rawRank = data?.rank;
  const rank =
    rawRank === null || rawRank === undefined || rawRank === 0 || rawRank === "0"
      ? null
      : rawRank;
  const remark = data?.remark || "";
  const maxTotal = Number(data?.maxTotal || 0);

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
    score:
      modules.find((m: any) => m.moduleName === label)?.totalScore ?? 0,
  }));

  if (loading) {
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

  if (!showData)
    return <h2 className="text-center">Not Allowed To View</h2>;

  return (
    <>
      {/* 🔥 KPI HEADER */}
      {remark && (
        <PerformanceBadge
          remark={remark}
          rank={rank}
          yourPoints={yourPoints}
          maxTotal={maxTotal}
          fromAdmin={fromAdmin}
        />
      )}

      {/* 🔥 OVERVIEW */}
      <ScoreOverview data={overviewData} />

      {/* 🔥 REPORT */}
      {dashboardView && (
        <Container fluid className="my-4 px-0">
          <KpiStatisticsTable data={modules} />
        </Container>
      )}
    </>
  );
};

export default Weekly;