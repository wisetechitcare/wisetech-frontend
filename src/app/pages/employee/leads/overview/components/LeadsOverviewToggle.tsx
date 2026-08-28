import { Container } from "@mui/material";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import dayjs, { Dayjs } from "dayjs";
import React, { useEffect, useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import PeriodFilter, { PeriodRange } from "@app/modules/common/components/PeriodFilter";
import PeriodTabs from "@app/modules/common/components/PeriodTabs";
import { ChartMetric } from "@pages/dashboard/leadAnalytics";
import { DATE_FORMATS } from "@utils/dateFormats";
import { isSectionBlocked } from "@utils/accessAreas";
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
import SelectLeadOrganizationDialog from "../../lead/SelectLeadOrganizationDialog";

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

  const [periodRange, setPeriodRange] = useState<PeriodRange>({
    mode: "yearly",
    start: null,
    end: null,
    label: "",
  });
  const [customStartDate, setCustomStartDate] = useState<Dayjs | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Dayjs | undefined>(undefined);
  const [formValues, setFormValues] = useState<any | null>(null);
  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showChartSettingsModal, setShowChartSettingsModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Plot lead COUNT or lead VALUE. Lives here (not in each period view) so one
  // switch covers Daily/Weekly/Monthly/Yearly/All Time/Custom, and the choice
  // survives switching period. Pure display toggle — no refetch.
  const [metric, setMetric] = useState<ChartMetric>("count");

  useEffect(() => {
    dispatch(fetchRolesAndPermissions() as any);
  }, []);

  // If user loses access to amount view, revert to count
  useEffect(() => {
    if (metric === "amount" && isSectionBlocked('crm.leads')) {
      setMetric("count");
    }
  }, [metric]);

  // Compute metric options based on user permissions (must be at component level, not conditional)
  const metricOptions = useMemo(() => {
    const baseOptions = [
      { label: "Number", value: "count" },
    ];
    // Only show "Amount" if user has access to financial data (not blocked from leads analytics)
    if (!isSectionBlocked('crm.leads')) {
      baseOptions.push({ label: "Amount", value: "amount" });
    }
    return baseOptions;
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

  // Fire callbacks when period range changes
  useEffect(() => {
    const { mode, start, end } = periodRange;

    switch (mode) {
      case "monthly":
        if (start && end) toggleItemsActions?.monthly(start, end);
        break;
      case "yearly":
        if (start && end) toggleItemsActions?.yearly(start, end);
        break;
      case "allyear":
        // All-time view doesn't need date parameters
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          toggleItemsActions?.custom(customStartDate, customEndDate);
        }
        break;
    }
  }, [periodRange, customStartDate, customEndDate, toggleItemsActions]);

  const handleOpenChartSettingsModal = () => {
    setShowChartSettingsModal(true);
  };

  const handleCloseChartSettingsModal = () => {
    setShowChartSettingsModal(false);
  };

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div
          // className="mb-4"
          style={{
            fontFamily: "Barlow",
            fontSize: "clamp(1.15rem, 4vw, 24px)",
            fontWeight: "600",
          }}
        >
          Overview
        </div>
        <div className="d-flex align-items-center gap-2 gap-sm-3 flex-wrap">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24"
            viewBox="0 0 24 24" 
            fill="none"
            onClick={handleOpenChartSettingsModal}
            style={{ cursor: 'pointer' }}
          >
            <path d="M10.5 6H20.25M10.5 6C10.5 6.39782 10.342 6.77936 10.0607 7.06066C9.77936 7.34196 9.39782 7.5 9 7.5C8.60218 7.5 8.22064 7.34196 7.93934 7.06066C7.65804 6.77936 7.5 6.39782 7.5 6M10.5 6C10.5 5.60218 10.342 5.22064 10.0607 4.93934C9.77936 4.65804 9.39782 4.5 9 4.5C8.60218 4.5 8.22064 4.65804 7.93934 4.93934C7.65804 5.22064 7.5 5.60218 7.5 6M7.5 6H3.75M10.5 18H20.25M10.5 18C10.5 18.3978 10.342 18.7794 10.0607 19.0607C9.77936 19.342 9.39782 19.5 9 19.5C8.60218 19.5 8.22064 19.342 7.93934 19.0607C7.65804 18.7794 7.5 18.3978 7.5 18M10.5 18C10.5 17.6022 10.342 17.2206 10.0607 16.9393C9.77936 16.658 9.39782 16.5 9 16.5C8.60218 16.5 8.22064 16.658 7.93934 16.9393C7.65804 17.2206 7.5 17.6022 7.5 18M7.5 18H3.75M16.5 12H20.25M16.5 12C16.5 12.3978 16.342 12.7794 16.0607 13.0607C15.7794 13.342 15.3978 13.5 15 13.5C14.6022 13.5 14.2206 13.342 13.9393 13.0607C13.658 12.7794 13.5 12.3978 13.5 12M16.5 12C16.5 11.6022 16.342 11.2206 16.0607 10.9393C15.7794 10.658 15.3978 10.5 15 10.5C14.6022 10.5 14.2206 10.658 13.9393 10.9393C13.658 11.2206 13.5 11.6022 13.5 12M13.5 12H3.75" stroke="#172554" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <button 
            className="btn btn-sm btn-light-primary fw-bold"
            onClick={() => setShowBulkImport(true)}
          >
            Bulk Import
          </button>
          <button 
            className="btn btn-sm btn-primary fw-bold"
            onClick={() => setShowOrgPicker(true)}
            style={{ backgroundColor: "#1E3A8A", border: "none" }}
          >
            + New Lead
          </button>
        </div>
      </div>

      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-stretch align-items-lg-start mb-6 gap-3 w-100">
        <div className="d-flex align-items-center gap-4 flex-wrap" style={{ flex: "1 1 auto", minWidth: 0 }}>
          <PeriodFilter
            onChange={setPeriodRange}
            initialMode="yearly"
            storageKey="leadsOverviewPeriodMode"
            useFiscalYear={true}
            clampYearToToday={dateSettingsEnabled}
            getFiscalYearRange={generateFiscalYearFromGivenYear}
          />

          {periodRange.mode === "custom" && (
            <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-3 gap-sm-4">
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Start Date"
                  value={customStartDate}
                  onChange={(newValue) => setCustomStartDate(newValue ?? undefined)}
                  maxDate={customEndDate}
                  format={DATE_FORMATS.DATE_PICKER}
                />
                <DatePicker
                  label="End Date"
                  value={customEndDate}
                  onChange={(newValue) => setCustomEndDate(newValue ?? undefined)}
                  minDate={customStartDate}
                  format={DATE_FORMATS.DATE_PICKER}
                />
              </LocalizationProvider>
            </div>
          )}
        </div>

        {/* Right side controls: Metric selector & Tab slot grouped together */}
        <div className="d-flex align-items-center gap-3 flex-wrap justify-content-start justify-content-lg-end mt-2 mt-lg-0" style={{ flexShrink: 0, minWidth: 0 }}>
          {["monthly", "yearly", "allyear"].includes(periodRange.mode) && (
            <div className="d-flex align-items-center gap-2" style={{ height: "40px" }}>
              <span
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "#94A3B8",
                  whiteSpace: "nowrap",
                }}
              >
                Based on
              </span>
              <PeriodTabs
                value={metric}
                options={metricOptions}
                onChange={(val) => setMetric(val as ChartMetric)}
                ariaLabel="measure selection"
                sx={{
                  height: 32,
                  bgcolor: '#EEF2F7',
                  border: 'none',
                  p: '3px',
                  borderRadius: '10px',
                  '& .MuiToggleButtonGroup-grouped': {
                    px: 2.2,
                    borderRadius: '8px !important',
                  },
                  '& .Mui-selected': {
                    bgcolor: '#FFFFFF !important',
                    color: '#1E3A8A !important',
                    boxShadow: '0 1px 3px rgba(15,23,42,0.10)',
                    '&::after': {
                      display: 'none',
                    }
                  }
                }}
              />
            </div>
          )}

          {/* Sub-tabs (Summary / Services / Sources / Insights) portal into here */}
          <div
            id="leadOverviewTabSlot"
            className="d-flex align-items-center"
            style={{ minWidth: 0 }}
          />
        </div>
      </div>

      {/* Daily & Weekly are range views — reuse the range-based Custom dashboard
          with the day's / week's start-end. Without these the toggle rendered
          nothing for those two modes and the page went blank. */}
      {periodRange.mode === "daily" && periodRange.start && periodRange.end && (
        <Custom
          startDate={periodRange.start}
          endDate={periodRange.end}
          key={`daily-${periodRange.start.valueOf()}-${refreshTrigger}`}
        />
      )}
      {periodRange.mode === "weekly" && periodRange.start && periodRange.end && (
        <Custom
          startDate={periodRange.start}
          endDate={periodRange.end}
          key={`weekly-${periodRange.start.valueOf()}-${refreshTrigger}`}
        />
      )}
      {periodRange.mode === "monthly" && periodRange.start && periodRange.end && (
        <Monthly month={periodRange.start} endDate={periodRange.end} key={`monthly-${refreshTrigger}`} metric={metric} />
      )}
      {periodRange.mode === "yearly" && periodRange.start && periodRange.end && (
        <Yearly startDate={periodRange.start} endDate={periodRange.end} key={`yearly-${refreshTrigger}`} metric={metric} />
      )}
      {periodRange.mode === "allyear" && (
        <AllTime key={`alltime-${refreshTrigger}`} metric={metric} />
      )}
      {periodRange.mode === "custom" ? (
        customStartDate && customEndDate ? (
          <Custom startDate={customStartDate} endDate={customEndDate} key={`custom-${refreshTrigger}`} />
        ) : (
          <Container
            className="my-4 w-100 px-0 d-flex justify-content-center align-items-center"
            style={{ minHeight: "300px" }}
          >
            <div className=" text-center" role="alert">
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

      

      {/* Same pre-step as the Leads tab. The organization fixes the lead's prefix and
          number series, so it has to be chosen before the wizard opens — skipping it
          here sent the wizard in with no organizationId and the create failed server-side. */}
      <SelectLeadOrganizationDialog
        open={showOrgPicker}
        onClose={() => setShowOrgPicker(false)}
        onContinue={(organizationId) => {
          setShowOrgPicker(false);
          setFormValues({ leadTemplateId: "blank", organizationId });
        }}
      />

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
          padding: 'clamp(12px, 3vw, 20px)',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: 0,
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
