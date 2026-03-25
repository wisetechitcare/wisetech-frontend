import dayjs, { Dayjs } from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { useEffect, useMemo, useState } from "react";
import { fetchEmpYearlyKpiStatistics } from "@utils/statistics";
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

interface YearlyProps {
  year: Dayjs;
  endDate: Dayjs;
  fromAdmin?: boolean;
  resourseAndView: resourseAndView[];
  dateSettingsEnabled?: boolean;
  dashboardView?: boolean;
}

const Yearly: React.FC<YearlyProps> = ({
  year,
  endDate,
  fromAdmin = false,
  resourseAndView,
  dateSettingsEnabled = false,
  dashboardView = true,
}) => {
  const toggleChange = useSelector(
    (state: RootState) => state.attendanceStats.toggleChange
  );

  const selectedEmployeeId = useSelector((state:RootState)=> fromAdmin? state.employee.selectedEmployee.id : state?.employee?.currentEmployee.id)

  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee?.id);
  const [showData, setShowData] = useState(false)

  const [remark, setRemark] = useState<string>("");
  const [rank, setRank] = useState<number>(0);
  const [yourPoints, setYourPoints] = useState<number>(0);
  const [maxTotal, setMaxTotal] = useState<number>(0);

  // Use fiscal dates directly from toggle (toggle already handles dateSettingsEnabled)
  const startDateStr = useMemo(
    () => year.format("YYYY-MM-DD"),  // Fiscal year start as-is
    [year.format("YYYY-MM-DD")]
  );

  const endDateStr = useMemo(
    () => endDate.format("YYYY-MM-DD"),  // Toggle already calculated correct endDate
    [endDate.format("YYYY-MM-DD")]
  );

  useEffect(() => {
    if(!selectedEmployeeId) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await fetchEmpYearlyKpiStatistics(year, fromAdmin, {
          startDate: dayjs(startDateStr),
          endDate: dayjs(endDateStr),
        });
        if (response) {
          setData(response.modules);
          setRemark(response.remark || "");
          setRank(response.rank || 0);
          setYourPoints(response.yourPoints || 0);
          setMaxTotal(response.maxTotal || 0);
        }
      } catch (error) {
        console.error("Error fetching Yearly KPI Statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [startDateStr, endDateStr, toggleChange, selectedEmployeeId ]);

  
  useEffect(() => {
    if (!employeeId) {
      return;
    }
    const res = hasPermission(resourseAndView[0]?.resource, permissionConstToUseWithHasPermission.readOthers)
    if(res){
      setShowData(true)
    }
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


  if (!data || data.length === 0) {
    return (
      <Container fluid className="my-4 px-0">
        <p>No KPI data available for the selected period.</p>
      </Container>
    );
  }

  if(!showData) return <h2 className="text-center">Not Allowed To View</h2>
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
      {
        dashboardView ? <Container fluid className="my-4 px-0">
        <KpiStatisticsTable data={data} />
      </Container> : null
      }
    </>
  );
};

export default Yearly;