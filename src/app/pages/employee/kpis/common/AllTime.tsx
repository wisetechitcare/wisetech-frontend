import { useEffect, useState } from "react";
import { fetchEmpAllTimeKpiStatistics } from "@utils/statistics";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import KpiStatisticsTable from "../personal/components/KpiStatisticsTable";
import { resourseAndView } from "@models/company";
import ScoreOverview from "../personal/components/ScoreOverview";
import AttendanceIcon from "@metronic/assets/miscellaneousicons/attendance.svg";
import LeavesIcon from "@metronic/assets/miscellaneousicons/leaves.svg";
import PerformanceBadge from "../personal/components/PerformanceBadge";
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

interface AllTimeProps {
  fromAdmin?: boolean;
  resourseAndView: resourseAndView[];
}

const AllTime: React.FC<AllTimeProps> = ({
  fromAdmin = false,
  resourseAndView,
}) => {
  const toggleChange = useSelector(
    (state: RootState) => state.attendanceStats.toggleChange
  );
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await fetchEmpAllTimeKpiStatistics();
        if (response) {
          setData(response.modules);
        }
      } catch (error) {
        console.error("Error fetching All Time KPI Statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toggleChange]);


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
// const yourPoints = data?.yourPoints ?? 0;
// const topModule = data?.modules?.[0];

  return (
    <>
   {/* {topModule && (
  <PerformanceBadge
    image={badgeMapping[topModule.remark]}
    remark={topModule.remark}
    rank={topModule.rank}
    yourPoints={yourPoints}
  />
)} */}
      <ScoreOverview data={overviewData} />
      <KpiStatisticsTable data={data} />;
    </>
  );
};

export default AllTime;
