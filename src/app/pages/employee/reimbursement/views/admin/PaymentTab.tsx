import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { KTIcon, toAbsoluteUrl } from '@metronic/helpers';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Modal } from 'react-bootstrap';
import dayjs from 'dayjs';
import DateSelector from '@components/DateSelector';
import {
  fetchReimbursementBatches,
  fetchReimbursementBatchById,
  createReimbursementPayment,
  fetchReimbursementPayments,
} from '@services/employee';
import { BatchDetailModal } from '../../shared/ReimbursementBatchShared';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import Swal from 'sweetalert2';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import { formatFiscalYearLabel } from '@utils/fiscalYearHelper';

type PeriodFilter = 'monthly' | 'yearly' | 'allTime';

function fmtAmount(n: number | string) {
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function fmtDate(d?: string) {
  if (!d) return 'N/A';
  return dayjs(d).format('DD MMM YYYY');
}

const formatINR = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);

function resolveStatusNum(s: any): number {
  if (typeof s === 'number') return s;
  if (s === 'Approved') return 1;
  if (s === 'Rejected') return 2;
  return 0;
}

function getDateRange(filter: PeriodFilter, date: dayjs.Dayjs) {
  if (filter === 'monthly') {
    return {
      startDate: date.startOf('month').toISOString(),
      endDate: date.endOf('month').toISOString(),
    };
  }
  if (filter === 'yearly') {
    return {
      startDate: date.startOf('year').toISOString(),
      endDate: date.endOf('year').toISOString(),
    };
  }
  return { startDate: undefined, endDate: undefined };
}

const toggleSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0,
  height: 30,
  p: '2px',
  borderRadius: '5px',
  backgroundColor: '#f1f5f9',
  border: '1px solid #eef2f7',
  width: 'fit-content',
  maxWidth: '100%',
  overflowX: 'auto',
  '& .MuiToggleButtonGroup-grouped': {
    border: 0,
    borderRadius: '4px !important',
    minWidth: 0,
    minHeight: 24,
    px: 1.6,
    py: 0,
    color: '#475569',
    fontSize: 12,
    fontWeight: 500,
    lineHeight: '24px',
    textTransform: 'none',
    whiteSpace: 'nowrap',
    letterSpacing: 0,
  },
  '& .MuiToggleButtonGroup-grouped:not(:first-of-type)': {
    marginLeft: 0,
    borderLeft: 0,
  },
  '& .MuiToggleButton-root:hover': {
    backgroundColor: '#e8eef6',
  },
  '& .Mui-selected': {
    backgroundColor: '#ffffff !important',
    color: '#aa393d !important',
    fontWeight: 700,
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
  },
};

function PeriodFilterBar({
  filter,
  date,
  onFilterChange,
  onNavigate,
}: {
  filter: PeriodFilter;
  date: dayjs.Dayjs;
  onFilterChange: (f: PeriodFilter) => void;
  onNavigate: (dir: -1 | 1) => void;
}) {
  const [fiscalYearLabel, setFiscalYearLabel] = useState('');

  useEffect(() => {
    if (filter !== 'yearly') return;
    generateFiscalYearFromGivenYear(date).then(({ startDate, endDate }) => {
      setFiscalYearLabel(formatFiscalYearLabel(`${startDate} to ${endDate}`));
    });
  }, [date, filter]);

  const periodLabel =
    filter === 'monthly'
      ? date.format('MMM YYYY')
      : filter === 'yearly'
      ? fiscalYearLabel || date.format('YYYY')
      : 'All Time';

  return (
    <div className="d-flex flex-md-row flex-column justify-content-lg-between align-items-lg-center gap-5 gap-lg-0 mb-3">
      <ToggleButtonGroup
        value={filter}
        exclusive
        onChange={(_: any, val: PeriodFilter | null) => {
          if (val) onFilterChange(val);
        }}
        sx={toggleSx}
      >
        <ToggleButton value="monthly">Monthly</ToggleButton>
        <ToggleButton value="yearly">Yearly</ToggleButton>
        <ToggleButton value="allTime">All Time</ToggleButton>
      </ToggleButtonGroup>
      {filter !== 'allTime' && (
        <DateSelector
          onPrevious={() => onNavigate(-1)}
          onNext={() => onNavigate(1)}
          displayValue={periodLabel}
        />
      )}
    </div>
  );
}

function filterByPeriod(batches: any[], filter: PeriodFilter, date: dayjs.Dayjs) {
  if (filter === 'monthly') {
    const monthStr = date.format('YYYY-MM');
    return batches.filter(
      (b) => b.submittedAt && dayjs(b.submittedAt).format('YYYY-MM') === monthStr,
    );
  }
  if (filter === 'yearly') {
    return batches.filter(
      (b) => b.submittedAt && dayjs(b.submittedAt).year() === date.year(),
    );
  }
  return batches;
}

// ── Pending Payment Table ──────────────────────────────────────────────────────

