import { toAbsoluteUrl } from "@metronic/helpers";
import { Container } from "@mui/material";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import PeriodTabs from "@app/modules/common/components/PeriodTabs";
import PeriodNavigator from "@app/modules/common/components/PeriodNavigator";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import dayjs, { Dayjs } from "dayjs";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import TimePeriodDropdown, { TimePeriodMode } from "@app/modules/common/components/TimePeriodDropdown";
import Monthly from "./components/Monthly";
import Yearly from "./components/Yearly";
import Custom from "./components/Custom";
import Weekly from "./components/Weekly";

export type ToggleItemsCallBackFunctions = {
  weekly: (date: Dayjs, endDate: Dayjs) => void;
  monthly: (date: Dayjs, endDate: Dayjs) => void;
  yearly: (date: Dayjs, endDate: Dayjs) => void;
  custom: (startDate: Dayjs, endDate: Dayjs) => void;
};

interface MaterialToggleProps {
  toggleItemsActions?: ToggleItemsCallBackFunctions;
  fromAdmin?: boolean;
  dateSettingsEnabled?: boolean;
}


const TaskOverviewToggle = ({
  toggleItemsActions,
  fromAdmin = false,
  dateSettingsEnabled,
}: MaterialToggleProps) => {
  const dispatch = useDispatch();
  const today = dayjs();

  const [alignment, setAlignment] = useState("weekly");

  const [day, setDay] = useState(today);
  // week should be start from monday to sunday
  const [weekStart, setWeekStart] = useState(
    today.startOf("week").add(1, "day")
  );
  const [weekEnd, setWeekEnd] = useState(
    dateSettingsEnabled ? today : today.endOf("week").add(1, "day")
  );

  const [monthStart, setMonthStart] = useState(today.startOf("month"));
  const [monthEnd, setMonthEnd] = useState(
    dateSettingsEnabled ? today : today.endOf("month")
  );

  const [yearStart, setYearStart] = useState<Dayjs | null>(null);
  const [yearEnd, setYearEnd] = useState<Dayjs | null>(null);
  const [fiscalYearDisplay, setFiscalYearDisplay] = useState("");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [customStartDate, setCustomStartDate] = useState<Dayjs | undefined>(
    undefined
  );
  const [customEndDate, setCustomEndDate] = useState<Dayjs | undefined>(
    undefined
  );
  const [showModal, setShowModal] = useState(false);

  const isCurrentFiscalYear = (
    fiscalStart: Dayjs,
    fiscalEnd: Dayjs
  ): boolean => {
    return (
      today.isSameOrAfter(fiscalStart, "day") &&
      today.isSameOrBefore(fiscalEnd, "day")
    );
  };

  useEffect(() => {
    dispatch(fetchRolesAndPermissions() as any);
  }, []);

  useEffect(() => {
    if (!today) return;

    async function calculateFiscalYear() {
      const { startDate, endDate } = await generateFiscalYearFromGivenYear(
        today
      );
      const fiscalStart = dayjs(startDate);
      const fiscalEnd =
        isCurrentFiscalYear(fiscalStart, dayjs(endDate)) && dateSettingsEnabled
          ? today
          : dayjs(endDate);

      setYearStart(fiscalStart);
      setYearEnd(fiscalEnd);
      setFiscalYearDisplay(
        `${fiscalStart.format("YYYY")} - ${fiscalEnd.format(
          "YYYY"
        )}`
      );

      if (alignment === "yearly" && toggleItemsActions?.yearly) {
        toggleItemsActions.yearly(fiscalStart, fiscalEnd);
      }
    }

    calculateFiscalYear();
  }, [dateSettingsEnabled, alignment]);

  const handleChange = (
    event: React.MouseEvent<HTMLElement>,
    newAlignment: string
  ) => {
    if (!newAlignment) return;

    setAlignment(newAlignment);

    switch (newAlignment) {
      case "weekly":
        toggleItemsActions?.weekly(weekStart, weekEnd);
        break;
      case "monthly":
        toggleItemsActions?.monthly(monthStart, monthEnd);
        break;
      case "yearly":
        if (yearStart && yearEnd) {
          toggleItemsActions?.yearly(yearStart, yearEnd);
        }
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          toggleItemsActions?.custom(customStartDate, customEndDate);
        }
        break;
    }
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const offset = direction === "prev" ? -1 : 1;
    const newWeekStart = weekStart.add(offset, "week");
    const newWeekEnd =
      dateSettingsEnabled && newWeekStart.isSame(today, "week")
        ? today
        : newWeekStart.endOf("week").add(1, "day");

    setWeekStart(newWeekStart);
    setWeekEnd(newWeekEnd);
    toggleItemsActions?.weekly(newWeekStart, newWeekEnd);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const offset = direction === "prev" ? -1 : 1;
    const newMonthStart = monthStart.add(offset, "month");
    const newMonthEnd =
      dateSettingsEnabled && newMonthStart.isSame(today, "month")
        ? today
        : newMonthStart.endOf("month");

    setMonthStart(newMonthStart);
    setMonthEnd(newMonthEnd);
    toggleItemsActions?.monthly(newMonthStart, newMonthEnd);
  };

  const navigateYear = async (direction: "prev" | "next") => {
    const offset = direction === "prev" ? -1 : 1;
    const base = yearStart ?? today;
    const newFiscalYearDate = base.add(offset, "year");

    const { startDate, endDate } = await generateFiscalYearFromGivenYear(
      newFiscalYearDate
    );
    const fiscalStart = dayjs(startDate);
    const fiscalEnd =
      isCurrentFiscalYear(fiscalStart, dayjs(endDate)) && dateSettingsEnabled
        ? today
        : dayjs(endDate);

    setYearStart(fiscalStart);
    setYearEnd(fiscalEnd);
    setFiscalYearDisplay(
      `${fiscalStart.format("YYYY")} - ${fiscalEnd.format(
        "YYYY"
      )}`
    );
    toggleItemsActions?.yearly(fiscalStart, fiscalEnd);
  };


  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div
          // className="mb-4"
          style={{
            fontFamily: "Barlow",
            fontSize: "24px",
            fontWeight: "600",
          }}
        >
          Overview
        </div>
      </div>

      <div className="d-flex flex-row justify-content-between align-items-center mb-6 ">
        <div className="d-flex flex-column align-items-center d-md-block">

          {isMobile ? (
            <TimePeriodDropdown
              value={alignment}
              onChange={(e) => handleChange(e as any, e.target.value)}
              fullWidth
              modes={["weekly", "monthly", "yearly"]}
            />
          ) : (
            <PeriodTabs
              value={alignment}
              options={[
                { label: 'Weekly', value: 'weekly' },
                { label: 'Monthly', value: 'monthly' },
                { label: 'Yearly', value: 'yearly' },
                { label: 'Custom', value: 'custom' },
              ]}
              onChange={(v) => handleChange(null as any, v)}
              ariaLabel="view selection"
            />
          )}
        </div>
        <div>
          {alignment === "weekly" && (
            <PeriodNavigator
              onPrevious={() => navigateWeek("prev")}
              onNext={() => navigateWeek("next")}
              label={`${weekStart.format("DD MMM")} - ${weekEnd.format("DD MMM")}`}
            />
          )}

          {alignment === "monthly" && (
            <PeriodNavigator
              onPrevious={() => navigateMonth("prev")}
              onNext={() => navigateMonth("next")}
              label={`${monthStart.format("DD MMM")} - ${monthEnd.format("DD MMM")}`}
            />
          )}

          {alignment === "yearly" && yearStart && yearEnd && (
            <PeriodNavigator
              onPrevious={() => navigateYear("prev")}
              onNext={() => navigateYear("next")}
              label={fiscalYearDisplay}
            />
          )}

          {alignment === "custom" && (
            <div className="d-flex align-items-center gap-4 mt-6 pt-6">
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Start Date"
                  value={customStartDate}
                  onChange={(newValue) => {
                    setCustomStartDate(newValue ?? undefined);
                    if (newValue && customEndDate) {
                      toggleItemsActions?.custom(newValue, customEndDate);
                    }
                  }}
                  maxDate={customEndDate}
                  format="DD MMM, YYYY"
                />
                <DatePicker
                  label="End Date"
                  value={customEndDate}
                  onChange={(newValue) => {
                    setCustomEndDate(newValue ?? undefined);
                    if (customStartDate && newValue) {
                      toggleItemsActions?.custom(customStartDate, newValue);
                    }
                  }}
                  minDate={customStartDate}
                  format="DD MMM, YYYY"
                />
              </LocalizationProvider>
            </div>
          )}
        </div>
      </div>

      {alignment === "weekly" && (
        <Weekly startDate={weekStart.format("DD MMM, YYYY")} endDate={weekEnd.format("DD MMM, YYYY")} />
      )}
      {alignment === "monthly" && (
        <Monthly month={monthStart.format("DD MMM, YYYY")} endDate={monthEnd.format("DD MMM, YYYY")} />
      )}
      {alignment === "yearly" && yearStart && yearEnd && (
        <Yearly startDate={yearStart.format("DD MMM, YYYY")} endDate={yearEnd.format("DD MMM, YYYY")} />
      )}
      {alignment === "custom" ? (
        customStartDate && customEndDate ? (
          <Custom startDate={customStartDate.format("DD MMM, YYYY")} endDate={customEndDate.format("DD MMM, YYYY")} />
        ) : (
          <Container
            className="my-4 w-100 px-0 d-flex justify-content-center align-items-center"
            style={{ minHeight: "300px" }}
          >
            <div className=" text-center" role="alert">
              {/* <i className="fas fa-calendar-alt mb-3" style={{fontSize: '2rem', color: '#1E3A8A'}}></i> */}
              <h4 className="alert-heading">Custom Date Range</h4>
              <p className="mb-2">You've selected custom date range mode.</p>
              <p className="mb-0">
                <strong>Missing:</strong> {!customStartDate && "Start Date"}{" "}
                {!customStartDate && !customEndDate && " & "}{" "}
                {!customEndDate && "End Date"}
              </p>
              <hr />
              <small className="text-muted">
                Please select the date range to view detailed statistics.
              </small>
            </div>
          </Container>
        )
      ) : null}
    </>
  );
};

export default TaskOverviewToggle;
