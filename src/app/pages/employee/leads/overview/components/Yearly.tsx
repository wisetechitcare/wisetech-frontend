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
  getLeadsByCancellationReasonAnalytics,
  getAllLeadStatus,
} from "@services/lead";
import dayjs from "dayjs";
import { ChartData } from "@models/clientProject";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import Loader from "@app/modules/common/utils/Loader";
import {
  convertToChartData,
  convertDirectSourceData,
  convertReferralSourceData,
  convertCompanyTypeData,
  convertSubcategoryData,
  transformYearlyDataReferralSources,
  transformYearlyDataDirectSources,
  transformTopLeadsDataAdvanced,
} from "@utils/leadsProjectCompaniesStatistics";
import YearlyStatusCountChart from "@pages/employee/projects/commonComponents/YearlyStatusCountChart";
import MonthlyLeadsTrend from "./MonthlyLeadsTrend";
import LeadByLocationAndStatus from "../commonComponents/LeadByLocationChart";
import { ChartDialogModal } from "./ChartDialogModal";
import YearlyPerformanceAnalytics from "./charts/YearlyPerformanceAnalytics";
import MonthlyBarWithTarget from "./charts/MonthlyBarWithTarget";
import {
  LeadOverviewDashboard,
  AnalyticsCard,
  AnalyticsHeader,
  RankedBarChart,
  ClientAnalysisSection,
  buildYearlySeries,
  ChartDatum,
} from "@pages/dashboard/leadAnalytics";

interface Props {
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
}

