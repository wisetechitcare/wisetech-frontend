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
import MonthlyLeadsTrend from "./MonthlyLeadsTrend";
import {
  LeadOverviewDashboard,
  AnalyticsCard,
  AnalyticsHeader,
  RankedBarChart,
  ClientAnalysisSection,
} from "@pages/dashboard/leadAnalytics";

/**
 * All Time analytics — cumulative lifetime performance. Uses an absurdly wide
 * date range (2000–2099) to fetch all leads, then displays them in the same
 * proven dashboard structure as Monthly and Yearly.
 */

const AllTime = () => {
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
    topLeadsType: "source",
    topLeadsStatus: "",
    topLeadsReferralType: "",
    topLeadsDirectSource: "",
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

  // ServiceCategoryTabs renders Category and Sub-Category as separate tabs
  // (no combined sunburst anymore), so onCategorySelect only ever fires for a
  // genuine category bar — passthrough kept for the prop name callers expect.
  const handleCategoryNodeClick = (selectedLabel: string) => {
    handleCategoryChartClick(selectedLabel);
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

  // Fetch all-time data with a wide date range (2000–2099).
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const startDates = "2000-01-01";
        const endDates = "2099-12-31";

        const [
          statusRes,
          serviceRes,
          categoryRes,
          subcategoryApiRes,
          directSourceApiRes,
          referralSourceRes,
          sourceApiRes,
          companyTypeApiRes,
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
          getMonthlyTopLeads(startDates, endDates, filters.topLeadsType),
          getLeadsByLocationAnalytics(startDates, endDates),
          getLeadsByCancellationReasonAnalytics(startDates, endDates),
        ]);

        setDirectSourceRes(directSourceApiRes);
        setReferralSourceRes(referralSourceRes);
        setSourceRes(sourceApiRes);
        setCompanyTypeRes(companyTypeApiRes);
        setSubcategoryRes(subcategoryApiRes);
        setMonthlyTopLeadsRes(monthlyTopLeadsApiRes);
        setLocationRes(locationApiRes);
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
            (referralSourceRes?.data || []).flatMap(
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
          cancellationReasonData: convertToChartData(cancellationApiRes?.data || [], "value", "name", ""),
          topLeadsData: transformTopLeadsDataAdvanced(monthlyTopLeadsApiRes?.data || [], {
            groupBy: filters.topLeadsType,
            status: filters.topLeadsStatus,
            referralType: filters.topLeadsReferralType,
            directSource: filters.topLeadsDirectSource,
          }),
        });
      } catch (error) {
        console.error("Error fetching all-time chart data:", error);
        setError(error instanceof Error ? error.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters.topLeadsType]);

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

  useEffect(() => {
    if (monthlyTopLeadsRes?.data) {
      setChartData((prevData: any) => ({
        ...prevData,
        topLeadsData: transformTopLeadsDataAdvanced(monthlyTopLeadsRes.data, {
          groupBy: filters.topLeadsType,
          status: filters.topLeadsStatus,
          referralType: filters.topLeadsReferralType,
          directSource: filters.topLeadsDirectSource,
        }),
      }));
    }
  }, [
    filters.topLeadsStatus,
    filters.topLeadsReferralType,
    filters.topLeadsDirectSource,
    monthlyTopLeadsRes,
  ]);

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
  const topLeadsFilterOptions = {
    statusOptions:
      monthlyTopLeadsRes?.data?.map((status: any) => status.name) || [],
    referralTypeOptions: [],
    directSourceOptions: [],
  };

  return (
    <div className="">
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <AnalyticsHeader
            title="All Time Summary"
            subtitle="Lifetime cumulative performance across the entire history"
            icon="bi-clock-history"
            accent="#0EA5E9"
          />
        </section>

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
            summary: <MonthlyLeadsTrend startDate="2000-01-01" endDate="2099-12-31" />,
            sources: settings?.showLeadsByCompanyType ? (
              <ClientAnalysisSection startDate="2000-01-01" endDate="2099-12-31" />
            ) : null,
            geography: settings?.showLeadsByLocation ? (
              <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <AnalyticsHeader
                  title="Geographic Distribution"
                  subtitle="Where leads have come from historically"
                  icon="bi-geo-alt"
                  accent="#14B8A6"
                />
                <LeadByLocationAndStatus data={locationRes?.data || []} />
              </section>
            ) : null,
          }}
        />
      </div>

      <ChartDialogModal
        open={open}
        onClose={() => setOpen(false)}
        statusId={statusId || undefined}
      />
      <ChartDialogModal
        open={openService}
        onClose={() => setOpenService(false)}
        serviceId={serviceId || undefined}
      />
      <ChartDialogModal
        open={openCategory}
        onClose={() => setOpenCategory(false)}
        categoryId={categoryId || undefined}
      />
      <ChartDialogModal
        open={openReferral}
        onClose={() => setOpenReferral(false)}
        referralId={referralId || undefined}
      />
      <ChartDialogModal
        open={openSource}
        onClose={() => setOpenSource(false)}
        sourceId={sourceId || undefined}
      />
      <ChartDialogModal
        open={openSubCategory}
        onClose={() => setOpenSubCategory(false)}
        subCategoryId={subCategoryId || undefined}
      />
      <ChartDialogModal
        open={openCompanyType}
        onClose={() => setOpenCompanyType(false)}
        companyTypeId={companyTypeId || undefined}
      />
      <ChartDialogModal
        open={openTopLeads}
        onClose={() => setOpenTopLeads(false)}
        topLeadsId={topLeadsId || undefined}
      />
    </div>
  );
};

export default AllTime;

