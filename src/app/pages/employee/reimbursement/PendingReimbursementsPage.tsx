import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import ReactDOM from 'react-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { DataTable, SortableHeader, type ColumnDef } from '@/ds/patterns/data-table';
import { toneStyle } from '@/ds/lib/tone';

import { Form, Formik, FormikValues } from 'formik';
import * as Yup from 'yup';
import dayjs from 'dayjs';
import { successConfirmation, errorConfirmation, deleteConfirmation, genericConfirmation } from '@utils/modal';
import {
  fetchPendingReimbursementDrafts,
  createPendingReimbursementDraft,
  updatePendingReimbursementDraft,
  deletePendingReimbursementDraft,
  submitReimbursementBatch,
} from '@services/employee';
import { uploadUserAsset } from '@services/uploader';
import ReimbursementKpiRow from './components/ReimbursementKpiRow';
import { useSensitiveData } from '@app/modules/common/components/SensitiveData';
import { TOOLBAR_ROW } from './utils/toolbarButton';
import DocumentPreviewModal from './components/DocumentPreviewModal';
import OverLimitChip from './components/OverLimitChip';
import { ReimbursementDraft } from './utils/reimbursementTypes';
import { ReimbursementFormDialog, type ReimbursementFormHelpers, type ReimbursementFormValues } from './components/ReimbursementFormDialog';
import { fmtAmount, projectTitle } from './utils/reimbursementFormat';
import LoadErrorState from './components/LoadErrorState';
import { fetchAllReimbursementTypesFromDb } from '@utils/statistics';
import { getAllCompanyTypes, getAllClientCompanies } from '@services/companies';
import { getReimbursementProjectOptions, getAllProjectStatuses } from '@services/projects';
import { Option } from '@models/dropdown';
import { KTIcon } from '@metronic/helpers';
import { Eye, FileX, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/ds/ui/avatar';
import { Badge } from '@/ds/ui/badge';
import { Card, CardContent } from '@/ds/ui/card';
import { Skeleton } from '@/ds/ui/skeleton';
import { getAvatar } from '@utils/avatar';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import { useReimbursementLookups } from '@hooks/useReimbursementLookups';
import { IReimbursementsCreate } from '@models/employee';
import { useEventBus } from '@hooks/useEventBus';
import { AppIcon } from '@app/modules/common/components/ui';
import { EVENT_KEYS } from '@constants/eventKeys';
import { makeReimbursementInitialState } from './utils/reimbursementSchema';
import { currencyPrefix } from '@utils/currency';
import { Button as KitButton } from '@/ds/ui/button';
import { pressableProps } from '@app/modules/common/components/ui/a11y';

const BACKEND = import.meta.env.VITE_APP_WISE_TECH_BACKEND as string;

// ── Validation schema (mirrors Reimbursement.tsx exactly) ─────────────────────



// Module-level mutable initial state — reset in handleNew exactly like Reimbursement.tsx


// ── Document Preview Modal (identical to Monthly.tsx) ─────────────────────────

// ── Helpers ────────────────────────────────────────────────────────────────────



// ── Employee profile card (left panel) ────────────────────────────────────────

function ReimbEmployeeProfileCard({ employee }: { employee: any }) {
  const avatar = getAvatar(employee?.avatar || '', employee?.gender);
  const name = `${employee?.users?.firstName || ''} ${employee?.users?.lastName || ''}`.trim() || 'Employee';
  const initials = name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const hasProfessionalFees = !!employee?.professionalFeesEnabled;

  return (
    // Identity only — who these claims belong to. Phone and email are not reimbursement facts and
    // are deliberately not shown on any reimbursement tab.
    <Card size="sm" className="h-full justify-center">
      <CardContent className="flex min-w-0 items-center gap-3">
        <Avatar className="size-14 shrink-0 rounded-2xl after:rounded-2xl">
          <AvatarImage src={avatar} alt={name} className="rounded-2xl object-cover" />
          <AvatarFallback className="rounded-2xl">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold leading-tight text-foreground" title={name}>{name}</div>
          <div className="mt-0.5 text-xs font-semibold text-muted-foreground">{employee?.employeeCode || '-'}</div>
          <Badge variant={hasProfessionalFees ? 'brand' : 'success'} className="mt-1.5 tracking-wide uppercase">
            {hasProfessionalFees ? 'Contract based' : 'Salary based'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Employee Details section skeleton ─────────────────────────────────────────

function EmployeeDetailsSkeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]" aria-busy="true">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
      </div>
    </div>
  );
}

// ── Employee Details section ───────────────────────────────────────────────────

export interface EmployeeDetailsSectionProps {
  totalRequests: number;
  totalRequestedAmount: number;
  approvedRequests: number;
  rejectedRequests: number;
  pendingRequests: number;
  approvedAmount: number;
  pendingAmount: number;
  rejectedAmount: number;
  paidAmount?: number;
  remainingAmount?: number;
  /** Unsubmitted drafts in the current period. Defaults to 0 (admin Search Employee has no inbox). */
  inboxAmount?: number;
  inboxCount?: number;
  overviewLoading: boolean;
  /** Optional employee override. When provided, used instead of currentEmployee from redux. */
  employee?: any;
}

export function EmployeeDetailsSection({
  totalRequests,
  totalRequestedAmount,
  approvedRequests,
  rejectedRequests,
  pendingRequests,
  approvedAmount,
  pendingAmount,
  rejectedAmount,
  paidAmount = 0,
  remainingAmount = 0,
  inboxAmount = 0,
  inboxCount = 0,
  overviewLoading,
  employee: employeeProp,
}: EmployeeDetailsSectionProps) {
  const currentEmployee = useSelector((state: RootState) => state.employee.currentEmployee);
  const employee = employeeProp !== undefined ? employeeProp : currentEmployee;
  const sensitive = useSensitiveData();

  // Four stage cards: Drafts → Pending approval → Approved → Paid out.
  // Submitted rollup is labeled on the pending-approval card when it adds context.
  // Rejected stays in the records table as a status chip, not a KPI tile.
  const kpis = {
    inboxAmount,
    inboxCount,
    totalAmount: totalRequestedAmount,
    totalRequests,
    approvedAmount,
    approvedCount: approvedRequests,
    pendingAmount,
    pendingCount: pendingRequests,
    paidAmount,
  };

  return (
    <div className="mb-6 w-full">
      {!employee ? (
        <EmployeeDetailsSkeleton />
      ) : (
        <div className="grid items-stretch gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
          <ReimbEmployeeProfileCard employee={employee} />
          <div className="min-w-0">
            <ReimbursementKpiRow kpis={kpis} loading={overviewLoading} showSensitiveData={sensitive.visible} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export interface PendingReimbursementsPageHandle {
  openAddModal: () => void;
}

interface PendingReimbursementsPageProps extends Partial<EmployeeDetailsSectionProps> {
  onDraftsChange?: (count: number) => void;
  /** The page's period selector — rendered directly under the KPI cards it drives. */
  periodSlot?: React.ReactNode;
  /** Current period (month/year) for constraining date picker. Format: dayjs Dayjs object. */
  currentPeriod?: any; // Dayjs object
}

const PendingReimbursementsPage = forwardRef<PendingReimbursementsPageHandle, PendingReimbursementsPageProps>(function PendingReimbursementsPage({
  totalRequests = 0,
  totalRequestedAmount = 0,
  approvedRequests = 0,
  rejectedRequests = 0,
  pendingRequests = 0,
  approvedAmount = 0,
  pendingAmount = 0,
  rejectedAmount = 0,
  paidAmount = 0,
  remainingAmount = 0,
  overviewLoading = false,
  onDraftsChange,
  periodSlot,
  currentPeriod,
}, ref) {
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
  // Per-request cap for the live limit warning under the Amount field.
  const perRequestLimit = useSelector((state: RootState) => (state.employee.currentEmployee as any)?.reimbursementLimitPerRequest);
  const userId = useSelector((state: RootState) => state.auth.currentUser.id);
  const sensitive = useSensitiveData();

  const [drafts, setDrafts] = useState<ReimbursementDraft[]>([]);
  // A failed fetch used to render as "no drafts", which is indistinguishable from success.
  const [draftsError, setDraftsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal state — same variable names as Reimbursement.tsx
  const [show, setShow] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentReimbursement, setCurrentReimbursement] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Document preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Table lookup resolvers
  const { resolveClientType, resolveClientCompany, resolveProject } = useReimbursementLookups(drafts);

  // Phase 1: Filter drafts by current period for month-aware inbox
  const filteredDrafts = useMemo(() => {
    if (!currentPeriod) return drafts;
    return drafts.filter(draft => {
      const draftMonth = dayjs(draft.expenseDate);
      return draftMonth.month() === currentPeriod.month() && draftMonth.year() === currentPeriod.year();
    });
  }, [drafts, currentPeriod]);

  // ── Load drafts ────────────────────────────────────────────────────────────

  const loadDrafts = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const res = await fetchPendingReimbursementDrafts(employeeId);
      setDrafts(res?.data?.drafts || res?.drafts || []);
    } catch {
      setDrafts([]);
      setDraftsError(true);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  // Refresh when drafts change on any connected client (WebSocket)
  useEventBus(EVENT_KEYS.reimbursementChanged, () => { loadDrafts(); });

  useEffect(() => { onDraftsChange?.(drafts.length); }, [drafts.length, onDraftsChange]);

  const handleNewRef = useRef<() => void>(() => { });
  useImperativeHandle(ref, () => ({ openAddModal: () => handleNewRef.current() }));

  // ── Load dropdown data — separated exactly like Reimbursement.tsx ──────────
  // Reimbursement types use fetchAllReimbursementTypesFromDb (the working utility),
  // loaded independently so a failure here doesn't block company type loading.

  const handleNew = () => {
    // The dialog resets its own lookups on every close, so each open starts clean.
    setShow(true);
    setEditMode(false);
    setCurrentReimbursement(null);
  };
  handleNewRef.current = handleNew;

  const handleEdit = (draft: any) => {
    setCurrentReimbursement(draft);
    setEditMode(true);
    setShow(true);
  };

  const formInitialValues = useMemo<ReimbursementFormValues>(() => ({
    ...makeReimbursementInitialState(),
    expenseDate: editMode && currentReimbursement?.expenseDate
      ? dayjs(currentReimbursement.expenseDate).format('YYYY-MM-DD')
      : (currentPeriod
          ? (currentPeriod.isSame(dayjs(), 'month')
              ? dayjs().format('YYYY-MM-DD')
              : currentPeriod.startOf('month').format('YYYY-MM-DD'))
          : dayjs().format('YYYY-MM-DD')),
    ...(editMode && currentReimbursement && {
      ...currentReimbursement,
      clientTypeId: currentReimbursement?.clientTypeId ?? '',
      clientCompanyId: currentReimbursement?.clientCompanyId ?? '',
      projectId: currentReimbursement?.projectId ?? '',
      fromLocation: currentReimbursement?.fromLocation ?? '',
      toLocation: currentReimbursement?.toLocation ?? '',
      description: currentReimbursement?.description ?? '',
      document: currentReimbursement?.document ?? '',
    }),
  }), [editMode, currentReimbursement, currentPeriod]);

  const handleClose = () => {
    setShow(false);
    setEditMode(false);
    setCurrentReimbursement(null);
  };

  const handleSubmit = async (values: any, helpers: ReimbursementFormHelpers) => {
    try {
      setFormLoading(true);
      if (editMode) {
        if (values.employee) delete values.employee;
        if (values.employeeId) delete values.employeeId;
        if (values.reimbursementType) delete values.reimbursementType;
        if (values.type) delete values.type;
        if (values.day) delete values.day;
        if (values.isActive) delete values.isActive;
        if (values.status) delete values.status;

        await updatePendingReimbursementDraft(currentReimbursement.id, values);
        setFormLoading(false);
        successConfirmation('Reimbursement updated.');
        setShow(false);
        setEditMode(false);
        loadDrafts();
        return;
      }

      values.employeeId = employeeId;
      const filteredValues = Object.fromEntries(
        Object.entries(values).filter(([key, value]) => key === 'amount' || value !== '')
      );

      const payload: IReimbursementsCreate = {
        ...filteredValues,
        reimbursementTypeId: filteredValues.reimbursementTypeId,
        expenseDate: filteredValues.expenseDate,
        amount: filteredValues.amount ?? 0,
        description: filteredValues.description,
      } as IReimbursementsCreate;

      await createPendingReimbursementDraft(payload);
      setFormLoading(false);
      successConfirmation('Reimbursement saved to Pending Requests.');
      loadDrafts();

      // Keep the dialog open AND the project context (date, company, project): a run of expenses
      // against one project is one selection followed by N amounts. Only the expense itself clears.
      helpers.startNextExpense();
    } catch (err) {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await deleteConfirmation('Draft deleted.');
    if (!confirmed) return;
    try {
      await deletePendingReimbursementDraft(id);
      loadDrafts();
    } catch {
      errorConfirmation('Failed to delete draft');
    }
  };

  const handleSendForApproval = async () => {
    if (!drafts.length) { errorConfirmation('No pending requests to submit'); return; }
    const confirmed = await genericConfirmation(
      'Confirm Submission for Approval',
      'Are you sure you want to send all pending reimbursement requests for approval?',
      'Send for Approval',
      'warning',
    );
    if (!confirmed) return;
    setSubmitting(true);
    try {
      const res = await submitReimbursementBatch(employeeId);
      const payload = res?.data ?? res ?? {};
      const submissionId = payload?.submissionId || '';
      const hasInstance = !!payload?.approvalInstanceId;
      successConfirmation(
        `Batch submitted! Submission ID: ${submissionId}${hasInstance ? '\nYour request has been routed to your approver.' : ''}`,
        'Submitted for Approval'
      );
      loadDrafts();
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Failed to submit batch');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Table columns ──────────────────────────────────────────────────────────

  // Phase 1: Use filtered drafts for period-aware totals
  const totalAmount = useMemo(
    () => filteredDrafts.reduce((sum, d) => sum + Number(d.amount || 0), 0),
    [filteredDrafts]
  );

  const columns = useMemo<ColumnDef<ReimbursementDraft, any>[]>(() => [
    {
      accessorKey: 'expenseDate',
      meta: { label: 'Date' },
      header: ({ column }) => <SortableHeader column={column} title="Date" />,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {dayjs(row.original.expenseDate).format('DD MMM YYYY')}{' '}
          <span className="text-muted-foreground">({dayjs(row.original.expenseDate).format('ddd')})</span>
        </span>
      ),
      footer: () => <span className="uppercase">Total</span>,
    },
    {
      accessorKey: 'clientTypeId',
      meta: { label: 'Company type' },
      header: 'Company Type',
      cell: ({ row }) => resolveClientType(row.original.clientTypeId) || '—',
    },
    {
      accessorKey: 'clientCompanyId',
      meta: { label: 'Company name' },
      header: 'Company Name',
      cell: ({ row }) => resolveClientCompany(row.original.clientCompanyId) || '—',
    },
    {
      id: 'project',
      accessorFn: (r) => projectTitle(r, resolveProject),
      meta: { label: 'Project' },
      header: ({ column }) => <SortableHeader column={column} title="Project Name" />,
      cell: ({ getValue }) => <span className="block max-w-72 whitespace-normal">{getValue() as string}</span>,
    },
    {
      id: 'type',
      accessorFn: (r) => r.reimbursementType?.type ?? '',
      meta: { label: 'Type' },
      header: ({ column }) => <SortableHeader column={column} title="Type" />,
      cell: ({ getValue }) => (getValue() as string) || '—',
    },
    {
      accessorKey: 'amount',
      meta: { label: 'Amount' },
      header: ({ column }) => <SortableHeader column={column} title="Amount" />,
      cell: ({ row }) => (
        // Colour alone is not a status — the chip carries the word too.
        <span className="inline-flex items-center gap-2">
          <span className={`tabular font-semibold text-foreground ${sensitive.cls}`}>{fmtAmount(row.original.amount)}</span>
          {row.original.isExceedingLimit && <OverLimitChip />}
        </span>
      ),
      footer: () => <span className={`tabular ${sensitive.cls}`}>{fmtAmount(totalAmount)}</span>,
    },
    {
      id: 'route',
      accessorFn: (r) => [r.fromLocation, r.toLocation].filter(Boolean).join(' → '),
      meta: { label: 'Route' },
      header: 'Route',
      cell: ({ row }) =>
        row.original.fromLocation || row.original.toLocation
          ? `${row.original.fromLocation || '?'} → ${row.original.toLocation || '?'}`
          : '—',
    },
    {
      accessorKey: 'description',
      meta: { label: 'Note' },
      header: 'Note',
      cell: ({ row }) => <span className="block max-w-56 whitespace-normal">{row.original.description || '—'}</span>,
    },
    {
      id: 'document',
      enableSorting: false,
      meta: { label: 'Receipt' },
      header: 'Receipt',
      cell: ({ row }) => (
        <KitButton
          variant="ghost"
          size="icon-sm"
          onClick={() => { if (row.original.document) setPreviewUrl(row.original.document); }}
          disabled={!row.original.document}
          aria-label={row.original.document ? 'Preview receipt' : 'No receipt attached'}
          title={row.original.document ? 'Preview receipt' : 'No receipt attached'}
        >
          {row.original.document ? <Eye aria-hidden /> : <FileX aria-hidden className="text-muted-foreground" />}
        </KitButton>
      ),
    },
    {
      id: 'actions',
      enableSorting: false,
      enableHiding: false,
      meta: { pin: 'end' },
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <KitButton variant="ghost" size="icon-sm" onClick={() => handleEdit(row.original)} aria-label="Edit this expense" title="Edit">
            <Pencil aria-hidden />
          </KitButton>
          <KitButton variant="ghost" size="icon-sm" onClick={() => handleDelete(row.original.id)} aria-label="Delete this expense" title="Delete">
            <Trash2 aria-hidden className="text-destructive" />
          </KitButton>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleEdit/handleDelete are stable in effect (state setters + loadDrafts)
  ], [resolveClientType, resolveClientCompany, resolveProject, totalAmount, sensitive.cls]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Employee Details + reimbursement KPI cards.
          Inbox KPIs use the same period-filtered drafts as the inbox table below. */}
      <EmployeeDetailsSection
        totalRequests={totalRequests}
        totalRequestedAmount={totalRequestedAmount}
        approvedRequests={approvedRequests}
        rejectedRequests={rejectedRequests}
        pendingRequests={pendingRequests}
        approvedAmount={approvedAmount}
        pendingAmount={pendingAmount}
        rejectedAmount={rejectedAmount}
        paidAmount={paidAmount}
        remainingAmount={remainingAmount}
        inboxAmount={totalAmount}
        inboxCount={filteredDrafts.length}
        overviewLoading={overviewLoading}
      />

      {periodSlot}

      {/* Action bar — only visible when inbox is shown.
          No `paddingRight` on the row: it pushed this row's right edge 1.25rem inside the
          period bar's above, so the buttons on the two rows could never line up. */}
      {(loading || drafts.length > 0) && (
        <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
          <h2 className='m-0 text-base font-bold text-foreground lg:text-lg'>Reimbursement Request Inbox</h2>
          <div className={TOOLBAR_ROW}>
            {hasPermission(
              resourceNameMapWithCamelCase.reimbursement,
              permissionConstToUseWithHasPermission.create
            ) && (
                // Same action, same emphasis as the one on the records bar below —
                // this is the one the user sees once drafts exist, and the two must
                // not disagree about how prominent "add a request" is.
                <KitButton size="sm" onClick={handleNew}>
                  <Plus data-icon="inline-start" aria-hidden />
                  Add Reimbursement Request
                </KitButton>
              )}
            {drafts.length > 0 && (
              <KitButton size="sm" variant="success" onClick={handleSendForApproval} loading={submitting}>
                {!submitting && <Send data-icon="inline-start" aria-hidden />}
                {submitting ? 'Submitting…' : 'Send for Approval'}
              </KitButton>
            )}
          </div>
        </div>
      )}

      {draftsError && !loading && (
        <LoadErrorState what="your unsubmitted drafts" onRetry={loadDrafts} />
      )}

      {/* Table — only shown when there are drafts or while loading */}
      {/* Phase 1: Show filtered drafts for current period */}
      {!draftsError && (loading || filteredDrafts.length > 0) && (
        <DataTable<ReimbursementDraft>
          caption="Reimbursement request inbox"
          data={filteredDrafts}
          columns={columns}
          getRowId={(r) => String(r.id)}
          loading={loading}
          searchPlaceholder="Search drafts"
          initialSorting={[{ id: 'expenseDate', desc: true }]}
          // A draft is waiting (warning); one over its cap is flagged (danger) — the word is in the OverLimitChip.
          rowTone={(r) => (r.isExceedingLimit ? 'danger' : 'warning')}
          renderCard={(r) => (
            <div
              data-wt-control="row"
              {...pressableProps(() => handleEdit(r))}
              onClick={() => handleEdit(r)}
              aria-label={`Edit the ${r.reimbursementType?.type ?? ''} expense of ${dayjs(r.expenseDate).format('DD MMM')}`}
              style={toneStyle(r.isExceedingLimit ? 'danger' : 'warning')}
              className="cursor-pointer rounded-2xl border bg-card p-3 text-sm shadow-[inset_3px_0_0_var(--tone)] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Date</div>
                  <div className="font-semibold text-foreground">{dayjs(r.expenseDate).format('DD MMM YYYY')}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground uppercase">Amount</div>
                  <div className={`tabular font-bold text-foreground ${sensitive.cls}`}>{currencyPrefix()}{fmtAmount(r.amount)}</div>
                </div>
              </div>
              <div className="font-semibold text-foreground">{r.reimbursementType?.type || '—'}</div>
              {r.clientTypeId && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {resolveClientType(r.clientTypeId)} · {resolveClientCompany(r.clientCompanyId) || '—'}
                </div>
              )}
            </div>
          )}
        />
      )}

      {/* In-app document preview modal */}
      {previewUrl && (
        <DocumentPreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}

      {/* Add / Edit — the one reimbursement form (components/ReimbursementFormDialog). */}
      <ReimbursementFormDialog
        open={show}
        onOpenChange={(next) => { if (!next) handleClose(); }}
        mode={editMode ? 'edit' : 'create'}
        title={editMode ? 'Edit reimbursement request' : 'New reimbursement request'}
        description={currentPeriod && !editMode ? `For ${currentPeriod.format('MMMM YYYY')}` : undefined}
        record={editMode ? currentReimbursement : null}
        initialValues={formInitialValues}
        // A batch is one month: dates stay inside the period being viewed, and never in the future.
        minDate={(currentPeriod ? currentPeriod.startOf('month') : dayjs().startOf('month')).format('YYYY-MM-DD')}
        maxDate={(currentPeriod && currentPeriod.endOf('month').isBefore(dayjs(), 'day') ? currentPeriod.endOf('month') : dayjs()).format('YYYY-MM-DD')}
        submitLabel={editMode ? 'Save changes' : 'Save to pending requests'}
        submitting={formLoading}
        onSubmit={handleSubmit}
        duplicatePool={drafts}
        excludeId={currentReimbursement?.id}
        perRequestLimit={perRequestLimit}
      />
    </>
  );
});

export default PendingReimbursementsPage;
