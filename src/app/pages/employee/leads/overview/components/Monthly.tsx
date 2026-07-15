import {
  getLeadsByStatusAnalytics,
  getLeadsByServiceAnalytics,
  getLeadsByProjectCategoryAnalytics,
  getLeadsBySubcategoryAnalytics,
  getLeadsByDirectSourceAnalytics,
  getLeadsByReferralSourceAnalytics,
  getLeadsBySourceAnalytics,
  getLeadsByCompanyTypeAnalytics,
  getMonthlyTopLeads,
  getLeadsByLocationAnalytics,
  getLeadsByCancellationReasonAnalytics,
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
  transformTopLeadsDataAdvanced,
} from "@utils/leadsProjectCompaniesStatistics";
import LeadByLocationAndStatus from "../commonComponents/LeadByLocationChart";
import { ChartDialogModal } from "./ChartDialogModal";
import MonthlyLeadsChart from "./charts/MonthlyLeadsChart";
import {
  LeadOverviewDashboard,
  AnalyticsCard,
  AnalyticsHeader,
  RankedBarChart,
} from "@pages/dashboard/leadAnalytics";

interface Props {
  month: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
}

const Monthly = ({ month, endDate }: Props) => {
  const [chartData, setChartData] = useState<any>({
    statusData: [],
    serviceData: [],
    categoryData: [],
    subcategoryData: [],
    directSourceData: [],
    referralSourceData: [],
    sourceData: [],
    companyTypeData: [],
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
    // Top Leads filters
    topLeadsType: "source", // source, category, service
    topLeadsStatus: "",
    topLeadsReferralType: "",
    topLeadsDirectSource: "",
    referralStatus: "",
  });

  const [directSourceRes, setDirectSourceRes] = useState<any>(null);
  const [referralSourceRes, setReferralSourceRes] = useState<any>(null);
  const [sourceRes, setSourceRes] = useState<any>(null);
  const [companyTypeRes, setCompanyTypeRes] = useState<any>(null);
  const [subcategoryRes, setSubcategoryRes] = useState<any>(null);
  const [monthlyTopLeadsRes, setMonthlyTopLeadsRes] = useState<any>(null);
  const [locationRes, setLocationRes] = useState<any>(null);
  const [leadStatusesID, setLeadStatusesID] = useState<any>([]);
  const [open, setOpen] = useState(false);
  const [statusId, setStatusId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [openService, setOpenService] = useState(false);
  const [serviceData, setServiceData] = useState<any>([]);
  const [categoryData, setCategoryData] = useState<any>([]);
  const [categoryId, setCategoryId] = useState("");
  const [openCategory, setOpenCategory] = useState(false);
  const [openReferral, setOpenReferral] = useState(false);
  const [referralId, setReferralId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [openSource, setOpenSource] = useState(false);
  const [subCategoryId, setSubCategoryId] = useState("");
  const [openSubCategory, setOpenSubCategory] = useState(false);
  const [companyTypeId, setCompanyTypeId] = useState("");
  const [openCompanyType, setOpenCompanyType] = useState(false);
  const [topLeadsId, setTopLeadsId] = useState<string[] | null>(null);
  const [openTopLeads, setOpenTopLeads] = useState(false);

  const settings = useSelector((state: any) => state.chartSettings);

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters((prevFilters: any) => ({
      ...prevFilters,
      [filterType]: value,
    }));
  };

  const handleTopLeadsFilterChange = (filterType: string, value: string) => {
    if (filterType === "topLeadsType") {
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
      referralSourceRes?.data?.flatMap((referral: any) => referral.leadsData) ??
      [];

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

  // Sunburst emits either a category or a sub-category name — route to the
  // matching drill-down modal.
  const handleCategoryNodeClick = (selectedLabel: string) => {
    let isSub = false;
    subcategoryRes?.data?.forEach((cat: any) =>
      (cat.subCategories || []).forEach((sc: any) => {
        if (sc.name === selectedLabel) isSub = true;
      })
    );
    if (isSub) handleSubCategoryChartClick(selectedLabel);
    else handleCategoryChartClick(selectedLabel);
  };

  const handleCompanyTypeChartClick = (selectedLabel: string) => {
    let selectedCompanyType: any = null;
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
    } else {
      setCompanyTypeId(selectedLabel);
    }
    setOpenCompanyType(true);
  };

  const handleTopLeadsChartClick = (selectedLabel?: string) => {
    const ids: string[] = [];

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

  const startDate = month.startOf("month").format("YYYY-MM-DD");
  const endDates = month.endOf("month").format("YYYY-MM-DD");

  const getFilteredTopLeadsData = () => {
    if (!monthlyTopLeadsRes?.data) return [];

    const {
      topLeadsType,
      topLeadsStatus,
      topLeadsReferralType,
      topLeadsDirectSource,
    } = filters;

    return transformTopLeadsDataAdvanced(monthlyTopLeadsRes.data, {
      groupBy: topLeadsType,
      status: topLeadsStatus,
      referralType: topLeadsReferralType,
      directSource: topLeadsDirectSource,
    });
  };

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

    const referralTypeOptions: string[] = [];
    const directSourceOptions: string[] = [];

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

  const fetchCategoryAnalytics = useCallback(
    async (statusId?: string | null) => {
      try {
        setLoading(true); // Add loading state for this specific chart

        const data = await getLeadsByProjectCategoryAnalytics(
          startDate,
          endDates,
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
    [startDate, endDates]
  );

  // Set initial filter and fetch data when leadStatusesID is available
  useEffect(() => {
    if (leadStatusesID.length > 0) {
      if (!filters.category) {
        setFilters((prev: any) => ({ ...prev, category: "All" }));
      }
    }
  }, [leadStatusesID]);

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
          monthlyTopLeadsRes,
          locationRes,
          cancellationRes,
        ] = await Promise.all([
          getLeadsByStatusAnalytics(startDate, endDates),
          getLeadsByServiceAnalytics(startDate, endDates),
          getLeadsByProjectCategoryAnalytics(
            startDate,
            endDates,
            filters.category === "All" ? "" : filters.category
          ),
          getLeadsBySubcategoryAnalytics(startDate, endDates),
          getLeadsByDirectSourceAnalytics(startDate, endDates),
          getLeadsByReferralSourceAnalytics(startDate, endDates),
          getLeadsBySourceAnalytics(startDate, endDates),
          getLeadsByCompanyTypeAnalytics(startDate, endDates),
          getMonthlyTopLeads(startDate, endDates, filters.topLeadsType),
          getLeadsByLocationAnalytics(startDate, endDates),
          getLeadsByCancellationReasonAnalytics(startDate, endDates),
        ]);

        setDirectSourceRes(directSourceApiRes);

        setReferralSourceRes(referralSourceRes);
        setSourceRes(sourceRes);
        setCompanyTypeRes(companyTypeRes);
        setSubcategoryRes(subcategoryApiRes);
        setMonthlyTopLeadsRes(monthlyTopLeadsRes);
        setLocationRes(locationRes?.data || []);
        setCategoryData(categoryRes?.data || []);

        setServiceData(serviceRes?.data || []);

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
            topLeadsData: getFilteredTopLeadsData(),
            cancellationReasonData: convertToChartData(
              cancellationRes?.data || [],
              "value",
              "name",
              ""
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
  }, [month, endDate, filters.topLeadsType]);

  // Update top leads data when filters change
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

  // Get Top Leads filter options
  const topLeadsFilterOptions = getTopLeadsFilterOptions();


  return (
    <div className="">
      <div className="row g-3">
        {/* ── Premium executive analytics (status, service, acquisition, category) ── */}
        <div className="col-12">
          <LeadOverviewDashboard
            statusData={chartData.statusData}
            serviceData={chartData.serviceData}
            categoryData={chartData.categoryData}
            subcategoryRaw={subcategoryRes?.data || []}
            sourceData={chartData.sourceData}
            referralSourceData={chartData.referralSourceData}
            directSourceData={chartData.directSourceData}
            cancellationReasonData={chartData.cancellationReasonData}
            settings={settings}
            showKpis={false}
            onStatusSelect={handleStatusChartClick}
            onServiceSelect={handleServiceChartClick}
            onCategorySelect={handleCategoryNodeClick}
            onSourceSelect={handleSourceChartClick}
            onReferralSelect={handleReferralChartClick}
          />
        </div>

        {/* ── Daily Inquiry Trend ────────────────────────────────────────────── */}
        <div className="col-12">
          <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <AnalyticsHeader
              title="Daily Inquiry Trend"
              subtitle="Cumulative inquiries, forecast, and target tracking"
              icon="bi-graph-up"
              accent="#3B82F6"
            />
            <MonthlyLeadsChart startDate={startDate} endDate={endDates} />
          </section>
        </div>

        {/* Lead By Company Type */}
        {settings?.showLeadsByCompanyType && (
          <div className="col-12">
            <AnalyticsHeader
              title="Segment Analysis"
              subtitle="Which client segments generate the most leads"
              icon="bi-buildings"
              accent="#EC4899"
            />
            <div className="mt-3">
              <AnalyticsCard
                title="Lead by Company Type"
                subtitle="Ranked by lead volume · revenue in tooltip"
                isEmpty={
                  !chartData.companyTypeData?.length ||
                  chartData.companyTypeData.every((d: any) => !d.value)
                }
                emptyHint="No company-type data for this period."
                headerRight={
                  <select
                    className="form-select form-select-sm"
                    style={{ minWidth: 150 }}
                    value={filters.companyType || ""}
                    onChange={(e) => handleFilterChange("companyType", e.target.value)}
                  >
                    <option value="">All Status</option>
                    {companyTypeFilterOptions.map((o: string) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                }
              >
                <RankedBarChart
                  data={chartData.companyTypeData}
                  onSelect={handleCompanyTypeChartClick}
                  showRevenue
                  height={320}
                />
              </AnalyticsCard>
            </div>
          </div>
        )}

        {/* Lead By Location */}
        {settings?.showLeadsByLocation && (
          <div className="col-12">
            <AnalyticsHeader
              title="Geographic Distribution"
              subtitle="Where your leads are located — drill down country → locality"
              icon="bi-geo-alt"
              accent="#14B8A6"
            />
            <div className="mt-3">
              <LeadByLocationAndStatus
                data={locationRes || []}
                startDate={month || undefined}
                endDate={endDate || undefined}
              />
            </div>
          </div>
        )}
      </div>
      {/* Chart Dialog Modal */}
      <ChartDialogModal
        open={open}
        onClose={() => setOpen(false)}
        statusId={statusId || undefined}
        startDate={month || undefined}
        endDate={endDate || undefined}
      />
      <ChartDialogModal
        open={openService}
        onClose={() => setOpenService(false)}
        serviceId={serviceId || undefined}
        startDate={month || undefined}
        endDate={endDate || undefined}
      />
      <ChartDialogModal
        open={openCategory}
        onClose={() => setOpenCategory(false)}
        categoryId={categoryId || undefined}
        startDate={month || undefined}
        endDate={endDate || undefined}
      />
      <ChartDialogModal
        open={openReferral}
        onClose={() => setOpenReferral(false)}
        referralId={referralId || undefined}
        startDate={month || undefined}
        endDate={endDate || undefined}
      />
      <ChartDialogModal
        open={openSource}
        onClose={() => setOpenSource(false)}
        sourceId={sourceId || undefined}
        startDate={month || undefined}
        endDate={endDate || undefined}
      />
      <ChartDialogModal
        open={openSubCategory}
        onClose={() => setOpenSubCategory(false)}
        subCategoryId={subCategoryId || undefined}
        startDate={month || undefined}
        endDate={endDate || undefined}
      />
      <ChartDialogModal
        open={openCompanyType}
        onClose={() => setOpenCompanyType(false)}
        companyTypeId={companyTypeId || undefined}
        startDate={month || undefined}
        endDate={endDate || undefined}
      />
      <ChartDialogModal
        open={openTopLeads}
        onClose={() => setOpenTopLeads(false)}
        topLeadsId={topLeadsId || undefined}
        startDate={month || undefined}
        endDate={endDate || undefined}
      />
    </div>
  );
};

export default Monthly;
