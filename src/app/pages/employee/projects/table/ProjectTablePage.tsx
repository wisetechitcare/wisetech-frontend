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
} from "@mui/material";
import { getAllLeadsComplete } from "@services/leads";
import { saveLeadPeriodPreference, getLeadPeriodPreference } from "@services/users";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Loader from "@app/modules/common/utils/Loader";
import dayjs, { Dayjs } from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import {
  getAllProjectCategories,
  getAllProjectServices,
  getAllProjectSubcategories,
  getAllProjectStatuses,
} from "@services/projects";
import {
  fetchAllCountries,
  fetchAllStates,
  fetchAllCities,
} from "@services/options";
import { getRowBackgroundColor } from "@app/modules/common/design-tokens";
import { AppDispatch, RootState } from "@redux/store";
import { useDispatch, useSelector } from "react-redux";
import eventBus from "@utils/EventBus";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { fetchAllEmployeesAsync } from "@redux/slices/allEmployees";
import { KTIcon } from "@metronic/helpers";
import WrongLocationRoundedIcon from "@mui/icons-material/WrongLocationRounded";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import { formatCompactCurrency, getProjectPhase, isDelayedProject, PHASE_THEMES } from "../../entity/entityUtils";
import PeriodNavigationButtons from "@pages/employee/leads/table/PeriodNavigationButtons";

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

type DateMode = "daily" | "weekly" | "monthly" | "yearly" | "allyear" | "custom";

const ProjectTablePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const today = dayjs();

  const [tableData, setTableData] = useState<any[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectServices, setProjectServices] = useState<any[]>([]);
  const [projectCategories, setProjectCategories] = useState<any[]>([]);
  const [projectSubcategories, setProjectSubcategories] = useState<any[]>([]);

  // ── Column visibility & selective fetching ──────────────────────────────────
  const visibleColumnsRef = useRef<string[] | null>(null);
  const lastFieldsKeyRef = useRef<string | null>(null);
  const firstVisibilityEmissionRef = useRef(true);
  const columnsRefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up refetch timer on unmount
  useEffect(() => {
    return () => {
      if (columnsRefetchTimerRef.current) clearTimeout(columnsRefetchTimerRef.current);
    };
  }, []);

  const [alignment, setAlignment] = useState<DateMode>("monthly");
  const [searchText, setSearchText] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState("");
  const [projectManagerFilter, setProjectManagerFilter] = useState("");
  // When on, the table shows ONLY projects missing address (lat/long) — in place,
  // no modal. Toggled by the "Missing Address" count button in the toolbar.
  const [showMissingAddress, setShowMissingAddress] = useState(false);

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

  const projectManagerOptions = useMemo(() => {
    const pmIds = new Set(
      tableData.filter((p: any) => p.projectManagerId).map((p: any) => p.projectManagerId),
    );
    return (allemployees || [])
      .filter((e: any) => pmIds.has(e.employeeId))
      .sort((a: any, b: any) => a.employeeName.localeCompare(b.employeeName));
  }, [tableData, allemployees]);

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
    localStorage.setItem("projectPeriodPreference", mode);
    try {
      await saveLeadPeriodPreference(mode);
    } catch (err) {
      console.warn("Failed to save period preference to Redis:", err);
    }
  };

  useEffect(() => {
    const loadPreference = async () => {
      const localPref = localStorage.getItem("projectPeriodPreference") as DateMode | null;
      if (localPref) {
        setAlignment(localPref);
      }
      try {
        const res = await getLeadPeriodPreference();
        const redisPref = res?.data?.period as DateMode | null;
        if (redisPref && ["daily", "weekly", "monthly", "yearly", "allyear", "custom"].includes(redisPref)) {
          setAlignment(redisPref);
          localStorage.setItem("projectPeriodPreference", redisPref);
        }
      } catch (err) {
        console.warn("Failed to fetch period preference from Redis, using local storage/default:", err);
      }
    };
    loadPreference();
  }, []);

  const fetchAllData = useCallback(async (fields?: string[]) => {
    try {
      setLoading(true);
      // Fetch the full set — the default 50-row page capped this to ~15 projects
      // (only the project-trigger leads within the first 50). Filtered client-side.
      const leadsResponse = await getAllLeadsComplete(fields);
      const leadsData = leadsResponse?.data?.data?.leads || [];

      // Filter to ONLY project leads (isProjectTrigger === true)
      const projectLeads = leadsData.filter(
        (lead: any) => lead?.status?.isProjectTrigger
      );

      const [servicesRes, catRes, subcatRes, statusRes, countriesData] = await Promise.all([
        getAllProjectServices(),
        getAllProjectCategories(),
        getAllProjectSubcategories(),
        getAllProjectStatuses().catch(() => null),
        fetchAllCountries(),
      ]);
      setProjectServices(servicesRes?.services || []);
      setProjectCategories(catRes?.projectCategories || []);
      setProjectSubcategories(subcatRes?.projectSubCategories || []);
      setProjectStatuses(
        statusRes?.projectStatuses ||
        statusRes?.data?.projectStatuses ||
        statusRes?.data?.data?.projectStatuses ||
        [],
      );

      if (projectLeads.length > 0) {
        const uniqueCountryIds = new Set<any>();
        const uniqueStateIds = new Map<any, Set<any>>();
        const uniqueCityIds = new Map<any, Set<any>>();

        projectLeads.forEach((lead: any) => {
          if (lead?.project?.country) {
            uniqueCountryIds.add(lead.project.country);
          }
        });

        const countriesMap = new Map<string, any>();
        const statesMap = new Map<string, any>();
        const citiesMap = new Map<string, any>();
        (countriesData || []).forEach((c: any) => countriesMap.set(c.id.toString(), c));

        const transformedProjects = projectLeads.map((lead: any) => {
          // Lead-as-master: project-execution fields live on lead.execution; the
          // dates live on the lead itself. lead.project is a transitional fallback.
          const project = lead?.project || null;
          const exec = lead?.execution || null;
          const startVal = lead?.startDate || project?.startDate || null;
          const endVal = lead?.endDate || project?.endDate || null;
          const s = startVal ? new Date(startVal) : null;
          const e = endVal ? new Date(endVal) : null;
          const duration =
            s && e
              ? `${Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))} days`
              : "N/A";
          const commercialRows: any[] = Array.isArray(lead.commercials)
            ? lead.commercials
            : [];
          const commercialsTotal = commercialRows.reduce(
            (acc: number, c: any) => acc + (parseFloat(c.cost) || 0),
            0,
          );
          const commercialsArea = commercialRows.reduce(
            (acc: number, c: any) => acc + (parseFloat(c.area) || 0),
            0,
          );
          // Area home order: summed commercial work-areas first, then the
          // technical-spec areas captured in additionalDetails (project → built-up
          // → plot), so a project with specs but no commercial rows still shows.
          const ad = lead?.additionalDetails || {};
          const fallbackArea =
            parseFloat(ad.projectArea) ||
            parseFloat(ad.builtUpArea) ||
            parseFloat(ad.plotArea) ||
            0;
          const resolvedArea = commercialsArea || fallbackArea;
          // Rate is derived: total cost per unit area (matches the detail page's
          // "Total Rate"). execution.rate is a fallback when commercials are absent.
          const derivedRate =
            commercialsArea > 0 ? commercialsTotal / commercialsArea : 0;

          // Address completeness: a project "has address" only when a usable
          // lat/long exists — on the lead's additionalDetails OR on any of the
          // project's site addresses. Drives the "Missing Address" filter.
          const projectSites: any[] = Array.isArray(project?.addresses) ? project.addresses : [];
          const hasAddress = !!(
            (ad.latitude && ad.longitude) ||
            projectSites.some((a: any) => a?.latitude && a?.longitude)
          );

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
            subCategory:
              lead?.projectSubCategoryId || lead?.leadSubCategories?.[0]?.subcategory?.id || "N/A",
            status: lead?.status || null,
            poStatus: lead?.poStatus || null,
            assignedTo: lead?.assignedToId || "N/A",
            contact: lead?.contact?.fullName || lead?.leadTeams?.[0]?.contact?.fullName || "N/A",
            createdAt: lead?.createdAt ? new Date(lead.createdAt).toISOString() : new Date().toISOString(),
            updatedAt: lead?.updatedAt ? new Date(lead.updatedAt).toISOString() : new Date().toISOString(),

            // Project-specific fields — sourced from lead.execution (lead-as-master)
            // with lead scalars and the transitional lead.project as fallbacks.
            projectId: lead?.projectId || project?.id || "N/A",
            projectPrefix: lead?.originalProjectPrefix || project?.prefix || "N/A",
            projectStatus: exec?.projectStatus || project?.status || null,
            projectStartDate: startVal || "N/A",
            projectEndDate: endVal || "N/A",
            projectManagerId: exec?.projectManagerId || project?.projectManagerId || "N/A",
            projectTeamName: exec?.team?.name || project?.team?.name || "N/A",
            projectTeams: project?.projectTeams || [],
            projectCompanyMappings: project?.projectCompanyMappings || [],
            projectCost: parseFloat(exec?.cost ?? project?.cost) || commercialsTotal || 0,
            projectRate: derivedRate || parseFloat(exec?.rate ?? project?.rate) || 0,
            projectArea: resolvedArea,
            projectServiceId: lead?.projectServiceId || project?.serviceId || "N/A",
            projectCategoryId: lead?.projectCategoryId || project?.projectCategoryId || "N/A",
            projectCountry: project?.country || "N/A",
            projectState: project?.state || "N/A",
            projectCity: project?.city || "N/A",
            hasAddress,
            projectIsLive: exec?.isLive ?? project?.isLive ?? false,
            entityPhase: getProjectPhase(lead),
            isDelayed: isDelayedProject(lead),
            duration,
          };
        });

        setTableData(transformedProjects);
      } else {
        setTableData([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVisibleColumnsChange = useCallback(
    (keys: string[]) => {
      visibleColumnsRef.current = keys;
      const key = [...keys].sort().join(",");

      // First emission: record baseline, don't refetch
      if (firstVisibilityEmissionRef.current) {
        firstVisibilityEmissionRef.current = false;
        lastFieldsKeyRef.current = key;
        return;
      }

      // No change detected
      if (key === lastFieldsKeyRef.current) return;
      lastFieldsKeyRef.current = key;

      // Debounce refetch
      if (columnsRefetchTimerRef.current) clearTimeout(columnsRefetchTimerRef.current);
      columnsRefetchTimerRef.current = setTimeout(() => {
        fetchAllData(keys);
      }, 500);
    },
    [fetchAllData],
  );

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    dispatch(fetchAllEmployeesAsync());
  }, [dispatch]);

  // Refresh the table when a project is created/updated elsewhere. useEventBus is a
  // hook that self-manages subscribe/cleanup via a ref-backed stable handler, so it
  // must be called at the top level (not inside a useEffect) and registers the
  // listener exactly once for the component's lifetime — always invoking the latest
  // fetchAllData, so no duplicate listeners, missed events, or stale-closure refresh.
  useEventBus(EVENT_KEYS.projectCreated, () => fetchAllData());
  useEventBus(EVENT_KEYS.projectUpdated, () => fetchAllData());

  const columns = useMemo(() => {
    const base: any[] = [
      {
        accessorKey: "projectPrefix",
        header: "Project Number",
        size: 220,
        Cell: ({ row }: { row: any }) => (
          <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
            {row.original.projectPrefix || "N/A"}
          </span>
        ),
      },
      {
        accessorKey: "projectName",
        header: "Project Name",
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
        header: "Client Company",
        meta: { defaultVisible: false },
        size: 150,
        Cell: ({ cell }: { cell: any }) => {
          const v = cell.getValue();
          return typeof v === "object" ? v.name || "N/A" : v || "N/A";
        },
      },
      {
        accessorKey: "contact",
        header: "Contact",
        meta: { defaultVisible: false },
        size: 150,
        Cell: ({ cell }: { cell: any }) => {
          const v = cell.getValue();
          return typeof v === "object" ? v?.name || v?.email || "N/A" : v || "N/A";
        },
      },
      {
        accessorKey: "category",
        header: "Category",
        meta: { defaultVisible: false },
        size: 150,
        Cell: ({ cell }: { cell: any }) =>
          projectCategories?.find((c: any) => c.id === cell.getValue())?.name || "N/A",
      },
      {
        accessorKey: "subCategory",
        header: "Subcategory",
        meta: { defaultVisible: false },
        size: 150,
        Cell: ({ cell }: { cell: any }) =>
          projectSubcategories?.find((s: any) => s.id === cell.getValue())?.name || "N/A",
      },
      {
        accessorKey: "projectStatus",
        header: "Project Status",
        size: 150,
        Cell: ({ row }: any) => {
          const st = row?.original?.projectStatus;
          return st?.name ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              backgroundColor: st.color || '#64748B',
              borderRadius: '16px', padding: '4px 10px 4px 8px',
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fff' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{st.name}</span>
            </div>
          ) : (
            "N/A"
          );
        },
      },
      {
        accessorKey: "poStatus",
        header: "PO Status",
        meta: { defaultVisible: false },
        size: 130,
        Cell: ({ cell }: { cell: any }) => {
          const poStatus = cell.getValue();
          if (!poStatus) return "N/A";
          const color = poStatus === "Received" ? "#28A745" : "#FFC107";
          return (
            <div className="badge badge-light" style={{ backgroundColor: color, color: poStatus === "Received" ? "white" : "#333" }}>
              {poStatus}
            </div>
          );
        },
      },
      {
        accessorKey: "projectStartDate",
        header: "Start Date",
        // Explicit defaultVisible:true — with the Inquiry Date column removed the
        // preference reconciliation re-applies meta rules, forcing this column on
        // even for users whose saved prefs still have it hidden.
        meta: { defaultVisible: true },
        size: 140,
        enableSorting: true,
        // "N/A" sorts as oldest so dated rows lead the default (desc) view.
        sortingFn: (rowA: any, rowB: any) => {
          const toTime = (v: any) => (v && v !== "N/A" ? new Date(v).getTime() : 0);
          return toTime(rowA.original.projectStartDate) - toTime(rowB.original.projectStartDate);
        },
        Cell: ({ cell }: { cell: any }) => {
          try {
            const v = cell.getValue();
            if (!v || v === "N/A") return "N/A";
            const date = dayjs(v);
            return date.isValid() ? date.format("DD-MM-YYYY") : "N/A";
          } catch (err) {
            return "N/A";
          }
        },
      },
      {
        accessorKey: "projectEndDate",
        header: "End Date",
        meta: { defaultVisible: false },
        size: 150,
        enableSorting: true,
        Cell: ({ row }: { row: any }) => {
          try {
            const v = row.original.projectEndDate;
            if (!v || v === "N/A") return "N/A";
            const date = dayjs(v);
            if (!date.isValid()) return "N/A";
            return (
              <span style={{ color: row.original.isDelayed ? "#D92D20" : undefined, fontWeight: row.original.isDelayed ? 600 : undefined }}>
                {date.format("DD-MM-YYYY")}
                {row.original.isDelayed ? " ⚠" : ""}
              </span>
            );
          } catch (err) {
            return "N/A";
          }
        },
      },
      {
        accessorKey: "duration",
        header: "Timeline",
        meta: { defaultVisible: false },
        size: 120,
        Cell: ({ cell }: { cell: any }) => cell.getValue() || "N/A",
      },
      {
        accessorKey: "projectCost",
        header: "Budget",
        meta: { defaultVisible: false },
        size: 130,
        Cell: ({ cell }: { cell: any }) =>
          cell.getValue() ? `₹${Number(cell.getValue()).toLocaleString()}` : "₹0",
      },
      {
        accessorKey: "totalCost",
        header: "Cost",
        meta: { defaultVisible: false },
        size: 130,
        Cell: ({ cell }: { cell: any }) =>
          cell.getValue() ? `₹${Number(cell.getValue()).toLocaleString()}` : "₹0",
      },
      {
        accessorKey: "projectArea",
        header: "Area",
        meta: { defaultVisible: false },
        size: 120,
        Cell: ({ cell }: { cell: any }) =>
          cell.getValue() ? `${Number(cell.getValue()).toLocaleString()} SFT` : "N/A",
      },
      {
        accessorKey: "projectRate",
        header: "Rate",
        meta: { defaultVisible: false },
        size: 110,
        Cell: ({ cell }: { cell: any }) => {
          const v = Number(cell.getValue());
          return v ? `₹${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "N/A";
        },
      },
      {
        accessorKey: "projectManagerId",
        header: "Project Manager",
        meta: { defaultVisible: false },
        size: 160,
        Cell: ({ cell }: { cell: any }) =>
          allemployees?.find((e: any) => e.employeeId === cell.getValue())?.employeeName || "N/A",
      },
      {
        accessorKey: "projectTeamName",
        header: "Team",
        meta: { defaultVisible: false },
        size: 140,
        Cell: ({ cell }: { cell: any }) => cell.getValue() || "N/A",
      },
      {
        accessorKey: "assignedTo",
        header: "Assigned To",
        size: 150,
        Cell: ({ cell }: { cell: any }) =>
          allemployees?.find((e: any) => e.employeeId === cell.getValue())?.employeeName || "N/A",
      },
      {
        accessorKey: "service",
        header: "Service",
        meta: { defaultVisible: false },
        size: 150,
        Cell: ({ cell }: { cell: any }) =>
          projectServices?.find((s: any) => s.id === cell.getValue())?.name || "N/A",
      },
      {
        accessorKey: "createdAt",
        header: "Created Date",
        meta: { defaultVisible: false },
        size: 150,
        Cell: ({ cell }: { cell: any }) =>
          cell.getValue() ? dayjs(cell.getValue()).format("DD-MM-YYYY") : "N/A",
      },
      {
        accessorKey: "updatedAt",
        header: "Updated Date",
        meta: { defaultVisible: false },
        size: 150,
        Cell: ({ cell }: { cell: any }) =>
          cell.getValue() ? dayjs(cell.getValue()).format("DD-MM-YYYY") : "N/A",
      },
      {
        accessorKey: "projectIsLive",
        header: "Live",
        meta: { defaultVisible: false },
        size: 80,
        Cell: ({ cell }: { cell: any }) =>
          cell.getValue() ? <span style={{ color: "#0A5C2A", fontWeight: 600 }}>Live</span> : <span style={{ color: "#64748B" }}>On Hold</span>,
      },
    ];

    return base;
  }, [projectServices, projectCategories, projectSubcategories, allemployees]);

  const exportColumns = useMemo(
    () => [
      { key: 'projectPrefix', header: 'Project Number', type: 'text' as const },
      { key: 'projectName', header: 'Project Name', type: 'text' as const },
      { key: 'client', header: 'Client Company', type: 'text' as const },
      { key: 'contact', header: 'Contact', type: 'text' as const },
      { key: 'category', header: 'Category', type: 'text' as const },
      { key: 'subCategory', header: 'Subcategory', type: 'text' as const },
      {
        key: 'projectStatus', header: 'Project Status', type: 'text' as const,
        format: (val: any) => val?.name || String(val || ''),
      },
      { key: 'poStatus', header: 'PO Status', type: 'text' as const },
      { key: 'projectStartDate', header: 'Start Date', type: 'text' as const },
      { key: 'projectEndDate', header: 'End Date', type: 'text' as const },
      { key: 'projectCost', header: 'Budget', type: 'currency' as const, showTotal: true },
      { key: 'totalCost', header: 'Cost', type: 'currency' as const, showTotal: true },
      { key: 'projectArea', header: 'Area (SFT)', type: 'number' as const, showTotal: true },
      { key: 'projectRate', header: 'Rate', type: 'currency' as const },
      { key: 'projectManagerId', header: 'Project Manager', type: 'text' as const },
      { key: 'projectTeamName', header: 'Team', type: 'text' as const },
      {
        key: 'assignedTo', header: 'Assigned To', type: 'text' as const,
        format: (val: any) => allemployees?.find((e: any) => e.employeeId === val)?.employeeName || '',
      },
      { key: 'service', header: 'Service', type: 'text' as const },
    ],
    [allemployees],
  );

  if (loading) return <Loader />;

  const baseFilteredData = tableData?.filter((item: any) => {
    let dateMatch = true;
    // Period filter runs on the project start date — the date the table shows.
    const d = item.projectStartDate && item.projectStartDate !== "N/A"
      ? dayjs(item.projectStartDate)
      : null;
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

    const projectStatusMatch = projectStatusFilter
      ? item.projectStatus?.id === projectStatusFilter
      : true;
    const projectManagerMatch = projectManagerFilter
      ? item.projectManagerId === projectManagerFilter
      : true;

    let searchMatch = true;
    if (searchText) {
      const q = searchText.toLowerCase();
      const pmName = allemployees?.find((e: any) => e.employeeId === item.projectManagerId)?.employeeName || "";
      const serviceName = projectServices?.find((s: any) => s.id === item.service)?.name || "";
      const categoryName = projectCategories?.find((c: any) => c.id === item.category)?.name || "";

      searchMatch =
        String(item.projectName || "").toLowerCase().includes(q) ||
        String(item.projectPrefix || "").toLowerCase().includes(q) ||
        String(item.client || "").toLowerCase().includes(q) ||
        String(item.contact || "").toLowerCase().includes(q) ||
        String(item.projectStatus?.name || "").toLowerCase().includes(q) ||
        String(pmName).toLowerCase().includes(q) ||
        String(serviceName).toLowerCase().includes(q) ||
        String(categoryName).toLowerCase().includes(q);
    }

    return dateMatch && projectStatusMatch && projectManagerMatch && searchMatch;
  });

  // "Missing Address" is a GLOBAL view: the count and the list ignore the period
  // and other filters, so clicking always reveals EVERY project without lat/long
  // across all time — and clicking it again returns to the normal filtered view.
  const missingAddressCount = (tableData ?? []).filter((i: any) => !i.hasAddress).length;
  const quickFilteredData = showMissingAddress
    ? (tableData ?? []).filter((i: any) => !i.hasAddress)
    : baseFilteredData;

  // Note: showMissingAddress is intentionally NOT part of hasAnyFilter — its own
  // toggle button turns it off, so surfacing a separate "Clear filters" chip for it
  // would only shift the toolbar layout when the button is clicked.
  const hasAnyFilter = projectStatusFilter || projectManagerFilter || searchText;
  const clearAllFilters = () => {
    setProjectStatusFilter("");
    setProjectManagerFilter("");
    setSearchText("");
    setShowMissingAddress(false);
  };

  const totalFilteredCost = (quickFilteredData ?? []).reduce(
    (acc: number, item: any) => acc + (item.projectCost || 0),
    0,
  );

  const FILTER_HEIGHT = "32px";

  const pillSelectSx = (hasValue: boolean) => ({
    borderRadius: "6px",
    fontSize: "12px",
    fontFamily: "Inter",
    fontWeight: 500,
    height: FILTER_HEIGHT,
    color: hasValue ? "#1E3A8A" : "#1E293B",
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: hasValue ? "#1E3A8A !important" : "#E2E8F0 !important",
      borderWidth: "1px !important",
      borderRadius: "6px !important",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#1E3A8A !important" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#1E3A8A !important" },
    "& .MuiSelect-icon": { color: hasValue ? "#1E3A8A" : "#94A3B8" },
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
          "&:hover": { backgroundColor: "rgba(30, 58, 138,0.06)" },
          "&.Mui-selected": {
            backgroundColor: "rgba(30, 58, 138,0.1)",
            color: "#1E3A8A",
            fontWeight: 600,
          },
        },
      },
    },
  };

  const rowBackground = (row: any) => {
    const statusColor = row?.projectStatus?.color || row?.status?.color;
    return statusColor ? `${statusColor}20` : "#F1F5F9";
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
              Projects
            </h1>
            <p style={{ color: '#64748B', margin: 0, fontSize: '12px', fontWeight: 500 }}>
              Project management — execution, timesheets, deliverables
            </p>
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
              display: "flex",
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
                  "& fieldset": { borderColor: searchText ? "#1E3A8A" : "#E2E8F0" },
                  "&:hover fieldset": { borderColor: "#1E3A8A" },
                  "&.Mui-focused fieldset": { borderColor: "#1E3A8A" },
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

            {/* Project Status Filter */}
            {projectStatuses.length > 0 && (
              <FormControl size="small" sx={{ minWidth: isMobile ? "100%" : 150 }}>
                <Select
                  value={projectStatusFilter}
                  onChange={(e) => setProjectStatusFilter(e.target.value)}
                  displayEmpty
                  sx={pillSelectSx(!!projectStatusFilter)}
                  renderValue={(val) => {
                    if (!val) {
                      return (
                        <span style={{ color: "#94A3B8", fontFamily: "Inter", fontSize: "12px", fontWeight: 500 }}>
                          Project Status
                        </span>
                      );
                    }
                    const st = projectStatuses.find((s: any) => s.id === val);
                    return (
                      <span style={{ fontFamily: "Inter", fontSize: "12px", fontWeight: 500, color: "#1E3A8A" }}>
                        {st?.name || val}
                      </span>
                    );
                  }}
                  MenuProps={menuSx}
                >
                  <MenuItem value="" sx={{ color: "#94A3B8", fontSize: "12px" }}>
                    All Project Statuses
                  </MenuItem>
                  {projectStatuses.map((st: any) => (
                    <MenuItem key={st.id} value={st.id} sx={{ fontSize: "12px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: st.color || "#64748B", display: "inline-block", flexShrink: 0 }} />
                        {st.name}
                      </span>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Project Manager Filter */}
            {projectManagerOptions.length > 0 && (
              <FormControl size="small" sx={{ minWidth: isMobile ? "100%" : 160 }}>
                <Select
                  value={projectManagerFilter}
                  onChange={(e) => setProjectManagerFilter(e.target.value)}
                  displayEmpty
                  sx={pillSelectSx(!!projectManagerFilter)}
                  renderValue={(val) => {
                    if (!val) {
                      return (
                        <span style={{ color: "#94A3B8", fontFamily: "Inter", fontSize: "12px", fontWeight: 500 }}>
                          Project Manager
                        </span>
                      );
                    }
                    const emp = projectManagerOptions.find((e: any) => e.employeeId === val);
                    return (
                      <span style={{ fontFamily: "Inter", fontSize: "12px", fontWeight: 500, color: "#1E3A8A" }}>
                        {emp?.employeeName || val}
                      </span>
                    );
                  }}
                  MenuProps={menuSx}
                >
                  <MenuItem value="" sx={{ color: "#94A3B8", fontSize: "12px" }}>
                    All Project Managers
                  </MenuItem>
                  {projectManagerOptions.map((emp: any) => (
                    <MenuItem key={emp.employeeId} value={emp.employeeId} sx={{ fontSize: "12px" }}>
                      {emp.employeeName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {hasAnyFilter && (
              <button
                onClick={clearAllFilters}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "#1E3A8A",
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

          {/* Right-side group: budget/results pill + missing-address toggle, kept together */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: isMobile ? 'stretch' : 'flex-end', width: isMobile ? '100%' : 'auto' }}>
          {/* KPI Summary — glassmorphic pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            border: '1px solid rgba(226,232,240,0.9)',
            borderRadius: '10px',
            padding: '0 14px',
            background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            height: '32px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
            width: isMobile ? '100%' : 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Budget:</span>
              <span style={{ fontSize: '14px', color: '#1E3A8A', fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>{formatCompactCurrency(totalFilteredCost)}</span>
            </div>
            <div style={{ width: '1px', height: '14px', backgroundColor: '#E2E8F0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Results:</span>
              <span style={{ fontSize: '14px', color: '#1E3A8A', fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>
                {quickFilteredData?.length ?? 0} / {tableData?.length ?? 0}
              </span>
            </div>
          </div>

          {/* Missing-address filter: shows the count and, on click, lists ONLY the
              projects without lat/long in place — no modal. */}
          <button
            type="button"
            onClick={() => setShowMissingAddress((v) => !v)}
            title={showMissingAddress
              ? 'Showing projects with no address (latitude/longitude). Click to show all.'
              : 'Show only projects missing address (latitude/longitude)'}
            style={{
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              // Constant border width + padding + height across states so the
              // button never resizes or shifts when toggled.
              gap: '7px',
              border: `1px solid ${showMissingAddress ? 'rgba(255,255,255,0.35)' : 'rgba(226,232,240,0.9)'}`,
              borderRadius: '10px',
              padding: '0 14px',
              height: '32px',
              cursor: 'pointer',
              // Glassmorphic base — the red is a separate overlay layer below.
              background: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: showMissingAddress
                ? '0 6px 18px rgba(30, 58, 138, 0.35), inset 0 1px 0 rgba(255,255,255,0.25)'
                : '0 2px 10px rgba(0, 0, 0, 0.06)',
              fontFamily: 'Inter, sans-serif',
              width: isMobile ? '100%' : 'auto',
              transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
            }}
          >
            {/* Premium red gradient layer — fades in/out via opacity (a linear-gradient
                background can't be transitioned directly, so we animate opacity). */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 'inherit',
                background: 'linear-gradient(135deg, rgba(198,71,75,0.92) 0%, rgba(30, 58, 138,0.94) 55%, rgba(126,37,41,0.96) 100%)',
                opacity: showMissingAddress ? 1 : 0,
                transition: 'opacity 0.3s ease',
                zIndex: 0,
              }}
            />
            <WrongLocationRoundedIcon
              style={{ position: 'relative', zIndex: 1, fontSize: 16, color: showMissingAddress ? '#fff' : '#1E3A8A', transition: 'color 0.3s ease' }}
            />
            <span style={{ position: 'relative', zIndex: 1, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: showMissingAddress ? 'rgba(255,255,255,0.95)' : '#64748B', transition: 'color 0.3s ease' }}>
              Missing Address
            </span>
            <span
              style={{
                position: 'relative',
                zIndex: 1,
                fontSize: '12px',
                fontWeight: 800,
                lineHeight: 1,
                color: showMissingAddress ? '#1E3A8A' : '#fff',
                background: showMissingAddress ? '#fff' : '#1E3A8A',
                borderRadius: '999px',
                minWidth: '20px',
                height: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 6px',
                transition: 'color 0.3s ease, background 0.3s ease',
              }}
            >
              {missingAddressCount}
            </span>
          </button>
          </div>
        </div>
      </Box>

      <MaterialTable
        columns={columns}
        data={quickFilteredData}
        tableName="ProjectTableV2"
        defaultSorting={[{ id: "projectStartDate", desc: true }]}
        renderExportActions={() => (
          <ExportButton
            data={quickFilteredData}
            columns={exportColumns}
            filename="projects"
            title="Projects"
            subtitle="Project Management & Execution"
            sheetName="Projects"
            showTotals
            totalLabel="TOTAL"
            disabled={!quickFilteredData?.length}
          />
        )}
        employeeId={currentEmployeeId}
        resource="PROJECTS"
        viewOwn={true}
        viewOthers={true}
        checkOwnWithOthers={true}
        onVisibleColumnsChange={handleVisibleColumnsChange}
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
              backgroundColor: rowBackground(row.original),
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
              "& .MuiTableCell-root:first-of-type": {
                borderTopLeftRadius: "12px",
                borderBottomLeftRadius: "12px",
                borderLeft: `3px solid ${PHASE_THEMES[row.original.entityPhase as keyof typeof PHASE_THEMES]?.fg || "#1E3A8A"} !important`,
                transition: "border-color 0.2s ease-in-out !important",
              },
              "& .MuiTableCell-root:last-of-type": {
                borderTopRightRadius: "12px",
                borderBottomRightRadius: "12px",
              },
              "&:hover": {
                backgroundColor: "#F8FAFC !important",
                transform: "translateY(-2px)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                "& .MuiTableCell-root": {
                  backgroundColor: "#F8FAFC !important",
                },
                "& .MuiTableCell-root:first-of-type": {
                  borderLeftColor: `${PHASE_THEMES[row.original.entityPhase as keyof typeof PHASE_THEMES]?.fg || "#1E3A8A"} !important`,
                },
              },
            },
            onClick: () =>
              navigate(`/employee/lead/${row.original.id}`, {
                state: { leadData: row.original.id, isProject: true },
              }),
          }),
        }}
      />
    </>
  );
};

export default ProjectTablePage;
