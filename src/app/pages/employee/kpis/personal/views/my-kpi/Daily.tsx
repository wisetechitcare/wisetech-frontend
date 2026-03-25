import { resourseAndView } from "@models/company";
import { RootState } from "@redux/store";
import { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { fetchEmpDailyKpiStatistics } from "@utils/statistics";
import { useSelector } from "react-redux";
import KpiStatisticsTable from "../../components/KpiStatisticsTable";
import AttendanceIcon from "@metronic/assets/miscellaneousicons/attendance.svg";
import LeavesIcon from "@metronic/assets/miscellaneousicons/leaves.svg";
import ScoreOverview from "../../components/ScoreOverview";
import { Container, Spinner } from "react-bootstrap";
import PerformanceBadge from "../../components/PerformanceBadge";


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

const Daily = ({
  day,
  fromAdmin = false,
  dashboardView = true,
}: {
  day: Dayjs;
  fromAdmin?: boolean;
  resourseAndView: resourseAndView[];
  dashboardView?: boolean;
}) => {
  const toggleChange = useSelector(
    (state: RootState) => state.attendanceStats.toggleChange
  );

  const selectedEmployeeId = useSelector(
    (state: RootState) =>
      state.employee.selectedEmployee?.id ||
      state.employee.currentEmployee.id
  );

  const [data, setData] = useState<any>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!selectedEmployeeId) return;

    const loadData = async () => {
      setDataLoaded(true);
      try {
        const response = await fetchEmpDailyKpiStatistics(day, fromAdmin);
        if (response) {
   
          setData(response);
        }
      } catch (error) {
        console.error("Error fetching Daily KPI Statistics:", error);
      } finally {
        setDataLoaded(false);
      }
    };

    loadData();
  }, [day, selectedEmployeeId]);

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
      data?.modules?.find((m: any) => m.moduleName === label)?.totalScore ?? 0,
  }));

  const yourPoints = data?.yourPoints ?? 0;
  const rank = data?.rank ?? "-";
  const remark = data?.remark ?? "";
  const maxTotal = data?.maxTotal ?? "-";
 

  if(dataLoaded){
    return (
      <Container
      fluid
      className="my-4 w-100 px-0 d-flex justify-content-center align-items-center"
      style={{ minHeight: "300px" }}
    >
      <Spinner animation="border" variant="primary" />
    </Container>
    )
  }


  return (
    <>
     {remark && (
        <PerformanceBadge
          remark={remark}
          rank={rank}
          yourPoints={yourPoints}
          maxTotal={maxTotal}
        />
     )}

      <ScoreOverview data={overviewData} />
      {
        dashboardView ? <Container fluid className="my-4 px-0">
        <KpiStatisticsTable data={data?.modules ?? []} />
      </Container> : null
      }
    </>
  );
};

export default Daily;