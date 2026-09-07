import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import dayjs from "dayjs";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { KTIcon, PAGE_SIZE_OPTIONS } from "@metronic/helpers";
import { fetchEmployeesPage, fetchEmployeeFacets } from "@services/employee";
import { useServerPagination } from "@hooks/useServerPagination";
import {
  buildEmployeeListParams,
  employeeFilterKey,
  type EmployeeListFilters,
  type FacetOption,
} from "./employeeListParams";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { actionsColumn, dateColumn, employeeColumn } from "@app/modules/common/components/table/columns";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { hasPermission } from "@utils/authAbac";
import { usePermission } from "@hooks/usePermission";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { fetchAllBranches } from "@services/company";
import Loader from "@app/modules/common/utils/Loader";
import { getEmployeeStatusString, calculateTotalExperience } from "@utils/employeeStatus";
import { ToolbarFilterSelect } from "@app/modules/common/components/ui/ToolbarFilterSelect";
import {
  ActionIconButton, AppIcon, AutoGrid, GlassSurface, Pager,
  StatusCyclePill, ViewModeSwitch, WhatsAppIcon, riseInSx,
} from "@app/modules/common/components/ui";
import { Box, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import { useDebounce } from "@metronic/helpers";
import { useRootOrgNames } from "@hooks/useRootOrgNames";
import EmployeeIdCardDialog from "./components/idcard/EmployeeIdCardDialog";
import EmployeeCard from "./components/EmployeeCard";

type StatusType = "all" | "active" | "inactive";
type ViewMode = "table" | "cards";

/** Remembered across visits: a view preference that resets on every navigation is
 *  one the user has to keep re-picking. Guarded because storage THROWS, not just
 *  returns null, when a browser blocks site data — same shape as the document
 *  vault's. */
const VIEW_MODE_KEY = "employeeListView";

const readStoredViewMode = (): ViewMode => {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === "cards" ? "cards" : "table";
  } catch {
    return "table";
  }
};

/** Cycles Active → Inactive → All, carrying that tab's count. Same control and the
 *  same three hues as the documents directory. */
const STATUS_OPTIONS: ReadonlyArray<{ value: StatusType; label: string; color: string }> = [
  { value: "active", label: "Active", color: "#15803D" },
  { value: "inactive", label: "Inactive", color: "#B45309" },
  { value: "all", label: "All", color: "#1E3A8A" },
];

/** The same grid/list control the document vault uses — a layout switch is
 *  recognised by its glyph, and labelling it competes with the real filters. */
/**
 * Page sizes the CARD view offers.
 *
 * Capped at the server's own limit. `paginationMiddleware()` is mounted on
 * `/api/employee/all` with its default `maxLimit = 100`, so a request for 500 comes
 * back holding 100 rows while the client keeps paging as though it received 500 —
 * every page past the first lands at the wrong offset and rows are skipped. The
 * two larger entries in PAGE_SIZE_OPTIONS are therefore not offered here.
 */
const CARD_PAGE_SIZES = PAGE_SIZE_OPTIONS.filter((size) => size <= 100);

const VIEW_OPTIONS = [
  { value: "cards" as const, icon: "bi-grid-3x3-gap-fill", label: "Card view" },
  { value: "table" as const, icon: "bi-list-ul", label: "Table view" },
];

interface StatusCounts {
  all: number;
  active: number;
  inactive: number;
}

/**
 * API row -> table row. Hoisted out of the fetch so the paginated path can reuse it.
 * `branchesData` is only a fallback for rows without a joined branch.
 */
