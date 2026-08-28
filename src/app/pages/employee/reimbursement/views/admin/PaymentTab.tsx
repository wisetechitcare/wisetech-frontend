import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import dayjs, { Dayjs } from 'dayjs';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { can } from '@utils/can';
import { toast, alertDialog } from '@app/modules/common/components/ui/feedback';
import { WtButton } from '@app/modules/common/components/ui/buttons';
import PeriodTabs from '@app/modules/common/components/PeriodTabs';
import PeriodNavigator from '@app/modules/common/components/PeriodNavigator';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import { formatFiscalYearLabel } from '@utils/fiscalYearHelper';
import { fetchReimbursementBatches, createReimbursementPayment, fetchAllEmployees } from '@services/employee';
import { BatchDetailModal } from '../../shared/ReimbursementBatchShared';
import LoadErrorState from '../../components/LoadErrorState';
import { formatINR } from '../../utils/reimbursementFormat';
import {
    buildPaymentRows, filterQueueByPeriod, paymentsInPeriod, paymentKpis, stateBreakdown,
    PaymentBatchRow, PaymentState, PeriodFilter, COMPACT_BUTTON_SX, EmployeeOrgDetail,
} from '../../components/payment/paymentData';
import { useOrgFilters, OrgFilterToolbar } from '@app/modules/common/components/ui/OrgFilterToolbar';
import { PaymentKpiCards, PaymentStatusRail } from '../../components/payment/PaymentSummary';
import PaymentQueueTable from '../../components/payment/PaymentQueueTable';
import PaymentHistoryTable from '../../components/payment/PaymentHistoryTable';
import PaymentDetailDrawer from '../../components/payment/PaymentDetailDrawer';
import RecordPaymentModal, { PaymentSubmission } from '../../components/payment/RecordPaymentModal';

/**
 * The payment desk.
 *
 * The page opens with the answer, not the evidence: four numbers, the status rail, then the queue
 * of things to do, and only then the history of what was already done. It used to open with two
 * near-identical tables — one pending, one paid — each carrying its own period toggle, so the
 * screen could show three different months at once and neither table said which question it was
 * answering.
 *
 * ONE period governs the whole screen. The two tabs read it on different date axes on purpose:
 * the queue asks "what do we still owe?" (submission date, so a partially-paid batch cannot
 * vanish from every month after its last payment) and the history asks "what moved?" (payment
 * date, matching the employee-facing payment history). See paymentData.ts.
 *
 * One request feeds everything. The batch list already carries its lines AND its payments, so
 * the history tab needs no per-employee fan-out and cannot disagree with the queue about what
 * has been paid.
 */

