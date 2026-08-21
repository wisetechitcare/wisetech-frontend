import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useDispatch } from 'react-redux';
import { useMediaQuery } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import {
  fetchEmpAlltimeReimbursements,
  fetchEmpMonthlyReimbursements,
  fetchEmpYearlyReimbursements,
} from '@utils/statistics';
import { IReimbursementsFetch } from '@models/employee';
import { downloadEmployeePeriodBillPdf } from '@services/employee';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import { formatFiscalYearLabel } from '@utils/fiscalYearHelper';
import { errorConfirmation } from '@utils/modal';
import { resourceNameMapWithCamelCase } from '@constants/statistics';
import { fetchRolesAndPermissions } from '@redux/slices/rolesAndPermissions';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { usePersistedState } from '@app/modules/common/hooks/usePersistedState';
import ReimbursementPeriodBar, { PeriodAlignment } from '../components/ReimbursementPeriodBar';
import { TOOLBAR_ROW, lightToolbarButton } from '../utils/toolbarButton';
import { WtButton } from '@app/modules/common/components/ui';
import { Button } from '@mui/material';
import ReimbursementCharts from '../components/ReimbursementCharts';
import NeedsYourAttention from '../components/NeedsYourAttention';
import ReimbursementPaymentHistoryTable from '../components/ReimbursementPaymentHistoryTable';
import SubmissionsTable from './SubmissionsTable';
import SensitiveDataProvider from '@app/modules/common/components/SensitiveData';
import { StatusNum } from '../utils/reimbursementFormat';
import { ReimbursementSummary, summariseReimbursements } from '../utils/reimbursementSummary';

/** Summary → the KPI card props. Saves both callers restating the same ten mappings. */
export const kpiProps = (s: ReimbursementSummary) => ({
  totalRequests: s.totalRequests,
  totalRequestedAmount: s.totalAmount,
  approvedRequests: s.approvedCount,
  rejectedRequests: s.rejectedCount,
  pendingRequests: s.pendingCount,
  approvedAmount: s.approvedAmount,
  pendingAmount: s.pendingAmount,
  rejectedAmount: s.rejectedAmount,
  paidAmount: s.paidAmount,
  remainingAmount: s.remainingAmount,
});

export interface ReimbursementWorkspaceProps {
  /** Whose reimbursements. Undefined (no employee picked yet) renders the header only. */
  employeeId?: string;
  employeeCode?: string;
  employeeName?: string;
  /**
   * Everything above the charts — the two screens differ only here (own screen adds the drafts
   * inbox, the admin screen adds an employee picker). It receives the period bar to place and
   * the period's totals to render.
   */
  renderHeader: (ctx: {
    summary: ReimbursementSummary;
    loading: boolean;
    periodBar: React.ReactNode;
    // Phase 1: Current month/year for constraining batch forms
    currentPeriod?: any; // Dayjs object, only set when viewing monthly
  }) => React.ReactNode;
  /** Extra buttons for the period bar, beside "Download Reimbursement Slip". */
  extraActions?: React.ReactNode;
  recordsTitle?: string;
  showEditDeleteOption?: boolean;
  viewOthers?: boolean;
  checkOwnWithOthers?: boolean;
}

/**
 * The reimbursement screen: one period, KPI totals, charts, and the three tables that read the
 * same window on three different date axes (expense, submission, payment).
 *
 * Both the employee's own screen and the admin's Search Employee tab render this. They used to
 * be two copies that had already drifted — only one had charts and submission batches, and their
 * KPI totals were computed by two different aggregators that disagreed on the same employee.
 */
