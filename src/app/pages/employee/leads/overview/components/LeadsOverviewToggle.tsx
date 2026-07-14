import { Container } from "@mui/material";
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
import TimePeriodDropdown, { TimePeriodMode } from "@app/modules/common/components/TimePeriodDropdown";
import PeriodTabs from "@app/modules/common/components/PeriodTabs";
import PeriodNavigator from "@app/modules/common/components/PeriodNavigator";
import Monthly from "./Monthly";
import Yearly from "./Yearly";
import Custom from "./Custom";
import AllTime from "./AllTime";
import ChartVisibilitySettings from "@pages/company/settings/ChartVisibilitySettings";
import { PROJECT_CHART_SETTINGS_MODAL_TYPE } from "@constants/configurations-key";
import { Modal } from "react-bootstrap";
import { Typography } from "@mui/material";
import eventBus from "@utils/EventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import LeadBulkImport from "../../lead/LeadBulkImport";
import LeadWizardModal from "../../lead/LeadWizardModal";

export type ToggleItemsCallBackFunctions = {
  monthly: (date: Dayjs, endDate: Dayjs) => void;
  yearly: (date: Dayjs, endDate: Dayjs) => void;
  custom: (startDate: Dayjs, endDate: Dayjs) => void;
};

interface MaterialToggleProps {
  toggleItemsActions?: ToggleItemsCallBackFunctions;
  fromAdmin?: boolean;
  dateSettingsEnabled: boolean;
}


