import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import {
  getCompanyCountByType,
  getContactCountByRoles,
  getCompanyCountByStatus,
  getCompaniesByLocationAndStatus,
  getUpcomingContactsBirthdays,
} from "@services/companies";
import CustomPieChart from "../../../projects/commonComponents/CustomChart";
import CustomBarChart from "../../../projects/commonComponents/BarChart";
import Loader from "@app/modules/common/utils/Loader";
import CompaniesByLocationAndSatatus from "./CompaniesByLocationAndSatatus";
import UpcomingContactsBirthdays from "./UpcomingContactsBirthdays";
import TopCompaniesByRating from "./TopCompaniesByRating";
import { CompanyDialogModal } from "./CompanyDialogModal";

// Simple types
interface Props {
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  fromAdmin?: boolean;
  dateSettingsEnabled?: boolean;
}

interface ChartData {
  label: string;
  value: number;
  color: string;
  totalCost?: number;
}

interface ChartState {
  companiesByType: ChartData[];
  contactsByRoles: ChartData[];
  companiesByStatus: ChartData[];
}

const Custom: React.FC<Props> = ({ startDate, endDate }) => {
  // State
  const [companyLocationByStatusData, setCompanyLocationByStatusData] = useState([])
  const [upcomingContactsBirthdays, setUpcomingContactsBirthdays] = useState<any[]>([])
  const [chartData, setChartData] = useState<ChartState>({
    companiesByType: [],
    contactsByRoles: [],
    companiesByStatus: [],
  });
  const [startDateFormatted, setStartDateFormatted] = useState<string>()
  const [endDateFormattedState, setEndDateFormattedState] = useState<string>()
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [filters, setFilters] = useState<any>({});
  const [openCompanyType, setOpenCompanyType] = useState(false);
  const [companyTypeId, setCompanyTypeId] = useState("");
  const [companyTypeData, setCompanyTypeData] = useState<any[]>([]);
  const [openContactByRoles, setOpenContactByRoles] = useState(false);
  const [contactByRolesId, setContactByRolesId] = useState("");
  const [contactByRolesData, setContactByRolesData] = useState<any[]>([]);
  const [openCompanyStatus, setOpenCompanyStatus] = useState(false);
  const [companyStatusId, setCompanyStatusId] = useState("");
  const [companyStatusData, setCompanyStatusData] = useState<any[]>([]);

  // Get settings from Redux
  const settings = useSelector((state: any) => state.chartSettings);

  // Convert API data to chart format
  const convertToChartData = (apiData: any[], countKey: string): ChartData[] => {
    return apiData.map((item) => ({
      label: item.name ?? item.label,
      value: item[countKey] ?? item.value,
      color: item.color || "#3B82F6",
      totalCost: item.totalCost || 0,
    }));
  };

  // Transform monthly data for yearly chart
  const transformYearlyData = (apiData: any[]) => {
    const monthNames = [
      "", "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const statusMap: any = {};

    apiData.forEach((monthEntry) => {
      const monthName = monthNames[monthEntry.month] || `Month ${monthEntry.month}`;
      
      monthEntry.projectsCountByStatus.forEach((status: any) => {
        if (!statusMap[status.name]) {
          statusMap[status.name] = {
            label: status.name,
            color: status.color || "#ccc",
            data: [],
          };
        }
        statusMap[status.name].data.push({
          x: monthName,
          y: status.projectsCount
        });
      });
    });

    return Object.values(statusMap);
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

  const handleContactByRolesChartClick = (selectedLabel: string) => {
    const selectedCompanyType = contactByRolesData.find(
      (companyType: any) => companyType.name === selectedLabel
    );
    if (selectedCompanyType) {
      setContactByRolesId(selectedCompanyType.id);
    } else {
      setContactByRolesId(selectedLabel);
    }
    setOpenContactByRoles(true);
  };

  const handleCompanyStatusChartClick = (selectedLabel: string) => {
    const selectedCompanyType = companyStatusData.find(
      (companyType: any) => companyType.status === selectedLabel
    );
    
    if (selectedCompanyType) {
      setCompanyStatusId(selectedCompanyType.status);
    } else {
      setCompanyStatusId(selectedLabel);
    }
    setOpenCompanyStatus(true);
  };


  // Fetch all data
  const fetchData = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError("");

    try {
      const startDateFormattedLocal = dayjs(startDate).format("YYYY-MM-DD");
      const endDateFormattedLocal = dayjs(endDate).format("YYYY-MM-DD");
      setStartDateFormatted(startDateFormattedLocal)
      setEndDateFormattedState(endDateFormattedLocal)
      const years = dayjs(startDate).year().toString();

      // Fetch all data in parallel
      const [
        companyCountByType,
        contactCountByRoles,
        comapaniesByStatus,
        companiesByLocationAndStatus,
        upcomingBirthdaysRes,
      ] = await Promise.all([
        getCompanyCountByType(startDateFormattedLocal, endDateFormattedLocal),
        getContactCountByRoles(startDateFormattedLocal, endDateFormattedLocal),
        getCompanyCountByStatus(startDateFormattedLocal, endDateFormattedLocal),
        getCompaniesByLocationAndStatus(startDateFormattedLocal, endDateFormattedLocal),
        getUpcomingContactsBirthdays(),
      ]);

      setCompanyTypeData(companyCountByType?.companyCountByType);
      setContactByRolesData(contactCountByRoles?.contactCountByRole);
      setCompanyStatusData(comapaniesByStatus?.companyCountByStatus);

      // Set company location and status data
      setCompanyLocationByStatusData(companiesByLocationAndStatus?.companiesByLocationsAndStatus || []);

      // Filter upcoming birthdays based on the selected date range
      let filteredBirthdays = (upcomingBirthdaysRes?.allContacts || [])

      filteredBirthdays = filteredBirthdays.filter((contact: any) => {
        if (!contact.dateOfBirth) return false;
        
        const contactDate = dayjs(contact.dateOfBirth);
        const contactMonth = contactDate.month() + 1; // dayjs months are 0-indexed
        const contactDay = contactDate.date();
        
        const startDate = dayjs(startDateFormattedLocal);
        const startMonth = startDate.month() + 1;
        const startDay = startDate.date();
        
        const endDate = dayjs(endDateFormattedLocal);
        const endMonth = endDate.month() + 1;
        const endDay = endDate.date();
        
        // Helper function to compare month-day combinations
        const isDateInRange = (month: number, day: number, startM: number, startD: number, endM: number, endD: number) => {
          // Convert month-day to a comparable format (MMDD)
          const dateValue = month * 100 + day;
          const startValue = startM * 100 + startD;
          const endValue = endM * 100 + endD;
          
          // If the range doesn't cross year boundary (e.g., March to November)
          if (startValue <= endValue) {
            return dateValue >= startValue && dateValue <= endValue;
          }
          // If the range crosses year boundary (e.g., November to February)
          else {
            return dateValue >= startValue || dateValue <= endValue;
          }
        };
        
        return isDateInRange(contactMonth, contactDay, startMonth, startDay, endMonth, endDay);
      });
      console.log("filteredBirthdays:: ",filteredBirthdays);
      
      setUpcomingContactsBirthdays(filteredBirthdays);
      const companiesByStatus = comapaniesByStatus?.companyCountByStatus.map((item: any) => ({ ...item, 
        label: item.status,
        companyCount: item.companyCount }));
      // Update chart data
      setChartData({
        companiesByType: convertToChartData(companyCountByType?.companyCountByType || [], "companyCount"),
        contactsByRoles: convertToChartData(contactCountByRoles?.contactCountByRole || [], "contactCount"),
        companiesByStatus: convertToChartData(companiesByStatus || [], "companyCount"),
      });

    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. Please try again.");
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
    return data.filter(item => item.label === filterValue);
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
          <button className="btn btn-sm btn-outline-danger ms-2" onClick={fetchData}>
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
        {settings.showCompaniesByType && chartData.companiesByType.length > 0 && <div className="col-12">
          <CustomBarChart
            data={applyFilter(chartData.companiesByType, "subcategory")}
            title="Companies By Type"
            height={400}
            showFilter={true}
            filterKey="subcategory"
            filterOptions={chartData.companiesByType.map(item => item.label).sort((a, b) => a.localeCompare(b))}
            filterValue={filters.subcategory || ""}
            onFilterChange={(value: string) => handleFilterChange("subcategory", value)}
            filterPlaceholder="All Categories"
            onChartClick={handleCompanyTypeChartClick}
          />
        </div>}

        {/* Projects by Team */}
        {settings.showCompaniesByRoles && chartData.contactsByRoles.length > 0 && <div className="col-12 col-md-12">
          <CustomBarChart
              data={applyFilter(chartData.contactsByRoles, "name")}
              title="Contacts By Roles"
              height={400} 
              showFilter={false}
              filterKey="name"
              filterOptions={[]}
              filterValue={filters.subcategory || ""}
              onFilterChange={(value: string) => handleFilterChange("name", value)}
              filterPlaceholder="All Categories"
              onChartClick={handleContactByRolesChartClick}
            />
        </div>}

        {settings.showCompaniesByStatus && chartData.companiesByStatus.length > 0 && <div className="col-12 col-md-6">
            <CustomPieChart
              data={chartData.companiesByStatus}
              title="Companies By Status"
              height={250}
              chartType="donut"
              showTotalProject={false}
              onChartClick={handleCompanyStatusChartClick}
            />
          </div>}
          {settings.showCompaniesByLocation && companyLocationByStatusData.length > 0 && <div className="mt-4">
          <div className="">
            <CompaniesByLocationAndSatatus data={companyLocationByStatusData} startDate={startDate} endDate={endDate}/>
          </div>
        </div>}
          {settings.showUpcomingContactBirthdays && upcomingContactsBirthdays.length > 0 && <div className="col-12 col-md-6">
            <UpcomingContactsBirthdays data={upcomingContactsBirthdays}/>
          </div>}

        {/* Projects by Category */}
        {settings.showCompaniesByRating && <div className="col-12">
          <TopCompaniesByRating startDate={startDateFormatted} endDate={endDateFormattedState}/>
        </div>}

        {/* Projects by Service */}
        {/* {settings.showProjectsByService && chartData.serviceData.length > 0 && ( */}
        
        {/* )} */}

        {/* Monthly Projects by Status */}
        {/* {settings.showProjectsMonthlyStatus && chartData.yearlyData.length > 0 && ( */}
          {/* <div className="col-12">
            <YearlyStatusCountChart
              data={chartData.yearlyData}
              title="Monthly Projects By Status"
              height={400}
              stacked={true}
            />
          </div> */}
        {/* )} */}
      </div>

      {/* Location Chart */}
      {/* {settings.showProjectsByLocation && chartData.locationData.length > 0 && ( */}
      
      {/* )} */}

      {/* Company Dialog Modal */}
      <CompanyDialogModal open={openCompanyType} onClose={() => setOpenCompanyType(false)} companyTypeId={companyTypeId} startDate={startDate} endDate={endDate}/>
      <CompanyDialogModal open={openContactByRoles} onClose={() => setOpenContactByRoles(false)} contactByRolesId={contactByRolesId} startDate={startDate} endDate={endDate}/>
      <CompanyDialogModal open={openCompanyStatus} onClose={() => setOpenCompanyStatus(false)} statusId={companyStatusId} startDate={startDate} endDate={endDate}/>
    </div>
  );
};

export default Custom;