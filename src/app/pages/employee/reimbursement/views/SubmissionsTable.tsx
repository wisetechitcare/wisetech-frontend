import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { MRT_ColumnDef } from 'material-react-table';
import { Modal } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import { IReimbursementsUpdate } from '@models/employee';
import ReimbursementEditModal from '../components/ReimbursementEditModal';
import {
  fetchReimbursementBatches,
  fetchReimbursementBatchById,
  deleteEmployeeReimbursement,
} from '@services/employee';
import { deleteConfirmation } from '@utils/modal';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import { useReimbursementLookups } from '@hooks/useReimbursementLookups';
import { PeriodAlignment } from '../MaterialToggleReimbursement';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { Tooltip } from '@mui/material';

function fmtDate(d?: string) {
  if (!d) return '—';
  return dayjs(d).format('DD MMM YYYY');
}

function fmtAmount(n: number | string) {
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function resolveStatusNum(status: any): number {
  if (typeof status === 'number') return status;
  if (status === 'Approved') return 1;
  if (status === 'Rejected') return 2;
  return 0;
}

// ── Document Preview Modal ─────────────────────────────────────────────────────

interface DocumentPreviewModalProps {
  url: string;
  onClose: () => void;
}

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
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Document preview"
    >
      <div
        className="d-flex flex-column bg-white rounded shadow overflow-hidden"
        style={{ width: 'min(75vw, 900px)', height: 'min(78vh, 710px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom bg-light flex-shrink-0">
          <div className="d-flex align-items-center gap-2 text-gray-700 fw-semibold fs-7 text-truncate">
            <KTIcon iconName="document" className="fs-4 text-primary" />
            <span className="text-truncate" style={{ maxWidth: 560 }}>
              {url.split('/').pop()?.split('?')[0] ?? 'Document'}
            </span>
          </div>
          <div className="d-flex align-items-center gap-2 flex-shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-light btn-active-light-primary d-flex align-items-center gap-1"
              title="Open in new tab"
            >
              <KTIcon iconName="exit-right-corner" className="fs-5" />
              <span className="d-none d-sm-inline">Open in tab</span>
            </a>
            <button
              className="btn btn-sm btn-icon btn-light btn-active-light-danger"
              onClick={onClose}
              title="Close preview (Esc)"
            >
              <KTIcon iconName="cross" className="fs-2" />
            </button>
          </div>
        </div>
        <div
          className="flex-grow-1 overflow-hidden bg-light d-flex align-items-center justify-content-center"
          style={{ minHeight: 0 }}
        >
          {isImage ? (
            <img
              src={url}
              alt="Document preview"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '1rem', userSelect: 'none' }}
            />
          ) : isPdf ? (
            <iframe
              src={url}
              title="PDF preview"
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="fullscreen"
            />
          ) : (
            <div className="d-flex flex-column align-items-center gap-3 p-5 text-center w-100 h-100">
              <iframe
                src={url}
                title="Document preview"
                style={{ width: '100%', flex: 1, border: 'none', borderRadius: 8, minHeight: 0 }}
                allow="fullscreen"
              />
              <p className="text-muted fs-7 mb-0">
                If the document does not display,{' '}
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary">
                  open it in a new tab
                </a>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

// ── Submission Detail Modal ────────────────────────────────────────────────────

interface SubmissionDetailModalProps {
  batchId: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onEdit?: (row: IReimbursementsUpdate) => void;
  showEditDeleteOption?: boolean;
}

function SubmissionDetailModal({
  batchId,
  onClose,
  onRefresh,
  showEditDeleteOption,
}: SubmissionDetailModalProps) {
  const [batch, setBatch] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<IReimbursementsUpdate | null>(null);

  const reimbursements: any[] = batch?.reimbursements ?? [];
  const { resolveClientType, resolveClientCompany, resolveProject } = useReimbursementLookups(reimbursements);

  const loadBatch = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const res = await fetchReimbursementBatchById(batchId);
      setBatch(res?.data?.batch || res?.batch || null);
    } catch {
      setBatch(null);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    if (batchId) {
      setBatch(null);
      loadBatch();
    }
  }, [batchId, loadBatch]);

  const handleDelete = async (reimbursementId: string) => {
    const confirmed = await deleteConfirmation('Reimbursement Deleted Successfully!');
    if (!confirmed) return;
    setDeletingId(reimbursementId);
    try {
      await deleteEmployeeReimbursement(reimbursementId);
      await loadBatch();
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewDocument = useCallback((documentUrl: string) => {
    if (documentUrl) setPreviewUrl(documentUrl);
  }, []);

  const detailColumns = useMemo<MRT_ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'expenseDate',
        header: 'Date',
        enableColumnActions: false,
        Cell: ({ row }: any) => fmtDate(row.original.expenseDate),
      },
      {
        accessorKey: 'day',
        header: 'Day',
        enableColumnActions: false,
        Cell: ({ row }: any) =>
          row.original.expenseDate ? dayjs(row.original.expenseDate).format('dddd') : '—',
      },
      {
        accessorKey: 'description',
        header: 'Note',
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue || '—',
      },
      {
        accessorKey: 'type',
        header: 'Type',
        enableColumnActions: false,
        Cell: ({ row }: any) => row.original.reimbursementType?.type || row.original.type || '—',
      },
      {
        accessorKey: 'clientType',
        header: 'Client Type',
        enableColumnActions: false,
        Cell: ({ row }: any) => {
          const r = row.original;
          return (
            r.clientCompany?.companyType?.name ||
            resolveClientType(r.clientCompany?.companyTypeId || r.clientTypeId)
          );
        },
      },
      {
        accessorKey: 'client',
        header: 'Client Name',
        enableColumnActions: false,
        Cell: ({ row }: any) =>
          row.original.clientCompany?.companyName ||
          resolveClientCompany(row.original.clientCompanyId) ||
          '—',
      },
      {
        accessorKey: 'project',
        header: 'Project Name',
        enableColumnActions: false,
        Cell: ({ row }: any) =>
          row.original.project?.title || resolveProject(row.original.projectId) || '—',
      },
      {
        accessorKey: 'fromLocation',
        header: 'From Location',
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue || 'NA',
      },
      {
        accessorKey: 'toLocation',
        header: 'To Location',
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue || 'NA',
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        enableColumnActions: false,
        Cell: ({ row }: any) => `₹${fmtAmount(row.original.amount)}`,
      },
      {
        accessorKey: 'paymentStatus',
        header: 'Payment Status',
        enableColumnActions: false,
        Cell: ({ row }: any) => {
          const statusNum = resolveStatusNum(row.original.status);
          if (statusNum === 2) return <span className="text-muted">N/A</span>;
          if (statusNum !== 1) return <span className="text-muted">N/A</span>;
          const ps = row.original.paymentStatus;
          if (ps === 'PAID')
            return (
              <span className="badge badge-light-success text-success fw-bold px-3 py-2">Paid</span>
            );
          if (ps === 'PARTIAL')
            return (
              <span className="badge badge-light-info text-info fw-bold px-3 py-2">Partially Paid</span>
            );
          return (
            <span className="badge badge-light-warning text-warning fw-bold px-3 py-2">Pending</span>
          );
        },
      },
      {
        accessorKey: 'rejectionReason',
        header: 'Reject Reason',
        enableColumnActions: false,
        Cell: ({ row }: any) => {
          const statusNum = resolveStatusNum(row.original.status);
          const reason = row.original.rejectionReason;
          if (statusNum === 1) return <span className="text-muted">N/A</span>;
          if (statusNum === 2 && reason)
            return <span className="text-danger">{reason}</span>;
          return <span className="text-muted">N/A</span>;
        },
      },
      {
        accessorKey: 'document',
        header: 'Document',
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => (
          <button
            className="btn btn-icon btn-active-color-primary btn-sm"
            onClick={() => handleViewDocument(renderedCellValue)}
            disabled={!renderedCellValue}
            title={renderedCellValue ? 'Preview document' : 'No document attached'}
          >
            {renderedCellValue ? (
              <KTIcon iconName="eye" className="fs-3" />
            ) : (
              <i className="bi bi-file-earmark-x fs-3 text-danger"></i>
            )}
          </button>
        ),
      },
      ...(showEditDeleteOption
        ? [
            {
              id: 'actions',
              header: 'Actions',
              enableSorting: false,
              enableColumnActions: false,
              Cell: ({ row }: any) => {
                const r = row.original;
                const statusNum = resolveStatusNum(r.status);
                const isPending = statusNum === 0;
                const isDeleting = deletingId === r.id;

                if (!isPending) {
                  return (
                    <Tooltip
                      title="This reimbursement has already been processed and cannot be modified."
                      arrow
                      placement="top"
                    >
                      <span
                        style={{
                          color: '#94a3b8',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          cursor: 'default',
                          userSelect: 'none',
                        }}
                      >
                        No Action Available
                      </span>
                    </Tooltip>
                  );
                }

                const resEdit =
                  isPending &&
                  hasPermission(
                    resourceNameMapWithCamelCase.reimbursement,
                    permissionConstToUseWithHasPermission.editOwn,
                    r,
                  );
                const resDelete =
                  isPending &&
                  hasPermission(
                    resourceNameMapWithCamelCase.reimbursement,
                    permissionConstToUseWithHasPermission.deleteOwn,
                    r,
                  );

                return (
                  <div className="d-flex align-items-center gap-2">
                    {resEdit && (
                      <button
                        className="btn btn-icon btn-active-color-primary btn-sm"
                        title="Edit"
                        onClick={() => {
                          const cleaned = Object.fromEntries(
                            Object.entries(r).filter(([, v]) => v != null),
                          );
                          setEditRow(cleaned as IReimbursementsUpdate);
                        }}
                      >
                        <KTIcon iconName="pencil" className="fs-4 text-primary" />
                      </button>
                    )}
                    {resDelete && (
                      <button
                        className="btn btn-icon btn-active-color-danger btn-sm"
                        title="Delete"
                        disabled={isDeleting}
                        onClick={() => handleDelete(r.id)}
                      >
                        {isDeleting ? (
                          <span className="spinner-border spinner-border-sm text-danger" />
                        ) : (
                          <KTIcon iconName="trash" className="fs-4 text-danger" />
                        )}
                      </button>
                    )}
                    {!resEdit && !resDelete && (
                      <span className="text-muted fs-7">—</span>
                    )}
                  </div>
                );
              },
            },
          ]
        : []),
    ],
    [
      resolveClientType,
      resolveClientCompany,
      resolveProject,
      showEditDeleteOption,
      handleViewDocument,
      deletingId,
      setEditRow,
    ],
  );

  return (
    <>
      <style>{`.submission-detail-modal { max-width: 90vw !important; width: 95vw; }`}</style>
      <Modal
        show={!!batchId}
        onHide={onClose}
        centered
        size="xl"
        dialogClassName="submission-detail-modal"
      >
        <Modal.Header closeButton>
          <div>
            <Modal.Title className="fs-4 fw-bold">
              Submission Details — {batch?.submissionId || ''}
            </Modal.Title>
            {batch && (
              <div className="text-muted fs-7 mt-1">
                {batch.totalRequests} request{batch.totalRequests !== 1 ? 's' : ''}&nbsp;·&nbsp;
                ₹{fmtAmount(batch.totalAmount)} total&nbsp;·&nbsp;Submitted{' '}
                {fmtDate(batch.submittedAt)}
              </div>
            )}
          </div>
        </Modal.Header>

        <Modal.Body style={{ padding: '24px', maxHeight: '82vh', overflowY: 'auto' }}>
          {loading ? (
            <div className="d-flex justify-content-center py-10">
              <span className="spinner-border text-primary" />
            </div>
          ) : (
            <MaterialTable
              columns={detailColumns}
              data={reimbursements}
              tableName="SubmissionDetailReimbursements"
              hideFilters={false}
              hideExportCenter={false}
              muiTableProps={{
                sx: {
                  '& .MuiTableBody-root .MuiTableCell-root': {
                    borderBottom: 'none',
                    paddingY: '5px',
                  },
                },
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
                  const statusNum = resolveStatusNum(row.original?.status);
                  const colorMap: Record<number, { bg: string; border: string; hover: string }> = {
                    1: { bg: 'rgba(16,185,129,0.04)', border: '#10b981', hover: 'rgba(16,185,129,0.08)' },
                    2: { bg: 'rgba(239,68,68,0.04)', border: '#ef4444', hover: 'rgba(239,68,68,0.08)' },
                    0: { bg: 'rgba(245,158,11,0.04)', border: '#f59e0b', hover: 'rgba(245,158,11,0.08)' },
                  };
                  const c = colorMap[statusNum] ?? null;
                  return {
                    sx: {
                      backgroundColor: c ? c.bg : undefined,
                      '& td:first-of-type': c ? { borderLeft: `4px solid ${c.border} !important` } : {},
                      transition: 'background-color 0.12s ease',
                      '&:hover td': {
                        backgroundColor: c ? `${c.hover} !important` : '#F8FAFC',
                      },
                    },
                  };
                },
              }}
            />
          )}
        </Modal.Body>
      </Modal>

      {previewUrl && (
        <DocumentPreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}

      <ReimbursementEditModal
        show={!!editRow}
        onHide={() => setEditRow(null)}
        reimbursement={editRow}
        onSaved={() => {
          loadBatch();
          onRefresh();
        }}
      />
    </>
  );
}

