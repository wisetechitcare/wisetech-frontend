import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/ds/lib/utils';
import { DataTable, SortableHeader, type ColumnDef } from '@/ds/patterns/data-table';
import { EmptyState } from '@/ds/patterns/empty-state';
import { PersonCell } from '@/ds/patterns/person';
import { SectionHeader } from '@/ds/patterns/section-header';
import {
  fetchMonthlyReimbursementsOfAllEmp,
  fetchYearlyReimbursementsOfAllEmp,
  fetchAllTimeReimbursementsOfAllEmp,
} from '@utils/statistics';
import { fetchAllEmployees } from '@services/employee';
import { IReimbursementsFetch } from '@models/employee';
import PeriodTabs from '@app/modules/common/components/PeriodTabs';
import { PeriodNavigator } from '@/ds/patterns/period-navigator';
import { DataTableExport } from '@app/modules/common/components/table/DataTableExport';
import { useOrgFilters, OrgFilterSheetButton } from '@app/modules/common/components/ui/OrgFilterToolbar';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import { formatFiscalYearLabel } from '@utils/fiscalYearHelper';
import ReimbursementSummaryCard from './ReimbursementSummaryCard';
import { summariseReimbursements } from '../../utils/reimbursementSummary';
import { formatMoney, NO_VALUE } from '../../utils/reimbursementFormat';
import LineItemExportButton from '../../components/LineItemExportButton';
import ReimbursementCharts from '../../components/ReimbursementCharts';
import ByProject from './ByProject';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { Users } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type PeriodAlignment = 'monthly' | 'yearly' | 'allTime';

interface EmployeeDetail {
  subOrganization: string;
  department: string;
  branch: string;
  team: string;
  isActive: boolean;
  employeeCode: string;
  name: string;
}

interface EmployeeSummary {
  employeeId: string;
  employeeCode: string;
  name: string;
  subOrganization: string;
  department: string;
  branch: string;
  team: string;
  isActive: boolean;
  totalRequestAmount: number;
  totalApprovedAmount: number;
  totalPendingAmount: number;
  totalRejectedAmount: number;
  totalPaidAmount: number;
  totalRemainingAmount: number;
  totalRequests: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
}

// ── Cells ─────────────────────────────────────────────────────────────────────

/** 'N/A' is the aggregator's "unknown"; the kit shows a missing value as an em dash. */
const text = (v: string) => (v && v !== 'N/A' ? v : NO_VALUE);

/**
 * A money cell in its status colour (the charts' colours), right-aligned and tabular. `dashZero`: the
 * columns that used to print "-" for nothing (approved, paid, remaining, rejected) still do.
 */
const money = (value: number, tone?: string, dashZero = false) => (
  <span className={cn('tabular block text-right', value ? cn('font-semibold', tone) : 'text-muted-foreground')}>
    {dashZero && !value ? NO_VALUE : formatMoney(value)}
  </span>
);
const count = (value: number, tone?: string, dashZero = false) => (
  <span className={cn('tabular block text-right', value ? cn('font-semibold', tone) : 'text-muted-foreground')}>
    {dashZero && !value ? NO_VALUE : value}
  </span>
);

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Reimbursement Details — the admin's view of the whole company for a period: the six totals, the
 * charts, one row per employee, and the project rollup underneath. All four read ONE period-scoped
 * fetch.
 *
 * On the design system, the way the Payment tab is: the period controls in one header row (PeriodTabs
 * + PeriodNavigator), StatCard totals, and the kit DataTable — search, sort, column filters, show /
 * hide / pin / reorder columns, footer totals, export — with the shared org filter (sub-org → branch
 * → team, cascaded, plus employee status) in the table's filter slot. Clicking a row opens that
 * employee on Search Employee.
 */
