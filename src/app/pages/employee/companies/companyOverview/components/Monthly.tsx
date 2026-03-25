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
  month: dayjs.Dayjs;
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

const Monthly: React.FC<Props> = ({ month, endDate }) => {
  // State

  const [companyLocationByStatusData, setCompanyLocationByStatusData] = useState([])
  const [upcomingContactsBirthdays, setUpcomingContactsBirthdays] = useState<any[]>([])
  const [chartData, setChartData] = useState<ChartState>({
    companiesByType: [],
    contactsByRoles: [],
    companiesByStatus: [],
    // categoryData: [],
    // serviceData: [],
    // subcategoryData: [],
    // yearlyData: [],
    // locationData: [],
  });
 
  const [startDate, setStartDate] = useState<string>()
  const [endDateFormatted, setEndDateFormatted] = useState<string>()
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
    const data = apiData.map((item) => ({
      label: item.name ?? item.label,
      value: item[countKey] ?? item.value,
      color: item.color || "#3B82F6",
      totalCost: item.totalCost || 0,
    }));
    
    return data;
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
    if (!month || !endDate) return;

    setLoading(true);
    setError("");

    try {
      const startDate = dayjs(month).format("YYYY-MM-DD");
      const endDateFormatted = dayjs(endDate).format("YYYY-MM-DD");
      setStartDate(startDate)
      setEndDateFormatted(endDateFormatted)
      const year = dayjs(month).year().toString();

      // Fetch all data in parallel
      const [
        companyCountByType,
        contactCountByRoles,
        comapaniesByStatus,
        companiesByLocationAndStatus,
        upcomingBirthdaysRes,
      ] = await Promise.all([
        getCompanyCountByType(startDate, endDateFormatted),
        getContactCountByRoles(startDate, endDateFormatted),
        getCompanyCountByStatus(startDate, endDateFormatted),
        getCompaniesByLocationAndStatus(startDate, endDateFormatted),
        getUpcomingContactsBirthdays(startDate, endDateFormatted),
      ]);

      setCompanyTypeData(companyCountByType?.companyCountByType);
      setContactByRolesData(contactCountByRoles?.contactCountByRole);
      setCompanyStatusData(comapaniesByStatus?.companyCountByStatus);

      // const companyCountByType = await getCompanyCountByType(startDate, endDateFormatted);
      setCompanyLocationByStatusData(companiesByLocationAndStatus.companiesByLocationsAndStatus);

      const companiesByStatus = comapaniesByStatus?.companyCountByStatus.map((item: any) => ({ ...item, 
        label: item.status,
        companyCount: item.companyCount }));
      
      // Set upcoming birthdays data with date filtering
      const filteredBirthdays = (upcomingBirthdaysRes?.allContacts || []).filter((contact: any) => {
        if (!contact.dateOfBirth) return false;
        const birthDate = dayjs(contact.dateOfBirth);
        const birthDayMonth = birthDate.format('MM-DD');
        const currentYear = dayjs(startDate).year();
        const contactBirthdayThisYear = dayjs(`${currentYear}-${birthDayMonth}`);
        
        return contactBirthdayThisYear.isAfter(dayjs(startDate)) && 
               contactBirthdayThisYear.isBefore(dayjs(endDateFormatted));
      });
      setUpcomingContactsBirthdays(filteredBirthdays);

      // Transform data
      setChartData({
        companiesByType: convertToChartData(companyCountByType?.companyCountByType || [], "companyCount"),
        contactsByRoles: convertToChartData(contactCountByRoles?.contactCountByRole || [], "contactCount"),
        companiesByStatus: convertToChartData(companiesByStatus || [], "companyCount"),
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
    return data.filter(item => item.label === filterValue);
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
          <button className="btn btn-sm btn-outline-danger ms-2" onClick={fetchData}>
            Retry
          </button>
        </div>
      </div>
    );
  }


  return (
    <div >
      <div className="row g-3">
        
        {/* Projects by Status */}
        {settings.showCompaniesByType && chartData.companiesByType.length > 0 && (
          <div className="col-12">
            <CustomBarChart
              data={applyFilter(chartData.companiesByType, "subcategory")}
              title="Companies By Type"
              width={250}
              height={250}
              showFilter={true}
              filterKey="subcategory"
              filterOptions={chartData.companiesByType.map(item => item.label).sort((a, b) => a.localeCompare(b))}
              filterValue={filters.subcategory || ""}
              onFilterChange={(value: string) => handleFilterChange("subcategory", value)}
              filterPlaceholder="All Categories"
              onChartClick={handleCompanyTypeChartClick}
            />
          </div>

        )}

        {/* Projects by Team */}
        {/* {settings.showProjectsByTeam && chartData.teamData.length > 0 && ( */}
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
        {/* )} */}

         {settings.showCompaniesByStatus && chartData.companiesByStatus.length > 0 && <div className="col-12 col-md-6">
            <CustomPieChart
              data={chartData.companiesByStatus}
              title="Companies By Status"
              width={250}
              height={250}
              chartType="donut"
              showTotalProject={false}
              onChartClick={handleCompanyStatusChartClick}
            />
          </div>}


          {settings?.showCompaniesByLocation && companyLocationByStatusData.length > 0 && <div className=" mt-4">
          <div className="">
            <CompaniesByLocationAndSatatus data={companyLocationByStatusData} startDate={month} endDate={endDate}/>
          </div>
        </div>}

        {/* Projects by Category */}
        {/* {settings.showProjectsByCategory && chartData.categoryData.length > 0 && ( */}
          {settings.showCompaniesByRating && <div className="col-12">
            <TopCompaniesByRating startDate={startDate} endDate={endDateFormatted}/>
          </div>}
        {/* )} */}

        {/* Projects by Service */}
        {/* {settings.showProjectsByService && chartData.serviceData.length > 0 && ( */}
         
         {settings.showUpcomingContactBirthdays && upcomingContactsBirthdays.length > 0 && <div className="col-12 col-md-6">
            <UpcomingContactsBirthdays data={upcomingContactsBirthdays}/>
          </div>}
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
        
      

      {/* Company Dialog Modal */}
      <CompanyDialogModal open={openCompanyType} onClose={() => setOpenCompanyType(false)} companyTypeId={companyTypeId} startDate={month} endDate={endDate}/>
      <CompanyDialogModal open={openContactByRoles} onClose={() => setOpenContactByRoles(false)} contactByRolesId={contactByRolesId} startDate={month} endDate={endDate}/>
      <CompanyDialogModal open={openCompanyStatus} onClose={() => setOpenCompanyStatus(false)} statusId={companyStatusId} startDate={month} endDate={endDate}/>
    </div>
  );
};

export default Monthly;