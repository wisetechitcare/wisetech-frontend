import MaterialTable from "@app/modules/common/components/MaterialTable";
import ExportButton from "@app/modules/common/components/ExportButton";
import TimePeriodSelector, { TimePeriodMode } from "@app/modules/common/components/TimePeriodSelector";
import {
  Box,
  Button,
  MenuItem,
  Select,
  FormControl,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  useMediaQuery,
  Autocomplete,
  TextField,
  InputAdornment,
} from "@mui/material";
import { getAllLeadsComplete } from "@services/leads";
import { getMyLeadReminders } from "@services/leadService";
import { getMeetingLeadIds } from "@services/employee";
import { saveLeadPeriodPreference, getLeadPeriodPreference, getUserTablePreferences } from "@services/users";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SelectLeadOrganizationDialog from "./SelectLeadOrganizationDialog";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllLeadStatus } from "@services/lead";
import Loader from "@app/modules/common/utils/Loader";
import {
  deleteConfirmation,
  errorConfirmation,
  rejectConfirmation,
  successConfirmation,
} from "@utils/modal";
import LeadWizardModal from "./LeadWizardModal";
import dayjs, { Dayjs } from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import {
  getAllProjectServices,
  getAllProjectSubcategories,
  getAllProjectCategories,
} from "@services/projects";
import {
  fetchAllCountries,
  fetchAllStates,
  fetchAllCities,
} from "@services/options";
import { getAllClientCompanies, getAllCompanyTypes } from "@services/companies";
import { AppDispatch, RootState } from "@redux/store";
import { useDispatch, useSelector } from "react-redux";
import eventBus from "@utils/EventBus";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { fetchAllEmployeesAsync } from "@redux/slices/allEmployees";
import ChartVisibilitySettings from "@pages/company/settings/ChartVisibilitySettings";
import { PROJECT_CHART_SETTINGS_MODAL_TYPE } from "@constants/configurations-key";
import { Modal } from "react-bootstrap";
import { KTIcon, toAbsoluteUrl } from "@metronic/helpers";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import LeadBulkImport from "./LeadBulkImport";
import { useOrgScope } from "@hooks/useOrgScope";
import { ActionIconButton, toast } from "@app/modules/common/components/ui";
import LeadNoteDialog, { ReminderCell, REMINDER_COLUMN_WIDTH } from "./LeadNoteDialog";
import LeadActionPicker from "./LeadActionPicker";
// The SAME meeting dialog the calendar and the project board use. A second form here is how
// the app would end up with two ways to book an hour that disagree about what an hour needs.
import MeetingDialog from "@pages/employee/MeetingDialog";

/**
 * Leads created before organizations existed carry no organizationId. They are
 * shown and filtered as "Unassigned" rather than hidden — the sentinel is only a
 * filter value, never written to a lead.
 */
const UNASSIGNED_ORG_VALUE = "__unassigned__";
const UNASSIGNED_ORG_LABEL = "Unassigned";

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

type LeadNewLeadProps = {
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
  startDate?: dayjs.Dayjs;
  endDate?: dayjs.Dayjs;
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
      style={{
        width: "24px",
        height: "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        borderRadius: "4px"
      }}
    >
      <img src={toAbsoluteUrl("media/svg/misc/back.svg")} alt="Previous" style={{ width: "12px", height: "12px" }} />
    </button>
    <span
      className="mx-2"
      style={{
        fontSize: "12px",
        fontFamily: "Inter, sans-serif",
        fontWeight: 600,
        color: "#1E293B",
        whiteSpace: "nowrap",
        textAlign: "center",
        flex: isMobile ? 1 : "none"
      }}
    >
      {displayText}
    </span>
    <button
      className="btn btn-sm p-0"
      onClick={onNext}
      style={{
        width: "24px",
        height: "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        borderRadius: "4px"
      }}
    >
      <img src={toAbsoluteUrl("media/svg/misc/next.svg")} alt="Next" style={{ width: "12px", height: "12px" }} />
    </button>
  </div>
);

// All selectable leads-table column keys (must match the `accessorKey`s below and the