// ── Submissions Table ──────────────────────────────────────────────────────────

export interface SubmissionsTableProps {
  period: PeriodAlignment;
  date: Dayjs;
  selectedEmployeeId?: string;
  onEdit?: (row: IReimbursementsUpdate) => void;
  showEditDeleteOption?: boolean;
  resource?: string;
  viewOwn?: boolean;
  viewOthers?: boolean;
  checkOwnWithOthers?: boolean;
}

function SubmissionsTable({
  period,
  date,
  selectedEmployeeId,
  onEdit,
  showEditDeleteOption = false,
  resource = '',
  viewOwn = false,
  viewOthers = false,
  checkOwnWithOthers = false,
}: SubmissionsTableProps) {
  const [batches, setBatches] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [detailBatchId, setDetailBatchId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);

  const filterBatches = useCallback(
    (allBatches: any[]) => {
      let filtered = allBatches;

      // Filter by selected employee
      if (selectedEmployeeId) {
        filtered = filtered.filter(
          (b: any) =>
            b.employee?.id === selectedEmployeeId || b.employeeId === selectedEmployeeId,
        );
      }

      // Filter by period
      if (period === 'monthly') {
        const monthStr = date.format('YYYY-MM');
        filtered = filtered.filter(
          (b: any) => b.submittedAt && dayjs(b.submittedAt).format('YYYY-MM') === monthStr,
        );
      } else if (period === 'yearly') {
        const targetYear = date.year();
        filtered = filtered.filter(
          (b: any) => b.submittedAt && dayjs(b.submittedAt).year() === targetYear,
        );
      }

      return filtered;
    },
    [period, date, selectedEmployeeId],
  );

  const loadBatches = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await fetchReimbursementBatches();
      const allBatches: any[] = res?.data?.batches || res?.batches || [];
      const filtered = filterBatches(allBatches);

      // Compute payment status dynamically for approved batches from their individual items
      const approvedBatches = filtered.filter((b: any) => b.status === 1);
      const detailResults = await Promise.all(
        approvedBatches.map((b: any) =>
          fetchReimbursementBatchById(b.id)
            .then((r: any) => ({ id: b.id, batch: r?.data?.batch || r?.batch || null }))
            .catch(() => ({ id: b.id, batch: null })),
        ),
      );

      const paymentStatusMap: Record<string, string> = {};
      for (const { id, batch } of detailResults) {
        if (!batch) continue;
        const items: any[] = batch.reimbursements || [];
        const approvedItems = items.filter((r: any) => resolveStatusNum(r.status) === 1);
        const paidCount = approvedItems.filter((r: any) => r.paymentStatus === 'PAID').length;
        if (approvedItems.length > 0 && paidCount === approvedItems.length) {
          paymentStatusMap[id] = 'PAID';
        } else if (paidCount > 0) {
          paymentStatusMap[id] = 'PARTIAL';
        } else {
          paymentStatusMap[id] = 'UNPAID';
        }
      }

      const enriched = filtered.map((b: any) =>
        b.status === 1 ? { ...b, paymentStatus: paymentStatusMap[b.id] ?? b.paymentStatus } : b,
      );

      setBatches(enriched);
    } catch {
      setBatches([]);
    } finally {
      setTableLoading(false);
    }
  }, [filterBatches, refreshKey]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const columns = useMemo<MRT_ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'submittedAt',
        header: 'Submission Date',
        size: 160,
        Cell: ({ row }: any) => (
          <span className="text-dark fs-7">{fmtDate(row.original.submittedAt)}</span>
        ),
      },
      {
        accessorKey: 'totalRequests',
        header: 'Total Requests',
        size: 145,
        Cell: ({ row }: any) => (
          <button
            className="btn btn-link p-0 fw-bold fs-7"
            style={{ textDecoration: 'none', color: '#AA393D', cursor: 'pointer' }}
            onClick={() => setDetailBatchId(row.original.id)}
            title="View all requests in this submission"
          >
            {row.original.totalRequests}
          </button>
        ),
      },
      {
        accessorKey: 'totalAmount',
        header: 'Total Amount (₹)',
        size: 165,
        Cell: ({ row }: any) => (
          <span className="fs-7" style={row.original.isExceedingLimit ? { color: '#ef4444', fontWeight: 600 } : { color: 'inherit' }}>
            ₹{fmtAmount(row.original.totalAmount)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 120,
        Cell: ({ row }: any) => {
          const s = row.original.status;
          if (s === 1)
            return (
              <span className="badge badge-light-success fw-semibold fs-8">Approved</span>
            );
          if (s === 2)
            return (
              <span className="badge badge-light-danger fw-semibold fs-8">Rejected</span>
            );
          return <span className="badge badge-light-warning fw-semibold fs-8">Pending</span>;
        },
      },
      {
        accessorKey: 'paymentStatus',
        header: 'Payment Status',
        size: 145,
        Cell: ({ row }: any) => {
          const s = row.original.status;
          if (s === 2) return <span className="text-muted fs-7">N/A</span>;
          if (s !== 1) return <span className="text-muted fs-7">N/A</span>;
          const ps = row.original.paymentStatus;
          if (ps === 'PAID')
            return (
              <span className="badge badge-light-success text-success fw-bold px-3 py-2 fs-8">
                Paid
              </span>
            );
          if (ps === 'PARTIAL')
            return (
              <span className="badge badge-light-info text-info fw-bold px-3 py-2 fs-8">
                Partially Paid
              </span>
            );
          return (
            <span className="badge badge-light-warning text-warning fw-bold px-3 py-2 fs-8">
              Pending
            </span>
          );
        },
      },
      {
        accessorKey: 'rejectReason',
        header: 'Reject Reason',
        size: 230,
        enableColumnActions: false,
        Cell: ({ row }: any) => {
          const reason = row.original.rejectReason || row.original.rejectionReason;
          return reason ? (
            <span className="text-danger fs-7">{reason}</span>
          ) : (
            <span className="text-muted fs-7">N/A</span>
          );
        },
      },
    ],
    [],
  );

  return (
    <>
      {tableLoading ? (
        <div className="d-flex justify-content-center py-10">
          <span className="spinner-border text-primary" />
        </div>
      ) : (
        <MaterialTable
          columns={columns}
          data={batches}
          tableName="Submissions"
          resource={resource}
          viewOwn={viewOwn}
          viewOthers={viewOthers}
          checkOwnWithOthers={checkOwnWithOthers}
          employeeId={employeeId}
          muiTableProps={{
            sx: {
              '& .MuiTableBody-root .MuiTableCell-root': {
                borderBottom: 'none',
                paddingY: '5px',
              },
            },
            muiTableBodyRowProps: ({ row }: any) => {
              const s = row.original?.status;
              const colorMap: Record<number, { bg: string; border: string; hover: string }> = {
                1: { bg: 'rgba(16,185,129,0.04)', border: '#10b981', hover: 'rgba(16,185,129,0.08)' },
                2: { bg: 'rgba(239,68,68,0.04)', border: '#ef4444', hover: 'rgba(239,68,68,0.08)' },
                0: { bg: 'rgba(245,158,11,0.04)', border: '#f59e0b', hover: 'rgba(245,158,11,0.08)' },
              };
              const c = s !== undefined ? colorMap[s] : null;
              return {
                sx: {
                  backgroundColor: c ? c.bg : undefined,
                  '& td:first-of-type': c ? { borderLeft: `4px solid ${c.border} !important` } : {},
                  transition: 'background-color 0.12s ease',
                  '&:hover td': {
                    backgroundColor: c ? `${c.hover} !important` : '#F8FAFC',
                  },
                },
              };
            },
          }}
        />
      )}

      <SubmissionDetailModal
        batchId={detailBatchId}
        onClose={() => setDetailBatchId(null)}
        onRefresh={() => setRefreshKey((k) => k + 1)}
        onEdit={onEdit}
        showEditDeleteOption={showEditDeleteOption}
      />
    </>
  );
}

export default SubmissionsTable;
