import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { fetchAllReimbursementTypesFromDb } from '@utils/statistics';
import { getAllCompanyTypes, getAllClientCompanies } from '@services/companies';
import { getProjectsByCompanyId, getAllProjectStatuses } from '@services/projects';
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

const BACKEND = import.meta.env.VITE_APP_WISE_TECH_BACKEND as string;

// ── Validation schema (mirrors Reimbursement.tsx exactly) ─────────────────────

const getReimbursementSchema = (currentReimbursement: any) => {
  return Yup.object({
    expenseDate: currentReimbursement
      ? Yup.string().label('Date')
      : Yup.string().required().label('Date'),
    clientTypeId: Yup.string().label('Client Type'),
    clientCompanyId: Yup.string().label('Client Name'),
    projectId: Yup.string().label('Project'),
    reimbursementTypeId: currentReimbursement
      ? Yup.string().label('Reimbursement For')
      : Yup.string().required().label('Reimbursement For'),
    amount: currentReimbursement
      ? Yup.number().required().label('Amount').min(1, 'Amount must be greater than 0').max(1000000, 'Amount must be less than 10,00,000')
      : Yup.number().required().label('Amount').min(1, 'Amount must be greater than 0').max(1000000, 'Amount must be less than 10,00,000'),
    description: currentReimbursement
      ? Yup.string().label('Note')
      : Yup.string().required().label('Note'),
    document: Yup.string().label('Reference Document'),
    fromLocation: Yup.string().matches(/^[a-zA-Z\s]*$/, 'From Location must contain only alphabets').label('From Location'),
    toLocation: Yup.string().matches(/^[a-zA-Z\s]*$/, 'To Location must contain only alphabets').label('To Location'),
  });
};

// Module-level mutable initial state — reset in handleNew exactly like Reimbursement.tsx
let initialState = {
  expenseDate: dayjs().format('YYYY-MM-DD'),
  clientTypeId: '',
  clientCompanyId: '',
  projectId: '',
  reimbursementTypeId: '',
  fromLocation: '',
  toLocation: '',
  amount: undefined as number | undefined,
  document: '',
  description: '',
};

// ── Document Preview Modal (identical to Monthly.tsx) ─────────────────────────

interface DocumentPreviewModalProps { url: string; onClose: () => void; }