const mapEmployeeRow = (obj: Record<string, any>, branchesData: any[]) => {
  const employeeNewStatus = getEmployeeStatusString(obj as any);
  // Resolved by the API via the EmployeeReferredBy relation. This used to be a
  // client-side join across the whole list, which only worked while the browser held
  // every employee.
  const referredBy = obj.referredBy;
  const employeeTypeMap: Record<string, string> = {};

  return {
    ...obj,
    users: `${obj.users.firstName} ${obj.users.lastName}`,
    experience: calculateTotalExperience(obj as any),
    designations: obj.designations ? obj?.designations?.role : "N/A",
    departments: obj.departments ? obj.departments.name : "N/A",
    dateOfJoining: obj.dateOfJoining ? dayjs(obj.dateOfJoining).format("DD/MM/YYYY") : "N/A",
    createdAt: obj.createdAt ? dayjs(obj.createdAt).format("DD/MM/YYYY") : "N/A",
    employeeType: employeeTypeMap[obj.employeeTypeId] || "N/A",
    dateOfExit: obj.dateOfExit ? dayjs(obj.dateOfExit).format("DD/MM/YYYY") : "N/A",
    dateOfReJoining: obj.dateOfReJoining ? dayjs(obj.dateOfReJoining).format("DD/MM/YYYY") : "N/A",
    dateOfReExit: obj.dateOfReExit ? dayjs(obj.dateOfReExit).format("DD/MM/YYYY") : "N/A",
    branches: obj.branches?.name || branchesData.find((b: any) => b.id === obj.branchId)?.name || "N/A",
    subOrganization: obj.companyOverview?.name || "N/A",
    payType: obj.professionalFeesEnabled ? "Contract Based" : "Salary Based",
    employeeStatus: employeeNewStatus,
    gender: obj.gender === 0 ? "Male" : (obj.gender === 1 ? "Female" : (obj.gender === 2 ? "Other" : "N/A")),
    maritalStatus: obj.maritalStatus ? "Unmarried" : (obj.maritalStatus === 0 ? "Married" : "N/A"),
    referredBy: referredBy?.users ? `${referredBy.users.firstName} ${referredBy.users.lastName}` : "N/A",
    mealPreference: obj.veganMealPreference ? "Vegan" : obj.nonVegMealPreference ? "Non-Vegetarian" : obj.vegMealPreference ? "Vegetarian" : "N/A",
    avatar: obj.avatar || "",
    // Same precedence the ID card uses (see the id-card handler): onboarding writes
    // EmployeeEmergencyDetails, `users.bloodGroup` is the fallback for older rows.
    // Resolved HERE, off `obj`, because `users` is overwritten above with the name.
    bloodGroup: obj.EmployeeEmergencyDetails?.[0]?.bloodGroup?.trim() || obj.users?.bloodGroup || null,
  };
};

