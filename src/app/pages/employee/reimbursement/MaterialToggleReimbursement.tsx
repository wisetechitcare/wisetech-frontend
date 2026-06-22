import { toAbsoluteUrl } from "@metronic/helpers";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import AllTime from "@pages/employee/reimbursement/views/AllTime";
import Daily from "@pages/employee/reimbursement/views/AllTime";
import Monthly from "@pages/employee/reimbursement/views/Monthly";
import Yearly from "@pages/employee/reimbursement/views/Yearly";
import SubmissionsTable from "@pages/employee/reimbursement/views/SubmissionsTable";
import dayjs, { Dayjs, ManipulateType } from "dayjs";
import React, { useEffect, useState } from "react";
import DateSelector from "@components/DateSelector";
import { IReimbursements, IReimbursementsUpdate } from "@models/employee";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import { formatFiscalYearLabel } from "@utils/fiscalYearHelper";
import { useDispatch } from "react-redux";
import { fetchAllTimeReimbursementsOfAllEmp } from "@utils/statistics";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import { resourceNameMapWithCamelCase } from "@constants/statistics";


export type ToggleItemsCallBackFunctions = {
  monthly: (date: Dayjs) => void;
  yearly: (date: Dayjs) => void;
  allTime: (date: Dayjs) => void;
};

export type PeriodAlignment = 'monthly' | 'yearly' | 'allTime';

interface MaterialToggleProps {
  toggleItemsActions?: ToggleItemsCallBackFunctions;
  /** Called on initial mount and whenever the active period type or date changes. */
  onPeriodChange?: (alignment: PeriodAlignment, date: Dayjs) => void;
  showEditDeleteOption?: boolean,
  showIdCol?: boolean,
  showName?: boolean,
  selectedEmployeeId?: string,
  onEdit?: (row: IReimbursementsUpdate) => void,
  resource: string,
  viewOwn?: boolean,
  viewOthers?: boolean,
  checkOwnWithOthers?: boolean,
  /** When 'submissions', renders a batch/submission-level table instead of request-level rows. */
  viewMode?: 'requests' | 'submissions',
}

const MaterialToggleReimbursement = ({
  toggleItemsActions,
  onPeriodChange,
  showEditDeleteOption = false,
  showIdCol = false,
  showName = false,
  onEdit,
  selectedEmployeeId,
  resource = "",
  viewOwn = false,
  viewOthers = false,
  checkOwnWithOthers = false,
  viewMode = 'requests',
}: MaterialToggleProps) => {

  const dispatch = useDispatch();
  const [alignment, setAlignment] = useState<PeriodAlignment>("monthly");
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
    onPeriodChange?.('monthly', dayjs());
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
        <ToggleButtonGroup
          value={alignment}
          exclusive
          onChange={(event: React.MouseEvent<HTMLElement>, value: any) =>
            handleChange(event, value)
          }
          aria-label="view selection"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0,
            height: 30,
            p: '2px',
            borderRadius: '5px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #eef2f7',
            width: 'fit-content',
            maxWidth: '100%',
            overflowX: 'auto',
            '& .MuiToggleButtonGroup-grouped': {
              border: 0,
              borderRadius: '4px !important',
              minWidth: 0,
              minHeight: 24,
              px: 1.6,
              py: 0,
              color: '#475569',
              fontSize: 12,
              fontWeight: 500,
              lineHeight: '24px',
              textTransform: 'none',
              whiteSpace: 'nowrap',
              letterSpacing: 0,
            },
            '& .MuiToggleButtonGroup-grouped:not(:first-of-type)': {
              marginLeft: 0,
              borderLeft: 0,
            },
            '& .MuiToggleButton-root:hover': {
              backgroundColor: '#e8eef6',
            },
            '& .Mui-selected': {
              backgroundColor: '#ffffff !important',
              color: '#aa393d !important',
              fontWeight: 700,
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
            },
          }}
        >
          <ToggleButton value="monthly">Monthly</ToggleButton>
          <ToggleButton value="yearly">Yearly</ToggleButton>
          <ToggleButton value="allTime">All Time</ToggleButton>
        </ToggleButtonGroup>

        {alignment == "monthly" && (
          <DateSelector
            onPrevious={() => {
              const newMonth = month.subtract(1, "month");
              handleDatesChange("decrement", "month", setMonth);
              toggleItemsActions?.monthly(newMonth);
              onPeriodChange?.('monthly', newMonth);
            }}
            onNext={() => {
              const newMonth = month.add(1, "month");
              handleDatesChange("increment", "month", setMonth);
              toggleItemsActions?.monthly(newMonth);
              onPeriodChange?.('monthly', newMonth);
            }}
            displayValue={month.format("MMM YYYY")}
          />
        )}

        {alignment == "yearly" && (
          <DateSelector
            onPrevious={() => {
              const newYear = year.subtract(1, "year");
              handleDatesChange("decrement", "year", setYear);
              toggleItemsActions?.yearly(newYear);
              onPeriodChange?.('yearly', newYear);
            }}
            onNext={() => {
              const newYear = year.add(1, "year");
              handleDatesChange("increment", "year", setYear);
              toggleItemsActions?.yearly(newYear);
              onPeriodChange?.('yearly', newYear);
            }}
            displayValue={formatFiscalYearLabel(fiscalYear)}
          />
        )}
      </div>

      {viewMode === 'submissions' ? (
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
        />
      ) : (
        <>
          {alignment == "monthly" && <Monthly month={month} onEdit={onEdit || (() => { })} selectedEmployeeId={selectedEmployeeId} showEditDeleteOption={showEditDeleteOption} showIdCol={showIdCol} showName={showName} resource={resource} viewOwn={viewOwn} viewOthers={viewOthers} checkOwnWithOthers={checkOwnWithOthers} />}

          {alignment == "yearly" && <Yearly year={year} onEdit={onEdit || (() => { })} selectedEmployeeId={selectedEmployeeId} showEditDeleteOption={showEditDeleteOption} showIdCol={showIdCol} showName={showName} resource={resource} viewOwn={viewOwn} viewOthers={viewOthers} checkOwnWithOthers={checkOwnWithOthers} />}

          {alignment == "allTime" && <AllTime resource={resource} viewOwn={viewOwn} viewOthers={viewOthers} checkOwnWithOthers={checkOwnWithOthers} onEdit={onEdit || (() => { })} selectedEmployeeId={selectedEmployeeId} showEditDeleteOption={showEditDeleteOption} showIdCol={showIdCol} showName={showName} />}
        </>
      )}
    </>
  );
};

export default MaterialToggleReimbursement;