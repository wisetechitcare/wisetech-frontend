import dayjs, { Dayjs } from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { useEffect, useMemo, useState } from "react";
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
import { useLeaderboardRank } from "../../hooks/useLeaderboardRank";

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

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

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
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const selectedEmployeeId = useSelector((state: RootState) =>
    fromAdmin
      ? state.employee.selectedEmployee?.id
      : state.employee.currentEmployee.id
  );
  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee?.id
  );
  const [showData, setShowData] = useState(false);
  const [remark, setRemark] = useState<string>("");
  const [yourPoints, setYourPoints] = useState<number>(0);
  const [maxTotal, setMaxTotal] = useState<number>(0);

  const effectiveEndDate: Dayjs =
    dateSettingsEnabled && month.isSame(dayjs(), "month")
      ? endDate
      : month.endOf("month");

  // FIX: Memoize to stable strings so hook dependencies don't thrash.
  const startDateStr = useMemo(
    () => month.startOf("month").format("YYYY-MM-DD"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [month.format("YYYY-MM")]
  );
  const endDateStr = useMemo(
    () => effectiveEndDate.format("YYYY-MM-DD"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveEndDate.format("YYYY-MM-DD")]
  );

  // FIX: Rank hook uses the SAME date range as the KPI data fetch.
  const { rank, rankLoading } = useLeaderboardRank({
    employeeId: selectedEmployeeId,
    startDate: startDateStr,
    endDate: endDateStr,
  });

  useEffect(() => {
    if (!selectedEmployeeId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const response = await fetchEmpMonthlyKpiStatistics(month, fromAdmin, {
          startDate: dayjs(startDateStr),
          endDate: dayjs(endDateStr),
        });

        if (response) {
          setData(response.modules);
          setRemark(response.remark || "");
          setYourPoints(response.yourPoints || 0);
          setMaxTotal(response.maxTotal || 0);
        }
      } catch (error) {
        console.error("Error fetching Monthly KPI Statistics:", error);
      } finally {
        setLoading(false);
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
    score: data?.find((m: any) => m.moduleName === label)?.totalScore ?? 0,
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

  if (!showData) return <h2 className="text-center">Not Allowed To View</h2>;

  return (
    <>
      {remark && (
        <PerformanceBadge
          remark={remark}
          rank={rank}
          rankLoading={rankLoading}
          yourPoints={yourPoints}
          maxTotal={maxTotal}
          fromAdmin={fromAdmin}
        />
      )}
      <ScoreOverview data={overviewData} />
      {dashboardView ? (
        <Container fluid className="my-4 px-0">
          <KpiStatisticsTable data={data} />
        </Container>
      ) : null}
    </>
  );
};

export default Monthly;