const EmployeeListContent = () => {
  const [branches, setBranches] = useState<any[]>([]);
  // Search and sort are owned here now, not by the table: the server applies them, so the
  // page has to know the values to send. The table reports them via onSearchChange /
  // onSortingChange.
  const [search, setSearch] = useState<string>("");
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([]);
  const [facets, setFacets] = useState<{ branches: FacetOption[]; subOrganizations: FacetOption[] }>({
    branches: [],
    subOrganizations: [],
  });
  const [selectedStatus, setSelectedStatus] = useState<StatusType>("active");
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ all: 0, active: 0, inactive: 0 });
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [subOrgFilter, setSubOrgFilter] = useState<string>('All');
  const [payTypeFilter, setPayTypeFilter] = useState<string>('All');
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
  const rootOrgNames = useRootOrgNames();
  // Which employee's ID card is on screen. Held as {id, name} rather than a boolean
  // so the dialog can title itself before its own fetch resolves.
  const [idCardTarget, setIdCardTarget] = useState<{ id: string; name: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(readStoredViewMode);
  // Card mode has no table, so it carries its own search box. Debounced before it
  // reaches `search`, exactly as MaterialTable debounces its own — otherwise every
  // keystroke would be a request.
  const [cardSearch, setCardSearch] = useState("");
  const debouncedCardSearch = useDebounce(cardSearch, 300);

  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Opens the employee the row belongs to.
   *
   * The name was the only target in a row several hundred pixels wide, so most of
   * the row looked clickable and did nothing. The guards are what keep that from
   * hijacking the cells that already do something: Company Phone and Email are real
   * links, the Actions column is buttons, and a click that lands on one of those
   * belongs to it, not to the row.
   */
  const openEmployeeRow = useCallback(
    (employeeId: string, event: React.MouseEvent<HTMLElement>) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('a, button, input, label, [role="button"], [role="menuitem"], [role="checkbox"]')) return;
      // Dragging across a cell to copy a phone number should not also navigate away.
      if (window.getSelection()?.toString()) return;

      const path = `/employees/${employeeId}`;
      // Ctrl/Cmd-click and middle-click are the universal "open in a new tab"
      // gestures; a row that navigates is a link in all but markup, so it should
      // honour them rather than swallowing them.
      if (event.ctrlKey || event.metaKey || event.button === 1) {
        window.open(path, "_blank", "noopener");
        return;
      }
      navigate(path);
    },
    [navigate]
  );

  // Parse calculateTotalExperience() output to total months for sorting.
  // It emits FOUR shapes — "2 Years 4 Months", "2 Years", "4 Months",
  // "Less than 1 Month" (and "-") — so years and months must be matched
  // independently. Requiring both in one pattern returned 0 for every row
  // except the combined form, which made the comparator a no-op.
  const parseExperienceToMonths = (exp: string | null | undefined): number => {
    if (!exp || /less than/i.test(exp)) return 0;
    const years = Number(exp.match(/(\d+)\s*Years?/i)?.[1] ?? 0);
    const months = Number(exp.match(/(\d+)\s*Months?/i)?.[1] ?? 0);
    return years * 12 + months;
  };


  const handleEditClick = useCallback((employeeId: string) => {
    navigate(`/employees/edit/${employeeId}`, {
      state: { employeeId, returnTo: `${location.pathname}${location.search}` },
    });
  }, [navigate, location]);

  const handleWhatsAppShare = useCallback((employee: any) => {
    const message = `Employee Details:
    Name: ${employee.users}
    Designation: ${employee.designations}
    Department: ${employee.departments}
    Email: ${employee.companyEmailId}
    Phone: ${employee.companyPhoneNumber}
    Employee Code: ${employee.employeeCode}
    Branch: ${employee.branches}
    Status: ${employee.employeeStatus}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }, []);

  const handleGenerateIdCard = useCallback((employee: any) => {
    // Own card → request the literal "me", which the API resolves to the caller from
    // the token. The id never leaves the client, so even a tampered row cannot turn
    // this into a request for somebody else's card. Only a user who manages employees
    // ever sends a real id, and that path is permission-checked server-side.
    const isSelf = employee.id === employeeId;
    setIdCardTarget({ id: isSelf ? "me" : employee.id, name: employee.users });
  }, [employeeId]);

  // Memoize base columns to prevent recreation on every render.
  // Default format (order + visibility): Name → Designation → Department →
  // Date Of Joining → Total Experience → Contact. Everything else starts
  // hidden (meta.defaultVisible: false) and stays available in the column
  // panel; users can still toggle any column, and their choice persists.
  const baseColumns = useMemo(() => [
    // Keeps id "users" so existing saved column layouts carry over unchanged.
    employeeColumn<any>({
      id: "users",
      header: "Name",
      name: (r) => r.users,
      avatarUrl: (r) => r.avatar,
      status: (r) => (r.employeeStatus === "Active" ? "active" : "inactive"),
      href: (r) => `/employees/${r.id}`,
    }),
    {
      accessorKey: "departments",
      header: "Department",
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    dateColumn({ accessorKey: "dateOfJoining", header: "Date Of Joining" }),
    {
      accessorKey: "experience",
      // "Tenure", not "Total Experience": this counts time at WiseTech only.
      // Previous employers live in EmployeePreviousExperience and are NOT included.
      header: "Tenure",
      sortingFn: (rowA: any, rowB: any) => {
        const monthsA = parseExperienceToMonths(rowA.getValue("experience"));
        const monthsB = parseExperienceToMonths(rowB.getValue("experience"));
        return monthsA - monthsB;
      },
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    {
      accessorKey: "companyPhoneNumber",
      header: "Company Phone Number",
      Cell: ({ renderedCellValue }: any) => renderedCellValue ? <a href={`tel:${renderedCellValue}`}>{renderedCellValue}</a> : "N/A"
    },
    {
      accessorKey: "designations",
      header: "Designation",
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    {
      accessorKey: "companyEmailId",
      header: "Email Id",
      meta: { defaultVisible: false },
      Cell: ({ renderedCellValue }: any) => renderedCellValue ? <a href={`mailto:${renderedCellValue}`}>{renderedCellValue}</a> : "N/A"
    },
    {
      accessorKey: "branches",
      header: "Branch",
      meta: { defaultVisible: false },
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    {
      accessorKey: "subOrganization",
      header: "Sub Organization",
      meta: { defaultVisible: false },
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    {
      accessorKey: "payType",
      header: "Pay Type",
      meta: { defaultVisible: false },
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
  ], []);

  // Memoize admin columns — all hidden by default (toggle on via the column
  // panel); only the Actions column stays visible for admins.
  const adminColumns = useMemo(() => [
    dateColumn({ accessorKey: "createdAt", header: "Created On", meta: { defaultVisible: false } }),
    // {
    //   accessorKey: "dateOfReJoining",
    //   header: "Date of Rejoining",
    //   Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    // },
    // {
    //   accessorKey: "dateOfReExit",
    //   header: "Date of Re-leaving",
    //   Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    // },
    {
      accessorKey: "employeeType",
      // Not sortable: the value is computed in the browser, so no SQL column
      // reproduces this order. With manualSorting the arrow would do nothing.
      enableSorting: false,
      header: "Type of Employee",
      meta: { defaultVisible: false },
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    {
      accessorKey: "employeeStatus",
      // Not sortable: the value is computed in the browser, so no SQL column
      // reproduces this order. With manualSorting the arrow would do nothing.
      enableSorting: false,
      header: "Status",
      meta: { defaultVisible: false },
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    {
      accessorKey: "employeeCode",
      header: "Employee Code",
      meta: { defaultVisible: false },
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    {
      accessorKey: "gender",
      header: "Gender",
      meta: { defaultVisible: false },
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    {
      accessorKey: "maritalStatus",
      header: "Marital Status",
      meta: { defaultVisible: false },
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    {
      accessorKey: "mealPreference",
      // Not sortable: the value is computed in the browser, so no SQL column
      // reproduces this order. With manualSorting the arrow would do nothing.
      enableSorting: false,
      header: "Meal preference",
      meta: { defaultVisible: false },
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    dateColumn({ accessorKey: "dateOfExit", header: "Date Of Exit", meta: { defaultVisible: false } }),
    {
      accessorKey: "referredBy",
      header: "Referred By",
      meta: { defaultVisible: false },
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "N/A"
    },
    // No deps: these are all plain value renderers. The row actions moved out to
    // `rowActionsColumn` below, and took the handlers with them.
  ], []);

  const canManageEmployees = usePermission('employees.manage.all');

  /**
   * Actions — rendered for EVERYONE, but the row decides what is in it.
   *
   * It used to live in `baseColumns`, so its Cell was gated only on the legacy
   * `hasPermission(..., editOthers)` ABAC check — which resolves true for ordinary
   * employees, handing everybody the full action set on every row. It is its own
   * column now:
   *
   *   • manages employees → edit, WhatsApp share and ID card, on every row.
   *   • everyone else     → the ID card button, and ONLY on their own row.
   *
   * The manager test is `employees.manage.all` (`canManageEmployees`). The legacy
   * ABAC check is kept as an ADDITIONAL requirement for the privileged row, never as
   * the discriminator.
   *
   * Restricting it to their own row is the important half. A card carries a personal
   * phone number, email, blood group and emergency contact, and `users` RBAC still
   * runs in SHADOW mode (RBAC_ENFORCE_USERS) on some deployments — meaning the API
   * would happily answer for a colleague's id and only log the denial. Rendering the
   * button only for `isSelf` means the request is never made, so the gate does not
   * depend on which mode the server happens to be in.
   *
   * Built with the kit's `actionsColumn` helper, so it keeps the shared sizing and
   * the no-sort / no-hide behaviour every other actions column has.
   */
  /**
   * The buttons themselves. Lifted out of the column so the CARD view renders the
   * exact same set under the exact same gate — two copies of this decision is how
   * one view quietly ends up handing everybody the full action set.
   * Returns null when the viewer may do nothing with this employee.
   */
  const renderRowActions = useCallback((employee: any, opts?: { labelled?: boolean }) => {
    const canEditOthers = canManageEmployees && hasPermission(
      resourceNameMapWithCamelCase.employee,
      permissionConstToUseWithHasPermission.editOthers,
    );

    // A card footer is a full-width row, so the buttons carry their names and share
    // it evenly; a table's Actions column is 120px, so there they stay squares.
    const labelled = opts?.labelled ?? false;
    const wide = labelled ? { fullWidth: true } : {};

    const row = (children: React.ReactNode) =>
      labelled
        ? <Stack direction="row" spacing={1} sx={{ width: "100%" }}>{children}</Stack>
        : <Stack direction="row" spacing={1}>{children}</Stack>;

    if (canEditOthers) {
      return row(
        <>
          <ActionIconButton
            iconName="pencil"
            title="Edit Employee"
            label={labelled ? "Edit" : undefined}
            {...wide}
            onClick={() => handleEditClick(employee.id)}
          />
          <ActionIconButton
            icon={<WhatsAppIcon size={17} />}
            title="Share on WhatsApp"
            label={labelled ? "Share" : undefined}
            tone="success"
            {...wide}
            onClick={() => handleWhatsAppShare(employee)}
          />
          <ActionIconButton
            iconName="badge"
            title="Generate ID Card"
            label={labelled ? "ID" : undefined}
            tone="brand"
            {...wide}
            onClick={() => handleGenerateIdCard(employee)}
          />
        </>
      );
    }

    if (employee.id === employeeId) {
      return row(
        <ActionIconButton
          iconName="badge"
          title="View My ID Card"
          label={labelled ? "My ID Card" : undefined}
          tone="brand"
          {...wide}
          onClick={() => handleGenerateIdCard(employee)}
        />
      );
    }

    return null;
  }, [handleEditClick, handleWhatsAppShare, handleGenerateIdCard, employeeId, canManageEmployees]);

  const rowActionsColumn = useMemo(() => actionsColumn({
    Cell: ({ row }: any) =>
      // A dash, not "Not Allowed": on a colleague's row there is simply nothing to do
      // here, and phrasing it as a denial reads as an error the user should act on.
      renderRowActions(row.original) ?? <Box component="span" sx={{ color: "text.disabled" }}>—</Box>,
  }), [renderRowActions]);

  const columns = useMemo(() =>
    canManageEmployees
      ? [...baseColumns, ...adminColumns, rowActionsColumn]
      : [...baseColumns, rowActionsColumn],
    [canManageEmployees, baseColumns, adminColumns, rowActionsColumn]
  );
  
  
  // ── Server-side list ────────────────────────────────────────────────────────
  // This list used to fetch EVERY employee and do paging, filtering, counting and the
  // referrer join in the browser. That is the ceiling on multi-tenant scale, and it is
  // also why the counts, dropdown options and referrer column all silently depended on
  // holding the whole table. All four now come from the API.

  // Branch list is still fetched whole: it is a small reference table, and the row mapper
  // uses it only as a fallback when a row has no joined branch.
  useEffect(() => {
    fetchAllBranches()
      .then(({ data: { branches: branchesData } }) => setBranches(branchesData))
      .catch((error) => console.error("Error fetching branches:", error));
  }, []);

  // Dropdown options come from the API, scoped by status/payType/search but NOT by the
  // branch/sub-org filters themselves — otherwise picking a branch would remove every
  // other branch from the list you picked it from.
  useEffect(() => {
    fetchEmployeeFacets(
      buildEmployeeListParams({
        status: selectedStatus,
        branchName: "All",
        subOrgName: "All",
        payType: payTypeFilter,
        search,
        sorting: [],
        facets: { branches: [], subOrganizations: [] },
      }),
    )
      .then((res) => setFacets(res.data ?? { branches: [], subOrganizations: [] }))
      .catch((error) => console.error("Error fetching employee facets:", error));
  }, [selectedStatus, payTypeFilter, search]);

  const filters: EmployeeListFilters = useMemo(
    () => ({
      status: selectedStatus,
      branchName: branchFilter,
      subOrgName: subOrgFilter,
      payType: payTypeFilter,
      search,
      sorting,
      facets,
    }),
    [selectedStatus, branchFilter, subOrgFilter, payTypeFilter, search, sorting, facets],
  );

  const fetchPage = useCallback(
    async (page: number, limit: number) => {
      const res = await fetchEmployeesPage(page, limit, buildEmployeeListParams(filters));
      const { employees, pagination: meta, counts } = res.data;
      // Counts arrive with the page, computed in SQL against the same filters — they must
      // never be derived from the rows, which are one page.
      if (counts) setStatusCounts(counts);
      return {
        data: employees ?? [],
        totalRecords: meta?.totalRecords ?? employees?.length ?? 0,
      };
    },
    [filters],
  );

  const {
    data: displayedEmployees,
    pagination,
    totalRecords,
    isLoading: dataLoading,
    isInitialLoading: initialLoading,
    setPagination,
  } = useServerPagination<any>({
    fetchFunction: fetchPage,
    initialPageSize: 25,
    transformData: (rows: any[]) => rows.map((obj) => mapEmployeeRow(obj, branches)),
    // Any change to what the SERVER filters or orders by must snap back to page 1 —
    // asking for page 5 of a newly-narrowed result set renders an empty table.
    resetKey: `${employeeFilterKey(filters)}|${sorting.map((s) => `${s.id}:${s.desc}`).join()}`,
  });

  // Preserve the page across navigation (opening an employee and coming back).
  // useServerPagination owns pagination now, so this restores THROUGH it rather than
  // holding a rival copy — restoring once, guarded, because a re-run would yank the user
  // back to the stored page every time they turned one.
  const pageRestoredRef = useRef(false);
  useEffect(() => {
    if (pageRestoredRef.current) return;
    pageRestoredRef.current = true;
    const saved = parseInt(sessionStorage.getItem("employeeListPage") ?? "0", 10);
    if (saved > 0) setPagination((prev) => ({ ...prev, pageIndex: saved }));
  }, [setPagination]);

  useEffect(() => {
    sessionStorage.setItem("employeeListPage", String(pagination.pageIndex));
  }, [pagination.pageIndex]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      // Storage blocked — the choice just does not survive the visit.
    }
  }, [viewMode]);

  /**
   * Remount key for the card grid, so the slide-up entrance REPLAYS on every fresh
   * page instead of only on first mount.
   *
   * Keyed on the data rather than on `pagination.pageIndex`, which is when the page
   * was REQUESTED. useServerPagination deliberately holds the previous page on
   * screen until the new one resolves, so a pageIndex key animates the OLD rows and
   * then swaps in the new ones with no animation at all — exactly backwards.
   * `displayedEmployees` is a new array only when a fetch has actually landed.
   */
  const [gridKey, setGridKey] = useState(0);
  const shownRows = useRef(displayedEmployees);
  const shownPage = useRef(pagination.pageIndex);
  useEffect(() => {
    // Replay the entrance for a NEW PAGE, and nothing else.
    //
    // Keyed on every data change it fired on each debounced search keystroke, each
    // filter and each status flip — the grid tore down and faded back in over and
    // over, which is what read as blinking. Keyed on `pageIndex` alone it fires the
    // moment you CLICK, while useServerPagination is still holding the old rows, so
    // it animates the outgoing page and swaps the new one in with no animation.
    //
    // So: wait for rows to actually land (identity change), then animate only if
    // they belong to a different page than the ones already on screen.
    if (shownRows.current === displayedEmployees) return;
    shownRows.current = displayedEmployees;
    if (shownPage.current === pagination.pageIndex) return;
    shownPage.current = pagination.pageIndex;
    setGridKey((previous) => previous + 1);
  }, [displayedEmployees, pagination.pageIndex]);

  // Only card mode publishes this query; in table mode the engine owns `search` and
  // writing here would fight it. Switching INTO cards starts from a blank box, so the
  // query resets with the view rather than persisting invisibly.
  useEffect(() => {
    if (viewMode !== "cards") return;
    setSearch(debouncedCardSearch ?? "");
  }, [viewMode, debouncedCardSearch]);

  const branchOptions = useMemo(
    () => facets.branches.map((b) => b.name).sort(),
    [facets],
  );

  const subOrgOptions = useMemo(
    // Exclude the top-level org — only actual sub-orgs belong in this dropdown.
    () => facets.subOrganizations.map((o) => o.name).filter((n) => !rootOrgNames.has(n)).sort(),
    [facets, rootOrgNames],
  );

  const hasActiveFilters = branchFilter !== 'All' || subOrgFilter !== 'All' || payTypeFilter !== 'All';

  if (initialLoading) {
    return <Loader />;
  }

  return (
  <>
    {/*
      Toolbar — ONE surface, two rows, on every width.

      It used to be three sibling blocks with their own margins and a stray
      `padding: 8px 4px`, so nothing shared a left edge with the list below it and a
      phone got five stacked strips before the first employee. Now:

        row 1 · status + layout switch  |  search + New Employee
                — on a phone search drops to a line of its own (see the `order` note
                  below), so nothing reflows while you type
        row 2 · the three filters, equal width, collapsing to one column on a phone

      Every control here is 38px tall, so the two rows line up whatever wraps.
    */}
    <GlassSurface
      variant="thin"
      radius={16}
      sx={{ mt: 3, p: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
          {/* One pill that names the current view and cycles, not three segments —
              the control the documents directory uses. Three segments plus the
              layout switch plus New Employee did not fit a phone row; this does. */}
          <StatusCyclePill<StatusType>
            options={STATUS_OPTIONS.map((option) => ({ ...option, count: statusCounts[option.value] }))}
            value={selectedStatus}
            onChange={setSelectedStatus}
          />
          <ViewModeSwitch<ViewMode>
            options={VIEW_OPTIONS}
            value={viewMode}
            onChange={setViewMode}
            ariaLabel="Employee list layout"
          />
        </Box>

        {/*
          Search and New Employee are SIBLINGS in this wrapping row, placed by `order`
          and `flex-basis` alone — one element, no duplicate field, no JS breakpoint.

            phone   · order 2 + basis 100% → search is pushed onto its own line, and
                      New (order 1, `ml: auto`) finishes line one on the right.
            desktop · order 1 + `ml: auto` → search pairs up with New at the right of
                      line one, and there is no second line at all.

          Card mode only: in table mode the table engine owns search, and a second
          box would send two different queries to the same list.
        */}
        {viewMode === "cards" && (
          <TextField
            size="small"
            value={cardSearch}
            onChange={(event) => setCardSearch(event.target.value)}
            placeholder="Search employees…"
            aria-label="Search employees"
            sx={{
              order: { xs: 2, sm: 1 },
              flexBasis: { xs: "100%", sm: 260 },
              flexGrow: 0,
              ml: { sm: "auto" },
              "& .MuiOutlinedInput-root": { height: 38, borderRadius: "10px", fontSize: 13 },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AppIcon name="bi-search" className="fs-6" />
                </InputAdornment>
              ),
            }}
          />
        )}

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            order: { xs: 1, sm: 2 },
            // Exactly ONE of the pair carries the auto margin, or the two split the
            // free space and open a gap between them. On a phone that is always this
            // button (search is on its own line); on desktop it is search — unless
            // there is no search, in table mode, when it falls back here.
            ml: { xs: "auto", sm: viewMode === "cards" ? 0 : "auto" },
            flexShrink: 0,
          }}
        >
          {hasPermission(
            resourceNameMapWithCamelCase.employee,
            permissionConstToUseWithHasPermission.create
          ) && (
            <Link
              to="/employees/create-new"
              className="btn btn-md btn-light-primary"
              title="Click to add new employee"
              style={{ height: 38, display: "inline-flex", alignItems: "center", flexShrink: 0, whiteSpace: "nowrap" }}
            >
              <KTIcon iconName="plus" className="fs-2" />
              New{" "}
              {/* "New Employee" is ~150px; on a phone that is half the row. The word
                  it drops is the one the surrounding page already establishes. */}
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" }, ml: 0.5 }}>
                Employee
              </Box>
            </Link>
          )}
        </Box>
      </Box>

      {/* Row 2. A GRID, not a wrapping flex row: `minWidth` on the selects made
          them three different widths that reflowed into a ragged second line the
          moment a branch name grew. Equal tracks, one column on a phone. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr)) auto' },
          gap: 1.5,
          alignItems: 'center',
        }}
      >
      <ToolbarFilterSelect
        label="Branch"
        icon="bi-geo-alt"
        value={branchFilter}
        onChange={setBranchFilter}
        theme={branchFilter !== 'All' ? { icon: '#3b82f6', border: '#bfdbfe', bg: '#eff6ff', text: '#1e40af', ring: 'rgba(59, 130, 246, 0.12)' } : undefined}
        options={[
          { value: 'All', label: 'All Branches' },
          ...branchOptions.map((name) => ({ value: name, label: name })),
        ]}
      />
      <ToolbarFilterSelect
        label="Sub Organization"
        icon="bi-building"
        value={subOrgFilter}
        onChange={setSubOrgFilter}
        theme={subOrgFilter !== 'All' ? { icon: '#3b82f6', border: '#bfdbfe', bg: '#eff6ff', text: '#1e40af', ring: 'rgba(59, 130, 246, 0.12)' } : undefined}
        options={[
          { value: 'All', label: 'All Sub Organizations' },
          ...subOrgOptions.map((name) => ({ value: name, label: name })),
        ]}
      />
      <ToolbarFilterSelect
        label="Pay Type"
        icon="bi-briefcase"
        value={payTypeFilter}
        onChange={setPayTypeFilter}
        theme={payTypeFilter === 'Salary Based' ? { icon: '#16a34a', border: '#bbf7d0', bg: '#f0fdf4', text: '#166534', ring: 'rgba(22, 163, 74, 0.12)' } : payTypeFilter === 'Contract Based' ? { icon: '#7c3aed', border: '#ddd6fe', bg: '#f5f3ff', text: '#5b21b6', ring: 'rgba(124, 58, 237, 0.12)' } : undefined}
        options={[
          { value: 'All', label: 'All Pay Types' },
          { value: 'Salary Based', label: 'Salary Based' },
          { value: 'Contract Based', label: 'Contract Based' },
        ]}
      />
      {hasActiveFilters && (
        <button
          onClick={() => { setBranchFilter('All'); setSubOrgFilter('All'); setPayTypeFilter('All'); }}
          title="Reset filters"
          style={{
            height: '38px', padding: '0 12px',
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            border: '1px dashed #fca5a5', borderRadius: '10px',
            backgroundColor: '#ffffff', color: '#dc2626',
            fontFamily: 'Inter, sans-serif', fontSize: '12.5px', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
        >
          <AppIcon name="bi-arrow-counterclockwise" className="fs-7" />
          Reset
        </button>
      )}
      </Box>
    </GlassSurface>

    {/* No refetch overlay here on purpose. `dataLoading` is true on EVERY fetch, not just the
        first, so a white scrim + spinner + 300px height snap fired on every sort/page click —
        hiding rows the app was still holding (useServerPagination keeps the previous page in
        state until the new one resolves) and reading as "sorting is slow". The table's own
        progress bar covers this state, and the first-load case is already handled above by the
        page-level guard. The other two server-sorted tables gate their Loader on
        isInitialLoading only; this one was the outlier. */}
    {viewMode === "cards" ? (
      <Box sx={{ mt: 2 }}>
        {displayedEmployees.length === 0 ? (
          <Typography sx={{ py: 6, textAlign: "center", color: "text.secondary", fontSize: 14 }}>
            No employees match these filters.
          </Typography>
        ) : (
          // The animation is on the GRID, not per card: one compositor layer that
          // cannot judder, instead of 25 staggered ones that fill in patches. A CSS
          // animation only replays on mount, hence `gridKey`.
          <AutoGrid key={gridKey} min={320} gap={14} sx={riseInSx()}>
            {displayedEmployees.map((employee: any) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                onOpen={(event) => openEmployeeRow(employee.id, event)}
                actions={renderRowActions(employee, { labelled: true })}
              />
            ))}
          </AutoGrid>
        )}

        {/* Drives the SAME server pagination the table does — cards are a different
            rendering of one page, not a second data path. The server slices in SQL
            (skip/take in listEmployees), so a page is all that is ever fetched. */}
        <Pager
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          totalRecords={totalRecords}
          itemNoun="employees"
          onPageChange={(pageIndex) => setPagination((prev: any) => ({ ...prev, pageIndex }))}
          pageSizeOptions={CARD_PAGE_SIZES}
          // Back to page 1: page 4 of a 25-per-page list is past the end at 100.
          onPageSizeChange={(pageSize) => setPagination({ pageIndex: 0, pageSize })}
        />
      </Box>
    ) : (
    <div className="">
      <MaterialTable
        columns={columns}
        data={displayedEmployees}
        tableName="EmployeesV5"
        employeeId={employeeId}
        enableColumnSpecificSearch={true}
        // Pilot for bulk actions. Selecting rows makes the existing Export button act on
        // just those rows — read-only, so the pattern gets proven before anything that
        // writes. No other prop needed; the engine handles the rest.
        enableRowSelection={true}
        // Server owns paging, sorting AND search. All three must move together: with any
        // one left client-side it would act on the single page the browser holds while
        // implying the whole result set.
        manualPagination={true}
        manualSorting={true}
        manualFiltering={true}
        rowCount={totalRecords}
        paginationState={pagination}
        onPaginationChange={setPagination}
        onSortingChange={setSorting}
        onSearchChange={setSearch}
        isLoading={dataLoading}
        muiTableProps={{
          muiTableBodyRowProps: ({ row }: any) => ({
            onClick: (event: React.MouseEvent<HTMLElement>) => openEmployeeRow(row.original.id, event),
            // Middle-click does not fire onClick anywhere; it fires auxclick.
            onAuxClick: (event: React.MouseEvent<HTMLElement>) => {
              if (event.button === 1) openEmployeeRow(row.original.id, event);
            },
            sx: { cursor: "pointer" },
          }),
        }}
      />
    </div>
    )}

    {/* Mounted only while a card is open, so closing it drops the (photo-heavy)
        payload from the tree instead of keeping every previewed card alive. */}
    {idCardTarget && (
      <EmployeeIdCardDialog
        open
        employeeId={idCardTarget.id}
        employeeName={idCardTarget.name}
        onClose={() => setIdCardTarget(null)}
      />
    )}
  </>
);
};
export default EmployeeListContent;
