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
import { getAllLeads } from "@services/leads";
import { fetchAllPages } from "@utils/fetchAllPages";
import { useServerPagination } from "@hooks/useServerPagination";
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
import { AppDispatch, RootState } from "@redux/store";
import { useDispatch, useSelector } from "react-redux";
import eventBus from "@utils/EventBus";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { fetchAllEmployeesAsync } from "@redux/slices/allEmployees";
import ChartVisibilityModal from "@pages/company/settings/ChartVisibilityModal";
import { PROJECT_CHART_SETTINGS_MODAL_TYPE } from "@constants/configurations-key";
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
import { LeadStatusPill, leadRowSx, leadTableSx, UNASSIGNED_ORG_LABEL } from "./leadTableStyle";
import { getCurrencyLocale, currencyPrefix } from '@utils/currency';
import { canSection, canViewCommercial } from "@utils/can";
import { useStickyFilters } from "@app/hooks/useStickyFilters";

/**
 * Leads created before organizations existed carry no organizationId. They are
 * shown and filtered as "Unassigned" rather than hidden — the sentinel is only a
 * filter value, never written to a lead.
 */
const UNASSIGNED_ORG_VALUE = "__unassigned__";

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

/**
 * One API lead → one table row. Pure, so a page of leads is shaped the same way whether it
 * fills the table or an export.
 */
const toLeadRow = (lead: any) => {
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
    // Stored as NAMES ("India", "Maharashtra", "Mumbai") — there is nothing to look up.
    country: String(countryId),
    city: String(cityId),
    state: String(stateId),
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
    // THIS READER'S reminder and whether the lead has a meeting are added at render by
    // `withRowExtras` — they are per-viewer, so they are not part of the lead.
    fileLocation: lead?.fileLocation || "",
    fileLocationCompany: lead?.fileLocationCompany || "",
    fileLocationCompanyType: lead?.fileLocationCompanyType || "",
    // Resolved by the server for this page's leads; absent when the stored value is not an id.
    fileLocationCompanyName: lead?.fileLocationCompanyName || "",
    fileLocationCompanyTypeName: lead?.fileLocationCompanyTypeName || "",
  };
};

/** A stable "nothing yet", so a memo depending on a list does not rebuild every render. */
const EMPTY: any[] = [];

/** Filter params this screen owns; they persist between visits. */
const LEAD_FILTER_KEYS = ["status", "org", "assignee"] as const;

