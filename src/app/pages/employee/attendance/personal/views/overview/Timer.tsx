import { KTIcon } from "@metronic/helpers";
import { RootState } from "@redux/store";
import { fetchEmpAttendanceStatistics } from "@services/employee";
import { currentDayWorkingHours } from "@utils/statistics";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

function Timer() {
  const [attendanceStats, setAttendanceStats] = useState([]);
  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee.id
  );
  
  useEffect(() => {
    async function fetchStats() {
      const day = dayjs();
      const startEnddate = day.format("YYYY-MM-DD");
      const {
        data: { empAttendanceStatistics },
      } = await fetchEmpAttendanceStatistics(
        employeeId,
        startEnddate,
        startEnddate
      );
      setAttendanceStats(empAttendanceStatistics);
    }
    fetchStats();
  }, [employeeId]);

  return (
    <>
      {attendanceStats.length > 0 &&
        currentDayWorkingHours(attendanceStats[0]) != "0h : 0m" && (
          <>
            {/* Inherit the host's colour: white on the coloured button, readable grey when
                it is disabled. A fixed white vanished on the disabled grey background. */}
            <KTIcon iconName="time" className="fs-1" />
            <span className="fw-bold mx-1 fs-5">
              {currentDayWorkingHours(attendanceStats[0])}
            </span>
          </>
        )}
    </>
  );
}

export default Timer;
