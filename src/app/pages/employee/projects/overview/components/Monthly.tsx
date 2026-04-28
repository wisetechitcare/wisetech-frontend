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
import LocationProjectChart from "../../commonComponents/ProjectByLocationChart";
import Loader from "@app/modules/common/utils/Loader";
import { ChartData, ChartState } from "@models/clientProject";
import { transformYearlyData } from "@utils/leadsProjectCompaniesStatistics";
import CompaniesByLocationAndStatus from "../../commonComponents/ProjectByLocationChart";
import ProjectByLocationAndStatus from "../../commonComponents/ProjectByLocationChart";
import { ChartDialogModal } from "@pages/employee/leads/overview/components/ChartDialogModal";
import { ProjectDialogModal } from "./ProjectDialogModal";

// Simple types
interface Props {
  month: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  fromAdmin?: boolean;
  dateSettingsEnabled?: boolean;
}

const Monthly: React.FC<Props> = ({ month, endDate }) => {
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

  const handleCompanyTypeChartClick =(selectedLabel: string)=>{
    const selectedCompanyType = companyTypeData.find(
      (companyType: any) => companyType.name === selectedLabel
    );
    
    if (selectedCompanyType) {
      setCompanyTypeId(selectedCompanyType.id);
    } else {
      setCompanyTypeId(selectedLabel);
    }
    setOpenCompanyType(true);
  }

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
    if (!month || !endDate) return;

    setLoading(true);
    setError("");

    try {
      const startDate = dayjs(month).format("YYYY-MM-DD");
      const endDateFormatted = dayjs(endDate).format("YYYY-MM-DD");
      const year = dayjs(month).year().toString();

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
      ] = await Promise.all([
        getProjectStatusCount(startDate, endDateFormatted),
        getProjectTeamCount(startDate, endDateFormatted),
        getProjectCategoryCount(startDate, endDateFormatted),
        getProjectServiceCount(startDate, endDateFormatted),
        getProjectSubcategoryCount(startDate, endDateFormatted),
        getProjectStatusCountYearly(startDate, endDateFormatted),
        getProjectLocationCount(startDate, endDateFormatted),
        getProjectCountByCompanyType(startDate, endDateFormatted),
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
  }, [month, endDate]);

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
    <div>
      <div className="row g-3">
        {/* Projects by Status */}
        {settings.showProjectsStatus && (
          <div className="col-12 col-md-6">
            <CustomPieChart
              data={chartData.statusData}
              title="Projects By Status"
              width={250}
              height={250}
              chartType="pie"
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
        {settings.showProjectsByService && (
          <div className="col-12 col-md-6">
            <CustomPieChart
              data={chartData.serviceData}
              title="Projects By Service"
              width={250}
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
        {settings.showProjectsByTeam && (
          <div className="col-12 col-md-6">
            <CustomPieChart
              data={chartData.teamData}
              title="Projects By Team"
              width={250}
              height={250}
              showFilter={true}
              filterOptions={chartData.teamData
                .map((item: any) => item.label)
                .sort((a: string, b: string) => a.localeCompare(b))}
              filterValue={filters.team || ""}
              onFilterChange={(value: string) =>
                handleFilterChange("team", value)
              }
              // onChartClick={handleTeamChartClick}
              filterPlaceholder="All Teams"
              key="team-chart"
              onChartClick={handleProjectByteamChartClick}
            />
          </div>
        )}

        {/* Projects by Category */}
        {settings.showProjectsByCategory && (
            <div className="col-12 col-md-6">
              <CustomPieChart
                data={chartData.categoryData}
                title="Projects By Category"
                width={250}
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
        {settings?.showProjectsMonthlyCompanyType && (
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
        {settings.showProjectsBySubCategory && (
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
                filterPlaceholder="All Categories"
                onChartClick={handleSubCategoryChartClick}
              />
            </div>
          )}

        {/* Monthly Projects by Status */}
        {/* {settings.showProjectsMonthlyStatus && chartData.yearlyData.length > 0 && (
          <div className="col-12">
            <YearlyStatusCountChart
              data={chartData.yearlyData}
              title="Monthly Projects By Status"
              height={400}
              stacked={true}
            />
          </div>
        )} */}
      </div>

      {/* Location Chart */}
      {settings.showProjectsByLocation && (
          <div className="row mt-4">
            <div className="col-12">
              <ProjectByLocationAndStatus
                data={chartData.locationData}
                startDate={month}
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
        startDate={month}
        endDate={endDate}
      />
      <ProjectDialogModal
        open={openCategory}
        onClose={() => setOpenCategory(false)}
        categoryId={categoryId || undefined}
        startDate={month}
        endDate={endDate}
      />
      <ProjectDialogModal
        open={openService}
        onClose={() => setOpenService(false)}
        serviceId={serviceId || undefined}
        startDate={month}
        endDate={endDate}
      />
      <ProjectDialogModal
        open={openSubCategory}
        onClose={() => setOpenSubCategory(false)}
        subCategoryId={subCategoryId || undefined}
        startDate={month}
        endDate={endDate}
      />
      <ProjectDialogModal
        open={openProjectByteam}
        onClose={() => setOpenProjectByteam(false)}
        teamId={projectByteamId || undefined}
        startDate={month}
        endDate={endDate}
      />
      <ProjectDialogModal
        open={openCompanyType}
        onClose={() => setOpenCompanyType(false)}
        monthlyCompanyTypeId={companyTypeId || undefined}
        startDate={month}
        endDate={endDate}
      />
    </div>
  );
};

export default Monthly;
