import React, { useEffect, useMemo, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import PeriodTabs from "./PeriodTabs";
import PeriodNavigator from "./PeriodNavigator";

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
}

const MODES: Array<{ key: PeriodMode; label: string }> = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
  { key: "allyear", label: "All Year" },
  { key: "custom", label: "Custom" },
];

/**
 * Segmented period filter (Daily / Weekly / Monthly / Yearly / All Year / Custom)
 * with prev/next navigation per mode and a custom date range. Emits the resolved
 * { mode, start, end, label } whenever the selection changes.
 */
const PeriodFilter: React.FC<Props> = ({ onChange, initialMode = "monthly", storageKey }) => {
  const [mode, setMode] = useState<PeriodMode>(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved && MODES.some((m) => m.key === saved)) return saved as PeriodMode;
    }
    return initialMode;
  });

  useEffect(() => {
    if (storageKey) localStorage.setItem(storageKey, mode);
  }, [mode, storageKey]);

  const [anchor, setAnchor] = useState<Dayjs>(dayjs());
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  const range = useMemo<PeriodRange>(() => {
    switch (mode) {
      case "daily":
        return { mode, start: anchor.startOf("day"), end: anchor.endOf("day"), label: anchor.format("DD MMM YYYY") };
      case "weekly": {
        const s = anchor.startOf("week");
        const e = anchor.endOf("week");
        return { mode, start: s, end: e, label: `${s.format("DD MMM")} – ${e.format("DD MMM YYYY")}` };
      }
      case "monthly":
        return { mode, start: anchor.startOf("month"), end: anchor.endOf("month"), label: anchor.format("MMM YYYY") };
      case "yearly":
        return { mode, start: anchor.startOf("year"), end: anchor.endOf("year"), label: anchor.format("YYYY") };
      case "allyear":
        return { mode, start: null, end: null, label: "All time" };
      case "custom": {
        const s = customStart ? dayjs(customStart).startOf("day") : null;
        const e = customEnd ? dayjs(customEnd).endOf("day") : null;
        const label = s && e ? `${s.format("DD MMM YYYY")} – ${e.format("DD MMM YYYY")}` : "Pick a range";
        return { mode, start: s, end: e, label };
      }
      default:
        return { mode, start: null, end: null, label: "" };
    }
  }, [mode, anchor, customStart, customEnd]);

  useEffect(() => {
    onChange(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.mode, range.start?.valueOf(), range.end?.valueOf()]);

  const navUnit = (): dayjs.ManipulateType | null =>
    mode === "daily" ? "day" : mode === "weekly" ? "week" : mode === "monthly" ? "month" : mode === "yearly" ? "year" : null;
  const showNav = !!navUnit();
  const step = (dir: 1 | -1) => { const u = navUnit(); if (u) setAnchor((a) => a.add(dir, u)); };

  return (
    <div className="d-flex align-items-center flex-wrap" style={{ gap: 10 }}>
      <PeriodTabs
        value={mode}
        options={MODES.map((m) => ({ label: m.label, value: m.key }))}
        onChange={(v) => setMode(v as PeriodMode)}
        ariaLabel="period filter"
      />

      {showNav && (
        <PeriodNavigator
          label={range.label}
          onPrevious={() => step(-1)}
          onNext={() => step(1)}
        />
      )}

      {mode === "custom" && (
        <div className="d-flex align-items-center" style={{ gap: 6 }}>
          <input type="date" className="form-control form-control-sm" style={{ width: 150, fontSize: 12 }} value={customStart} max={customEnd || undefined} onChange={(e) => setCustomStart(e.target.value)} />
          <span style={{ color: "#aab2bd" }}>–</span>
          <input type="date" className="form-control form-control-sm" style={{ width: 150, fontSize: 12 }} value={customEnd} min={customStart || undefined} onChange={(e) => setCustomEnd(e.target.value)} />
        </div>
      )}
    </div>
  );
};

export default PeriodFilter;
