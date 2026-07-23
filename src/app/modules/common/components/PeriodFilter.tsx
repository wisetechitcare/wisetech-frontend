import React, { useEffect, useMemo, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import PeriodTabs from "./PeriodTabs";
import PeriodNavigator from "./PeriodNavigator";
import { DATE_FORMATS, formatDateRange, buildFiscalYearLabel } from "@utils/dateFormats";

export type PeriodMode = "daily" | "weekly" | "monthly" | "yearly" | "allyear" | "custom";

export interface PeriodRange {
  mode: PeriodMode;
  start: Dayjs | null;
  end: Dayjs | null;
  label: string;
}

interface Props {
  onChange: (range: PeriodRange) => void;
  initialMode?: PeriodMode;
  /** When set, the selected mode is remembered in localStorage under this key
   *  (persists across refresh and logout). */
  storageKey?: string;
  /** If true, yearly mode shows fiscal year format (FY YYYY-YY) and can be clamped to today */
  useFiscalYear?: boolean;
  /** If true and useFiscalYear is true, yearly ranges are clamped to today (year-to-date view) */
  clampYearToToday?: boolean;
  /** Custom function to calculate fiscal year range (start, end, clamped end) */
  getFiscalYearRange?: (date: Dayjs) => Promise<{ startDate: string; endDate: string }>;
  /** Only show these modes (hides tabs entirely if only 1 mode is provided) */
  allowedModes?: PeriodMode[];
}

const MODES: Array<{ key: PeriodMode; label: string }> = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
  { key: "allyear", label: "All Time" },
  { key: "custom", label: "Custom" },
];

/**
 * Segmented period filter (Daily / Weekly / Monthly / Yearly / All Time / Custom)
 * with prev/next navigation per mode and a custom date range. Emits the resolved
 * { mode, start, end, label } whenever the selection changes.
 *
 * With useFiscalYear enabled, yearly mode shows FY format (e.g., "FY 2026-27")
 * and can optionally clamp to today for year-to-date views.
 */
const PeriodFilter: React.FC<Props> = ({
  onChange,
  initialMode = "monthly",
  storageKey,
  useFiscalYear = false,
  clampYearToToday = false,
  getFiscalYearRange,
  allowedModes,
}) => {
  const [mode, setMode] = useState<PeriodMode>(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved && MODES.some((m) => m.key === saved)) {
        if (!allowedModes || allowedModes.includes(saved as PeriodMode)) {
          return saved as PeriodMode;
        }
      }
    }
    return initialMode;
  });

  const availableModes = useMemo(() => {
    return allowedModes ? MODES.filter((m) => allowedModes.includes(m.key)) : MODES;
  }, [allowedModes]);

  useEffect(() => {
    if (storageKey) localStorage.setItem(storageKey, mode);
  }, [mode, storageKey]);

  const [anchor, setAnchor] = useState<Dayjs>(dayjs());
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [yearStart, setYearStart] = useState<Dayjs | null>(null);
  const [yearEnd, setYearEnd] = useState<Dayjs | null>(null);
  const [yearRawEnd, setYearRawEnd] = useState<Dayjs | null>(null);

  // Load fiscal year data on mount and when anchor changes
  useEffect(() => {
    if (!useFiscalYear || !getFiscalYearRange) return;

    const loadFiscalYear = async () => {
      const { startDate, endDate } = await getFiscalYearRange(anchor);
      const fiscalStart = dayjs(startDate);
      const fiscalRawEnd = dayjs(endDate);
      const fiscalEnd = clampYearToToday && dayjs().isBefore(fiscalRawEnd, "day") ? dayjs() : fiscalRawEnd;

      setYearStart(fiscalStart);
      setYearEnd(fiscalEnd);
      setYearRawEnd(fiscalRawEnd);
    };

    loadFiscalYear();
  }, [useFiscalYear, getFiscalYearRange, anchor, clampYearToToday]);

  const range = useMemo<PeriodRange>(() => {
    switch (mode) {
      case "daily":
        return { mode, start: anchor.startOf("day"), end: anchor.endOf("day"), label: anchor.format(DATE_FORMATS.FULL) };
      case "weekly": {
        const s = anchor.startOf("week");
        const e = anchor.endOf("week");
        return { mode, start: s, end: e, label: formatDateRange(s, e, false) };
      }
      case "monthly":
        return { mode, start: anchor.startOf("month"), end: anchor.endOf("month"), label: anchor.format(DATE_FORMATS.MONTH_YEAR) };
      case "yearly":
        if (useFiscalYear && yearStart && yearEnd) {
          const label = yearRawEnd ? buildFiscalYearLabel(yearStart, yearRawEnd, yearEnd) : yearStart.format(DATE_FORMATS.FISCAL_YEAR);
          return { mode, start: yearStart, end: yearEnd, label };
        }
        return { mode, start: anchor.startOf("year"), end: anchor.endOf("year"), label: anchor.format(DATE_FORMATS.YEAR_ONLY) };
      case "allyear":
        return { mode, start: null, end: null, label: "All time" };
      case "custom": {
        const s = customStart ? dayjs(customStart).startOf("day") : null;
        const e = customEnd ? dayjs(customEnd).endOf("day") : null;
        const label = s && e ? formatDateRange(s, e, false) : "Pick a range";
        return { mode, start: s, end: e, label };
      }
      default:
        return { mode, start: null, end: null, label: "" };
    }
  }, [mode, anchor, customStart, customEnd, useFiscalYear, yearStart, yearEnd, yearRawEnd]);

  useEffect(() => {
    onChange(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.mode, range.start?.valueOf(), range.end?.valueOf()]);

  const navUnit = (): dayjs.ManipulateType | null =>
    mode === "daily" ? "day" : mode === "weekly" ? "week" : mode === "monthly" ? "month" : mode === "yearly" ? "year" : null;
  const showNav = !!navUnit();
  const step = (dir: 1 | -1) => {
    if (mode === "yearly" && useFiscalYear) {
      // For fiscal year, move the anchor by 1 year which will trigger the useEffect to recalculate
      setAnchor((a) => a.add(dir, "year"));
    } else {
      const u = navUnit();
      if (u) setAnchor((a) => a.add(dir, u));
    }
  };

  const showTabs = availableModes.length > 1;

  return (
    <div className="d-flex align-items-center flex-wrap" style={{ gap: 10 }}>
      {showTabs && (
        <PeriodTabs
          value={mode}
          options={availableModes.map((m) => ({ label: m.label, value: m.key }))}
          onChange={(v) => setMode(v as PeriodMode)}
          ariaLabel="period filter"
        />
      )}

      {showNav && (
        <PeriodNavigator
          label={range.label}
          onPrevious={() => step(-1)}
          onNext={() => step(1)}
        />
      )}

      {mode === "custom" && (
        <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-2 gap-sm-2">
          <input type="date" className="form-control form-control-sm" style={{ fontSize: 12, minWidth: 0, flex: "1 1 140px" }} value={customStart} max={customEnd || undefined} onChange={(e) => setCustomStart(e.target.value)} />
          <span style={{ color: "#aab2bd", textAlign: "center" }}>–</span>
          <input type="date" className="form-control form-control-sm" style={{ fontSize: 12, minWidth: 0, flex: "1 1 140px" }} value={customEnd} min={customStart || undefined} onChange={(e) => setCustomEnd(e.target.value)} />
        </div>
      )}
    </div>
  );
};

export default PeriodFilter;