export default function ReimbursementWorkspace({
  employeeId,
  employeeCode,
  employeeName,
  renderHeader,
  extraActions,
  recordsTitle = 'Reimbursement Records',
  showEditDeleteOption = true,
  viewOthers = false,
  checkOwnWithOthers = false,
}: ReimbursementWorkspaceProps) {
  const dispatch = useDispatch();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // One period for the whole screen. The mode survives a refresh; the anchor resets to today.
  const [alignment, setAlignment] = usePersistedState<PeriodAlignment>(
    'reimbursementPeriodMode',
    'monthly',
    ['monthly', 'yearly', 'allTime'] as const,
  );
  const [periodDate, setPeriodDate] = useState<Dayjs>(dayjs());

  const [rows, setRows] = useState<IReimbursementsFetch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [downloadingBill, setDownloadingBill] = useState(false);
  /** Set by clicking a donut slice; pushed into both tables. */
  const [chartStatusFilter, setChartStatusFilter] = useState<StatusNum | null>(null);
  /** Set by clicking a "Where It Went" row; pushed into both tables. */
  const [chartCategoryFilter, setChartCategoryFilter] = useState<string | null>(null);
  /** The org's financial year for the selected anchor — drives the Apr→Mar trend axis. */
  const [fiscalYear, setFiscalYear] = useState<{ start: Dayjs; label: string } | null>(null);

  const summary = useMemo(() => summariseReimbursements(rows as any[]), [rows]);

  const periodLabel = alignment === 'monthly'
    ? periodDate.format('MMMM YYYY')
    : alignment === 'yearly' ? (fiscalYear?.label || `FY ${periodDate.format('YYYY')}`) : 'all time';

  // Row-level actions in the tables gate on permissions.
  useEffect(() => {
    dispatch(fetchRolesAndPermissions() as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoading(true);
    const fetchPromise =
      alignment === 'monthly' ? fetchEmpMonthlyReimbursements(periodDate, employeeId) :
        alignment === 'yearly' ? fetchEmpYearlyReimbursements(periodDate, employeeId) :
          fetchEmpAlltimeReimbursements(employeeId);
    fetchPromise
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [alignment, periodDate, employeeId, refreshKey]);

  // The trend buckets the SAME rows the KPI cards summarise, so nothing outside the selected
  // period can appear in it. Only the yearly axis needs the org's fiscal-year boundaries.
  useEffect(() => {
    if (alignment !== 'yearly') return;
    generateFiscalYearFromGivenYear(periodDate)
      .then(({ startDate, endDate }) => setFiscalYear({
        start: dayjs(startDate).startOf('month'),
        label: formatFiscalYearLabel(`${startDate} to ${endDate}`),
      }))
      .catch(() => setFiscalYear(null));
  }, [alignment, periodDate]);

  // Any reimbursement change on any connected client (WebSocket).
  useEventBus(EVENT_KEYS.reimbursementChanged, () => setRefreshKey((k) => k + 1));

  const handlePeriodChange = useCallback((next: PeriodAlignment, date: Dayjs) => {
    setLoading(true);
    setAlignment(next);
    setPeriodDate(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownloadBill = async () => {
    if (!employeeId) {
      errorConfirmation('Please select an employee first.');
      return;
    }
    // Phase 1: Allow download of all records in the period, not just approved
    if (rows.length === 0) {
      errorConfirmation('No reimbursements found for the selected period.');
      return;
    }

    setDownloadingBill(true);
    try {
      let from: string | undefined;
      let to: string | undefined;
      let label = 'All Time';

      if (alignment === 'monthly') {
        from = periodDate.startOf('month').format('YYYY-MM-DD');
        to = periodDate.endOf('month').format('YYYY-MM-DD');
        label = periodDate.format('MMM YYYY');
      } else if (alignment === 'yearly') {
        try {
          const fy = await generateFiscalYearFromGivenYear(periodDate);
          from = fy.startDate ? dayjs(fy.startDate).format('YYYY-MM-DD') : periodDate.startOf('year').format('YYYY-MM-DD');
          to = fy.endDate ? dayjs(fy.endDate).format('YYYY-MM-DD') : periodDate.endOf('year').format('YYYY-MM-DD');
        } catch {
          from = periodDate.startOf('year').format('YYYY-MM-DD');
          to = periodDate.endOf('year').format('YYYY-MM-DD');
        }
        label = `FY ${periodDate.format('YYYY')}`;
      }

      const blob = await downloadEmployeePeriodBillPdf(employeeId, { from, to, label });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Reimbursement_Bill_${employeeCode || employeeId}_${label.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      errorConfirmation('Failed to download reimbursement bill. Please try again.');
    } finally {
      setDownloadingBill(false);
    }
  };

  const periodBar = (
    <ReimbursementPeriodBar
      alignment={alignment}
      date={periodDate}
      onChange={handlePeriodChange}
      actionSlot={
        <div className={TOOLBAR_ROW}>
          {extraActions}
          {/* No rows in this period means an empty slip, so the button is not offered.
              `rows` is already loaded for the KPI cards, so gating on it costs no extra
              request. This also covers the admin tab before an employee is picked, where
              rows is empty for the same reason. handleDownloadBill keeps its own guard —
              this removes the dead end, it does not replace the check. */}
          {rows.length > 0 && (
            <Button
              onClick={handleDownloadBill}
              disabled={downloadingBill}
              title="Download Reimbursement Slip"
              startIcon={
                downloadingBill
                  ? <span className="spinner-border spinner-border-sm" style={{ width: '1rem', height: '1rem', borderWidth: '0.15em' }} />
                  : <KTIcon iconName="file-down" className="fs-3" />
              }
              sx={lightToolbarButton('danger', downloadingBill)}
            >
              {downloadingBill ? 'Generating...' : 'Download Reimbursement Slip'}
            </Button>
          )}
        </div>
      }
    />
  );

  return (
    // One provider for the whole screen: the eye in the header governs every figure below it,
    // including the ones five components deep in a table cell.
    <SensitiveDataProvider>
      {renderHeader({
        summary,
        loading,
        periodBar,
        // Phase 1: Pass current month for batch period awareness in forms
        currentPeriod: alignment === 'monthly' ? periodDate : undefined,
      })}

      {employeeId && (
        <>
          {/* Above everything, because it is the only part of this screen that is a TASK rather
              than a record. `viewOthers` means an admin is browsing someone else's expenses —
              they are not the person who has to answer, so it stays hidden for them. */}
          <NeedsYourAttention employeeId={employeeId} isSelf={!viewOthers} />

          {/* Charts read the SAME rows the KPI cards summarise, bucketed by the selected
              period — so nothing outside the window can appear, and the two cannot disagree.
              Hidden on mobile to simplify the view and reduce data usage. */}
          {!isMobile && (
            <ReimbursementCharts
              rows={rows}
              grain={alignment}
              anchor={periodDate}
              fyStart={fiscalYear?.start ?? null}
              fyLabel={fiscalYear?.label}
              loading={loading}
              onSelectPeriod={(key) => {
                // 'YYYY-MM' opens that month, 'YYYY' opens that year — the two grains the page has.
                setChartStatusFilter(null);
                setChartCategoryFilter(null);
                handlePeriodChange(key.length > 4 ? 'monthly' : 'yearly', dayjs(key.length > 4 ? `${key}-01` : `${key}-04-01`));
              }}
              onSelectStatus={(status) =>
                // Clicking the active slice again clears it — a filter you cannot undo from where
                // you set it is a trap.
                setChartStatusFilter((current) => (current === status ? null : (status as StatusNum)))
              }
              activeCategory={chartCategoryFilter}
              onSelectCategory={(name) =>
                setChartCategoryFilter((current) => (current === name ? null : name))
              }
            />
          )}

          {/* Three tables, three date axes — expense, submission, payment. The subtitles say
              which, which is what stops "why is my June expense under July?". Both take the
              chart filters, so a donut slice or a category narrows what you scroll to. */}
          <SubmissionsTable
            title="Submission Batches"
            subtitle={<>What was <strong>submitted</strong> in {periodLabel} — by submission date, whole batch.</>}
            mode="submission"
            period={alignment}
            date={periodDate}
            selectedEmployeeId={employeeId}
            resource={resourceNameMapWithCamelCase.reimbursement}
            viewOwn={true}
            viewOthers={viewOthers}
            checkOwnWithOthers={checkOwnWithOthers}
            externalStatusFilter={chartStatusFilter}
            externalCategoryFilter={chartCategoryFilter}
            onClearCategoryFilter={() => setChartCategoryFilter(null)}
          />

          <ReimbursementPaymentHistoryTable
            employeeId={employeeId}
            employeeCode={employeeCode}
            employeeName={employeeName}
            refreshKey={refreshKey}
            period={alignment}
            periodDate={periodDate}
          />
        </>
      )}
    </SensitiveDataProvider>
  );
}
