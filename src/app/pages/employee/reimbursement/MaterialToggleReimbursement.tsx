import SubmissionsTable from "@pages/employee/reimbursement/views/SubmissionsTable";
import dayjs, { Dayjs, ManipulateType } from "dayjs";
import React, { useEffect, useState } from "react";
import PeriodTabs from "@app/modules/common/components/PeriodTabs";
import { usePersistedState } from "@app/modules/common/hooks/usePersistedState";
import PeriodNavigator from "@app/modules/common/components/PeriodNavigator";
import { IReimbursementsUpdate } from "@models/employee";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import { formatFiscalYearLabel } from "@utils/fiscalYearHelper";
import { useDispatch } from "react-redux";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";


export type PeriodAlignment = 'monthly' | 'yearly' | 'allTime';

interface MaterialToggleProps {
  /** Called on initial mount and whenever the active period type or date changes. */
  onPeriodChange?: (alignment: PeriodAlignment, date: Dayjs) => void;
  showEditDeleteOption?: boolean,
  selectedEmployeeId?: string,
  onEdit?: (row: IReimbursementsUpdate) => void,
  resource: string,
  viewOwn?: boolean,
  viewOthers?: boolean,
  checkOwnWithOthers?: boolean,
  /** Optional element rendered between the toggle group and the date selector. */
  actionSlot?: React.ReactNode,
}

const MaterialToggleReimbursement = ({
  onPeriodChange,
  showEditDeleteOption = false,
  onEdit,
  selectedEmployeeId,
  resource = "",
  viewOwn = false,
  viewOthers = false,
  checkOwnWithOthers = false,
  actionSlot,
}: MaterialToggleProps) => {

  const dispatch = useDispatch();
  const [alignment, setAlignment] = usePersistedState<PeriodAlignment>(
    "reimbursementPeriodMode",
    "monthly",
    ["monthly", "yearly", "allTime"] as const
  );
  const [month, setMonth] = useState(dayjs());
  const [year, setYear] = useState(dayjs());

  const [fiscalYear, setFiscalYear] = useState('');

  useEffect(() => {
    if (!year) return;
    async function getFiscalYear() {
      const { startDate, endDate } = await generateFiscalYearFromGivenYear(year);
      setFiscalYear(`${startDate} to ${endDate}`);
    }
    getFiscalYear();
  }, [year])

  useEffect(() => {
    dispatch(fetchRolesAndPermissions() as any);
  }, [])

  // Fire once on mount so the parent can load initial overview stats
  useEffect(() => {
    onPeriodChange?.(alignment, alignment === 'yearly' ? year : month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (
    event: React.MouseEvent<HTMLElement>,
    newAlignment: PeriodAlignment | null
  ) => {
    if (newAlignment === null) return;
    setAlignment(newAlignment);
    const date = newAlignment === 'yearly' ? year : month;
    onPeriodChange?.(newAlignment, date);
  };

  const handleDatesChange = (
    action: string,
    type: ManipulateType,
    setState: React.Dispatch<React.SetStateAction<Dayjs>>
  ) => {
    switch (action) {
      case "increment":
        setState((state) => state.add(1, type));
        return;
      case "decrement":
        setState((state) => state.subtract(1, type));
        return;
      default:
        return;
    }
  };

  return (
    <>
      <div className="d-flex flex-md-row flex-column justify-content-lg-between align-items-lg-center gap-5 gap-lg-0">
        <PeriodTabs
          value={alignment}
          options={[
            { label: "Monthly", value: "monthly" },
            { label: "Yearly", value: "yearly" },
            { label: "All Time", value: "allTime" },
          ]}
          onChange={(val) => handleChange(null as any, val as PeriodAlignment)}
          ariaLabel="view selection"
        />

        <div className="d-flex align-items-center gap-3">
          {actionSlot}

          {alignment === "monthly" && (
            <PeriodNavigator
              label={month.format("MMM YYYY")}
              onPrevious={() => {
                const newMonth = month.subtract(1, "month");
                handleDatesChange("decrement", "month", setMonth);
                onPeriodChange?.("monthly", newMonth);
              }}
              onNext={() => {
                const newMonth = month.add(1, "month");
                handleDatesChange("increment", "month", setMonth);
                onPeriodChange?.("monthly", newMonth);
              }}
            />
          )}

          {alignment === "yearly" && (
            <PeriodNavigator
              label={formatFiscalYearLabel(fiscalYear)}
              onPrevious={() => {
                const newYear = year.subtract(1, "year");
                handleDatesChange("decrement", "year", setYear);
                onPeriodChange?.("yearly", newYear);
              }}
              onNext={() => {
                const newYear = year.add(1, "year");
                handleDatesChange("increment", "year", setYear);
                onPeriodChange?.("yearly", newYear);
              }}
            />
          )}
        </div>
      </div>

      <SubmissionsTable
        period={alignment}
        date={alignment === 'yearly' ? year : month}
        selectedEmployeeId={selectedEmployeeId}
        onEdit={onEdit}
        showEditDeleteOption={showEditDeleteOption}
        resource={resource}
        viewOwn={viewOwn}
        viewOthers={viewOthers}
        checkOwnWithOthers={checkOwnWithOthers}
        // Lets the empty state jump to a month that actually has expenses.
        onGoToPeriod={(next) => {
          setMonth(next);
          setYear(next);
          onPeriodChange?.(alignment, next);
        }}
      />
    </>
  );
};

export default MaterialToggleReimbursement;