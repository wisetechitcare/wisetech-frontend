import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import {
  fetchMonthlyReimbursementsOfAllEmp,
  fetchYearlyReimbursementsOfAllEmp,
  fetchAllTimeReimbursementsOfAllEmp,
} from '@utils/statistics';
import { fetchAllEmployees } from '@services/employee';
import { IReimbursementsFetch } from '@models/employee';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import ExportButton from '@app/modules/common/components/ExportButton';
import SalaryPeriodToolbar from '@pages/employee/salary/components/SalaryPeriodToolbar';
import { ToolbarFilterSelect } from "@app/modules/common/components/ui/ToolbarFilterSelect";
import { useRootOrgNames } from '@hooks/useRootOrgNames';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import { formatFiscalYearLabel } from '@utils/fiscalYearHelper';
import { Box } from '@mui/material';
import ReimbursementSummaryCard from './ReimbursementSummaryCard';
import { summariseReimbursements } from '../../utils/reimbursementSummary';
import { clickableRowProps, CLICKABLE_ROW_SX } from '../../utils/rowInteraction';
import LoadErrorState from '../../components/LoadErrorState';
import LineItemExportButton from '../../components/LineItemExportButton';
import ReimbursementCharts from '../../components/ReimbursementCharts';
import ByProject from './ByProject';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';

// ── Types ─────────────────────────────────────────────────────────────────────

