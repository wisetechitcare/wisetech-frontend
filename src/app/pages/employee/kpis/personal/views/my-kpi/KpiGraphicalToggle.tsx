import { toAbsoluteUrl } from "@metronic/helpers";
import { Container, ToggleButton, ToggleButtonGroup } from "@mui/material";
import Daily from "@pages/employee/kpis/personal/views/my-kpi/Daily";
import Weekly from "@pages/employee/kpis/personal/views/my-kpi/Weekly";
import Monthly from "@pages/employee/kpis/personal/views/my-kpi/Monthly";
import Yearly from "@pages/employee/kpis/personal/views/my-kpi/Yearly";
import AllTime from "@pages/employee/kpis/personal/views/my-kpi/AllTime";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import dayjs, { Dayjs } from "dayjs";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { resourseAndView } from "@models/company";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import Custom from './Custom'

export type ToggleItemsCallBackFunctions = {
  daily: (date: Dayjs) => void;
  weekly: (startDate: Dayjs, endDate: Dayjs) => void;
  monthly: (date: Dayjs, endDate: Dayjs) => void;
  yearly: (date: Dayjs, endDate: Dayjs) => void;
  alltime: () => void;
  custom: (startDate: Dayjs, endDate: Dayjs) => void;
};

interface MaterialToggleProps {
  toggleItemsActions?: ToggleItemsCallBackFunctions;
  fromAdmin?: boolean;
  resourseAndView: resourseAndView[];
  dateSettingsEnabled: boolean;
  dashboardView?: boolean;
}

