import CommonCard from "@app/modules/common/components/CommonCard";
import {
  Polar,
  ProgessBar,
  ReportsTable,
  StatisticsTable,
  TotalWorkingTime,
} from "@app/modules/common/components/Graphs";
import { LEAVE_MANAGEMENT } from "@constants/configurations-key";
import { resourseAndView } from "@models/company";
import { RootState } from "@redux/store";
import { fetchConfiguration } from "@services/company";
import {
  fetchAllStarEmployeeByStartAndEndDate,
  getAllKPIModules,
} from "@services/employee";
import { getAvatar } from "@utils/avatar";
import { convertToTimeZone, formatTime } from "@utils/date";
import {
  currentDayWorkingHours,
  fetchEmpDailyKpiStatistics,
  fetchEmpDailyStatistics,
  pieAreaData,
  pieAreaLabels,
  todayProgressPercent,
} from "@utils/statistics";
import { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { Container, Row } from "react-bootstrap";
import { useSelector } from "react-redux";
import { miscellaneousIcons } from "../../../../../_metronic/assets/miscellaneousicons";
import SVG from "react-inlinesvg";
import LeaderBoardCore from "./LeaderBoardCore";
import AttendanceIcon from "@metronic/assets/miscellaneousicons/attendance.svg";
import LeavesIcon from "@metronic/assets/miscellaneousicons/leaves.svg";

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
  resourseAndView,
}: {
  day: Dayjs;
  fromAdmin?: boolean;
  resourseAndView: resourseAndView[];
}) => {
  const toggleChange = useSelector(
    (state: RootState) => state.attendanceStats.toggleChange
  );
  const selectedEmployeeId = useSelector(
    (state: RootState) =>
      state.employee.currentEmployee.id
  );
  const [data, setData] = useState<any>(null);
  const [dataLoaded, setDataLoaded] = useState(true);

  useEffect(() => {
    if (!selectedEmployeeId) return;

    const loadData = async () => {
      setDataLoaded(false);

      try {
        const response = await fetchEmpDailyKpiStatistics(day, fromAdmin);

        if (response) {
          setData(response.modules);
        }
      } catch (error) {
        console.error("Error fetching Daily KPI Statistics:", error);
      } finally {
        setDataLoaded(true);
      }
    };

    loadData();
  }, [day, fromAdmin, toggleChange, selectedEmployeeId]);

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

  if (!dataLoaded) {
    return <Container fluid className="my-4 w-100 px-0 d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </Container>
  }
  return (
    <LeaderBoardCore overviewData={overviewData} startDate={day} endDate={day} fromAdmin={fromAdmin} resourseAndView={resourseAndView} />
  );
};

export default Daily;
