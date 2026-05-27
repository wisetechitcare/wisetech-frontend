import { useEffect, useState, useMemo } from 'react';
import { MRT_ColumnDef } from 'material-react-table';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { usePermission } from '@hooks/usePermission';
import { KTIcon } from '@metronic/helpers';
import { Modal } from 'react-bootstrap';
import {
  fetchDelegations,
  createApprovalDelegation,
  cancelApprovalDelegation,
  fetchAllEmployeesSelectedData,
} from '@services/employee';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';

type EmployeeOption = { id: string; name: string; employeeCode?: string | null };

type Delegation = {
  id: string;
  originalApproverId: string;
  delegateToId: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  isActive: boolean;
  createdAt: string;
  originalApprover: { id: string; users: { firstName: string; lastName: string } };
  delegateTo: { id: string; users: { firstName: string; lastName: string } };
  createdBy: { id: string; users: { firstName: string; lastName: string } };
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function empName(emp: { users: { firstName: string; lastName: string } }): string {
  return `${emp.users.firstName} ${emp.users.lastName}`;
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

interface CreateModalProps {
  show: boolean;
  employees: EmployeeOption[];
  onClose: () => void;
  onCreated: () => void;
}

function CreateDelegationModal({ show, employees, onClose, onCreated }: CreateModalProps) {
  const [originalId, setOriginalId] = useState('');
  const [delegateId, setDelegateId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [originalSearch, setOriginalSearch] = useState('');
  const [delegateSearch, setDelegateSearch] = useState('');

  useEffect(() => {
    if (!show) {
      setOriginalId(''); setDelegateId('');
      setStartDate(''); setEndDate('');
      setReason(''); setOriginalSearch(''); setDelegateSearch('');
    }
  }, [show]);

  const filteredForOriginal = employees.filter((e) =>
    !originalSearch || e.name.toLowerCase().includes(originalSearch.toLowerCase())
  );
  const filteredForDelegate = employees.filter((e) =>
    !delegateSearch || e.name.toLowerCase().includes(delegateSearch.toLowerCase())
  );

  const isValid =
    originalId && delegateId && originalId !== delegateId && startDate && endDate &&
    new Date(endDate) >= new Date(startDate);

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await createApprovalDelegation({ originalApproverId: originalId, delegateToId: delegateId, startDate, endDate, reason: reason || undefined });
      successConfirmation('Delegation has been created successfully.', 'Created!');
      onCreated();
      onClose();
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Failed to create delegation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered size='lg'>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: 16, fontWeight: 700, color: '#181c32' }}>
          Create Delegation
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: '20px 24px' }}>
        <div className='row g-4'>

          {/* Original Approver */}
          <div className='col-12 col-md-6'>
            <label className='fw-semibold fs-7 mb-1 d-block'>
              Original Approver <span className='text-danger'>*</span>
            </label>
            <input
              type='text'
              className='form-control form-control-sm mb-1'
              placeholder='Search employee…'
              value={originalSearch}
              onChange={(e) => { setOriginalSearch(e.target.value); setOriginalId(''); }}
            />
            <select
              className='form-select form-select-sm'
              value={originalId}
              onChange={(e) => setOriginalId(e.target.value)}
              size={4}
            >
              <option value=''>— select —</option>
              {filteredForOriginal.map((e) => (
                <option key={e.id} value={e.id}>{e.name}{e.employeeCode ? ` (${e.employeeCode})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Delegate To */}
          <div className='col-12 col-md-6'>
            <label className='fw-semibold fs-7 mb-1 d-block'>
              Delegate To <span className='text-danger'>*</span>
            </label>
            <input
              type='text'
              className='form-control form-control-sm mb-1'
              placeholder='Search employee…'
              value={delegateSearch}
              onChange={(e) => { setDelegateSearch(e.target.value); setDelegateId(''); }}
            />
            <select
              className='form-select form-select-sm'
              value={delegateId}
              onChange={(e) => setDelegateId(e.target.value)}
              size={4}
            >
              <option value=''>— select —</option>
              {filteredForDelegate.filter((e) => e.id !== originalId).map((e) => (
                <option key={e.id} value={e.id}>{e.name}{e.employeeCode ? ` (${e.employeeCode})` : ''}</option>
              ))}
            </select>
            {originalId && delegateId && originalId === delegateId && (
              <div className='text-danger fs-8 mt-1'>Cannot delegate to the same person.</div>
            )}
          </div>

          {/* Date range */}
          <div className='col-12 col-md-6'>
            <label className='fw-semibold fs-7 mb-1 d-block'>
              Start Date <span className='text-danger'>*</span>
            </label>
            <input
              type='date'
              className='form-control form-control-sm'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className='col-12 col-md-6'>
            <label className='fw-semibold fs-7 mb-1 d-block'>
              End Date <span className='text-danger'>*</span>
            </label>
            <input
              type='date'
              className='form-control form-control-sm'
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {startDate && endDate && new Date(endDate) < new Date(startDate) && (
              <div className='text-danger fs-8 mt-1'>End date must be on or after start date.</div>
            )}
          </div>

          {/* Reason */}
          <div className='col-12'>
            <label className='fw-semibold fs-7 mb-1 d-block'>Reason (optional)</label>
            <textarea
              rows={2}
              className='form-control form-control-sm'
              placeholder='e.g. Annual leave, medical leave…'
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer style={{ gap: 8 }}>
        <button className='btn btn-sm btn-light' onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button
          className='btn btn-sm btn-primary d-flex align-items-center gap-2'
          onClick={handleSubmit}
          disabled={!isValid || submitting}
        >
          {submitting && <span className='spinner-border spinner-border-sm' />}
          Create Delegation
        </button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type DelegationsTableProps = {
  mode: 'my' | 'toMe';
};

function DelegationsTable({ mode }: DelegationsTableProps) {
  const canManage = usePermission('approvals.manage.all');
  const currentEmployeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchDelegations();
      const rows = (res?.data ?? res ?? []) as Delegation[];
      setDelegations(rows.filter((row) => mode === 'my' ? row.originalApproverId === currentEmployeeId : row.delegateToId === currentEmployeeId));
    } catch {
      setDelegations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canManage) return;
    load();
    fetchAllEmployeesSelectedData()
      .then((res: any) => {
        const raw: any[] = res?.data ?? res ?? [];
        setEmployees(
          raw.map((e: any) => ({
            id: e.id,
            name: `${e.users?.firstName ?? ''} ${e.users?.lastName ?? ''}`.trim(),
            employeeCode: e.employeeCode,
          }))
        );
      })
      .catch(() => setEmployees([]));
  }, [canManage, mode, currentEmployeeId]);

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this delegation?')) return;
    setCancellingId(id);
    try {
      await cancelApprovalDelegation(id);
      setDelegations((prev) =>
        prev.map((d) => d.id === id ? { ...d, isActive: false } : d)
      );
      successConfirmation('Delegation has been cancelled.', 'Cancelled');
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Failed to cancel delegation.');
    } finally {
      setCancellingId(null);
    }
  };

  const columns = useMemo<MRT_ColumnDef<Delegation>[]>(() => [
    {
      accessorKey: 'originalApprover',
      header: 'Original Approver',
      size: 180,
      Cell: ({ row }) => (
        <span className='text-dark fw-semibold fs-6'>{empName(row.original.originalApprover)}</span>
      ),
    },
    {
      accessorKey: 'delegateTo',
      header: 'Delegate To',
      size: 180,
      Cell: ({ row }) => (
        <span className='text-dark fw-semibold fs-6'>{empName(row.original.delegateTo)}</span>
      ),
    },
    {
      accessorKey: 'startDate',
      header: 'Start',
      size: 110,
      Cell: ({ row }) => <span className='text-muted fs-7'>{formatDate(row.original.startDate)}</span>,
    },
    {
      accessorKey: 'endDate',
      header: 'End',
      size: 110,
      Cell: ({ row }) => <span className='text-muted fs-7'>{formatDate(row.original.endDate)}</span>,
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      size: 220,
      Cell: ({ row }) => (
        <span className='text-muted fs-7'>{row.original.reason || '—'}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 110,
      Cell: ({ row }) => {
        const d = row.original;
        const now = new Date();
        const inWindow = new Date(d.startDate) <= now && now <= new Date(d.endDate);
        if (!d.isActive) {
          return <span className='badge badge-light-danger fw-semibold fs-8'>Cancelled</span>;
        }
        if (inWindow) {
          return <span className='badge badge-light-success fw-semibold fs-8'>Active</span>;
        }
        if (new Date(d.startDate) > now) {
          return <span className='badge badge-light-info fw-semibold fs-8'>Upcoming</span>;
        }
        return <span className='badge badge-light-warning fw-semibold fs-8'>Expired</span>;
      },
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      size: 100,
      enableSorting: false,
      Cell: ({ row }) => {
        const d = row.original;
        if (!d.isActive) return null;
        const isCancelling = cancellingId === d.id;
        return (
          <button
            className='btn btn-sm btn-light-danger d-flex align-items-center gap-1'
            disabled={isCancelling}
            onClick={() => handleCancel(d.id)}
          >
            {isCancelling ? <span className='spinner-border spinner-border-sm' /> : <KTIcon iconName='cross' className='fs-6' />}
            Cancel
          </button>
        );
      },
    },
  ], [cancellingId]);

  if (!canManage) {
    return (
      <div className='card'>
        <div className='card-body d-flex flex-column align-items-center justify-content-center py-20'>
          <KTIcon iconName='lock' className='fs-3x text-muted mb-4' />
          <span className='text-muted fs-6'>You do not have permission to manage delegations.</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className='d-flex align-items-center justify-content-end pt-0 pb-4'>
        <div className='d-flex gap-2'>
          <button
            className='btn btn-sm btn-light-primary d-flex align-items-center gap-2'
            onClick={load}
            disabled={loading}
          >
            <KTIcon iconName='arrows-circle' className='fs-5' />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          {mode === 'my' && <button className='btn btn-sm btn-primary d-flex align-items-center gap-2' onClick={() => setShowCreate(true)}>
            <KTIcon iconName='plus' className='fs-5' />
            New Delegation
          </button>}
        </div>
      </div>

      <MaterialTable
        data={delegations}
        columns={columns}
        tableName='Delegations'
        hideFilters={false}
        hideExportCenter
      />

      <CreateDelegationModal
        show={showCreate}
        employees={employees}
        onClose={() => setShowCreate(false)}
        onCreated={load}
      />
    </>
  );
}

export default DelegationsTable;
