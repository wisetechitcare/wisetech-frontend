import {
  getLeadsByStatusAnalytics,
  getLeadsByServiceAnalytics,
  getLeadsByProjectCategoryAnalytics,
  getLeadsBySubcategoryAnalytics,
  getLeadsByDirectSourceAnalytics,
  getLeadsByReferralSourceAnalytics,
  getLeadsBySourceAnalytics,
  getLeadsByLocationAnalytics,
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
  convertSubcategoryData,
} from "@utils/leadsProjectCompaniesStatistics";
import { ChartDialogModal } from "./ChartDialogModal";
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
    referralStatus: "",
  });

  const [directSourceRes, setDirectSourceRes] = useState<any>(null);
  const [referralSourceRes, setReferralSourceRes] = useState<any>(null);
  const [sourceRes, setSourceRes] = useState<any>(null);
  const [subcategoryRes, setSubcategoryRes] = useState<any>(null);
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

  const settings = useSelector((state: any) => state.chartSettings);

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

  const handleCategoryFilterChange = async (value: string) => {
    setFilters((prev: any) => ({ ...prev, category: value }));

    if (value === "All") {
      await fetchCategoryAnalytics("");
    } else {
      const selectedStatus = leadStatusesID.find(
        (status: any) => status.name === value
      );

      if (selectedStatus) {
        await fetchCategoryAnalytics(selectedStatus.id.toString());
      } else {
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

  const fetchCategoryAnalytics = useCallback(
    async (statusId?: string | null) => {
      try {
        setLoading(true);
        const data = await getLeadsByProjectCategoryAnalytics(
          startDate,
          endDates,
          statusId || "",
          true // receivedOnly=true for projects
        );

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
          locationRes,
        ] = await Promise.all([
          getLeadsByStatusAnalytics(startDate, endDates, true), // receivedOnly
          getLeadsByServiceAnalytics(startDate, endDates, true), // receivedOnly
          getLeadsByProjectCategoryAnalytics(
            startDate,
            endDates,
            filters.category === "All" ? "" : filters.category,
            true // receivedOnly
          ),
          getLeadsBySubcategoryAnalytics(startDate, endDates, true), // receivedOnly
          getLeadsByDirectSourceAnalytics(startDate, endDates, true), // receivedOnly
          getLeadsByReferralSourceAnalytics(startDate, endDates, true), // receivedOnly
          getLeadsBySourceAnalytics(startDate, endDates, true), // receivedOnly
          getLeadsByLocationAnalytics(startDate, endDates, true), // receivedOnly
        ]);

        setDirectSourceRes(directSourceApiRes);
        setReferralSourceRes(referralSourceRes);
        setSourceRes(sourceRes);
        setSubcategoryRes(subcategoryApiRes);
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
  }, [month, endDate]);

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

  const directSourceFilterOptions =
    directSourceRes?.data?.map((item: any) => item.name) || [];
  const referralStatusFilterOptions =
    referralSourceRes?.data?.map((item: any) => item.name) || [];

  const categoryFilterOptions =
    subcategoryRes?.data?.map((item: any) => item.name) || [];

  return (
    <div>
      <div className="col-12">
        <LeadOverviewDashboard
          statusData={chartData.statusData}
          serviceData={chartData.serviceData}
          categoryData={chartData.categoryData}
          subcategoryRaw={subcategoryRes?.data || []}
          sourceData={chartData.sourceData}
          referralSourceData={chartData.referralSourceData}
          directSourceData={chartData.directSourceData}
          settings={settings}
          showKpis={true}
          onStatusSelect={handleStatusChartClick}
          onServiceSelect={handleServiceChartClick}
          onCategorySelect={handleCategoryNodeClick}
          onSourceSelect={handleSourceChartClick}
          onReferralSelect={handleReferralChartClick}
        />
      </div>

      <ChartDialogModal
        open={open}
        onClose={() => setOpen(false)}
        statusId={statusId}
        startDate={startDate}
        endDate={endDates}
        receivedOnly={true}
      />
      <ChartDialogModal
        open={openService}
        onClose={() => setOpenService(false)}
        serviceId={serviceId}
        startDate={startDate}
        endDate={endDates}
        receivedOnly={true}
      />
      <ChartDialogModal
        open={openCategory}
        onClose={() => setOpenCategory(false)}
        categoryId={categoryId}
        startDate={startDate}
        endDate={endDates}
        receivedOnly={true}
      />
      <ChartDialogModal
        open={openReferral}
        onClose={() => setOpenReferral(false)}
        referralId={referralId}
        startDate={startDate}
        endDate={endDates}
        receivedOnly={true}
      />
      <ChartDialogModal
        open={openSource}
        onClose={() => setOpenSource(false)}
        sourceId={sourceId}
        startDate={startDate}
        endDate={endDates}
        receivedOnly={true}
      />
      <ChartDialogModal
        open={openSubCategory}
        onClose={() => setOpenSubCategory(false)}
        subCategoryId={subCategoryId}
        startDate={startDate}
        endDate={endDates}
        receivedOnly={true}
      />
    </div>
  );
};

export default Monthly;
