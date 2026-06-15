import { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  getLeadsByStatusAnalytics,
  getLeadsByServiceAnalytics,
  getLeadsByProjectCategoryAnalytics,
  getLeadsBySourceAnalytics,
  getLeadsByCompanyTypeAnalytics,
  getLeadsByLocationAnalytics,
  getMonthlyLeadAnalytics,
  getAllLeadStatus,
} from "@services/lead";
import {
  convertToChartData,
  convertCompanyTypeData,
  transformYearlyDatas,
} from "@utils/leadsProjectCompaniesStatistics";
import CustomPieCharts from "@pages/employee/leads/overview/commonComponents/LeadsCustomGraph";
import LeadByLocationChart from "@pages/employee/leads/overview/commonComponents/LeadByLocationChart";
import YearlyStatusCountChart from "@pages/employee/projects/commonComponents/YearlyStatusCountChart";
import { ChartDialogModal } from "@pages/employee/leads/overview/components/ChartDialogModal";
import Loader from "@app/modules/common/utils/Loader";

/**
 * Project section analytics = Received Leads Analytics.
 *
 * Every chart here is sourced from the lead table but restricted to
 * project-trigger ("Received") leads via the backend `receivedOnly` flag, and
 * every drill-down opens the lead/entity table filtered to received leads.
 * Project = Received Lead — this does NOT show all leads.
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
  const [serviceRes, setServiceRes] = useState<any>(null);
  const [categoryRes, setCategoryRes] = useState<any>(null);
  const [sourceRes, setSourceRes] = useState<any>(null);
  const [companyTypeRes, setCompanyTypeRes] = useState<any>(null);
  const [leadStatusesID, setLeadStatusesID] = useState<any[]>([]);

  const [filters, setFilters] = useState<any>({});

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

  const handleFilterChange = (key: string, value: string) =>
    setFilters((prev: any) => ({ ...prev, [key]: value }));

  const handleStatusChartClick = (label: string) => {
    const found = leadStatusesID.find((s: any) => s.name === label);
    setStatusId(found ? found.id.toString() : label);
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
    const fetchLeadStatuses = async () => {
      try {
        const res = await getAllLeadStatus();
        setLeadStatusesID(
          (res?.leadStatuses || []).map((s: any) => ({ name: s.name, id: s.id }))
        );
      } catch (err) {
        console.error("Error fetching lead statuses:", err);
      }
    };
    fetchLeadStatuses();
  }, []);

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
          getLeadsByStatusAnalytics(startStr, endStr, true),
          getLeadsByServiceAnalytics(startStr, endStr, true),
          getLeadsByProjectCategoryAnalytics(startStr, endStr, "", true),
          getLeadsBySourceAnalytics(startStr, endStr, true),
          getLeadsByCompanyTypeAnalytics(startStr, endStr, true),
          getLeadsByLocationAnalytics(startStr, endStr, true),
          getMonthlyLeadAnalytics(startStr, endStr, true),
        ]);

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

      <div className="row g-3">
        {/* Projects (Received Leads) By Status */}
        <div className="col-12 col-md-6">
          <CustomPieCharts
            data={chartData.statusData}
            title="Projects By Status"
            height={250}
            width={250}
            chartType="pie"
            showFilter={true}
            filterOptions={chartData.statusData
              .map((item: any) => item.label)
              .sort((a: string, b: string) => a.localeCompare(b))}
            filterValue={filters.status || ""}
            onFilterChange={(value: string) => handleFilterChange("status", value)}
            filterPlaceholder="All Status"
            key="project-status-chart"
            onChartClick={handleStatusChartClick}
          />
        </div>

        {/* Projects By Service */}
        <div className="col-12 col-md-6">
          <CustomPieCharts
            data={chartData.serviceData}
            title="Projects By Service"
            height={250}
            width={250}
            chartType="donut"
            showFilter={true}
            filterOptions={chartData.serviceData
              .map((item: any) => item.label)
              .sort((a: string, b: string) => a.localeCompare(b))}
            filterValue={filters.service || ""}
            onFilterChange={(value: string) => handleFilterChange("service", value)}
            filterPlaceholder="All Services"
            key="project-service-chart"
            onChartClick={handleServiceChartClick}
          />
        </div>

        {/* Projects By Category */}
        <div className="col-12 col-md-6">
          <CustomPieCharts
            data={chartData.categoryData}
            title="Projects By Category"
            height={250}
            width={250}
            chartType="pie"
            showFilter={true}
            filterOptions={chartData.categoryData
              .map((item: any) => item.label)
              .sort((a: string, b: string) => a.localeCompare(b))}
            filterValue={filters.category || ""}
            onFilterChange={(value: string) => handleFilterChange("category", value)}
            filterPlaceholder="All Categories"
            key="project-category-chart"
            onChartClick={handleCategoryChartClick}
          />
        </div>

        {/* Projects By Source */}
        <div className="col-12 col-md-6">
          <CustomPieCharts
            data={chartData.sourceData}
            title="Projects By Source"
            height={250}
            width={250}
            chartType="donut"
            showFilter={true}
            filterOptions={chartData.sourceData.map((item: any) => item.label)}
            filterValue={filters.source || ""}
            onFilterChange={(value: string) => handleFilterChange("source", value)}
            filterPlaceholder="All Source"
            key="project-source-chart"
            onChartClick={handleSourceChartClick}
          />
        </div>

        {/* Projects By Company Type */}
        <div className="col-12 col-md-6">
          <CustomPieCharts
            data={chartData.companyTypeData}
            title="Projects By Company Type"
            height={250}
            width={250}
            showFilter={true}
            filterOptions={chartData.companyTypeData.map((item: any) => item.label)}
            filterValue={filters.companyType || ""}
            onFilterChange={(value: string) =>
              handleFilterChange("companyType", value)
            }
            filterPlaceholder="All Company Types"
            key="project-company-type-chart"
            onChartClick={handleCompanyTypeChartClick}
          />
        </div>

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