/** Aggregate the nested location analytics into ranked chart data by locality. */
const aggregateLocations = (rows: any[]): ChartDatum[] => {
  const map = new Map<string, ChartDatum>();
  (Array.isArray(rows) ? rows : []).forEach((r) => {
    const key = r.city || r.state || r.country || "Unknown";
    const cur = map.get(key) || { label: key, value: 0, totalCost: 0 };
    cur.value += Number(r.count) || 0;
    cur.totalCost = (cur.totalCost || 0) + (Number(r.budget) || 0);
    map.set(key, cur);
  });
  return Array.from(map.values()).filter((d) => d.value > 0);
};

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
    yearlyReferralSourceData: [],
    yearlyDirectSourceData: [],
    topLeadsData: [],
    locationData: [],
    cancellationReasonData: [],
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
    referralStatus: "",
    companyType: "",
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
  const [prevMonthlyLeadsRes, setPrevMonthlyLeadsRes] = useState<any>(null);
  const [locationRes, setLocationRes] = useState<any>(null);
  const [monthlyTopLeadsRes, setMonthlyTopLeadsRes] = useState<any>(null);
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

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters((prevFilters: any) => ({
      ...prevFilters,
      [filterType]: value,
    }));
  };

  const handleStatusChartClick = (selectedLabel: string) => {
    // leadStatusesID is the master status list (real ids) — it never has an "N/A"
    // row, since the N/A bucket (leads with no status at all) is synthesized by
    // the analytics endpoint, not a real LeadStatus. Special-case it explicitly
    // so a miss doesn't fall through to the raw display label.
    const selectedStatus = leadStatusesID.find(
      (status: any) => status.name === selectedLabel
    );
    if (selectedStatus) {
      setStatusId(selectedStatus.id.toString());
    } else {
      setStatusId(selectedLabel === "N/A" ? "__NA__" : selectedLabel);
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

  const handleSubCategoryChartClick = (selectedLabel: string) => {
    // Flat shape — { subcategoryId, subcategory, category, color, count, budget }[],
    // including an "N/A" bucket (subcategoryId "__NA__") for no-subcategory leads.
    const selectedSubCategory = subcategoryRes?.data?.find(
      (subcat: any) => subcat.subcategory === selectedLabel
    );

    if (selectedSubCategory) {
      setSubCategoryId(selectedSubCategory.subcategoryId);
    } else {
      setSubCategoryId("__NA__");
    }
    setOpenSubCategory(true);
  };

  // Sunburst emits either a category or a sub-category name — route accordingly.
  // ServiceCategoryTabs renders Category and Sub-Category as separate tabs
  // (no combined sunburst anymore), so onCategorySelect only ever fires for a
  // genuine category bar — passthrough kept for the prop name callers expect.
  const handleCategoryNodeClick = (selectedLabel: string) => {
    handleCategoryChartClick(selectedLabel);
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
      handleFilterChange("companyType", selectedCompanyType.name);
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

  const applyFilter = (data: ChartData[], filterKey: string) => {
    const filterValue = filters[filterKey];
    if (!filterValue || filterValue === "all") return data;
    return data.filter((item) => item.label === filterValue);
  };

  const startDates = startDate.startOf("month").format("YYYY-MM-DD");
  const endDates = endDate.endOf("month").format("YYYY-MM-DD");
  const prevStartDates = startDate
    .subtract(1, "year")
    .startOf("month")
    .format("YYYY-MM-DD");
  const prevEndDates = endDate
    .subtract(1, "year")
    .endOf("month")
    .format("YYYY-MM-DD");

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
      return { statusOptions: [], referralTypeOptions: [], directSourceOptions: [] };
    }

    const statusOptions = monthlyTopLeadsRes.data.map((status: any) => status.name);
    const referralTypeOptions: string[] = [];
    const directSourceOptions: string[] = [];

    monthlyTopLeadsRes.data.forEach((status: any) => {
      if (status.data) {
        if (status.data.referralType) {
          status.data.referralType.forEach((ref: any) => {
            if (!referralTypeOptions.includes(ref.name)) referralTypeOptions.push(ref.name);
          });
        }
        if (status.data.directSource) {
          status.data.directSource.forEach((direct: any) => {
            if (!directSourceOptions.includes(direct.name)) directSourceOptions.push(direct.name);
          });
        }
      }
    });

    return { statusOptions, referralTypeOptions, directSourceOptions };
  };

  useEffect(() => {
    const fetchLeadStatuses = async () => {
      try {
        const leadStatusesData = await getAllLeadStatus();
        const leadStatuses = leadStatusesData.leadStatuses.map((status: any) => ({
          name: status.name,
          id: status.id,
        }));
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

        const [
          statusRes,
          serviceRes,
          categoryRes,
          subcategoryApiRes,
          directSourceApiRes,
          referralSourceApiRes,
          sourceApiRes,
          companyTypeApiRes,
          monthlyLeadsApiRes,
          prevMonthlyLeadsApiRes,
          yearlyReferralSourceRes,
          yearlyDirectSourceRes,
          monthlyTopLeadsApiRes,
          locationApiRes,
          cancellationApiRes,
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
          getMonthlyLeadAnalytics(prevStartDates, prevEndDates),
          getMonthlyLeadsByReferralSources(startDates, endDates),
          getMonthlyLeadsByDirectSources(startDates, endDates),
          getMonthlyTopLeads(startDates, endDates, filters.topLeadsType),
          getLeadsByLocationAnalytics(startDates, endDates),
          getLeadsByCancellationReasonAnalytics(startDates, endDates),
        ]);

        setDirectSourceRes(directSourceApiRes);
        setReferralSourceRes(referralSourceApiRes);
        setSourceRes(sourceApiRes);
        setCompanyTypeRes(companyTypeApiRes);
        setSubcategoryRes(subcategoryApiRes);
        setMonthlyLeadsRes(monthlyLeadsApiRes);
        setPrevMonthlyLeadsRes(prevMonthlyLeadsApiRes);
        setLocationRes(locationApiRes);
        setMonthlyTopLeadsRes(monthlyTopLeadsApiRes);
        setCategoryData(categoryRes?.data || []);
        setServiceData(serviceRes?.data || []);

        setChartData({
          statusData: convertToChartData(statusRes?.data || [], "count", "status", "budget"),
          serviceData: convertToChartData(serviceRes?.data || [], "count", "service", "budget"),
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
            (referralSourceApiRes?.data || []).flatMap(
              (source: any) => source.leadsData || []
            ),
            "count",
            "name",
            "budget"
          ),
          sourceData: convertToChartData(sourceApiRes?.data || [], "count", "source", "budget"),
          companyTypeData: convertToChartData(
            (companyTypeApiRes?.data || []).flatMap(
              (source: any) => source.allLeadsByAllCompanyType || []
            ),
            "count",
            "name",
            "budget"
          ),
          yearlyReferralSourceData: transformYearlyDataReferralSources(
            yearlyReferralSourceRes?.data || []
          ),
          yearlyDirectSourceData: transformYearlyDataDirectSources(
            yearlyDirectSourceRes?.data || []
          ),
          topLeadsData: getFilteredTopLeadsData(),
          cancellationReasonData: convertToChartData(
            cancellationApiRes?.data || [],
            "value",
            "name",
            ""
          ),
        });
      } catch (error) {
        console.error("Error fetching chart data:", error);
        setError(error instanceof Error ? error.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, filters.topLeadsType]);

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

  // Keep distribution charts in sync with their dependent filters.
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

  useEffect(() => {
    if (referralSourceRes?.data) {
      setChartData((prevData: any) => ({
        ...prevData,
        referralSourceData: convertReferralSourceData(
          referralSourceRes.data,
          filters.referralStatus
        ),
      }));
    }
  }, [filters.referralStatus, referralSourceRes]);

  useEffect(() => {
    if (companyTypeRes?.data) {
      setChartData((prevData: any) => ({
        ...prevData,
        companyTypeData: convertCompanyTypeData(companyTypeRes?.data, filters.companyType),
      }));
    }
  }, [filters.companyType, companyTypeRes]);

  // ── Derived yearly analytics ─────────────────────────────────────────────
  const currentSeries = useMemo(
    () => buildYearlySeries(monthlyLeadsRes?.data || []),
    [monthlyLeadsRes]
  );
  const prevSeries = useMemo(
    () => buildYearlySeries(prevMonthlyLeadsRes?.data || []),
    [prevMonthlyLeadsRes]
  );
  const locationInsightData = useMemo(
    () => aggregateLocations(locationRes?.data || []),
    [locationRes]
  );

  const fiscalLabel = `FY ${startDate.format("YYYY")}–${endDate.format("YY")}`;

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

  const companyTypeFilterOptions =
    companyTypeRes?.data?.map((item: any) => item.name) || [];
  const topLeadsFilterOptions = getTopLeadsFilterOptions();

  // Period-specific sections injected into the dashboard tabs.
  const revenueSlot = (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <AnalyticsHeader
        title="Revenue Intelligence & Forecast"
        subtitle="Cumulative value vs target, smart forecast and monthly value performance"
        icon="bi-cash-coin"
        accent="#8B5CF6"
      />
      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <YearlyPerformanceAnalytics startDate={startDate} endDate={endDate} />
        </div>
        <div className="col-12 col-xl-6">
          <MonthlyBarWithTarget startDate={startDates} endDate={endDates} />
        </div>
      </div>
      <MonthlyLeadsTrend startDate={startDate} endDate={endDate} />
    </section>
  );

  const clientAnalysisSlot = settings?.showLeadsByCompanyType ? (
    <ClientAnalysisSection startDate={startDates} endDate={endDates} />
  ) : null;

  const geographySlot = settings?.showLeadsByLocation ? (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <AnalyticsHeader
        title="Geographic Distribution"
        subtitle="Where leads came from this year — drill down country → locality"
        icon="bi-geo-alt"
        accent="#14B8A6"
      />
      <LeadByLocationAndStatus
        data={locationRes?.data || []}
        startDate={startDate || undefined}
        endDate={endDate || undefined}
      />
    </section>
  ) : null;

  return (
    <div className="">
      {/* Sections grouped into focused tabs via the shared dashboard. */}
      <LeadOverviewDashboard
        statusData={chartData.statusData}
        serviceData={chartData.serviceData}
        categoryData={chartData.categoryData}
        subcategoryData={chartData.subcategoryData}
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
        onSubcategorySelect={handleSubCategoryChartClick}
        onSourceSelect={handleSourceChartClick}
        onReferralSelect={handleReferralChartClick}
        tabStorageKey="leadOverviewActiveTab"
        slots={{
          summary: revenueSlot,
          sources: clientAnalysisSlot,
          geography: geographySlot,
        }}
      />

      {/* Chart Dialog Modals */}
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