const KpiGraphicalToggle = ({
  toggleItemsActions,
  fromAdmin = false,
  resourseAndView,
  dateSettingsEnabled,
  dashboardView,
}: MaterialToggleProps) => {
  const dispatch = useDispatch();
  const today = dayjs();

  const [alignment, setAlignment] = useState("weekly");

  const [day, setDay] = useState(today);
  // week should be start from monday to sunday
const [weekStart, setWeekStart] = useState(() => {

  const dayOfWeek = today.day();
  if (dayOfWeek === 0) {
    return today.subtract(6, "day");
  } else {
    return today.subtract(dayOfWeek - 1, "day");
  }
});

const [weekEnd, setWeekEnd] = useState(() => {
  const dayOfWeek = today.day();
  const thisWeekStart = dayOfWeek === 0
    ? today.subtract(6, "day")
    : today.subtract(dayOfWeek - 1, "day");

  if (dateSettingsEnabled) {
    return today;
  } else {
    return thisWeekStart.add(6, "day");
  }
});

  const [monthStart, setMonthStart] = useState(today.startOf("month"));
  const [monthEnd, setMonthEnd] = useState(
    dateSettingsEnabled ? today : today.endOf("month")
  );

  const [yearStart, setYearStart] = useState<Dayjs | null>(null);
  const [yearEnd, setYearEnd] = useState<Dayjs | null>(null);

  const [customStartDate, setCustomStartDate] = useState<Dayjs | undefined>(
    undefined
  );
  const [customEndDate, setCustomEndDate] = useState<Dayjs | undefined>(
    undefined
  );

  const [fiscalYearDisplay, setFiscalYearDisplay] = useState("");

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
        `${fiscalStart.format("DD MMM, YYYY")} - ${fiscalEnd.format(
          "DD MMM, YYYY"
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
      case "daily":
        toggleItemsActions?.daily(day);
        break;
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
      case "alltime":
        toggleItemsActions?.alltime();
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          toggleItemsActions?.custom(customStartDate, customEndDate);
        }
        break;
    }
  };

  const navigateDay = (direction: "prev" | "next") => {
    const newDay =
      direction === "prev" ? day.subtract(1, "day") : day.add(1, "day");
    setDay(newDay);
    toggleItemsActions?.daily(newDay);
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const offset = direction === "prev" ? -1 : 1;
    const newWeekStart = weekStart.add(offset, "week");

    const todayDayOfWeek = today.day();
    const todayWeekStart = todayDayOfWeek === 0
      ? today.subtract(6, "day")
      : today.subtract(todayDayOfWeek - 1, "day");

    const isSameWeekAsToday = newWeekStart.isSame(todayWeekStart, 'day');

    let newWeekEnd;
    if (dateSettingsEnabled && isSameWeekAsToday) {
      newWeekEnd = today.clone();
    } else {
      newWeekEnd = newWeekStart.add(6, "day");
    }

    setWeekStart(newWeekStart);
    setWeekEnd(newWeekEnd);
    toggleItemsActions?.weekly(newWeekStart, newWeekEnd);
  };

  const navigateAllTime = () => {
    setAlignment("alltime");
    toggleItemsActions?.alltime();
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
      `${fiscalStart.format("DD MMM, YYYY")} - ${fiscalEnd.format(
        "DD MMM, YYYY"
      )}`
    );
    toggleItemsActions?.yearly(fiscalStart, fiscalEnd);
  };

  const NavigationButtons = ({
    onPrev,
    onNext,
    displayText,
    dashboardView 
  }: {
    onPrev: () => void;
    onNext: () => void;
    displayText: string;
    dashboardView?: boolean;
  }) => (
    <div className="mb-6">
      <button className="btn btn-sm p-0" onClick={onPrev}>
        <img src={toAbsoluteUrl("media/svg/misc/back.svg")} alt="Previous" />
      </button>
      <span className="mx-2 my-5">{displayText}</span>
      <button className="btn btn-sm p-0" onClick={onNext}>
        <img src={toAbsoluteUrl("media/svg/misc/next.svg")} alt="Next" />
      </button>
    </div>
  );

  return (
    <>
      <div className="d-flex flex-md-row flex-column justify-content-lg-between align-items-lg-center justify-content-start align-items-start">
        <div className="col-12 col-sm-auto mb-3" >
          <ToggleButtonGroup
            value={alignment}
            exclusive
            onChange={handleChange}
            aria-label="view selection"
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              justifyContent: 'between',
              alignItems:"center",
              width: '100%',
              '& .MuiToggleButton-root': {
                borderRadius: '20px',
                borderColor: '#A0B4D2 !important',
                color: '#000000 !important',
                // paddingY: {xs:'1px',sm:'5px'},
                paddingX: {
                  xs: "0px",
                  md: "45px"
                },
                marginBottom:{
                  xs:"10px",
                  md:"20px"
                },
                borderWidth: '2px',
                fontWeight: '600',
                width: {
                  xs: '65px', 
                  sm: '75px'   
                },
                fontSize: {
                  xs: '10px',
                  sm: '12px'
                },
                height: { xs: "30px", sm: '36px' },
                fontFamily: 'Inter',
              },
              '& .Mui-selected': {
                borderColor: '#9D4141 !important',
                color: '#9D4141 !important',
              },
              '& .MuiToggleButton-root:hover': {
                borderColor: '#9D4141 !important',
                color: '#9D4141 !important',
              },
            }}
          >
            {/* <ToggleButton value="daily">Daily</ToggleButton> */}
            <ToggleButton value="weekly">Weekly</ToggleButton>
            <ToggleButton value="monthly">Monthly</ToggleButton>
            <ToggleButton value="yearly">Yearly</ToggleButton>
            <ToggleButton value="custom">Custom</ToggleButton>
            {/* <ToggleButton value="alltime">All Time</ToggleButton> */}
          </ToggleButtonGroup>
        </div>
        {/* {alignment === "daily" && (
          <NavigationButtons
            onPrev={() => navigateDay("prev")}
            onNext={() => navigateDay("next")}
            displayText={day.format("DD MMM, YYYY")}
            dashboardView={dashboardView}
          />
        )} */}

        {alignment === "weekly" && (
          <NavigationButtons
            onPrev={() => navigateWeek("prev")}
            onNext={() => navigateWeek("next")}
            displayText={`${weekStart.format(
              "DD MMM, YYYY"
            )} - ${weekEnd.format("DD MMM, YYYY")}`}
            dashboardView={dashboardView}
          />
        )}

        {alignment === "monthly" && (
          <NavigationButtons
            onPrev={() => navigateMonth("prev")}
            onNext={() => navigateMonth("next")}
            displayText={`${monthStart.format(
              "DD MMM, YYYY"
            )} - ${monthEnd.format("DD MMM, YYYY")}`}
            dashboardView={dashboardView}
          />
        )}

        {alignment === "yearly" && yearStart && yearEnd && (
          <NavigationButtons
            onPrev={() => navigateYear("prev")}
            onNext={() => navigateYear("next")}
            displayText={fiscalYearDisplay}
            dashboardView={dashboardView}
          />
        )}

        {alignment === "custom" && (
          <div className="d-flex align-items-center gap-4 mt-4">
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

      {/* {alignment === "daily" && (
        <Daily
          day={day}
          fromAdmin={fromAdmin}
          resourseAndView={resourseAndView}
          dashboardView={dashboardView}
        />
      )} */}
      {alignment === "weekly" && (
        <Weekly
          startWeek={weekStart}
          endWeek={weekEnd}
          fromAdmin={fromAdmin}
          resourseAndView={resourseAndView}
          dateSettingsEnabled={dateSettingsEnabled}
          dashboardView={dashboardView}
        />
      )}
      {alignment === "monthly" && (
        <Monthly
          month={monthStart}
          endDate={monthEnd}
          fromAdmin={fromAdmin}
          resourseAndView={resourseAndView}
          dateSettingsEnabled={dateSettingsEnabled}
          dashboardView={dashboardView}
        />
      )}
      {alignment === "yearly" && yearStart && yearEnd && (
        <Yearly
          year={yearStart}
          endDate={yearEnd}
          fromAdmin={fromAdmin}
          resourseAndView={resourseAndView}
          dateSettingsEnabled={dateSettingsEnabled}
          dashboardView={dashboardView}
        />
      )}
      {alignment === "alltime" && (
        <AllTime
          fromAdmin={fromAdmin}
          resourseAndView={resourseAndView}
          // dashboardView={dashboardView}
        />
      )}
      {alignment === "custom" ? (
        customStartDate && customEndDate ? (
          <Custom
            startDate={customStartDate}
            endDate={customEndDate}
            fromAdmin={fromAdmin}
            resourseAndView={resourseAndView}
            // dashboardView={dashboardView}
          />
        ) : (
          <Container className="my-4 w-100 px-0 d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
            <div className=" text-center" role="alert">
              {/* <i className="fas fa-calendar-alt mb-3" style={{ fontSize: '2rem', color: '#9D4141' }}></i> */}
              <h4 className="">Custom Date Range</h4>
              <p className="mb-2">You've selected custom date range mode.</p>
              <p className="mb-0">
                <strong>Missing:</strong> {!customStartDate && 'Start Date'} {!customStartDate && !customEndDate && ' & '} {!customEndDate && 'End Date'}
              </p>
              <hr />
              <small className="text-muted">Please select the date range to view detailed statistics.</small>
            </div>
          </Container>
        )
      ) : null}
    </>
  );
};

export default KpiGraphicalToggle;