function AllEmployee() {
  const navigate = useNavigate();
  const [alignment, setAlignment] = useState<PeriodAlignment>('monthly');
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [year, setYear] = useState<Dayjs>(dayjs());
  const [fiscalYear, setFiscalYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reimbursements, setReimbursements] = useState<IReimbursementsFetch[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [employeeDetailMap, setEmployeeDetailMap] = useState<Map<string, EmployeeDetail>>(new Map());

  // ── Fiscal year ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!year) return;
    generateFiscalYearFromGivenYear(year).then(({ startDate, endDate }) => {
      setFiscalYear(`${startDate} to ${endDate}`);
    }).catch(() => undefined);
  }, [year]);

  // ── Fetch employee details (sub-org / dept / branch) once on mount ────────

  useEffect(() => {
    fetchAllEmployees().then((res: any) => {
      const map = new Map<string, EmployeeDetail>();
      (res?.data?.employees ?? []).forEach((emp: any) => {
        map.set(emp.id, {
          subOrganization: emp.companyOverview?.name || 'N/A',
          department: emp.departments?.name || 'N/A',
          branch: emp.branches?.name || 'N/A',
          // One team per employee; prefer the active membership (same rule as payroll).
          team: (emp.teamMemberships ?? []).find((m: any) => m.isActive !== false)?.team?.name || 'N/A',
          isActive: emp.isActive !== false,
          employeeCode: emp.employeeCode || '',
          name: emp.users
            ? `${emp.users.firstName || ''} ${emp.users.lastName || ''}`.trim()
            : 'N/A',
        });
      });
      setEmployeeDetailMap(map);
    }).catch(() => undefined);
  }, []);

  // ── Fetch reimbursements when period changes ──────────────────────────────

  const fetchReimbursements = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      let data: IReimbursementsFetch[];
      if (alignment === 'monthly') {
        data = await fetchMonthlyReimbursementsOfAllEmp(month);
      } else if (alignment === 'yearly') {
        data = await fetchYearlyReimbursementsOfAllEmp(year);
      } else {
        data = await fetchAllTimeReimbursementsOfAllEmp();
      }
      setReimbursements(data);
    } catch {
      setReimbursements([]);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [alignment, month, year]);

  useEffect(() => {
    fetchReimbursements();
  }, [fetchReimbursements]);

  // Refresh when any reimbursement changes on any connected client (WebSocket)
  useEventBus(EVENT_KEYS.reimbursementChanged, () => { fetchReimbursements(); });

  // ── Navigation handlers ───────────────────────────────────────────────────

  const handlePrevMonth = useCallback(() => setMonth(m => m.subtract(1, 'month')), []);
  const handleNextMonth = useCallback(() => setMonth(m => m.add(1, 'month')), []);
  const handlePrevYear = useCallback(() => setYear(y => y.subtract(1, 'year')), []);
  const handleNextYear = useCallback(() => setYear(y => y.add(1, 'year')), []);

  // ── Aggregate reimbursements by employee ──────────────────────────────────

  const employeeSummaries = useMemo<EmployeeSummary[]>(() => {
    const map = new Map<string, EmployeeSummary>();

    for (const r of reimbursements) {
      const empId = r.employeeId || '';
      if (!empId) continue;

      if (!map.has(empId)) {
        const details = employeeDetailMap.get(empId);
        map.set(empId, {
          employeeId: empId,
          employeeCode: (r as any).ID || details?.employeeCode || '',
          name: (r as any).name || details?.name || 'N/A',
          subOrganization: details?.subOrganization || 'N/A',
          department: details?.department || 'N/A',
          branch: details?.branch || 'N/A',
          team: details?.team || 'N/A',
          isActive: details?.isActive ?? true,
          totalRequestAmount: 0,
          totalApprovedAmount: 0,
          totalPendingAmount: 0,
          totalRejectedAmount: 0,
          totalPaidAmount: 0,
          totalRemainingAmount: 0,
          totalRequests: 0,
          approvedCount: 0,
          pendingCount: 0,
          rejectedCount: 0,
        });
      }

      // Accumulated per employee through the shared aggregator, so this tab and
      // SearchEmployee can no longer report different totals for the same person.
      const s = summariseReimbursements([r as any]);
      const emp = map.get(empId)!;
      emp.totalRequests += s.totalRequests;
      emp.totalRequestAmount += s.totalAmount;
      emp.totalApprovedAmount += s.approvedAmount;
      emp.approvedCount += s.approvedCount;
      emp.totalPendingAmount += s.pendingAmount;
      emp.pendingCount += s.pendingCount;
      emp.totalRejectedAmount += s.rejectedAmount;
      emp.rejectedCount += s.rejectedCount;
      emp.totalPaidAmount += s.paidAmount;
      emp.totalRemainingAmount += s.remainingAmount;
    }

    return Array.from(map.values());
  }, [reimbursements, employeeDetailMap]);

  // ── Filters: the shared org filter (status + sub-org → branch → team, cascaded) ─────────────
  // Defaults to All, not Active. Headline totals used to silently omit anyone who had left, so a
  // period total did not match the money actually spent in that period. The heading names the scope.
  // (These four filters were built but never rendered here; they now live in the table's filter slot.)
  const orgFilters = useOrgFilters(employeeSummaries, { defaultStatus: 'All' });

  const tableData = useMemo(
    () => employeeSummaries
      .filter(orgFilters.matches)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [employeeSummaries, orgFilters.matches],
  );

  // ── Column totals (footer row, KPI cards) ─────────────────────────────────

  const columnTotals = useMemo(() => {
    return tableData.reduce(
      (acc, r) => {
        acc.totalRequestAmount += r.totalRequestAmount;
        acc.totalApprovedAmount += r.totalApprovedAmount;
        acc.totalPendingAmount += r.totalPendingAmount;
        acc.totalRejectedAmount += r.totalRejectedAmount;
        acc.totalPaidAmount += r.totalPaidAmount;
        acc.totalRemainingAmount += r.totalRemainingAmount;
        acc.totalRequests += r.totalRequests;
        acc.approvedCount += r.approvedCount;
        acc.pendingCount += r.pendingCount;
        acc.rejectedCount += r.rejectedCount;
        return acc;
      },
      {
        totalRequestAmount: 0, totalApprovedAmount: 0,
        totalPendingAmount: 0, totalRejectedAmount: 0,
        totalPaidAmount: 0, totalRemainingAmount: 0,
        totalRequests: 0, approvedCount: 0, pendingCount: 0, rejectedCount: 0,
      }
    );
  }, [tableData]);

  // ── Period labels ─────────────────────────────────────────────────────────

  const periodLabel = useMemo(() => {
    if (alignment === 'monthly') return month.format('MMM YYYY');
    if (alignment === 'yearly') return formatFiscalYearLabel(fiscalYear) || year.format('YYYY');
    return undefined;
  }, [alignment, month, year, fiscalYear]);

  const tableTitle = useMemo(() => {
    if (alignment === 'monthly') return `Monthly Reimbursements — ${month.format('MMMM YYYY')}`;
    if (alignment === 'yearly') return `Yearly Reimbursements — ${formatFiscalYearLabel(fiscalYear)}`;
    return 'All Time Reimbursements';
  }, [alignment, month, fiscalYear]);

  // Whether ex-employees belong in a total is a policy question; making the filter visible in the
  // heading is not, so the number always says who it counted.
  const scope = orgFilters.status === 'Active' ? 'Current Employees'
    : orgFilters.status === 'Deactive' ? 'Past Employees'
    : 'All Employees';

  const exportFilename = useMemo(() => {
    if (alignment === 'monthly') return `reimbursements-${month.format('MMM-YYYY').toLowerCase()}`;
    if (alignment === 'yearly') return `reimbursements-${year.format('YYYY')}`;
    return 'reimbursements-all-time';
  }, [alignment, month, year]);

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<EmployeeSummary, any>[]>(() => [
    {
      accessorKey: 'name',
      meta: { label: 'Name' },
      header: ({ column }) => <SortableHeader column={column} title="Employee" />,
      cell: ({ row }) => (
        <PersonCell showAvatar={false} name={row.original.name} inactive={!row.original.isActive} />
      ),
      footer: () => <span className="heading-case">Total</span>,
    },
    // The ID is under the name on screen; a spreadsheet still wants it as its own column.
    { accessorKey: 'employeeCode', meta: { label: 'ID', exportOnly: true }, header: 'ID' },
    { accessorKey: 'subOrganization', meta: { label: 'Sub Organization' }, header: ({ column }) => <SortableHeader column={column} title="Sub Organization" />, cell: ({ getValue }) => text(getValue()) },
    { accessorKey: 'department', meta: { label: 'Department' }, header: ({ column }) => <SortableHeader column={column} title="Department" />, cell: ({ getValue }) => text(getValue()) },
    { accessorKey: 'branch', meta: { label: 'Branch' }, header: ({ column }) => <SortableHeader column={column} title="Branch" />, cell: ({ getValue }) => text(getValue()) },
    { accessorKey: 'team', meta: { label: 'Team' }, header: ({ column }) => <SortableHeader column={column} title="Team" />, cell: ({ getValue }) => text(getValue()) },
    {
      accessorKey: 'totalRequestAmount',
      meta: { label: 'Requested', exportType: 'currency', exportTotal: true },
      header: ({ column }) => <SortableHeader column={column} title="Requested" />,
      cell: ({ row }) => money(row.original.totalRequestAmount, 'text-foreground'),
      footer: () => money(columnTotals.totalRequestAmount, 'text-foreground'),
    },
    {
      accessorKey: 'totalApprovedAmount',
      meta: { label: 'Approved', exportType: 'currency', exportTotal: true },
      header: ({ column }) => <SortableHeader column={column} title="Approved" />,
      cell: ({ row }) => money(row.original.totalApprovedAmount, 'text-success-foreground', true),
      footer: () => money(columnTotals.totalApprovedAmount, 'text-success-foreground'),
    },
    {
      accessorKey: 'totalPendingAmount',
      meta: { label: 'Pending Approval', exportType: 'currency', exportTotal: true },
      header: ({ column }) => <SortableHeader column={column} title="Pending" />,
      cell: ({ row }) => money(row.original.totalPendingAmount, 'text-warning-foreground'),
      footer: () => money(columnTotals.totalPendingAmount, 'text-warning-foreground'),
    },
    {
      accessorKey: 'totalPaidAmount',
      meta: { label: 'Paid', exportType: 'currency', exportTotal: true },
      header: ({ column }) => <SortableHeader column={column} title="Paid" />,
      cell: ({ row }) => money(row.original.totalPaidAmount, 'text-info-foreground', true),
      footer: () => money(columnTotals.totalPaidAmount, 'text-info-foreground'),
    },
    {
      accessorKey: 'totalRemainingAmount',
      meta: { label: 'Remaining', exportType: 'currency', exportTotal: true },
      header: ({ column }) => <SortableHeader column={column} title="Remaining" />,
      cell: ({ row }) => money(row.original.totalRemainingAmount, 'text-tone-purple-foreground', true),
      footer: () => money(columnTotals.totalRemainingAmount, 'text-tone-purple-foreground'),
    },
    {
      accessorKey: 'totalRejectedAmount',
      meta: { label: 'Rejected', exportType: 'currency', exportTotal: true },
      header: ({ column }) => <SortableHeader column={column} title="Rejected" />,
      cell: ({ row }) => money(row.original.totalRejectedAmount, 'text-destructive-foreground', true),
      footer: () => money(columnTotals.totalRejectedAmount, 'text-destructive-foreground'),
    },
    {
      accessorKey: 'totalRequests',
      meta: { label: 'Requests', exportType: 'number', exportTotal: true },
      header: ({ column }) => <SortableHeader column={column} title="Requests" />,
      cell: ({ row }) => count(row.original.totalRequests, 'text-foreground'),
      footer: () => count(columnTotals.totalRequests, 'text-foreground'),
    },
    {
      accessorKey: 'approvedCount',
      meta: { label: 'Approved Requests', exportType: 'number', exportTotal: true },
      header: ({ column }) => <SortableHeader column={column} title="Approved Requests" />,
      cell: ({ row }) => count(row.original.approvedCount, 'text-success-foreground', true),
      footer: () => count(columnTotals.approvedCount, 'text-success-foreground'),
    },
    {
      accessorKey: 'pendingCount',
      meta: { label: 'Pending Requests', exportType: 'number', exportTotal: true },
      header: ({ column }) => <SortableHeader column={column} title="Pending Requests" />,
      cell: ({ row }) => count(row.original.pendingCount, 'text-warning-foreground'),
      footer: () => count(columnTotals.pendingCount, 'text-warning-foreground'),
    },
    {
      accessorKey: 'rejectedCount',
      meta: { label: 'Rejected Requests', exportType: 'number', exportTotal: true },
      header: ({ column }) => <SortableHeader column={column} title="Rejected Requests" />,
      cell: ({ row }) => count(row.original.rejectedCount, 'text-destructive-foreground', true),
      footer: () => count(columnTotals.rejectedCount, 'text-destructive-foreground'),
    },
  ], [columnTotals]);

  const openEmployee = (r: EmployeeSummary) =>
    navigate('/finance/reimbursements', { state: { goToSearchEmployee: true, employeeId: r.employeeId } });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ONE header row (the Payment tab's): what this is on the left, the period that governs the
          totals, charts and both tables on the right. */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
        <SectionHeader title="Reimbursement Details" description={`${scope} · ${periodLabel ?? 'All Time'}`} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <PeriodTabs
            value={alignment}
            options={[
              { label: 'Monthly', value: 'monthly' },
              { label: 'Yearly', value: 'yearly' },
              { label: 'All Time', value: 'allTime' },
            ]}
            onChange={(v) => setAlignment(v as PeriodAlignment)}
            ariaLabel="Reimbursement period"
          />
          {alignment === 'monthly' && (
            <PeriodNavigator
              label={month.format('MMM YYYY')}
              onPrevious={handlePrevMonth}
              onNext={handleNextMonth}
              unit="month"
              pickGranularity="month"
              pickValue={month.startOf('month').format('YYYY-MM-DD')}
              onPick={(v) => setMonth(dayjs(v).startOf('month'))}
            />
          )}
          {alignment === 'yearly' && (
            <PeriodNavigator
              label={periodLabel ?? year.format('YYYY')}
              onPrevious={handlePrevYear}
              onNext={handleNextYear}
              unit="year"
              pickGranularity="year"
              pickValue={year.startOf('year').format('YYYY-MM-DD')}
              onPick={(v) => setYear(dayjs(v).startOf('year'))}
            />
          )}
        </div>
      </div>

      <ReimbursementSummaryCard
        totalRequestAmount={columnTotals.totalRequestAmount}
        totalApprovedAmount={columnTotals.totalApprovedAmount}
        totalPendingAmount={columnTotals.totalPendingAmount}
        totalRejectedAmount={columnTotals.totalRejectedAmount}
        totalPaidAmount={columnTotals.totalPaidAmount}
        totalRemainingAmount={columnTotals.totalRemainingAmount}
        isLoading={isLoading}
      />

      {/*
        * The SAME chart components the employee page uses, over the whole company's rows.
        * Built once and shared, per the plan — a second implementation is how the admin total
        * and the employee total start disagreeing.
        *
        * No month click-through here: the header already owns the period, and a chart
        * that silently moves a filter the header is still displaying is worse than a static one.
        */}
      <ReimbursementCharts
        rows={reimbursements}
        grain={alignment}
        anchor={alignment === 'yearly' ? year : month}
        loading={isLoading}
      />

      <section className="space-y-3 pt-4">
        <SectionHeader as="h3" title="By Employee" description={`${tableTitle} · ${scope}`} />
        <DataTable
          caption="Reimbursements by employee"
          columns={columns}
          data={tableData}
          getRowId={(r) => r.employeeId}
          loading={isLoading}
          error={loadError ? "Couldn't load employee reimbursements." : undefined}
          onRetry={fetchReimbursements}
          searchPlaceholder="Search employees"
          stateKey="reimbursement.details.employees"
          filters={<OrgFilterSheetButton filters={orgFilters} />}
          onRowClick={openEmployee}
          // Phones: one card per employee — who, then the four amounts that matter — instead of a
          // sixteen-column table scrolled sideways.
          // The card carries `data-wt-control="row"`: it is row activation, not an action button —
          // the whole card is the tap target for this employee, exactly as SubmissionMobileCard and
          // company-profile's SectionList do it. Staying a native <button> keeps the focus ring,
          // tab stop and Enter/Space for free.
          renderCard={(r) => (
            <button data-slot="employee-card"
              type="button"
              data-wt-control="row"
              onClick={() => openEmployee(r)}
              aria-label={`Open reimbursements for ${r.name || 'this employee'}`}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <PersonCell showAvatar={false} name={r.name} subtitle={text(r.department)} inactive={!r.isActive} />
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {[
                  { label: 'Requested', value: r.totalRequestAmount, tone: 'text-foreground' },
                  { label: 'Approved', value: r.totalApprovedAmount, tone: 'text-success-foreground' },
                  { label: 'Paid', value: r.totalPaidAmount, tone: 'text-info-foreground' },
                  { label: 'Remaining', value: r.totalRemainingAmount, tone: 'text-tone-purple-foreground' },
                ].map((f) => (
                  <div key={f.label} className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{f.label}</dt>
                    <dd className={cn('tabular m-0 font-semibold', f.tone)}>{formatMoney(f.value)}</dd>
                  </div>
                ))}
              </dl>
            </button>
          )}
          rowLabel={(r) => `Open reimbursements for ${r.name || 'this employee'}`}
          empty={
            <EmptyState
              size="sm"
              icon={<Users aria-hidden />}
              title={orgFilters.activeCount > 0 ? 'No Employees Match These Filters' : `No Reimbursements in ${periodLabel ?? 'Any Period'}`}
              description={orgFilters.activeCount > 0 ? 'Clear the filters to see everyone.' : 'Employees appear here once they claim an expense in this period.'}
            />
          }
          toolbar={(ctx) => (
            // Two exports, because they answer different questions: one row per employee, or one row
            // per expense — what reconciling against a bank statement or answering an auditor needs.
            <>
              <DataTableExport
                label="Employees"
                columns={columns}
                ctx={ctx}
                filename={exportFilename}
                title={tableTitle}
                subtitle="Employee-wise reimbursement summary by request status"
              />
              <LineItemExportButton rows={reimbursements} periodLabel={periodLabel ?? 'all time'} disabled={isLoading} />
            </>
          )}
        />
      </section>

      {/*
        * Project rollup of the SAME rows, under the employee table. It was its own tab, which meant
        * a second fetch of identical data and a second period selector that could disagree with
        * this one. Hidden while the fetch is failing — the error state above already says so once.
        */}
      {!loadError && (
        <ByProject
          rows={reimbursements}
          loading={isLoading}
          periodLabel={periodLabel ?? 'All Time'}
        />
      )}
    </div>
  );
}

export default AllEmployee;
