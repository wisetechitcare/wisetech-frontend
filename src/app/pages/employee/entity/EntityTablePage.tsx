import MaterialTable from "@app/modules/common/components/MaterialTable";
import ExportButton from "@app/modules/common/components/ExportButton";
import TimePeriodSelector, { TimePeriodMode } from "@app/modules/common/components/TimePeriodSelector";
import {
  Box,
  MenuItem,
  Select,
  FormControl,
  useTheme,
  useMediaQuery,
  Autocomplete,
  TextField,
  InputAdornment,
} from "@mui/material";
import { deleteLead, getAllLeads } from "@services/leads";
import { saveLeadPeriodPreference, getLeadPeriodPreference } from "@services/users";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  getAllProjectServices,
  getAllProjectSubcategories,
  getAllProjectCategories,
  getAllProjectStatuses,
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
import { KTIcon, toAbsoluteUrl } from "@metronic/helpers";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import LeadBulkImport from "@pages/employee/leads/lead/LeadBulkImport";
import {
  ENTITY_VIEWS,
  EntityView,
  PHASE_THEMES,
  formatCompactCurrency,
  getProjectPhase,
  isDelayedProject,
  isProjectEntity,
  isProjectView,
  matchesView,
} from "./entityUtils";

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// ─── Types ─────────────────────────────────────────────────────────────────────

type DateMode =
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "allyear"
  | "custom";

/**
 * Drill-down props are a superset of the old LeadNewLead + ProjectsMainTable
 * props so the overview chart dialogs can embed this one table for both
 * domains. `entityScope="project"` makes statusId/serviceId/… match against
 * the linked project instead of the lead.
 */
export type EntityTablePageProps = {
  statusId?: any;
  serviceId?: any;
  categoryId?: any;
  referralId?: any;
  sourceId?: any;
  subCategoryId?: any;
  companyTypeId?: any;
  topLeadsId?: any;
  locationId?: any;
  monthlyStatusName?: any;
  monthlyStatusId?: any;
  teamId?: any;
  monthlyCompanyTypeId?: any;
  projectCompanyTypeId?: any;
  projectCompanyTypeName?: any;
  startDate?: dayjs.Dayjs;
  endDate?: dayjs.Dayjs;
  entityScope?: "lead" | "project";
  initialView?: EntityView;
  // Project section drill-down: restrict rows to received/project leads (status.isProjectTrigger).
  receivedOnly?: boolean;
};

// ─── Navigation Buttons ────────────────────────────────────────────────────────

const NavigationButtons: React.FC<{
  onPrev: () => void;
  onNext: () => void;
  displayText: string;
  isMobile?: boolean;
}> = ({ onPrev, onNext, displayText, isMobile }) => (
  <div style={{
    display: "flex",
    alignItems: "center",
    justifyContent: isMobile ? "space-between" : "center",
    background: "#fff",
    border: "1px solid #E2E8F0",
    borderRadius: "6px",
    height: "32px",
    padding: "0 8px",
    boxShadow: "0 1px 2px rgba(16, 24, 40, 0.05)",
    gap: "6px",
    width: isMobile ? "100%" : "auto"
  }}>
    <button
      className="btn btn-sm p-0"
      onClick={onPrev}
      style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", cursor: "pointer", borderRadius: "4px" }}
    >
      <img src={toAbsoluteUrl("media/svg/misc/back.svg")} alt="Previous" style={{ width: "12px", height: "12px" }} />
    </button>
    <span
      className="mx-2"
      style={{ fontSize: "12px", fontFamily: "Inter, sans-serif", fontWeight: 600, color: "#1E293B", whiteSpace: "nowrap", textAlign: "center", flex: isMobile ? 1 : "none" }}
    >
      {displayText}
    </span>
    <button
      className="btn btn-sm p-0"
      onClick={onNext}
      style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", cursor: "pointer", borderRadius: "4px" }}
    >
      <img src={toAbsoluteUrl("media/svg/misc/next.svg")} alt="Next" style={{ width: "12px", height: "12px" }} />
    </button>
  </div>
);

// ─── Stage badge (All view) ────────────────────────────────────────────────────

