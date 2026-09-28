import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import { Box, Typography, type Theme } from "@mui/material";
import PeriodFilter, { PeriodRange } from "@app/modules/common/components/PeriodFilter";
import PeriodTabs from "@app/modules/common/components/PeriodTabs";
import LeadReferralAnalytics, {
  type AnalyticsRow,
  type ChartMetric,
} from "@app/pages/employee/companies/companies/components/LeadReferralAnalytics";

/**
 * A relationship tab: period filter on top, chart, then the tab's own table.
 *
 * The point is that ONE period selection drives both halves. Every one of these tabs
 * answers "how much has this relationship produced, and when", so a chart showing all
 * time above a table showing one quarter would be two different answers stacked on
 * top of each other.
 *
 * The caller keeps its own row type and its own table; it only says how a record maps
 * onto the chart's axes (`toRow`) and receives the period-filtered records back to
 * render (`children`). That is why this can serve leads, projects and company
 * referrals — on both the Company and the Contact page — without knowing what any of
 * them are.
 */
interface AnalyticsTabProps<T> {
  /** Every record for this relationship, unfiltered. */
  items: T[];
  /** How one record lands on the chart: its date, its stack, and its money if any. */
  toRow: (item: T) => AnalyticsRow;
  /** Card heading, e.g. "Projects — Business". */
  title: string;
  /** Keenicon/bi name for the heading tile. */
  icon?: string;
  /** Singular noun for tooltips and the empty state: "lead", "project", "company". */
  noun: string;
  /** Remembers the chosen period per surface, across refresh and logout. */
  storageKey: string;
  /** The table, rendered with the records that survived the period filter. */
  children: (filtered: T[]) => React.ReactNode;
}

function AnalyticsTab<T>({ items, toRow, title, icon, noun, storageKey, children }: AnalyticsTabProps<T>) {
  const [range, setRange] = useState<PeriodRange>({
    mode: "allyear",
    start: null,
    end: null,
    label: "All time",
  });
  // Chart-only measure: bars stack record COUNT or record VALUE. The table is unaffected.
  const [metric, setMetric] = useState<ChartMetric>("count");

  // Map once and keep each record beside its charted row, so the table and the chart
  // can never disagree about which period a record falls in.
  const paired = useMemo(
    () => (items || []).map((item) => ({ item, row: toRow(item) })),
    [items, toRow]
  );

  // Judged over every record, not the period, so the toggle does not blink in and out
  // as the period changes. Datasets with no money (company referrals) never show it.
  const hasValue = useMemo(() => paired.some(({ row }) => Number(row.value) > 0), [paired]);

  const kept = useMemo(() => {
    if (!range.start || !range.end) return paired; // "All Time" → everything
    const from = range.start.valueOf();
    const to = range.end.valueOf();
    return paired.filter(({ row }) => {
      if (!row.date) return false;
      const t = dayjs(row.date).valueOf();
      return t >= from && t <= to;
    });
  }, [paired, range.start, range.end]);

  return (
    <Box>
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
        <PeriodFilter onChange={setRange} initialMode="allyear" storageKey={storageKey} />
        {hasValue && (
          // Same look and right-end placement as the Leads Overview toggle.
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto", height: 40 }}>
            <Typography sx={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 600, color: "#94A3B8", whiteSpace: "nowrap" }}>
              Graph based on
            </Typography>
            <PeriodTabs
              value={metric}
              options={[
                { label: "Number", value: "count" },
                { label: "Amount", value: "amount" },
              ]}
              onChange={(val) => setMetric(val as ChartMetric)}
              ariaLabel="measure selection"
              sx={{
                height: 32,
                // Theme tokens, not fixed greys: the sunken track and the raised selected
                // tab have to invert together in dark mode, or the pill goes white-on-dark.
                bgcolor: "action.hover",
                border: "none",
                p: "3px",
                borderRadius: "10px",
                "& .MuiToggleButtonGroup-grouped": { px: 2.2, borderRadius: "8px !important" },
                "& .Mui-selected": {
                  bgcolor: (t: Theme) => `${t.palette.background.paper} !important`,
                  color: "#1E3A8A !important",
                  boxShadow: "0 1px 3px rgba(15,23,42,0.10)",
                  "&::after": { display: "none" },
                },
              }}
            />
          </Box>
        )}
      </Box>

      <LeadReferralAnalytics
        rows={kept.map((k) => k.row)}
        title={title}
        icon={icon}
        noun={noun}
        mode={range.mode}
        metric={hasValue ? metric : "count"}
        rangeStart={range.start}
        rangeEnd={range.end}
      />

      {children(kept.map((k) => k.item))}
    </Box>
  );
}

export default AnalyticsTab;
