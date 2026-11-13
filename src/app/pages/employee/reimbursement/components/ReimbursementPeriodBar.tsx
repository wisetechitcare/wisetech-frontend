import dayjs, { Dayjs } from "dayjs";
import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/ds/ui/tabs";
import { PeriodNavigator } from "@/ds/patterns/period-navigator";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import { formatFiscalYearLabel } from "@utils/fiscalYearHelper";

export type PeriodAlignment = 'monthly' | 'yearly' | 'allTime';

interface Props {
  /** Fully controlled — the page owns the period so KPIs, charts and every table read one value. */
  alignment: PeriodAlignment;
  date: Dayjs;
  onChange: (alignment: PeriodAlignment, date: Dayjs) => void;
  /** Rendered between the tabs and the date navigator (page-level actions). */
  actionSlot?: React.ReactNode;
}

/**
 * The one period selector for a reimbursement screen. It used to live halfway down the page
 * inside the records table's wrapper, owning its own month/year — so the KPI cards, charts and
 * tables above it were driven by a control you had to scroll past to find.
 */
const ReimbursementPeriodBar = ({ alignment, date, onChange, actionSlot }: Props) => {
  const [fiscalYear, setFiscalYear] = useState('');

  useEffect(() => {
    if (alignment !== 'yearly') return;
    generateFiscalYearFromGivenYear(date).then(({ startDate, endDate }) =>
      setFiscalYear(`${startDate} to ${endDate}`)
    );
  }, [alignment, date]);

  return (
    // Period tabs and date navigator on one line; collapse to stack on mobile.
    // The status filter rail renders immediately below at full width.
    <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <Tabs value={alignment} onValueChange={(val) => onChange(val as PeriodAlignment, date)}>
        <TabsList aria-label="Reimbursement period">
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
          <TabsTrigger value="allTime">All Time</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex w-full flex-wrap items-center justify-center gap-3 md:w-auto md:justify-end">
        {actionSlot}

        {alignment === "monthly" && (
          <PeriodNavigator
            label={date.format("MMM YYYY")}
            onPrevious={() => onChange("monthly", date.subtract(1, "month"))}
            onNext={() => onChange("monthly", date.add(1, "month"))}
            unit="month"
            pickGranularity="month"
            pickValue={date.startOf("month").format("YYYY-MM-DD")}
            onPick={(v) => onChange("monthly", dayjs(v).startOf("month"))}
          />
        )}

        {alignment === "yearly" && (
          <PeriodNavigator
            label={formatFiscalYearLabel(fiscalYear)}
            onPrevious={() => onChange("yearly", date.subtract(1, "year"))}
            onNext={() => onChange("yearly", date.add(1, "year"))}
            unit="year"
            pickGranularity="year"
            pickValue={date.startOf("year").format("YYYY-MM-DD")}
            onPick={(v) => onChange("yearly", dayjs(v).startOf("year"))}
          />
        )}
      </div>
    </div>
  );
};

export default ReimbursementPeriodBar;
