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

/**
 * Widest window this chart will plot. All Time passes 2000-01-01 → 2099-12-31,
 * which is ~1200 month buckets: the API materialises every one of them and the
 * stacked chart then tries to render 1200 categories, which locks the browser's
 * main thread ("Page Unresponsive"). A trend of 1200 months is unreadable anyway.
 * The Project Overview already clamps its own trend for exactly this reason; the
 * clamp lives here so all three callers (All Time / Monthly / Yearly) inherit it.
 */
const TREND_MAX_MONTHS = 24;
const TREND_FALLBACK_MONTHS = 12;

const MonthlyLeadsTrend = ({
  startDate,
  endDate,
}: {
  startDate?: string | Dayjs;
  endDate?: string | Dayjs;
}) => {
  const [data, setData] = useState<any[]>([]);
  const rawStart = toStr(startDate);
  const rawEnd = toStr(endDate);

  const isWide =
    !!rawStart && !!rawEnd && dayjs(rawEnd).diff(dayjs(rawStart), "month") > TREND_MAX_MONTHS;

  // Clamp to the trailing 12 months. Anchor on today rather than the range end —
  // All Time ends in 2099, and a window of empty future months would render blank.
  const anchorEnd = rawEnd && dayjs(rawEnd).isAfter(dayjs()) ? dayjs() : dayjs(rawEnd);
  const startStr = isWide
    ? anchorEnd.startOf("month").subtract(TREND_FALLBACK_MONTHS - 1, "month").format("YYYY-MM-DD")
    : rawStart;
  const endStr = isWide ? anchorEnd.endOf("month").format("YYYY-MM-DD") : rawEnd;

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
      // Say the window out loud when clamped, so a narrower chart than the
      // selected period doesn't look like missing data.
      title={isWide ? `Monthly Leads Trend (last ${TREND_FALLBACK_MONTHS} months)` : "Monthly Leads Trend"}
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
