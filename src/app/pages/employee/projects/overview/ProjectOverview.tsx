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
  getLeadsBySubcategoryAnalytics,
  getLeadsBySourceAnalytics,
  getLeadsByCompanyTypeAnalytics,
  getLeadsByLocationAnalytics,
} from "@services/lead";
import { getProjectStatusCountYearly } from "@services/projects";
import {
  convertToChartData,
  convertCompanyTypeData,
  convertSubcategoryData,
  transformYearlyData,
} from "@utils/leadsProjectCompaniesStatistics";
import LeadByLocationChart from "@pages/employee/leads/overview/commonComponents/LeadByLocationChart";
import YearlyStatusCountChart from "@pages/employee/projects/commonComponents/YearlyStatusCountChart";
import { ChartDialogModal } from "@pages/employee/leads/overview/components/ChartDialogModal";
import { ProjectLeadAnalyticsDashboard } from "@pages/dashboard/projectAnalytics";
import ProjectTeamsSection from "./ProjectTeamsSection";
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
    subcategoryData: [],
    sourceData: [],
    companyTypeData: [],
    locationData: [],
    yearlyData: [],
  });

  const [statusRes, setStatusRes] = useState<any>(null);
  const [serviceRes, setServiceRes] = useState<any>(null);
  const [categoryRes, setCategoryRes] = useState<any>(null);
  const [subcategoryRes, setSubcategoryRes] = useState<any>(null);

  // Drill-down state
  const [openStatus, setOpenStatus] = useState(false);
  const [statusId, setStatusId] = useState("");
  const [openService, setOpenService] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [openCategory, setOpenCategory] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [openSubcategory, setOpenSubcategory] = useState(false);
  const [subcategoryId, setSubcategoryId] = useState("");

  const [showChartSettingsModal, setShowChartSettingsModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // Human label for the clicked chart slice, shown as the drill-down dialog heading.
  const [drillTitle, setDrillTitle] = useState("");

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

  // "__NA__" tells EntityTablePage to show only rows whose dimension is empty (the
  // clicked "N/A"/uncategorised bar) instead of falling through to every record.
  const NA = "__NA__";

  const handleStatusChartClick = (label: string) => {
    const found = (statusRes?.data || []).find((s: any) => s.status === label);
    setStatusId(found ? found.statusId || NA : label || NA);
    setDrillTitle(`Project Status · ${label}`);
    setOpenStatus(true);
  };

  const handleServiceChartClick = (label: string) => {
    const found = (serviceRes?.data || []).find((s: any) => s.service === label);
    setServiceId(found ? found.serviceId || NA : label || NA);
    setDrillTitle(`Service · ${label}`);
    setOpenService(true);
  };

  const handleCategoryChartClick = (label: string) => {
    const found = (categoryRes?.data || []).find((c: any) => c.category === label);
    setCategoryId(found ? found.categoryId || NA : label || NA);
    setDrillTitle(`Category · ${label}`);
    setOpenCategory(true);
  };

  const handleSubcategoryChartClick = (label: string) => {
    let selectedSubCategory: any = null;
    subcategoryRes?.data?.forEach((category: any) => {
      if (category.subCategories) {
        const found = category.subCategories.find(
          (subcat: any) => subcat.name === label
        );
        if (found) {
          selectedSubCategory = found;
        }
      }
    });

    if (selectedSubCategory) {
      setSubcategoryId(selectedSubCategory.id);
    } else {
      setSubcategoryId(label || NA);
    }
    setDrillTitle(`Sub-Category · ${label}`);
    setOpenSubcategory(true);
  };



  useEffect(() => {
    if (!startStr || !endStr) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // The Monthly Projects Trend is computed month-by-month server-side, so a
        // wide range (All Time = 2000–2099) would fan out into hundreds of
        // month×status count queries. Clamp the trend to the active fiscal year then.
        const trendWide = dayjs(endStr).diff(dayjs(startStr), "month") > 24;
        const trendStartStr = trendWide
          ? (yearStart ?? dayjs().startOf("month").subtract(11, "month")).format("YYYY-MM-DD")
          : startStr;
        const trendEndStr = trendWide
          ? (yearEnd ?? dayjs().endOf("month")).format("YYYY-MM-DD")
          : endStr;

        const [
          statusResData,
          serviceResData,
          categoryResData,
          subcategoryResData,
          locationResData,
          monthlyResData,
        ] = await Promise.all([
          getProjectsByStatusAnalytics(startStr, endStr),
          getLeadsByServiceAnalytics(startStr, endStr, true),
          getLeadsByProjectCategoryAnalytics(startStr, endStr, "", true),
          getLeadsBySubcategoryAnalytics(startStr, endStr, true),
          getLeadsByLocationAnalytics(startStr, endStr, true),
          // Project-status-by-month (On Ongoing / Completed / On Hold …) — NOT the
          // lead-status monthly analytics, which only ever shows "Received" here.
          getProjectStatusCountYearly(trendStartStr, trendEndStr),
        ]);

        setStatusRes(statusResData);
        setServiceRes(serviceResData);
        setCategoryRes(categoryResData);
        setSubcategoryRes(subcategoryResData);

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
          subcategoryData: convertSubcategoryData(
            subcategoryResData?.data || [],
            ""
          ),

          yearlyData: transformYearlyData(monthlyResData?.projectCountBySubcategoryMonthWise || []),
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
  }, [startStr, endStr, yearStart, yearEnd]);

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
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div
          style={{
            fontFamily: "Barlow",
            fontSize: "clamp(1.15rem, 4vw, 24px)",
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

      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-stretch align-items-lg-center gap-3 w-100 mb-6" style={{ rowGap: "12px" }}>
        {/* Left: period tabs + navigator. Shrinks (minWidth:0) so the sub-tabs on
            the right keep room and everything stays on one row in desktop view. */}
        <div
          className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-3"
          style={{ flex: "1 1 auto", minWidth: 0 }}
        >
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
          {/* Compact navigator (fit-content on desktop, full-width on mobile via
              the parent's align-items-stretch) — mirrors the Leads PeriodFilter. */}
          <div style={{ minWidth: 0, display: "flex" }}>
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
              <div style={{ textAlign: "center", opacity: 0.7, fontSize: "14px", whiteSpace: "nowrap", alignSelf: "center" }}>
                All-Time Summary
              </div>
            )}

            {alignment === "custom" && (
              <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-3 gap-sm-4 w-100">
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

        {/* Sub-tabs (Summary / Services & Insights / Teams) portal into here,
            sharing the same row and sitting on the right — mirrors the Leads Overview.
            flexShrink:0 keeps the tabs at natural width so they never clip on desktop;
            on mobile the row stacks and the slot can scroll on tiny screens. */}
        <div
          id="projectOverviewTabSlot"
          className="d-flex justify-content-center justify-content-lg-end"
          style={{ flexShrink: 0, minWidth: 0, overflowX: "auto" }}
        />
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
      {/* ── Project Analytics Dashboard (project-scoped, receivedOnly) with sub-tabs.
          The Monthly Projects Trend and Projects By Location charts are injected
          into the Summary and Insights sub-tabs via slots. ── */}
      <div style={{ marginBottom: 40 }}>
        <ProjectLeadAnalyticsDashboard
          statusData={chartData.statusData}
          serviceData={chartData.serviceData}
          categoryData={chartData.categoryData}
          subcategoryData={chartData.subcategoryData}
          subcategoryRaw={subcategoryRes?.data || []}
          locationData={chartData.locationData}
          settings={settings}
          showKpis={false}
          onStatusSelect={handleStatusChartClick}
          onServiceSelect={handleServiceChartClick}
          onCategorySelect={handleCategoryChartClick}
          onSubcategorySelect={handleSubcategoryChartClick}
          slots={{
            summary:
              settings?.showProjectsMonthlyStatus !== false ? (
                <YearlyStatusCountChart
                  data={chartData.yearlyData}
                  title="Monthly Projects Trend"
                  height={400}
                  stacked={true}
                  isThisBelongsToLead={true}
                  receivedOnly={true}
                  entityScope="project"
                  startDate={startDate}
                  endDate={endDate}
                />
              ) : null,
            geography:
              settings?.showProjectsByLocation !== false ? (
                <LeadByLocationChart
                  data={chartData.locationData}
                  startDate={startDate}
                  endDate={endDate}
                  entityScope="project"
                  receivedOnly
                />
              ) : null,
            teams: <ProjectTeamsSection startDate={startDate} endDate={endDate} />,
          }}
        />
      </div>

      {/* Drill-down dialogs — received/project leads only */}
      <ChartDialogModal
        open={openStatus}
        onClose={() => setOpenStatus(false)}
        title={drillTitle}
        statusId={statusId || undefined}
        startDate={startDate}
        endDate={endDate}
        receivedOnly
        entityScope="project"
      />
      <ChartDialogModal
        open={openService}
        onClose={() => setOpenService(false)}
        title={drillTitle}
        serviceId={serviceId || undefined}
        startDate={startDate}
        endDate={endDate}
        receivedOnly
        entityScope="project"
      />
      <ChartDialogModal
        open={openCategory}
        onClose={() => setOpenCategory(false)}
        title={drillTitle}
        categoryId={categoryId || undefined}
        startDate={startDate}
        endDate={endDate}
        receivedOnly
        entityScope="project"
      />
      <ChartDialogModal
        open={openSubcategory}
        onClose={() => setOpenSubcategory(false)}
        title={drillTitle}
        subCategoryId={subcategoryId || undefined}
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