function PaymentTab() {
    // ── Permission ────────────────────────────────────────────────────────────
    // The same grant the backend enforces on POST /reimbursement/payment, and the one that put
    // this tab on screen. A viewer without it still gets the numbers, the queue, search, filters
    // and export — everything except the ability to record money moving.
    const canPay = can('finance.manage.team');

    // ── Period (one, for the whole screen) ────────────────────────────────────
    const [filter, setFilter] = useState<PeriodFilter>('monthly');
    const [periodDate, setPeriodDate] = useState<Dayjs>(dayjs());
    const [fiscalLabel, setFiscalLabel] = useState('');

    // ── Data ──────────────────────────────────────────────────────────────────
    const [rawBatches, setRawBatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // ── View state ────────────────────────────────────────────────────────────
    const [tab, setTab] = useState<'queue' | 'history'>('queue');
    const [stateFilter, setStateFilter] = useState<PaymentState | null>(null);
    const [orgById, setOrgById] = useState<Map<string, EmployeeOrgDetail>>(new Map());
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [drawerRow, setDrawerRow] = useState<PaymentBatchRow | null>(null);
    const [payTarget, setPayTarget] = useState<PaymentBatchRow[]>([]);
    const [batchModalId, setBatchModalId] = useState<string | null>(null);
    const [batchModalInstanceId, setBatchModalInstanceId] = useState<string | null>(null);

    useEffect(() => {
        if (filter !== 'yearly') return;
        generateFiscalYearFromGivenYear(periodDate)
            .then(({ startDate, endDate }) => setFiscalLabel(formatFiscalYearLabel(`${startDate} to ${endDate}`)))
            .catch(() => undefined);
    }, [filter, periodDate]);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const res = await fetchReimbursementBatches();
            setRawBatches(res?.data?.batches || res?.batches || []);
        } catch {
            setRawBatches([]);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [refreshKey]);

    useEffect(() => { load(); }, [load]);
    useEventBus(EVENT_KEYS.reimbursementChanged, () => setRefreshKey((k) => k + 1));

    // Sub-org / branch / team are not on the batch payload, so the filters join them in from the
    // employee list — once, on mount. A failure here costs the org filters their options, not the
    // page: the queue still loads and still pays.
    useEffect(() => {
        fetchAllEmployees().then((res: any) => {
            const map = new Map<string, EmployeeOrgDetail>();
            (res?.data?.employees ?? []).forEach((emp: any) => {
                map.set(emp.id, {
                    subOrganization: emp.companyOverview?.name || 'N/A',
                    department: emp.departments?.name || 'N/A',
                    branch: emp.branches?.name || 'N/A',
                    // One team per employee; prefer the active membership (same rule as payroll).
                    team: (emp.teamMemberships ?? []).find((m: any) => m.isActive !== false)?.team?.name || 'N/A',
                    isActive: emp.isActive !== false,
                });
            });
            setOrgById(map);
        }).catch(() => undefined);
    }, []);

    // ── Derivation ────────────────────────────────────────────────────────────
    const allRows = useMemo(() => buildPaymentRows(rawBatches, orgById), [rawBatches, orgById]);
    const batchById = useMemo(() => new Map(allRows.map((r) => [r.id, r])), [allRows]);

    const periodRows = useMemo(
        () => filterQueueByPeriod(allRows, filter, periodDate),
        [allRows, filter, periodDate],
    );
    const periodPayments = useMemo(
        () => paymentsInPeriod(allRows, filter, periodDate),
        [allRows, filter, periodDate],
    );

    // The org filters offer what the period actually contains, so a branch with no payments this
    // month is not a dead option.
    const filters = useOrgFilters(periodRows);

    // Every number and every row obeys the same filters — the cards cannot describe a wider
    // population than the table beneath them.
    const scopedRows = useMemo(() => periodRows.filter(filters.matches), [periodRows, filters]);
    const scopedPayments = useMemo(() => {
        const allowed = new Set(scopedRows.map((r) => r.id));
        return periodPayments.filter((p) => allowed.has(p.batchId));
    }, [periodPayments, scopedRows]);

    const kpis = useMemo(() => paymentKpis(scopedRows, scopedPayments), [scopedRows, scopedPayments]);
    const breakdown = useMemo(() => stateBreakdown(scopedRows), [scopedRows]);

    // The queue is what still owes money; a settled batch belongs to the history tab. Selecting
    // "Paid" on the rail is the one way to see settled batches here, which is what makes the rail
    // a filter rather than a legend.
    const queueRows = useMemo(
        () => (stateFilter === null
            ? scopedRows.filter((r) => r.state !== 'PAID')
            : scopedRows.filter((r) => r.state === stateFilter)),
        [scopedRows, stateFilter],
    );

    const historyPayments = scopedPayments;

    // Selection can outlive the rows it referred to — a period change, a filter, or a payment
    // that settled the batch. Anything no longer payable in view drops out of the run.
    const selectableIds = useMemo(
        () => queueRows.filter((r) => r.remainingAmount > 0).map((r) => r.id),
        [queueRows],
    );
    useEffect(() => {
        setSelectedIds((ids) => ids.filter((id) => selectableIds.includes(id)));
    }, [selectableIds]);

    const selectedRows = useMemo(
        () => selectedIds.map((id) => batchById.get(id)).filter(Boolean) as PaymentBatchRow[],
        [selectedIds, batchById],
    );
    const selectedTotal = selectedRows.reduce((s, r) => s + r.remainingAmount, 0);

    const periodLabel = filter === 'monthly'
        ? periodDate.format('MMMM YYYY')
        : filter === 'yearly' ? (fiscalLabel || periodDate.format('YYYY'))
        : 'all time';

    const activeFilterCount = filters.activeCount + (stateFilter !== null ? 1 : 0);
    const clearFilters = () => { setStateFilter(null); filters.reset(); };

    // ── Actions ───────────────────────────────────────────────────────────────

    const handlePeriodChange = (next: PeriodFilter) => {
        setFilter(next);
        setPeriodDate(dayjs());
    };

    const navigate = (dir: -1 | 1) => {
        setPeriodDate((d) => d.add(dir, filter === 'yearly' ? 'year' : 'month'));
    };

    const openBatchModal = (row: PaymentBatchRow) => {
        setDrawerRow(null);
        setBatchModalInstanceId(row.raw?.approvalInstanceId ?? null);
        setBatchModalId(row.id);
    };

    /**
     * Records the run. Each batch is its own POST — the endpoint settles one batch at a time, and
     * inventing a bulk endpoint here would be a second way to write money. Failures are collected
     * rather than thrown, so one rejected batch cannot silently abandon the rest of the run.
     */
    const handleConfirm = async ({ paymentDate, paymentMethod, transactionId, remarks, allocations }: PaymentSubmission) => {
        const failures: string[] = [];
        let succeeded = 0;
        let paid = 0;

        for (const { row, amount } of allocations) {
            try {
                await createReimbursementPayment({
                    employeeId: row.employeeId,
                    batchId: row.id,
                    amountPaid: amount,
                    paymentDate,
                    paymentMethod,
                    transactionId: transactionId || undefined,
                    remarks: remarks || undefined,
                    reimbursementIds: row.approvedReimbursementIds,
                });
                succeeded += 1;
                paid += amount;
            } catch (err: any) {
                const reason = err?.response?.data?.message || 'could not be recorded';
                failures.push(`${row.submissionId}: ${reason}`);
            }
        }

        setPayTarget([]);
        setSelectedIds([]);
        setRefreshKey((k) => k + 1);

        if (succeeded > 0 && !failures.length) {
            toast({
                icon: 'success',
                title: succeeded === 1 ? 'Payment recorded' : `${succeeded} payments recorded`,
                text: `${formatINR(paid)} recorded.`,
            });
        }
        // A failed payout is not a toast — it names a batch someone has to go back to, so it
        // stays on screen until acknowledged.
        if (failures.length) {
            alertDialog({
                icon: 'error',
                title: `${failures.length} payment${failures.length === 1 ? '' : 's'} could not be recorded`,
                html: `${succeeded > 0 ? `<p>${succeeded} succeeded (${formatINR(paid)}).</p>` : ''}<ul style="text-align:left;margin:0;padding-left:18px">${failures.map((f) => `<li>${f}</li>`).join('')}</ul>`,
            });
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    if (loadError && !loading) {
        return <LoadErrorState what="reimbursement payments" onRetry={() => setRefreshKey((k) => k + 1)} />;
    }

    return (
        <Box>
            {/* Header + period. The period governs the KPIs, the rail and both tabs. */}
            <Box sx={{
                display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2.5,
                alignItems: { xs: 'flex-start', lg: 'center' },
                justifyContent: 'space-between',
            }}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                        Payments
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                        Review, process and track reimbursement payments.
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <PeriodTabs
                        value={filter}
                        options={[
                            { label: 'Monthly', value: 'monthly' },
                            { label: 'Yearly', value: 'yearly' },
                            { label: 'All Time', value: 'allTime' },
                        ]}
                        onChange={(v) => handlePeriodChange(v as PeriodFilter)}
                        ariaLabel="payment period"
                    />
                    {filter !== 'allTime' && (
                        <PeriodNavigator
                            label={filter === 'monthly' ? periodDate.format('MMM YYYY') : (fiscalLabel || periodDate.format('YYYY'))}
                            onPrevious={() => navigate(-1)}
                            onNext={() => navigate(1)}
                        />
                    )}
                </Box>
            </Box>

            <PaymentKpiCards kpis={kpis} loading={loading} />

            {/*
              * One toolbar, not three stacked bands. Tabs, the status rail and the employee
              * filter all narrow the same list, so they belong on one line — the page used to
              * spend a row on each, plus a fourth on a sentence restating the tab label.
              */}
            <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
                mt: 2.5, mb: 2, pb: 1,
                borderBottom: '1px solid', borderColor: 'divider',
            }}>
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    sx={{
                        minHeight: 34, mr: 'auto',
                        '& .MuiTabs-indicator': { height: 2 },
                        '& .MuiTab-root': { minHeight: 34, py: 0, px: 1.5, textTransform: 'none', fontSize: 13, fontWeight: 700 },
                    }}
                >
                    <Tab value="queue" label={`Queue (${queueRows.length})`} />
                    <Tab value="history" label={`History (${historyPayments.length})`} />
                </Tabs>

                {tab === 'queue' && (
                    <PaymentStatusRail
                        breakdown={breakdown}
                        value={stateFilter}
                        onChange={setStateFilter}
                    />
                )}
            </Box>

            {tab === 'queue' ? (
                <>
                    {/* The run bar appears only when a run is actually selected — a permanently
                        disabled "Process payment" button teaches people to ignore it. */}
                    {canPay && selectedRows.length > 0 && (
                        <Box sx={{
                            display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
                            px: 1.75, py: 0.75, mb: 1.25, borderRadius: '8px',
                            border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover',
                        }}>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, flex: '1 1 auto' }}>
                                {selectedRows.length} batch{selectedRows.length === 1 ? '' : 'es'} selected ·{' '}
                                <Box component="span" sx={{ color: '#1E3A8A', fontVariantNumeric: 'tabular-nums' }}>
                                    {formatINR(selectedTotal)}
                                </Box>
                            </Typography>
                            <WtButton ghost size="small" sx={COMPACT_BUTTON_SX} onClick={() => setSelectedIds([])}>
                                Clear
                            </WtButton>
                            <WtButton size="small" sx={COMPACT_BUTTON_SX} onClick={() => setPayTarget(selectedRows)}>
                                Process payment
                            </WtButton>
                        </Box>
                    )}

                    <PaymentQueueTable
                        rows={queueRows}
                        loading={loading}
                        canPay={canPay}
                        selectedIds={selectedIds}
                        onToggleSelect={(id) =>
                            setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))}
                        onToggleSelectAll={() =>
                            setSelectedIds((ids) => (ids.length === selectableIds.length ? [] : selectableIds))}
                        onPay={(row) => setPayTarget([row])}
                        onView={setDrawerRow}
                        periodLabel={periodLabel}
                        filtered={activeFilterCount > 0}
                        onClearFilters={clearFilters}
                        renderFilters={() => <OrgFilterToolbar filters={filters} />}
                    />
                </>
            ) : (
                <PaymentHistoryTable
                    payments={historyPayments}
                    batchById={batchById}
                    loading={loading}
                    periodLabel={periodLabel}
                    filtered={filters.activeCount > 0}
                    onClearFilters={clearFilters}
                    onView={setDrawerRow}
                    renderFilters={() => <OrgFilterToolbar filters={filters} />}
                />
            )}

            <PaymentDetailDrawer
                row={drawerRow}
                onClose={() => setDrawerRow(null)}
                onPay={(row) => { setDrawerRow(null); setPayTarget([row]); }}
                onOpenBatch={openBatchModal}
                canPay={canPay}
            />

            <RecordPaymentModal
                batches={payTarget}
                open={payTarget.length > 0}
                onClose={() => setPayTarget([])}
                onConfirm={handleConfirm}
            />

            <BatchDetailModal
                batchId={batchModalId}
                onClose={() => setBatchModalId(null)}
                onBatchActionDone={() => setRefreshKey((k) => k + 1)}
                approvalInstanceId={batchModalInstanceId}
                filterStatus={null}
            />
        </Box>
    );
}

export default PaymentTab;
