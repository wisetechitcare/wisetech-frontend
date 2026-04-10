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

  // FIX: Pass the same date as both startDate and endDate — the leaderboard
  // must be fetched for the EXACT same period as the KPI data so rank matches.
  const formattedDay = day.format("YYYY-MM-DD");
  const { rank, rankLoading } = useLeaderboardRank({
    employeeId: selectedEmployeeId,
    startDate: formattedDay,
    endDate: formattedDay,
  });

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
  }, [day, selectedEmployeeId, toggleChange]);

  const overviewData = [
    "Attendance",
    "Leaves",
    "Projects",
    "Tasks",
    "Sale",
    "Target",
    "Performance",
    "Ratings & Reviews",
  ].map((label) => {
    const moduleData = data?.modules?.find((m: any) => m.moduleName === label);
    return {
      icon: iconMapping[label],
      label,
      score: moduleData?.totalScore ?? 0,
      maxScore: moduleData?.maxScore ?? 0,
    };
  });

  // FIX: daily API also returns yourPoints, remark, maxTotal — use them.
  // Fallback safely if the response shape is missing these fields.
  const yourPoints: number = data?.yourPoints ?? 0;
  const remark: string = data?.remark ?? "";
  const maxTotal: number = data?.maxTotal ?? 0;

  if (dataLoaded) {
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

  return (
    <>
      {remark && (
        <PerformanceBadge
          remark={remark}
          // FIX: rank comes ONLY from the leaderboard hook (backend-authoritative).
          // The backend `getKpiScoresForDay` also returns a rank field, but it uses
          // a different sort (percentage-based) vs the leaderboard API (score-based).
          // We use leaderboard rank everywhere for consistency with the Leaderboard tab.
          rank={rank}
          rankLoading={rankLoading}
          yourPoints={yourPoints}
          maxTotal={maxTotal}
        />
      )}

      <ScoreOverview data={overviewData} />
      {dashboardView ? (
        <Container fluid className="my-4 px-0">
          <KpiStatisticsTable data={data?.modules ?? []} />
        </Container>
      ) : null}
    </>
  );
};

export default Daily;