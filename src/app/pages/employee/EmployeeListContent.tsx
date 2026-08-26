import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import dayjs from "dayjs";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { KTIcon } from "@metronic/helpers";
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
import StatusToggle from "@app/modules/common/components/StatusToggle";
import { ToolbarFilterSelect } from "@app/modules/common/components/ui/ToolbarFilterSelect";
import { ActionIconButton, WhatsAppIcon, AppIcon } from "@app/modules/common/components/ui";
import { Box, Stack } from "@mui/material";
import { useRootOrgNames } from "@hooks/useRootOrgNames";
import EmployeeIdCardDialog from "./components/idcard/EmployeeIdCardDialog";

type StatusType = "all" | "active" | "inactive";

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
  const rowActionsColumn = useMemo(() => actionsColumn({
    Cell: ({ row }: any) => {
      const canEditOthers = canManageEmployees && hasPermission(
        resourceNameMapWithCamelCase.employee,
        permissionConstToUseWithHasPermission.editOthers,
      );

      if (canEditOthers) {
        return (
          <Stack direction="row" spacing={1}>
            <ActionIconButton
              iconName="pencil"
              title="Edit Employee"
              onClick={() => handleEditClick(row.original.id)}
            />
            <ActionIconButton
              icon={<WhatsAppIcon size={17} />}
              title="Share on WhatsApp"
              tone="success"
              onClick={() => handleWhatsAppShare(row.original)}
            />
            <ActionIconButton
              iconName="badge"
              title="Generate ID Card"
              tone="brand"
              onClick={() => handleGenerateIdCard(row.original)}
            />
          </Stack>
        );
      }

      if (row.original.id === employeeId) {
        return (
          <Stack direction="row" spacing={1}>
            <ActionIconButton
              iconName="badge"
              title="View My ID Card"
              tone="brand"
              onClick={() => handleGenerateIdCard(row.original)}
            />
          </Stack>
        );
      }

      // A dash, not "Not Allowed": on a colleague's row there is simply nothing to do
      // here, and phrasing it as a denial reads as an error the user should act on.
      return <Box component="span" sx={{ color: "text.disabled" }}>—</Box>;
    },
  }), [handleEditClick, handleWhatsAppShare, handleGenerateIdCard, employeeId, canManageEmployees]);

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
    <div className="d-flex flex-row flex-md-row align-items-center justify-content-between mt-5 w-100 gap-3">

  {/* Left side — Status Toggle */}
  <div className="d-flex align-items-center">
    <StatusToggle
      selectedStatus={selectedStatus}
      onStatusChange={setSelectedStatus}
      counts={statusCounts}
    />
  </div>

  {/* Right side — New Employee button */}
  {hasPermission(
    resourceNameMapWithCamelCase.employee,
    permissionConstToUseWithHasPermission.create
  ) && (
    <div
      className="card-toolbar text-end d-flex align-items-center justify-content-center"
      data-bs-toggle="tooltip"
      data-bs-placement="top"
      data-bs-trigger="hover"
      title="Click to add new employee"
    >
      <Link to="/employees/create-new" className="btn btn-md btn-light-primary">
        <KTIcon iconName="plus" className="fs-2" />
        New Employee
      </Link>
    </div>
  )}
</div>


    {/* Filter toolbar */}
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', padding: '8px 4px', marginTop: '8px' }}>
      <ToolbarFilterSelect
        label="Branch"
        icon="bi-geo-alt"
        value={branchFilter}
        onChange={setBranchFilter}
        minWidth={170}
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
        minWidth={220}
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
        minWidth={170}
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
    </div>

    {/* Table section */}
    {/* No refetch overlay here on purpose. `dataLoading` is true on EVERY fetch, not just the
        first, so a white scrim + spinner + 300px height snap fired on every sort/page click —
        hiding rows the app was still holding (useServerPagination keeps the previous page in
        state until the new one resolves) and reading as "sorting is slow". The table's own
        progress bar covers this state, and the first-load case is already handled above by the
        page-level guard. The other two server-sorted tables gate their Loader on
        isInitialLoading only; this one was the outlier. */}
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
