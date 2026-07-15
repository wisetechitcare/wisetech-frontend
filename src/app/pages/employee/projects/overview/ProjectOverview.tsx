import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import dayjs, { Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Container } from "@mui/material";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import PeriodTabs from "@app/modules/common/components/PeriodTabs";
import PeriodNavigator from "@app/modules/common/components/PeriodNavigator";
import {
  getProjectsByStatusAnalytics,
  getLeadsByServiceAnalytics,
  getLeadsByProjectCategoryAnalytics,
  getLeadsBySourceAnalytics,
  getLeadsByCompanyTypeAnalytics,
  getLeadsByLocationAnalytics,
  getMonthlyLeadAnalytics,
} from "@services/lead";
import {
  convertToChartData,
  convertCompanyTypeData,
  transformYearlyDatas,
} from "@utils/leadsProjectCompaniesStatistics";
import LeadByLocationChart from "@pages/employee/leads/overview/commonComponents/LeadByLocationChart";
import YearlyStatusCountChart from "@pages/employee/projects/commonComponents/YearlyStatusCountChart";
import { ChartDialogModal } from "@pages/employee/leads/overview/components/ChartDialogModal";
import { ProjectLeadAnalyticsDashboard } from "@pages/dashboard/projectAnalytics";
import Loader from "@app/modules/common/utils/Loader";
import { Modal } from "react-bootstrap";
import { Typography } from "@mui/material";
import ChartVisibilitySettings from "@pages/company/settings/ChartVisibilitySettings";
import { PROJECT_CHART_SETTINGS_MODAL_TYPE } from "@constants/configurations-key";
import eventBus from "@utils/EventBus";
import { EVENT_KEYS } from "@constants/eventKeys";

/**
 * Project Overview Analytics — Project-focused dashboard.
 *
 * Status chart shows PROJECT statuses (On Hold, In Progress, Completed, etc.)
 * instead of lead statuses. Other metrics (service, category, source, location)
 * still show project-related data for received leads. Every drill-down opens
 * the lead/entity table filtered to received leads only.
 */
