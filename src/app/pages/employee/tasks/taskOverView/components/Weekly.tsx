import { useEffect, useState } from "react";
import { Container } from "@mui/material";
import { getAllTaskStatusByStartDateEndDate } from "@services/tasks";
import TaskCustomChart from "../commonComponents/TaskCustomChart";
import { convertTaskDataToChartData, TaskChartData } from "@utils/taskStatistics";

interface WeeklyProps {
  startDate: string;
  endDate: string;
}

const Weekly = ({ startDate, endDate }: WeeklyProps) => {
    const [taskStatus, setTaskStatus] = useState<any>([]);
    const [chartData, setChartData] = useState<TaskChartData[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        getAllTaskStatusByStartDateEndDate(startDate, endDate).then((res) => {
            setTaskStatus(res);
            // Convert task data to chart format
            if (res?.tasks) {
                const statusChartData = convertTaskDataToChartData(res.tasks);
                setChartData(statusChartData);
            }
            setLoading(false);
        }).catch(() => {
            setLoading(false);
        });
    }, [startDate, endDate]);

    console.log("taskStatus", taskStatus);
    console.log("chartData", chartData);
  if (loading) {
    return (
      <Container
        className="my-4 w-100 px-0 d-flex justify-content-center align-items-center"
        style={{ minHeight: "300px" }}
      >
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="my-4 w-100 px-0">
      <div className="row g-3">
        {/* Task Status Chart */}
        {chartData.length > 0 && (
          <div className="col-12 col-md-6">
            <TaskCustomChart
              data={chartData}
              title="Tasks By Status"
              height={250}
              width={250}
              chartType="pie"
              loading={loading}
            />
          </div>
        )}

        {chartData.length === 0 && (
          <div className="col-12">
            <div className="text-center" role="alert">
              <small className="text-muted">
                No task data available for the selected week.
              </small>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
};

export default Weekly;
