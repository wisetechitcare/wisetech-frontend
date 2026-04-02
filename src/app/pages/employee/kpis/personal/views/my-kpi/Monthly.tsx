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
  const selectedEmployeeId = useSelector((state: RootState) => fromAdmin? state.employee.selectedEmployee?.id : state.employee.currentEmployee.id);
  // States for PerformanceBadge props
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee?.id);
  const [showData, setShowData] = useState(false)
  const [remark, setRemark] = useState<string>("");
  const [rank, setRank] = useState<number>(0);
  const [yourPoints, setYourPoints] = useState<number>(0);
  const [maxTotal, setMaxTotal] = useState<number>(0);
  const effectiveEndDate: Dayjs =
    dateSettingsEnabled && month.isSame(dayjs(), "month")
      ? endDate
      : month.endOf("month");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await fetchEmpMonthlyKpiStatistics(month, fromAdmin, {
          startDate: month.startOf("month"),
          endDate: effectiveEndDate,
        });

        if (response) {
 
          setData(response.modules);
                setRemark(response.remark || "");
          setRank(response.rank || 0 );
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
  }, [   selectedEmployeeId,
    month,endDate,
  
    dateSettingsEnabled]);

  useEffect(() => {
    if (!employeeId) {
      return;
    }
    const res = hasPermission(resourseAndView[0]?.resource, permissionConstToUseWithHasPermission.readOthers)
    if (res) {
      setShowData(true)
    }
  }, [employeeId]);

  const overviewData = [
    {
      icon: iconMapping["Attendance"],
      label: "Attendance",
      score:
        data?.find((m: any) => m.moduleName === "Attendance")?.totalScore ?? 0,
    },
    {
      icon: iconMapping["Leaves"],
      label: "Leaves",
      score: data?.find((m: any) => m.moduleName === "Leaves")?.totalScore ?? 0,
    },
    {
      icon: iconMapping["Projects"],
      label: "Projects",
      score:
        data?.find((m: any) => m.moduleName === "Projects")?.totalScore ?? 0,
    },
    {
      icon: iconMapping["Tasks"],
      label: "Tasks",
      score: data?.find((m: any) => m.moduleName === "Tasks")?.totalScore ?? 0,
    },
    {
      icon: iconMapping["Sale"],
      label: "Sale",
      score: data?.find((m: any) => m.moduleName === "Sale")?.totalScore ?? 0,
    },
    {
      icon: iconMapping["Target"],
      label: "Target",
      score: data?.find((m: any) => m.moduleName === "Target")?.totalScore ?? 0,
    },
    {
      icon: iconMapping["Performance"],
      label: "Performance",
      score:
        data?.find((m: any) => m.moduleName === "Performance")?.totalScore ?? 0,
    },
    {
      icon: iconMapping["Ratings & Reviews"],
      label: "Ratings & Reviews",
      score:
        data?.find((m: any) => m.moduleName === "Ratings & Reviews")
          ?.totalScore ?? 0,
    },
  ];

  if(loading){
    return <Container
    fluid
    className="my-4 w-100 px-0 d-flex justify-content-center align-items-center"
    style={{ minHeight: "300px" }}
  >
    <Spinner animation="border" variant="primary" />
  </Container>
}

  if(!showData) return <h2 className="text-center">Not Allowed To View</h2>
  return (
    <>
    {remark && (<PerformanceBadge remark={remark} rank={rank} yourPoints={yourPoints} maxTotal={maxTotal} fromAdmin={fromAdmin} />)}
      <ScoreOverview data={overviewData} />
      {
        dashboardView ? <Container fluid className="my-4 px-0">
        <KpiStatisticsTable data={data} />
      </Container> : null
      }
    </>
  );
};

export default Monthly;