const StageBadge: React.FC<{ row: any }> = ({ row }) => {
  const phase = row.entityPhase as keyof typeof PHASE_THEMES;
  const t = row.isProject ? PHASE_THEMES[phase] ?? PHASE_THEMES.ongoing : PHASE_THEMES.none;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        background: t.bg,
        color: t.fg,
        borderRadius: "999px",
        padding: "3px 10px",
        fontSize: "11px",
        fontWeight: 700,
        fontFamily: "Inter, sans-serif",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.fg, display: "inline-block" }} />
      {row.isProject ? `Project · ${t.label}` : "Lead"}
      {row.isProject && row.isDelayed && <span title="Past expected closure">⚠</span>}
    </span>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const EntityTablePage: React.FC<EntityTablePageProps> = ({
  statusId,
  serviceId,
  categoryId,
  referralId,
  sourceId,
  subCategoryId,
  companyTypeId,
  topLeadsId,
  locationId,
  monthlyStatusName,
  monthlyStatusId,
  teamId,
  monthlyCompanyTypeId,
  projectCompanyTypeId,
  projectCompanyTypeName,
  startDate,
  endDate,
  entityScope = "lead",
  initialView = "all",
  receivedOnly = false,
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const today = dayjs();

  // ── Responsive ──────────────────────────────────────────────────────────────
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // ── Data state ──────────────────────────────────────────────────────────────
  const [view, setView] = useState<EntityView>(initialView);
  const [tableData, setTableData] = useState<any[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<any[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formValues, setFormValues] = useState<any>(null);
  const [projectServices, setProjectServices] = useState<any[]>([]);
  const [projectSubcategories, setProjectSubcategories] = useState<any[]>([]);
  const [projectCategories, setProjectCategories] = useState<any[]>([]);
  const [rawLeadsDatas, setRawLeadsDatas] = useState<any[]>([]);
  const [showBulkImport, setShowBulkImport] = useState(false);

  // ── Date mode ────────────────────────────────────────────────────────────────
  const [alignment, setAlignment] = useState<DateMode>("monthly");
  const [searchText, setSearchText] = useState("");

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

  // ── Quick filters ─────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [assignedToFilter, setAssignedToFilter] = useState<string>("");
  // Conditional project-only filters
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>("");
  const [projectManagerFilter, setProjectManagerFilter] = useState<string>("");

  // ── Redux ────────────────────────────────────────────────────────────────────
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

  const projectManagerOptions = useMemo(() => {
    const pmIds = new Set(
      tableData.filter((l: any) => l.isProject && l.projectManagerId).map((l: any) => l.projectManagerId),
    );
    return (allemployees || [])
      .filter((e: any) => pmIds.has(e.employeeId))
      .sort((a: any, b: any) => a.employeeName.localeCompare(b.employeeName));
  }, [tableData, allemployees]);

  // ── Fiscal year init ─────────────────────────────────────────────────────────
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

  // ── Navigation handlers ──────────────────────────────────────────────────────
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

  // ── Data fetch ───────────────────────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const leadsResponse = await getAllLeads();
      const leadsData = leadsResponse?.data?.data?.leads || [];
      setRawLeadsDatas(leadsData);

      const [servicesRes, subcatRes, catRes, statusRes, projStatusRes, countriesData] =
        await Promise.all([
          getAllProjectServices(),
          getAllProjectSubcategories(),
          getAllProjectCategories(),
          getAllLeadStatus(),
          getAllProjectStatuses().catch(() => null),
          fetchAllCountries(),
        ]);
      setProjectServices(servicesRes?.services || []);
      setProjectSubcategories(subcatRes?.projectSubCategories || []);
      setProjectCategories(catRes?.projectCategories || []);
      setLeadStatuses(statusRes?.leadStatuses || []);
      setProjectStatuses(
        projStatusRes?.projectStatuses ||
        projStatusRes?.data?.projectStatuses ||
        projStatusRes?.data?.data?.projectStatuses ||
        [],
      );

      if (leadsData.length > 0) {
        const uniqueCountryIds = new Set<any>();
        const uniqueStateIds = new Map<any, Set<any>>();
        const uniqueCityIds = new Map<any, Set<any>>();

        leadsData.forEach((lead: any) => {
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

        const transformedLeads = leadsData.map((lead: any) => {
          const project = lead?.project || null;
          const isProject = isProjectEntity(lead);
          const s = project?.startDate ? new Date(project.startDate) : null;
          const e = project?.endDate ? new Date(project.endDate) : null;
          const duration =
            s && e
              ? `${Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))} days`
              : "N/A";
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

          return {
            id: lead.id,
            prefix: lead?.prefix || "",
            projectName: lead.title || "",
            totalCost: commercialsTotal || lead.budget || 0,
            client:
              lead?.company?.companyName ||
              lead?.leadTeams?.[0]?.company?.companyName ||
              "",
            service: lead?.projectServiceId || lead?.services?.[0]?.serviceId || "",
            category: lead?.projectCategoryId || lead?.leadCategories?.[0]?.category?.id || "",
            subCategory:
              lead?.projectSubCategoryId || lead?.leadSubCategories?.[0]?.subcategory?.id || "",
            status: lead?.status || null,
            poStatus: lead?.poStatus || null,
            assignedTo: lead?.assignedToId || "",
            inquiryDate: lead.inquiryDate || "",
            startDate: lead?.startDate || project?.startDate || "",
            endDate: lead?.endDate || "",
            duration,
            contact: lead?.contact?.fullName || lead?.leadTeams?.[0]?.contact?.fullName || "",
            createdAt: lead?.createdAt || "",
            createdBy: lead?.createdById || "",
            updatedBy: lead?.updatedById || "",
            updatedAt: lead?.updatedAt || "",
            country: countriesMap.get(String(countryId))?.name || String(countryId),
            countryId,
            city: citiesMap.get(String(cityId))?.name || String(cityId),
            cityId,
            state: statesMap.get(String(stateId))?.name || String(stateId),
            stateId,
            area:
              (Array.isArray(lead.commercials) && lead.commercials.length > 0
                ? lead.commercials[0]?.area
                : null) ||
              lead?.additionalDetails?.projectArea ||
              lead?.addresses?.[0]?.projectArea ||
              "",
            cost: commercialsTotal,
            companyId: lead.companyId || "",
            branchId: lead.branchId || "",
            description: lead.description || "",
            priority: lead.priority || "",
            budget: commercialsTotal || lead.budget || "",
            rate: lead.rate || "",
            leadSource: lead.source?.name || lead.sourceId || lead?.leadSource || "",
            referrals: lead.referrals || [],
            companyType: lead.company?.companyTypeId || "",
            receivedDate: lead?.receivedDate || "",

            // ── Unified-entity (project) fields ───────────────────────────────
            isProject,
            entityPhase: getProjectPhase(lead),
            isDelayed: isDelayedProject(lead),
            projectId: lead?.projectId || project?.id || "",
            projectPrefix: project?.prefix || "",
            projectStatus: project?.status || null,
            projectStartDate: project?.startDate || "",
            projectEndDate: project?.endDate || "",
            projectManagerId: project?.projectManagerId || "",
            projectTeamName: project?.team?.name || "",
            projectTeams: project?.projectTeams || [],
            projectCompanyMappings: project?.projectCompanyMappings || [],
            projectCost: parseFloat(project?.cost) || 0,
            projectRate: parseFloat(project?.rate) || 0,
            projectServiceId: project?.serviceId || "",
            projectCategoryId: project?.projectCategoryId || "",
            projectCountry: project?.country || "",
            projectState: project?.state || "",
            projectCity: project?.city || "",
            projectIsLive: project?.isLive || false,
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

  // ── Event bus subscriptions ───────────────────────────────────────────────────
  useEventBus(EVENT_KEYS.leadCreated, fetchAllData);
  useEventBus(EVENT_KEYS.leadUpdated, fetchAllData);
  useEventBus(EVENT_KEYS.leadDeleted, fetchAllData);
  useEventBus(EVENT_KEYS.projectCreated, fetchAllData);
  useEventBus(EVENT_KEYS.projectUpdated, fetchAllData);
  useEventBus(EVENT_KEYS.chartSettingsUpdated, fetchAllData);

  const isDrillDown = !!(
    statusId ||
    serviceId ||
    categoryId ||
    referralId ||
    sourceId ||
    subCategoryId ||
    companyTypeId ||
    topLeadsId ||
    locationId ||
    monthlyStatusId ||
    teamId ||
    monthlyCompanyTypeId ||
    projectCompanyTypeId ||
    receivedOnly
  );

  const projectColumnsActive = isProjectView(view) || (isDrillDown && entityScope === "project");

  // ── Columns ──────────────────────────────────────────────────────────────────
  const columns = useMemo(() => {
    const base: any[] = [
      {
        accessorKey: "inquiryDate",
        header: "Inquiry Date",
        size: 150,
        Cell: ({ cell }: { cell: any }) => {
          const v = cell.getValue();
          return v ? dayjs(v).format("DD-MM-YYYY") : "N/A";
        },
      },
      {
        accessorKey: "prefix",
        header: "Inquiry Id",
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
        header: "Name",
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
      // Stage badge only in mixed views — project views are 100% projects and
      // lead view is 100% leads, so the column would be noise there.
      ...(view === "all"
        ? [
          {
            accessorKey: "isProject",
            header: "Stage",
            size: 170,
            Cell: ({ row }: { row: any }) => <StageBadge row={row.original} />,
          },
        ]
        : []),
      {
        accessorKey: "totalCost",
        header: "Total Cost",
        size: 120,
        Cell: ({ cell }: { cell: any }) => {
          const v = cell.getValue();
          return v !== undefined ? `₹${Number(v).toLocaleString()}` : "₹0";
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
        accessorKey: "subCategory",
        header: "Sub Category",
        size: 150,
        Cell: ({ cell }: { cell: any }) =>
          projectSubcategories?.find((s: any) => s.id === cell.getValue())?.name || "N/A",
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
        accessorKey: "assignedTo",
        header: "Assigned To",
        size: 150,
        Cell: ({ cell }: { cell: any }) =>
          allemployees?.find((e: any) => e.employeeId === cell.getValue())?.employeeName || "N/A",
      },
    ];

    // Lead-pipeline-only columns: hidden in project views to avoid clutter.
    const leadOnly: any[] = projectColumnsActive
      ? []
      : [
        {
          accessorKey: "receivedDate",
          header: "Received Date",
          size: 150,
          Cell: ({ cell }: { cell: any }) => {
            const v = cell.getValue();
            return v ? dayjs(v).format("DD-MM-YYYY") : "N/A";
          },
        },
        {
          accessorKey: "poStatus",
          header: "PO Status",
          size: 130,
          Cell: ({ row }: any) => {
            const poStatus = row?.original?.poStatus;
            if (!row?.original?.isProject || !poStatus) return <span>N/A</span>;
            const color = poStatus === "Received" ? "#28A745" : "#FFC107";
            return (
              <div
                className="badge badge-light"
                style={{ backgroundColor: color, color: poStatus === "Received" ? "white" : "#333" }}
              >
                {poStatus}
              </div>
            );
          },
        },
        {
          accessorKey: "leadSource",
          header: "Source",
          size: 140,
          Cell: ({ cell }: { cell: any }) => cell.getValue() || "N/A",
        },
      ];

    // Project columns: revealed only when the active view contains projects.
    const projectCols: any[] = projectColumnsActive
      ? [
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
          accessorKey: "projectStatus",
          header: "Project Status",
          size: 150,
          Cell: ({ row }: any) => {
            const st = row?.original?.projectStatus;
            return st?.name ? (
              <div className="badge badge-light" style={{ backgroundColor: st.color || "#64748B", color: "white" }}>
                {st.name}
              </div>
            ) : (
              "N/A"
            );
          },
        },
        {
          accessorKey: "projectStartDate",
          header: "Start Date",
          size: 140,
          Cell: ({ cell }: { cell: any }) => {
            const v = cell.getValue();
            return v ? dayjs(v).format("DD-MM-YYYY") : "N/A";
          },
        },
        {
          accessorKey: "projectEndDate",
          header: "Expected Closure",
          size: 150,
          Cell: ({ row }: { row: any }) => {
            const v = row.original.projectEndDate;
            if (!v) return "N/A";
            return (
              <span style={{ color: row.original.isDelayed ? "#D92D20" : undefined, fontWeight: row.original.isDelayed ? 600 : undefined }}>
                {dayjs(v).format("DD-MM-YYYY")}
                {row.original.isDelayed ? " ⚠" : ""}
              </span>
            );
          },
        },
        {
          accessorKey: "projectManagerId",
          header: "Project Manager",
          size: 160,
          Cell: ({ cell }: { cell: any }) =>
            allemployees?.find((e: any) => e.employeeId === cell.getValue())?.employeeName || "N/A",
        },
        {
          accessorKey: "projectTeamName",
          header: "Team",
          size: 140,
          Cell: ({ cell }: { cell: any }) => cell.getValue() || "N/A",
        },
        {
          accessorKey: "projectCost",
          header: "Project Cost",
          size: 130,
          Cell: ({ cell }: { cell: any }) =>
            cell.getValue() ? `₹${Number(cell.getValue()).toLocaleString()}` : "₹0",
        },
        {
          accessorKey: "projectRate",
          header: "Rate",
          size: 110,
          Cell: ({ cell }: { cell: any }) =>
            cell.getValue() ? `₹${Number(cell.getValue()).toLocaleString()}` : "N/A",
        },
        {
          accessorKey: "duration",
          header: "Timeline",
          size: 120,
          Cell: ({ cell }: { cell: any }) => cell.getValue() || "N/A",
        },
      ]
      : [];

    const tail: any[] = [
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
    ];

    const actions: any[] = isDrillDown
      ? []
      : [
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

    return [...base, ...leadOnly, ...projectCols, ...tail, ...actions];
  }, [view, projectColumnsActive, isDrillDown, projectServices, projectCategories, projectSubcategories, allemployees, rawLeadsDatas]);

  // ── Handlers ──────────────────────────────────────────────────────────────────
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

  // ── Export columns (adapt to view) ───────────────────────────────────────────
  const exportColumns = useMemo(() => {
    const base = [
      { key: 'inquiryDate', header: 'Inquiry Date', type: 'text' as const },
      { key: 'prefix', header: 'Inquiry ID', type: 'text' as const },
      { key: 'projectName', header: 'Name', type: 'text' as const },
      { key: 'totalCost', header: 'Total Cost', type: 'currency' as const, showTotal: true },
      { key: 'client', header: 'Client', type: 'text' as const },
      { key: 'contact', header: 'Contact', type: 'text' as const },
      { key: 'service', header: 'Service', type: 'text' as const },
      { key: 'category', header: 'Category', type: 'text' as const },
      { key: 'subCategory', header: 'Sub Category', type: 'text' as const },
      {
        key: 'status', header: 'Lead Status', type: 'text' as const,
        format: (val: any) => val?.name || String(val || ''),
      },
      { key: 'assignedTo', header: 'Assigned To', type: 'text' as const },
    ];
    const projectPart = projectColumnsActive
      ? [
        { key: 'projectPrefix', header: 'Project Number', type: 'text' as const },
        {
          key: 'projectStatus', header: 'Project Status', type: 'text' as const,
          format: (val: any) => val?.name || String(val || ''),
        },
        { key: 'projectStartDate', header: 'Start Date', type: 'text' as const },
        { key: 'projectEndDate', header: 'Expected Closure', type: 'text' as const },
        { key: 'projectCost', header: 'Project Cost', type: 'currency' as const, showTotal: true },
        { key: 'projectRate', header: 'Rate', type: 'currency' as const },
        { key: 'projectTeamName', header: 'Team', type: 'text' as const },
      ]
      : [
        { key: 'receivedDate', header: 'Received Date', type: 'text' as const },
        { key: 'poStatus', header: 'PO Status', type: 'text' as const },
        { key: 'leadSource', header: 'Source', type: 'text' as const },
      ];
    const tail = [
      { key: 'country', header: 'Country', type: 'text' as const },
      { key: 'state', header: 'State', type: 'text' as const },
      { key: 'city', header: 'City', type: 'text' as const },
      { key: 'area', header: 'Area', type: 'text' as const },
      { key: 'createdAt', header: 'Created Date', type: 'text' as const },
    ];
    return [...base, ...projectPart, ...tail];
  }, [projectColumnsActive]);

  if (loading) return <Loader />;

  // ── Prop-driven (drill-down) filters ─────────────────────────────────────────
  const startDates = startDate ? dayjs(startDate) : null;
  const endDates = endDate ? dayjs(endDate) : null;

  const propDateFiltered = tableData?.filter((item: any) => {
    const d = dayjs(item.createdAt);
    if (startDates && d.isBefore(startDates.startOf("day"))) return false;
    if (endDates && d.isAfter(endDates.endOf("day"))) return false;
    return true;
  });

  const filteredByProps = (() => {
    if (!isDrillDown && !startDates && !endDates) return tableData;

    const scopeProject = entityScope === "project";
    let rows = propDateFiltered;

    // Project-scoped drill-downs only ever show project entities.
    if (scopeProject) rows = rows?.filter((item: any) => item.isProject);

    // Project section (Received Leads) drill-downs: restrict to received/project leads
    // while keeping lead-scoped dimension matching (status/service/category ids from lead analytics).
    if (receivedOnly) rows = rows?.filter((item: any) => item.isProject);

    if (statusId)
      rows = rows?.filter((item: any) =>
        scopeProject ? item.projectStatus?.id === statusId : item.status?.id === statusId,
      );
    if (serviceId)
      rows = rows?.filter((item: any) =>
        scopeProject ? item.projectServiceId === serviceId : item.service === serviceId,
      );
    if (categoryId)
      rows = rows?.filter((item: any) =>
        scopeProject ? item.projectCategoryId === categoryId : item.category === categoryId,
      );
    if (referralId)
      rows = rows?.filter((item: any) =>
        item.referrals?.some((r: any) => r.referralTypeId === referralId),
      );
    if (sourceId)
      rows = rows?.filter(
        (item: any) => item.leadSource?.toLowerCase() === sourceId?.toLowerCase(),
      );
    if (subCategoryId)
      rows = rows?.filter((item: any) => item.subCategory === subCategoryId);
    if (companyTypeId)
      rows = rows?.filter((item: any) =>
        scopeProject
          ? item.projectCompanyMappings?.some((m: any) => m.companyTypeId === companyTypeId)
          : item.companyType === companyTypeId,
      );
    if (teamId)
      rows = rows?.filter((item: any) =>
        item.projectTeams?.some((t: any) => t.teamId === teamId),
      );
    if (monthlyCompanyTypeId)
      rows = rows?.filter((item: any) =>
        item.projectCompanyMappings?.some((m: any) => m.companyTypeId === monthlyCompanyTypeId),
      );
    if (topLeadsId?.length)
      rows = tableData?.filter((item: any) =>
        topLeadsId.includes(String(item.id).trim()) ||
        (item.projectId && topLeadsId.includes(String(item.projectId).trim())),
      );
    if (locationId) {
      rows = rows?.filter((item: any) => {
        if (locationId.toLowerCase() !== "unknown") {
          return (
            item.countryId?.toString() === locationId ||
            item.stateId?.toString() === locationId ||
            item.cityId?.toString() === locationId ||
            item.country?.toLowerCase() === locationId.toLowerCase() ||
            item.state?.toLowerCase() === locationId.toLowerCase() ||
            item.city?.toLowerCase() === locationId.toLowerCase() ||
            item.projectCountry?.toLowerCase() === locationId.toLowerCase() ||
            item.projectState?.toLowerCase() === locationId.toLowerCase() ||
            item.projectCity?.toLowerCase() === locationId.toLowerCase()
          );
        }
        return !(
          item.countryId || item.stateId || item.cityId ||
          item.country || item.state || item.city
        );
      });
    }
    if (monthlyStatusName && monthlyStatusId) {
      rows = rows?.filter(
        (item: any) =>
          dayjs(item.createdAt).format("MMMM") === monthlyStatusName &&
          (scopeProject
            ? item.projectStatus?.name === monthlyStatusId
            : item.status?.name === monthlyStatusId),
      );
    }
    if (projectCompanyTypeId && projectCompanyTypeName) {
      rows = rows?.filter(
        (item: any) =>
          dayjs(item.createdAt).format("MMMM") === projectCompanyTypeName &&
          item.projectCompanyMappings?.some((m: any) => m.companyTypeId === projectCompanyTypeId),
      );
    }
    return rows;
  })();

  // ── View + quick filters (AND) ────────────────────────────────────────────────
  const quickFilteredData = filteredByProps?.filter((item: any) => {
    // 1. View tab
    if (!matchesView(item, view)) return false;

    // 2. Period
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

    // 3. Quick selects
    const statusMatch = statusFilter
      ? item.status?.name?.toLowerCase() === statusFilter.toLowerCase()
      : true;
    const assignedMatch = assignedToFilter
      ? assignedToFilter === "__NA__"
        ? !item.assignedTo
        : item.assignedTo === assignedToFilter
      : true;
    const projectStatusMatch = projectStatusFilter
      ? item.projectStatus?.id === projectStatusFilter
      : true;
    const projectManagerMatch = projectManagerFilter
      ? item.projectManagerId === projectManagerFilter
      : true;

    // 4. Search
    let searchMatch = true;
    if (searchText) {
      const q = searchText.toLowerCase();
      const employeeName = allemployees?.find((e: any) => e.employeeId === item.assignedTo)?.employeeName || "";
      const pmName = allemployees?.find((e: any) => e.employeeId === item.projectManagerId)?.employeeName || "";
      const serviceName = projectServices?.find((s: any) => s.id === item.service)?.name || "";
      const categoryName = projectCategories?.find((c: any) => c.id === item.category)?.name || "";
      const subCategoryName = projectSubcategories?.find((s: any) => s.id === item.subCategory)?.name || "";

      searchMatch =
        String(item.projectName || "").toLowerCase().includes(q) ||
        String(item.prefix || "").toLowerCase().includes(q) ||
        String(item.projectPrefix || "").toLowerCase().includes(q) ||
        String(item.client || "").toLowerCase().includes(q) ||
        String(item.contact || "").toLowerCase().includes(q) ||
        String(item.status?.name || "").toLowerCase().includes(q) ||
        String(item.projectStatus?.name || "").toLowerCase().includes(q) ||
        String(employeeName).toLowerCase().includes(q) ||
        String(pmName).toLowerCase().includes(q) ||
        String(serviceName).toLowerCase().includes(q) ||
        String(categoryName).toLowerCase().includes(q) ||
        String(subCategoryName).toLowerCase().includes(q) ||
        String(item.city || "").toLowerCase().includes(q) ||
        String(item.state || "").toLowerCase().includes(q) ||
        String(item.country || "").toLowerCase().includes(q) ||
        String(item.area || "").toLowerCase().includes(q);
    }

    return dateMatch && statusMatch && assignedMatch && projectStatusMatch && projectManagerMatch && searchMatch;
  });

  const hasAnyFilter = statusFilter || assignedToFilter || searchText || projectStatusFilter || projectManagerFilter;
  const clearAllFilters = () => {
    setStatusFilter("");
    setAssignedToFilter("");
    setSearchText("");
    setProjectStatusFilter("");
    setProjectManagerFilter("");
  };

  // ── View tab counts (after prop filters, before view/quick filters) ──────────
  // Plain computation, NOT a hook: this sits below the `if (loading)` early
  // return, where calling hooks would violate the rules of hooks.
  const viewCounts = (() => {
    const counts: Record<EntityView, number> = {
      all: 0, leads: 0, projects: 0, ongoing: 0, completed: 0, onhold: 0,
    };
    (filteredByProps || []).forEach((item: any) => {
      ENTITY_VIEWS.forEach(({ key }) => {
        if (matchesView(item, key)) counts[key]++;
      });
    });
    return counts;
  })();

  // ── KPI totals ────────────────────────────────────────────────────────────────
  const totalFilteredCost = (quickFilteredData ?? []).reduce(
    (acc: number, item: any) =>
      acc + (projectColumnsActive && item.projectCost
        ? item.projectCost
        : parseFloat(item.totalCost) || parseFloat(item.cost) || 0),
    0,
  );

  // ── Shared styles ─────────────────────────────────────────────────────────────
  const FILTER_HEIGHT = "32px";

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

  // Row tint: project phase wins for project rows, lead-status color otherwise.
  const rowBackground = (row: any) => {
    if (row?.isProject) {
      if (row.isDelayed) return "#FFF1F320";
      const t = PHASE_THEMES[row.entityPhase as keyof typeof PHASE_THEMES];
      return t ? `${t.bg}` : `${row?.status?.color}20`;
    }
    return `${row?.status?.color}20`;
  };

  return (
    <>
      <Box sx={{ p: { xs: 2, md: 3 }, background: '#fff', borderBottom: '1px solid #F1F5F9' }}>
        {/* --- ROW 1: PRIMARY TOOLBAR --- */}
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
              Leads & Projects
            </h1>
            <p style={{ color: '#64748B', margin: 0, fontSize: '12px', fontWeight: 500 }}>
              One pipeline — every inquiry, and the projects they become
            </p>
          </div>

          {!isDrillDown && (
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
          )}
        </div>

        {/* --- ROW 2: VIEW TABS --- */}
        <div style={{
          display: "flex",
          gap: "4px",
          marginBottom: "14px",
          overflowX: "auto",
          scrollbarWidth: "none",
          borderBottom: "1px solid #F1F5F9",
        }}>
          {ENTITY_VIEWS.map(({ key, label }) => {
            const active = view === key;
            return (
              <button
                key={key}
                onClick={() => setView(key)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: active ? "2px solid #AA393D" : "2px solid transparent",
                  color: active ? "#AA393D" : "#64748B",
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: active ? 700 : 500,
                  fontFamily: "Inter, sans-serif",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "color 0.15s ease",
                }}
              >
                {label}
                <span style={{
                  background: active ? "rgba(170,57,61,0.1)" : "#F1F5F9",
                  color: active ? "#AA393D" : "#64748B",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "1px 8px",
                }}>
                  {viewCounts[key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom missing-date hint */}
        {alignment === "custom" && (!customStartDate || !customEndDate) && (
          <div className="d-flex justify-content-center my-2">
            <div
              className="text-center p-2"
              style={{ background: "#FEF2F2", borderRadius: "6px", border: "1px solid #FEE2E2", maxWidth: 420, width: "100%" }}
            >
              <h6 style={{ fontFamily: "Inter", fontWeight: 600, color: "#AA393D", fontSize: "12px", marginBottom: "2px" }}>
                Custom Date Range
              </h6>
              <p className="mb-0" style={{ fontSize: "11px", color: "#64748B" }}>
                Please select both <strong>Start Date</strong> and <strong>End Date</strong> to query custom period.
              </p>
            </div>
          </div>
        )}

        {/* --- ROW 3: COMPACT FILTER TOOLBAR --- */}
        {!isDrillDown && (
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
              {/* Period Selector Tabs */}
              <div style={{
                display: "flex",
                background: "#F1F5F9",
                borderRadius: "6px",
                padding: "2px",
                gap: "2px",
              }}>
                <TimePeriodSelector
                  value={alignment as TimePeriodMode}
                  onChange={(mode) => handleAlignmentChange({} as any, mode)}
                  isMobile={isMobile}
                  variant="light"
                />
              </div>

              {/* Date Nav */}
              {alignment === "daily" && (
                <NavigationButtons
                  onPrev={() => navigateDay("prev")}
                  onNext={() => navigateDay("next")}
                  displayText={day.format("DD MMM, YYYY")}
                  isMobile={isMobile}
                />
              )}
              {alignment === "weekly" && (
                <NavigationButtons
                  onPrev={() => navigateWeek("prev")}
                  onNext={() => navigateWeek("next")}
                  displayText={`${weekStart.format("DD MMM")} - ${weekEnd.format("DD MMM")}`}
                  isMobile={isMobile}
                />
              )}
              {alignment === "monthly" && (
                <NavigationButtons
                  onPrev={() => navigateMonth("prev")}
                  onNext={() => navigateMonth("next")}
                  displayText={`${monthStart.format("MMMM YYYY")}`}
                  isMobile={isMobile}
                />
              )}
              {alignment === "yearly" && yearStart && yearEnd && (
                <NavigationButtons
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
                        <span
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setStatusFilter("");
                          }}
                          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", color: "#AA393D", fontSize: 9, fontWeight: 700, cursor: "pointer" }}
                        >
                          ✕
                        </span>
                      </span>
                    );
                  }}
                  MenuProps={menuSx}
                >
                  <MenuItem value="" sx={{ color: "#94A3B8", fontSize: "12px" }}>
                    All Statuses
                  </MenuItem>
                  {leadStatuses.map((st: any) => (
                    <MenuItem key={st.id} value={st.name} sx={{ fontSize: "12px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: st.color, display: "inline-block", flexShrink: 0 }} />
                        {st.name}
                        {st.isProjectTrigger && (
                          <span style={{ marginLeft: "auto", fontSize: "9px", fontWeight: 700, color: "#0A5C2A", background: "#EDFDF3", borderRadius: "999px", padding: "1px 6px" }}>
                            PROJECT
                          </span>
                        )}
                      </span>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Project Status Filter — only in project views */}
              {projectColumnsActive && projectStatuses.length > 0 && (
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
                        <span style={{ fontFamily: "Inter", fontSize: "12px", fontWeight: 500, color: "#AA393D" }}>
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

              {/* Project Manager Filter — only in project views */}
              {projectColumnsActive && projectManagerOptions.length > 0 && (
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
                        <span style={{ fontFamily: "Inter", fontSize: "12px", fontWeight: 500, color: "#AA393D" }}>
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

              {/* Assigned To Autocomplete */}
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
                    {emp.employeeId === "__NA__" ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                        <span style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, backgroundColor: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", color: "#999", fontWeight: 700 }}>
                          N/A
                        </span>
                        <span style={{ fontFamily: "Inter", fontSize: "12px", color: "#888" }}>
                          N/A — UNASSIGNED
                        </span>
                      </span>
                    ) : (
                      <span style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                        <img
                          src={emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.employeeName)}&size=32&background=random`}
                          alt=""
                          style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", flexShrink: 0, filter: emp.isInactive ? "grayscale(60%)" : "none" }}
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.employeeName)}`; }}
                        />
                        <span style={{ fontFamily: "Inter", fontSize: "12px" }}>
                          {emp.isInactive ? `${emp.employeeName} (Inactive)` : emp.employeeName}
                        </span>
                      </span>
                    )}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Assigned To"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: assignedToFilter ? (
                        <InputAdornment position="start" sx={{ ml: "4px", mr: 0 }}>
                          {assignedToFilter === "__NA__" ? (
                            <span style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: "#f0f0f0", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "7px", color: "#999", fontWeight: 700 }}>
                              N/A
                            </span>
                          ) : (
                            <img
                              src={assignedEmployeesFromLeads.find((e: any) => e.employeeId === assignedToFilter)?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(assignedEmployeesFromLeads.find((e: any) => e.employeeId === assignedToFilter)?.employeeName || "")}&size=24&background=random`}
                              alt=""
                              style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover", filter: assignedEmployeesFromLeads.find((e: any) => e.employeeId === assignedToFilter)?.isInactive ? "grayscale(60%)" : "none" }}
                            />
                          )}
                        </InputAdornment>
                      ) : undefined,
                    }}
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
                      "& .MuiOutlinedInput-input": {
                        padding: "0 4px !important",
                        fontFamily: "Inter",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: assignedToFilter ? "#AA393D" : "#1E293B",
                        "&::placeholder": {
                          color: "#94A3B8",
                          opacity: 1,
                          fontFamily: "Inter",
                          fontSize: "12px",
                          fontWeight: 500,
                        },
                      },
                      "& .MuiAutocomplete-endAdornment": {
                        right: "6px",
                        "& .MuiSvgIcon-root": {
                          color: assignedToFilter ? "#AA393D" : "#94A3B8",
                          fontSize: "16px",
                        },
                      },
                    }}
                  />
                )}
                slotProps={{
                  paper: {
                    sx: {
                      borderRadius: "8px",
                      mt: 0.5,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      "& .MuiAutocomplete-listbox": {
                        maxHeight: 280,
                        fontFamily: "Inter",
                        "& .MuiAutocomplete-option": {
                          fontSize: "12px",
                          "&:hover": { backgroundColor: "rgba(170,57,61,0.06)" },
                          '&[aria-selected="true"]': {
                            backgroundColor: "rgba(170,57,61,0.1)",
                            color: "#AA393D",
                            fontWeight: 600,
                          },
                        },
                      },
                    },
                  },
                }}
              />

              {/* Clear filters trigger */}
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

            {/* Right side: KPI summary */}
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
        )}
      </Box>

      <MaterialTable
        columns={columns}
        data={quickFilteredData}
        tableName={`EntityTable_${projectColumnsActive ? 'projects' : 'pipeline'}`}
        defaultSorting={[{ id: "inquiryDate", desc: true }]}
        renderExportActions={() => (
          <ExportButton
            data={quickFilteredData}
            columns={exportColumns}
            filename={projectColumnsActive ? "projects" : "leads-projects"}
            title="Leads & Projects"
            subtitle="Unified pipeline — inquiries and live projects"
            sheetName={projectColumnsActive ? "Projects" : "Pipeline"}
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
                borderLeft: row.original?.isProject
                  ? `3px solid ${PHASE_THEMES[row.original.entityPhase as keyof typeof PHASE_THEMES]?.fg || "#AA393D"} !important`
                  : "3px solid transparent !important",
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
                  borderLeftColor: `${row.original?.status?.color || "#AA393D"} !important`,
                },
              },
            },
            onClick: () =>
              navigate(`/employee/lead/${row.original.id}`, {
                state: { leadData: row.original.id },
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

export default EntityTablePage;
