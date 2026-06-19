import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { MRT_ColumnDef } from 'material-react-table';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { Modal } from 'react-bootstrap';
import { Form, Formik, FormikValues } from 'formik';
import * as Yup from 'yup';
import dayjs, { Dayjs } from 'dayjs';
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
import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material';
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

// ── Summary card ──────────────────────────────────────────────────────────────

function fmtAmount(n: number | string) {
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

const IconPendingRequests = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="8" y1="17" x2="12" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconTotalAmount = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="15" r="1.5" fill="currentColor"/>
  </svg>
);

interface SummaryCardProps { drafts: any[]; loading: boolean; }

function SummaryCard({ drafts, loading }: SummaryCardProps) {
  const totalAmount = drafts.reduce((s: number, d: any) => s + parseFloat(String(d.amount || 0)), 0);
  const cards = [
    {
      label: 'Pending Requests',
      sublabel: 'Awaiting submission',
      value: loading ? '—' : drafts.length,
      accent: '#7c3aed',
      iconBg: '#f5f3ff',
      icon: <IconPendingRequests />,
    },
    {
      label: 'Total Amount',
      sublabel: 'Sum of all requests',
      value: loading ? '—' : `₹${fmtAmount(totalAmount)}`,
      accent: '#2563eb',
      iconBg: '#eff6ff',
      icon: <IconTotalAmount />,
    },
  ];
  return (
    <>
      <h2>Overview</h2>
      <div className='d-flex gap-4 mb-6'>
        {cards.map((c) => (
          <Paper key={c.label} elevation={0} sx={{
            flex: '0 0 220px',
            borderRadius: '16px',
            border: '1px solid #f0f0f0',
            background: '#ffffff',
            overflow: 'hidden',
            position: 'relative',
            transition: 'box-shadow 220ms ease, transform 220ms ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.05)',
            '&:hover': {
              transform: 'translateY(-3px)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.06), 0 12px 24px rgba(0,0,0,0.08)',
            },
          }}>
            <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: c.accent, borderRadius: '16px 0 0 16px' }} />
            <Box sx={{ p: '18px 20px 18px 24px' }}>
              <Stack direction='row' justifyContent='space-between' alignItems='flex-start' mb={2}>
                <Box>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', lineHeight: 1.2, mb: 0.3 }}>
                    {c.label}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: '#b0bec5', fontWeight: 500, lineHeight: 1.2 }}>
                    {c.sublabel}
                  </Typography>
                </Box>
                <Box sx={{ width: 40, height: 40, borderRadius: '12px', display: 'grid', placeItems: 'center', backgroundColor: c.iconBg, color: c.accent, flexShrink: 0 }}>
                  {c.icon}
                </Box>
              </Stack>
              {loading
                ? <Skeleton width={80} height={36} />
                : <Typography sx={{ fontSize: typeof c.value === 'number' ? '2rem' : '1.6rem', fontWeight: 800, color: c.accent, lineHeight: 1.1, letterSpacing: '-0.5px', wordBreak: 'break-word' }}>
                    {c.value}
                  </Typography>
              }
            </Box>
          </Paper>
        ))}
      </div>
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

function PendingReimbursementsPage() {
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

  const handleSubmit = async (values: any, actions: FormikValues) => {
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
      successConfirmation("Reimbursement saved to Pending Requests.");
      setShow(false);
      loadDrafts();
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
      'Are you sure you want to send all pending reimbursement requests for approval? Once click on Send for Approval, You will no longer be able to edit or delete them from Pending Requests Records.',
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

  const columns = useMemo<MRT_ColumnDef<any>[]>(() => [
    {
      accessorKey: 'expenseDate',
      header: 'Date',
      size: 120,
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{dayjs(row.original.expenseDate).format('DD MMM YYYY')}</span>,
    },
    {
      accessorKey: 'day',
      header: 'Day',
      size: 110,
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{dayjs(row.original.expenseDate).format('dddd')}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Note',
      size: 150,
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{row.original.description || '—'}</span>,
    },
    {
      accessorKey: 'reimbursementType.type',
      header: 'Type',
      size: 140,
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{row.original.reimbursementType?.type || '—'}</span>,
    },
    {
      accessorKey: 'clientTypeId',
      header: 'Client Type',
      size: 130,
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{resolveClientType(row.original.clientTypeId)}</span>,
    },
    {
      accessorKey: 'clientCompanyId',
      header: 'Client Name',
      size: 180,
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{resolveClientCompany(row.original.clientCompanyId)}</span>,
    },
    {
      accessorKey: 'projectId',
      header: 'Project Name',
      size: 200,
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{resolveProject(row.original.projectId)}</span>,
    },
    {
      accessorKey: 'fromLocation',
      header: 'From Location',
      size: 130,
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{row.original.fromLocation || 'NA'}</span>,
    },
    {
      accessorKey: 'toLocation',
      header: 'To Location',
      size: 130,
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }) => <span>{row.original.toLocation || 'NA'}</span>,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      size: 110,
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }) => <span className='text-dark fw-bold fs-7'>{fmtAmount(row.original.amount)}</span>,
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
  ], [resolveClientType, resolveClientCompany, resolveProject]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Summary cards */}
      <SummaryCard drafts={drafts} loading={loading} />

      {/* Action bar */}
      <div className='d-flex justify-content-between align-items-center mb-4' style={{ paddingRight: '1.25rem' }}>
        <h2 className='mb-0'>Pending Requests Records</h2>
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
              className='btn btn-lg btn-primary d-flex align-items-center gap-2'
              onClick={handleSendForApproval}
              disabled={submitting}
            >
              {submitting
                ? <span className='spinner-border spinner-border-sm me-2' />
                : <KTIcon iconName='send' className='fs-4' />
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
        muiTableProps={{
          muiTableBodyRowProps: () => ({
            sx: {
              backgroundColor: 'rgba(245,158,11,0.04)',
              '& td:first-of-type': { borderLeft: '4px solid #f59e0b !important' },
              transition: 'background-color 0.12s ease',
              '&:hover td': { backgroundColor: 'rgba(245,158,11,0.08) !important' },
            },
          }),
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
                  clientTypeId: currentReimbursement?.clientTypeId || '',
                  clientCompanyId: currentReimbursement?.clientCompanyId || '',
                  projectId: currentReimbursement?.projectId || '',
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