type PeriodAlignment = 'monthly' | 'yearly' | 'allTime';
type StatusFilter = 'Active' | 'Deactive' | 'All';

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtINR = (n: number) =>
  `₹${Math.round(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// Distinct, sorted values of one summary field ('N/A' and blanks dropped) — same rule the
// payroll toolbar uses, so both pages offer the same options for the same population.
const distinctValues = (rows: EmployeeSummary[], field: keyof EmployeeSummary, exclude?: Set<string>) => {
  const names = new Set<string>();
  rows.forEach(r => {
    const name = r[field] as string;
    if (name && name !== 'N/A' && !exclude?.has(name)) names.add(name);
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b));
};

// ── Component ─────────────────────────────────────────────────────────────────

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
  // Defaults to All, not Active. Headline totals used to silently omit anyone who had left, so
  // a period total did not match the money actually spent in that period — and nothing on screen
  // said a population was missing. The heading names the scope either way.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [subOrgFilter, setSubOrgFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [teamFilter, setTeamFilter] = useState('All');

  const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
  const rootOrgNames = useRootOrgNames();

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

  // ── Filter options ────────────────────────────────────────────────────────

  // The top-level org is excluded — only actual sub-orgs belong in that dropdown.
  const subOrgOptions = useMemo(
    () => distinctValues(employeeSummaries, 'subOrganization', rootOrgNames),
    [employeeSummaries, rootOrgNames],
  );
  const branchOptions = useMemo(() => distinctValues(employeeSummaries, 'branch'), [employeeSummaries]);
  const teamOptions = useMemo(() => distinctValues(employeeSummaries, 'team'), [employeeSummaries]);

  // ── Apply filters ─────────────────────────────────────────────────────────

  const filteredSummaries = useMemo(() => {
    return employeeSummaries.filter(emp => {
      const statusMatch =
        statusFilter === 'Active' ? emp.isActive :
        statusFilter === 'Deactive' ? !emp.isActive :
        true;
      const subOrgMatch = subOrgFilter === 'All' || emp.subOrganization === subOrgFilter;
      const branchMatch = branchFilter === 'All' || emp.branch === branchFilter;
      const teamMatch = teamFilter === 'All' || emp.team === teamFilter;
      return statusMatch && subOrgMatch && branchMatch && teamMatch;
    });
  }, [employeeSummaries, statusFilter, subOrgFilter, branchFilter, teamFilter]);

  // ── Table data ────────────────────────────────────────────────────────────

  const tableData = useMemo(() => {
    return filteredSummaries.slice().sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [filteredSummaries]);

  // ── Column totals (footer row) ────────────────────────────────────────────

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

  // ── Period label for navigation ───────────────────────────────────────────

  const periodLabel = useMemo(() => {
    if (alignment === 'monthly') return month.format('MMM YYYY');
    if (alignment === 'yearly') return formatFiscalYearLabel(fiscalYear);
    return undefined;
  }, [alignment, month, fiscalYear]);

  const tableTitle = useMemo(() => {
    if (alignment === 'monthly') return `Monthly Reimbursements — ${month.format('MMMM YYYY')}`;
    if (alignment === 'yearly') return `Yearly Reimbursements — ${formatFiscalYearLabel(fiscalYear)}`;
    return 'All Time Reimbursements';
  }, [alignment, month, fiscalYear]);

  const tableHeading = useMemo(() => {
    const period = alignment === 'monthly' ? 'Monthly'
      : alignment === 'yearly' ? 'Yearly' : 'All Time';
    // The status filter defaults to 'Active', so these totals silently omit anyone who has left
    // — and someone reading a headline number had no way to know a population was missing from
    // it. Whether ex-employees belong in the total is a policy question; making the filter
    // visible in the heading is not, so the number always says who it counted.
    const scope = statusFilter === 'Active' ? ' (current employees)'
      : statusFilter === 'Deactive' ? ' (past employees)'
      : ' (all employees)';
    return `${period} Reimbursements${scope}`;
  }, [alignment, statusFilter]);

  const exportFilename = useMemo(() => {
    if (alignment === 'monthly') return `reimbursements-${month.format('MMM-YYYY').toLowerCase()}`;
    if (alignment === 'yearly') return `reimbursements-${year.format('YYYY')}`;
    return 'reimbursements-all-time';
  }, [alignment, month, year]);

  // ── Filter toolbar ────────────────────────────────────────────────────────

  // 'All' is the default now, so it is not an active filter.
  const hasActiveFilters = statusFilter !== 'All' || subOrgFilter !== 'All'
    || branchFilter !== 'All' || teamFilter !== 'All';

  const FilterToolbar = () => (
    <Box sx={{ display: 'flex', gap: '12px', rowGap: '16px', alignItems: 'center', px: 1, flexWrap: 'wrap' }}>
      <Box sx={{ width: '1px', height: '26px', backgroundColor: '#e5e7eb', mx: 0.5, display: { xs: 'none', md: 'block' } }} />

      <ToolbarFilterSelect
        label="Employee Status"
        icon="bi-person-circle"
        value={statusFilter}
        onChange={(v) => setStatusFilter(v as StatusFilter)}
        minWidth={150}
        theme={statusFilter === 'Active'
          ? { icon: '#10b981', border: '#a7f3d0', bg: '#ecfdf5', text: '#065f46', ring: 'rgba(16, 185, 129, 0.12)' }
          : statusFilter === 'Deactive'
            ? { icon: '#ef4444', border: '#fecaca', bg: '#fef2f2', text: '#991b1b', ring: 'rgba(239, 68, 68, 0.12)' }
            : undefined}
        options={[
          { value: 'Active', label: 'Active' },
          { value: 'Deactive', label: 'Inactive' },
          { value: 'All', label: 'All' },
        ]}
      />

      <ToolbarFilterSelect
        label="Sub Organization"
        icon="bi-building"
        value={subOrgFilter}
        onChange={setSubOrgFilter}
        minWidth={220}
        theme={subOrgFilter !== 'All'
          ? { icon: '#3b82f6', border: '#bfdbfe', bg: '#eff6ff', text: '#1e40af', ring: 'rgba(59, 130, 246, 0.12)' }
          : undefined}
        options={[
          { value: 'All', label: 'All Sub Organizations' },
          ...subOrgOptions.map(name => ({ value: name, label: name })),
        ]}
      />

      {branchOptions.length > 0 && (
        <ToolbarFilterSelect
          label="Branch"
          icon="bi-geo-alt"
          value={branchFilter}
          onChange={setBranchFilter}
          minWidth={190}
          theme={branchFilter !== 'All'
            ? { icon: '#0891b2', border: '#a5f3fc', bg: '#ecfeff', text: '#155e75', ring: 'rgba(8, 145, 178, 0.12)' }
            : undefined}
          options={[
            { value: 'All', label: 'All Branches' },
            ...branchOptions.map(name => ({ value: name, label: name })),
          ]}
        />
      )}

      {teamOptions.length > 0 && (
        <ToolbarFilterSelect
          label="Team"
          icon="bi-people"
          value={teamFilter}
          onChange={setTeamFilter}
          minWidth={180}
          theme={teamFilter !== 'All'
            ? { icon: '#d97706', border: '#fde68a', bg: '#fffbeb', text: '#92400e', ring: 'rgba(217, 119, 6, 0.12)' }
            : undefined}
          options={[
            { value: 'All', label: 'All Teams' },
            ...teamOptions.map(name => ({ value: name, label: name })),
          ]}
        />
      )}

      {hasActiveFilters && (
        <button
          // Back to the page defaults, which are all 'All' here — resetting status to 'Active'
          // would have left the table narrower than a freshly opened page.
          onClick={() => { setStatusFilter('All'); setSubOrgFilter('All'); setBranchFilter('All'); setTeamFilter('All'); }}
          title="Reset filters to defaults"
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
          <i className="bi bi-arrow-counterclockwise" style={{ fontSize: '13px' }} />
          Reset
        </button>
      )}
    </Box>
  );

  // ── Export columns ────────────────────────────────────────────────────────

  const exportColumns = useMemo(() => [
    { key: 'employeeCode',         header: 'ID',                      type: 'text'     as const },
    { key: 'name',                 header: 'Name',                    type: 'text'     as const },
    { key: 'subOrganization',      header: 'Sub Organization',        type: 'text'     as const },
    { key: 'department',           header: 'Department',              type: 'text'     as const },
    { key: 'branch',               header: 'Branch',                  type: 'text'     as const },
    { key: 'team',                 header: 'Team',                    type: 'text'     as const },
    { key: 'totalRequestAmount',   header: 'Total Request Amount',    type: 'currency' as const, showTotal: true },
    { key: 'totalApprovedAmount',  header: 'Total Approved Amount',   type: 'currency' as const, showTotal: true },
    { key: 'totalPendingAmount',   header: 'Total Pending Amount',    type: 'currency' as const, showTotal: true },
    { key: 'totalRejectedAmount',   header: 'Total Rejected Amount',   type: 'currency' as const, showTotal: true },
    { key: 'totalPaidAmount',       header: 'Total Amount Paid',       type: 'currency' as const, showTotal: true },
    { key: 'totalRemainingAmount',  header: 'Total Amount Remaining',  type: 'currency' as const, showTotal: true },
    { key: 'totalRequests',         header: 'Total Requests',          type: 'number'   as const, showTotal: true },
    { key: 'approvedCount',        header: 'Requests Approved',       type: 'number'   as const, showTotal: true },
    { key: 'pendingCount',         header: 'Requests Pending',        type: 'number'   as const, showTotal: true },
    { key: 'rejectedCount',        header: 'Requests Rejected',       type: 'number'   as const, showTotal: true },
  ], []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <h3 className="fw-bold fs-1 mb-5 font-barlow">Reimbursement Details</h3>

      {/* Period toolbar */}
      <SalaryPeriodToolbar
        alignment={alignment}
        options={[
          { label: 'Monthly', value: 'monthly' },
          { label: 'Yearly', value: 'yearly' },
          { label: 'All Time', value: 'allTime' },
        ]}
        onAlignmentChange={(v) => setAlignment(v as PeriodAlignment)}
        periodLabel={periodLabel}
        onPrevious={alignment === 'monthly' ? handlePrevMonth : alignment === 'yearly' ? handlePrevYear : undefined}
        onNext={alignment === 'monthly' ? handleNextMonth : alignment === 'yearly' ? handleNextYear : undefined}
        disablePrevious={isLoading}
        disableNext={isLoading}
      />

      {/* Summary cards */}
      <ReimbursementSummaryCard
        totalRequestAmount={columnTotals.totalRequestAmount}
        totalApprovedAmount={columnTotals.totalApprovedAmount}
        totalPendingAmount={columnTotals.totalPendingAmount}
        totalRejectedAmount={columnTotals.totalRejectedAmount}
        totalPaidAmount={columnTotals.totalPaidAmount}
        totalRemainingAmount={columnTotals.totalRemainingAmount}
        isLoading={isLoading}
      />

      {/* Employee-wise reimbursement table */}
      {/*
        * The SAME chart components the employee page uses, over the whole company's rows.
        * Built once and shared, per the plan — a second implementation is how the admin total
        * and the employee total start disagreeing.
        *
        * No month click-through here: the admin toolbar already owns the period, and a chart
        * that silently moves a filter the toolbar is still displaying is worse than a static one.
        */}
      <ReimbursementCharts
        rows={reimbursements}
        grain={alignment}
        anchor={alignment === 'yearly' ? year : month}
        loading={isLoading}
      />

      <div className="mt-5">
        <h1>{tableTitle}</h1>
        {loadError && !isLoading ? (
          <LoadErrorState what="employee reimbursements" onRetry={fetchReimbursements} />
        ) : (
        <MaterialTable
          renderTopToolbarRightActions={() => <FilterToolbar />}
          renderExportActions={() => (
            // Two exports, because they answer different questions. The summary is one row per
            // employee; the line-item export is one row per expense, which is what reconciling
            // against a bank statement or answering an auditor actually needs — and until now
            // the admin surface could only produce the aggregate.
            <div className="d-flex align-items-center gap-2 flex-wrap">
              {/* Two exports, two labels. They answer different questions — one row per
                  employee vs one row per expense — and both saying "Export" made the choice a
                  coin toss the reader only resolved after opening the file. */}
              <ExportButton
                label="Employees"
                data={tableData}
                columns={exportColumns}
                filename={exportFilename}
                title={tableTitle}
                subtitle="Employee-wise reimbursement summary by request status"
                sheetName="Reimbursements"
                showTotals
                totalLabel="TOTAL"
                disabled={tableData.length === 0}
              />
              <LineItemExportButton
                rows={reimbursements}
                periodLabel={periodLabel ?? 'all time'}
                disabled={isLoading}
              />
            </div>
          )}
          columns={[
            {
              accessorKey: 'name',
              header: 'Name',
              Cell: ({ renderedCellValue, row }: any) => (
                <span style={{ color: row.original.employeeId ? '#0369a1' : 'inherit', fontWeight: row.original.employeeId ? 500 : 400 }}>
                  {renderedCellValue || 'N/A'}
                </span>
              ),
            },
            {
              accessorKey: 'subOrganization',
              header: 'Sub Organization',
              Cell: ({ renderedCellValue }: any) => renderedCellValue || 'N/A',
            },
            {
              accessorKey: 'department',
              header: 'Department',
              Cell: ({ renderedCellValue }: any) => renderedCellValue || 'N/A',
            },
            {
              accessorKey: 'branch',
              header: 'Branch',
              Cell: ({ renderedCellValue }: any) => renderedCellValue || 'N/A',
            },
            {
              accessorKey: 'team',
              header: 'Team',
              Cell: ({ renderedCellValue }: any) => renderedCellValue || 'N/A',
            },
            {
              accessorKey: 'totalRequestAmount',
              header: 'Total Requested Amount',
              Cell: ({ renderedCellValue }: any) => {
                const val = Number(renderedCellValue);
                return val > 0 ? fmtINR(val) : '₹0';
              },
              Footer: () => fmtINR(columnTotals.totalRequestAmount),
            },
            {
              accessorKey: 'totalApprovedAmount',
              header: 'Total Approved Amount',
              Cell: ({ renderedCellValue }: any) => {
                const val = Number(renderedCellValue);
                if (!val) return '-';
                return <span style={{ color: '#16a34a', fontWeight: 600 }}>{fmtINR(val)}</span>;
              },
              Footer: () => <span style={{ color: '#16a34a' }}>{fmtINR(columnTotals.totalApprovedAmount)}</span>,
            },
            {
              accessorKey: 'totalPendingAmount',
              header: 'Total Pending Amount',
              Cell: ({ renderedCellValue }: any) => {
                const val = Number(renderedCellValue);
                return <span style={{ color: '#0891b2', fontWeight: 600 }}>{fmtINR(val)}</span>;
              },
              Footer: () => <span style={{ color: '#0891b2' }}>{fmtINR(columnTotals.totalPendingAmount)}</span>,
            },
            {
              accessorKey: 'totalPaidAmount',
              header: 'Total Paid Amount',
              Cell: ({ renderedCellValue }: any) => {
                const val = Number(renderedCellValue);
                if (!val) return '-';
                return <span style={{ color: '#7c3aed', fontWeight: 600 }}>{fmtINR(val)}</span>;
              },
              Footer: () => <span style={{ color: '#7c3aed' }}>{fmtINR(columnTotals.totalPaidAmount)}</span>,
            },
            {
              accessorKey: 'totalRemainingAmount',
              header: 'Total Remaining Amount',
              Cell: ({ renderedCellValue }: any) => {
                const val = Number(renderedCellValue);
                if (!val) return '-';
                return <span style={{ color: '#ea580c', fontWeight: 600 }}>{fmtINR(val)}</span>;
              },
              Footer: () => <span style={{ color: '#ea580c' }}>{fmtINR(columnTotals.totalRemainingAmount)}</span>,
            },
            {
              accessorKey: 'totalRejectedAmount',
              header: 'Total Rejected Amount',
              Cell: ({ renderedCellValue }: any) => {
                const val = Number(renderedCellValue);
                if (!val) return '-';
                return <span style={{ color: '#dc2626', fontWeight: 600 }}>{fmtINR(val)}</span>;
              },
              Footer: () => <span style={{ color: '#dc2626' }}>{fmtINR(columnTotals.totalRejectedAmount)}</span>,
            },
            {
              accessorKey: 'totalRequests',
              header: 'Total Requests',
              Cell: ({ renderedCellValue }: any) => renderedCellValue ?? 0,
              Footer: () => columnTotals.totalRequests,
            },
            {
              accessorKey: 'approvedCount',
              header: 'Total Approved Requests',
              Cell: ({ renderedCellValue }: any) => {
                const val = Number(renderedCellValue);
                if (!val) return '-';
                return <span style={{ color: '#16a34a', fontWeight: 600 }}>{val}</span>;
              },
              Footer: () => <span style={{ color: '#16a34a' }}>{columnTotals.approvedCount}</span>,
            },
            {
              accessorKey: 'pendingCount',
              header: 'Total Pending Requests',
              Cell: ({ renderedCellValue }: any) => {
                const val = Number(renderedCellValue);
                return <span style={{ color: '#0891b2', fontWeight: 600 }}>{val}</span>;
              },
              Footer: () => <span style={{ color: '#0891b2' }}>{columnTotals.pendingCount}</span>,
            },
            {
              accessorKey: 'rejectedCount',
              header: 'Total Rejected Requests',
              Cell: ({ renderedCellValue }: any) => {
                const val = Number(renderedCellValue);
                if (!val) return '-';
                return <span style={{ color: '#dc2626', fontWeight: 600 }}>{val}</span>;
              },
              Footer: () => <span style={{ color: '#dc2626' }}>{columnTotals.rejectedCount}</span>,
            },
          ]}
          data={tableData}
          tableName="EmployeeReimbursementsData"
          employeeId={employeeIdCurrent}
          enableColumnSpecificSearch={true}
          showColumnFooter={true}
          muiTableProps={{
            muiTableBodyRowProps: ({ row }: any) => {
              const empId = row.original.employeeId;
              if (!empId) return { sx: { cursor: 'default' } };
              return {
                ...clickableRowProps(
                  () => navigate('/finance/bills', { state: { goToSearchEmployee: true, employeeId: empId } }),
                  `Open reimbursements for ${row.original.name ?? 'this employee'}`,
                ),
                sx: CLICKABLE_ROW_SX,
              };
            },
          }}
        />
        )}
      </div>

      {/*
        * Project rollup of the SAME rows, under the employee table. It was its own tab, which meant
        * a second fetch of identical data and a second period selector that could disagree with
        * this one. Hidden while the fetch is failing — the error state above already says so once.
        */}
      {!loadError && (
        <ByProject
          rows={reimbursements}
          loading={isLoading}
          periodLabel={periodLabel ?? 'all time'}
        />
      )}
    </>
  );
}

export default AllEmployee;
