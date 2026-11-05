import React from "react";
import PeriodTabs from "./PeriodTabs";

import { PeriodMode } from "@/constants/common";

interface TimePeriodSelectorProps {
  value: PeriodMode;
  onChange: (mode: PeriodMode) => void;
}

const OPTIONS: { label: string; value: PeriodMode }[] = [
  { label: "Daily", value: PeriodMode.DAILY },
  { label: "Weekly", value: PeriodMode.WEEKLY },
  { label: "Monthly", value: PeriodMode.MONTHLY },
  { label: "Yearly", value: PeriodMode.YEARLY },
  { label: "All Time", value: PeriodMode.ALL_YEAR },
  { label: "Custom", value: PeriodMode.CUSTOM },
];

/**
 * The six-mode period selector for the Leads, Projects and entity tables.
 *
 * Drawn by `PeriodTabs`, the same control the other period screens use, so every period
 * selector in the app looks the same: white selected tab, blue label, blue line under it.
 */
const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({
  value,
  onChange,
}) => (
  <PeriodTabs
    value={value}
    options={OPTIONS}
    onChange={(mode) => onChange(mode as PeriodMode)}
  />
);

export default TimePeriodSelector;