const LeadNewLead: React.FC<LeadNewLeadProps> = ({
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
  startDate,
  endDate,
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const today = dayjs();

  // ── Responsive ──────────────────────────────────────────────────────────────
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // ── Data state ──────────────────────────────────────────────────────────────
  // New leads pick their organization before the wizard opens — it decides the
  // lead's prefix and number series.
  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const [formValues, setFormValues] = useState<any>(null);
  // Lookup maps to resolve the File Location columns (which store company / company-type
  // IDs) into human-readable names.
  const [fileLocCompanyMap, setFileLocCompanyMap] = useState<Map<string, string>>(new Map());
  const [fileLocTypeMap, setFileLocTypeMap] = useState<Map<string, string>>(new Map());
  const [showChartSettingsModal, setShowChartSettingsModal] = useState(false);
  // ── Bulk import state (from file 2) ─────────────────────────────────────────
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [pagination] = useState({ pageIndex: 0, pageSize: 10 });

  // ── Per-row actions: the reminder note and the meeting ──────────────────────
  // Each holds the ROW the icon was clicked on, not just its id — both dialogs need the
  // lead's name and existing note, which the table already has in hand. `null` = closed.
  const [noteLead, setNoteLead] = useState<any>(null);
  const [meetingLead, setMeetingLead] = useState<any>(null);
  /** The lead whose `+` was pressed with BOTH actions still missing. */
  const [pickerLead, setPickerLead] = useState<any>(null);


  // ── Date mode ────────────────────────────────────────────────────────────────
  const [alignment, setAlignment] = useState<DateMode>("monthly");
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Daily
  const [day, setDay] = useState<Dayjs>(today);

  // Weekly
  const [weekStart, setWeekStart] = useState<Dayjs>(() => {
    const dow = today.day();
    return dow === 0
      ? today.subtract(6, "day")
      : today.subtract(dow - 1, "day");
  });
  const [weekEnd, setWeekEnd] = useState<Dayjs>(() => {
    const dow = today.day();
    const ws =
      dow === 0 ? today.subtract(6, "day") : today.subtract(dow - 1, "day");
    return ws.add(6, "day");
  });

  // Monthly
  const [monthStart, setMonthStart] = useState<Dayjs>(today.startOf("month"));
  const [monthEnd, setMonthEnd] = useState<Dayjs>(today.endOf("month"));

  // Yearly (fiscal)
  const [yearStart, setYearStart] = useState<Dayjs | null>(null);
  const [yearEnd, setYearEnd] = useState<Dayjs | null>(null);
  const [fiscalYearDisplay, setFiscalYearDisplay] = useState("");

  // Custom
  const [customStartDate, setCustomStartDate] = useState<Dayjs | undefined>(
    undefined,
  );
  const [customEndDate, setCustomEndDate] = useState<Dayjs | undefined>(
    undefined,
  );

  // ── Status & assigned filters ────────────────────────────────────────────────
  // The URL holds them, so opening a lead and coming back restores the list you
  // left instead of resetting to "all". The URL is the only copy: no useState
  // mirror and no syncing effect, which is the loop useTableFilters documents.
  // Written with replace so filtering never stacks history entries.
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "";
  // Empty = all organizations; UNASSIGNED_ORG_VALUE = leads that predate them.
  const organizationFilter = searchParams.get("org") || "";
  const assignedToFilter = searchParams.get("assignee") || "";
  const setFilterParam = useCallback(
    (key: string, value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  const setStatusFilter = useCallback((v: string) => setFilterParam("status", v), [setFilterParam]);
  const setOrganizationFilter = useCallback((v: string) => setFilterParam("org", v), [setFilterParam]);
  const setAssignedToFilter = useCallback((v: string) => setFilterParam("assignee", v), [setFilterParam]);
  const { organizations: leadOrganizations } = useOrgScope({
    includeAll: false,
    initialScopeId: "",
  });

  // ── Redux ────────────────────────────────────────────────────────────────────
  const allemployees = useSelector(
    (state: RootState) => state.allEmployees?.list,
  );
  const currentEmployeeId = useSelector(
    (state: RootState) => state.employee?.currentEmployee?.id,
  );

  // ── Screen data ──────────────────────────────────────────────────────────────
  // One cached query instead of six pieces of state filled by a mount effect.
  // Returning from a lead detail page re-renders straight from the cache: no
  // spinner, no request storm, the rows are simply still there.
  // `loadLeadsScreen` is a hoisted function declaration further down — the rows
  // it returns are read all over the body above it.
  // Named once and reused by the two in-place row patches below. A second literal spelling
  // of this key would be a patch that writes to a cache entry nothing reads.
  const leadsScreenKey = ["leads-screen", currentEmployeeId];
  const queryClient = useQueryClient();
  const { data: leadsScreen, isPending, refetch } = useQuery({
    queryKey: leadsScreenKey,
    queryFn: loadLeadsScreen,
  });

  /**
   * Change one field on one row, without going back to the server.
   *
   * Folds a saved reminder, or a newly booked meeting, back into the row it belongs to.
   * A stable identity, so the memoised column definitions can close over it without going
   * stale and without rebuilding the column model.
   *
   * The rows live in the query cache now rather than in component state, so this writes
   * there — same intent as the `setTableData` it replaces, same reason: `refetch` pulls every
   * lead plus its country/state/city lookups, which is a full reload of the screen to show
   * one edited sentence, and it loses the table's scroll position doing it.
   */
  const patchCachedRow = useCallback(
    (leadId: string, patch: Record<string, any>) => {
      queryClient.setQueryData(leadsScreenKey, (prev: any) => (prev ? {
        ...prev,
        leads: prev.leads.map((r: any) => (r.id === leadId ? { ...r, ...patch } : r)),
      } : prev));
    },
    // The key is rebuilt each render; its CONTENT is what matters, so depend on that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, currentEmployeeId],
  );
  const fetchAllData = refetch;
  const tableData: any[] = leadsScreen?.leads || [];
  const rawLeadsDatas: any[] = leadsScreen?.rawLeads || [];
  const projectServices: any[] = leadsScreen?.projectServices || [];
  const projectSubcategories: any[] = leadsScreen?.projectSubcategories || [];
  const projectCategories: any[] = leadsScreen?.projectCategories || [];
  const leadStatuses: any[] = leadsScreen?.leadStatuses || [];
  // Only the first ever load blanks the screen. A background revalidation keeps
  // the rows up, which is the whole point of coming back to a warm cache.
  const loading = isPending;
  const rawLeadsData = rawLeadsDatas;

  // Derive assigned-to employees directly from lead data so new assignees appear automatically.
  const NA_OPTION = { employeeId: "__NA__", employeeName: "N/A", avatar: "" };

  const assignedEmployeesFromLeads = useMemo(() => {
    const assignedIds = new Set(
      tableData.map((l: any) => l.assignedTo).filter(Boolean),
    );
    const matched = (allemployees || []).filter((e: any) =>
      assignedIds.has(e.employeeId),
    );
    return [...matched]
      .sort((a: any, b: any) => a.employeeName.localeCompare(b.employeeName))
      .map((e: any) => ({
        ...e,
        displayName:
          e.isActive === false
            ? `${e.employeeName} (Inactive)`
            : e.employeeName,
        isInactive: e.isActive === false,
      }));
  }, [tableData, allemployees]);

  const hasUnassignedLeads = useMemo(
    () => tableData.some((l: any) => !l.assignedTo),
    [tableData],
  );

  const assignedToOptions = useMemo(
    () =>
      hasUnassignedLeads
        ? [NA_OPTION, ...assignedEmployeesFromLeads]
        : assignedEmployeesFromLeads,
    [hasUnassignedLeads, assignedEmployeesFromLeads],
  );

  // ── Fiscal year init ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function initFiscalYear() {
      try {
        const { startDate: sd, endDate: ed } =
          await generateFiscalYearFromGivenYear(today);
        const fs = dayjs(sd);
        const fe = dayjs(ed);
        setYearStart(fs);
        setYearEnd(fe);
        setFiscalYearDisplay(
          `${fs.format("YYYY")} - ${fe.format("YYYY")}`,
        );
      } catch {
        const year = today.month() >= 3 ? today.year() : today.year() - 1;
        const fs = dayjs(`${year}-04-01`);
        const fe = dayjs(`${year + 1}-03-31`);
        setYearStart(fs);
        setYearEnd(fe);
        setFiscalYearDisplay(
          `${fs.format("YYYY")} - ${fe.format("YYYY")}`,
        );
      }
    }
    initFiscalYear();
  }, []);

  // ── Navigation handlers ──────────────────────────────────────────────────────
  const navigateDay = useCallback((dir: "prev" | "next") => {
    setDay((prev) =>
      dir === "prev" ? prev.subtract(1, "day") : prev.add(1, "day"),
    );
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
        const { startDate: sd, endDate: ed } =
          await generateFiscalYearFromGivenYear(base);
        const fs = dayjs(sd);
        const fe = dayjs(ed);
        setYearStart(fs);
        setYearEnd(fe);
        setFiscalYearDisplay(
          `${fs.format("YYYY")} - ${fe.format("YYYY")}`,
        );
      } catch {
        const year = base.month() >= 3 ? base.year() : base.year() - 1;
        const fs = dayjs(`${year}-04-01`);
        const fe = dayjs(`${year + 1}-03-31`);
        setYearStart(fs);
        setYearEnd(fe);
        setFiscalYearDisplay(
          `${fs.format("YYYY")} - ${fe.format("YYYY")}`,
        );
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
      // 1. Try local storage first
      const localPref = localStorage.getItem("leadPeriodPreference") as DateMode | null;
      if (localPref) {
        setAlignment(localPref);
      }

      // 2. Fetch from redis
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

  // Returns the whole screen's payload instead of writing six pieces of state, so
  // React Query can cache it. Declared as a function so the useQuery call near the
  // top of the component — above every reader of its rows — can name it.
  async function loadLeadsScreen() {
      // MY reminders and which leads have a meeting, fetched BESIDE the leads rather than
      // joined onto them. The leads list is the heaviest read in the app and is shared by the
      // dashboard, the drill-downs and the exports — making it viewer-dependent to serve one
      // column would cost all of them. Safe to cache because the query key carries
      // currentEmployeeId, so one person's reminders can never be served to another.
      //
      // Both are best-effort. A failure in either is not a failure of the page: the table
      // still lists every lead, with the Reminder column simply empty and the Action column
      // offering `+` everywhere — wrong, but not broken.
      const [leadsResponse, remindersResponse, meetingLeadsResponse] = await Promise.all([
        getAllLeadsComplete(),
        getMyLeadReminders().catch((e) => {
          console.warn("Could not load your reminders", e);
          return null;
        }),
        getMeetingLeadIds().catch((e) => {
          console.warn("Could not load which leads have meetings", e);
          return null;
        }),
      ]);
      const leadsWithMeetings = new Set<string>(
        (meetingLeadsResponse?.data?.leadIds || []).map(String),
      );
      const leadsData = leadsResponse?.data?.data?.leads || [];
      // ONE `.data` LESS THAN THE LEADS ABOVE, and that is not a typo.
      //
      // The two calls come from different clients. `services/leads.ts` uses raw axios and
      // returns the whole axios response, so the envelope is at `.data` and the payload at
      // `.data.data`. `leadService.ts` goes through `api`, whose helpers already return
      // `r.data` — so what resolves here IS the envelope, and the payload is at `.data`.
      //
      // Read the deeper way, this silently yields `undefined`: every save appeared to work,
      // the row updated in place, and the reminder vanished on the next load.
      const reminderByLead = new Map<string, { note: string; color: string | null }>(
        (remindersResponse?.data?.reminders || []).map(
          (r: any) => [String(r.leadId), { note: r.note, color: r.color }] as const,
        ),
      );

      const [servicesRes, subcatRes, catRes, statusRes, countriesData] =
        await Promise.all([
          getAllProjectServices(),
          getAllProjectSubcategories(),
          getAllProjectCategories(),
          getAllLeadStatus(),
          fetchAllCountries(),
        ]);
      const lookups = {
        rawLeads: leadsData,
        projectServices: servicesRes?.services || [],
        projectSubcategories: subcatRes?.projectSubCategories || [],
        projectCategories: catRes?.projectCategories || [],
        leadStatuses: statusRes?.leadStatuses || [],
      };

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
              uniqueStateIds
                .get(lead.additionalDetails.country)!
                .add(lead.additionalDetails.state);
              if (lead?.additionalDetails?.city) {
                if (!uniqueCityIds.has(lead.additionalDetails.state))
                  uniqueCityIds.set(lead.additionalDetails.state, new Set());
                uniqueCityIds
                  .get(lead.additionalDetails.state)!
                  .add(lead.additionalDetails.city);
              }
            }
          }
        });

        const countriesMap = new Map<string, any>();
        const statesMap = new Map<string, any>();
        const citiesMap = new Map<string, any>();
        (countriesData || []).forEach((c: any) =>
          countriesMap.set(c.id.toString(), c),
        );

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
            return s?.iso2 && c?.iso2
              ? fetchAllCities(c.iso2, s.iso2)
              : Promise.resolve([]);
          }),
        );
        let allCities: any[] = [];
        citiesResults.forEach((r) => {
          if (Array.isArray(r)) allCities = [...allCities, ...r];
        });
        allCities.forEach((c) => citiesMap.set(c.id.toString(), c));

        const transformedLeads = leadsData.map((lead: any) => {
          const s = lead?.project?.startDate
            ? new Date(lead.project.startDate)
            : null;
          const e = lead?.project?.endDate
            ? new Date(lead.project.endDate)
            : null;
          const duration =
            s && e
              ? `${Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))} days`
              : "N/A";
          const countryId = lead?.additionalDetails?.country || "";
          const stateId = lead?.additionalDetails?.state || "";
          const cityId = lead?.additionalDetails?.city || "";

          return {
            id: lead.id,
            prefix: lead?.prefix || "",
            organizationId: lead?.organizationId || "",
            // Leads created before organizations existed have none; the column
            // and filter both call that out rather than showing a blank cell.
            organization: lead?.organization?.name || UNASSIGNED_ORG_LABEL,
            projectName: lead.title || "",
            totalCost:
              Array.isArray(lead.commercials) && lead.commercials.length > 0
                ? lead.commercials.reduce(
                  (acc: number, c: any) => acc + (parseFloat(c.cost) || 0),
                  0,
                )
                : lead.budget || 0,
            client:
              lead?.company?.companyName ||
              lead?.leadTeams?.[0]?.company?.companyName ||
              "",
            service:
              lead?.projectServiceId || lead?.services?.[0]?.serviceId || "",
            category:
              lead?.projectCategoryId ||
              lead?.leadCategories?.[0]?.category?.id ||
              "",
            subCategory:
              lead?.projectSubCategoryId ||
              lead?.leadSubCategories?.[0]?.subcategory?.id ||
              "",
            status: lead?.status || null,
            poStatus: lead?.poStatus || null,
            assignedTo: lead?.assignedToId || "",
            inquiryDate: lead.inquiryDate || "",
            startDate: lead?.startDate || lead?.project?.startDate || "",
            endDate: lead?.endDate || "",
            duration,
            contact:
              lead?.contact?.fullName ||
              lead?.leadTeams?.[0]?.contact?.fullName ||
              "",
            createdAt: lead?.createdAt || "",
            createdBy: lead?.createdById || "",
            updatedBy: lead?.updatedById || "",
            country:
              countriesMap.get(String(countryId))?.name || String(countryId),
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
            cost:
              Array.isArray(lead.commercials) && lead.commercials.length > 0
                ? lead.commercials.reduce(
                  (acc: number, c: any) => acc + (parseFloat(c.cost) || 0),
                  0,
                )
                : 0,
            companyId: lead.companyId || "",
            branchId: lead.branchId || "",
            description: lead.description || "",
            priority: lead.priority || "",
            estimatedHours: lead.estimatedHours || "",
            budget:
              Array.isArray(lead.commercials) && lead.commercials.length > 0
                ? lead.commercials.reduce(
                  (acc: number, c: any) => acc + (parseFloat(c.cost) || 0),
                  0,
                )
                : lead.budget || "",
            rate: lead.rate || "",
            leadSource:
              lead.source?.name || lead.sourceId || lead?.leadSource || "",
            referrals: lead.referrals || [],
            companyType: lead.company?.companyTypeId || "",
            receivedDate: lead?.receivedDate || "",
            // THIS READER'S reminder. Named `reminder`, not `notes`: the lead has a `notes`
            // field of its own, a different and shared thing that predates this, and one of
            // the two had to stop borrowing the other's name. Seeded onto the row so both the
            // inline cell and the dialog open with no fetch of their own.
            reminder: reminderByLead.get(String(lead.id))?.note || "",
            reminderColor: reminderByLead.get(String(lead.id))?.color || "",
            // Drives the Action column: an icon means the thing exists on this lead.
            hasMeeting: leadsWithMeetings.has(String(lead.id)),
            fileLocation: lead?.fileLocation || "",
            fileLocationCompany: lead?.fileLocationCompany || "",
            fileLocationCompanyType: lead?.fileLocationCompanyType || "",
          };
        });

        return { ...lookups, leads: transformedLeads };
      }
      return { ...lookups, leads: [] as any[] };
  }

  // Debounce search input (300ms delay before filtering)
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchText]);

  // Clear any pending timers on unmount.
  useEffect(
    () => () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    },
    [],
  );

  // Fired by MaterialTable after preferences load and whenever a column is shown/hidden.
  // Auto-refetch with only the visible columns' data — but only when the visible SET
  // actually changed (the callback also fires on unrelated re-renders such as searching).
  useEffect(() => {
    dispatch(fetchAllEmployeesAsync());
  }, []);

  // Load company + company-type lookups so the File Location column can resolve the
  // stored IDs into names.
  useEffect(() => {
    (async () => {
      try {
        const [companiesRes, typesRes] = await Promise.all([
          getAllClientCompanies(true),
          getAllCompanyTypes(),
        ]);
        const companies =
          companiesRes?.data?.companies || companiesRes?.companies || [];
        const types = typesRes?.companyTypes || [];
        setFileLocCompanyMap(
          new Map(companies.map((c: any) => [String(c.id), c.companyName])),
        );
        setFileLocTypeMap(
          new Map(types.map((t: any) => [String(t.id), t.name])),
        );
      } catch (err) {
        console.warn("Failed to load file-location company lookups:", err);
      }
    })();
  }, []);

  // ── Event bus subscriptions ───────────────────────────────────────────────
  // Ignore the event payload; refetch in "auto" mode (respects the saved column selection).
  useEventBus(EVENT_KEYS.leadCreated, () => fetchAllData());
  useEventBus(EVENT_KEYS.leadUpdated, () => fetchAllData());
  useEventBus(EVENT_KEYS.leadDeleted, () => fetchAllData());
  // chartSettingsUpdated only changes visual config — no data re-fetch needed
  useEventBus(EVENT_KEYS.closeChartDialogModal, handleCloseChartSettingsModal);

  const hideNewLeadButton =
    statusId ||
    serviceId ||
    categoryId ||
    referralId ||
    sourceId ||
    subCategoryId ||
    companyTypeId ||
    topLeadsId ||
    locationId ||
    monthlyStatusId;

  // ── Columns ──────────────────────────────────────────────────────────────────
  // Memoized so the array keeps a stable identity across renders. An unstable identity
  // makes useTablePreferences recompute its defaults + re-run the column-order reset
  // effect on every render, which (with hidden-by-default columns + selective fetching)
  // ping-pongs with the auto-refetch and reloads the table continuously.
  const columns = useMemo(() => [

    {
      // `id: "actions"` is not cosmetic — MaterialTable recognises that exact id and turns
      // off sorting and grouping for it, because there is no backing row field for either to
      // operate on. Ordering is not one of those: the header carries a name and drags like
      // any other column.
      id: "actions",
      header: "Action",
      size: 108,
      minSize: 108,
      enableResizing: false,
      /**
       * THE ICONS ARE THE STATE, not a fixed toolbar.
       *
       * Two permanent buttons on 1,385 identical rows told the reader nothing: every lead
       * looked the same whether it had been followed up or never touched. Now an icon means
       * that thing EXISTS on this lead, and `+` means something is still missing — so the
       * column answers "which of these has a reminder, which has a meeting" at a glance,
       * which is the question somebody scanning a pipeline is actually asking.
       *
       * `+` knows what is missing, so it only asks when it genuinely does not know: with one
       * of the two already there it goes straight to the other, and the chooser opens only
       * when both are absent.
       */
      Cell: ({ row }: any) => {
        const lead = row.original;
        const hasReminder = !!lead?.reminder;
        const hasMeeting = !!lead?.hasMeeting;
        return (
          // The row itself navigates to the lead on click. Stopping here — once, on the
          // wrapper — is what keeps "open the reminder" from also being "leave the page".
          <Box
            sx={{ display: "flex", gap: "4px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {hasReminder && (
              <ActionIconButton
                size="sm"
                iconName="notepad-edit"
                tone="success"
                // Names the full editor, not just "edit": a quick text fix is a click on the
                // Reminder cell itself, and this is the way to the thing that cell cannot do.
                title="Edit reminder and colour"
                onClick={() => setNoteLead(lead)}
              />
            )}
            {hasMeeting && (
              <ActionIconButton
                size="sm"
                iconName="calendar-tick"
                tone="indigo"
                title="Meeting booked — schedule another"
                onClick={() => setMeetingLead(lead)}
              />
            )}
            {!(hasReminder && hasMeeting) && (
              <ActionIconButton
                size="sm"
                iconName="plus"
                tone="brand"
                title={
                  hasReminder
                    ? "Schedule a meeting"
                    : hasMeeting
                      ? "Add a reminder"
                      : "Add a reminder or a meeting"
                }
                onClick={() => {
                  if (hasReminder) setMeetingLead(lead);
                  else if (hasMeeting) setNoteLead(lead);
                  else setPickerLead(lead);
                }}
              />
            )}
          </Box>
        );
      },
    },
    {
      accessorKey: "reminder",
      header: "Reminder",
      // One number, shared with the cell — which caps its own content to it. A column whose
      // width and whose content ceiling can disagree is a column that grows.
      size: REMINDER_COLUMN_WIDTH,
      minSize: 200,
      // FIRST after the row actions, before the dates. A reminder is the one cell here that
      // is a claim on the reader's attention rather than a fact about the lead — buried mid-
      // table it is read after everything it was meant to interrupt, and off the right edge
      // of a wide table it is not read at all.
      //
      // Its own column rather than a second line under Project Name: that cell's Cell
      // returns a single string child, which is what the table's search highlighter
      // clones through — wrapping it in a container to append the note would silently
      // stop the project name highlighting on every search.
      Cell: ({ row }: { row: any }) => (
        <ReminderCell
          lead={row.original}
          onSaved={(reminder) => patchCachedRow(row.original.id, { reminder })}
        />
      ),
    },
    {
      accessorKey: "inquiryDate",
      header: "Inquiry Date",
      size: 140,
      Cell: ({ cell }: { cell: any }) => {
        const v = cell.getValue();
        return v ? dayjs(v).format("DD-MM-YYYY") : "N/A";
      },
    },
    {
      accessorKey: "prefix",
      header: "Inquiry Id",
      size: 180,
      minSize: 160,
      enableEditing: false,
      Cell: ({ row }: { row: any }) => (
        <span
          className="cursor-pointer"
          style={{
            fontWeight: "600",
            fontSize: "14.5px",
            whiteSpace: "nowrap",
          }}
        >
          {row?.original?.prefix || "N/A"}
        </span>
      ),
    },
    {
      accessorKey: "projectName",
      header: "Project Name",
      size: 320,
      minSize: 240,
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
      accessorKey: "totalCost",
      header: "Total Cost",
      size: 130,
      meta: { defaultVisible: false },
      Cell: ({ cell }: { cell: any }) => {
        const v = cell.getValue();
        return v !== undefined ? `₹${Number(v).toLocaleString()}` : "₹0";
      },
    },
    {
      accessorKey: "client",
      header: "Client",
      size: 150,
      meta: { defaultVisible: false },
      Cell: ({ cell }: { cell: any }) => {
        const v = cell.getValue();
        return typeof v === "object" ? v.name || "N/A" : v || "N/A";
      },
    },
    {
      accessorKey: "organization",
      header: "Organization",
      size: 170,
      Cell: ({ cell }: { cell: any }) => {
        const name = cell.getValue() as string;
        const isUnassigned = !name || name === UNASSIGNED_ORG_LABEL;
        return (
          <span style={isUnassigned ? { color: "#98A2B3", fontStyle: "italic" } : undefined}>
            {isUnassigned ? UNASSIGNED_ORG_LABEL : name}
          </span>
        );
      },
    },
    {
      accessorKey: "service",
      header: "Service",
      size: 150,
      meta: { defaultVisible: false },
      Cell: ({ cell }: { cell: any }) =>
        projectServices?.find((s: any) => s.id === cell.getValue())?.name ||
        "N/A",
    },
    {
      accessorKey: "category",
      header: "Category",
      size: 150,
      meta: { defaultVisible: false },
      Cell: ({ cell }: { cell: any }) =>
        projectCategories?.find((c: any) => c.id === cell.getValue())?.name ||
        "N/A",
    },
    {
      accessorKey: "subCategory",
      header: "Sub Category",
      size: 150,
      meta: { defaultVisible: false },
      Cell: ({ cell }: { cell: any }) =>
        projectSubcategories?.find((s: any) => s.id === cell.getValue())
          ?.name || "N/A",
    },
    {
      accessorKey: "status",
      header: "Lead Status",
      size: 150,
      Cell: ({ row }: any) => {
        const st = row?.original?.status;
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
      accessorKey: "receivedDate",
      header: "Received Date",
      size: 150,
      meta: { defaultVisible: false },
      Cell: ({ cell }: { cell: any }) => {
        const v = cell.getValue();
        return v ? dayjs(v).format("DD-MM-YYYY") : "N/A";
      },
    },
    {
      accessorKey: "poStatus",
      header: "PO Status",
      size: 130,
      meta: { defaultVisible: false },
      Cell: ({ row }: any) => {
        const poStatus = row?.original?.poStatus;
        if (row?.original?.status?.name !== "Received" || !poStatus)
          return <span>N/A</span>;
        const color = poStatus === "Received" ? "#28A745" : "#FFC107";
        return (
          <div
            className="badge badge-light"
            style={{
              backgroundColor: color,
              color: poStatus === "Received" ? "white" : "#333",
            }}
          >
            {poStatus}
          </div>
        );
      },
    },
    {
      accessorKey: "assignedTo",
      header: "Assigned To",
      size: 160,
      Cell: ({ cell }: { cell: any }) =>
        allemployees?.find((e: any) => e.employeeId === cell.getValue())
          ?.employeeName || "N/A",
    },
    {
      accessorKey: "startDate",
      header: "Date",
      size: 120,
      meta: { defaultVisible: false },
      Cell: ({ cell }: { cell: any }) => {
        const v = cell.getValue();
        return v ? dayjs(v).format("DD-MM-YYYY") : "N/A";
      },
    },
    {
      accessorKey: "duration",
      header: "Duration",
      size: 120,
      meta: { defaultVisible: false },
      Cell: ({ cell }: { cell: any }) => cell.getValue() || "N/A",
    },
    {
      accessorKey: "contact",
      header: "Contact",
      size: 160,
      meta: { defaultVisible: false },
      Cell: ({ cell }: { cell: any }) => {
        const v = cell.getValue();
        return typeof v === "object" ? v.name || v.email || "N/A" : v || "N/A";
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created Date",
      size: 150,
      meta: { defaultVisible: false },
      Cell: ({ cell }: { cell: any }) =>
        cell.getValue() ? dayjs(cell.getValue()).format("DD-MM-YYYY") : "N/A",
    },
    {
      accessorKey: "createdBy",
      header: "Created By",
      size: 150,
      meta: { defaultVisible: false },
      Cell: ({ cell }: { cell: any }) =>
        allemployees?.find((e: any) => e.employeeId === cell.getValue())
          ?.employeeName || "N/A",
    },
    {
      accessorKey: "updatedBy",
      header: "Edited By",
      size: 140,
      meta: { defaultVisible: false },
      Cell: ({ cell }: { cell: any }) =>
        allemployees?.find((e: any) => e.employeeId === cell.getValue())
          ?.employeeName || "N/A",
    },
    {
      accessorKey: "country",
      header: "Country",
      size: 120,
      meta: { defaultVisible: false },
      Cell: ({ cell }: { cell: any }) => cell.getValue() || "N/A",
    },
    {
      accessorKey: "city",
      header: "City",
      size: 110,
      meta: { defaultVisible: false },
      Cell: ({ row }: { row: any }) => row.original.city || "N/A",
    },
    {
      accessorKey: "state",
      header: "State",
      size: 110,
      meta: { defaultVisible: false },
      Cell: ({ row }: { row: any }) => row.original.state || "N/A",
    },
    {
      accessorKey: "area",
      header: "Area",
      size: 120,
      meta: { defaultVisible: false },
      Cell: ({ cell }: { cell: any }) => cell.getValue() || "N/A",
    },
    {
      accessorKey: "cost",
      header: "Cost",
      size: 120,
      meta: { defaultVisible: false },
      Cell: ({ cell }: { cell: any }) =>
        cell.getValue() ? `₹${Number(cell.getValue()).toLocaleString()}` : "₹0",
    },
    {
      accessorKey: "fileLocation",
      header: "File Location",
      size: 200,
      // "File Location in Computer" in the form = Company Type + Company. The lead stores
      // those as IDs, so resolve them to names; fall back to the free-text path.
      Cell: ({ row }: { row: any }) => {
        const companyId = row?.original?.fileLocationCompany;
        const typeId = row?.original?.fileLocationCompanyType;
        const path = row?.original?.fileLocation;
        // Resolve IDs → names (fall back to the raw value if it's already a name / unmapped).
        const company = companyId
          ? fileLocCompanyMap.get(String(companyId)) || companyId
          : "";
        const type = typeId
          ? fileLocTypeMap.get(String(typeId)) || typeId
          : "";
        if (company) {
          return (
            <span style={{ whiteSpace: "nowrap" }}>
              {company}
              {type ? (
                <span style={{ color: "#9CA3AF" }}> ({type})</span>
              ) : null}
            </span>
          );
        }
        if (path) {
          const isUrl = /^https?:\/\//i.test(String(path));
          return isUrl ? (
            <a
              href={String(path)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ color: "#1E3A8A", textDecoration: "underline", whiteSpace: "nowrap" }}
            >
              Open file
            </a>
          ) : (
            <span style={{ whiteSpace: "nowrap" }}>{String(path)}</span>
          );
        }
        return "N/A";
      },
    },
  ], [
    projectServices,
    projectCategories,
    projectSubcategories,
    allemployees,
    rawLeadsData,
    fileLocCompanyMap,
    fileLocTypeMap,
    // Stable via useCallback, so listing it never rebuilds the column model — it only stops
    // the reminder cell closing over a stale writer if that ever changes.
    patchCachedRow,
  ]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function handleCloseChartSettingsModal() {
    setShowChartSettingsModal(false);
  }

  const leadsExportColumns = useMemo(() => [
    { key: 'inquiryDate', header: 'Inquiry Date', type: 'text' as const },
    { key: 'prefix', header: 'Inquiry ID', type: 'text' as const },
    { key: 'projectName', header: 'Project Name', type: 'text' as const },
    { key: 'reminder', header: 'Reminder', type: 'text' as const },
    { key: 'organization', header: 'Organization', type: 'text' as const },
    { key: 'totalCost', header: 'Total Cost', type: 'currency' as const, showTotal: true },
    { key: 'client', header: 'Client', type: 'text' as const },
    { key: 'service', header: 'Service', type: 'text' as const },
    { key: 'category', header: 'Category', type: 'text' as const },
    { key: 'subCategory', header: 'Sub Category', type: 'text' as const },
    {
      key: 'status', header: 'Lead Status', type: 'text' as const,
      format: (val: any) => val?.name || String(val || '')
    },
    { key: 'receivedDate', header: 'Received Date', type: 'text' as const },
    { key: 'poStatus', header: 'PO Status', type: 'text' as const },
    { key: 'assignedTo', header: 'Assigned To', type: 'text' as const },
    { key: 'startDate', header: 'Start Date', type: 'text' as const },
    { key: 'duration', header: 'Duration', type: 'text' as const },
    { key: 'contact', header: 'Contact', type: 'text' as const },
    { key: 'cost', header: 'Cost', type: 'currency' as const, showTotal: true },
    { key: 'country', header: 'Country', type: 'text' as const },
    { key: 'city', header: 'City', type: 'text' as const },
    { key: 'state', header: 'State', type: 'text' as const },
    { key: 'area', header: 'Area', type: 'text' as const },
    { key: 'createdAt', header: 'Created Date', type: 'text' as const },
    { key: 'createdBy', header: 'Created By', type: 'text' as const },
    { key: 'updatedBy', header: 'Edited By', type: 'text' as const },
  ], []);

  // ── Prop-driven filters ───────────────────────────────────────────────────────
  const startDates = startDate ? dayjs(startDate) : null;
  const endDates = endDate ? dayjs(endDate) : null;

  const propDateFiltered = tableData?.filter((item: any) => {
    const d = dayjs(item.createdAt);
    if (startDates && d.isBefore(startDates.startOf("day"))) return false;
    if (endDates && d.isAfter(endDates.endOf("day"))) return false;
    return true;
  });

  const filteredByProps = (() => {
    if (statusId)
      return propDateFiltered?.filter(
        (item: any) => item.status?.id === statusId,
      );
    if (serviceId)
      return propDateFiltered?.filter(
        (item: any) => item.service === serviceId,
      );
    if (categoryId)
      return propDateFiltered?.filter(
        (item: any) => item.category === categoryId,
      );
    if (referralId)
      return propDateFiltered?.filter((item: any) =>
        item.referrals?.some((r: any) => r.referralTypeId === referralId),
      );
    if (sourceId)
      return propDateFiltered?.filter(
        (item: any) =>
          item.leadSource?.toLowerCase() === sourceId?.toLowerCase(),
      );
    if (subCategoryId)
      return propDateFiltered?.filter(
        (item: any) => item.subCategory === subCategoryId,
      );
    if (companyTypeId)
      return propDateFiltered?.filter(
        (item: any) => item.companyType === companyTypeId,
      );
    if (topLeadsId?.length)
      return tableData?.filter((item: any) =>
        topLeadsId?.includes(item.id.trim()),
      );
    if (locationId) {
      return propDateFiltered?.filter((item: any) => {
        if (locationId.toLowerCase() !== "unknown") {
          return (
            item.countryId?.toString() === locationId ||
            item.stateId?.toString() === locationId ||
            item.cityId?.toString() === locationId ||
            item.country?.toLowerCase() === locationId.toLowerCase() ||
            item.state?.toLowerCase() === locationId.toLowerCase() ||
            item.city?.toLowerCase() === locationId.toLowerCase()
          );
        }
        return !(
          item.countryId ||
          item.stateId ||
          item.cityId ||
          item.country ||
          item.state ||
          item.city
        );
      });
    }
    if (monthlyStatusName && monthlyStatusId) {
      return propDateFiltered?.filter(
        (item: any) =>
          dayjs(item.createdAt).format("MMMM") === monthlyStatusName &&
          item.status?.name === monthlyStatusId,
      );
    }
    return propDateFiltered;
  })();

  // ── Memoized lookup maps for O(1) access (instead of O(n) .find()) ────────────
  const employeeMap = useMemo(() => {
    const map = new Map<string, string>();
    allemployees?.forEach((e: any) => {
      if (e.employeeId) map.set(e.employeeId, e.employeeName);
    });
    return map;
  }, [allemployees]);

  const serviceMap = useMemo(() => {
    const map = new Map<string, string>();
    projectServices?.forEach((s: any) => {
      if (s.id) map.set(s.id, s.name);
    });
    return map;
  }, [projectServices]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    projectCategories?.forEach((c: any) => {
      if (c.id) map.set(c.id, c.name);
    });
    return map;
  }, [projectCategories]);

  const subCategoryMap = useMemo(() => {
    const map = new Map<string, string>();
    projectSubcategories?.forEach((s: any) => {
      if (s.id) map.set(s.id, s.name);
    });
    return map;
  }, [projectSubcategories]);

  // ── Quick filter: date + status + assigned (AND) ───────────────────────────────
  const quickFilteredData = useMemo(() => {
    return filteredByProps?.filter((item: any) => {
      let dateMatch = true;
      const d = item.inquiryDate ? dayjs(item.inquiryDate) : null;
      if (alignment === "daily") {
        dateMatch = d ? d.isSame(day, "day") : false;
      } else if (alignment === "weekly") {
        dateMatch = d
          ? !d.isBefore(weekStart.startOf("day")) &&
          !d.isAfter(weekEnd.endOf("day"))
          : false;
      } else if (alignment === "monthly") {
        dateMatch = d
          ? !d.isBefore(monthStart.startOf("day")) &&
          !d.isAfter(monthEnd.endOf("day"))
          : false;
      } else if (alignment === "yearly" && yearStart && yearEnd) {
        dateMatch = d
          ? !d.isBefore(yearStart.startOf("day")) &&
          !d.isAfter(yearEnd.endOf("day"))
          : false;
      } else if (alignment === "allyear") {
        dateMatch = true;
      } else if (alignment === "custom") {
        if (customStartDate || customEndDate) {
          if (!d) dateMatch = false;
          else {
            if (customStartDate && d.isBefore(customStartDate.startOf("day")))
              dateMatch = false;
            if (customEndDate && d.isAfter(customEndDate.endOf("day")))
              dateMatch = false;
          }
        }
      }
      const statusMatch = statusFilter
        ? item.status?.name?.toLowerCase() === statusFilter.toLowerCase()
        : true;
      const organizationMatch = organizationFilter
        ? organizationFilter === UNASSIGNED_ORG_VALUE
          ? !item.organizationId
          : item.organizationId === organizationFilter
        : true;
      const assignedMatch = assignedToFilter
        ? assignedToFilter === "__NA__"
          ? !item.assignedTo
          : item.assignedTo === assignedToFilter
        : true;

      let searchMatch = true;
      if (debouncedSearchText) {
        const q = debouncedSearchText.toLowerCase();
        // Use memoized maps instead of .find() for O(1) lookups
        const employeeName = employeeMap.get(item.assignedTo) || "";
        const serviceName = serviceMap.get(item.service) || "";
        const categoryName = categoryMap.get(item.category) || "";
        const subCategoryName = subCategoryMap.get(item.subCategory) || "";

        searchMatch =
          item.projectName?.toLowerCase().includes(q) ||
          item.prefix?.toLowerCase().includes(q) ||
          item.client?.toLowerCase().includes(q) ||
          item.status?.name?.toLowerCase().includes(q) ||
          employeeName.toLowerCase().includes(q) ||
          serviceName.toLowerCase().includes(q) ||
          categoryName.toLowerCase().includes(q) ||
          subCategoryName.toLowerCase().includes(q) ||
          item.city?.toLowerCase().includes(q) ||
          item.state?.toLowerCase().includes(q) ||
          item.country?.toLowerCase().includes(q) ||
          item.area?.toLowerCase().includes(q);
      }

      return dateMatch && statusMatch && organizationMatch && assignedMatch && searchMatch;
    });
  }, [
    filteredByProps,
    alignment,
    day,
    weekStart,
    weekEnd,
    monthStart,
    monthEnd,
    yearStart,
    yearEnd,
    customStartDate,
    customEndDate,
    statusFilter,
    organizationFilter,
    assignedToFilter,
    debouncedSearchText,
    employeeMap,
    serviceMap,
    categoryMap,
    subCategoryMap,
  ]);

  // Organization filter options: every organization the user can see, plus an
  // "Unassigned" entry only when legacy leads without one are actually present —
  // no point offering a filter that can only ever return nothing.
  const organizationFilterOptions = useMemo(() => {
    const options = leadOrganizations.map((org) => ({ value: org.id, label: org.name }));
    const hasUnassigned = (tableData ?? []).some((item: any) => !item.organizationId);
    return hasUnassigned
      ? [...options, { value: UNASSIGNED_ORG_VALUE, label: UNASSIGNED_ORG_LABEL }]
      : options;
  }, [leadOrganizations, tableData]);

  // Only show the full-page loader on the INITIAL load (no data yet). Placed AFTER all
  // hooks so the hook order is identical on every render (React requires this — an early
  // return before a hook causes "Rendered fewer hooks than expected"). On subsequent
  // refetches the table stays mounted instead of flashing the loader.
  if (loading && tableData.length === 0) return <Loader />;

  const hasAnyFilter = statusFilter || organizationFilter || assignedToFilter || debouncedSearchText;
  const clearAllFilters = () => {
    setStatusFilter("");
    setOrganizationFilter("");
    setAssignedToFilter("");
    setSearchText("");
    setDebouncedSearchText("");
  };

  // ── Total cost for filtered data ─────────────────────────────────────────────
  const totalFilteredCost = (quickFilteredData ?? []).reduce(
    (acc: number, item: any) =>
      acc + (parseFloat(item.totalCost) || parseFloat(item.cost) || 0),
    0,
  );
  const formatCost = (amount: number) => {
    if (amount >= 1_00_00_000)
      return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
    if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`;
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  // ── Shared heights ─────────────────────────────────────────────────────────
  const FILTER_HEIGHT = "32px";

  // ── Menu styling for selects ─────────────────────────────────────────────────
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

  // ── Pill select sx for Status & Assigned ──────────────────────────────────────
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
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "#1E3A8A !important",
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#1E3A8A !important",
    },
    "& .MuiSelect-icon": { color: hasValue ? "#1E3A8A" : "#94A3B8" },
  });

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
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          {/* Left: Title & Subtitle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <h1 style={{ fontFamily: "Barlow", fontSize: "20px", fontWeight: 700, margin: 0, color: '#1E293B', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
              Leads Management
            </h1>
            <p style={{ color: '#64748B', margin: 0, fontSize: '12px', fontWeight: 500 }}>
              Manage and track your inquiries and lead pipeline
            </p>
          </div>

          {/* Right Section: KPI summary, Bulk Import, and + New Lead */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            marginLeft: isMobile ? '0' : 'auto',
            width: isMobile ? '100%' : 'auto',
            justifyContent: isMobile ? 'space-between' : 'flex-end',
            marginTop: isMobile ? '8px' : '0'
          }}>
            {/* Primary Buttons */}
            {!hideNewLeadButton && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: isMobile ? '100%' : 'auto'
              }}>
                <button
                  className="btn btn-sm fw-bold d-inline-flex align-items-center justify-content-center gap-1.5"
                  onClick={() => setShowBulkImport(true)}
                  style={{
                    backgroundColor: "#fff",
                    color: "#1E3A8A",
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
                  onClick={() => setShowOrgPicker(true)}
                  style={{
                    backgroundColor: "#1E3A8A",
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
        </div>

        {/* Custom missing-date hint for Custom Alignment */}
        {alignment === "custom" && (!customStartDate || !customEndDate) && (
          <div className="d-flex justify-content-center my-2">
            <div
              className="text-center p-2"
              style={{
                background: "#FEF2F2",
                borderRadius: "6px",
                border: "1px solid #FEE2E2",
                maxWidth: 420,
                width: "100%"
              }}
            >
              <h6 style={{ fontFamily: "Inter", fontWeight: 600, color: "#1E3A8A", fontSize: "12px", marginBottom: "2px" }}>
                Custom Date Range
              </h6>
              <p className="mb-0" style={{ fontSize: "11px", color: "#64748B" }}>
                Please select both <strong>Start Date</strong> and <strong>End Date</strong> to query custom period.
              </p>
            </div>
          </div>
        )}

        {/* --- ROW 2: COMPACT FILTER TOOLBAR --- */}
        {!hideNewLeadButton && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            marginTop: '8px',
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
              <div style={{ marginRight: "4px" }}>
                <TimePeriodSelector
                  value={alignment as TimePeriodMode}
                  onChange={(mode) => handleAlignmentChange({} as any, mode)}
                  isMobile={isMobile}
                  variant="boxed"
                />
              </div>

              {/* Date Nav placed next to Period Tabs */}
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
                            "& .MuiOutlinedInput-root": {
                              borderRadius: "6px",
                              height: "32px",
                              fontSize: "11px",
                              width: "110px"
                            },
                            "& .MuiInputLabel-root": {
                              fontSize: "11px",
                              top: "-3px"
                            }
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
                            "& .MuiOutlinedInput-root": {
                              borderRadius: "6px",
                              height: "32px",
                              fontSize: "11px",
                              width: "110px"
                            },
                            "& .MuiInputLabel-root": {
                              fontSize: "11px",
                              top: "-3px"
                            }
                          }
                        }
                      }}
                    />
                  </LocalizationProvider>
                </div>
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
                <span style={{ fontSize: '14px', color: '#1E3A8A', fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>{formatCost(totalFilteredCost)}</span>
              </div>
              <div style={{ width: '1px', height: '14px', backgroundColor: '#E2E8F0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Results:</span>
                <span style={{ fontSize: '14px', color: '#1E3A8A', fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>
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
          tableName="LeadsTablesMainV2"
          defaultSorting={[{ id: "inquiryDate", desc: true }]}
          // Returns elements, not a <FilterToolbar/> component declared in render —
          // a fresh component type each render remounts the controls mid-interaction
          // (the Assigned To autocomplete would lose focus on every keystroke).
          renderTopToolbarRightActions={() => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Status Filter */}
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
                            Select Status
                          </span>
                        );
                      }
                      const st = leadStatuses.find((s: any) => s.name === val);
                      return (
                        <span style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", overflow: "hidden" }}>
                          {st?.color && (
                            <span style={{ width: 8, height: 8, minWidth: 8, borderRadius: "50%", backgroundColor: st.color, display: "inline-block" }} />
                          )}
                          <span style={{ fontFamily: "Inter", fontSize: "12px", fontWeight: 500, color: "#1E3A8A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                            {val}
                          </span>
                          <span
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setStatusFilter("");
                            }}
                            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", color: "#1E3A8A", fontSize: 9, fontWeight: 700, cursor: "pointer" }}
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
                        </span>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Organization Filter — same pill treatment as Status. Hidden when
                    there is only one organization and nothing legacy to separate. */}
                {organizationFilterOptions.length > 1 && (
                  <FormControl size="small" sx={{ minWidth: isMobile ? "100%" : 170 }}>
                    <Select
                      value={organizationFilter}
                      onChange={(e) => setOrganizationFilter(e.target.value)}
                      displayEmpty
                      sx={pillSelectSx(!!organizationFilter)}
                      renderValue={(val) => {
                        if (!val) {
                          return (
                            <span style={{ color: "#94A3B8", fontFamily: "Inter", fontSize: "12px", fontWeight: 500 }}>
                              Organization
                            </span>
                          );
                        }
                        const label =
                          organizationFilterOptions.find((o) => o.value === val)?.label ?? val;
                        return (
                          <span style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", overflow: "hidden" }}>
                            <span style={{ fontFamily: "Inter", fontSize: "12px", fontWeight: 500, color: "#1E3A8A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                              {label}
                            </span>
                            <span
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setOrganizationFilter("");
                              }}
                              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", color: "#1E3A8A", fontSize: 9, fontWeight: 700, cursor: "pointer" }}
                            >
                              ✕
                            </span>
                          </span>
                        );
                      }}
                      MenuProps={menuSx}
                    >
                      <MenuItem value="" sx={{ color: "#94A3B8", fontSize: "12px" }}>
                        All Organizations
                      </MenuItem>
                      {organizationFilterOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value} sx={{ fontSize: "12px" }}>
                          {option.label}
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
                          color: assignedToFilter ? "#1E3A8A" : "#1E293B",
                          paddingRight: "8px !important",
                          "& fieldset": {
                            borderColor: assignedToFilter ? "#1E3A8A" : "#E2E8F0",
                            borderWidth: "1px",
                            borderRadius: "6px",
                          },
                          "&:hover fieldset": { borderColor: "#1E3A8A" },
                          "&.Mui-focused fieldset": { borderColor: "#1E3A8A" },
                        },
                        "& .MuiOutlinedInput-input": {
                          padding: "0 4px !important",
                          fontFamily: "Inter",
                          fontSize: "12px",
                          fontWeight: 500,
                          color: assignedToFilter ? "#1E3A8A" : "#1E293B",
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
                            color: assignedToFilter ? "#1E3A8A" : "#94A3B8",
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
                            "&:hover": { backgroundColor: "rgba(30, 58, 138,0.06)" },
                            '&[aria-selected="true"]': {
                              backgroundColor: "rgba(30, 58, 138,0.1)",
                              color: "#1E3A8A",
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
                      color: "#1E3A8A",
                      fontWeight: 600,
                      fontFamily: "Inter, sans-serif",
                      padding: "2px 8px",
                      whiteSpace: "nowrap"
                    }}
                  >
                    ✕ Clear Filters
                  </button>
                )}
            </Box>
          )}
          renderExportActions={() => (
            <ExportButton
              data={quickFilteredData}
              columns={leadsExportColumns}
              filename="leads-management"
              title="Leads Management"
              subtitle="Inquiry-wise leads, costs, and status"
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
              // Precise column widths: `fixed` makes each column exactly its `size`
              // (no stretching to fill), and `max-content` sizes the table to the sum
              // of the columns so there's no forced dead space. Horizontal scroll kicks
              // in via the container's overflowX when the columns exceed the viewport.
              tableLayout: "fixed",
              width: "max-content",
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
                "& .MuiTableCell-root:first-of-type": {
                  borderTopLeftRadius: "12px",
                  borderBottomLeftRadius: "12px",
                  borderLeft: "3px solid transparent !important",
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
                    borderLeftColor: `${row.original?.status?.color || "#1E3A8A"} !important`,
                  },
                },
              },
              onClick: () =>
                navigate(`/leads/${row.original.id}`, {
                  state: { leadData: row.original.id },
                }),
            }),
          }}
        />

      <SelectLeadOrganizationDialog
        open={showOrgPicker}
        onClose={() => setShowOrgPicker(false)}
        onContinue={(organizationId) => {
          setShowOrgPicker(false);
          // Whatever goes in here lands in the wizard's initial form values. Only
          // the id travels — the wizard resolves the name from its own org list.
          setFormValues({ leadTemplateId: "blank", organizationId });
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

      <Modal
        show={showChartSettingsModal}
        onHide={handleCloseChartSettingsModal}
        size="xl"
        centered
        className="responsive-modal"
      >
        <Modal.Body
          style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
            }}
          >
            <span
              style={{
                fontFamily: "Inter",
                fontWeight: 600,
                fontSize: "18px",
                color: "#333",
              }}
            >
              Customize Cards Visibility
            </span>
            <ChartVisibilitySettings
              type={PROJECT_CHART_SETTINGS_MODAL_TYPE.LEAD}
            />
          </div>
        </Modal.Body>
      </Modal>

      {/* Bulk Import Modal from file 2 */}
      <LeadBulkImport
        show={showBulkImport}
        onHide={() => setShowBulkImport(false)}
      />

      {/* The full reminder editor — writing one from scratch, and the colour. Quick text
          fixes happen inline in the Reminder cell and never come through here. */}
      {noteLead && (
        <LeadNoteDialog
          open
          lead={noteLead}
          onClose={() => setNoteLead(null)}
          onSaved={(reminder, reminderColor) => patchCachedRow(noteLead.id, { reminder, reminderColor })}
        />
      )}

      {/* Booking a meeting ON A LEAD, which is only possible from here.
          `lockProject` is what enforces that: the meeting form's own picker offers projects
          you are on the internal team of, and a lead that has not become a project is on
          nobody's — so opened from the Calendar or a task, this lead is not offerable at all.
          `leadName` names the row and marks it as a lead so the form does not call it a
          project. */}
      {meetingLead && (
        <MeetingDialog
          open
          defaultProjectId={meetingLead.id}
          lockProject
          leadName={meetingLead.projectName || meetingLead.prefix || "Lead"}
          onClose={() => setMeetingLead(null)}
          // The form itself is silent on success — the Calendar page says so in its own
          // onSaved, and a dialog that just closes reads as one that failed.
          onSaved={() => {
            // The row's Action column reads this: without it the lead keeps offering `+` for
            // a meeting that now exists, until the next full reload.
            patchCachedRow(meetingLead.id, { hasMeeting: true });
            toast({ icon: "success", title: "Meeting scheduled" });
          }}
        />
      )}

      {/* Only reachable from a lead with NEITHER a reminder nor a meeting — with one of them
          already there, `+` has a single possible answer and goes straight to it. */}
      {pickerLead && (
        <LeadActionPicker
          open
          leadName={pickerLead.projectName || pickerLead.prefix || "Lead"}
          onClose={() => setPickerLead(null)}
          onChoose={(choice) => {
            const lead = pickerLead;
            setPickerLead(null);
            if (choice === "reminder") setNoteLead(lead);
            else setMeetingLead(lead);
          }}
        />
      )}
    </>
  );
};

export default LeadNewLead;
