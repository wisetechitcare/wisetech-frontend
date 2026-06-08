import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import {
  getProjectStatusCount,
  getProjectTeamCount,
  getProjectCategoryCount,
  getProjectServiceCount,
  getProjectSubcategoryCount,
  getProjectStatusCountYearly,
  getProjectLocationCount,
  getProjectCountByCompanyType,
  getProjectCountByCompanyTypeYearly,
} from "@services/projects";
import CustomPieChart from "../../commonComponents/CustomChart";
import CustomBarChart from "../../commonComponents/BarChart";
import YearlyStatusCountChart from "../../commonComponents/YearlyStatusCountChart";
import Loader from "@app/modules/common/utils/Loader";
import { ChartData, ChartState } from "@models/clientProject";
import ProjectByLocationAndStatus from "../../commonComponents/ProjectByLocationChart";
import { ProjectDialogModal } from "./ProjectDialogModal";

// Simple types
interface Props {
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  fromAdmin?: boolean;
  dateSettingsEnabled?: boolean;
}

const Custom: React.FC<Props> = ({ startDate, endDate }) => {
  // State
  const [chartData, setChartData] = useState<ChartState>({
    statusData: [],
    teamData: [],
    categoryData: [],
    serviceData: [],
    subcategoryData: [],
    yearlyData: [],
    locationData: [],
    companyTypeData: [],
    companyTypeYearlyData: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [filters, setFilters] = useState<any>({});
  const [open, setOpen] = useState(false);
  const [statusId, setStatusId] = useState("");
  const [monthlyStatus, setMonthlyStatus] = useState<any>([]);
  const [categoryId, setCategoryId] = useState("");
  const [openCategory, setOpenCategory] = useState(false);
  const [categoryData, setCategoryData] = useState<any>([]);
  const [serviceId, setServiceId] = useState("");
  const [openService, setOpenService] = useState(false);
  const [serviceData, setServiceData] = useState<any>([]);
  const [openSubCategory, setOpenSubCategory] = useState(false);
  const [subCategoryId, setSubCategoryId] = useState("");
  const [subcategoryData, setSubcategoryData] = useState<any>([]);
  const [projectByteamData, setProjectByteamData] = useState<any>([]);
  const [openProjectByteam, setOpenProjectByteam] = useState(false);
  const [projectByteamId, setProjectByteamId] = useState("");
  const [companyTypeData, setCompanyTypeData] = useState<any>([]);
  const [openCompanyType, setOpenCompanyType] = useState(false);
  const [companyTypeId, setCompanyTypeId] = useState("");

  // Get settings from Redux
  const settings = useSelector((state: any) => state.chartSettings);

  // Convert API data to chart format
  const convertToChartData = (
    apiData: any[],
    countKey: string
  ): ChartData[] => {
    return apiData
      .map((item) => ({
        label: item.name,
        value: item[countKey],
        color: item.color || "#3B82F6",
        totalCost: item.totalCost || 0,
      }))
      // .filter(item => item.value && item.value > 0); // Filter out zero/null values
  };

  // Transform monthly data for yearly chart (for status data)
  const transformYearlyData = (
    apiData: any[],
    dataKey: string = "projectsCountByStatus"
  ) => {
    const monthNames = [
      "",
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const itemMap: any = {};

    apiData.forEach((monthEntry) => {
      const monthName =
        monthNames[monthEntry.month] || `Month ${monthEntry.month}`;

      monthEntry[dataKey]?.forEach((item: any) => {
        if (!itemMap[item.name]) {
          itemMap[item.name] = {
            label: item.name,
            color: item.color || "#ccc",
            data: [],
          };
        }
        itemMap[item.name].data.push({
          x: monthName,
          y: item.projectsCount,
        });
      });
    });

    return Object.values(itemMap);
  };

  // Transform company type yearly data
  const transformCompanyTypeYearlyData = (apiData: any[]) => {
    const monthNames = [
      "",
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    return apiData.map((companyType) => ({
      id: companyType.id,
      label: companyType.name,
      color: companyType.color || "#ccc",
      data: companyType.monthlyData.map((monthData: any) => ({
        x: monthNames[monthData.month] || `Month ${monthData.month}`,
        y: monthData.projectsCount,
      })),
    }));
  };

  const handleStatusChartClick = (selectedLabel: string) => {
    const selectedStatus = monthlyStatus.find(
      (status: any) => status.name === selectedLabel
    );

    if (selectedStatus) {
      setStatusId(selectedStatus.id.toString());
    } else {
      setStatusId(selectedLabel);
    }
    setOpen(true);
  };

  const handleCompanyTypeChartClick = (selectedLabel: string) => {
    const selectedCompanyType = companyTypeData.find(
      (companyType: any) => companyType.name === selectedLabel
    );

    if (selectedCompanyType) {
      setCompanyTypeId(selectedCompanyType.id);
    } else {
      setCompanyTypeId(selectedLabel);
    }
    setOpenCompanyType(true);
  };

  const handleCategoryChartClick = (selectedLabel: string) => {
    const selectedCategory = categoryData.find(
      (category: any) => category.name === selectedLabel
    );
    if (selectedCategory) {
      setCategoryId(selectedCategory.id);
    } else {
      setCategoryId(selectedLabel);
    }
    setOpenCategory(true);
  };

  const handleServiceChartClick = (selectedLabel: string) => {
    const selectedService = serviceData.find(
      (service: any) => service.name === selectedLabel
    );
    if (selectedService) {
      setServiceId(selectedService.id);
    } else {
      setServiceId(selectedLabel);
    }
    setOpenService(true);
  };

  const handleProjectByteamChartClick = (selectedLabel: string) => {
    const selectedProjectByteam = projectByteamData.find(
      (projectByteam: any) => projectByteam.name === selectedLabel
    );
    if (selectedProjectByteam) {
      setProjectByteamId(selectedProjectByteam.id);
    } else {
      setProjectByteamId(selectedLabel);
    }
    setOpenProjectByteam(true);
  };

  const handleSubCategoryChartClick = (selectedLabel: string) => {
    let selectedSubCategory: any = null;
    subcategoryData.filter((subCat: any) => {
      if (subCat.name === selectedLabel) {
        selectedSubCategory = subCat;
      }
    });
    if (selectedSubCategory) {
      setSubCategoryId(selectedSubCategory.id);
    } else {
      setSubCategoryId(selectedLabel);
    }
    setOpenSubCategory(true);
  };

  // Fetch all data
  const fetchData = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError("");

    try {
      const startDateFormatted = dayjs(startDate).format("YYYY-MM-DD");
      const endDateFormatted = dayjs(endDate).format("YYYY-MM-DD");
      const years = dayjs(startDate).year().toString();

      // Fetch all data in parallel
      const [
        statusRes,
        teamRes,
        categoryRes,
        serviceRes,
        subcategoryRes,
        yearlyRes,
        locationRes,
        companyTypeRes,
        companyTypeYearlyRes,
      ] = await Promise.all([
        getProjectStatusCount(startDateFormatted, endDateFormatted),
        getProjectTeamCount(startDateFormatted, endDateFormatted),
        getProjectCategoryCount(startDateFormatted, endDateFormatted),
        getProjectServiceCount(startDateFormatted, endDateFormatted),
        getProjectSubcategoryCount(startDateFormatted, endDateFormatted),
        getProjectStatusCountYearly(startDateFormatted, endDateFormatted),
        getProjectLocationCount(startDateFormatted, endDateFormatted),
        getProjectCountByCompanyType(startDateFormatted, endDateFormatted),
        getProjectCountByCompanyTypeYearly(
          startDateFormatted,
          endDateFormatted
        ),
      ]);

      setMonthlyStatus(statusRes?.projectCountByStatus);
      setCategoryData(categoryRes?.projectCountByAllCategories);
      setServiceData(serviceRes?.projectCountByServices);
      setSubcategoryData(subcategoryRes?.projectCountBySubcategory);
      setProjectByteamData(teamRes?.projectCountByTeams);
      setCompanyTypeData(companyTypeRes?.projectCountByCompanyType);

      // Transform data
      setChartData({
        statusData: convertToChartData(
          statusRes?.projectCountByStatus || [],
          "projectsCount"
        ),
        teamData: convertToChartData(
          teamRes?.projectCountByTeams || [],
          "projectsCount"
        ),
        categoryData: convertToChartData(
          categoryRes?.projectCountByAllCategories || [],
          "projectsCountByCategory"
        ),
        serviceData: convertToChartData(
          serviceRes?.projectCountByServices || [],
          "projectsCount"
        ),
        subcategoryData: convertToChartData(
          subcategoryRes?.projectCountBySubcategory || [],
          "projectsCountBySubcategory"
        ),
        yearlyData: transformYearlyData(
          yearlyRes?.projectCountBySubcategoryMonthWise || []
        ),
        companyTypeData: convertToChartData(
          companyTypeRes?.projectCountByCompanyType || [],
          "projectsCount"
        ),
        companyTypeYearlyData: transformCompanyTypeYearlyData(
          companyTypeYearlyRes?.projectCountByCompanyTypeYearly || []
        ),
        locationData: locationRes?.projectsByLocations || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (filterKey: string, value: string) => {
    setFilters({ ...filters, [filterKey]: value });
  };

  // Apply filters to data
  const applyFilter = (data: ChartData[], filterKey: string) => {
    const filterValue = filters[filterKey];
    if (!filterValue || filterValue === "all") return data;
    return data.filter((item) => item.label === filterValue);
  };

  // Fetch data when dates change
  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  // Show loading
  if (loading) return <Loader />;

  // Show error
  if (error) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger">
          <strong>Error:</strong> {error}
          <button
            className="btn btn-sm btn-outline-danger ms-2"
            onClick={fetchData}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row g-4">
        {/* Projects by Status */}
        {settings.showProjectsStatus && chartData.statusData.length > 0 && (
          <div className="col-12 col-md-6">
            <CustomPieChart
              data={chartData.statusData}
              title="Projects By Status"
              height={250}
              showFilter={true}
              filterOptions={chartData.statusData
                .map((item: any) => item.label)
                .sort((a: string, b: string) => a.localeCompare(b))}
              filterValue={filters.status || ""}
              onFilterChange={(value: string) =>
                handleFilterChange("status", value)
              }
              onChartClick={handleStatusChartClick}
              filterPlaceholder="All Status"
              key="status-chart"
            />
          </div>
        )}

        {/* Projects by Service */}
        {settings.showProjectsByService && chartData.serviceData.length > 0 && (
          <div className="col-12 col-md-6">
            <CustomPieChart
              data={chartData.serviceData}
              title="Projects By Service"
              height={250}
              chartType="donut"
              showFilter={true}
              filterOptions={chartData.serviceData
                .map((item: any) => item.label)
                .sort((a: string, b: string) => a.localeCompare(b))}
              filterValue={filters.service || ""}
              onFilterChange={(value: string) =>
                handleFilterChange("service", value)
              }
              onChartClick={handleServiceChartClick}
              filterPlaceholder="All Services"
              key="service-chart"
            />
          </div>
        )}

        {/* Projects by Team */}
        {settings.showProjectsByTeam && chartData.teamData.length > 0 && (
          <div className="col-12 col-md-6">
            <CustomPieChart
              data={chartData.teamData}
              title="Projects By Team"
              height={250}
              showFilter={true}
              filterOptions={chartData.teamData
                .map((item: any) => item.label)
                .sort((a: string, b: string) => a.localeCompare(b))}
              filterValue={filters.team || ""}
              onFilterChange={(value: string) =>
                handleFilterChange("team", value)
              }
              onChartClick={handleProjectByteamChartClick}
              filterPlaceholder="All Teams"
              key="team-chart"
            />
          </div>
        )}

        {/* Projects by Category */}
        {settings.showProjectsByCategory &&
          chartData.categoryData.length > 0 && (
            <div className="col-12 col-md-6">
              <CustomPieChart
                data={chartData.categoryData}
                title="Projects By Category"
                height={250}
                showFilter={true}
                filterOptions={chartData.categoryData
                  .map((item: any) => item.label)
                  .sort((a: string, b: string) => a.localeCompare(b))}
                filterValue={filters.category || ""}
                onFilterChange={(value: string) =>
                  handleFilterChange("category", value)
                }
                onChartClick={handleCategoryChartClick}
                filterPlaceholder="All Categories"
                key="category-chart"
              />
            </div>
          )}
        {/* Project by Company Type */}
        {settings.showProjectsMonthlyCompanyType && (
          <div className="col-12 col-md-6">
            <CustomPieChart
              data={chartData?.companyTypeData!}
              title="Project By Company Type"
              width={250}
              height={250}
              showFilter={true}
              filterOptions={chartData?.companyTypeData?.map(
                (item: any) => item.label
              )}
              filterValue={filters.companyType || ""}
              onFilterChange={(value: string) =>
                handleFilterChange("companyType", value)
              }
              onChartClick={handleCompanyTypeChartClick}
              filterPlaceholder="All Company Types"
              key="companyType-chart"
            />
          </div>
        )}

        {/* Projects by Subcategory */}
        {settings.showProjectsBySubCategory &&
          chartData.subcategoryData.length > 0 && (
            <div className="col-12">
              <CustomBarChart
                data={applyFilter(chartData.subcategoryData, "subcategory")}
                title="Projects By Subcategory"
                height={400}
                showFilter={true}
                filterKey="subcategory"
                filterOptions={chartData.subcategoryData
                  .map((item) => item.label)
                  .sort((a, b) => a.localeCompare(b))}
                filterValue={filters.subcategory || ""}
                onFilterChange={(value: string) =>
                  handleFilterChange("subcategory", value)
                }
                onChartClick={handleSubCategoryChartClick}
                filterPlaceholder="All Categories"
              />
            </div>
          )}

        {/* Monthly Projects by Status */}
        {settings.showProjectsMonthlyStatus &&
          chartData.yearlyData.length > 0 && (
            <div className="col-12">
              <YearlyStatusCountChart
                data={chartData.yearlyData}
                title="Monthly Projects By Status"
                height={400}
                stacked={true}
                isThisProjectModal={true}
                startDate={startDate}
                endDate={endDate}
              />
            </div>
          )}

        {/* Monthly Projects by Company Type */}
        {settings.showProjectYealyCustomCompanyType && (
          <div className="col-12 mt-4">
            <YearlyStatusCountChart
              data={chartData.companyTypeYearlyData!}
              title="Monthly Projects By Company Type"
              height={400}
              stacked={true}
              isThisProjectModal={true}
              startDate={startDate}
              endDate={endDate}
            />
          </div>
        )}
      </div>

      {/* Location Chart */}
      {settings.showProjectsByLocation && chartData.locationData.length > 0 && (
        <div className="row mt-4">
          <div className="col-12">
            <ProjectByLocationAndStatus
              data={chartData.locationData}
              startDate={startDate}
              endDate={endDate}
            />
          </div>
        </div>
      )}

      {/* Chart Dialog Modal */}
      <ProjectDialogModal
        open={open}
        onClose={() => setOpen(false)}
        statusId={statusId || undefined}
        startDate={startDate}
        endDate={endDate}
      />
      <ProjectDialogModal
        open={openCategory}
        onClose={() => setOpenCategory(false)}
        categoryId={categoryId || undefined}
        startDate={startDate}
        endDate={endDate}
      />
      <ProjectDialogModal
        open={openService}
        onClose={() => setOpenService(false)}
        serviceId={serviceId || undefined}
        startDate={startDate}
        endDate={endDate}
      />
      <ProjectDialogModal
        open={openSubCategory}
        onClose={() => setOpenSubCategory(false)}
        subCategoryId={subCategoryId || undefined}
        startDate={startDate}
        endDate={endDate}
      />
      <ProjectDialogModal
        open={openProjectByteam}
        onClose={() => setOpenProjectByteam(false)}
        teamId={projectByteamId || undefined}
        startDate={startDate}
        endDate={endDate}
      />
      <ProjectDialogModal
        open={openCompanyType}
        onClose={() => setOpenCompanyType(false)}
        monthlyCompanyTypeId={companyTypeId || undefined}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
};

export default Custom;
