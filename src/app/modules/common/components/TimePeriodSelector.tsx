import React from "react";
import PeriodTabs from "./PeriodTabs";

export type TimePeriodMode = "daily" | "weekly" | "monthly" | "yearly" | "allyear" | "custom";

interface TimePeriodSelectorProps {
  value: TimePeriodMode;
  onChange: (mode: TimePeriodMode) => void;
}

const OPTIONS: { label: string; value: TimePeriodMode }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
  { label: "All Time", value: "allyear" },
  { label: "Custom", value: "custom" },
];

/**
 * The six-mode period selector for the Leads, Projects and entity tables.
 *
 * Drawn by `PeriodTabs`, the same control the other period screens use, so every period
 * selector in the app looks the same: white selected tab, blue label, blue line under it.
 */
const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({ value, onChange }) => (
  <PeriodTabs
    value={value}
    options={OPTIONS}
    onChange={(mode) => onChange(mode as TimePeriodMode)}
  />
);

export default TimePeriodSelector;
