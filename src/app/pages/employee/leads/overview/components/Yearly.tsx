import {
  getLeadsByStatusAnalytics,
  getLeadsByServiceAnalytics,
  getLeadsByProjectCategoryAnalytics,
  getLeadsBySubcategoryAnalytics,
  getLeadsByDirectSourceAnalytics,
  getLeadsByReferralSourceAnalytics,
  getLeadsBySourceAnalytics,
  getLeadsByCompanyTypeAnalytics,
  getMonthlyLeadAnalytics,
  getMonthlyLeadsByReferralSources,
  getMonthlyLeadsByDirectSources,
  getMonthlyTopLeads,
  getLeadsByLocationAnalytics,
  getAllLeadStatus,
} from "@services/lead";
import dayjs from "dayjs";
import { ChartData } from "@models/clientProject";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import CustomPieCharts from "../commonComponents/LeadsCustomGraph";
import CustomBarChart from "@pages/employee/projects/commonComponents/BarChart";
import Loader from "@app/modules/common/utils/Loader";
import {
  convertToChartData,
  convertDirectSourceData,
  convertReferralSourceData,
  convertCompanyTypeData,
  convertSubcategoryData,
  transformYearlyData,
  transformYearlyDatas,
  transformYearlyDataReferralSources,
  transformYearlyDataDirectSources,
  transformTopLeadsData,
  transformTopLeadsDataAdvanced,
} from "@utils/leadsProjectCompaniesStatistics";
import YearlyStatusCountChart from "@pages/employee/projects/commonComponents/YearlyStatusCountChart";
import LocationProjectChart from "@pages/employee/projects/commonComponents/ProjectByLocationChart";
import LeadByLocationChart from "../commonComponents/LeadByLocationChart";
import { ChartDialogModal } from "./ChartDialogModal";
interface Props {
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
}