function DocumentPreviewModal({ url, onClose }: DocumentPreviewModalProps) {
  const cleanUrl = url.split('?')[0].toLowerCase();
  const isImage = /\.(png|jpe?g|gif|webp|svg|bmp)$/.test(cleanUrl);
  const isPdf = cleanUrl.endsWith('.pdf');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const modalContent = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={onClose} role='dialog' aria-modal='true' aria-label='Document preview'
    >
      <div
        className='d-flex flex-column bg-white rounded shadow overflow-hidden'
        style={{ width: 'min(75vw, 900px)', height: 'min(78vh, 710px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='d-flex align-items-center justify-content-between px-4 py-3 border-bottom bg-light flex-shrink-0'>
          <div className='d-flex align-items-center gap-2 text-gray-700 fw-semibold fs-7 text-truncate'>
            <KTIcon iconName='document' className='fs-4 text-primary' />
            <span className='text-truncate' style={{ maxWidth: 560 }}>
              {url.split('/').pop()?.split('?')[0] ?? 'Document'}
            </span>
          </div>
          <div className='d-flex align-items-center gap-2 flex-shrink-0'>
            <a href={url} target='_blank' rel='noopener noreferrer'
              className='btn btn-sm btn-light btn-active-light-primary d-flex align-items-center gap-1' title='Open in new tab'>
              <KTIcon iconName='exit-right-corner' className='fs-5' />
              <span className='d-none d-sm-inline'>Open in tab</span>
            </a>
            <button className='btn btn-sm btn-icon btn-light btn-active-light-danger' onClick={onClose} title='Close preview (Esc)'>
              <KTIcon iconName='cross' className='fs-2' />
            </button>
          </div>
        </div>
        <div className='flex-grow-1 overflow-hidden bg-light d-flex align-items-center justify-content-center' style={{ minHeight: 0 }}>
          {isImage ? (
            <img src={url} alt='Document preview' style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '1rem', userSelect: 'none' }} />
          ) : isPdf ? (
            <iframe src={url} title='PDF preview' style={{ width: '100%', height: '100%', border: 'none' }} allow='fullscreen' />
          ) : (
            <div className='d-flex flex-column align-items-center gap-3 p-5 text-center w-100 h-100'>
              <iframe src={url} title='Document preview' style={{ width: '100%', flex: 1, border: 'none', borderRadius: 8, minHeight: 0 }} allow='fullscreen' />
              <p className='text-muted fs-7 mb-0'>
                If the document does not display,{' '}
                <a href={url} target='_blank' rel='noopener noreferrer' className='text-primary'>open it in a new tab</a>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtAmount(n: number | string) {
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function fmtAmountRounded(n: number) {
  return Math.round(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ── KPI icons ──────────────────────────────────────────────────────────────────

const KpiIconRequests = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="8" y1="17" x2="12" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const KpiIconAmount = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="15" r="1.5" fill="currentColor"/>
  </svg>
);

const KpiIconApproved = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const KpiIconApprovedAmount = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
    <path d="M9 15l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const KpiIconPending = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const KpiIconPendingAmount = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
    <polyline points="14 14 14 12 12 12 12 16 14 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const KpiIconRejected = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const KpiIconRejectedAmount = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
    <line x1="10" y1="13.5" x2="14" y2="17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="14" y1="13.5" x2="10" y2="17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// ── Compact KPI card (salary-module style) ─────────────────────────────────────

interface ReimbKpiCardProps {
  label: string;
  value: string | number;
  accent: string;
  iconBg: string;
  iconBorder: string;
  icon: React.ReactNode;
  loading: boolean;
}

function ReimbKpiCard({ label, value, accent, iconBg, iconBorder, icon, loading }: ReimbKpiCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        height: { xs: 76, md: 80 },
        p: { xs: '12px 13px', md: '13px 14px' },
        borderRadius: '16px',
        background: 'linear-gradient(180deg, #ffffff 0%, #fcfdff 100%)',
        border: '1px solid #e9eef5',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 16px rgba(15, 23, 42, 0.035)',
        transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        alignItems: 'stretch',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04), 0 14px 22px rgba(15, 23, 42, 0.055)',
          borderColor: iconBorder,
        },
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1.5} sx={{ width: '100%', minWidth: 0 }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            flex: '0 0 38px',
            borderRadius: '11px',
            display: 'grid',
            placeItems: 'center',
            color: accent,
            backgroundColor: iconBg,
            border: `1px solid ${iconBorder}`,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              color: '#64748b',
              fontWeight: 700,
              fontSize: '0.72rem',
              lineHeight: 1.2,
              mb: 0.35,
              letterSpacing: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {label}
          </Typography>
          {loading
            ? <Skeleton width={60} height={22} />
            : (
              <Typography
                sx={{
                  color: '#0f172a',
                  fontSize: { xs: '0.9rem', md: '0.96rem' },
                  fontWeight: 800,
                  lineHeight: 1.25,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  minHeight: '38px',
                }}
              >
                {value}
              </Typography>
            )
          }
        </Box>
      </Stack>
    </Paper>
  );
}

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
        <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 1.25 }}>
          {Array.from({ length: 8 }).map((_, i) => (
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
  overviewLoading,
  employee: employeeProp,
}: EmployeeDetailsSectionProps) {
  const currentEmployee = useSelector((state: RootState) => state.employee.currentEmployee);
  const employee = employeeProp !== undefined ? employeeProp : currentEmployee;

  // Row 1 — counts; Row 2 — amounts (4 × 2 grid at xl)
  const kpiCards: ReimbKpiCardProps[] = [
    { label: 'Total Requests',          value: totalRequests,                                accent: '#7c3aed', iconBg: '#f5f3ff', iconBorder: '#ede9fe', icon: <KpiIconRequests />,        loading: overviewLoading },
    { label: 'Total Request Approved',  value: approvedRequests,                             accent: '#16a34a', iconBg: '#f0fdf4', iconBorder: '#dcfce7', icon: <KpiIconApproved />,        loading: overviewLoading },
    { label: 'Total Request Pending',   value: pendingRequests,                              accent: '#d97706', iconBg: '#fffbeb', iconBorder: '#fef3c7', icon: <KpiIconPending />,         loading: overviewLoading },
    { label: 'Total Request Rejected',  value: rejectedRequests,                             accent: '#dc2626', iconBg: '#fef2f2', iconBorder: '#fecaca', icon: <KpiIconRejected />,        loading: overviewLoading },
    { label: 'Total Requested Amount',  value: `₹${fmtAmountRounded(totalRequestedAmount)}`, accent: '#2563eb', iconBg: '#eff6ff', iconBorder: '#dbeafe', icon: <KpiIconAmount />,          loading: overviewLoading },
    { label: 'Total Approved Amount',   value: `₹${fmtAmountRounded(approvedAmount)}`,       accent: '#0891b2', iconBg: '#ecfeff', iconBorder: '#cffafe', icon: <KpiIconApprovedAmount />,  loading: overviewLoading },
    { label: 'Total Pending Amount',    value: `₹${fmtAmountRounded(pendingAmount)}`,        accent: '#ea580c', iconBg: '#fff7ed', iconBorder: '#ffedd5', icon: <KpiIconPendingAmount />,   loading: overviewLoading },
    { label: 'Total Rejected Amount',   value: `₹${fmtAmountRounded(rejectedAmount)}`,       accent: '#e11d48', iconBg: '#fff1f2', iconBorder: '#ffe4e6', icon: <KpiIconRejectedAmount />,  loading: overviewLoading },
  ];

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Typography className="font-barlow" sx={{ color: '#0f172a', fontSize: { xs: 20, md: 22 }, fontWeight: 800, lineHeight: 1.2, mb: 1.25 }}>
        Employee Details
      </Typography>

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
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' },
                gap: 1.25,
                gridAutoRows: { xs: '76px', md: '80px' },
                alignContent: 'start',
                alignItems: 'stretch',
              }}
            >
              {kpiCards.map((card) => (
                <ReimbKpiCard key={card.label} {...card} />
              ))}
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

