import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import ReactDOM from 'react-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { MRT_ColumnDef } from 'material-react-table';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { Modal } from 'react-bootstrap';
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
import PrivacyToggle from '@app/modules/common/components/PrivacyToggle';
import { useSensitiveData } from '@app/modules/common/components/SensitiveData';
import { TOOLBAR_ROW, lightToolbarButton } from './utils/toolbarButton';
import { Button } from '@mui/material';
import DocumentPreviewModal from './components/DocumentPreviewModal';
import OverLimitChip from './components/OverLimitChip';
import { ReimbursementDraft, ReimbursementOption } from './utils/reimbursementTypes';
import { useReimbursementFormLookups } from './hooks/useReimbursementFormLookups';
import { fmtAmount, projectTitle } from './utils/reimbursementFormat';
import LoadErrorState from './components/LoadErrorState';
import { fetchAllReimbursementTypesFromDb } from '@utils/statistics';
import { getAllCompanyTypes, getAllClientCompanies } from '@services/companies';
import { getReimbursementProjectOptions, getAllProjectStatuses } from '@services/projects';
import TextInput from '@app/modules/common/inputs/TextInput';
import DropDownInput from '@app/modules/common/inputs/DropdownInput';
import DateInput from '@app/modules/common/inputs/DateInput';
import ReimbursementDropdown from '@app/modules/common/inputs/ReimbursementDropdown';
import { Option } from '@models/dropdown';
import { KTIcon } from '@metronic/helpers';
import { Avatar, Box, Chip, Paper, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { getAvatar } from '@utils/avatar';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import { useReimbursementLookups } from '@hooks/useReimbursementLookups';
import { IReimbursementsCreate } from '@models/employee';
import { useEventBus } from '@hooks/useEventBus';
import { WtButton } from '@app/modules/common/components/ui';
import { EVENT_KEYS } from '@constants/eventKeys';
import { getReimbursementSchema, makeReimbursementInitialState, findDuplicateCandidate, categoryRequiresLocation, describeLimitBreach } from './utils/reimbursementSchema';

const BACKEND = import.meta.env.VITE_APP_WISE_TECH_BACKEND as string;

// ── Validation schema (mirrors Reimbursement.tsx exactly) ─────────────────────



// Module-level mutable initial state — reset in handleNew exactly like Reimbursement.tsx


// ── Document Preview Modal (identical to Monthly.tsx) ─────────────────────────

// ── Helpers ────────────────────────────────────────────────────────────────────



// ── Employee profile card (left panel) ────────────────────────────────────────

type Gender = 0 | 1 | 2;

function ReimbEmployeeProfileCard({ employee }: { employee: any }) {
  const avatar = getAvatar(employee?.avatar || '', employee?.gender as unknown as Gender);
  const name = `${employee?.users?.firstName || ''} ${employee?.users?.lastName || ''}`.trim() || 'Employee';
  const hasProfessionalFees = !!employee?.professionalFeesEnabled;

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        p: { xs: 1.5, md: 1.75 },
        borderRadius: '16px',
        background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
        border: '1px solid #e9eef5',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 16px rgba(15, 23, 42, 0.035)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack direction="row" spacing={{ xs: 1.5, md: 2 }} sx={{ mb: 1 }}>
        <Avatar
          src={avatar}
          alt={name}
          sx={{
            width: { xs: 68, md: 74 },
            height: { xs: 68, md: 74 },
            borderRadius: '16px',
            boxShadow: '0 6px 12px rgba(15, 23, 42, 0.08)',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            flex: '0 0 auto',
            '& .MuiAvatar-img': { objectFit: 'fill' },
          }}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1} mb={0.45}>
            <Box sx={{ minWidth: 0 }}>
              <Tooltip title={name} arrow placement="top">
                <Typography sx={{ color: '#0f172a', fontSize: { xs: '1.05rem', md: '1.14rem' }, fontWeight: 800, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {name}
                </Typography>
              </Tooltip>
              <Typography sx={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 700, mt: 0.35 }}>
                {employee?.employeeCode || '-'}
              </Typography>
            </Box>
          </Stack>
          <Typography sx={{ color: '#334155', fontSize: '0.84rem', fontWeight: 700, lineHeight: 1.3 }}>
            {employee?.companyPhoneNumber || '-'}
          </Typography>
          <Box sx={{ mt: 0.75 }}>
            <Chip
              label={hasProfessionalFees ? 'CONTRACT BASED' : 'SALARY BASED'}
              size="small"
              sx={{
                height: '22px',
                fontSize: '0.65rem',
                fontWeight: 800,
                letterSpacing: '0.5px',
                backgroundColor: hasProfessionalFees ? '#f5f3ff' : '#f0fdf4',
                color: hasProfessionalFees ? '#7c3aed' : '#16a34a',
                border: `1px solid ${hasProfessionalFees ? '#ede9fe' : '#dcfce7'}`,
                '& .MuiChip-label': { px: 1 },
              }}
            />
          </Box>
        </Box>
      </Stack>

      {employee?.companyEmailId && (
        <Box
          sx={{
            mt: 1.4,
            pt: 1.25,
            borderTop: '1px solid #edf2f7',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: '1fr' },
            gap: 0.85,
          }}
        >
          <Box
            sx={{
              minWidth: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.7,
              px: 1,
              py: 0.75,
              borderRadius: '10px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e8eef5',
            }}
          >
            <Box sx={{ color: '#64748b', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
              <EmailOutlinedIcon sx={{ fontSize: '14px' }} />
            </Box>
            <Typography
              sx={{
                minWidth: 0,
                color: '#475569',
                fontSize: '0.73rem',
                fontWeight: 600,
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {employee.companyEmailId}
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
}

// ── Employee Details section skeleton ─────────────────────────────────────────

function EmployeeDetailsSkeleton() {
  return (
    <Paper elevation={0} sx={{ p: 1.25, borderRadius: '20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5}>
        <Skeleton variant="rounded" width="100%" height={168} sx={{ maxWidth: { lg: 260 }, borderRadius: '16px' }} />
        <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(5, 1fr)' }, gap: 1.25 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: '16px' }} />
          ))}
        </Box>
      </Stack>
    </Paper>
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
  overviewLoading,
  employee: employeeProp,
}: EmployeeDetailsSectionProps) {
  const currentEmployee = useSelector((state: RootState) => state.employee.currentEmployee);
  const employee = employeeProp !== undefined ? employeeProp : currentEmployee;
  const sensitive = useSensitiveData();

  // Ten tiles became four cards.
  //
  // The ten were five count/amount pairs split into separate boxes — "24 approved" in one tile
  // and "₹98,000 approved" in another, with the reader left to pair them. `YearlyKpiCard` renders
  // a value with a footer strip beneath it, so each pair is one card, and the row reads in the
  // order an expense actually moves: submitted, approved, awaiting, paid.
  //
  // Rejected loses its dedicated tiles. It is a terminal state you look up when it happens, not a
  // number worth a quarter of the page every day — the records table below carries it as a status
  // chip with a live count, which is also where the reason lives.
  const kpis = {
    totalAmount: totalRequestedAmount,
    totalRequests,
    approvedAmount,
    approvedCount: approvedRequests,
    pendingAmount,
    pendingCount: pendingRequests,
    paidAmount,
  };

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      {/* The eye sits with the heading, where salary puts it — one switch for every figure
          below it, so a total is not readable over a shoulder in an open-plan office. */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
        <Typography className="font-barlow" sx={{ color: '#0f172a', fontSize: { xs: 20, md: 22 }, fontWeight: 800, lineHeight: 1.2 }}>
          Employee Details
        </Typography>
        <Box
          sx={{
            ml: 'auto',
            width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center',
            color: '#64748b', bgcolor: '#f1f5f9', transition: 'background-color 200ms',
            '&:hover': { bgcolor: '#e2e8f0' },
            '& .privacy-toggle': {
              width: 30, height: 30, cursor: 'pointer',
              display: 'grid', placeItems: 'center', borderRadius: '50%',
            },
          }}
        >
          <PrivacyToggle isVisible={sensitive.visible} onToggle={sensitive.toggle} color="#64748b" />
        </Box>
      </Box>

      {!employee ? (
        <EmployeeDetailsSkeleton />
      ) : (
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            p: { xs: 1, md: 1.25 },
            borderRadius: '20px',
            background: 'linear-gradient(180deg, #fbfdff 0%, #f8fbff 100%)',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '260px minmax(0, 1fr)' },
              gap: 1.25,
              alignItems: 'stretch',
            }}
          >
            <ReimbEmployeeProfileCard employee={employee} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, minWidth: 0 }}>
              <ReimbursementKpiRow kpis={kpis} loading={overviewLoading} showSensitiveData={sensitive.visible} />
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
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
  // Presigned URL for a receipt uploaded in this session but not yet saved as a draft.
  const [justUploadedUrl, setJustUploadedUrl] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Dropdown option lists — same names as Reimbursement.tsx
  // One hook for the whole lookup cascade — see hooks/useReimbursementFormLookups.
  const {
    reimbursementOptions, companyTypeOptions, filteredCompanies, projectOptions, projectsLoading,
    projectStatusOptions,
    selectedReimbursementFor, selectedClientType, selectedClientCompany, selectedProject,
    selectedProjectStatus,
    handleCategoryChange, handleClientTypeChange, handleClientCompanyChange, handleProjectChange,
    handleProjectStatusChange,
    reset: resetLookups,
  } = useReimbursementFormLookups(currentReimbursement);


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
    resetLookups();
// projectOptions is NOT reset here — it's owned by the reactive effect above,
    // which recomputes it from allProjects/selectedClientType/selectedClientCompany.
    // Clearing it imperatively here left it stuck empty on a fresh "Add" open,
    // since selectedClientType/selectedClientCompany are already null at rest and
    // setState with an unchanged value doesn't re-trigger that effect.

    // (shared mutable initialState removed — makeReimbursementInitialState)

    setShow(true);
    setEditMode(false);
    setCurrentReimbursement(null);
  };
  handleNewRef.current = handleNew;

  const handleEdit = (draft: any) => {
    resetLookups();
// projectOptions is left alone here too — see handleNew for why.

    setCurrentReimbursement(draft);
    setEditMode(true);
    setShow(true);
  };

  const handleClose = () => {
    setShow(false);
    setEditMode(false);
    setCurrentReimbursement(null);
  };

  const handleSubmit = async (values: any, actions: any) => {
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
        successConfirmation('Reimbursement updated successfully');
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

      // Keep modal open — clear only per-entry fields so Date, Company Type,
      // Company Name, and Project Name stay populated for the next entry.
      actions.setFieldValue('reimbursementTypeId', '');
      actions.setFieldValue('amount', undefined);
      actions.setFieldValue('fromLocation', '');
      actions.setFieldValue('toLocation', '');
      actions.setFieldValue('document', '');
      actions.setFieldValue('description', '');
      actions.setTouched({});
      actions.setSubmitting(false);
      resetLookups();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setFormLoading(false);
    }
  };

  const handleChange = (
    selectedOption: any,
    formikField: string,
    setSelectedOptionState: React.Dispatch<React.SetStateAction<any>>,
    setFieldValue: (field: string, value: any) => void
  ) => {
    setFieldValue(formikField, selectedOption ? selectedOption.value : '');
    setSelectedOptionState(selectedOption || null);
  };

  const uploadFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
    formikProps: any,
    fileMaxUploadSize: number
  ) => {
    const { target: { files } } = event;
    if (files && files[0].size > fileMaxUploadSize) {
      // A raw browser alert() in a fully styled app. The server caps uploads at 10 MB
      // anyway (Phase 0); this is the friendly early warning, not the enforcement.
      errorConfirmation("That file is over 5 MB. Please attach a smaller receipt.");
      event.target.value = '';
      return;
    }
    if (files && files.length > 0) {
      const form = new FormData();
      form.append('file', files[0]);
      try {
        const { data: { path, previewUrl: signedUrl } } = await uploadUserAsset(form, userId, undefined, 'reimbursement-docs');
        formikProps.setFieldValue('document', path, true);
        // Receipts are stored private, so `path` alone won't render. Saved drafts come back
        // presigned from the API; this covers the gap before the draft is saved.
        setJustUploadedUrl(signedUrl ?? path);
      } catch (error) {
        console.error('Failed to upload file. Please try again.');
      }
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await deleteConfirmation('Draft deleted successfully');
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

  const columns = useMemo<MRT_ColumnDef<any>[]>(() => [
    {
      accessorKey: 'expenseDate',
      header: 'Date',
      size: 150,
      enableColumnActions: false,
      Cell: ({ row }) => (
        <span>
          {dayjs(row.original.expenseDate).format('DD MMM YYYY')}{' '}
          <span style={{ color: '#94a3b8' }}>({dayjs(row.original.expenseDate).format('ddd')})</span>
        </span>
      ),
      Footer: () => <span style={{ fontWeight: 800, color: '#0f172a' }}>TOTAL</span>,
    },
    {
      accessorKey: 'clientTypeId',
      header: 'Company Type',
      size: 130,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{resolveClientType(row.original.clientTypeId)}</span>,
    },
    {
      accessorKey: 'clientCompanyId',
      header: 'Company Name',
      size: 180,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{resolveClientCompany(row.original.clientCompanyId)}</span>,
    },
    {
      accessorKey: 'projectId',
      header: 'Project Name',
      size: 200,
      enableColumnActions: false,
      Cell: ({ row }) => {
        return <span>{projectTitle(row.original, resolveProject)}</span>;
      },
    },
    {
      accessorKey: 'reimbursementType.type',
      header: 'Type',
      size: 140,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{row.original.reimbursementType?.type || 'N/A'}</span>,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      size: 110,
      enableColumnActions: false,
      Cell: ({ row }) => (
        // Colour alone is not a status — the chip carries the word too.
        <span className='d-inline-flex align-items-center gap-2'>
          <span className={`text-dark fw-bold fs-7 ${sensitive.cls}`}>{fmtAmount(row.original.amount)}</span>
          {row.original.isExceedingLimit && <OverLimitChip />}
        </span>
      ),
      Footer: () => <span className={`text-dark fw-bold fs-7 ${sensitive.cls}`}>{fmtAmount(totalAmount)}</span>,
    },
    {
      id: 'route',
      accessorFn: (row: any) => [row.fromLocation, row.toLocation].filter(Boolean).join(' → '),
      header: 'Route',
      size: 170,
      enableColumnActions: false,
      Cell: ({ row }) =>
        row.original.fromLocation || row.original.toLocation
          ? <span>{row.original.fromLocation || '?'} → {row.original.toLocation || '?'}</span>
          : <span>N/A</span>,
    },
    {
      accessorKey: 'description',
      header: 'Note',
      size: 150,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{row.original.description || 'N/A'}</span>,
    },
    {
      accessorKey: 'document',
      header: 'Document',
      size: 100,
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }) => (
        <button
          className='btn btn-icon btn-active-color-primary btn-sm w-[20px]'
          onClick={() => { if (row.original.document) setPreviewUrl(row.original.document); }}
          disabled={!row.original.document}
          aria-label={row.original.document ? 'Preview receipt' : 'No receipt attached'}
          title={row.original.document ? 'Preview document' : 'No document attached'}
        >
          {row.original.document
            ? <KTIcon iconName='eye' className='fs-3' />
            : <i className='bi bi-file-earmark-x fs-3 text-danger'></i>
          }
        </button>
      ),
    },
    {
      accessorKey: 'actions',
      header: 'Action',
      size: 130,
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }) => (
        <div className='flex items-center justify-center space-x-4'>
          <button
            className='btn btn-icon btn-active-color-primary btn-sm w-[20px]'
            onClick={() => handleEdit(row.original)}
            aria-label='Edit this expense'
            title='Edit'
          >
            <i className='bi bi-pencil fs-4 text-gray-500' />
          </button>
          <button
            className='btn btn-icon btn-active-color-primary btn-sm w-4'
            onClick={() => handleDelete(row.original.id)}
            aria-label='Delete this expense'
            title='Delete'
          >
            <i className='bi bi-trash3 fs-4 text-danger' />
          </button>
        </div>
      ),
    },
  ], [resolveClientType, resolveClientCompany, resolveProject, totalAmount, sensitive.cls]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Employee Details + reimbursement KPI cards */}
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
        overviewLoading={overviewLoading}
      />

      {periodSlot}

      {/* Action bar — only visible when inbox is shown.
          No `paddingRight` on the row: it pushed this row's right edge 1.25rem inside the
          period bar's above, so the buttons on the two rows could never line up. */}
      {(loading || drafts.length > 0) && (
        <div className='d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4'>
          <h2 className='mb-0'>Reimbursement Request Inbox</h2>
          <div className={TOOLBAR_ROW}>
            {hasPermission(
              resourceNameMapWithCamelCase.reimbursement,
              permissionConstToUseWithHasPermission.create
            ) && (
                // Same action, same emphasis as the one on the records bar below —
                // this is the one the user sees once drafts exist, and the two must
                // not disagree about how prominent "add a request" is.
                <Button
                  onClick={handleNew}
                  startIcon={<KTIcon iconName='plus' className='fs-3' />}
                  sx={lightToolbarButton('accent')}
                >
                  Add Reimbursement Request
                </Button>
              )}
            {drafts.length > 0 && (
              <Button
                onClick={handleSendForApproval}
                disabled={submitting}
                startIcon={
                  submitting
                    ? <span className='spinner-border spinner-border-sm' style={{ width: '1rem', height: '1rem', borderWidth: '0.15em' }} />
                    : <KTIcon iconName='send' className='fs-3' />
                }
                sx={lightToolbarButton('success', submitting)}
              >
                {submitting ? 'Submitting...' : 'Send for Approval'}
              </Button>
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
        <MaterialTable
          data={filteredDrafts}
          columns={columns}
          tableName='Pending Reimbursements'
          hideFilters={false}
          showColumnFooter={true}
          renderMobileCard={({ row }: any) => (
            <div
              onClick={() => handleEdit(row.original)}
              style={{
                padding: '12px', background: '#fff', border: `2px solid ${row.original?.isExceedingLimit ? '#ef4444' : '#f59e0b'}`,
                borderRadius: '8px', marginBottom: '8px', cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Date</div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{dayjs(row.original.expenseDate).format('DD MMM YYYY')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Amount</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }} className={sensitive.cls}>₹{fmtAmount(row.original.amount)}</div>
                </div>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '6px' }}>
                <strong>{row.original.reimbursementType?.type || 'N/A'}</strong>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: '1.3' }}>
                {row.original.clientTypeId && `${resolveClientType(row.original.clientTypeId)} • ${resolveClientCompany(row.original.clientCompanyId) || 'N/A'}`}
              </div>
            </div>
          )}
          muiTableProps={{
            muiTableBodyRowProps: ({ row }: any) => {
              if (row.original?.isExceedingLimit) {
                return {
                  sx: {
                    backgroundColor: 'rgba(239,68,68,0.08)',
                    '& td:first-of-type': { borderLeft: '4px solid #ef4444 !important' },
                    transition: 'background-color 0.12s ease',
                    '&:hover td': { backgroundColor: 'rgba(239,68,68,0.14) !important' },
                  },
                };
              }
              return {
                sx: {
                  backgroundColor: 'rgba(245,158,11,0.04)',
                  '& td:first-of-type': { borderLeft: '4px solid #f59e0b !important' },
                  transition: 'background-color 0.12s ease',
                  '&:hover td': { backgroundColor: 'rgba(245,158,11,0.08) !important' },
                },
              };
            },
          }}
        />
      )}

      {/* In-app document preview modal */}
      {previewUrl && (
        <DocumentPreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}

      {/* Add / Edit modal — structure identical to Reimbursement.tsx */}
      <Modal show={show} onHide={handleClose} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editMode ? 'Edit' : 'New'} Reimbursement Request
            {currentPeriod && !editMode && (
              <span style={{ fontSize: '0.8rem', fontWeight: 400, marginLeft: '0.5rem', color: '#666' }}>
                — {currentPeriod.format('MMMM YYYY')}
              </span>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Formik
            initialValues={{
              ...makeReimbursementInitialState(),
              expenseDate: editMode && currentReimbursement?.expenseDate
                ? dayjs(currentReimbursement.expenseDate).format('YYYY-MM-DD')
                : (currentPeriod
                    ? (currentPeriod.isSame(dayjs(), 'month')
                        ? dayjs().format('YYYY-MM-DD')
                        : currentPeriod.startOf('month').format('YYYY-MM-DD'))
                    : dayjs().format('YYYY-MM-DD')),
              ...(editMode &&
                currentReimbursement && {
                ...currentReimbursement,
                clientTypeId: currentReimbursement?.clientTypeId ?? '',
                clientCompanyId: currentReimbursement?.clientCompanyId ?? '',
                projectId: currentReimbursement?.projectId ?? '',
                fromLocation: currentReimbursement?.fromLocation ?? '',
                toLocation: currentReimbursement?.toLocation ?? '',
                description: currentReimbursement?.description ?? '',
                document: currentReimbursement?.document ?? '',
              }),
            }}
            enableReinitialize={true}
            onSubmit={handleSubmit}
            // The schema now depends on the chosen category: From/To are required for travel
            // and not collected at all for meals, instead of being demanded everywhere and
            // filled with junk to get past them.
            validationSchema={getReimbursementSchema({
              isEditing: !!currentReimbursement,
              category: selectedReimbursementFor,
            })}
          >
            {(formikProps) => (
              <Form className='d-flex flex-column' noValidate id='pending_reimbursement_form'>

                {/* Row 1: Date */}
                <div className='row gx-2 gx-lg-3'>
                  <div className='col-12 col-lg-6 mb-5 mb-lg-7'>
                    <DateInput
                      isRequired={currentReimbursement ? false : true}
                      inputLabel='Select Date'
                      formikProps={formikProps}
                      formikField='expenseDate'
                      placeHolder='Select Date'
                      // Phase 1: Constrain to batch period (one month).
                      // If viewing a specific month, only allow dates in that month.
                      maxDate={currentPeriod ? currentPeriod.endOf('month') : true}
                      minDate={currentPeriod ? currentPeriod.startOf('month') : dayjs().startOf('month')}
                    />
                  </div>
                </div>



                {/* Row 2: Company Type + Company Name */}
                <div className='row gx-2 gx-lg-3'>
                  <div className='col-12 col-lg-6 mb-5 mb-lg-7'>
                    <DropDownInput
                      isRequired={true}
                      formikField='clientTypeId'
                      inputLabel='Company Type'
                      placeholder='Select Company Type'
                      options={companyTypeOptions}
                      onChange={(option: any) => handleClientTypeChange(option, formikProps.setFieldValue)}
                      value={selectedClientType}
                    />
                  </div>
                  <div className='col-12 col-lg-6 mb-5 mb-lg-7'>
                    <DropDownInput
                      isRequired={false}
                      formikField='clientCompanyId'
                      inputLabel='Company Name'
                      placeholder={
                        !formikProps.values.clientTypeId
                          ? 'Select Company Type First'
                          : filteredCompanies.length === 0
                            ? 'No clients for this type'
                            : 'Select Company Name'
                      }
                      options={[...filteredCompanies]
                        .sort((a: any, b: any) => a.companyName.localeCompare(b.companyName))
                        .map((c: any) => ({ value: c.id, label: c.companyName }))}
                      disabled={!formikProps.values.clientTypeId}
                      onChange={(option: any) => handleClientCompanyChange(option, formikProps.setFieldValue)}
                      value={selectedClientCompany}
                    />
                  </div>
                </div>

                {/* Row 3: Project status filter + Project */}
                <div className='row gx-2 gx-lg-3'>
                  <div className='col-12 col-lg-4 mb-5 mb-lg-7'>
                    {/* Filter only — deliberately no formikField, so it never reaches the
                        saved record. It narrows the picker beside it. */}
                    <DropDownInput
                      isRequired={false}
                      formikField=''
                      inputLabel='Project Status'
                      placeholder={
                        projectsLoading
                          ? 'Loading...'
                          : projectStatusOptions.length === 0
                            ? 'No statuses'
                            : 'All Statuses'
                      }
                      options={projectStatusOptions}
                      disabled={projectsLoading || projectStatusOptions.length === 0}
                      onChange={(option: any) => handleProjectStatusChange(option)}
                      value={selectedProjectStatus}
                    />
                  </div>
                  <div className='col-12 col-lg-8 mb-5 mb-lg-7'>
                    <DropDownInput
                      isRequired={false}
                      formikField='projectId'
                      inputLabel='Choose Project Name'
                      placeholder={
                        projectsLoading
                          ? 'Loading Projects...'
                          : projectOptions.length === 0
                            ? 'No Ongoing Projects Found'
                            : 'Search Project'
                      }
                      options={projectOptions}
                      disabled={projectsLoading}
                      onChange={(option: any) => handleProjectChange(option, formikProps.setFieldValue)}
                      value={selectedProject}
                      disableAlphabeticalSort={true}
                    />
                  </div>
                </div>

                {/* Row 4: Reimbursement For + Amount */}
                <div className='row gx-2 gx-lg-3'>
                  <div className='col-12 col-lg-6 mb-5 mb-lg-7'>
                    <ReimbursementDropdown
                      isRequired={true}
                      handleChange={(option: any) => handleCategoryChange(option, formikProps.setFieldValue)}
                      formikField='reimbursementTypeId'
                      inputLabel='Reimbursement For'
                      options={reimbursementOptions}
                      value={selectedReimbursementFor}
                    />
                  </div>
                  <div className='col-12 col-lg-6'>
                    <TextInput
                      isRequired={true}
                      label='Enter Amount'
                      margin='mb-5 mb-lg-7'
                      formikField='amount'
                      inputValidation='decimal'
                    />
                    {/* The cap, as the amount is typed. `isExceedingLimit` is computed once at
                        create and surfaced days later as a red row an approver finds — by then
                        the only person who could have acted on it is long gone. */}
                    {(() => {
                      const breach = describeLimitBreach(formikProps.values.amount, {
                        perRequest: perRequestLimit,
                        category: selectedReimbursementFor?.amountLimit,
                        categoryName: selectedReimbursementFor?.label,
                      });
                      if (!breach) return null;
                      return (
                        <div style={{
                          marginTop: -18, marginBottom: 18,
                          fontSize: '0.78rem', fontWeight: 600, color: '#b45309',
                        }}>
                          {breach} — it can still be submitted, but expect a question.
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Advisory duplicate check. Two cab rides on one day are a real thing, so this
                    warns and never blocks — matched against the drafts already on screen rather
                    than a new endpoint, because those are what the user is filing against. */}
                {(() => {
                  const dupe = findDuplicateCandidate(drafts, {
                    expenseDate: formikProps.values.expenseDate,
                    amount: formikProps.values.amount,
                    reimbursementTypeId: formikProps.values.reimbursementTypeId,
                  }, currentReimbursement?.id);
                  if (!dupe) return null;
                  return (
                    <div className='row'>
                      <div className='col-lg-12 mb-7'>
                        <div style={{
                          padding: '10px 14px', borderRadius: 10,
                          background: '#fffbeb', border: '1px solid #fde68a',
                          color: '#92400e', fontSize: '0.82rem', fontWeight: 600,
                        }}>
                          You already have a ₹{fmtAmount(dupe.amount ?? 0)} expense in this category on{' '}
                          {dayjs(formikProps.values.expenseDate).format('DD MMM')}. Submit anyway if this is a separate claim.
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* From/To render only for categories that involve travelling between two
                    places. They used to be required on every category, including meals and
                    accommodation, so people typed junk to get past them. */}
                {categoryRequiresLocation(selectedReimbursementFor) && (
                <div className='row gx-2 gx-lg-3'>
                  <div className='col-12 col-lg-6'>
                    <label className='form-label fw-bold'>From Location <span className='text-danger'>*</span></label>
                    <input
                      type='text'
                      className={`form-control form-control-lg form-control-solid${formikProps.touched.fromLocation && formikProps.errors.fromLocation ? ' is-invalid' : ''}`}
                      placeholder='From Location'
                      {...formikProps.getFieldProps('fromLocation')}
                    />
                    {formikProps.touched.fromLocation && formikProps.errors.fromLocation && (
                      <div className='fv-plugins-message-container'>
                        <div className='fv-help-block'>{String(formikProps.errors.fromLocation)}</div>
                      </div>
                    )}
                  </div>
                  <div className='col-12 col-lg-6 mb-5 mb-lg-7'>
                    <label className='form-label fw-bold'>To Location <span className='text-danger'>*</span></label>
                    <input
                      type='text'
                      className={`form-control form-control-lg form-control-solid${formikProps.touched.toLocation && formikProps.errors.toLocation ? ' is-invalid' : ''}`}
                      placeholder='To Location'
                      {...formikProps.getFieldProps('toLocation')}
                    />
                    {formikProps.touched.toLocation && formikProps.errors.toLocation && (
                      <div className='fv-plugins-message-container'>
                        <div className='fv-help-block'>{String(formikProps.errors.toLocation)}</div>
                      </div>
                    )}
                  </div>
                </div>
                )}
                {/* Row 6: Document Upload */}
                <div className='row mb-5 mb-lg-7'>
                  <div className='col-12'>
                    <label className='mb-2 fw-bold'>Upload Reimbursement Bill</label>

                    {/* Hidden real file input */}
                    <input
                      ref={fileInputRef}
                      type='file'
                      // Opens the camera directly on a phone instead of a file browser — a receipt is
                      // something you photograph, not something you already have on disk.
                      capture='environment'
                      accept='image/*,application/pdf'
                      className='d-none'
                      onChange={(event) => uploadFile(event, formikProps, 5 * 1024 * 1024)}
                    />

                    <div className='d-flex align-items-center gap-2'>
                      {/* Custom file control */}
                      <div
                        className='d-flex align-items-center p-0 overflow-hidden'
                        style={{
                          flex: 1,
                          minWidth: 0,
                          height: '46px',
                          borderRadius: '0.475rem',
                          border: '1px solid #e4e6ef',
                          backgroundColor: '#f5f8fa',
                        }}
                      >
                        {/* Choose File button */}
                        <button
                          type='button'
                          onClick={() => fileInputRef.current?.click()}
                          className='d-flex align-items-center gap-1 flex-shrink-0 h-100 px-3 border-0 fs-7 fw-semibold'
                          style={{
                            backgroundColor: '#e9ecef',
                            color: '#5e6278',
                            borderRight: '1px solid #dee2e6',
                            borderRadius: '0.425rem 0 0 0.425rem',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                          }}
                        >
                          <KTIcon iconName='paper-clip' className='fs-5' />
                          Choose File
                        </button>

                        {/* Filename / placeholder */}
                        <div className='d-flex align-items-center gap-2 px-3 overflow-hidden flex-grow-1'>
                          {formikProps.values.document ? (
                            <>
                              <KTIcon iconName='document' className='fs-5 text-danger flex-shrink-0' />
                              <span className='text-truncate fs-7' style={{ color: '#5e6278' }}>
                                {String(formikProps.values.document).split('/').pop() ?? 'document'}
                              </span>
                            </>
                          ) : (
                            <span className='fs-7' style={{ color: '#a1a5b7' }}>No file chosen</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons — appear only when a document is attached */}
                      {formikProps.values.document && (
                        <>
                          <button
                            type='button'
                            className='btn btn-icon btn-light btn-active-light-primary btn-sm flex-shrink-0'
                            aria-label='Preview document' title='Preview document'
                            onClick={() => setPreviewUrl(justUploadedUrl ?? String(formikProps.values.document))}
                          >
                            <KTIcon iconName='eye' className='fs-3' />
                          </button>
                          <button
                            type='button'
                            className='btn btn-icon btn-light btn-active-light-primary btn-sm flex-shrink-0'
                            aria-label='Remove document' title='Remove document'
                            onClick={() => {
                              formikProps.setFieldValue('document', '');
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                          >
                            <i className='bi bi-trash3 fs-3 text-danger' />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 7: Remark */}
                <div className='row'>
                  <div className='col-12'>
                    <TextInput
                      label='Remark'
                      margin='mb-5 mb-lg-7'
                      formikField='description'
                      isRequired={false}
                    />
                  </div>
                </div>

                {/* Submit */}
                <div className='d-flex justify-content-end gap-2 mt-5 flex-wrap'>
                  <button
                    type='submit'
                    className='btn btn-primary'
                    disabled={formLoading || !formikProps.isValid || formikProps.isSubmitting}
                  >
                    {!formLoading && (editMode ? 'Save Changes' : 'Save to Pending Requests')}
                    {formLoading && (
                      <span className='indicator-progress' style={{ display: 'block' }}>
                        Please wait...{' '}
                        <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                      </span>
                    )}
                  </button>
                </div>

              </Form>
            )}
          </Formik>
        </Modal.Body>
      </Modal>
    </>
  );
});

export default PendingReimbursementsPage;
