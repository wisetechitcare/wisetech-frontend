import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
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

/**
 * Project Overview Analytics — Project-focused dashboard.
 *
 * Status chart shows PROJECT statuses (On Hold, In Progress, Completed, etc.)
 * instead of lead statuses. Other metrics (service, category, source, location)
 * still show project-related data for received leads. Every drill-down opens
 * the lead/entity table filtered to received leads only.
 */
type Period = "month" | "year";

const ProjectOverview = () => {
  const [period, setPeriod] = useState<Period>("year");

  const today = dayjs();
  const startDate =
    period === "month" ? today.startOf("month") : today.startOf("year");
  const endDate = today.endOf("day");
  const startStr = startDate.format("YYYY-MM-DD");
  const endStr = endDate.format("YYYY-MM-DD");

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

  const settings = useSelector((state: any) => state.chartSettings);

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
      <div className="d-flex justify-content-end mb-3">
        <select
          className="form-select form-select-sm"
          style={{ width: "auto" }}
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
        >
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

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

        {/* Projects By Location */}
        <div className="col-12">
          <LeadByLocationChart data={chartData.locationData} />
        </div>
      </div>

      {/* Drill-down dialogs — received/project leads only */}
      <ChartDialogModal
        open={openStatus}
        onClose={() => setOpenStatus(false)}
        statusId={statusId || undefined}
        startDate={startDate}
        endDate={endDate}
        receivedOnly
      />
      <ChartDialogModal
        open={openService}
        onClose={() => setOpenService(false)}
        serviceId={serviceId || undefined}
        startDate={startDate}
        endDate={endDate}
        receivedOnly
      />
      <ChartDialogModal
        open={openCategory}
        onClose={() => setOpenCategory(false)}
        categoryId={categoryId || undefined}
        startDate={startDate}
        endDate={endDate}
        receivedOnly
      />
      <ChartDialogModal
        open={openSource}
        onClose={() => setOpenSource(false)}
        sourceId={sourceId || undefined}
        startDate={startDate}
        endDate={endDate}
        receivedOnly
      />
      <ChartDialogModal
        open={openCompanyType}
        onClose={() => setOpenCompanyType(false)}
        companyTypeId={companyTypeId || undefined}
        startDate={startDate}
        endDate={endDate}
        receivedOnly
      />
    </div>
  );
};

export default ProjectOverview;