function PendingReimbursementsPage({
  totalRequests = 0,
  totalRequestedAmount = 0,
  approvedRequests = 0,
  rejectedRequests = 0,
  pendingRequests = 0,
  approvedAmount = 0,
  pendingAmount = 0,
  rejectedAmount = 0,
  overviewLoading = false,
}: Partial<EmployeeDetailsSectionProps>) {
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
  const userId = useSelector((state: RootState) => state.auth.currentUser.id);

  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal state — same variable names as Reimbursement.tsx
  const [show, setShow] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentReimbursement, setCurrentReimbursement] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Document preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Dropdown option lists — same names as Reimbursement.tsx
  const [reimbursementOptions, setReimbursementOptions] = useState<any[]>([]);
  const [companyTypeOptions, setCompanyTypeOptions] = useState<Option[]>([]);
  const [allClientCompanies, setAllClientCompanies] = useState<any[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<any[]>([]);
  const [projectOptions, setProjectOptions] = useState<Option[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedReimbursementFor, setSelectedReimbursementFor] = useState<Option | null>(null);
  const [selectedClientType, setSelectedClientType] = useState<Option | null>(null);
  const [selectedClientCompany, setSelectedClientCompany] = useState<Option | null>(null);
  const [selectedProject, setSelectedProject] = useState<Option | null>(null);
  const [ongoingStatusIds, setOngoingStatusIds] = useState<string[]>([]);

  // Table lookup resolvers
  const { resolveClientType, resolveClientCompany, resolveProject } = useReimbursementLookups(drafts);

  // ── Load drafts ────────────────────────────────────────────────────────────

  const loadDrafts = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const res = await fetchPendingReimbursementDrafts(employeeId);
      setDrafts(res?.data?.drafts || res?.drafts || []);
    } catch {
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  // ── Load dropdown data — separated exactly like Reimbursement.tsx ──────────
  // Reimbursement types use fetchAllReimbursementTypesFromDb (the working utility),
  // loaded independently so a failure here doesn't block company type loading.

  const fetchAllReimbursementsTypesData = async () => {
    const reimbursementResponse = await fetchAllReimbursementTypesFromDb();
    const opts = reimbursementResponse.map((r: any) => ({
      value: r.id,
      label: r.type,
      icon: r.icon,
    })).sort((a: any, b: any) => a.label.localeCompare(b.label));
    setReimbursementOptions(opts);
  };

  const loadClientTypeAndCompanyData = async () => {
    try {
      const [typesRes, companiesRes, statusesRes] = await Promise.all([
        getAllCompanyTypes(),
        getAllClientCompanies(),
        getAllProjectStatuses(),
      ]);
      const types = (typesRes.companyTypes || []).map((ct: any) => ({
        value: ct.id,
        label: ct.name,
      })).sort((a: Option, b: Option) => a.label.localeCompare(b.label));
      setCompanyTypeOptions(types);

      const companies =
        companiesRes?.data?.companies ||
        companiesRes?.clientCompanies ||
        companiesRes?.data?.clientCompanies ||
        companiesRes?.companies ||
        [];
      setAllClientCompanies(companies);

      const allStatuses: any[] = statusesRes?.projectStatuses || [];
      const ids = allStatuses
        .filter((s: any) => s.name?.trim().toLowerCase() === 'on ongoing')
        .map((s: any) => s.id);
      setOngoingStatusIds(ids);
    } catch (err) {
      console.error('Failed to load client data', err);
    }
  };

  useEffect(() => {
    fetchAllReimbursementsTypesData();
    loadClientTypeAndCompanyData();
  }, []);

  // ── Reactive edit-mode restoration (identical to Reimbursement.tsx) ────────
  // Runs whenever editMode, currentReimbursement, or any loaded array changes.

  useEffect(() => {
    if (!editMode || !currentReimbursement) return;
    if (companyTypeOptions.length === 0 || allClientCompanies.length === 0) return;

    const rec = currentReimbursement;

    // 1. Reimbursement For — preserve full option object so icon renders correctly
    if (rec.reimbursementTypeId && reimbursementOptions.length > 0) {
      const match = reimbursementOptions.find((o: any) => o.value === rec.reimbursementTypeId);
      if (match) {
        setSelectedReimbursementFor({ value: match.value, label: match.label, ...(match.icon && { icon: match.icon }) } as any);
      }
    }

    // 2. Client Type
    if (rec.clientTypeId) {
      const ctMatch = companyTypeOptions.find((c) => c.value === rec.clientTypeId);
      if (ctMatch) setSelectedClientType({ value: ctMatch.value, label: ctMatch.label });

      const filtered = allClientCompanies.filter((c: any) => c.companyTypeId === rec.clientTypeId);
      setFilteredCompanies([...filtered].sort((a: any, b: any) => a.companyName.localeCompare(b.companyName)));

      // 3. Client Name
      if (rec.clientCompanyId) {
        const ccMatch = allClientCompanies.find((c: any) => c.id === rec.clientCompanyId);
        if (ccMatch) setSelectedClientCompany({ value: ccMatch.id, label: ccMatch.companyName });
      }
    }
  }, [editMode, currentReimbursement, companyTypeOptions, allClientCompanies, reimbursementOptions]);

  // ── Reactive project restoration ───────────────────────────────────────────

  useEffect(() => {
    if (!editMode || !currentReimbursement?.clientCompanyId) return;

    getProjectsByCompanyId(
      currentReimbursement.clientCompanyId,
      { ongoingStatusIds, includeProjectId: currentReimbursement.projectId || undefined }
    )
      .then((res: any) => {
        const projects = res?.projects || res?.data?.projects || [];
        const opts: Option[] = projects
          .map((p: any) => ({ value: p.id, label: p.title }))
          .sort((a: Option, b: Option) => a.label.localeCompare(b.label));
        setProjectOptions(opts);
        if (currentReimbursement.projectId) {
          const projMatch = opts.find((o) => o.value === currentReimbursement.projectId);
          setSelectedProject(projMatch || null);
        }
      })
      .catch(() => setProjectOptions([]));
  }, [editMode, currentReimbursement?.clientCompanyId, currentReimbursement?.projectId, ongoingStatusIds]);

  // ── Handlers — identical flow to Reimbursement.tsx ────────────────────────

  const handleNew = () => {
    setSelectedReimbursementFor(null);
    setSelectedClientType(null);
    setSelectedClientCompany(null);
    setSelectedProject(null);
    setFilteredCompanies([]);
    setProjectOptions([]);

    initialState = {
      expenseDate: dayjs().format('YYYY-MM-DD'),
      clientTypeId: '',
      clientCompanyId: '',
      projectId: '',
      reimbursementTypeId: '',
      fromLocation: '',
      toLocation: '',
      amount: undefined,
      document: '',
      description: '',
    };

    setShow(true);
    setEditMode(false);
    setCurrentReimbursement(null);
  };

  const handleEdit = (draft: any) => {
    setSelectedReimbursementFor(null);
    setSelectedClientType(null);
    setSelectedClientCompany(null);
    setSelectedProject(null);
    setFilteredCompanies([]);
    setProjectOptions([]);

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

        const filteredValues = Object.fromEntries(
          Object.entries(values).filter(([key, value]) => key === 'amount' || value !== '')
        );

        await updatePendingReimbursementDraft(currentReimbursement.id, filteredValues);
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

      // Keep modal open — clear only per-entry fields so Date, Client Type,
      // Client Name, and Project Name stay populated for the next entry.
      actions.setFieldValue('reimbursementTypeId', '');
      actions.setFieldValue('amount', undefined);
      actions.setFieldValue('fromLocation', '');
      actions.setFieldValue('toLocation', '');
      actions.setFieldValue('document', '');
      actions.setFieldValue('description', '');
      actions.setTouched({});
      actions.setSubmitting(false);
      setSelectedReimbursementFor(null);
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

  const handleClientTypeChange = (option: any, setFieldValue: (f: string, v: any) => void) => {
    setSelectedClientType(option);
    setFieldValue('clientTypeId', option?.value || '');
    setSelectedClientCompany(null);
    setFieldValue('clientCompanyId', '');
    setSelectedProject(null);
    setFieldValue('projectId', '');
    setProjectOptions([]);
    if (option?.value) {
      const filtered = allClientCompanies.filter((c: any) => c.companyTypeId === option.value);
      setFilteredCompanies([...filtered].sort((a: any, b: any) => a.companyName.localeCompare(b.companyName)));
    } else {
      setFilteredCompanies([]);
    }
  };

  const handleClientCompanyChange = async (option: any, setFieldValue: (f: string, v: any) => void) => {
    setSelectedClientCompany(option);
    setFieldValue('clientCompanyId', option?.value || '');
    setSelectedProject(null);
    setFieldValue('projectId', '');
    setProjectOptions([]);
    if (option?.value) {
      setProjectsLoading(true);
      try {
        const res = await getProjectsByCompanyId(option.value, { ongoingStatusIds });
        const projects = res?.projects || res?.data?.projects || [];
        setProjectOptions(
          projects.map((p: any) => ({ value: p.id, label: p.title }))
            .sort((a: Option, b: Option) => a.label.localeCompare(b.label))
        );
      } catch {
        setProjectOptions([]);
      } finally {
        setProjectsLoading(false);
      }
    }
  };

  const uploadFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
    formikProps: any,
    fileMaxUploadSize: number
  ) => {
    const { target: { files } } = event;
    if (files && files[0].size > fileMaxUploadSize) {
      alert('File size should not exceed 5 MB');
      event.target.value = '';
      return;
    }
    if (files && files.length > 0) {
      const form = new FormData();
      form.append('file', files[0]);
      try {
        const { data: { path } } = await uploadUserAsset(form, userId, undefined, 'reimbursement-docs');
        formikProps.setFieldValue('document', path, true);
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
      successConfirmation(
        `Batch submitted! Submission ID: ${res?.data?.submissionId || res?.submissionId || ''}`,
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

  const totalAmount = useMemo(
    () => drafts.reduce((sum, d) => sum + Number(d.amount || 0), 0),
    [drafts]
  );

  const columns = useMemo<MRT_ColumnDef<any>[]>(() => [
    {
      accessorKey: 'expenseDate',
      header: 'Date',
      size: 120,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{dayjs(row.original.expenseDate).format('DD MMM YYYY')}</span>,
      Footer: () => <span style={{ fontWeight: 800, color: '#0f172a' }}>TOTAL</span>,
    },
    {
      accessorKey: 'day',
      header: 'Day',
      size: 110,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{dayjs(row.original.expenseDate).format('dddd')}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Note',
      size: 150,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{row.original.description || '—'}</span>,
    },
    {
      accessorKey: 'reimbursementType.type',
      header: 'Type',
      size: 140,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{row.original.reimbursementType?.type || '—'}</span>,
    },
    {
      accessorKey: 'clientTypeId',
      header: 'Client Type',
      size: 130,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{resolveClientType(row.original.clientTypeId)}</span>,
    },
    {
      accessorKey: 'clientCompanyId',
      header: 'Client Name',
      size: 180,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{resolveClientCompany(row.original.clientCompanyId)}</span>,
    },
    {
      accessorKey: 'projectId',
      header: 'Project Name',
      size: 200,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{resolveProject(row.original.projectId)}</span>,
    },
    {
      accessorKey: 'fromLocation',
      header: 'From Location',
      size: 130,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{row.original.fromLocation || 'NA'}</span>,
    },
    {
      accessorKey: 'toLocation',
      header: 'To Location',
      size: 130,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{row.original.toLocation || 'NA'}</span>,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      size: 110,
      enableColumnActions: false,
      Cell: ({ row }) => (
        <span className={row.original.isExceedingLimit ? 'fw-bold fs-7' : 'text-dark fw-bold fs-7'}
          style={row.original.isExceedingLimit ? { color: '#ef4444' } : undefined}>
          {fmtAmount(row.original.amount)}
        </span>
      ),
      Footer: () => <span className='text-dark fw-bold fs-7'>{fmtAmount(totalAmount)}</span>,
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
      header: 'Actions',
      size: 130,
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }) => (
        <div className='flex items-center justify-center space-x-4'>
          <button
            className='btn btn-icon btn-active-color-primary btn-sm w-[20px]'
            onClick={() => handleEdit(row.original)}
            title='Edit'
          >
            <KTIcon iconName='pencil' className='inline fs-4 text-red-500' />
          </button>
          <button
            className='btn btn-icon btn-active-color-primary btn-sm w-4'
            onClick={() => handleDelete(row.original.id)}
            title='Delete'
          >
            <KTIcon iconName='trash' className='inline fs-4 text-red-500' />
          </button>
        </div>
      ),
    },
  ], [resolveClientType, resolveClientCompany, resolveProject, totalAmount]);

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
        overviewLoading={overviewLoading}
      />

      {/* Action bar */}
      <div className='d-flex justify-content-between align-items-center mb-4' style={{ paddingRight: '1.25rem' }}>
        <h2 className='mb-0'>Reimbursement Request Inbox</h2>
        <div className='d-flex gap-3'>
          {hasPermission(
            resourceNameMapWithCamelCase.reimbursement,
            permissionConstToUseWithHasPermission.create
          ) && (
            <button
              className='d-flex justify-content-between align-items-center bg-primary btn btn-lg btn-primary fs-5 w-auto'
              onClick={handleNew}
            >
              <div>Add Reimbursement Request</div>
            </button>
          )}
          {drafts.length > 0 && (
            <button
              className='btn btn-lg d-flex align-items-center gap-2'
              style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', color: '#fff' }}
              onClick={handleSendForApproval}
              disabled={submitting}
            >
              {submitting
                ? <span className='spinner-border spinner-border-sm me-2' />
                : <KTIcon iconName='send' className='fs-4 text-white' />
              }
              {submitting ? 'Submitting...' : 'Send for Approval'}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <MaterialTable
        data={drafts}
        columns={columns}
        tableName='Pending Reimbursements'
        hideFilters={false}
        showColumnFooter={true}
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

      {/* In-app document preview modal */}
      {previewUrl && (
        <DocumentPreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}

      {/* Add / Edit modal — structure identical to Reimbursement.tsx */}
      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editMode ? 'Edit' : 'New'} Reimbursement Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Formik
            initialValues={{
              ...initialState,
              ...(editMode &&
                currentReimbursement && {
                  ...currentReimbursement,
                  expenseDate: currentReimbursement.expenseDate
                    ? dayjs(currentReimbursement.expenseDate).format('YYYY-MM-DD')
                    : dayjs().format('YYYY-MM-DD'),
                  clientTypeId: currentReimbursement?.clientTypeId ?? '',
                  clientCompanyId: currentReimbursement?.clientCompanyId ?? '',
                  projectId: currentReimbursement?.projectId ?? '',
                  fromLocation: currentReimbursement?.fromLocation ?? '',
                  toLocation: currentReimbursement?.toLocation ?? '',
                  description: currentReimbursement?.description ?? '',
                  document: currentReimbursement?.document ?? '',
                }),
            }}
            onSubmit={handleSubmit}
            validationSchema={getReimbursementSchema(currentReimbursement)}
          >
            {(formikProps) => (
              <Form className='d-flex flex-column' noValidate id='pending_reimbursement_form'>

                {/* Row 1: Date */}
                <div className='row'>
                  <div className='col-lg-6 mb-7'>
                    <DateInput
                      isRequired={currentReimbursement ? false : true}
                      inputLabel='Select Date'
                      formikProps={formikProps}
                      formikField='expenseDate'
                      placeHolder='Select Date'
                      maxDate={true}
                    />
                  </div>
                </div>

                {/* Row 2: Client Type + Client Name */}
                <div className='row'>
                  <div className='col-lg-6 mb-7'>
                    <DropDownInput
                      isRequired={true}
                      formikField='clientTypeId'
                      inputLabel='Client Type'
                      placeholder='Select Client Type'
                      options={companyTypeOptions}
                      onChange={(option: any) => handleClientTypeChange(option, formikProps.setFieldValue)}
                      value={selectedClientType}
                    />
                  </div>
                  <div className='col-lg-6 mb-7'>
                    <DropDownInput
                      isRequired={false}
                      formikField='clientCompanyId'
                      inputLabel='Client Name'
                      placeholder={
                        !formikProps.values.clientTypeId
                          ? 'Select Client Type First'
                          : filteredCompanies.length === 0
                          ? 'No clients for this type'
                          : 'Select Client Name'
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

                {/* Row 3: Project */}
                <div className='row'>
                  <div className='col-lg mb-7'>
                    <DropDownInput
                      isRequired={false}
                      formikField='projectId'
                      inputLabel='Choose Project Name'
                      placeholder={
                        !formikProps.values.clientCompanyId
                          ? 'Select Client Type & Name First'
                          : projectsLoading
                          ? 'Loading Projects...'
                          : projectOptions.length === 0
                          ? 'No Ongoing Projects Found'
                          : 'Select Project'
                      }
                      options={projectOptions}
                      disabled={!formikProps.values.clientCompanyId || projectsLoading}
                      onChange={(option: any) => {
                        setSelectedProject(option);
                        formikProps.setFieldValue('projectId', option?.value || '');
                      }}
                      value={selectedProject}
                    />
                  </div>
                </div>

                {/* Row 4: Reimbursement For + Amount */}
                <div className='row'>
                  <div className='col-lg-6 mb-7'>
                    <ReimbursementDropdown
                      isRequired={true}
                      handleChange={(option: any) => {
                        handleChange(option, 'reimbursementTypeId', setSelectedReimbursementFor, formikProps.setFieldValue);
                      }}
                      formikField='reimbursementTypeId'
                      inputLabel='Reimbursement For'
                      options={reimbursementOptions}
                      value={selectedReimbursementFor}
                    />
                  </div>
                  <div className='col-lg-6'>
                    <TextInput
                      isRequired={true}
                      label='Enter Amount'
                      margin='mb-7'
                      formikField='amount'
                      inputValidation='decimal'
                    />
                  </div>
                </div>

                {/* Row 5: From Location + To Location */}
                <div className='row'>
                  <div className='col-lg-6'>
                    <label className='form-label fw-bold'>From Location</label>
                    <input
                      type='text'
                      className={`form-control form-control-lg form-control-solid${formikProps.touched.fromLocation && formikProps.errors.fromLocation ? ' is-invalid' : ''}`}
                      placeholder='From Location'
                      {...formikProps.getFieldProps('fromLocation')}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (!/^[a-zA-Z\s]$/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) e.preventDefault();
                      }}
                    />
                    {formikProps.touched.fromLocation && formikProps.errors.fromLocation && (
                      <div className='fv-plugins-message-container'>
                        <div className='fv-help-block'>{String(formikProps.errors.fromLocation)}</div>
                      </div>
                    )}
                  </div>
                  <div className='col-lg-6 mb-7'>
                    <label className='form-label fw-bold'>To Location</label>
                    <input
                      type='text'
                      className={`form-control form-control-lg form-control-solid${formikProps.touched.toLocation && formikProps.errors.toLocation ? ' is-invalid' : ''}`}
                      placeholder='To Location'
                      {...formikProps.getFieldProps('toLocation')}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (!/^[a-zA-Z\s]$/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) e.preventDefault();
                      }}
                    />
                    {formikProps.touched.toLocation && formikProps.errors.toLocation && (
                      <div className='fv-plugins-message-container'>
                        <div className='fv-help-block'>{String(formikProps.errors.toLocation)}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 6: Document Upload */}
                <div className='row'>
                  <div className='col-lg-12'>
                    <label className='mb-3 fw-bold'>Upload Reimbursement Bill</label>
                    <input
                      ref={fileInputRef}
                      type='file'
                      accept='image/*,application/pdf'
                      className='form-control form-control-lg form-control-solid'
                      required={false}
                      onChange={(event) => uploadFile(event, formikProps, 5 * 1024 * 1024)}
                    />
                  </div>
                </div>

                {/* Row 7: Remark */}
                <div className='col-lg'>
                  <TextInput
                    isRequired={true}
                    label='Remark'
                    margin='mb-7'
                    formikField='description'
                  />
                </div>

                {/* Submit */}
                <div className='d-flex justify-content-end mt-5'>
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
}

export default PendingReimbursementsPage;