const LeadNewLead: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const today = dayjs();

  // ── Responsive ──────────────────────────────────────────────────────────────
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const canWrite = canSection("crm.leads", "write");

  // ── Data state ──────────────────────────────────────────────────────────────
  // New leads pick their organization before the wizard opens — it decides the
  // lead's prefix and number series.
  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const [formValues, setFormValues] = useState<any>(null);
  const [showChartSettingsModal, setShowChartSettingsModal] = useState(false);
  // ── Bulk import state (from file 2) ─────────────────────────────────────────
  const [showBulkImport, setShowBulkImport] = useState(false);

  // ── Per-row actions: the reminder note and the meeting ──────────────────────
  // Each holds the ROW the icon was clicked on, not just its id — both dialogs need the
  // lead's name and existing note, which the table already has in hand. `null` = closed.
  const [noteLead, setNoteLead] = useState<any>(null);
  const [meetingLead, setMeetingLead] = useState<any>(null);
  /** The lead whose `+` was pressed with BOTH actions still missing. */
  const [pickerLead, setPickerLead] = useState<any>(null);


  // ── Date mode ────────────────────────────────────────────────────────────────
  const [alignment, setAlignment] = useState<DateMode>("monthly");
  // The table's search box, debounced by the table and applied by the server.
  const [search, setSearch] = useState("");
  // Seeded with the table's default sort, so the first request is already in that order.
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: "inquiryDate", desc: true }]);

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
  // …and they stick: leaving for another section (or logging out) and coming back
  // restores them, exactly like the Daily/Weekly/Monthly selector. Clear Filters clears
  // them for good — see useStickyFilters.
  useStickyFilters("leadFilters", LEAD_FILTER_KEYS);
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
  const queryClient = useQueryClient();

  // The lists that name a lead's service, category and status. Reference data: loaded once and
  // cached, so returning from a lead re-renders them without a request.
  const { data: lookups } = useQuery({
    queryKey: ["leads-lookups"],
    queryFn: async () => {
      const [servicesRes, subcatRes, catRes, statusRes] = await Promise.all([
        getAllProjectServices(),
        getAllProjectSubcategories(),
        getAllProjectCategories(),
        getAllLeadStatus(),
      ]);
      return {
        projectServices: servicesRes?.services || [],
        projectSubcategories: subcatRes?.projectSubCategories || [],
        projectCategories: catRes?.projectCategories || [],
        leadStatuses: statusRes?.leadStatuses || [],
      };
    },
  });
  const projectServices: any[] = lookups?.projectServices ?? EMPTY;
  const projectSubcategories: any[] = lookups?.projectSubcategories ?? EMPTY;
  const projectCategories: any[] = lookups?.projectCategories ?? EMPTY;
  const leadStatuses: any[] = lookups?.leadStatuses ?? EMPTY;

  // MY reminders and which leads have a meeting, fetched BESIDE the leads rather than
  // joined onto them. The leads list is the heaviest read in the app and is shared by the
  // dashboard, the drill-downs and the exports — making it viewer-dependent to serve one
  // column would cost all of them. Safe to cache because the query key carries
  // currentEmployeeId, so one person's reminders can never be served to another.
  //
  // Both are best-effort. A failure in either is not a failure of the page: the table
  // still lists every lead, with the Reminder column simply empty and the Action column
  // offering `+` everywhere — wrong, but not broken.
  const rowExtrasKey = ["lead-row-extras", currentEmployeeId];
  const { data: rowExtras } = useQuery({
    queryKey: rowExtrasKey,
    queryFn: async () => {
      const [remindersResponse, meetingLeadsResponse] = await Promise.all([
        getMyLeadReminders().catch((e) => {
          console.warn("Could not load your reminders", e);
          return null;
        }),
        getMeetingLeadIds().catch((e) => {
          console.warn("Could not load which leads have meetings", e);
          return null;
        }),
      ]);
      // `leadService.ts` goes through `api`, whose helpers already return `r.data` — so what
      // resolves here IS the envelope, and the payload is at `.data`. Read one level deeper,
      // this silently yields `undefined`: every save appeared to work, and the reminder
      // vanished on the next load.
      return {
        reminders: Object.fromEntries(
          (remindersResponse?.data?.reminders || []).map(
            (r: any) => [String(r.leadId), { note: r.note, color: r.color }],
          ),
        ) as Record<string, { note: string; color: string | null }>,
        meetingLeadIds: ((meetingLeadsResponse?.data?.leadIds || []) as any[]).map(String),
      };
    },
  });

  /** The page's rows with this viewer's reminder and meeting folded in. */
  const withRowExtras = useCallback(
    (rows: any[]) => {
      const meetings = new Set(rowExtras?.meetingLeadIds ?? []);
      return rows.map((r) => ({
        ...r,
        // Named `reminder`, not `notes`: the lead has a shared `notes` field of its own.
        reminder: rowExtras?.reminders[String(r.id)]?.note || "",
        reminderColor: rowExtras?.reminders[String(r.id)]?.color || "",
        // Drives the Action column: an icon means the thing exists on this lead.
        hasMeeting: meetings.has(String(r.id)),
      }));
    },
    [rowExtras],
  );

  /**
   * Change one viewer-specific field on one row, without going back to the server.
   *
   * Folds a saved reminder, or a newly booked meeting, back into the row it belongs to. They
   * live in the row-extras cache, so that is what is written — a refetch would reload the
   * page of leads to show one edited sentence and lose the table's scroll position.
   * A stable identity, so the memoised columns can close over it.
   */
  const patchCachedRow = useCallback(
    (leadId: string, patch: { reminder?: string; reminderColor?: string | null; hasMeeting?: boolean }) => {
      queryClient.setQueryData(rowExtrasKey, (prev: any) => {
        if (!prev) return prev;
        const id = String(leadId);
        const reminders = { ...prev.reminders };
        if ("reminder" in patch || "reminderColor" in patch) {
          const current = reminders[id] ?? { note: "", color: null };
          reminders[id] = {
            note: patch.reminder ?? current.note,
            color: "reminderColor" in patch ? patch.reminderColor ?? null : current.color,
          };
        }
        const meetingLeadIds = patch.hasMeeting && !prev.meetingLeadIds.includes(id)
          ? [...prev.meetingLeadIds, id]
          : prev.meetingLeadIds;
        return { ...prev, reminders, meetingLeadIds };
      });
    },
    // The key is rebuilt each render; its CONTENT is what matters, so depend on that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, currentEmployeeId],
  );

  /**
   * What the server filters, sorts and pages by (LEAD_LIST_SPEC on the backend). The period,
   * status, organization, assignee and search used to be predicates over every lead here.
   * Built from primitives, so an unchanged filter keeps its identity and never refetches.
   */
  const sortBy = sorting[0]?.id;
  const sortDesc = sorting[0]?.desc;
  const listParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (sortBy) {
      params.sortBy = sortBy;
      params.sortOrder = sortDesc ? "desc" : "asc";
    }
    if (search) params.search = search;
    // The period window on the inquiry date. A lead with no inquiry date falls outside every
    // window and inside "All", exactly as before.
    const [from, to]: [Dayjs | null | undefined, Dayjs | null | undefined] =
      alignment === "daily" ? [day.startOf("day"), day.endOf("day")]
        : alignment === "weekly" ? [weekStart.startOf("day"), weekEnd.endOf("day")]
          : alignment === "monthly" ? [monthStart.startOf("day"), monthEnd.endOf("day")]
            : alignment === "yearly" ? [yearStart?.startOf("day"), yearEnd?.endOf("day")]
              : alignment === "custom" ? [customStartDate?.startOf("day"), customEndDate?.endOf("day")]
                : [null, null];
    if (from) params.inquiryFrom = from.toISOString();
    if (to) params.inquiryTo = to.toISOString();
    if (statusFilter) params.status = statusFilter;
    if (organizationFilter) {
      params.organizationIds = organizationFilter === UNASSIGNED_ORG_VALUE ? "unassigned" : organizationFilter;
    }
    if (assignedToFilter) params.assignee = assignedToFilter;
    return params;
  }, [
    sortBy, sortDesc, search, alignment, day, weekStart, weekEnd, monthStart, monthEnd,
    yearStart, yearEnd, customStartDate, customEndDate, statusFilter, organizationFilter, assignedToFilter,
  ]);

  /** The figures beside the table, computed by the server over the whole result set. */
  const [summary, setSummary] = useState<{
    totalValue: number;
    scopeTotal: number;
    assigneeIds: Array<string | null>;
    hasUnassignedOrganization: boolean;
  } | null>(null);
  // Only the newest request may write the summary — two quick filter changes race otherwise.
  const summaryRequestRef = useRef(0);

  const fetchPage = useCallback(
    async (page: number, pageSize: number, withSummary = false) => {
      const requestId = withSummary ? ++summaryRequestRef.current : 0;
      const res = await getAllLeads({
        page,
        pageSize,
        filters: { ...listParams, ...(withSummary && { summary: "1" }) },
      });
      const payload = res?.data?.data;
      if (withSummary && payload?.summary && requestId === summaryRequestRef.current) {
        setSummary(payload.summary);
      }
      const rows = (payload?.leads || []).map(toLeadRow);
      return { data: rows, totalRecords: payload?.total ?? rows.length };
    },
    [listParams],
  );

  /**
   * The summary describes the FILTERS — not the page, not the sort — so it is asked for only
   * when they change (or after a lead changes). Over a large table it is three aggregate
   * queries, too expensive to repeat on every page turn.
   */
  const summaryFilterKey = useMemo(() => {
    const { sortBy: _sortBy, sortOrder: _sortOrder, ...filtersOnly } = listParams;
    return JSON.stringify(filtersOnly);
  }, [listParams]);
  const summaryKeyRef = useRef<string | null>(null);

  const fetchTablePage = useCallback(
    (page: number, pageSize: number) => {
      const withSummary = summaryKeyRef.current !== summaryFilterKey;
      summaryKeyRef.current = summaryFilterKey;
      return fetchPage(page, pageSize, withSummary);
    },
    [fetchPage, summaryFilterKey],
  );

  const {
    data: pageRows,
    pagination,
    setPagination,
    totalRecords,
    isLoading: pageLoading,
    isInitialLoading,
    refetch,
  } = useServerPagination<any>({
    fetchFunction: fetchTablePage,
    initialPageSize: 50,
    // A new filter, search or sort starts again from page 1.
    resetKey: JSON.stringify(listParams),
  });

  const tableData = useMemo(() => withRowExtras(pageRows), [pageRows, withRowExtras]);

  /** A lead was created, edited or deleted: the page AND the totals beside it are stale. */
  const refetchWithSummary = useCallback(() => {
    summaryKeyRef.current = null;
    refetch();
  }, [refetch]);

  /** Export: every lead matching the current filters, not just this page. */
  const fetchAllRows = useCallback(
    () => fetchAllPages(async (page, pageSize) => {
      const { data, totalRecords: total } = await fetchPage(page, pageSize);
      return { rows: withRowExtras(data), total };
    }),
    [fetchPage, withRowExtras],
  );

  // Only the first ever load blanks the screen; later fetches keep the rows up.
  const loading = isInitialLoading;

  // The Assigned To options: everyone assigned a lead anywhere in scope (from the server
  // summary), so an option does not vanish because another filter hid that person's leads.
  const NA_OPTION = { employeeId: "__NA__", employeeName: "N/A", avatar: "" };

  const assigneeIds = summary?.assigneeIds;
  const assignedEmployeesFromLeads = useMemo(() => {
    const assignedIds = new Set((assigneeIds ?? []).filter(Boolean));
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
  }, [assigneeIds, allemployees]);

  const hasUnassignedLeads = (assigneeIds ?? []).includes(null);

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

  useEffect(() => {
    dispatch(fetchAllEmployeesAsync());
  }, []);

  // ── Event bus subscriptions ───────────────────────────────────────────────
  // Ignore the event payload; refetch the page in hand (and the summary beside it).
  useEventBus(EVENT_KEYS.leadCreated, refetchWithSummary);
  useEventBus(EVENT_KEYS.leadUpdated, refetchWithSummary);
  useEventBus(EVENT_KEYS.leadDeleted, refetchWithSummary);
  // chartSettingsUpdated only changes visual config — no data re-fetch needed
  useEventBus(EVENT_KEYS.closeChartDialogModal, handleCloseChartSettingsModal);

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
      // Reminders and meetings are the viewer's own, so Read on Leads is enough (the page needs it).
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
      // Computed in the browser, so the server cannot order by it.
      enableSorting: false,
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
      // Computed in the browser, so the server cannot order by it.
      enableSorting: false,
      header: "Total Cost",
      size: 130,
      meta: { defaultVisible: false },
      Cell: ({ cell }: { cell: any }) => {
        const v = cell.getValue();
        return v !== undefined ? `${currencyPrefix()}${Number(v).toLocaleString()}` : `${currencyPrefix()}0`;
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
        serviceMap.get(cell.getValue()) || "N/A",
    },
    {
      accessorKey: "category",
      header: "Category",
      size: 150,
      meta: { defaultVisible: false },
      Cell: ({ cell }: { cell: any }) =>
        categoryMap.get(cell.getValue()) || "N/A",
    },
    {
      accessorKey: "subCategory",
      header: "Sub Category",
      size: 150,
      meta: { defaultVisible: false },
      Cell: ({ cell }: { cell: any }) =>
        subCategoryMap.get(cell.getValue()) || "N/A",
    },
    {
      accessorKey: "status",
      header: "Lead Status",
      size: 150,
      Cell: ({ row }: any) => <LeadStatusPill status={row?.original?.status} />,
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
        employeeMap.get(cell.getValue()) || "N/A",
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
      // Computed in the browser, so the server cannot order by it.
      enableSorting: false,
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
        employeeMap.get(cell.getValue()) || "N/A",
    },
    {
      accessorKey: "updatedBy",
      header: "Edited By",
      size: 140,
      meta: { defaultVisible: false },
      Cell: ({ cell }: { cell: any }) =>
        employeeMap.get(cell.getValue()) || "N/A",
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
      // Computed in the browser, so the server cannot order by it.
      enableSorting: false,
      header: "Area",
      size: 120,
      meta: { defaultVisible: false },
      Cell: ({ cell }: { cell: any }) => cell.getValue() || "N/A",
    },
    {
      accessorKey: "cost",
      // Computed in the browser, so the server cannot order by it.
      enableSorting: false,
      header: "Cost",
      size: 120,
      meta: { defaultVisible: false },
      Cell: ({ cell }: { cell: any }) =>
        cell.getValue() ? `${currencyPrefix()}${Number(cell.getValue()).toLocaleString()}` : `${currencyPrefix()}0`,
    },
    {
      accessorKey: "fileLocation",
      // Computed in the browser, so the server cannot order by it.
      enableSorting: false,
      header: "File Location",
      size: 200,
      // "File Location in Computer" in the form = Company Type + Company. The lead stores
      // those as IDs, so resolve them to names; fall back to the free-text path.
      Cell: ({ row }: { row: any }) => {
        const path = row?.original?.fileLocation;
        // Names resolved by the server; the raw value when it is already a name / unmapped.
        const company = row?.original?.fileLocationCompanyName || row?.original?.fileLocationCompany || "";
        const type = row?.original?.fileLocationCompanyTypeName || row?.original?.fileLocationCompanyType || "";
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
  ].filter((c: any) => canViewCommercial('crm.leads') || !['totalCost', 'cost'].includes(c.accessorKey)), [
    serviceMap,
    categoryMap,
    subCategoryMap,
    employeeMap,
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
  ].filter((c) => canViewCommercial('crm.leads') || !['totalCost', 'cost'].includes(c.key)), []);

  // Organization filter options: every organization the user can see, plus an
  // "Unassigned" entry only when legacy leads without one are actually present —
  // no point offering a filter that can only ever return nothing.
  const organizationFilterOptions = useMemo(() => {
    const options = leadOrganizations.map((org) => ({ value: org.id, label: org.name }));
    return summary?.hasUnassignedOrganization
      ? [...options, { value: UNASSIGNED_ORG_VALUE, label: UNASSIGNED_ORG_LABEL }]
      : options;
  }, [leadOrganizations, summary?.hasUnassignedOrganization]);

  // Only show the full-page loader on the INITIAL load (no data yet). Placed AFTER all
  // hooks so the hook order is identical on every render (React requires this — an early
  // return before a hook causes "Rendered fewer hooks than expected"). On subsequent
  // refetches the table stays mounted instead of flashing the loader.
  if (loading && tableData.length === 0) return <Loader />;

  const hasAnyFilter = statusFilter || organizationFilter || assignedToFilter;
  const clearAllFilters = () => {
    setStatusFilter("");
    setOrganizationFilter("");
    setAssignedToFilter("");
  };

  // ── Total cost for filtered data ─────────────────────────────────────────────
  // Summed by the server over every matching lead, not just the page in hand.
  const totalFilteredCost = summary?.totalValue ?? 0;
  const formatCost = (amount: number) => {
    if (amount >= 1_00_00_000)
      return `${currencyPrefix()}${(amount / 1_00_00_000).toFixed(2)} Cr`;
    if (amount >= 1_00_000) return `${currencyPrefix()}${(amount / 1_00_000).toFixed(2)} L`;
    return `${currencyPrefix()}${amount.toLocaleString(getCurrencyLocale())}`;
  };

  // ── Shared heights ─────────────────────────────────────────────────────────
  // Matches the table toolbar beside it (kit 'sm' select = 34px).
  const FILTER_HEIGHT = "34px";

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
      <Box sx={{ px: { xs: 2, md: 3 }, py: 1.5, background: '#fff', borderBottom: '1px solid #F1F5F9' }}>
        {/* ONE ROW: period selector on the left; Bulk Import, + New Lead and the KPI
            summary on the right. */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
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

            {/* Right side: KPI summary, then Bulk Import and + New Lead */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              width: isMobile ? '100%' : 'auto',
              justifyContent: isMobile ? 'space-between' : 'flex-end'
            }}>
              {/* KPI summary */}
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
                {canViewCommercial('crm.leads') && (<>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Value:</span>
                  <span style={{ fontSize: '14px', color: '#1E3A8A', fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>{formatCost(totalFilteredCost)}</span>
                </div>
                <div style={{ width: '1px', height: '14px', backgroundColor: '#E2E8F0' }} />
                </>)}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Results:</span>
                  <span style={{ fontSize: '14px', color: '#1E3A8A', fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>
                    {totalRecords} / {summary?.scopeTotal ?? totalRecords}
                  </span>
                </div>
              </div>

              {canWrite && (<>
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
                  justifyContent: 'center',
                  // Share the row on phones; keep their natural width on desktop and never
                  // let the label wrap mid-word when the row gets tight.
                  flex: isMobile ? 1 : '0 0 auto',
                  whiteSpace: 'nowrap',
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
                  justifyContent: 'center',
                  boxShadow: "0 1px 2px rgba(16, 24, 40, 0.05)",
                  flex: isMobile ? 1 : '0 0 auto',
                  whiteSpace: 'nowrap',
                }}
              >
                + New Lead
              </button>
              </>)}
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
      </Box>

      {/* MaterialTable opens with a shared `pt-6` (24px) gutter; tightened here, same as
          Projects. `!important` because Bootstrap's own `.pt-6` utility carries it. */}
      <Box sx={{ "& > .pt-6": { paddingTop: "8px !important" } }}>
        <MaterialTable
          columns={columns}
          data={tableData}
          tableName="LeadsTablesMainV2"
          defaultSorting={[{ id: "inquiryDate", desc: true }]}
          // The server owns paging, sorting and search — all three together, or one of them
          // would act on the single page the browser holds while implying every lead.
          manualPagination
          manualSorting
          manualFiltering
          rowCount={totalRecords}
          paginationState={pagination}
          onPaginationChange={setPagination}
          onSortingChange={setSorting}
          onSearchChange={setSearch}
          isLoading={pageLoading}
          // Per-column filters and grouping would act on one page only.
          enableFilters={false}
          enableGrouping={false}
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
              data={tableData}
              // Every lead matching the filters, not just this page.
              getData={fetchAllRows}
              columns={leadsExportColumns}
              filename="leads-management"
              title="Leads Management"
              subtitle="Inquiry-wise leads, costs, and status"
              sheetName="Leads"
              showTotals
              totalLabel="TOTAL"
              disabled={!totalRecords}
            />
          )}
          employeeId={currentEmployeeId}
          resource="LEADS"
          viewOwn={true}
          viewOthers={true}
          checkOwnWithOthers={true}
          enableColumnResizing={true}
          layoutMode="semantic"
          // Only the rows in view are rendered, so 1000 rows per page costs what ~20 do.
          // Switches MRT to grid layout; the 700px maxHeight below is the viewport it windows.
          enableRowVirtualization
          muiTableContainerProps={{
            sx: { maxHeight: "700px", overflowX: "auto" },
          }}
          muiTableProps={{
            // Precise column widths: `fixed` makes each column exactly its `size`
            // (no stretching to fill), and `max-content` sizes the table to the sum
            // of the columns so there's no forced dead space. Horizontal scroll kicks
            // in via the container's overflowX when the columns exceed the viewport.
            sx: leadTableSx,
            muiTableBodyRowProps: ({ row }: any) => ({
              sx: leadRowSx(row.original?.status?.color),
              onClick: () =>
                navigate(`/leads/${row.original.id}`, {
                  state: { leadData: row.original.id },
                }),
            }),
          }}
        />
      </Box>

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

      <ChartVisibilityModal
        show={showChartSettingsModal}
        onHide={handleCloseChartSettingsModal}
        type={PROJECT_CHART_SETTINGS_MODAL_TYPE.LEAD}
      />

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