const ProjectOverview = () => {
  const today = dayjs();

  // ── Period selection (Monthly / Yearly / Custom) — mirrors Leads Overview ──
  const [alignment, setAlignment] = useState<string>("yearly");

  const [monthStart, setMonthStart] = useState(today.startOf("month"));
  const [monthEnd, setMonthEnd] = useState(today.endOf("month"));

  const [yearStart, setYearStart] = useState<Dayjs | null>(null);
  const [yearEnd, setYearEnd] = useState<Dayjs | null>(null);
  const [fiscalYearDisplay, setFiscalYearDisplay] = useState("");

  const [customStartDate, setCustomStartDate] = useState<Dayjs | undefined>(
    undefined
  );
  const [customEndDate, setCustomEndDate] = useState<Dayjs | undefined>(
    undefined
  );

  // Resolve the active range from the selected period.
  const activeStart: Dayjs | null =
    alignment === "monthly"
      ? monthStart
      : alignment === "yearly"
      ? yearStart
      : alignment === "alltime"
      ? dayjs("2000-01-01")
      : customStartDate ?? null;
  const activeEnd: Dayjs | null =
    alignment === "monthly"
      ? monthEnd
      : alignment === "yearly"
      ? yearEnd
      : alignment === "alltime"
      ? dayjs("2099-12-31")
      : customEndDate ?? null;

  const startDate = activeStart ?? undefined;
  const endDate = activeEnd ?? undefined;
  const startStr = activeStart ? activeStart.format("YYYY-MM-DD") : "";
  const endStr = activeEnd ? activeEnd.format("YYYY-MM-DD") : "";
  const rangeReady = !!(activeStart && activeEnd);

  // Compute the fiscal year once so "Yearly" has a range to work with.
  useEffect(() => {
    async function calculateFiscalYear() {
      const { startDate: fyStart, endDate: fyEnd } =
        await generateFiscalYearFromGivenYear(today);
      const fiscalStart = dayjs(fyStart);
      const fiscalEnd = dayjs(fyEnd);
      setYearStart(fiscalStart);
      setYearEnd(fiscalEnd);
      setFiscalYearDisplay(
        `${fiscalStart.format("YYYY")} - ${fiscalEnd.format("YYYY")}`
      );
    }
    calculateFiscalYear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateMonth = (direction: "prev" | "next") => {
    const offset = direction === "prev" ? -1 : 1;
    const newMonthStart = monthStart.add(offset, "month");
    setMonthStart(newMonthStart);
    setMonthEnd(newMonthStart.endOf("month"));
  };

  const navigateYear = async (direction: "prev" | "next") => {
    const offset = direction === "prev" ? -1 : 1;
    const base = yearStart ?? today;
    const { startDate: fyStart, endDate: fyEnd } =
      await generateFiscalYearFromGivenYear(base.add(offset, "year"));
    const fiscalStart = dayjs(fyStart);
    const fiscalEnd = dayjs(fyEnd);
    setYearStart(fiscalStart);
    setYearEnd(fiscalEnd);
    setFiscalYearDisplay(
      `${fiscalStart.format("YYYY")} - ${fiscalEnd.format("YYYY")}`
    );
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [chartData, setChartData] = useState<any>({
    statusData: [],
    serviceData: [],
    categoryData: [],
    sourceData: [],
    companyTypeData: [],
    yearlyData: [],
    locationData: [],
  });

  // Raw responses kept for click -> id resolution
  const [statusRes, setStatusRes] = useState<any>(null);
  const [serviceRes, setServiceRes] = useState<any>(null);
  const [categoryRes, setCategoryRes] = useState<any>(null);
  const [sourceRes, setSourceRes] = useState<any>(null);
  const [companyTypeRes, setCompanyTypeRes] = useState<any>(null);

  // Drill-down state
  const [openStatus, setOpenStatus] = useState(false);
  const [statusId, setStatusId] = useState("");
  const [openService, setOpenService] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [openCategory, setOpenCategory] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [openSource, setOpenSource] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [openCompanyType, setOpenCompanyType] = useState(false);
  const [companyTypeId, setCompanyTypeId] = useState("");

  const [showChartSettingsModal, setShowChartSettingsModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const settings = useSelector((state: any) => state.chartSettings);

  const handleOpenChartSettingsModal = () => {
    setShowChartSettingsModal(true);
  };

  const handleCloseChartSettingsModal = () => {
    setShowChartSettingsModal(false);
  };

  useEffect(() => {
    const handleChartSettingsUpdate = () => {
      setRefreshTrigger((prev) => prev + 1);
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

  const handleStatusChartClick = (label: string) => {
    const found = (statusRes?.data || []).find((s: any) => s.status === label);
    setStatusId(found ? found.statusId : label);
    setOpenStatus(true);
  };

  const handleServiceChartClick = (label: string) => {
    const found = (serviceRes?.data || []).find((s: any) => s.service === label);
    setServiceId(found ? found.serviceId : label);
    setOpenService(true);
  };

  const handleCategoryChartClick = (label: string) => {
    const found = (categoryRes?.data || []).find((c: any) => c.category === label);
    setCategoryId(found ? found.categoryId : label);
    setOpenCategory(true);
  };

  const handleSourceChartClick = (label: string) => {
    const found = (sourceRes?.data || []).find((s: any) => s.source === label);
    setSourceId(found ? found.source : label);
    setOpenSource(true);
  };

  const handleCompanyTypeChartClick = (label: string) => {
    let found: any = null;
    (companyTypeRes?.data || []).forEach((statusGroup: any) => {
      const match = (statusGroup.allLeadsByAllCompanyType || []).find(
        (ct: any) => ct.name === label
      );
      if (match) found = match;
    });
    setCompanyTypeId(found ? found.id : label);
    setOpenCompanyType(true);
  };

  useEffect(() => {
    if (!startStr || !endStr) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          statusResData,
          serviceResData,
          categoryResData,
          sourceResData,
          companyTypeResData,
          locationResData,
          monthlyResData,
        ] = await Promise.all([
          getProjectsByStatusAnalytics(startStr, endStr),
          getLeadsByServiceAnalytics(startStr, endStr, true),
          getLeadsByProjectCategoryAnalytics(startStr, endStr, "", true),
          getLeadsBySourceAnalytics(startStr, endStr, true),
          getLeadsByCompanyTypeAnalytics(startStr, endStr, true),
          getLeadsByLocationAnalytics(startStr, endStr, true),
          getMonthlyLeadAnalytics(startStr, endStr, true),
        ]);

        setStatusRes(statusResData);
        setServiceRes(serviceResData);
        setCategoryRes(categoryResData);
        setSourceRes(sourceResData);
        setCompanyTypeRes(companyTypeResData);

        setChartData({
          statusData: convertToChartData(
            statusResData?.data || [],
            "count",
            "status",
            "budget"
          ),
          serviceData: convertToChartData(
            serviceResData?.data || [],
            "count",
            "service",
            "budget"
          ),
          categoryData: convertToChartData(
            categoryResData?.data || [],
            "count",
            "category",
            "totalBudget"
          ),
          sourceData: convertToChartData(
            sourceResData?.data || [],
            "count",
            "source",
            "budget"
          ),
          companyTypeData: convertCompanyTypeData(
            companyTypeResData?.data || [],
            ""
          ),
          yearlyData: transformYearlyDatas(monthlyResData?.data || []),
          locationData: locationResData?.data || [],
        });
      } catch (err) {
        console.error("Error fetching project (received leads) analytics:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startStr, endStr]);

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger" role="alert">
          Error loading project analytics: {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div
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
            <path d="M10.5 6H20.25M10.5 6C10.5 6.39782 10.342 6.77936 10.0607 7.06066C9.77936 7.34196 9.39782 7.5 9 7.5C8.60218 7.5 8.22064 7.34196 7.93934 7.06066C7.65804 6.77936 7.5 6.39782 7.5 6M10.5 6C10.5 5.60218 10.342 5.22064 10.0607 4.93934C9.77936 4.65804 9.39782 4.5 9 4.5C8.60218 4.5 8.22064 4.65804 7.93934 4.93934C7.65804 5.22064 7.5 5.60218 7.5 6M7.5 6H3.75M10.5 18H20.25M10.5 18C10.5 18.3978 10.342 18.7794 10.0607 19.0607C9.77936 19.342 9.39782 19.5 9 19.5C8.60218 19.5 8.22064 19.342 7.93934 19.0607C7.65804 18.7794 7.5 18.3978 7.5 18M10.5 18C10.5 17.6022 10.342 17.2206 10.0607 16.9393C9.77936 16.658 9.39782 16.5 9 16.5C8.60218 16.5 8.22064 16.658 7.93934 16.9393C7.65804 17.2206 7.5 17.6022 7.5 18M7.5 18H3.75M16.5 12H20.25M16.5 12C16.5 12.3978 16.342 12.7794 16.0607 13.0607C15.7794 13.342 15.3978 13.5 15 13.5C14.6022 13.5 14.2206 13.342 13.9393 13.0607C13.658 12.7794 13.5 12.3978 13.5 12M16.5 12C16.5 11.6022 16.342 11.2206 16.0607 10.9393C15.7794 10.658 15.3978 10.5 15 10.5C14.6022 10.5 14.2206 10.658 13.9393 10.9393C13.658 11.2206 13.5 11.6022 13.5 12M13.5 12H3.75" stroke="#172554" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="d-flex flex-row justify-content-between align-items-center mb-6">
        <PeriodTabs
          value={alignment}
          options={[
            { label: "Monthly", value: "monthly" },
            { label: "Yearly", value: "yearly" },
            { label: "All Time", value: "alltime" },
            { label: "Custom", value: "custom" },
          ]}
          onChange={(val) => setAlignment(val)}
          ariaLabel="view selection"
        />
        <div>
          {alignment === "monthly" && (
            <PeriodNavigator
              label={`${monthStart.format("DD MMM")} - ${monthEnd.format(
                "DD MMM"
              )}`}
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
            <div className="d-flex align-items-center gap-4">
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Start Date"
                  value={customStartDate}
                  onChange={(newValue) =>
                    setCustomStartDate(newValue ?? undefined)
                  }
                  maxDate={customEndDate}
                  format="DD MMM, YYYY"
                />
                <DatePicker
                  label="End Date"
                  value={customEndDate}
                  onChange={(newValue) =>
                    setCustomEndDate(newValue ?? undefined)
                  }
                  minDate={customStartDate}
                  format="DD MMM, YYYY"
                />
              </LocalizationProvider>
            </div>
          )}
        </div>
      </div>

      {!rangeReady ? (
        alignment === "custom" ? (
          <Container
            className="my-4 w-100 px-0 d-flex justify-content-center align-items-center"
            style={{ minHeight: "300px" }}
          >
            <div className="text-center" role="alert">
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
        ) : (
          <Loader />
        )
      ) : (
        <>
      {/* ── Unified Lead Analytics Dashboard (Project-scoped with receivedOnly=true) ── */}
      <div style={{ marginBottom: 40 }}>
        <ProjectLeadAnalyticsDashboard
          statusData={chartData.statusData}
          serviceData={chartData.serviceData}
          categoryData={chartData.categoryData}
          sourceData={chartData.sourceData}
          companyTypeData={chartData.companyTypeData}
          locationData={chartData.locationData}
          settings={settings}
          showKpis={false}
          onStatusSelect={handleStatusChartClick}
          onServiceSelect={handleServiceChartClick}
          onCategorySelect={handleCategoryChartClick}
          onSourceSelect={handleSourceChartClick}
          onCompanyTypeSelect={handleCompanyTypeChartClick}
        />
      </div>

      {/* ── Project Trend & Location ── */}
      <div className="row g-3">
        {/* Monthly Projects Trend (by status) */}
        {settings?.showProjectsMonthlyStatus !== false && (
          <div className="col-12">
            <YearlyStatusCountChart
              data={chartData.yearlyData}
              title="Monthly Projects Trend"
              height={400}
              stacked={true}
              isThisBelongsToLead={true}
              receivedOnly={true}
              startDate={startDate}
              endDate={endDate}
            />
          </div>
        )}

        {/* Projects By Location */}
        {settings?.showProjectsByLocation !== false && (
          <div className="col-12">
            <LeadByLocationChart data={chartData.locationData} />
          </div>
        )}
      </div>

      {/* Drill-down dialogs — received/project leads only */}
      <ChartDialogModal
        open={openStatus}
        onClose={() => setOpenStatus(false)}
        statusId={statusId || undefined}
        startDate={startDate}
        endDate={endDate}
        receivedOnly
        entityScope="project"
      />
      <ChartDialogModal
        open={openService}
        onClose={() => setOpenService(false)}
        serviceId={serviceId || undefined}
        startDate={startDate}
        endDate={endDate}
        receivedOnly
        entityScope="project"
      />
      <ChartDialogModal
        open={openCategory}
        onClose={() => setOpenCategory(false)}
        categoryId={categoryId || undefined}
        startDate={startDate}
        endDate={endDate}
        receivedOnly
        entityScope="project"
      />
      <ChartDialogModal
        open={openSource}
        onClose={() => setOpenSource(false)}
        sourceId={sourceId || undefined}
        startDate={startDate}
        endDate={endDate}
        receivedOnly
        entityScope="project"
      />
      <ChartDialogModal
        open={openCompanyType}
        onClose={() => setOpenCompanyType(false)}
        companyTypeId={companyTypeId || undefined}
        startDate={startDate}
        endDate={endDate}
        receivedOnly
        entityScope="project"
      />

      <Modal
        show={showChartSettingsModal}
        onHide={handleCloseChartSettingsModal}
        size="xl"
        centered
        className="responsive-modal"
      >
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
                Customize Cards Visibility
              </Typography>
              <ChartVisibilitySettings type={PROJECT_CHART_SETTINGS_MODAL_TYPE.PROJECT} />
            </div>
        </Modal.Body>
      </Modal>
        </>
      )}
    </div>
  );
};

export default ProjectOverview;
