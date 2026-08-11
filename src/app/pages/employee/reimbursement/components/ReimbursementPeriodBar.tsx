import { Dayjs } from "dayjs";
import React, { useEffect, useState } from "react";
import PeriodTabs from "@app/modules/common/components/PeriodTabs";
import PeriodNavigator from "@app/modules/common/components/PeriodNavigator";
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
    <div className="d-flex flex-md-row flex-column justify-content-lg-between align-items-lg-center gap-3 gap-lg-0 mb-3">
      <PeriodTabs
        value={alignment}
        options={[
          { label: "Monthly", value: "monthly" },
          { label: "Yearly", value: "yearly" },
          { label: "All Time", value: "allTime" },
        ]}
        onChange={(val) => onChange(val as PeriodAlignment, date)}
        ariaLabel="view selection"
      />

      <div className="d-flex align-items-center gap-3">
        {actionSlot}

        {alignment === "monthly" && (
          <PeriodNavigator
            label={date.format("MMM YYYY")}
            onPrevious={() => onChange("monthly", date.subtract(1, "month"))}
            onNext={() => onChange("monthly", date.add(1, "month"))}
          />
        )}

        {alignment === "yearly" && (
          <PeriodNavigator
            label={formatFiscalYearLabel(fiscalYear)}
            onPrevious={() => onChange("yearly", date.subtract(1, "year"))}
            onNext={() => onChange("yearly", date.add(1, "year"))}
          />
        )}
      </div>
    </div>
  );
};

export default ReimbursementPeriodBar;
