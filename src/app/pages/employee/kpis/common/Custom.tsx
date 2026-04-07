import dayjs, { Dayjs } from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { useEffect, useMemo, useState } from "react";
import { fetchEmpYearlyKpiStatistics } from "@utils/statistics";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { resourseAndView } from "@models/company";
import AttendanceIcon from "@metronic/assets/miscellaneousicons/attendance.svg";
import LeavesIcon from "@metronic/assets/miscellaneousicons/leaves.svg";
import { Container, Spinner } from "react-bootstrap";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission } from "@constants/statistics";
import { useLeaderboardRank } from "../personal/hooks/useLeaderboardRank";
import LeaderBoardCore from "./LeaderBoardCore";

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

interface CustomProps {
  startDate: Dayjs;
  endDate: Dayjs;
  fromAdmin?: boolean;
  resourseAndView: resourseAndView[];
}

const Custom: React.FC<CustomProps> = ({
  startDate,
  endDate,
  fromAdmin = false,
  resourseAndView,
}) => {
  const toggleChange = useSelector(
    (state: RootState) => state.attendanceStats.toggleChange
  );

  const selectedEmployeeId = useSelector((state: RootState) =>
    fromAdmin
      ? state.employee.selectedEmployee?.id
      : state.employee?.currentEmployee?.id
  );

  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee?.id
  );
  const [showData, setShowData] = useState(false);

  const [remark, setRemark] = useState<string>("");
  const [yourPoints, setYourPoints] = useState<number>(0);
  const [maxTotal, setMaxTotal] = useState<number>(0);

  // FIX: Memoize to stable strings — Custom receives concrete start/end from
  // the date-pickers, so use them directly without any conditional adjustment.
  const startDateStr = useMemo(
    () => startDate.format("YYYY-MM-DD"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startDate.format("YYYY-MM-DD")]
  );
  const endDateStr = useMemo(
    () => endDate.format("YYYY-MM-DD"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endDate.format("YYYY-MM-DD")]
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
        const response = await fetchEmpYearlyKpiStatistics(startDate, fromAdmin, {
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
        console.error("Error fetching Custom KPI Statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [startDateStr, endDateStr, toggleChange, selectedEmployeeId]);

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
    totalScore: data?.find((m: any) => m.moduleName === label)?.totalScore ?? 0,
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
      <LeaderBoardCore
        overviewData={overviewData}
        startDate={startDate}
        endDate={endDate}
        fromAdmin={fromAdmin}
        resourseAndView={resourseAndView}
      />
    </>
  );
};

export default Custom;