function PendingPaymentTable({
  batches,
  loading,
  onMarkAsPaid,
  onRowClick,
}: {
  batches: any[];
  loading: boolean;
  onMarkAsPaid: (batch: any) => Promise<void>;
  onRowClick: (batchId: string) => void;
}) {
  const [filter, setFilter] = useState<PeriodFilter>('monthly');
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Show UNPAID and PARTIALLY_PAID (PARTIAL) batches
  const pendingBatches = useMemo(
    () =>
      filterByPeriod(
        batches.filter((b) => b.paymentStatus === 'UNPAID' || b.paymentStatus === 'PARTIAL'),
        filter,
        currentDate,
      ),
    [batches, filter, currentDate],
  );

  const totalRemaining = useMemo(
    () => pendingBatches.reduce((s, b) => s + Number(b.remainingAmount ?? b.totalAmount ?? 0), 0),
    [pendingBatches],
  );

  const totalRequestAmount = useMemo(
    () => pendingBatches.reduce((s, b) => s + Number(b.totalAmount ?? 0), 0),
    [pendingBatches],
  );

  const totalPaid = useMemo(
    () => pendingBatches.reduce((s, b) => s + Number(b.paidAmount ?? 0), 0),
    [pendingBatches],
  );

  const tableData = useMemo(
    () =>
      pendingBatches.map((b) => ({
        id: b.id,
        employeeCode: b.employee?.employeeCode || 'N/A',
        employeeName: b.employee?.users
          ? `${b.employee.users.firstName ?? ''} ${b.employee.users.lastName ?? ''}`.trim() || 'N/A'
          : 'N/A',
        totalRequests: b.totalRequests,
        totalAmount: Number(b.totalAmount || 0),
        paidAmount: Number(b.paidAmount || 0),
        remainingAmount: Number(b.remainingAmount ?? b.totalAmount ?? 0),
        paymentStatus: b.paymentStatus,
        _batch: b,
      })),
    [pendingBatches],
  );

  const handleNavigate = (dir: -1 | 1) => {
    if (filter === 'monthly') setCurrentDate((d) => d.add(dir, 'month'));
    if (filter === 'yearly') setCurrentDate((d) => d.add(dir, 'year'));
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'employeeName',
        header: 'Employee Name',
        size: 180,
        Cell: ({ renderedCellValue }: any) => (
          <span className="text-dark fw-bold fs-6">{renderedCellValue}</span>
        ),
        Footer: () => <span style={{ fontWeight: 800, color: '#0f172a' }}>TOTAL</span>,
      },
      {
        accessorKey: 'totalRequests',
        header: 'Total Requests',
        size: 130,
        Cell: ({ row, renderedCellValue }: any) => (
          <button
            className="btn btn-link p-0 fw-bold fs-7"
            style={{ textDecoration: 'none', color: '#AA393D' }}
            onClick={(e) => {
              e.stopPropagation();
              onRowClick(row.original._batch.id);
            }}
          >
            {renderedCellValue}
          </button>
        ),
      },
      {
        accessorKey: 'totalAmount',
        header: 'Total Request Amount',
        size: 130,
        Cell: ({ renderedCellValue }: any) => (
          <span className="fw-bold fs-7" style={{ color: '#475569' }}>
            {formatINR(Number(renderedCellValue))}
          </span>
        ),
        Footer: () => (
          <span style={{ color: '#475569', fontWeight: 700, fontSize: '1rem' }}>
            {formatINR(totalRequestAmount)}
          </span>
        ),
      },
      {
        accessorKey: 'paidAmount',
        header: 'Total Paid Amount',
        size: 130,
        Cell: ({ renderedCellValue }: any) => (
          <span className="fw-bold fs-7" style={{ color: '#16a34a' }}>
            {formatINR(Number(renderedCellValue))}
          </span>
        ),
        Footer: () => (
          <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '1rem' }}>
            {formatINR(totalPaid)}
          </span>
        ),
      },
      {
        accessorKey: 'remainingAmount',
        header: 'Total Remaining Amount',
        size: 145,
        Cell: ({ renderedCellValue }: any) => {
          return (
            <span className="fw-bolder fs-6" style={{ color: '#AA393D' }}>
              {formatINR(Number(renderedCellValue))}
            </span>
          );
        },
        Footer: () => (
          <span className="fw-bolder fs-6" style={{ color: '#AA393D' }}>
            {formatINR(totalRemaining)}
          </span>
        ),
      },
      {
        accessorKey: 'paymentStatus',
        header: 'Status',
        size: 130,
        enableSorting: false,
        Cell: ({ renderedCellValue }: any) => {
          if (renderedCellValue === 'PARTIAL')
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
        accessorKey: 'actions',
        header: 'Record',
        size: 120,
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }: any) => {
          const isPending = markingId === row.original.id;
          return (
            <button
              disabled={isPending}
              onClick={async (e) => {
                e.stopPropagation();
                setMarkingId(row.original.id);
                await onMarkAsPaid(row.original._batch);
                setMarkingId(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                border: '1.5px solid #d1d5db',
                background: isPending ? '#f3f4f6' : '#ffffff',
                color: isPending ? '#9ca3af' : '#374151',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.01em',
                cursor: isPending ? 'not-allowed' : 'pointer',
                boxShadow: isPending ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { if (!isPending) { e.currentTarget.style.borderColor = '#AA393D'; e.currentTarget.style.color = '#AA393D'; } }}
              onMouseLeave={(e) => { if (!isPending) { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#374151'; } }}
            >
              {isPending ? (
                <>
                  <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12, borderWidth: 2 }} />
                  Wait…
                </>
              ) : (
                <>
                  <KTIcon iconName="wallet" className="fs-7" />
                  Pay
                </>
              )}
            </button>
          );
        },
      },
    ],
    [markingId, onMarkAsPaid, onRowClick, totalRemaining, totalRequestAmount, totalPaid],
  );

  return (
    <div className="card shadow-sm">
      <div className="card-body p-6">
        <PeriodFilterBar
          filter={filter}
          date={currentDate}
          onFilterChange={(f) => {
            setFilter(f);
            setCurrentDate(dayjs());
          }}
          onNavigate={handleNavigate}
        />
        {loading ? (
          <div className="d-flex justify-content-center align-items-center py-12">
            <div className="spinner-border text-primary" role="status" />
          </div>
        ) : (
          <MaterialTable
            data={tableData}
            columns={columns}
            tableName="PendingPayments"
            showColumnFooter={true}
            enableStatusColorCoding={false}
            muiTableProps={{
              muiTableBodyRowProps: ({ row }: any) => ({
                sx: {
                  cursor: 'pointer',
                  transition: 'background-color 0.12s ease',
                  '&:hover td': { backgroundColor: '#F8FAFC' },
                },
                onClick: () => onRowClick(row.original._batch.id),
              }),
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Payment Done Table ─────────────────────────────────────────────────────────

function PaymentDoneTable({
  batches,
  loading: batchesLoading,
  onRowClick,
}: {
  batches: any[];
  loading: boolean;
  onRowClick: (batchId: string) => void;
}) {
  const [filter, setFilter] = useState<PeriodFilter>('monthly');
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const employeeMap = useMemo(() => {
    const map = new Map<string, { employeeCode: string; employeeName: string }>();
    batches.forEach((b) => {
      const empId = b.employee?.id || b.employeeId;
      if (empId) {
        map.set(empId, {
          employeeCode: b.employee?.employeeCode || 'N/A',
          employeeName: b.employee?.users
            ? `${b.employee.users.firstName ?? ''} ${b.employee.users.lastName ?? ''}`.trim() || 'N/A'
            : 'N/A',
        });
      }
    });
    return map;
  }, [batches]);

  const paidEmployeeIds = useMemo(() => {
    const ids = new Set<string>();
    batches
      .filter((b) => b.paymentStatus === 'PAID' || b.paymentStatus === 'PARTIAL')
      .forEach((b) => {
        const empId = b.employee?.id || b.employeeId;
        if (empId) ids.add(empId);
      });
    return Array.from(ids);
  }, [batches]);

  const batchMap = useMemo(() => {
    const map = new Map<string, string>();
    batches.forEach((b) => {
      if (b.id) map.set(b.id, b.submissionId || b.id);
    });
    return map;
  }, [batches]);

  const loadPayments = useCallback(async () => {
    if (!paidEmployeeIds.length) {
      setPayments([]);
      return;
    }
    setPaymentsLoading(true);
    try {
      const { startDate, endDate } = getDateRange(filter, currentDate);
      const results = await Promise.all(
        paidEmployeeIds.map((id) =>
          fetchReimbursementPayments(id, startDate, endDate)
            .then((recs: any[]) =>
              recs
                .filter((r) => r.status === 'PAID' || r.status === 'PARTIAL')
                .map((r) => {
                  const bId = r.reimbursements?.[0]?.batchId || r.batchId;
                  return {
                    ...r,
                    employeeId: id,
                    employeeCode: employeeMap.get(id)?.employeeCode || 'N/A',
                    employeeName: employeeMap.get(id)?.employeeName || 'N/A',
                    paymentMadeBy: r.processor?.users
                      ? `${r.processor.users.firstName ?? ''} ${r.processor.users.lastName ?? ''}`.trim() || 'N/A'
                      : 'N/A',
                    batchRef: bId ? (batchMap.get(bId) || r.batch?.submissionId || bId) : (r.batch?.submissionId || 'N/A'),
                    _batchId: bId || null,
                  };
                }),
            )
            .catch(() => []),
        ),
      );
      setPayments(
        results
          .flat()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      );
    } catch {
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, [paidEmployeeIds, employeeMap, batchMap, filter, currentDate]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleNavigate = (dir: -1 | 1) => {
    if (filter === 'monthly') setCurrentDate((d) => d.add(dir, 'month'));
    if (filter === 'yearly') setCurrentDate((d) => d.add(dir, 'year'));
  };

  // One row per Batch ID — each batch is a separate expandable parent row
  const batchRows = useMemo(() => {
    return filterByPeriod(
      batches.filter((b) => b.paymentStatus === 'PAID' || b.paymentStatus === 'PARTIAL'),
      filter,
      currentDate,
    ).map((b) => ({
      id: b.id,
      batchId: b.id,
      submissionId: b.submissionId || b.id,
      employeeCode: b.employee?.employeeCode || 'N/A',
      employeeName: b.employee?.users
        ? `${b.employee.users.firstName ?? ''} ${b.employee.users.lastName ?? ''}`.trim() || 'N/A'
        : 'N/A',
      totalRequests: Number(b.totalRequests ?? 0),
      totalRequestAmount: Number(b.totalAmount || 0),
      totalAmountPaid: Number(b.paidAmount || 0),
      totalRemainingAmount: Number(b.remainingAmount ?? 0),
      payments: payments.filter((p) => p._batchId === b.id),
    }));
  }, [batches, payments, filter, currentDate]);

  const columns = useMemo(() => [
    {
      accessorKey: 'submissionId',
      header: 'Batch ID',
      size: 175,
      Cell: ({ renderedCellValue }: any) => (
        <span style={{
          display: 'inline-block',
          background: '#fef2f2', color: '#AA393D',
          fontWeight: 700, fontSize: 11,
          padding: '3px 8px', borderRadius: 6,
          fontFamily: 'monospace', letterSpacing: '0.03em',
        }}>
          {renderedCellValue}
        </span>
      ),
      Footer: () => <span style={{ fontWeight: 800, color: '#0f172a' }}>TOTAL</span>,
    },
    {
      accessorKey: 'employeeName',
      header: 'Employee Name',
      size: 160,
      Cell: ({ renderedCellValue }: any) => (
        <span className="text-dark fw-bold fs-6">{renderedCellValue}</span>
      ),
    },
    {
      accessorKey: 'totalRequests',
      header: 'Total Requests',
      size: 130,
      Cell: ({ renderedCellValue }: any) => (
        <span className="fw-bold fs-7" style={{ color: '#AA393D' }}>
          {renderedCellValue}
        </span>
      ),
    },
    {
      accessorKey: 'totalRequestAmount',
      header: 'Total Request Amount',
      size: 190,
      Cell: ({ renderedCellValue }: any) => (
        <span className="fw-bold fs-7" style={{ color: '#475569' }}>
          ₹{fmtAmount(Number(renderedCellValue))}
        </span>
      ),
      Footer: ({ table }: any) => {
        const total = table.getFilteredRowModel().rows.reduce(
          (s: number, r: any) => s + Number(r.original.totalRequestAmount || 0), 0,
        );
        return (
          <span style={{ color: '#475569', fontWeight: 700, fontSize: '1rem' }}>
            {formatINR(total)}
          </span>
        );
      },
    },
    {
      accessorKey: 'totalAmountPaid',
      header: 'Total Paid Amount',
      size: 175,
      Cell: ({ renderedCellValue }: any) => (
        <span className="fw-bolder fs-6" style={{ color: '#16a34a' }}>
          ₹{fmtAmount(Number(renderedCellValue))}
        </span>
      ),
      Footer: ({ table }: any) => {
        const total = table.getFilteredRowModel().rows.reduce(
          (s: number, r: any) => s + Number(r.original.totalAmountPaid || 0), 0,
        );
        return (
          <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '1rem' }}>
            {formatINR(total)}
          </span>
        );
      },
    },
    {
      accessorKey: 'totalRemainingAmount',
      header: 'Total Remaining Amount',
      size: 210,
      Cell: ({ row, renderedCellValue }: any) => (
        <span className="fw-bolder fs-6" style={{
          color: Number(row.original.totalRemainingAmount) > 0.005 ? '#AA393D' : '#16a34a',
        }}>
          ₹{fmtAmount(Number(renderedCellValue))}
        </span>
      ),
      Footer: ({ table }: any) => {
        const total = table.getFilteredRowModel().rows.reduce(
          (s: number, r: any) => s + Number(r.original.totalRemainingAmount || 0), 0,
        );
        return (
          <span style={{ color: '#AA393D', fontWeight: 700, fontSize: '1rem' }}>
            {formatINR(total)}
          </span>
        );
      },
    },
  ], []);

  const loading = batchesLoading || paymentsLoading;

  return (
    <div className="card shadow-sm">
      <div className="card-body p-6">
        <PeriodFilterBar
          filter={filter}
          date={currentDate}
          onFilterChange={(f) => { setFilter(f); setCurrentDate(dayjs()); }}
          onNavigate={handleNavigate}
        />
        {loading ? (
          <div className="d-flex justify-content-center align-items-center py-12">
            <div className="spinner-border text-primary" role="status" />
          </div>
        ) : (
          <MaterialTable
            data={batchRows}
            columns={columns}
            tableName="PaymentDone"
            showColumnFooter={true}
            enableStatusColorCoding={false}
            renderDetailPanel={({ row }: any) => {
              const rowPayments: any[] = row.original.payments || [];
              if (rowPayments.length === 0) {
                return (
                  <div style={{
                    padding: '20px 24px',
                    backgroundColor: '#fafafa',
                    borderTop: '1px solid #e0e0e0',
                    color: '#9e9e9e',
                    fontSize: 13,
                    fontStyle: 'italic',
                  }}>
                    No payment records found for this period.
                  </div>
                );
              }

              const detailHeaders = [
                { label: 'Payment Date', width: '28%' },
                { label: 'Payment Made By', width: '28%' },
                { label: 'Method', width: '22%' },
                { label: 'Amount Paid', width: '22%' },
              ];

              return (
                <div style={{ backgroundColor: '#f5f5f5', borderTop: '2px solid #e0e0e0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#eeeeee' }}>
                        {detailHeaders.map(({ label, width }) => (
                          <th
                            key={label}
                            style={{
                              width,
                              padding: '9px 16px',
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#616161',
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                              textAlign: 'left',
                              whiteSpace: 'nowrap',
                              borderBottom: '1px solid #e0e0e0',
                              borderRight: '1px solid #e0e0e0',
                            }}
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rowPayments.map((p: any, i: number) => (
                        <tr
                          key={i}
                          style={{
                            backgroundColor: '#ffffff',
                            borderBottom: '1px solid #eeeeee',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                        >
                          <td style={{ padding: '10px 16px', borderRight: '1px solid #eeeeee' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 30, height: 30, borderRadius: 6,
                                backgroundColor: '#e8f5e9', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <KTIcon iconName="calendar-8" className="fs-5 text-success" />
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#212121' }}>
                                {fmtDate(p.paymentDate)}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 16px', borderRight: '1px solid #eeeeee' }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#424242' }}>
                              {p.paymentMadeBy || 'N/A'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 16px', borderRight: '1px solid #eeeeee' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: '0.04em',
                              backgroundColor: '#e3f2fd',
                              color: '#1565c0',
                              textTransform: 'uppercase',
                            }}>
                              {String(p.paymentMethod || 'CASH').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#2e7d32' }}>
                              {formatINR(Number(p.amountPaid || 0))}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }}
            muiTableProps={{
              muiTableBodyRowProps: ({ row }: any) => ({
                onClick: () => onRowClick(row.original.batchId),
                sx: { cursor: 'pointer', '&:hover td': { backgroundColor: '#F8FAFC' } },
              }),
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Mark as Paid Modal ─────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'UPI', label: 'UPI' },
];

function MarkAsPaidModal({
  batch,
  onClose,
  onConfirm,
}: {
  batch: any | null;
  onClose: () => void;
  onConfirm: (method: string, date: string, amount: number) => Promise<void>;
}) {
  const [date, setDate] = useState<dayjs.Dayjs>(dayjs());
  const [method, setMethod] = useState('CASH');
  const [amountEditing, setAmountEditing] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [editedAmount, setEditedAmount] = useState(0);
  const [amountError, setAmountError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalAmount = batch ? Number(batch.totalAmount || 0) : 0;
  const paidAmount = batch ? Number(batch.paidAmount || 0) : 0;
  const remainingAmount = batch ? Number(batch.remainingAmount ?? (totalAmount - paidAmount)) : 0;

  useEffect(() => {
    if (batch) {
      setEditedAmount(remainingAmount);
      setAmountInput(String(remainingAmount));
      setDate(dayjs());
      setMethod('CASH');
      setAmountEditing(false);
      setAmountError('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch]);

  const employeeName = batch?.employee?.users
    ? `${batch.employee.users.firstName ?? ''} ${batch.employee.users.lastName ?? ''}`.trim()
    : 'N/A';

  const handleAmountSave = () => {
    const val = Number(amountInput);
    if (isNaN(val) || val <= 0) {
      setAmountError('Enter a valid amount greater than 0');
      return;
    }
    if (val > remainingAmount + 0.005) {
      setAmountError(`Amount cannot exceed remaining balance of ₹${fmtAmount(remainingAmount)}`);
      return;
    }
    setEditedAmount(val);
    setAmountEditing(false);
    setAmountError('');
  };

  const handleAmountCancel = () => {
    setAmountInput(String(editedAmount));
    setAmountEditing(false);
    setAmountError('');
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(method, date.format('YYYY-MM-DD'), editedAmount);
    } finally {
      setSubmitting(false);
    }
  };

  const isPartial = editedAmount < remainingAmount - 0.005;

  return (
    <Modal show={!!batch} onHide={onClose} centered>
      {/* ── Header ── */}
      <Modal.Header
        closeButton
        className="px-7 pt-6 pb-4"
        style={{ borderBottom: '1.5px solid #f1f5f9' }}
      >
        <div className="d-flex align-items-center gap-3">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #AA393D 0%, #c94c50 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(170,57,61,0.25)',
            }}
          >
            <KTIcon iconName="wallet" className="fs-2 text-white" />
          </div>
          <div>
            <div className="fw-bolder fs-4 text-gray-900 lh-sm">Mark as Paid</div>
            <div className="text-muted fs-8 fw-semibold mt-1">Confirm and record payment for this batch</div>
          </div>
        </div>
      </Modal.Header>

      {/* ── Body ── */}
      <Modal.Body className="px-7 py-6">

        {/* Payment Date */}
        <div className="mb-6">
          <label className="fs-6 fw-semibold text-gray-700 mb-2 d-block">
            Payment Date <span className="text-danger">*</span>
          </label>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              value={date}
              onChange={(v) => { if (v && v.isValid()) setDate(v); }}
              format="DD/MM/YYYY"
              maxDate={dayjs()}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                  sx: {
                    '& .MuiInputBase-input': { fontSize: '0.9rem', paddingLeft: '14px' },
                    '& .MuiOutlinedInput-root': {
                      height: '44px',
                      borderRadius: '8px',
                      backgroundColor: '#fff',
                      '& fieldset': { borderColor: '#e2e8f0', borderWidth: '1.5px' },
                      '&:hover fieldset': { borderColor: '#AA393D' },
                      '&.Mui-focused fieldset': { borderColor: '#AA393D', borderWidth: '2px' },
                    },
                  },
                },
              }}
            />
          </LocalizationProvider>
        </div>

        {/* ── Payment Summary Card ── */}
        <div
          className="rounded-3 mb-6 overflow-hidden"
          style={{ border: '1.5px solid #e2e8f0' }}
        >
          {/* Card label band */}
          <div
            className="px-4 py-2 d-flex align-items-center gap-2"
            style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}
          >
            <KTIcon iconName="receipt-square" className="fs-6 text-muted" />
            <span className="fs-8 fw-bolder text-muted text-uppercase" style={{ letterSpacing: '0.06em' }}>
              Payment Summary
            </span>
          </div>

          {/* Batch row */}
          <div
            className="px-4 py-3 d-flex justify-content-between align-items-center"
            style={{ borderBottom: '1px solid #f1f5f9' }}
          >
            <span className="fs-7 text-muted fw-semibold d-flex align-items-center gap-2">
              <KTIcon iconName="document" className="fs-6 text-gray-400" />
              Batch
            </span>
            <span
              className="fs-8 fw-bolder px-3 py-1 rounded-pill"
              style={{ background: '#fef2f2', color: '#AA393D', fontFamily: 'monospace', letterSpacing: '0.03em' }}
            >
              {batch?.submissionId || batch?.id || 'N/A'}
            </span>
          </div>

          {/* Employee row */}
          <div
            className="px-4 py-3 d-flex justify-content-between align-items-center"
            style={{ borderBottom: '1px solid #f1f5f9' }}
          >
            <span className="fs-7 text-muted fw-semibold d-flex align-items-center gap-2">
              <KTIcon iconName="user" className="fs-6 text-gray-400" />
              Employee
            </span>
            <span className="fs-7 fw-bold text-gray-800">{employeeName}</span>
          </div>

          {/* Total Amount row */}
          <div
            className="px-4 py-3 d-flex justify-content-between align-items-center"
            style={{ borderBottom: '1px solid #f1f5f9' }}
          >
            <span className="fs-7 text-muted fw-semibold d-flex align-items-center gap-2">
              <KTIcon iconName="dollar" className="fs-6 text-gray-400" />
              Total Amount
            </span>
            <span className="fs-7 fw-bold text-gray-700">₹{fmtAmount(totalAmount)}</span>
          </div>

          {/* Already Paid row — only if there are prior partial payments */}
          {paidAmount > 0 && (
            <div
              className="px-4 py-3 d-flex justify-content-between align-items-center"
              style={{ borderBottom: '1px solid #f1f5f9' }}
            >
              <span className="fs-7 text-muted fw-semibold d-flex align-items-center gap-2">
                <KTIcon iconName="check-circle" className="fs-6 text-gray-400" />
                Already Paid
              </span>
              <span className="fs-7 fw-bold" style={{ color: '#16a34a' }}>₹{fmtAmount(paidAmount)}</span>
            </div>
          )}

          {/* Remaining Balance row */}
          <div className="px-4 py-3 d-flex justify-content-between align-items-center">
            <span className="fs-7 text-muted fw-semibold d-flex align-items-center gap-2">
              <KTIcon iconName="wallet" className="fs-6 text-gray-400" />
              Remaining Balance
            </span>
            <span className="fs-7 fw-bolder" style={{ color: '#AA393D' }}>₹{fmtAmount(remainingAmount)}</span>
          </div>
        </div>

        {/* ── Payment Amount – editable field ── */}
        <div className="mb-6">
          <label className="fs-6 fw-semibold text-gray-700 mb-2 d-block">
            Payment Amount <span className="text-danger">*</span>
            {isPartial && editedAmount > 0 && (
              <span
                className="ms-2 badge badge-light-info text-info fw-bold fs-9"
                style={{ verticalAlign: 'middle' }}
              >
                Partial Payment
              </span>
            )}
          </label>

          {amountEditing ? (
            /* ── Edit mode ── */
            <div>
              <div className="d-flex align-items-center gap-2">
                <div
                  className="d-flex align-items-center flex-grow-1 overflow-hidden"
                  style={{
                    border: '1.5px solid #AA393D',
                    borderRadius: 8,
                    background: '#fff',
                    height: 44,
                  }}
                >
                  <span
                    className="d-flex align-items-center justify-content-center px-3 fs-6 fw-bolder flex-shrink-0"
                    style={{
                      background: '#fef2f2',
                      borderRight: '1.5px solid #e2e8f0',
                      color: '#AA393D',
                      height: '100%',
                      minWidth: 36,
                    }}
                  >
                    ₹
                  </span>
                  <input
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      padding: '0 12px',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: '#1e293b',
                      height: '100%',
                      background: 'transparent',
                    }}
                    type="text"
                    inputMode="decimal"
                    value={amountInput}
                    autoFocus
                    onChange={(e) => {
                      if (/^\d*\.?\d*$/.test(e.target.value)) {
                        setAmountInput(e.target.value);
                        setAmountError('');
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAmountSave();
                      if (e.key === 'Escape') handleAmountCancel();
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-icon btn-active-color-primary btn-sm"
                  title="Save (Enter)"
                  onClick={handleAmountSave}
                >
                  <img src={toAbsoluteUrl('media/svg/misc/tick.svg')} alt="Save" />
                </button>
                <button
                  type="button"
                  className="btn btn-icon btn-active-color-primary btn-sm"
                  title="Cancel (Esc)"
                  onClick={handleAmountCancel}
                >
                  <img src={toAbsoluteUrl('media/svg/misc/cross.svg')} alt="Cancel" />
                </button>
              </div>
              {amountError && (
                <div className="text-danger fs-8 fw-semibold mt-1">{amountError}</div>
              )}
              <div className="text-muted fs-9 mt-1">
                Maximum payable: ₹{fmtAmount(remainingAmount)}
              </div>
            </div>
          ) : (
            /* ── View mode ── */
            <div
              className="d-flex align-items-center overflow-hidden"
              style={{
                border: '1.5px solid #e2e8f0',
                borderRadius: 8,
                background: '#f8fafc',
                height: 44,
                cursor: 'default',
              }}
            >
              <span
                className="d-flex align-items-center justify-content-center px-3 fs-6 fw-bolder flex-shrink-0"
                style={{
                  background: '#f1f5f9',
                  borderRight: '1.5px solid #e2e8f0',
                  color: '#AA393D',
                  height: '100%',
                  minWidth: 36,
                }}
              >
                ₹
              </span>
              <span
                className="flex-grow-1 px-3 fs-6 fw-bolder"
                style={{ color: '#AA393D' }}
              >
                {fmtAmount(editedAmount)}
              </span>
              <button
                type="button"
                className="btn btn-icon btn-sm p-0 d-flex align-items-center justify-content-center flex-shrink-0 me-2"
                style={{ width: 32, height: 32, borderRadius: '50%', background: '#fff', border: '1.5px solid #e2e8f0' }}
                title="Edit Amount"
                onClick={() => { setAmountInput(String(editedAmount)); setAmountEditing(true); }}
              >
                <KTIcon iconName="pencil" className="fs-6 text-gray-500" />
              </button>
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <label className="fs-6 fw-semibold text-gray-700 mb-2 d-block">
            Payment Method <span className="text-danger">*</span>
          </label>
          <select
            className="form-select"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            style={{
              height: '44px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              border: '1.5px solid #e2e8f0',
              color: '#3f4254',
              fontWeight: 500,
              cursor: 'pointer',
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23AA393D' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`,
            }}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </Modal.Body>

      {/* ── Footer ── */}
      <Modal.Footer
        className="px-7 pb-6 pt-4 d-flex gap-3 justify-content-end"
        style={{ borderTop: '1.5px solid #f1f5f9' }}
      >
        <button
          className="btn btn-sm fw-bold px-7 py-2 rounded-2"
          style={{ background: '#f8fafc', color: '#5e6278', border: '1.5px solid #e2e8f0' }}
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          className="btn btn-sm fw-bold px-8 py-2 rounded-2 d-inline-flex align-items-center gap-2"
          style={{
            background: submitting || amountEditing || editedAmount <= 0
              ? '#e9b4b6'
              : 'linear-gradient(135deg, #AA393D 0%, #c94c50 100%)',
            border: 'none',
            color: '#fff',
            boxShadow: submitting || amountEditing || editedAmount <= 0
              ? 'none'
              : '0 4px 12px rgba(170,57,61,0.30)',
            transition: 'all 0.15s ease',
          }}
          onClick={handleConfirm}
          disabled={submitting || amountEditing || editedAmount <= 0}
        >
          {submitting ? (
            <>
              <span className="spinner-border spinner-border-sm" />
              Processing...
            </>
          ) : (
            <>
              <KTIcon iconName="check" className="fs-5" />
              {isPartial ? 'Record Partial Payment' : 'Confirm Payment'}
            </>
          )}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

// ── Main PaymentTab ────────────────────────────────────────────────────────────

function PaymentTab() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailBatchId, setDetailBatchId] = useState<string | null>(null);
  const [detailApprovalInstanceId, setDetailApprovalInstanceId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [markAsPaidBatch, setMarkAsPaidBatch] = useState<any | null>(null);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchReimbursementBatches();
      const allBatches: any[] = res?.data?.batches || res?.batches || [];
      const approvedBatches = allBatches.filter(
        (b: any) => resolveStatusNum(b.status) === 1,
      );

      const detailResults = await Promise.all(
        approvedBatches.map((b: any) =>
          fetchReimbursementBatchById(b.id)
            .then((r: any) => ({ id: b.id, batch: r?.data?.batch || r?.batch || null }))
            .catch(() => ({ id: b.id, batch: null })),
        ),
      );

      const paymentStatusMap: Record<string, string> = {};
      const reimbursementIdsMap: Record<string, string[]> = {};
      const approvedTotalAmountMap: Record<string, number> = {};
      const paidAmountMap: Record<string, number> = {};

      for (const { id, batch } of detailResults) {
        if (!batch) continue;
        const items: any[] = batch.reimbursements || [];
        const approvedItems = items.filter((r: any) => resolveStatusNum(r.status) === 1);
        reimbursementIdsMap[id] = approvedItems.map((r: any) => r.id);
        approvedTotalAmountMap[id] = approvedItems.reduce(
          (sum: number, r: any) => sum + Number(r.amount || 0),
          0,
        );

        // Compute paidAmount from the batch's payment records (included in getById response)
        const batchPayments: any[] = batch.payments || [];
        const paidAmount = batchPayments
          .filter((p: any) => p.status === 'PAID' || p.status === 'PARTIAL')
          .reduce((sum: number, p: any) => sum + Number(p.amountPaid || 0), 0);
        paidAmountMap[id] = paidAmount;

        // Derive payment status from individual reimbursement paymentStatus fields
        const paidCount = approvedItems.filter(
          (r: any) => r.paymentStatus === 'PAID',
        ).length;
        const partialCount = approvedItems.filter(
          (r: any) => r.paymentStatus === 'PARTIAL',
        ).length;

        if (approvedItems.length > 0 && paidCount === approvedItems.length) {
          paymentStatusMap[id] = 'PAID';
        } else if (partialCount > 0 || paidCount > 0) {
          paymentStatusMap[id] = 'PARTIAL';
        } else {
          paymentStatusMap[id] = 'UNPAID';
        }
      }

      const enriched = approvedBatches.map((b: any) => {
        const totalAmount = approvedTotalAmountMap[b.id] ?? Number(b.totalAmount || 0);
        const paidAmount = paidAmountMap[b.id] ?? 0;
        const remainingAmount = totalAmount - paidAmount;
        return {
          ...b,
          paymentStatus: paymentStatusMap[b.id] ?? 'UNPAID',
          approvedReimbursementIds: reimbursementIdsMap[b.id] ?? [],
          totalAmount,
          paidAmount,
          remainingAmount,
        };
      });

      setBatches(enriched);
    } catch {
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [refreshKey]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Refresh when any payment or reimbursement changes on any connected client (WebSocket)
  useEventBus(EVENT_KEYS.reimbursementChanged, () => { setRefreshKey((k) => k + 1); });

  const handleRowClick = (batchId: string) => {
    const batch = batches.find((b) => b.id === batchId);
    setDetailApprovalInstanceId(batch?.approvalInstanceId ?? null);
    setDetailBatchId(batchId);
  };

  const handleMarkAsPaid = async (batch: any) => {
    setMarkAsPaidBatch(batch);
  };

  const handlePaymentConfirm = async (paymentMethod: string, paymentDate: string, amount: number) => {
    const batch = markAsPaidBatch;
    const reimbursementIds: string[] = batch.approvedReimbursementIds ?? [];
    if (!reimbursementIds.length) {
      setMarkAsPaidBatch(null);
      Swal.fire('Error', 'No approved reimbursements found in this batch.', 'error');
      return;
    }
    const remaining = Number(batch.remainingAmount ?? batch.totalAmount ?? 0);
    const isPartial = amount < remaining - 0.005;

    try {
      await createReimbursementPayment({
        employeeId: batch.employee?.id || batch.employeeId,
        batchId: batch.id,
        amountPaid: amount,
        paymentDate,
        paymentMethod,
        reimbursementIds,
      });
      setMarkAsPaidBatch(null);
      setRefreshKey((k) => k + 1);
      Swal.fire({
        title: isPartial ? 'Partial Payment Recorded!' : 'Payment Recorded!',
        text: isPartial
          ? `₹${amount.toLocaleString('en-IN')} recorded. Remaining balance: ₹${(remaining - amount).toLocaleString('en-IN')}.`
          : 'The batch has been fully paid.',
        icon: 'success',
        confirmButtonColor: '#AA393D',
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to record payment. Please try again.';
      Swal.fire('Error', msg, 'error');
    }
  };

  const pendingCount = batches.filter(
    (b) => b.paymentStatus === 'UNPAID' || b.paymentStatus === 'PARTIAL',
  ).length;

  return (
    <div>
      {/* Pending Payment — only shown when there are pending entries */}
      {!loading && pendingCount > 0 && (
        <div className="mb-8">
          <div className="d-flex align-items-center gap-3 mb-4">
            <h2 className="fw-bold fs-3 mb-0">Pending Payment</h2>
            <span
              className="badge fw-bold fs-8 px-3 py-2"
              style={{ backgroundColor: '#fef3c7', color: '#92400e', borderRadius: 6 }}
            >
              {pendingCount}
            </span>
          </div>
          <PendingPaymentTable
            batches={batches}
            loading={loading}
            onMarkAsPaid={handleMarkAsPaid}
            onRowClick={handleRowClick}
          />
        </div>
      )}

      {/* Payment Done — always shown */}
      <div>
        <h2 className="fw-bold fs-3 mb-4">Payment Done</h2>
        <PaymentDoneTable
          batches={batches}
          loading={loading}
          onRowClick={handleRowClick}
        />
      </div>

      <BatchDetailModal
        batchId={detailBatchId}
        onClose={() => setDetailBatchId(null)}
        onBatchActionDone={() => setRefreshKey((k) => k + 1)}
        approvalInstanceId={detailApprovalInstanceId}
        filterStatus={1}
      />

      <MarkAsPaidModal
        batch={markAsPaidBatch}
        onClose={() => setMarkAsPaidBatch(null)}
        onConfirm={handlePaymentConfirm}
      />
    </div>
  );
}

export default PaymentTab;
