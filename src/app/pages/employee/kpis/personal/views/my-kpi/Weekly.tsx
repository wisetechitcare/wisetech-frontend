import React, { useEffect, useState } from "react";
import { Container, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
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
  resourseAndView: any[]; // adjust type as needed
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
  const dispatch = useDispatch();
  const toggleChange = useSelector(
    (state: RootState) => state.attendanceStats.toggleChange
  );
  
  const selectedEmployeeId = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.id : state.employee.currentEmployee.id);

  const [data, setData] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee?.id);
  const [showData, setShowData] = useState(false)
  // KPI specific props to pass to PerformanceBadge
  const [remark, setRemark] = useState<string>("");
  const [rank, setRank] = useState<number>(0);
  const [yourPoints, setYourPoints] = useState<number>(0);
  const [maxTotal, setMaxTotal] = useState<number>(0);

  useEffect(() => {
    if (!selectedEmployeeId) return;

    const loadData = async () => {
      setDataLoaded(true);

      const today = dayjs();
      const isCurrentWeek =
        (today.isAfter(startWeek, "day") && today.isBefore(endWeek, "day")) ||
        today.isSame(startWeek, "day") ||
        today.isSame(endWeek, "day");

      const effectiveEndDate =
        dateSettingsEnabled && isCurrentWeek ? today : endWeek;

      try {
        const response = await fetchEmpWeeklyKpiStatistics(
          startWeek,
          effectiveEndDate,
          fromAdmin
        );
        if (response) {
          setData(response.modules || []);
          setRemark(response.remark || "");
          setRank(response.rank || 0);
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
  }, [selectedEmployeeId, startWeek, endWeek, dateSettingsEnabled]);
   
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
    {
      icon: iconMapping["Attendance"],
      label: "Attendance",
      score: data.find((m) => m.moduleName === "Attendance")?.totalScore ?? 0,
    },
    {
      icon: iconMapping["Leaves"],
      label: "Leaves",
      score: data.find((m) => m.moduleName === "Leaves")?.totalScore ?? 0,
    },
    {
      icon: iconMapping["Projects"],
      label: "Projects",
      score: data.find((m) => m.moduleName === "Projects")?.totalScore ?? 0,
    },
    {
      icon: iconMapping["Tasks"],
      label: "Tasks",
      score: data.find((m) => m.moduleName === "Tasks")?.totalScore ?? 0,
    },
    {
      icon: iconMapping["Sale"],
      label: "Sale",
      score: data.find((m) => m.moduleName === "Sale")?.totalScore ?? 0,
    },
    {
      icon: iconMapping["Target"],
      label: "Target",
      score: data.find((m) => m.moduleName === "Target")?.totalScore ?? 0,
    },
    {
      icon: iconMapping["Performance"],
      label: "Performance",
      score: data.find((m) => m.moduleName === "Performance")?.totalScore ?? 0,
    },
    {
      icon: iconMapping["Ratings & Reviews"],
      label: "Ratings & Reviews",
      score:
        data.find((m) => m.moduleName === "Ratings & Reviews")?.totalScore ?? 0,
    },
  ];

  
if(dataLoaded){
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
      {remark && (
        <PerformanceBadge
          remark={remark}
          rank={rank}
          yourPoints={yourPoints}
          fromAdmin={fromAdmin}
           maxTotal={maxTotal}
        />
      )}

      <ScoreOverview data={overviewData} />
      {
        dashboardView ? <Container fluid className="my-4 px-0">
        <KpiStatisticsTable data={data} />
      </Container>:null
      }
     
    </>
  );
};

export default Weekly;