import { useEffect, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { getMonthlyLeadAnalytics } from "@services/lead";
import { transformYearlyDatas } from "@utils/leadsProjectCompaniesStatistics";
import YearlyStatusCountChart from "@pages/employee/projects/commonComponents/YearlyStatusCountChart";

/**
 * Monthly Leads Trend — month-by-month lead counts grouped by LEAD status
 * (Pending / Hold / Received / Not Received). Mirrors the Project Overview's
 * "Monthly Projects Trend", but scoped to leads and their lead statuses.
 *
 * Self-contained: fetches its own monthly analytics for the given range, so it
 * can be dropped into any Leads Overview period view's Summary slot. Drill-down
 * (via YearlyStatusCountChart) opens the lead list filtered to that month +
 * status (entityScope="lead").
 */
const toStr = (d?: string | Dayjs) =>
  d ? (dayjs.isDayjs(d) ? d.format("YYYY-MM-DD") : dayjs(d).format("YYYY-MM-DD")) : "";

const MonthlyLeadsTrend = ({
  startDate,
  endDate,
}: {
  startDate?: string | Dayjs;
  endDate?: string | Dayjs;
}) => {
  const [data, setData] = useState<any[]>([]);
  const startStr = toStr(startDate);
  const endStr = toStr(endDate);

  useEffect(() => {
    if (!startStr || !endStr) return;
    let active = true;
    getMonthlyLeadAnalytics(startStr, endStr)
      .then((r: any) => {
        if (active) setData(transformYearlyDatas(r?.data || []));
      })
      .catch(() => {
        if (active) setData([]);
      });
    return () => {
      active = false;
    };
  }, [startStr, endStr]);

  return (
    <YearlyStatusCountChart
      data={data}
      title="Monthly Leads Trend"
      height={400}
      stacked
      isThisBelongsToLead
      entityScope="lead"
      startDate={startStr ? dayjs(startStr) : undefined}
      endDate={endStr ? dayjs(endStr) : undefined}
    />
  );
};

export default MonthlyLeadsTrend;