const Yearly = ({ startDate, endDate }: Props) => {
  const [chartData, setChartData] = useState<any>({
    statusData: [],
    serviceData: [],
    categoryData: [],
    subcategoryData: [],
    directSourceData: [],
    referralSourceData: [],
    sourceData: [],
    companyTypeData: [],
    yearlyData: [],
    yearlyReferralSourceData: [],
    yearlyDirectSourceData: [],

    topLeadsData: [],
    locationData: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [filters, setFilters] = useState<any>({
    status: "",
    service: "",
    category: "",
    subcategory: "",
    subcategoryCategory: "",
    directSource: "",
    yearlyData: "",

    topLeadsType: "source", // source, category, service
    topLeadsStatus: "",
    topLeadsReferralType: "",
    topLeadsDirectSource: "",
  });

  const [directSourceRes, setDirectSourceRes] = useState<any>(null);
  const [referralSourceRes, setReferralSourceRes] = useState<any>(null);
  const [sourceRes, setSourceRes] = useState<any>(null);
  const [companyTypeRes, setCompanyTypeRes] = useState<any>(null);
  const [subcategoryRes, setSubcategoryRes] = useState<any>(null);
  const [monthlyLeadsRes, setMonthlyLeadsRes] = useState<any>(null);
  const [yearlyReferralSourceData, setYearlyRefferalSourceData] =
    useState<any>(null);
  const [locationRes, setLocationRes] = useState<any>(null);
  const [monthlyTopLeadsRes, setMonthlyTopLeadsRes] = useState<any>(null);
  const [leadStatusesID, setLeadStatusesID] = useState<any>([]);
  
  const [open, setOpen] = useState(false);
  const [statusId, setStatusId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [openService, setOpenService] = useState(false);
  const [serviceData, setServiceData] = useState<any>([]);
  const [categoryData, setCategoryData] = useState<any>([]);
  const [categoryId, setCategoryId] = useState('');
  const [openCategory, setOpenCategory] = useState(false);
  const [openReferral, setOpenReferral] = useState(false);
  const [referralId, setReferralId] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [openSource, setOpenSource] = useState(false);
  const [subCategoryId, setSubCategoryId] = useState('');
  const [openSubCategory, setOpenSubCategory] = useState(false);
  const [companyTypeId, setCompanyTypeId] = useState('');
  const [openCompanyType, setOpenCompanyType] = useState(false);
  const [topLeadsId, setTopLeadsId] = useState<string[] | null>(null);
  const [openTopLeads, setOpenTopLeads] = useState(false);


  const [openModal, setOpenModal] = useState(false);
  const settings = useSelector((state: any) => state.chartSettings);

  const handleTopLeadsFilterChange = (filterType: string, value: string) => {
    if (filterType === "topLeadsType") {
      // Reset dependent filters when main type changes
      setFilters((prevFilters: any) => ({
        ...prevFilters,
        [filterType]: value,
        topLeadsStatus: "",
        topLeadsReferralType: "",
        topLeadsDirectSource: "",
      }));
    } else {
      setFilters((prevFilters: any) => ({
        ...prevFilters,
        [filterType]: value,
      }));
    }
  };

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
    setOpen(true);
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

  const handleReferralChartClick = (selectedLabel: string) => {
    const allLeads =
      referralSourceRes?.data?.flatMap((referral: any) => referral.leadsData) ?? [];
    
    let selectedReferral = allLeads.find(
      (referral: any) => referral.name === selectedLabel
    );
    
    if (!selectedReferral) {
      selectedReferral = allLeads.find(
        (referral: any) => referral.id === selectedLabel
      );
    }
    
    if (selectedReferral) {
      setReferralId(selectedReferral.id);
      handleFilterChange("referralStatus", selectedReferral.name);
    } else {
      setReferralId(selectedLabel);
      handleFilterChange("referralStatus", selectedLabel);
    }
    
    setOpenReferral(true);
  };

  const handleSourceChartClick = (selectedLabel: string) => {
    const selectedSource = sourceRes?.data?.find(
      (source: any) => source.source === selectedLabel
    );
    if (selectedSource) {
      setSourceId(selectedSource.source);
    } else {
      setSourceId(selectedLabel);
    }
    setOpenSource(true);
  };

  const handleSubCategoryChartClick = (selectedLabel: string) => {    
    let selectedSubCategory: any = null;
    subcategoryRes?.data?.forEach((category: any) => {
      if (category.subCategories) {
        const found = category.subCategories.find(
          (subcat: any) => subcat.name === selectedLabel
        );
        if (found) {
          selectedSubCategory = found;
        }
      }
    });
    
    if (selectedSubCategory) {
      setSubCategoryId(selectedSubCategory.id);
    } else {
      setSubCategoryId(selectedLabel);
    }
    setOpenSubCategory(true);
  };

  const handleCompanyTypeChartClick = (selectedLabel: string) => {
    let selectedCompanyType:any = null;
    
    companyTypeRes?.data?.forEach((statusGroup: any) => {
      if (statusGroup.allLeadsByAllCompanyType) {
        const found = statusGroup.allLeadsByAllCompanyType.find(
          (companyType: any) => companyType.name === selectedLabel
        );
        if (found) {
          selectedCompanyType = found;
        }
      }
    });    
    
    if (selectedCompanyType) {
      setCompanyTypeId(selectedCompanyType.id);
      handleFilterChange("companyType", selectedCompanyType.name);
    } else {
      setCompanyTypeId(selectedLabel);
    }
    setOpenCompanyType(true);
  };

  const handleTopLeadsChartClick = (selectedLabel?: string) => {
    let ids: string[] = [];
  
    monthlyTopLeadsRes?.data?.forEach((status: any) => {
      Object.values(status.data).forEach((sections: any) => {
        sections.forEach((entry: any) => {
          if (entry.name === selectedLabel) {
            entry.data.forEach((item: any) => {
              if (item.lead?.id) {
                ids.push(item.lead.id);
              }
            });
          }
        });
      });
    });
  
    setTopLeadsId(ids);
    setOpenTopLeads(true);
    return ids;
  };

  const handleCategoryFilterChange = async (value: string) => {

    setFilters((prev: any) => ({ ...prev, category: value }));

    if (value === "All") {
      // For "All", pass empty string or null
      await fetchCategoryAnalytics("");
    } else {
      // Find the selected status and get its ID
      const selectedStatus = leadStatusesID.find(
        (status: any) => status.name === value
      );


      if (selectedStatus) {
        await fetchCategoryAnalytics(selectedStatus.id.toString());
      } else {
        console.warn("Status not found:", value);
        // Fallback: try with the value itself
        await fetchCategoryAnalytics(value);
      }
    }
  };


  const applyFilter = (data: ChartData[], filterKey: string) => {
    const filterValue = filters[filterKey];
    if (!filterValue || filterValue === "all") return data;
    return data.filter((item) => item.label === filterValue);
  };

  const startDates = startDate.startOf("month").format("YYYY-MM-DD");
  const endDates = endDate.endOf("month").format("YYYY-MM-DD");

  // Function to get filtered top leads data based on current filters
  const getFilteredTopLeadsData = () => {
    if (!monthlyTopLeadsRes?.data) return [];

    const {
      topLeadsType,
      topLeadsStatus,
      topLeadsReferralType,
      topLeadsDirectSource,
    } = filters;

    // Use the advanced transform function with filters
    return transformTopLeadsDataAdvanced(monthlyTopLeadsRes.data, {
      groupBy: topLeadsType,
      status: topLeadsStatus,
      referralType: topLeadsReferralType,
      directSource: topLeadsDirectSource,
    });
  };

  // Get filter options for Top Leads dropdowns
  const getTopLeadsFilterOptions = () => {
    if (!monthlyTopLeadsRes?.data) {
      return {
        statusOptions: [],
        referralTypeOptions: [],
        directSourceOptions: [],
      };
    }

    const statusOptions = monthlyTopLeadsRes.data.map(
      (status: any) => status.name
    );

    let referralTypeOptions: string[] = [];
    let directSourceOptions: string[] = [];

    monthlyTopLeadsRes.data.forEach((status: any) => {
      if (status.data) {
        if (status.data.referralType) {
          status.data.referralType.forEach((ref: any) => {
            if (!referralTypeOptions.includes(ref.name)) {
              referralTypeOptions.push(ref.name);
            }
          });
        }
        if (status.data.directSource) {
          status.data.directSource.forEach((direct: any) => {
            if (!directSourceOptions.includes(direct.name)) {
              directSourceOptions.push(direct.name);
            }
          });
        }
      }
    });

    return {
      statusOptions,
      referralTypeOptions,
      directSourceOptions,
    };
  };

     const fetchCategoryAnalytics = useCallback(
        async (statusId?: string | null) => {
          try {
            setLoading(true); // Add loading state for this specific chart
    
            const data = await getLeadsByProjectCategoryAnalytics(
              startDate.format("YYYY-MM-DD"),
              endDate.format("YYYY-MM-DD"),
              statusId || ""
            );
    
    
            // Update only the categoryData, preserving other chart data
            setChartData((prevData: any) => ({
              ...prevData,
              categoryData: convertToChartData(
                data?.data || [],
                "count",
                "category",
                "totalBudget"
              ),
            }));
          } catch (error) {
            console.error("Error fetching category analytics:", error);
            setError(
              `Failed to fetch category data: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
    
            // Set empty data on error to show no data state
            setChartData((prevData: any) => ({
              ...prevData,
              categoryData: [],
            }));
          } finally {
            setLoading(false);
          }
        },
        [startDate, endDate]
      );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          statusRes,
          serviceRes,
          categoryRes,
          subcategoryApiRes,
          directSourceApiRes,
          referralSourceRes,
          sourceRes,
          companyTypeRes,
          monthlyLeadsRes,
          yearlyReferralSourceRes,
          yearlyDirectSourceRes,
          monthlyTopLeadsRes,
          locationRes,
        ] = await Promise.all([
          getLeadsByStatusAnalytics(startDates, endDates),
          getLeadsByServiceAnalytics(startDates, endDates),
          getLeadsByProjectCategoryAnalytics(
            startDates,
            endDates,
            filters.category === "All" ? "" : filters.category
          ),
          getLeadsBySubcategoryAnalytics(startDates, endDates),
          getLeadsByDirectSourceAnalytics(startDates, endDates),
          getLeadsByReferralSourceAnalytics(startDates, endDates),
          getLeadsBySourceAnalytics(startDates, endDates),
          getLeadsByCompanyTypeAnalytics(startDates, endDates),
          getMonthlyLeadAnalytics(startDates, endDates),
          getMonthlyLeadsByReferralSources(startDates, endDates),
          getMonthlyLeadsByDirectSources(startDates, endDates),
          getMonthlyTopLeads(startDates, endDates, filters.topLeadsType),
          getLeadsByLocationAnalytics(startDates, endDates),
        ]);

        setDirectSourceRes(directSourceApiRes);
        setReferralSourceRes(referralSourceRes);
        setSourceRes(sourceRes);
        setCompanyTypeRes(companyTypeRes);
        setSubcategoryRes(subcategoryApiRes);
        setMonthlyLeadsRes(monthlyLeadsRes);
        setYearlyRefferalSourceData(yearlyReferralSourceRes);
        setLocationRes(locationRes);
        setMonthlyTopLeadsRes(monthlyTopLeadsRes);
        setCategoryData(categoryRes?.data || []);
        setServiceData(serviceRes?.data || []),

        setChartData({
          statusData: convertToChartData(
            statusRes?.data || [],
            "count",
            "status",
            "budget"
          ),
          serviceData: convertToChartData(
            serviceRes?.data || [],
            "count",
            "service",
            "budget"
          ),
          categoryData: convertToChartData(
            categoryRes?.data || [],
            "count",
            "category",
            "totalBudget"
          ),
          subcategoryData: convertSubcategoryData(
            subcategoryApiRes?.data || [],
            filters.subcategoryCategory
          ),
          directSourceData: convertDirectSourceData(
            directSourceApiRes?.data || [],
            filters.directSource
          ),
          referralSourceData: convertToChartData(
            (referralSourceRes?.data || []).flatMap(
              (source: any) => source.leadsData || []
            ),
            "count",
            "name",
            "budget"
          ),
          sourceData: convertToChartData(
            sourceRes?.data || [],
            "count",
            "source",
            "budget"
          ),
          companyTypeData: convertToChartData(
            (companyTypeRes?.data || []).flatMap(
              (source: any) => source.allLeadsByAllCompanyType || []
            ),
            "count",
            "name",
            "budget"
          ),
          yearlyData: transformYearlyDatas(monthlyLeadsRes?.data || []),
          yearlyReferralSourceData: transformYearlyDataReferralSources(
            yearlyReferralSourceRes?.data || []
          ),
          yearlyDirectSourceData: transformYearlyDataDirectSources(
            yearlyDirectSourceRes?.data || []
          ),
          topLeadsData: getFilteredTopLeadsData(),
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
  }, [startDate, endDate, filters.topLeadsType]);

    useEffect(() => {
      const fetchLeadStatuses = async () => {
        try {
          const leadStatusesData = await getAllLeadStatus();
          // map name and id
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
    if (monthlyTopLeadsRes?.data) {
      setChartData((prevData: any) => ({
        ...prevData,
        topLeadsData: getFilteredTopLeadsData(),
      }));
    }
  }, [
    filters.topLeadsStatus,
    filters.topLeadsReferralType,
    filters.topLeadsDirectSource,
    monthlyTopLeadsRes,
  ]);

  // Update subcategory data when subcategory category filter changes
  useEffect(() => {
    if (subcategoryRes?.data) {
      setChartData((prevData: any) => ({
        ...prevData,
        subcategoryData: convertSubcategoryData(
          subcategoryRes.data,
          filters.subcategoryCategory
        ),
      }));
    }
  }, [filters.subcategoryCategory, subcategoryRes]);

  // Update direct source data when filter changes
  useEffect(() => {
    if (directSourceRes?.data) {
      setChartData((prevData: any) => ({
        ...prevData,
        directSourceData: convertDirectSourceData(
          directSourceRes.data,
          filters.directSource
        ),
      }));
    }
  }, [filters.directSource, directSourceRes]);

  // Update referral source data when filter changes
  useEffect(() => {
    if (referralSourceRes?.data) {
      const newReferralSourceData = convertReferralSourceData(
        referralSourceRes.data,
        filters.referralStatus
      );

      setChartData((prevData: any) => ({
        ...prevData,
        referralSourceData: newReferralSourceData,
      }));
    }
  }, [filters.referralStatus, referralSourceRes]);

  // Update company type data when filter changes
  useEffect(() => {
    if (companyTypeRes?.data) {
      const newCompanyTypeData = convertCompanyTypeData(
        companyTypeRes?.data,
        filters.companyType
      );

      setChartData((prevData: any) => ({
        ...prevData,
        companyTypeData: newCompanyTypeData,
      }));
    }
  }, [filters.companyType, companyTypeRes]);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger" role="alert">
          Error loading chart data: {error}
        </div>
      </div>
    );
  }

  // Create filter options for direct source dropdown and referral source dropdown
  const directSourceFilterOptions =
    directSourceRes?.data?.map((item: any) => item.name) || [];
  const referralStatusFilterOptions =
    referralSourceRes?.data?.map((item: any) => item.name) || [];

  // Create filter options for company type dropdown
  const companyTypeFilterOptions =
    companyTypeRes?.data?.map((item: any) => item.name) || [];

  // Create category filter options for subcategory chart
  const categoryFilterOptions =
    subcategoryRes?.data?.map((item: any) => item.name) || [];

  const topLeadsFilterOptions = getTopLeadsFilterOptions();


  return (
    <div className="">
      <div className="row g-3">
        {/* Lead By Status */}
        {settings?.showLeadsStatusChart && (
          <div className="col-12 col-md-6">
            <CustomPieCharts
              data={chartData.statusData}
              title="Lead By Status"
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
              filterPlaceholder="All Status"
              key="status-chart"
              onChartClick={handleStatusChartClick}
            />
          </div>
        )}

        {/* Lead By Service */}
        {settings?.showLeadsByServiceChart && (
            <div className="col-12 col-md-6">
              <CustomPieCharts
                data={chartData.serviceData}
                title="Lead By Service"
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
                filterPlaceholder="All Services"
                key="service-chart"
                onChartClick={handleServiceChartClick}
              />
            </div>
          )}

        {/* Leads by Monthly chart */}
        {settings?.showLeadsMonthlyByStatus && <div className="col-12">
          <YearlyStatusCountChart
            data={chartData.yearlyData}
            title="Monthly Leads By Status"
            height={400}
            stacked={true}
            isThisBelongsToLead={true}
          />
        </div>}

        {/* Lead By Project Category */}
        {settings?.showLeadsByProjectCategory && (
            <div className="col-12 col-md-6">
              <CustomPieCharts
                data={chartData.categoryData}
                title="Lead By Project Category"
                width={250}
                height={250}
                chartType="pie"
                showFilter={true}
                filterOptions={chartData.categoryData
                  .map((item: any) => item.label)
                  .sort((a: string, b: string) => a.localeCompare(b))}
                filterValue={filters.category || ""}
                onFilterChange={(value: string) =>
                  handleFilterChange("category", value)
                }
                filterPlaceholder="All Categories"
                key="category-chart"
                onChartClick={handleCategoryChartClick}
              />
            </div>
          )}

        {/* Lead By Source */}
        {settings?.showLeadsBySource && (
          <div className="col-12 col-md-6">
            <CustomPieCharts
              data={chartData.sourceData}
              title="Lead By Source"
              width={250}
              height={250}
              chartType="donut"
              showFilter={true}
              filterOptions={chartData.sourceData.map(
                (item: any) => item.label
              )}
              filterValue={filters.source || ""}
              onFilterChange={(value: string) => {
                handleFilterChange("source", value);
              }}
              filterPlaceholder="All Source"
              key={`source-chart-${filters.source || "all"}`}
              onChartClick={handleSourceChartClick}
            />
          </div>
        )}

        {/* Lead By Direct Source */}
        {settings?.showLeadsFromDirect && (
          <div className="col-12 col-md-6">
            <CustomPieCharts
              data={chartData.directSourceData}
              title={
                filters.directSource &&
                filters.directSource !== "" &&
                filters.directSource !== "all"
                  ? `Leads From ${filters.directSource}`
                  : "Leads From Direct Sources"
              }
              height={250}
              chartType="donut"
              showFilter={true}
              filterOptions={directSourceFilterOptions}
              filterValue={filters.directSource || ""}
              onFilterChange={(value: string) => {
                handleFilterChange("directSource", value);
              }}
              filterPlaceholder="All Status"
              key={`direct-source-chart-${filters.directSource || "all"}`}
              filterMode="external"
              
            />
          </div>
        )}

        {/* Lead By Referral Source */}
        {settings?.showLeadsFromReferral && (
          <div className="col-12 col-md-6">
            <CustomPieCharts
              data={chartData.referralSourceData}
              title={"Lead By Referral Source"}
              width={250}
              height={250}
              chartType="donut"
              showFilter={true}
              filterOptions={referralStatusFilterOptions}
              filterValue={filters.referralStatus || ""}
              onFilterChange={(value: string) => {
                handleFilterChange("referralStatus", value);
              }}
              filterPlaceholder="All Status"
              externalFilterValue={filters.referralStatus || ""} // Pass the actual filter value as a separate prop
              key={`referral-source-chart-${filters.referralStatus || "all"}`}
              filterMode="external"
              onChartClick={handleReferralChartClick}

            />
          </div>
        )}

        {/* Lead By Company Type */}
        {settings?.showLeadsByCompanyType && <div className="col-12 col-md-6">
          <CustomPieCharts
            data={chartData.companyTypeData}
            title="Lead By Company Type"
            width={250}
            height={250}
            showFilter={true}
            filterOptions={companyTypeFilterOptions}
            filterValue={filters.companyType || ""}
            onFilterChange={(value: string) => {
              handleFilterChange("companyType", value);
            }}
            filterPlaceholder="All Status"
            key={`company-type-chart`}
            // isThisProjectToolTip={false}
            onChartClick={handleCompanyTypeChartClick}
          />
        </div>}

        

        {/* Lead By Subcategory - Enhanced with Category Filtering */}
        {settings?.showLeadsBySubCategory && (
            <div className="col-12">
              <CustomBarChart
                data={chartData.subcategoryData}
                title={
                  filters.subcategoryCategory &&
                  filters.subcategoryCategory !== "" &&
                  filters.subcategoryCategory !== "all"
                    ? `Projects By Subcategory - ${filters.subcategoryCategory}`
                    : "Projects By Subcategory"
                }
                height={400}
                showFilter={true}
                filterKey="subcategoryCategory" // Using separate filter key
                filterOptions={categoryFilterOptions.sort(
                  (a: string, b: string) => a.localeCompare(b)
                )}
                filterValue={filters.subcategoryCategory || ""}
                onFilterChange={(value: string) => {
                  handleFilterChange("subcategoryCategory", value);
                }}
                filterPlaceholder="All Categories"
                key={`subcategory-chart-${
                  filters.subcategoryCategory || "all"
                }`}
                onChartClick={handleSubCategoryChartClick}
              />
            </div>
          )}

        {/* Lead By Yearly refferal sources */}
        {settings?.showLeadsByYearlyReferralSource && <YearlyStatusCountChart
          data={chartData.yearlyReferralSourceData}
          title="Yearly Referral Sources"
          height={400}
          stacked={true}
          showBudget={true}
          isThisLead={true}
        />}

        {/* Lead By Yearly direct sources */}
        {settings?.showLeadsFromDirect  && <YearlyStatusCountChart
          data={chartData.yearlyDirectSourceData}
          title="Yearly Direct Sources"
          height={400}
          stacked={true}
          showBudget={true}
          isThisLead={true}
        />}

        {/* Top Leads - Fixed with Dynamic Filtering */}
        {settings?.showTopLeads && (
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Top 10 Leads</h5>
                <div className="d-flex gap-2 flex-column flex-md-row">
                  {/* Main Type Filter */}
                  <select
                    className="form-select form-select-sm"
                    value={filters.topLeadsType || "source"}
                    onChange={(e) =>
                      handleTopLeadsFilterChange("topLeadsType", e.target.value)
                    }
                    style={{ minWidth: "120px" }}
                  >
                    <option value="source">By Source</option>
                    <option value="category">By Category</option>
                    <option value="service">By Service</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    className="form-select form-select-sm"
                    value={filters.topLeadsStatus || ""}
                    onChange={(e) =>
                      handleTopLeadsFilterChange(
                        "topLeadsStatus",
                        e.target.value
                      )
                    }
                    style={{ minWidth: "120px" }}
                  >
                    <option value="">All Status</option>
                    {topLeadsFilterOptions.statusOptions.map(
                      (status: string) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      )
                    )}
                  </select>

                  {/* Conditional Referral Type Filter */}
                  {topLeadsFilterOptions.referralTypeOptions.length > 0 && (
                    <select
                      className="form-select form-select-sm"
                      value={filters.topLeadsReferralType || ""}
                      onChange={(e) =>
                        handleTopLeadsFilterChange(
                          "topLeadsReferralType",
                          e.target.value
                        )
                      }
                      style={{ minWidth: "150px" }}
                    >
                      <option value="">All Referral Types</option>
                      {topLeadsFilterOptions.referralTypeOptions.map(
                        (type: string) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        )
                      )}
                    </select>
                  )}

                  {/* Conditional Direct Source Filter */}
                  {topLeadsFilterOptions.directSourceOptions.length > 0 && (
                    <select
                      className="form-select form-select-sm"
                      value={filters.topLeadsDirectSource || ""}
                      onChange={(e) =>
                        handleTopLeadsFilterChange(
                          "topLeadsDirectSource",
                          e.target.value
                        )
                      }
                      style={{ minWidth: "150px" }}
                    >
                      <option value="">All Direct Sources</option>
                      {topLeadsFilterOptions.directSourceOptions.map(
                        (source: string) => (
                          <option key={source} value={source}>
                            {source}
                          </option>
                        )
                      )}
                    </select>
                  )}
                </div>
              </div>
            </div>
            <div className="card-body">
              <CustomBarChart
                data={chartData.topLeadsData}
                title=""
                height={400}
                showFilter={false}
                key={`top-leads-chart-${filters.topLeadsType}-${filters.topLeadsStatus}-${filters.topLeadsReferralType}-${filters.topLeadsDirectSource}`}
                isThisProjectToolTip={false}
                onChartClick={handleTopLeadsChartClick}
              />
            </div>
          </div>
        )}

        {/* Lead By Location */}
        {settings?.showLeadsByLocation && (
          <div className="col-12">
            <LeadByLocationChart data={locationRes?.data || []} />
          </div>
        )}
      </div>

      {/* Chart Dialog Modal */}
      <ChartDialogModal
        open={open}
        onClose={() => setOpen(false)}
        statusId={statusId || undefined}
        startDate={startDate || undefined}
        endDate={endDate || undefined}
      />
      <ChartDialogModal
        open={openService}
        onClose={() => setOpenService(false)}
        serviceId={serviceId || undefined}
        startDate={startDate || undefined}
        endDate={endDate || undefined}
      />
      <ChartDialogModal
        open={openCategory}
        onClose={() => setOpenCategory(false)}
        categoryId={categoryId || undefined}
        startDate={startDate || undefined}
        endDate={endDate || undefined}
      />
      <ChartDialogModal
        open={openReferral}
        onClose={() => setOpenReferral(false)}
        referralId={referralId || undefined}
        startDate={startDate || undefined}
        endDate={endDate || undefined}
      />
      <ChartDialogModal
        open={openSource}
        onClose={() => setOpenSource(false)}
        sourceId={sourceId || undefined}
        startDate={startDate || undefined}
        endDate={endDate || undefined}
      />
      <ChartDialogModal
        open={openSubCategory}
        onClose={() => setOpenSubCategory(false)}
        subCategoryId={subCategoryId || undefined}
        startDate={startDate || undefined}
        endDate={endDate || undefined}
      />
      <ChartDialogModal
        open={openCompanyType}
        onClose={() => setOpenCompanyType(false)}
        companyTypeId={companyTypeId || undefined}
        startDate={startDate || undefined}
        endDate={endDate || undefined}
      />
      <ChartDialogModal
        open={openTopLeads}
        onClose={() => setOpenTopLeads(false)}
        topLeadsId={topLeadsId || undefined}
        startDate={startDate || undefined}
        endDate={endDate || undefined}
      />
    </div>
  );
};

export default Yearly;