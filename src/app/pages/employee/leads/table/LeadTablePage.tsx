import MaterialTable from "@app/modules/common/components/MaterialTable";
import ExportButton from "@app/modules/common/components/ExportButton";
import TimePeriodSelector, { TimePeriodMode } from "@app/modules/common/components/TimePeriodSelector";
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Autocomplete,
} from "@mui/material";
import { deleteLead, getAllLeads } from "@services/leads";
import { saveLeadPeriodPreference, getLeadPeriodPreference } from "@services/users";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllLeadStatus } from "@services/lead";
import Loader from "@app/modules/common/utils/Loader";
import {
  errorConfirmation,
  rejectConfirmation,
  successConfirmation,
} from "@utils/modal";
import LeadWizardModal from "@pages/employee/leads/lead/LeadWizardModal";
import dayjs, { Dayjs } from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import {
  getAllProjectCategories,
  getAllProjectServices,
} from "@services/projects";
import {
  fetchAllCountries,
  fetchAllStates,
  fetchAllCities,
} from "@services/options";
import { AppDispatch, RootState } from "@redux/store";
import { useDispatch, useSelector } from "react-redux";
import eventBus from "@utils/EventBus";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { mapLeadToFormInitialValues } from "@pages/employee/leads/lead/utils";
import { fetchAllEmployeesAsync } from "@redux/slices/allEmployees";
import { KTIcon } from "@metronic/helpers";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import LeadBulkImport from "@pages/employee/leads/lead/LeadBulkImport";
import { formatCompactCurrency } from "../../entity/entityUtils";
import PeriodNavigationButtons from "./PeriodNavigationButtons";

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

type DateMode = "daily" | "weekly" | "monthly" | "yearly" | "allyear" | "custom";

const LeadTablePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const today = dayjs();

  const [tableData, setTableData] = useState<any[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formValues, setFormValues] = useState<any>(null);
  const [rawLeadsDatas, setRawLeadsDatas] = useState<any[]>([]);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [projectServices, setProjectServices] = useState<any[]>([]);
  const [projectCategories, setProjectCategories] = useState<any[]>([]);

  const [alignment, setAlignment] = useState<DateMode>("monthly");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [assignedToFilter, setAssignedToFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [day, setDay] = useState<Dayjs>(today);
  const [weekStart, setWeekStart] = useState<Dayjs>(() => {
    const dow = today.day();
    return dow === 0 ? today.subtract(6, "day") : today.subtract(dow - 1, "day");
  });
  const [weekEnd, setWeekEnd] = useState<Dayjs>(() => {
    const dow = today.day();
    const ws = dow === 0 ? today.subtract(6, "day") : today.subtract(dow - 1, "day");
    return ws.add(6, "day");
  });
  const [monthStart, setMonthStart] = useState<Dayjs>(today.startOf("month"));
  const [monthEnd, setMonthEnd] = useState<Dayjs>(today.endOf("month"));
  const [yearStart, setYearStart] = useState<Dayjs | null>(null);
  const [yearEnd, setYearEnd] = useState<Dayjs | null>(null);
  const [fiscalYearDisplay, setFiscalYearDisplay] = useState("");
  const [customStartDate, setCustomStartDate] = useState<Dayjs | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Dayjs | undefined>(undefined);

  const allemployees = useSelector((state: RootState) => state.allEmployees?.list);
  const currentEmployeeId = useSelector(
    (state: RootState) => state.employee?.currentEmployee?.id,
  );

  const NA_OPTION = { employeeId: "__NA__", employeeName: "N/A", avatar: "" };

  const assignedEmployeesFromLeads = useMemo(() => {
    const assignedIds = new Set(tableData.map((l: any) => l.assignedTo).filter(Boolean));
    const matched = (allemployees || []).filter((e: any) => assignedIds.has(e.employeeId));
    return [...matched]
      .sort((a: any, b: any) => a.employeeName.localeCompare(b.employeeName))
      .map((e: any) => ({
        ...e,
        displayName: e.isActive === false ? `${e.employeeName} (Inactive)` : e.employeeName,
        isInactive: e.isActive === false,
      }));
  }, [tableData, allemployees]);

  const hasUnassignedLeads = useMemo(
    () => tableData.some((l: any) => !l.assignedTo),
    [tableData],
  );

  const assignedToOptions = useMemo(
    () => (hasUnassignedLeads ? [NA_OPTION, ...assignedEmployeesFromLeads] : assignedEmployeesFromLeads),
    [hasUnassignedLeads, assignedEmployeesFromLeads],
  );

  useEffect(() => {
    async function initFiscalYear() {
      try {
        const { startDate: sd, endDate: ed } = await generateFiscalYearFromGivenYear(today);
        const fs = dayjs(sd);
        const fe = dayjs(ed);
        setYearStart(fs);
        setYearEnd(fe);
        setFiscalYearDisplay(`${fs.format("YYYY")} - ${fe.format("YYYY")}`);
      } catch {
        const year = today.month() >= 3 ? today.year() : today.year() - 1;
        const fs = dayjs(`${year}-04-01`);
        const fe = dayjs(`${year + 1}-03-31`);
        setYearStart(fs);
        setYearEnd(fe);
        setFiscalYearDisplay(`${fs.format("YYYY")} - ${fe.format("YYYY")}`);
      }
    }
    initFiscalYear();
  }, []);

  const navigateDay = useCallback((dir: "prev" | "next") => {
    setDay((prev) => (dir === "prev" ? prev.subtract(1, "day") : prev.add(1, "day")));
  }, []);

  const navigateWeek = useCallback((dir: "prev" | "next") => {
    const offset = dir === "prev" ? -1 : 1;
    setWeekStart((prev) => {
      const ns = prev.add(offset, "week");
      setWeekEnd(ns.add(6, "day"));
      return ns;
    });
  }, []);

  const navigateMonth = useCallback((dir: "prev" | "next") => {
    const offset = dir === "prev" ? -1 : 1;
    setMonthStart((prev) => {
      const ns = prev.add(offset, "month");
      setMonthEnd(ns.endOf("month"));
      return ns;
    });
  }, []);

  const navigateYear = useCallback(
    async (dir: "prev" | "next") => {
      const base = (yearStart ?? today).add(dir === "prev" ? -1 : 1, "year");
      try {
        const { startDate: sd, endDate: ed } = await generateFiscalYearFromGivenYear(base);
        const fs = dayjs(sd);
        const fe = dayjs(ed);
        setYearStart(fs);
        setYearEnd(fe);
        setFiscalYearDisplay(`${fs.format("YYYY")} - ${fe.format("YYYY")}`);
      } catch {
        const year = base.month() >= 3 ? base.year() : base.year() - 1;
        const fs = dayjs(`${year}-04-01`);
        const fe = dayjs(`${year + 1}-03-31`);
        setYearStart(fs);
        setYearEnd(fe);
        setFiscalYearDisplay(`${fs.format("YYYY")} - ${fe.format("YYYY")}`);
      }
    },
    [yearStart, today],
  );

  const handleAlignmentChange = async (
    _: React.MouseEvent<HTMLElement> | React.ChangeEvent<{}> | null,
    newVal: string,
  ) => {
    if (!newVal) return;
    const mode = newVal as DateMode;
    setAlignment(mode);
    localStorage.setItem("leadPeriodPreference", mode);
    try {
      await saveLeadPeriodPreference(mode);
    } catch (err) {
      console.warn("Failed to save period preference to Redis:", err);
    }
  };

  useEffect(() => {
    const loadPreference = async () => {
      const localPref = localStorage.getItem("leadPeriodPreference") as DateMode | null;
      if (localPref) {
        setAlignment(localPref);
      }
      try {
        const res = await getLeadPeriodPreference();
        const redisPref = res?.data?.period as DateMode | null;
        if (redisPref && ["daily", "weekly", "monthly", "yearly", "allyear", "custom"].includes(redisPref)) {
          setAlignment(redisPref);
          localStorage.setItem("leadPeriodPreference", redisPref);
        }
      } catch (err) {
        console.warn("Failed to fetch period preference from Redis, using local storage/default:", err);
      }
    };
    loadPreference();
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const leadsResponse = await getAllLeads();
      const leadsData = leadsResponse?.data?.data?.leads || [];

      // Filter to show: non-project leads + received status leads (transitioning)
      const nonProjectLeads = leadsData.filter(
        (lead: any) => !lead?.status?.isProjectTrigger || lead?.status?.name?.toLowerCase() === 'received'
      );

      setRawLeadsDatas(nonProjectLeads);

      const [servicesRes, catRes, statusRes, countriesData] = await Promise.all([
        getAllProjectServices(),
        getAllProjectCategories(),
        getAllLeadStatus(),
        fetchAllCountries(),
      ]);
      setProjectServices(servicesRes?.services || []);
      setProjectCategories(catRes?.projectCategories || []);
      setLeadStatuses(statusRes?.leadStatuses || []);

      if (nonProjectLeads.length > 0) {
        const uniqueCountryIds = new Set<any>();
        const uniqueStateIds = new Map<any, Set<any>>();
        const uniqueCityIds = new Map<any, Set<any>>();

        nonProjectLeads.forEach((lead: any) => {
          if (lead?.additionalDetails?.country) {
            uniqueCountryIds.add(lead.additionalDetails.country);
            if (lead?.additionalDetails?.state) {
              if (!uniqueStateIds.has(lead.additionalDetails.country))
                uniqueStateIds.set(lead.additionalDetails.country, new Set());
              uniqueStateIds.get(lead.additionalDetails.country)!.add(lead.additionalDetails.state);
              if (lead?.additionalDetails?.city) {
                if (!uniqueCityIds.has(lead.additionalDetails.state))
                  uniqueCityIds.set(lead.additionalDetails.state, new Set());
                uniqueCityIds.get(lead.additionalDetails.state)!.add(lead.additionalDetails.city);
              }
            }
          }
        });

        const countriesMap = new Map<string, any>();
        const statesMap = new Map<string, any>();
        const citiesMap = new Map<string, any>();
        (countriesData || []).forEach((c: any) => countriesMap.set(c.id.toString(), c));

        const statesResults = await Promise.all(
          [...uniqueCountryIds].map((cid) => {
            const c = countriesMap.get(String(cid));
            return c?.iso2 ? fetchAllStates(c.iso2) : Promise.resolve([]);
          }),
        );
        let allStates: any[] = [];
        statesResults.forEach((r) => {
          if (Array.isArray(r)) allStates = [...allStates, ...r];
        });
        allStates.forEach((s) => statesMap.set(s.id.toString(), s));

        const stateToCountry = new Map<string, string>();
        for (const [cid, sids] of uniqueStateIds.entries())
          for (const sid of sids) stateToCountry.set(String(sid), String(cid));

        const citiesResults = await Promise.all(
          [...uniqueCityIds.keys()].map((sid) => {
            const s = statesMap.get(String(sid));
            const cid = stateToCountry.get(String(sid));
            const c = cid ? countriesMap.get(cid) : null;
            return s?.iso2 && c?.iso2 ? fetchAllCities(c.iso2, s.iso2) : Promise.resolve([]);
          }),
        );
        let allCities: any[] = [];
        citiesResults.forEach((r) => {
          if (Array.isArray(r)) allCities = [...allCities, ...r];
        });
        allCities.forEach((c) => citiesMap.set(c.id.toString(), c));

        const transformedLeads = nonProjectLeads.map((lead: any) => {
          const countryId = lead?.additionalDetails?.country || "";
          const stateId = lead?.additionalDetails?.state || "";
          const cityId = lead?.additionalDetails?.city || "";
          const commercialsTotal =
            Array.isArray(lead.commercials) && lead.commercials.length > 0
              ? lead.commercials.reduce(
                  (acc: number, c: any) => acc + (parseFloat(c.cost) || 0),
                  0,
                )
              : 0;

          // Handle inquiryDate - check multiple field names, ensure ISO string
          let inquiryDate: string;
          try {
            if (lead.inquiryDate) {
              inquiryDate = new Date(lead.inquiryDate).toISOString();
            } else if (lead.inquiry_date) {
              inquiryDate = new Date(lead.inquiry_date).toISOString();
            } else if (lead.createdAt) {
              inquiryDate = new Date(lead.createdAt).toISOString();
            } else {
              inquiryDate = new Date().toISOString();
            }
          } catch {
            inquiryDate = new Date().toISOString();
          }

          return {
            id: lead.id,
            prefix: lead?.prefix || "N/A",
            projectName: lead.title || "N/A",
            totalCost: commercialsTotal || lead.budget || 0,
            client:
              lead?.company?.companyName ||
              lead?.leadTeams?.[0]?.company?.companyName ||
              "N/A",
            service: lead?.projectServiceId || lead?.services?.[0]?.serviceId || "N/A",
            category: lead?.projectCategoryId || lead?.leadCategories?.[0]?.category?.id || "N/A",
            status: lead?.status || null,
            poStatus: lead?.poStatus || null,
            assignedTo: lead?.assignedToId || "N/A",
            inquiryDate: inquiryDate,
            nextFollowUpDate: lead?.nextFollowUpDate || null,
            revisionCount: Number(lead?.revisionCount) || 0,
            createdAt: lead?.createdAt ? new Date(lead.createdAt).toISOString() : new Date().toISOString(),
            createdBy: lead?.createdById || "N/A",
            updatedBy: lead?.updatedById || "N/A",
            updatedAt: lead?.updatedAt ? new Date(lead.updatedAt).toISOString() : new Date().toISOString(),
            country: countriesMap.get(String(countryId))?.name || (countryId || "N/A"),
            countryId,
            city: citiesMap.get(String(cityId))?.name || (cityId || "N/A"),
            cityId,
            state: statesMap.get(String(stateId))?.name || (stateId || "N/A"),
            stateId,
            area:
              (Array.isArray(lead.commercials) && lead.commercials.length > 0
                ? lead.commercials[0]?.area
                : null) ||
              lead?.additionalDetails?.projectArea ||
              lead?.addresses?.[0]?.projectArea ||
              "N/A",
            cost: commercialsTotal,
            companyId: lead.companyId || "N/A",
            branchId: lead.branchId || "N/A",
            description: lead.description || "N/A",
            priority: lead.priority || "N/A",
            budget: commercialsTotal || lead.budget || 0,
            rate: lead.rate || "N/A",
            leadSource: lead.source?.name || lead.sourceId || lead?.leadSource || "N/A",
            referrals: lead.referrals || [],
            companyType: lead.company?.companyTypeId || "N/A",
            receivedDate: lead?.receivedDate || "N/A",
            contact: lead?.contact?.fullName || lead?.leadTeams?.[0]?.contact?.fullName || "N/A",
          };
        });

        setTableData(transformedLeads);
      } else {
        setTableData([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    dispatch(fetchAllEmployeesAsync());
  }, []);

  useEventBus(EVENT_KEYS.leadCreated, fetchAllData);
  useEventBus(EVENT_KEYS.leadUpdated, fetchAllData);
  useEventBus(EVENT_KEYS.leadDeleted, fetchAllData);

  const columns = useMemo(() => {
    const base: any[] = [
      {
        accessorKey: "inquiryDate",
        header: "Inquiry Date",
        size: 150,
        enableSorting: true,
        Cell: ({ cell }: { cell: any }) => {
          try {
            const v = cell.getValue();
            if (!v) return "N/A";
            const date = dayjs(v);
            return date.isValid() ? date.format("DD-MM-YYYY") : "N/A";
          } catch (err) {
            return "N/A";
          }
        },
      },
      {
        accessorKey: "nextFollowUpDate",
        header: "Next Follow-up",
        size: 160,
        enableSorting: true,
        Cell: ({ cell }: { cell: any }) => {
          const v = cell.getValue();
          if (!v) return <span className="text-muted">—</span>;
          const date = dayjs(v);
          if (!date.isValid()) return <span className="text-muted">—</span>;
          // Overdue = follow-up date is before the start of today.
          const isOverdue = date.isBefore(dayjs().startOf("day"));
          const isToday = date.isSame(dayjs(), "day");
          return (
            <span
              className={`badge px-2 py-1 fs-8 fw-bold ${
                isOverdue
                  ? "bg-light-danger text-danger"
                  : isToday
                    ? "bg-light-warning text-warning"
                    : "bg-light-success text-success"
              }`}
              title={
                isOverdue
                  ? "Follow-up overdue"
                  : isToday
                    ? "Follow-up due today"
                    : "Upcoming follow-up"
              }
            >
              {date.format("DD-MM-YYYY")}
              {isOverdue ? " • Overdue" : isToday ? " • Today" : ""}
            </span>
          );
        },
      },
      {
        accessorKey: "prefix",
        header: "Lead ID",
        size: 220,
        minSize: 220,
        enableEditing: false,
        Cell: ({ row }: { row: any }) => (
          <span className="cursor-pointer" style={{ fontWeight: "600", fontSize: "14.5px", whiteSpace: "nowrap" }}>
            {row?.original?.prefix || "N/A"}
          </span>
        ),
      },
      {
        accessorKey: "projectName",
        header: "Lead Name",
        size: 360,
        minSize: 360,
        Cell: ({ cell }: { cell: any }) => {
          const v = cell.getValue();
          return (
            <span style={{ whiteSpace: "nowrap" }}>
              {typeof v === "object" ? JSON.stringify(v) : v || "N/A"}
            </span>
          );
        },
      },
      {
        accessorKey: "client",
        header: "Client",
        size: 150,
        Cell: ({ cell }: { cell: any }) => {
          const v = cell.getValue();
          return typeof v === "object" ? v.name || "N/A" : v || "N/A";
        },
      },
      {
        accessorKey: "contact",
        header: "Contact",
        size: 150,
        Cell: ({ cell }: { cell: any }) => {
          const v = cell.getValue();
          return typeof v === "object" ? v.name || v.email || "N/A" : v || "N/A";
        },
      },
      {
        accessorKey: "service",
        header: "Service",
        size: 150,
        Cell: ({ cell }: { cell: any }) =>
          projectServices?.find((s: any) => s.id === cell.getValue())?.name || "N/A",
      },
      {
        accessorKey: "category",
        header: "Category",
        size: 150,
        Cell: ({ cell }: { cell: any }) =>
          projectCategories?.find((c: any) => c.id === cell.getValue())?.name || "N/A",
      },
      {
        accessorKey: "status",
        header: "Lead Status",
        size: 130,
        Cell: ({ row }: any) => {
          const st = row?.original?.status;
          return st?.name ? (
            <div className="badge badge-light" style={{ backgroundColor: st.color, color: "white" }}>
              {st.name}
            </div>
          ) : (
            "N/A"
          );
        },
      },
      {
        id: "lastRevision",
        header: "Last Revision",
        size: 130,
        enableSorting: false,
        Cell: ({ row }: { row: any }) => {
          // Read the denormalized revisionCount carried on the row (kept in lockstep
          // by the audit capture worker). Avoids a per-row fetch to the legacy
          // /api/revisions endpoint (removed) and the N+1 it caused.
          const revisionCount = Number(row.original?.revisionCount) || 0;

          if (revisionCount === 0) {
            return <span style={{ color: "#ccc" }}>—</span>;
          }

          return (
            <div className="badge badge-info" style={{ backgroundColor: "#3b82f6", color: "white" }}>
              R{revisionCount}
            </div>
          );
        },
      },
      {
        accessorKey: "assignedTo",
        header: "Assigned To",
        size: 150,
        Cell: ({ cell }: { cell: any }) =>
          allemployees?.find((e: any) => e.employeeId === cell.getValue())?.employeeName || "N/A",
      },
      {
        accessorKey: "leadSource",
        header: "Source",
        size: 140,
        Cell: ({ cell }: { cell: any }) => cell.getValue() || "N/A",
      },
      {
        accessorKey: "totalCost",
        header: "Value",
        size: 120,
        Cell: ({ cell }: { cell: any }) => {
          const v = cell.getValue();
          return v !== undefined ? `₹${Number(v).toLocaleString()}` : "₹0";
        },
      },
      {
        accessorKey: "priority",
        header: "Priority",
        size: 100,
        Cell: ({ cell }: { cell: any }) => cell.getValue() || "N/A",
      },
      {
        accessorKey: "createdAt",
        header: "Created Date",
        size: 150,
        Cell: ({ cell }: { cell: any }) =>
          cell.getValue() ? dayjs(cell.getValue()).format("DD-MM-YYYY") : "N/A",
      },
      {
        accessorKey: "updatedAt",
        header: "Updated Date",
        size: 150,
        Cell: ({ cell }: { cell: any }) =>
          cell.getValue() ? dayjs(cell.getValue()).format("DD-MM-YYYY") : "N/A",
      },
      {
        accessorKey: "country",
        header: "Country",
        size: 120,
        Cell: ({ cell }: { cell: any }) => cell.getValue() || "N/A",
      },
      {
        accessorKey: "state",
        header: "State",
        size: 120,
        Cell: ({ row }: { row: any }) => row.original.state || "N/A",
      },
      {
        accessorKey: "city",
        header: "City",
        size: 120,
        Cell: ({ row }: { row: any }) => row.original.city || "N/A",
      },
      {
        accessorKey: "area",
        header: "Area",
        size: 120,
        Cell: ({ cell }: { cell: any }) => cell.getValue() || "N/A",
      },
      {
        accessorKey: "actions",
        header: "Actions",
        size: 120,
        enableEditing: false,
        Cell: ({ row }: { row: any }) => (
          <Box sx={{ display: "flex", gap: "8px" }}>
            <button
              className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                const currLead = rawLeadsDatas.find((l: any) => l.id === row.original.id);
                setFormValues(mapLeadToFormInitialValues(currLead));
              }}
            >
              <KTIcon iconName="pencil" className="fs-2" />
            </button>
            <button
              className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteLead(row.original.id);
              }}
            >
              <KTIcon iconName="trash" className="fs-2" />
            </button>
          </Box>
        ),
      },
    ];

    return base;
  }, [projectServices, projectCategories, allemployees, rawLeadsDatas]);

  const handleDeleteLead = async (id: string) => {
    try {
      const confirmed = await rejectConfirmation("Yes, delete it!");
      if (confirmed) {
        setTableData((prev) => prev.filter((l: any) => l.id !== id));
        setRawLeadsDatas((prev) => prev.filter((l: any) => l.id !== id));
        await deleteLead(id);
        successConfirmation("Lead deleted successfully!");
        eventBus.emit(EVENT_KEYS.leadDeleted, { id });
      }
    } catch (error) {
      console.error("Error deleting lead:", error);
      errorConfirmation("Failed to delete lead. Please try again.");
      fetchAllData();
    }
  };

  const exportColumns = useMemo(
    () => [
      { key: 'inquiryDate', header: 'Inquiry Date', type: 'text' as const },
      { key: 'prefix', header: 'Lead ID', type: 'text' as const },
      { key: 'projectName', header: 'Lead Name', type: 'text' as const },
      { key: 'totalCost', header: 'Value', type: 'currency' as const, showTotal: true },
      { key: 'client', header: 'Client', type: 'text' as const },
      { key: 'contact', header: 'Contact', type: 'text' as const },
      { key: 'service', header: 'Service', type: 'text' as const },
      { key: 'category', header: 'Category', type: 'text' as const },
      {
        key: 'status', header: 'Lead Status', type: 'text' as const,
        format: (val: any) => val?.name || String(val || ''),
      },
      { key: 'assignedTo', header: 'Assigned To', type: 'text' as const },
      { key: 'leadSource', header: 'Source', type: 'text' as const },
      { key: 'priority', header: 'Priority', type: 'text' as const },
      { key: 'country', header: 'Country', type: 'text' as const },
      { key: 'state', header: 'State', type: 'text' as const },
      { key: 'city', header: 'City', type: 'text' as const },
      { key: 'area', header: 'Area', type: 'text' as const },
      { key: 'createdAt', header: 'Created Date', type: 'text' as const },
    ],
    [],
  );

  if (loading) return <Loader />;

  const quickFilteredData = tableData?.filter((item: any) => {
    let dateMatch = true;
    const d = item.inquiryDate ? dayjs(item.inquiryDate) : null;
    if (alignment === "daily") {
      dateMatch = d ? d.isSame(day, "day") : false;
    } else if (alignment === "weekly") {
      dateMatch = d ? !d.isBefore(weekStart.startOf("day")) && !d.isAfter(weekEnd.endOf("day")) : false;
    } else if (alignment === "monthly") {
      dateMatch = d ? !d.isBefore(monthStart.startOf("day")) && !d.isAfter(monthEnd.endOf("day")) : false;
    } else if (alignment === "yearly" && yearStart && yearEnd) {
      dateMatch = d ? !d.isBefore(yearStart.startOf("day")) && !d.isAfter(yearEnd.endOf("day")) : false;
    } else if (alignment === "allyear") {
      dateMatch = true;
    } else if (alignment === "custom") {
      if (customStartDate || customEndDate) {
        if (!d) dateMatch = false;
        else {
          if (customStartDate && d.isBefore(customStartDate.startOf("day"))) dateMatch = false;
          if (customEndDate && d.isAfter(customEndDate.endOf("day"))) dateMatch = false;
        }
      }
    }

    const statusMatch = statusFilter
      ? item.status?.name?.toLowerCase() === statusFilter.toLowerCase()
      : true;
    const assignedMatch = assignedToFilter
      ? assignedToFilter === "__NA__"
        ? !item.assignedTo
        : item.assignedTo === assignedToFilter
      : true;

    let searchMatch = true;
    if (searchText) {
      const q = searchText.toLowerCase();
      const employeeName = allemployees?.find((e: any) => e.employeeId === item.assignedTo)?.employeeName || "";
      const serviceName = projectServices?.find((s: any) => s.id === item.service)?.name || "";
      const categoryName = projectCategories?.find((c: any) => c.id === item.category)?.name || "";

      searchMatch =
        String(item.projectName || "").toLowerCase().includes(q) ||
        String(item.prefix || "").toLowerCase().includes(q) ||
        String(item.client || "").toLowerCase().includes(q) ||
        String(item.contact || "").toLowerCase().includes(q) ||
        String(item.status?.name || "").toLowerCase().includes(q) ||
        String(employeeName).toLowerCase().includes(q) ||
        String(serviceName).toLowerCase().includes(q) ||
        String(categoryName).toLowerCase().includes(q) ||
        String(item.city || "").toLowerCase().includes(q) ||
        String(item.state || "").toLowerCase().includes(q) ||
        String(item.country || "").toLowerCase().includes(q) ||
        String(item.area || "").toLowerCase().includes(q);
    }

    const overdueMatch = overdueOnly
      ? item.nextFollowUpDate
        ? dayjs(item.nextFollowUpDate).isValid() &&
          dayjs(item.nextFollowUpDate).isBefore(dayjs().startOf("day"))
        : false
      : true;

    return dateMatch && statusMatch && assignedMatch && searchMatch && overdueMatch;
  });

  const overdueCount = (tableData ?? []).filter(
    (item: any) =>
      item.nextFollowUpDate &&
      dayjs(item.nextFollowUpDate).isValid() &&
      dayjs(item.nextFollowUpDate).isBefore(dayjs().startOf("day")),
  ).length;

  const hasAnyFilter = statusFilter || assignedToFilter || searchText || overdueOnly;
  const clearAllFilters = () => {
    setStatusFilter("");
    setAssignedToFilter("");
    setSearchText("");
    setOverdueOnly(false);
  };

  const totalFilteredCost = (quickFilteredData ?? []).reduce(
    (acc: number, item: any) => acc + (parseFloat(item.totalCost) || 0),
    0,
  );

  const FILTER_HEIGHT = "32px";

  const pillSelectSx = (hasValue: boolean) => ({
    borderRadius: "6px",
    fontSize: "12px",
    fontFamily: "Inter",
    fontWeight: 500,
    height: FILTER_HEIGHT,
    color: hasValue ? "#AA393D" : "#1E293B",
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: hasValue ? "#AA393D !important" : "#E2E8F0 !important",
      borderWidth: "1px !important",
      borderRadius: "6px !important",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#AA393D !important" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#AA393D !important" },
    "& .MuiSelect-icon": { color: hasValue ? "#AA393D" : "#94A3B8" },
  });

  const menuSx = {
    PaperProps: {
      sx: {
        borderRadius: "6px",
        mt: 0.5,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        maxHeight: 320,
        "& .MuiMenuItem-root": {
          fontSize: "12px",
          fontFamily: "Inter",
          "&:hover": { backgroundColor: "rgba(170,57,61,0.06)" },
          "&.Mui-selected": {
            backgroundColor: "rgba(170,57,61,0.1)",
            color: "#AA393D",
            fontWeight: 600,
          },
        },
      },
    },
  };

  return (
    <>
      <Box sx={{ p: { xs: 2, md: 3 }, background: '#fff', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <h1 style={{ fontFamily: "Barlow", fontSize: "20px", fontWeight: 700, margin: 0, color: '#1E293B', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
              Leads
            </h1>
            <p style={{ color: '#64748B', margin: 0, fontSize: '12px', fontWeight: 500 }}>
              Inquiry pipeline — prospects, discussions, quotations
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: isMobile ? '100%' : 'auto',
            marginLeft: isMobile ? '0' : 'auto',
          }}>
            <button
              className="btn btn-sm fw-bold d-inline-flex align-items-center justify-content-center gap-1.5"
              onClick={() => setShowBulkImport(true)}
              style={{
                backgroundColor: "#fff",
                color: "#AA393D",
                border: "1px solid #E2E8F0",
                boxShadow: "0 1px 2px rgba(16, 24, 40, 0.05)",
                borderRadius: "6px",
                padding: "0 12px",
                fontSize: "12px",
                height: "32px",
                display: 'flex',
                alignItems: 'center',
                flex: isMobile ? 1 : 'none',
                justifyContent: 'center'
              }}
            >
              <KTIcon iconName="cloud-download" className="fs-6 me-1" />
              Bulk Import
            </button>
            <button
              className="btn btn-sm fw-bold d-inline-flex align-items-center justify-content-center gap-1.5"
              onClick={() => setFormValues({ leadTemplateId: "blank" })}
              style={{
                backgroundColor: "#AA393D",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "0 12px",
                fontSize: "12px",
                height: "32px",
                display: 'flex',
                alignItems: 'center',
                boxShadow: "0 1px 2px rgba(16, 24, 40, 0.05)",
                flex: isMobile ? 1 : 'none',
                justifyContent: 'center'
              }}
            >
              + New Lead
            </button>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          marginTop: '4px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            width: isMobile ? '100%' : 'auto'
          }}>
            {/* Period Selector */}
            <div style={{
              marginRight: "4px"
            }}>
              <TimePeriodSelector
                value={alignment as TimePeriodMode}
                onChange={(mode) => handleAlignmentChange({} as any, mode)}
                isMobile={isMobile}
                variant="boxed"
              />
            </div>

            {/* Date Navigation */}
            {alignment === "daily" && (
              <PeriodNavigationButtons
                onPrev={() => navigateDay("prev")}
                onNext={() => navigateDay("next")}
                displayText={day.format("DD MMM, YYYY")}
                isMobile={isMobile}
              />
            )}
            {alignment === "weekly" && (
              <PeriodNavigationButtons
                onPrev={() => navigateWeek("prev")}
                onNext={() => navigateWeek("next")}
                displayText={`${weekStart.format("DD MMM")} - ${weekEnd.format("DD MMM")}`}
                isMobile={isMobile}
              />
            )}
            {alignment === "monthly" && (
              <PeriodNavigationButtons
                onPrev={() => navigateMonth("prev")}
                onNext={() => navigateMonth("next")}
                displayText={`${monthStart.format("MMMM YYYY")}`}
                isMobile={isMobile}
              />
            )}
            {alignment === "yearly" && yearStart && yearEnd && (
              <PeriodNavigationButtons
                onPrev={() => navigateYear("prev")}
                onNext={() => navigateYear("next")}
                displayText={fiscalYearDisplay}
                isMobile={isMobile}
              />
            )}
            {alignment === "custom" && (
              <div className="d-flex align-items-center gap-2">
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Start"
                    value={customStartDate ?? null}
                    onChange={(v) => setCustomStartDate(v ?? undefined)}
                    maxDate={customEndDate}
                    format="DD MMM, YYYY"
                    slotProps={{
                      textField: {
                        size: "small",
                        sx: {
                          "& .MuiOutlinedInput-root": { borderRadius: "6px", height: "32px", fontSize: "11px", width: "110px" },
                          "& .MuiInputLabel-root": { fontSize: "11px", top: "-3px" }
                        }
                      }
                    }}
                  />
                  <DatePicker
                    label="End"
                    value={customEndDate ?? null}
                    onChange={(v) => setCustomEndDate(v ?? undefined)}
                    minDate={customStartDate}
                    format="DD MMM, YYYY"
                    slotProps={{
                      textField: {
                        size: "small",
                        sx: {
                          "& .MuiOutlinedInput-root": { borderRadius: "6px", height: "32px", fontSize: "11px", width: "110px" },
                          "& .MuiInputLabel-root": { fontSize: "11px", top: "-3px" }
                        }
                      }
                    }}
                  />
                </LocalizationProvider>
              </div>
            )}

            {/* Search */}
            <TextField
              size="small"
              placeholder="Search…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              sx={{
                minWidth: isMobile ? "100%" : 180,
                "& .MuiOutlinedInput-root": {
                  borderRadius: "6px",
                  height: FILTER_HEIGHT,
                  fontFamily: "Inter",
                  fontSize: "12px",
                  "& fieldset": { borderColor: searchText ? "#AA393D" : "#E2E8F0" },
                  "&:hover fieldset": { borderColor: "#AA393D" },
                  "&.Mui-focused fieldset": { borderColor: "#AA393D" },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <KTIcon iconName="magnifier" className="fs-6" />
                  </InputAdornment>
                ),
              }}
            />

            {/* Lead Status Filter */}
            <FormControl size="small" sx={{ minWidth: isMobile ? "100%" : 140 }}>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                displayEmpty
                sx={pillSelectSx(!!statusFilter)}
                renderValue={(val) => {
                  if (!val) {
                    return (
                      <span style={{ color: "#94A3B8", fontFamily: "Inter", fontSize: "12px", fontWeight: 500 }}>
                        Lead Status
                      </span>
                    );
                  }
                  const st = leadStatuses.find((s: any) => s.name === val);
                  return (
                    <span style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", overflow: "hidden" }}>
                      {st?.color && (
                        <span style={{ width: 8, height: 8, minWidth: 8, borderRadius: "50%", backgroundColor: st.color, display: "inline-block" }} />
                      )}
                      <span style={{ fontFamily: "Inter", fontSize: "12px", fontWeight: 500, color: "#AA393D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {val}
                      </span>
                    </span>
                  );
                }}
                MenuProps={menuSx}
              >
                <MenuItem value="" sx={{ color: "#94A3B8", fontSize: "12px" }}>
                  All Statuses
                </MenuItem>
                {leadStatuses.filter((st: any) => !st.isProjectTrigger || st.name?.toLowerCase() === 'received').map((st: any) => (
                  <MenuItem key={st.id} value={st.name} sx={{ fontSize: "12px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: st.color, display: "inline-block", flexShrink: 0 }} />
                      {st.name}
                      {st.isProjectTrigger && st.name?.toLowerCase() === 'received' && (
                        <span style={{ marginLeft: "auto", fontSize: "9px", fontWeight: 700, color: "#0A5C2A", background: "#EDFDF3", borderRadius: "999px", padding: "1px 6px" }}>
                          TRANSITIONING
                        </span>
                      )}
                    </span>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Assigned To */}
            <Autocomplete
              size="small"
              options={assignedToOptions}
              getOptionLabel={(emp: any) => emp.displayName || emp.employeeName}
              value={assignedToOptions.find((e: any) => e.employeeId === assignedToFilter) ?? null}
              onChange={(_: any, emp: any) => setAssignedToFilter(emp?.employeeId ?? "")}
              isOptionEqualToValue={(opt: any, val: any) => opt.employeeId === val.employeeId}
              filterOptions={(options, { inputValue }) => {
                const q = inputValue.toLowerCase();
                if (!q) return options;
                return options.filter((o: any) => (o.displayName || o.employeeName || "").toLowerCase().includes(q));
              }}
              sx={{ minWidth: isMobile ? "100%" : 180 }}
              clearOnEscape
              renderOption={(props, emp: any) => (
                <li {...props} key={emp.employeeId}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                    <img
                      src={emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.employeeName)}&size=32&background=random`}
                      alt=""
                      style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.employeeName)}`; }}
                    />
                    <span style={{ fontFamily: "Inter", fontSize: "12px" }}>
                      {emp.isInactive ? `${emp.employeeName} (Inactive)` : emp.employeeName}
                    </span>
                  </span>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Assigned To"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "6px",
                      height: FILTER_HEIGHT,
                      fontFamily: "Inter",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: assignedToFilter ? "#AA393D" : "#1E293B",
                      paddingRight: "8px !important",
                      "& fieldset": {
                        borderColor: assignedToFilter ? "#AA393D" : "#E2E8F0",
                        borderWidth: "1px",
                        borderRadius: "6px",
                      },
                      "&:hover fieldset": { borderColor: "#AA393D" },
                      "&.Mui-focused fieldset": { borderColor: "#AA393D" },
                    },
                  }}
                />
              )}
            />

            {/* Overdue follow-ups toggle */}
            <button
              type="button"
              onClick={() => setOverdueOnly((v) => !v)}
              title="Show only leads whose next follow-up date has passed"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                height: FILTER_HEIGHT,
                padding: "0 12px",
                borderRadius: "6px",
                cursor: "pointer",
                fontFamily: "Inter",
                fontSize: "12px",
                fontWeight: 600,
                whiteSpace: "nowrap",
                border: `1px solid ${overdueOnly ? "#DC2626" : "#E2E8F0"}`,
                background: overdueOnly ? "#FEF2F2" : "#FFFFFF",
                color: overdueOnly ? "#DC2626" : "#64748B",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: overdueCount > 0 ? "#DC2626" : "#CBD5E1",
                  display: "inline-block",
                }}
              />
              Overdue{overdueCount > 0 ? ` (${overdueCount})` : ""}
            </button>

            {hasAnyFilter && (
              <button
                onClick={clearAllFilters}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "#AA393D",
                  fontWeight: 600,
                  fontFamily: "Inter, sans-serif",
                  padding: "2px 8px",
                  whiteSpace: "nowrap"
                }}
              >
                ✕ Clear filters
              </button>
            )}
          </div>

          {/* KPI Summary */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            padding: '0 12px',
            background: '#F8FAFC',
            height: '32px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            width: isMobile ? '100%' : 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Value:</span>
              <span style={{ fontSize: '14px', color: '#AA393D', fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>{formatCompactCurrency(totalFilteredCost)}</span>
            </div>
            <div style={{ width: '1px', height: '14px', backgroundColor: '#E2E8F0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Results:</span>
              <span style={{ fontSize: '14px', color: '#AA393D', fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>
                {quickFilteredData?.length ?? 0} / {tableData?.length ?? 0}
              </span>
            </div>
          </div>
        </div>
      </Box>

      <MaterialTable
        columns={columns}
        data={quickFilteredData}
        tableName="LeadTable"
        defaultSorting={[{ id: "inquiryDate", desc: true }]}
        renderExportActions={() => (
          <ExportButton
            data={quickFilteredData}
            columns={exportColumns}
            filename="leads"
            title="Leads"
            subtitle="CRM Inquiry Pipeline"
            sheetName="Leads"
            showTotals
            totalLabel="TOTAL"
            disabled={!quickFilteredData?.length}
          />
        )}
        employeeId={currentEmployeeId}
        resource="LEADS"
        viewOwn={true}
        viewOthers={true}
        checkOwnWithOthers={true}
        enableColumnResizing={true}
        layoutMode="semantic"
        muiTableContainerProps={{
          sx: { maxHeight: "700px", overflowX: "auto" },
        }}
        muiTableProps={{
          sx: {
            borderCollapse: "separate",
            borderSpacing: "0 4px !important",
            minWidth: "1600px",
          },
          muiTableBodyRowProps: ({ row }: any) => ({
            sx: {
              cursor: "pointer",
              backgroundColor: `${row.original?.status?.color}20`,
              transition: "all 0.2s ease",
              "& .MuiTableCell-root": {
                fontSize: "15.5px",
                fontFamily: "Inter",
                fontWeight: "500",
                padding: "4px 8px !important",
                border: "none",
                color: "#333",
                whiteSpace: "nowrap",
              },
              "&:hover": {
                backgroundColor: "#F8FAFC !important",
                transform: "translateY(-2px)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              },
            },
            onClick: () =>
              navigate(`/employee/lead/${row.original.id}`, {
                state: { leadData: row.original.id, isProject: false },
              }),
          }),
        }}
      />

      {formValues && (
        <LeadWizardModal
          key={formValues?.id || "new-lead-modal"}
          leadTemplateId={formValues?.leadTemplateId}
          open={true}
          onClose={() => setFormValues(null)}
          title={formValues?.id ? `Edit ${formValues.title || formValues?.projectName} Lead` : "New Lead"}
          initialData={formValues?.id ? { id: formValues?.leadTemplateId } : { ...formValues, title: '' }}
          initialFormData={formValues}
          isEditMode={!!formValues?.id}
        />
      )}

      <LeadBulkImport
        show={showBulkImport}
        onHide={() => setShowBulkImport(false)}
      />
    </>
  );
};

export default LeadTablePage;
