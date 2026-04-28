import {
  getLeadsByStatusAnalytics,
  getLeadsByServiceAnalytics,
  getLeadsByProjectCategoryAnalytics,
  getAllLeadStatus,
} from "@services/lead";
import {
  getProjectStatusCount,
  getProjectTeamCount,
  getProjectCategoryCount,
} from "@services/projects";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import CustomPieCharts from "@pages/employee/leads/overview/commonComponents/LeadsCustomGraph";
import Loader from "@app/modules/common/utils/Loader";
import { convertToChartData } from "@utils/leadsProjectCompaniesStatistics";
import { ChartDialogModal } from "@pages/employee/leads/overview/components/ChartDialogModal";
import { ProjectDialogModal } from "@pages/employee/projects/overview/components/ProjectDialogModal";

interface DashboardGraphProps {
  isAdmin?: boolean;
}

const DashboardGraph: React.FC<DashboardGraphProps> = ({ isAdmin = false }) => {
  const [chartData, setChartData] = useState<any>({
    statusData: [],
    serviceData: [],
    categoryData: [],
    projectStatusData: [],
    projectTeamData: [],
    projectCategoryData: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [filters, setFilters] = useState<any>({
    status: "",
    service: "",
    category: "",
  });

  const [leadStatusesID, setLeadStatusesID] = useState<any>([]);
  const [serviceData, setServiceData] = useState<any>([]);
  const [categoryData, setCategoryData] = useState<any>([]);
  const [projectStatusData, setProjectStatusData] = useState<any>([]);
  const [projectTeamData, setProjectTeamData] = useState<any>([]);
  const [projectCategoryDataRaw, setProjectCategoryDataRaw] = useState<any>([]);
  const [openStatus, setOpenStatus] = useState(false);
  const [openService, setOpenService] = useState(false);
  const [openCategory, setOpenCategory] = useState(false);
  const [openProjectStatus, setOpenProjectStatus] = useState(false);
  const [openProjectTeam, setOpenProjectTeam] = useState(false);
  const [openProjectCategory, setOpenProjectCategory] = useState(false);
  const [statusId, setStatusId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [projectStatusId, setProjectStatusId] = useState("");
  const [projectTeamId, setProjectTeamId] = useState("");
  const [projectCategoryId, setProjectCategoryId] = useState("");

  const settings = useSelector((state: any) => state.chartSettings);

  const today = dayjs();
  const startDate = today.startOf("month").format("YYYY-MM-DD");
  const endDate = today.format("YYYY-MM-DD");

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters((prevFilters: any) => ({
      ...prevFilters,
      [filterType]: value,
    }));
  };

  const handleStatusChartClick = (selectedLabel: string) => {
    const selectedStatus = leadStatusesID.find(
      (status: any) => status.name === selectedLabel
    );
    if (selectedStatus) {
      setStatusId(selectedStatus.id.toString());
    } else {
      setStatusId(selectedLabel);
    }
    setOpenStatus(true);
  };

  const handleServiceChartClick = (selectedLabel: string) => {
    const selectedService = serviceData.find(
      (service: any) => service.service === selectedLabel
    );
    if (selectedService) {
      setServiceId(selectedService.serviceId);
    } else {
      setServiceId(selectedLabel);
    }
    setOpenService(true);
  };

  const handleCategoryChartClick = (selectedLabel: string) => {
    const selectedCategory = categoryData.find(
      (category: any) => category.category === selectedLabel
    );
    if (selectedCategory) {
      setCategoryId(selectedCategory.categoryId);
    } else {
      setCategoryId(selectedLabel);
    }
    setOpenCategory(true);
  };

  const handleProjectStatusChartClick = (selectedLabel: string) => {
    const selectedStatus = projectStatusData.find(
      (status: any) => status.name === selectedLabel
    );
    if (selectedStatus) {
      setProjectStatusId(selectedStatus.id.toString());
    } else {
      setProjectStatusId(selectedLabel);
    }
    setOpenProjectStatus(true);
  };

  const handleProjectTeamChartClick = (selectedLabel: string) => {
    const selectedTeam = projectTeamData.find(
      (team: any) => team.name === selectedLabel
    );
    if (selectedTeam) {
      setProjectTeamId(selectedTeam.id);
    } else {
      setProjectTeamId(selectedLabel);
    }
    setOpenProjectTeam(true);
  };

  const handleProjectCategoryChartClick = (selectedLabel: string) => {
    const selectedCategory = projectCategoryDataRaw.find(
      (category: any) => category.name === selectedLabel
    );
    if (selectedCategory) {
      setProjectCategoryId(selectedCategory.id);
    } else {
      setProjectCategoryId(selectedLabel);
    }
    setOpenProjectCategory(true);
  };

  useEffect(() => {
    const fetchLeadStatuses = async () => {
      try {
        const leadStatusesData = await getAllLeadStatus();
        const leadStatuses = leadStatusesData.leadStatuses.map(
          (status: any) => ({
            name: status.name,
            id: status.id,
          })
        );
        setLeadStatusesID(leadStatuses);
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

        // Build the promises array based on the role
        const promises: Promise<any>[] = [];

        // Admin sees both leads and projects data
        if (isAdmin) {
          promises.push(
            getLeadsByStatusAnalytics(startDate, endDate),
            getLeadsByServiceAnalytics(startDate, endDate),
            getLeadsByProjectCategoryAnalytics(startDate, endDate, "")
          );
        }

        // Both roles see projects data
        promises.push(
          getProjectStatusCount(startDate, endDate),
          getProjectTeamCount(startDate, endDate),
          getProjectCategoryCount(startDate, endDate)
        );

        const results = await Promise.all(promises);

        let statusRes, serviceRes, categoryRes, projectStatusRes, projectTeamRes, projectCategoryRes;

        if (isAdmin) {
          [statusRes, serviceRes, categoryRes, projectStatusRes, projectTeamRes, projectCategoryRes] = results;
          setServiceData(serviceRes?.data || []);
          setCategoryData(categoryRes?.data || []);
        } else {
          [projectStatusRes, projectTeamRes, projectCategoryRes] = results;
        }

        setProjectStatusData(projectStatusRes?.projectCountByStatus || []);
        setProjectTeamData(projectTeamRes?.projectCountByTeams || []);
        setProjectCategoryDataRaw(
          projectCategoryRes?.projectCountByAllCategories || []
        );

        const convertProjectData = (apiData: any[], countKey: string) => {
          return apiData.map((item) => ({
            label: item.name,
            value: item[countKey],
            color: item.color || "#3B82F6",
            totalCost: item.totalCost || 0,
          }));
        };

        setChartData({
          statusData: isAdmin ? convertToChartData(
            statusRes?.data || [],
            "count",
            "status",
            "budget"
          ) : [],
          serviceData: isAdmin ? convertToChartData(
            serviceRes?.data || [],
            "count",
            "service",
            "budget"
          ) : [],
          categoryData: isAdmin ? convertToChartData(
            categoryRes?.data || [],
            "count",
            "category",
            "totalBudget"
          ) : [],
          projectStatusData: convertProjectData(
            projectStatusRes?.projectCountByStatus || [],
            "projectsCount"
          ),
          projectTeamData: convertProjectData(
            projectTeamRes?.projectCountByTeams || [],
            "projectsCount"
          ),
          projectCategoryData: convertProjectData(
            projectCategoryRes?.projectCountByAllCategories || [],
            "projectsCountByCategory"
          ),
        });
      } catch (error) {
        console.error("Error fetching chart data:", error);
        setError(
          error instanceof Error ? error.message : "Failed to fetch data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, isAdmin]);

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "40px 20px",
          boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
          minHeight: "400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "20px",
          boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
        }}
      >
        <div className="alert alert-danger" role="alert">
          Error loading chart data: {error}
        </div>
      </div>
    );
  }

  return (
    <div
      // style={{
      //   backgroundColor: "white",
      //   borderRadius: "16px",
      //   padding: "16px 20px",
      //   boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
      // }}
    >
      {/* Header */}
      {/* <div style={{ marginBottom: "16px" }}>
        <h2
          style={{
            fontSize: "20px",
            fontWeight: 600,
            margin: 0,
            fontFamily: "Barlow, sans-serif",
            letterSpacing: "0.2px",
          }}
        >
          Lead Analytics
        </h2>
      </div> */}

      {/* Charts */}
      <div className="row g-3">
        {/* Lead Charts - Only for Admin */}
       
            {/* Lead By Status */}
            <div className="col-12 col-md-6 col-lg-6">
              <CustomPieCharts
                data={chartData.statusData}
                title="This Month Leads By Status"
                height={250}
                width={250}
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

            {/* Lead By Service */}
            <div className="col-12 col-md-6 col-lg-6">
              <CustomPieCharts
                data={chartData.serviceData}
                title="This Month Leads by Service"
                height={250}
                width={250}
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

            {/* Lead By Project Category */}
            <div className="col-12 col-md-6 col-lg-6">
              <CustomPieCharts
                data={chartData.categoryData}
                title="This Month Leads by Project Category"
                height={250}
                width={250}
                chartType="pie"
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
          

        {/* Project Charts - For Both Admin and Members */}
        {/* Projects By Status */}
        <div className="col-12 col-md-6 col-lg-6">
          <CustomPieCharts
            data={chartData.projectStatusData}
            title="This Month Projects By Status"
            height={250}
            width={250}
            chartType="pie"
            showFilter={true}
            filterOptions={chartData.projectStatusData
              .map((item: any) => item.label)
              .sort((a: string, b: string) => a.localeCompare(b))}
            filterValue={filters.projectStatus || ""}
            onFilterChange={(value: string) =>
              handleFilterChange("projectStatus", value)
            }
            onChartClick={handleProjectStatusChartClick}
            filterPlaceholder="All Status"
            key="project-status-chart"
          />
        </div>

        {/* Projects By Service (Team) */}
        <div className="col-12 col-md-6 col-lg-6">
          <CustomPieCharts
            data={chartData.projectTeamData}
            title="This Month Projects by Service"
            height={250}
            width={250}
            chartType="donut"
            showFilter={true}
            filterOptions={chartData.projectTeamData
              .map((item: any) => item.label)
              .sort((a: string, b: string) => a.localeCompare(b))}
            filterValue={filters.projectTeam || ""}
            onFilterChange={(value: string) =>
              handleFilterChange("projectTeam", value)
            }
            onChartClick={handleProjectTeamChartClick}
            filterPlaceholder="All Teams"
            key="project-team-chart"
          />
        </div>

        {/* Projects By Category */}
        <div className="col-12 col-md-6 col-lg-6">
          <CustomPieCharts
            data={chartData.projectCategoryData}
            title="This Month Projects by Category"
            height={250}
            width={250}
            chartType="pie"
            showFilter={true}
            filterOptions={chartData.projectCategoryData
              .map((item: any) => item.label)
              .sort((a: string, b: string) => a.localeCompare(b))}
            filterValue={filters.projectCategory || ""}
            onFilterChange={(value: string) =>
              handleFilterChange("projectCategory", value)
            }
            onChartClick={handleProjectCategoryChartClick}
            filterPlaceholder="All Categories"
            key="project-category-chart"
          />
        </div>
      </div>
      

      {/* Chart Dialog Modals - Lead modals only for Admin */}
  
          <ChartDialogModal
            open={openStatus}
            onClose={() => setOpenStatus(false)}
            statusId={statusId || undefined}
            startDate={today.startOf("month") || undefined}
            endDate={today || undefined}
          />
          <ChartDialogModal
            open={openService}
            onClose={() => setOpenService(false)}
            serviceId={serviceId || undefined}
            startDate={today.startOf("month") || undefined}
            endDate={today || undefined}
          />
          <ChartDialogModal
            open={openCategory}
            onClose={() => setOpenCategory(false)}
            categoryId={categoryId || undefined}
            startDate={today.startOf("month") || undefined}
            endDate={today || undefined}
          />

      <ProjectDialogModal
        open={openProjectStatus}
        onClose={() => setOpenProjectStatus(false)}
        statusId={projectStatusId || undefined}
        startDate={today.startOf("month") || undefined}
        endDate={today || undefined}
      />
      <ProjectDialogModal
        open={openProjectTeam}
        onClose={() => setOpenProjectTeam(false)}
        teamId={projectTeamId || undefined}
        startDate={today.startOf("month") || undefined}
        endDate={today || undefined}
      />
      <ProjectDialogModal
        open={openProjectCategory}
        onClose={() => setOpenProjectCategory(false)}
        categoryId={projectCategoryId || undefined}
        startDate={today.startOf("month") || undefined}
        endDate={today || undefined}
      />
    </div>
  );
};

export default DashboardGraph;
