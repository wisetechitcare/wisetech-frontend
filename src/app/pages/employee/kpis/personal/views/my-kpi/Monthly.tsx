import dayjs, { Dayjs } from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { useEffect, useState } from "react";
import { fetchEmpMonthlyKpiStatistics } from "@utils/statistics";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import KpiStatisticsTable from "../../components/KpiStatisticsTable";
import { resourseAndView } from "@models/company";
import AttendanceIcon from "@metronic/assets/miscellaneousicons/attendance.svg";
import LeavesIcon from "@metronic/assets/miscellaneousicons/leaves.svg";
import ScoreOverview from "../../components/ScoreOverview";
import PerformanceBadge from "../../components/PerformanceBadge";
import { Container, Spinner } from "react-bootstrap";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission } from "@constants/statistics";

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

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

interface MonthlyProps {
  month: Dayjs;
  endDate: Dayjs;
  fromAdmin?: boolean;
  resourseAndView: resourseAndView[];
  dateSettingsEnabled?: boolean;
  dashboardView?: boolean;
}

const Monthly: React.FC<MonthlyProps> = ({
  month,
  endDate,
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
  const [loading, setLoading] = useState<boolean>(false);
  const [showData, setShowData] = useState(false);

  const effectiveEndDate: Dayjs =
    dateSettingsEnabled && month.isSame(dayjs(), "month")
      ? endDate
      : month.endOf("month");

  useEffect(() => {
    if (!selectedEmployeeId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const response = await fetchEmpMonthlyKpiStatistics(
          month,
          fromAdmin,
          {
            startDate: month.startOf("month"),
            endDate: effectiveEndDate,
          }
        );

        console.log("🔥 KPI RESPONSE:", response); // ✅ MANDATORY LOG

        if (response) {
          setData(response); // ✅ FIXED
        }
      } catch (error) {
        console.error("Error fetching Monthly KPI Statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedEmployeeId, month, endDate, toggleChange, dateSettingsEnabled]);

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
      {remark && (
        <PerformanceBadge
          remark={remark}
          rank={rank}
          yourPoints={yourPoints}
          maxTotal={maxTotal}
          fromAdmin={fromAdmin}
        />
      )}

      <ScoreOverview data={overviewData} />

      {dashboardView && (
        <Container fluid className="my-4 px-0">
          <KpiStatisticsTable data={modules} />
        </Container>
      )}
    </>
  );
};

export default Monthly;