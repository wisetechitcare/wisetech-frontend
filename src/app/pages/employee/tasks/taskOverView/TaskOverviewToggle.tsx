import { toAbsoluteUrl } from "@metronic/helpers";
import { Container, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import dayjs, { Dayjs } from "dayjs";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
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
  }: {
    onPrev: () => void;
    onNext: () => void;
    displayText: string;
  }) => (
    <div className="d-flex align-items-center">
      <button className="btn btn-sm p-0 " onClick={onPrev}>
        <img src={toAbsoluteUrl("media/svg/misc/back.svg")} alt="Previous" />
      </button>
      <span className="mx-2 mt-0 fw-bold lh-base font-barlow">{displayText}</span>
      <button className="btn btn-sm p-0" onClick={onNext}>
        <img src={toAbsoluteUrl("media/svg/misc/next.svg")} alt="Next" />
      </button>
    </div>
  );

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
            <Select
              value={alignment}
              onChange={(e) => handleChange(e as any, e.target.value)}
              fullWidth
              displayEmpty
              variant="outlined"
              size="small"
              sx={{
                borderRadius: "20px",
                "& .MuiOutlinedInput-root": {
                  borderRadius: "20px",
                  backgroundColor: "transparent", // Ensure no background
                  "&:hover": {
                    backgroundColor: "transparent", // Remove hover background
                  },
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderRadius: "20px",
                  borderColor: "#D2B48C",
                  borderWidth: "3px",
                },
                "& .Mui-selected": {
                  borderColor: "#9D4141 !important",
                  color: "#9D4141 !important",
                  backgroundColor: "transparent !important", // Remove selection background
                },
              }}
            >
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="yearly">Yearly</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          ) : (
            <ToggleButtonGroup
              value={alignment}
              exclusive
              onChange={handleChange}
              aria-label="view selection"
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                justifyContent: "center",
                width: "100%",
                "& .MuiToggleButton-root": {
                  borderRadius: "20px",
                  borderColor: "#A0B4D2 !important",
                  color: "#000000 !important",
                  paddingX: {
                    xs: "32px",
                    md: "45px",
                  },
                  borderWidth: "2px",
                  fontWeight: "600",
                  width: {
                    xs: "65px",
                    sm: "75px",
                  },
                  fontSize: {
                    xs: "10px",
                    sm: "12px",
                  },
                  height: { xs: "30px", sm: "36px" },
                  fontFamily: "Inter",
                  backgroundColor: "transparent !important", // Remove default background
                  "&:hover": {
                    backgroundColor: "transparent !important", // Remove hover background
                    borderColor: "#9D4141 !important",
                    color: "#9D4141 !important",
                  },
                },
                "& .Mui-selected": {
                  borderColor: "#9D4141 !important",
                  color: "#9D4141 !important",
                  backgroundColor: "transparent !important", // Remove selected background
                },
              }}
            >
              <ToggleButton value="weekly">Weekly</ToggleButton>
              <ToggleButton value="monthly">Monthly</ToggleButton>
              <ToggleButton value="yearly">Yearly</ToggleButton>
              <ToggleButton value="custom">Custom</ToggleButton>
            </ToggleButtonGroup>
          )}
        </div>
        <div>
          {alignment === "weekly" && (
            <NavigationButtons
              onPrev={() => navigateWeek("prev")}
              onNext={() => navigateWeek("next")}
              displayText={`${weekStart.format("DD MMM")} - ${weekEnd.format(
                "DD MMM"
              )}`}
            />
          )}

          {alignment === "monthly" && (
            <NavigationButtons
              onPrev={() => navigateMonth("prev")}
              onNext={() => navigateMonth("next")}
              displayText={`${monthStart.format("DD MMM")} - ${monthEnd.format(
                "DD MMM"
              )}`}
            />
          )}

          {alignment === "yearly" && yearStart && yearEnd && (
            <NavigationButtons
              onPrev={() => navigateYear("prev")}
              onNext={() => navigateYear("next")}
              displayText={fiscalYearDisplay}
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
              {/* <i className="fas fa-calendar-alt mb-3" style={{fontSize: '2rem', color: '#9D4141'}}></i> */}
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