const LeadsOverviewToggle = ({
  toggleItemsActions,
  fromAdmin = false,
  dateSettingsEnabled,
}: MaterialToggleProps) => {
  const dispatch = useDispatch();
  const today = dayjs();

  const [alignment, setAlignment] = useState("yearly");

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
  const [customStartDate, setCustomStartDate] = useState<Dayjs | undefined>(
    undefined
  );
  const [customEndDate, setCustomEndDate] = useState<Dayjs | undefined>(
    undefined
  );
  const [formValues, setFormValues] = useState<any | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showChartSettingsModal, setShowChartSettingsModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const isCurrentFiscalYear = (
    fiscalStart: Dayjs,
    fiscalEnd: Dayjs
  ): boolean => {
    return (
      today.isSameOrAfter(fiscalStart, "day") &&
      today.isSameOrBefore(fiscalEnd, "day")
    );
  };

  // "FY 2026-27" reads clearly as a fiscal year even when start/end share a
  // calendar year edge case; "· to 9 Jul" is appended only when the range is
  // clamped to today (year-to-date) so it's never confused with the full close.
  const buildFiscalYearLabel = (
    fiscalStart: Dayjs,
    rawEnd: Dayjs,
    clampedEnd: Dayjs
  ): string => {
    const startYear = fiscalStart.format("YYYY");
    const endYear = rawEnd.format("YYYY");
    const base =
      startYear === endYear ? `FY ${startYear}` : `FY ${startYear}-${rawEnd.format("YY")}`;
    const isClamped = !clampedEnd.isSame(rawEnd, "day");
    return isClamped ? `${base} · to ${clampedEnd.format("D MMM")}` : base;
  };

  useEffect(() => {
    dispatch(fetchRolesAndPermissions() as any);
  }, []);

  useEffect(() => {
    const handleChartSettingsUpdate = () => {
      setRefreshTrigger(prev => prev + 1);
    };

    const handleCloseModal = () => {
      setShowChartSettingsModal(false);
    };

    eventBus.on(EVENT_KEYS.chartSettingsUpdated, handleChartSettingsUpdate);
    eventBus.on(EVENT_KEYS.closeChartDialogModal, handleCloseModal);

    return () => {
      eventBus.off(EVENT_KEYS.chartSettingsUpdated, handleChartSettingsUpdate);
      eventBus.off(EVENT_KEYS.closeChartDialogModal, handleCloseModal);
    };
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
      setFiscalYearDisplay(buildFiscalYearLabel(fiscalStart, dayjs(endDate), fiscalEnd));

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
      case "monthly":
        toggleItemsActions?.monthly(monthStart, monthEnd);
        break;
      case "yearly":
        if (yearStart && yearEnd) {
          toggleItemsActions?.yearly(yearStart, yearEnd);
        }
        break;
      case "alltime":
        // All-time view doesn't need date parameters
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          toggleItemsActions?.custom(customStartDate, customEndDate);
        }
        break;
    }
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
    setFiscalYearDisplay(buildFiscalYearLabel(fiscalStart, dayjs(endDate), fiscalEnd));
    toggleItemsActions?.yearly(fiscalStart, fiscalEnd);
  };

  const handleOpenChartSettingsModal = () => {
    setShowChartSettingsModal(true);
  };

  const handleCloseChartSettingsModal = () => {
    setShowChartSettingsModal(false);
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
        <div className="d-flex align-items-center gap-3">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24"
            viewBox="0 0 24 24" 
            fill="none"
            onClick={handleOpenChartSettingsModal}
            style={{ cursor: 'pointer' }}
          >
            <path d="M10.5 6H20.25M10.5 6C10.5 6.39782 10.342 6.77936 10.0607 7.06066C9.77936 7.34196 9.39782 7.5 9 7.5C8.60218 7.5 8.22064 7.34196 7.93934 7.06066C7.65804 6.77936 7.5 6.39782 7.5 6M10.5 6C10.5 5.60218 10.342 5.22064 10.0607 4.93934C9.77936 4.65804 9.39782 4.5 9 4.5C8.60218 4.5 8.22064 4.65804 7.93934 4.93934C7.65804 5.22064 7.5 5.60218 7.5 6M7.5 6H3.75M10.5 18H20.25M10.5 18C10.5 18.3978 10.342 18.7794 10.0607 19.0607C9.77936 19.342 9.39782 19.5 9 19.5C8.60218 19.5 8.22064 19.342 7.93934 19.0607C7.65804 18.7794 7.5 18.3978 7.5 18M10.5 18C10.5 17.6022 10.342 17.2206 10.0607 16.9393C9.77936 16.658 9.39782 16.5 9 16.5C8.60218 16.5 8.22064 16.658 7.93934 16.9393C7.65804 17.2206 7.5 17.6022 7.5 18M7.5 18H3.75M16.5 12H20.25M16.5 12C16.5 12.3978 16.342 12.7794 16.0607 13.0607C15.7794 13.342 15.3978 13.5 15 13.5C14.6022 13.5 14.2206 13.342 13.9393 13.0607C13.658 12.7794 13.5 12.3978 13.5 12M16.5 12C16.5 11.6022 16.342 11.2206 16.0607 10.9393C15.7794 10.658 15.3978 10.5 15 10.5C14.6022 10.5 14.2206 10.658 13.9393 10.9393C13.658 11.2206 13.5 11.6022 13.5 12M13.5 12H3.75" stroke="#7A2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <button 
            className="btn btn-sm btn-light-primary fw-bold"
            onClick={() => setShowBulkImport(true)}
          >
            Bulk Import
          </button>
          <button 
            className="btn btn-sm btn-primary fw-bold"
            onClick={() => setFormValues({ leadTemplateId: "blank" })}
            style={{ backgroundColor: "#9D4141", border: "none" }}
          >
            + New Lead
          </button>
        </div>
      </div>

      <div className="d-flex flex-row justify-content-between align-items-center mb-6">
        <PeriodTabs
          value={alignment}
          options={[
            { label: 'Monthly', value: 'monthly' },
            { label: 'Yearly', value: 'yearly' },
            { label: 'All Time', value: 'alltime' },
            { label: 'Custom', value: 'custom' },
          ]}
          onChange={(val) => handleChange(null as any, val)}
          ariaLabel="view selection"
        />
        <div>
          {alignment === "monthly" && (
            <PeriodNavigator
              label={`${monthStart.format("DD MMM")} - ${monthEnd.format("DD MMM")}`}
              onPrevious={() => navigateMonth("prev")}
              onNext={() => navigateMonth("next")}
            />
          )}

          {alignment === "yearly" && yearStart && yearEnd && (
            <PeriodNavigator
              label={fiscalYearDisplay}
              onPrevious={() => navigateYear("prev")}
              onNext={() => navigateYear("next")}
            />
          )}

          {alignment === "alltime" && (
            <div style={{ textAlign: "center", opacity: 0.7, fontSize: "14px" }}>
              All-Time Summary
            </div>
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

      {alignment === "monthly" && (
        <Monthly month={monthStart} endDate={monthEnd} key={`monthly-${refreshTrigger}`} />
      )}
      {alignment === "yearly" && yearStart && yearEnd && (
        <Yearly startDate={yearStart} endDate={yearEnd} key={`yearly-${refreshTrigger}`} />
      )}
      {alignment === "alltime" && (
        <AllTime key={`alltime-${refreshTrigger}`} />
      )}
      {alignment === "custom" ? (
        customStartDate && customEndDate ? (
          <Custom startDate={customStartDate} endDate={customEndDate} key={`custom-${refreshTrigger}`} />
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

      

      <LeadWizardModal
        key={formValues ? `new-${formValues.leadTemplateId}` : "new-lead-modal"}
        open={!!formValues}
        onClose={() => setFormValues(null)}
        onSubmit={() => {
          setRefreshTrigger((prev) => prev + 1);
          setFormValues(null);
        }}
        initialFormData={formValues}
        isEditMode={false}
        leadTemplateId={formValues?.leadTemplateId}
        title="New Lead"
      />

      <LeadBulkImport
        show={showBulkImport}
        onHide={() => setShowBulkImport(false)}
      />

      {/* Chart Settings Modal */}
      <Modal
        show={showChartSettingsModal}
        onHide={handleCloseChartSettingsModal}
        size="xl"
        centered
        className="responsive-modal"
      >
        {/* <Modal.Header closeButton style={{ backgroundColor: '#F3F4F7', borderBottom: '1px solid #e0e0e0' }}>
            
        </Modal.Header> */}
        <Modal.Body style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
            <div style={{ 
                backgroundColor: 'white', 
                padding: '20px', 
                borderRadius: '8px',
            }}>
              <Typography
                  style={{ 
                  fontFamily: 'Inter', 
                  fontWeight: 600, 
                  fontSize: '18px', 
                  color: '#333' 
              }}
              >
                Customize Cards Visisbility
              </Typography>
              <ChartVisibilitySettings type={PROJECT_CHART_SETTINGS_MODAL_TYPE.LEAD} />
            </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default LeadsOverviewToggle;
