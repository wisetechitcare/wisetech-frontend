import { useState, useEffect } from "react";
import { ToggleButton, ToggleButtonGroup, Container } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { toAbsoluteUrl } from "@metronic/helpers";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import Weekly from "@pages/employee/kpis/common/Weekly";
import Monthly from "@pages/employee/kpis/common/Monthly";
import Yearly from "@pages/employee/kpis/common/Yearly";
import Custom from "@pages/employee/kpis/common/Custom";
import { resourseAndView } from "@models/company";
import { useDispatch } from "react-redux";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import { fetchConfiguration } from "@services/company";
import { DATE_SETTINGS_KEY } from "@constants/configurations-key";

type LeaderboardTab = "weekly" | "monthly" | "yearly" | "custom";

const DashboardLeaderboard = () => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("weekly");

  const today = dayjs();
  const [weekStart, setWeekStart] = useState(today.startOf("week"));
  const [weekEnd, setWeekEnd] = useState(today.endOf("week"));
  const [monthStart, setMonthStart] = useState(today.startOf("month"));
  const [monthEnd, setMonthEnd] = useState(today.endOf("month"));
  const [yearStart, setYearStart] = useState<Dayjs | null>(null);
  const [yearEnd, setYearEnd] = useState<Dayjs | null>(null);
  const [fiscalYearDisplay, setFiscalYearDisplay] = useState("");
  const [customStartDate, setCustomStartDate] = useState<Dayjs | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Dayjs | undefined>(undefined);
  const [dateSettingsEnabled, setDateSettingsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fromAdmin = false; // Personal view
  const resourseAndView: resourseAndView[] = []; // Add permissions if needed

  const isCurrentFiscalYear = (fiscalStart: Dayjs, fiscalEnd: Dayjs): boolean => {
    return today.isSameOrAfter(fiscalStart, "day") && today.isSameOrBefore(fiscalEnd, "day");
  };

  useEffect(() => {
    dispatch(fetchRolesAndPermissions() as any);
  }, [dispatch]);

  useEffect(() => {
    async function fetchDateSettings() {
      try {
        const {
          data: { configuration },
        } = await fetchConfiguration(DATE_SETTINGS_KEY);
        const parsed =
          typeof configuration.configuration === "string"
            ? JSON.parse(configuration.configuration)
            : configuration.configuration;
        setDateSettingsEnabled(parsed?.useDateSettings ?? false);
      } catch (err) {
        console.error("Error fetching date settings", err);
        setDateSettingsEnabled(false);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDateSettings();
  }, []);

  // Update week/month end dates when dateSettingsEnabled changes
  useEffect(() => {
    if (isLoading) return;

    // Update week end
    if (dateSettingsEnabled && weekStart.isSame(today, "week")) {
      setWeekEnd(today);
    } else {
      setWeekEnd(weekStart.endOf("week"));
    }

    // Update month end
    if (dateSettingsEnabled && monthStart.isSame(today, "month")) {
      setMonthEnd(today);
    } else {
      setMonthEnd(monthStart.endOf("month"));
    }
  }, [dateSettingsEnabled, isLoading]);

  useEffect(() => {
    if (!today) return;

    async function calculateFiscalYear() {
      const { startDate, endDate } = await generateFiscalYearFromGivenYear(today);
      const fiscalStart = dayjs(startDate);
      const fiscalEnd =
        isCurrentFiscalYear(fiscalStart, dayjs(endDate)) && dateSettingsEnabled
          ? today
          : dayjs(endDate);

      setYearStart(fiscalStart);
      setYearEnd(fiscalEnd);
      setFiscalYearDisplay(
        `${fiscalStart.format("DD MMM, YYYY")} - ${fiscalEnd.format("DD MMM, YYYY")}`
      );
    }

    calculateFiscalYear();
  }, [dateSettingsEnabled]);

  const handleTabChange = (
    event: React.MouseEvent<HTMLElement>,
    newTab: LeaderboardTab
  ) => {
    if (newTab) {
      setActiveTab(newTab);
    }
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const offset = direction === "prev" ? -1 : 1;
    const newWeekStart = weekStart.add(offset, "week");
    const newWeekEnd =
      dateSettingsEnabled && newWeekStart.isSame(today, "week")
        ? today
        : newWeekStart.endOf("week");

    setWeekStart(newWeekStart);
    setWeekEnd(newWeekEnd);
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
  };

  const navigateYear = async (direction: "prev" | "next") => {
    const offset = direction === "prev" ? -1 : 1;
    const base = yearStart ?? today;
    const newFiscalYearDate = base.add(offset, "year");

    const { startDate, endDate } = await generateFiscalYearFromGivenYear(newFiscalYearDate);
    const fiscalStart = dayjs(startDate);
    const fiscalEnd =
      isCurrentFiscalYear(fiscalStart, dayjs(endDate)) && dateSettingsEnabled
        ? today
        : dayjs(endDate);

    setYearStart(fiscalStart);
    setYearEnd(fiscalEnd);
    setFiscalYearDisplay(
      `${fiscalStart.format("DD MMM, YYYY")} - ${fiscalEnd.format("DD MMM, YYYY")}`
    );
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
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <button
        className="btn btn-sm p-0"
        onClick={onPrev}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        <img
          src={toAbsoluteUrl("media/svg/misc/back.svg")}
          alt="Previous"
          style={{ width: "24px", height: "24px" }}
        />
      </button>
      <span
        style={{
          fontSize: "14px",
          fontFamily: "Inter",
          whiteSpace: "nowrap",
        }}
      >
        {displayText}
      </span>
      <button
        className="btn btn-sm p-0"
        onClick={onNext}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        <img
          src={toAbsoluteUrl("media/svg/misc/next.svg")}
          alt="Next"
          style={{ width: "24px", height: "24px" }}
        />
      </button>
    </div>
  );

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "16px",
        padding: "16px 20px",
        boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header Section */}
      <div style={{ marginBottom: "16px" }}>
        <h2
          style={{
            fontSize: "20px",
            fontWeight: 600,
            margin: "0 0 16px 0",
            fontFamily: "Barlow, sans-serif",
            letterSpacing: "0.2px",
          }}
        >
         KPI - Top 5 Overall

        </h2>

        {/* Tabs and Navigation */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <ToggleButtonGroup
            value={activeTab}
            exclusive
            onChange={handleTabChange}
            aria-label="leaderboard period"
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              "& .MuiToggleButton-root": {
                borderRadius: "20px",
                borderColor: "#A0B4D2 !important",
                color: "#000000 !important",
                paddingX: { xs: "16px", md: "24px" },
                paddingY: "6px",
                borderWidth: "2px",
                fontWeight: "600",
                fontSize: { xs: "12px", sm: "14px" },
                height: "36px",
                fontFamily: "Inter",
                textTransform: "none",
              },
              "& .Mui-selected": {
                borderColor: "#9D4141 !important",
                color: "#9D4141 !important",
              },
              "& .MuiToggleButton-root:hover": {
                borderColor: "#9D4141 !important",
                color: "#9D4141 !important",
              },
            }}
          >
            <ToggleButton value="weekly">Weekly</ToggleButton>
            <ToggleButton value="monthly">Monthly</ToggleButton>
            <ToggleButton value="yearly">Yearly</ToggleButton>
            <ToggleButton value="custom">Custom</ToggleButton>
          </ToggleButtonGroup>

          {/* Navigation Buttons */}
          {activeTab === "weekly" && (
            <NavigationButtons
              onPrev={() => navigateWeek("prev")}
              onNext={() => navigateWeek("next")}
              displayText={`${weekStart.format("DD MMM, YYYY")} - ${weekEnd.format(
                "DD MMM, YYYY"
              )}`}
            />
          )}

          {activeTab === "monthly" && (
            <NavigationButtons
              onPrev={() => navigateMonth("prev")}
              onNext={() => navigateMonth("next")}
              displayText={`${monthStart.format("DD MMM, YYYY")} - ${monthEnd.format(
                "DD MMM, YYYY"
              )}`}
            />
          )}

          {activeTab === "yearly" && yearStart && yearEnd && (
            <NavigationButtons
              onPrev={() => navigateYear("prev")}
              onNext={() => navigateYear("next")}
              displayText={fiscalYearDisplay}
            />
          )}

          {activeTab === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Start Date"
                  value={customStartDate}
                  onChange={(newValue) => {
                    setCustomStartDate(newValue ?? undefined);
                  }}
                  maxDate={customEndDate}
                  format="DD MMM, YYYY"
                  slotProps={{
                    textField: {
                      size: "small",
                      sx: { width: "180px" },
                    },
                  }}
                />
                <DatePicker
                  label="End Date"
                  value={customEndDate}
                  onChange={(newValue) => {
                    setCustomEndDate(newValue ?? undefined);
                  }}
                  minDate={customStartDate}
                  format="DD MMM, YYYY"
                  slotProps={{
                    textField: {
                      size: "small",
                      sx: { width: "180px" },
                    },
                  }}
                />
              </LocalizationProvider>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard Content */}
      <div className="dashboard-leaderboard-content">
        <style>
          {`
            /* Keep Top 5 Overall (first Row), hide Top Employees by Factors and Star Employees sections */
            .dashboard-leaderboard-content > div > .row:not(.mt-7) {
              display: none !important;
            }
            /* Hide CommonCard sections that contain "Top Employees By Factors" or "Star Employeess" */
            .dashboard-leaderboard-content h3:contains("Top Employees By Factors"),
            .dashboard-leaderboard-content h3:contains("Star Employeess") {
              display: none !important;
            }
            /* Hide the parent Row if h3 contains these texts */
            .dashboard-leaderboard-content .row:has(h3:contains("Top Employees By Factors")),
            .dashboard-leaderboard-content .row:has(h3:contains("Star Employeess")) {
              display: none !important;
            }
            /* More specific: hide all Rows after the first mt-7 Row */
            .dashboard-leaderboard-content .row.mt-7 ~ .row {
              display: none !important;
            }
          `}
        </style>
        {activeTab === "weekly" && (
          <Weekly
            startWeek={weekStart}
            endWeek={weekEnd}
            fromAdmin={fromAdmin}
            resourseAndView={resourseAndView}
            dateSettingsEnabled={dateSettingsEnabled}
          />
        )}

        {activeTab === "monthly" && (
          <Monthly
            month={monthStart}
            endDate={monthEnd}
            fromAdmin={fromAdmin}
            resourseAndView={resourseAndView}
            dateSettingsEnabled={dateSettingsEnabled}
          />
        )}

        {activeTab === "yearly" && yearStart && yearEnd && (
          <Yearly
            year={yearStart}
            endDate={yearEnd}
            fromAdmin={fromAdmin}
            resourseAndView={resourseAndView}
            dateSettingsEnabled={dateSettingsEnabled}
          />
        )}

        {activeTab === "custom" ? (
          customStartDate && customEndDate ? (
            <Custom
              startDate={customStartDate}
              endDate={customEndDate}
              fromAdmin={fromAdmin}
              resourseAndView={resourseAndView}
            />
          ) : (
            <Container
              className="my-4 w-100 px-0 d-flex justify-content-center align-items-center"
              style={{ minHeight: "300px" }}
            >
              <div className="text-center" role="alert">
                <h4>Custom Date Range</h4>
                <p className="mb-2">You've selected custom date range mode.</p>
                <p className="mb-0">
                  <strong>Missing:</strong>{" "}
                  {!customStartDate && "Start Date"}{" "}
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
      </div>
    </div>
  );
};

export default DashboardLeaderboard;
