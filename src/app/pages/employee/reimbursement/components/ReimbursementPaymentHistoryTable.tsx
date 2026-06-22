import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import dayjs from 'dayjs';
import { IReimbursementPayment } from '@models/employee';
import { fetchReimbursementPayments, deleteReimbursementPaymentById } from '@services/employee';
import Swal from 'sweetalert2';
import DateSelector from '@components/DateSelector';

type PeriodFilter = 'monthly' | 'yearly' | 'allTime';

interface ReimbursementPaymentHistoryTableProps {
    employeeId: string;
    onPaymentDeleted?: () => void;
    onEditPayment?: (payment: IReimbursementPayment) => void;
    onRecordPayout?: () => void;
    onAdvancePayment?: () => void;
    refreshKey?: number;
}

const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const getStatusBadge = (payment: IReimbursementPayment) => {
    if (payment.status === 'ADVANCE') {
        return <Badge bg="light-warning" className="text-warning fw-bold px-4 py-2">Advance Paid</Badge>;
    }
    const paid = Number(payment.amountPaid);
    const total = Number(payment.totalAmount);
    if (paid > total) {
        return <Badge bg="light-info" className="text-info fw-bold px-4 py-2">Paid Extra</Badge>;
    }
    if (paid >= total) {
        return <Badge bg="light-success" className="text-success fw-bold px-4 py-2">Full Paid</Badge>;
    }
    if (paid > 0) {
        return <Badge bg="light-warning" className="text-warning fw-bold px-4 py-2">Partially Paid</Badge>;
    }
    return <Badge bg="light-danger" className="text-danger fw-bold px-4 py-2">Unpaid</Badge>;
};

const ReimbursementPaymentHistoryTable: React.FC<ReimbursementPaymentHistoryTableProps> = ({
    employeeId,
    onPaymentDeleted,
    onEditPayment,
    onRecordPayout,
    onAdvancePayment,
    refreshKey,
}) => {
    const [filter, setFilter] = useState<PeriodFilter>('monthly');
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [payments, setPayments] = useState<IReimbursementPayment[]>([]);
    const [loading, setLoading] = useState(false);

    const getDateRange = useCallback(() => {
        if (filter === 'monthly') {
            return {
                startDate: currentDate.startOf('month').toISOString(),
                endDate: currentDate.endOf('month').toISOString(),
            };
        }
        if (filter === 'yearly') {
            return {
                startDate: currentDate.startOf('year').toISOString(),
                endDate: currentDate.endOf('year').toISOString(),
            };
        }
        return { startDate: undefined, endDate: undefined };
    }, [filter, currentDate]);

    const loadPayments = useCallback(async () => {
        if (!employeeId) return;
        setLoading(true);
        try {
            const { startDate, endDate } = getDateRange();
            const data: IReimbursementPayment[] = await fetchReimbursementPayments(employeeId, startDate, endDate);
            setPayments(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch {
            setPayments([]);
        } finally {
            setLoading(false);
        }
    }, [employeeId, getDateRange]);

    useEffect(() => {
        loadPayments();
    }, [loadPayments, refreshKey]);

    const handleDelete = async (payment: IReimbursementPayment) => {
        const result = await Swal.fire({
            title: 'Delete Payment Record?',
            text: 'This will revert all linked reimbursements back to Unpaid status.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete',
            confirmButtonColor: '#AA393D',
            cancelButtonText: 'Cancel',
        });
        if (!result.isConfirmed) return;
        try {
            await deleteReimbursementPaymentById(payment.id);
            await loadPayments();
            onPaymentDeleted?.();
        } catch {
            Swal.fire('Error', 'Failed to delete payment record.', 'error');
        }
    };

    const periodLabel = filter === 'monthly'
        ? currentDate.format('MMM YYYY')
        : filter === 'yearly'
            ? currentDate.format('YYYY')
            : 'All Time';

    const navigate = (dir: -1 | 1) => {
        if (filter === 'monthly') setCurrentDate(d => d.add(dir, 'month'));
        if (filter === 'yearly') setCurrentDate(d => d.add(dir, 'year'));
    };

    const handleFilterChange = (_: React.MouseEvent<HTMLElement>, newFilter: PeriodFilter | null) => {
        if (!newFilter) return;
        setFilter(newFilter);
        setCurrentDate(dayjs());
    };

    return (
        <div className="mt-10">
            <div className="d-flex justify-content-between align-items-center mb-6">
                <h2 className="mb-0">Reimbursement Payment History</h2>
                <div className="d-flex align-items-center gap-3">
                    {onAdvancePayment && (
                        <Button
                            className="btn btn-sm fw-bold d-inline-flex align-items-center px-4 py-2 rounded-2 shadow-sm"
                            onClick={onAdvancePayment}
                            style={{ backgroundColor: '#AA393D', borderColor: '#AA393D', color: '#fff' }}
                        >
                            <KTIcon iconName="plus" className="fs-3 me-2" />
                            Advance Payment
                        </Button>
                    )}
                    {onRecordPayout && (
                        <Button
                            className="btn btn-sm fw-bold d-inline-flex align-items-center px-4 py-2 rounded-2 shadow-sm"
                            onClick={onRecordPayout}
                            style={{ backgroundColor: '#AA393D', borderColor: '#AA393D', color: '#fff' }}
                        >
                            <KTIcon iconName="plus" className="fs-3 me-2" />
                            Record Reimbursement Payout
                        </Button>
                    )}
                </div>
            </div>
            <div className="card shadow-sm">
                <div className="card-body p-6">
                    {/* Toggle + Period Nav — matches Reimbursement Records style */}
                    <div className="d-flex flex-md-row flex-column justify-content-lg-between align-items-lg-center gap-5 gap-lg-0 mb-6">
                        <ToggleButtonGroup
                            className="flex flex-wrap gap-5"
                            value={filter}
                            exclusive
                            onChange={handleFilterChange}
                            aria-label="payment history period"
                            sx={{
                                '& .MuiToggleButton-root': {
                                    borderRadius: '20px',
                                    borderColor: '#A0B4D2 !important',
                                    color: '#000000 !important',
                                    paddingX: { xs: '0px', md: '20px' },
                                    borderWidth: '2px',
                                    fontWeight: '600',
                                    width: 'auto',
                                    minWidth: { xs: '65px', sm: '75px' },
                                    fontSize: { xs: '10px', sm: '12px' },
                                    height: { xs: '30px', sm: '36px' },
                                    fontFamily: 'Inter',
                                    textTransform: 'none',
                                },
                                '& .Mui-selected': {
                                    borderColor: '#9D4141 !important',
                                    color: '#9D4141 !important',
                                },
                                '& .MuiToggleButton-root:hover': {
                                    borderColor: '#9D4141 !important',
                                    color: '#9D4141 !important',
                                },
                            }}
                        >
                            <ToggleButton value="monthly">Monthly</ToggleButton>
                            <ToggleButton value="yearly">Yearly</ToggleButton>
                            <ToggleButton value="allTime">All Time</ToggleButton>
                        </ToggleButtonGroup>

                        {filter !== 'allTime' && (
                            <DateSelector
                                onPrevious={() => navigate(-1)}
                                onNext={() => navigate(1)}
                                displayValue={periodLabel}
                            />
                        )}
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="d-flex justify-content-center align-items-center py-12">
                            <div className="spinner-border text-primary" role="status" />
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-row-dashed table-row-gray-300 align-middle gs-0 gy-4">
                                <thead>
                                    <tr className="fw-bold text-muted bg-light">
                                        <th className="ps-4 rounded-start">Payment Date</th>
                                        <th>Payment Made By</th>
                                        <th className="text-center">Method</th>
                                        <th className="text-end">Net Payable</th>
                                        <th className="text-end">Paid</th>
                                        <th className="text-end">Remaining</th>
                                        <th className="text-center">Status</th>
                                        <th>Ref / Notes</th>
                                        <th className="text-center rounded-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="text-center py-10">
                                                <div className="d-flex flex-column align-items-center">
                                                    <KTIcon iconName="cloud-change" className="fs-3x text-muted mb-3" />
                                                    <span className="text-gray-400 fw-bold fs-6">
                                                        No payment records found for this period
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        payments.map((payment) => {
                                            const paid = Number(payment.amountPaid);
                                            const total = Number(payment.totalAmount);
                                            const remaining = total - paid;
                                            return (
                                                <tr key={payment.id}>
                                                    <td className="ps-4">
                                                        <div className="d-flex align-items-center">
                                                            <div className="symbol symbol-35px me-3">
                                                                <div className="symbol-label bg-light-primary text-primary">
                                                                    <KTIcon iconName="calendar-8" className="fs-2 text-primary" />
                                                                </div>
                                                            </div>
                                                            <div className="d-flex flex-column">
                                                                <span className="text-dark fw-bold text-hover-primary fs-6 me-2">
                                                                    {dayjs(payment.paymentDate).format('DD MMM YYYY')}
                                                                </span>
                                                                {payment.status === 'ADVANCE' ? (
                                                                    <Badge bg="light-warning" className="text-warning fs-9 py-1 px-2 w-fit">
                                                                        ADVANCE REIMBURSEMENT
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge bg="light-info" className="text-info fs-9 py-1 px-2 w-fit">
                                                                        REIMBURSEMENT
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {payment.processor?.users ? (
                                                            <span className="text-gray-800 fw-semibold fs-7">
                                                                {[payment.processor.users.firstName, payment.processor.users.lastName].filter(Boolean).join(' ') || '—'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted">—</span>
                                                        )}
                                                    </td>
                                                    <td className="text-center">
                                                        <Badge bg="light-primary" className="text-primary fw-bold">
                                                            {(payment.paymentMethod ?? 'CASH').replace(/_/g, ' ')}
                                                        </Badge>
                                                    </td>
                                                    <td className="text-end">
                                                        <span className="fw-bolder fs-6 text-primary">
                                                            {formatINR(total)}
                                                        </span>
                                                    </td>
                                                    <td className="text-end">
                                                        <span className="text-success fw-bold fs-6">
                                                            {formatINR(paid)}
                                                        </span>
                                                    </td>
                                                    <td className="text-end">
                                                        {remaining < 0 ? (
                                                            <span className="fw-bold fs-6 text-info">
                                                                {formatINR(Math.abs(remaining))}{' '}
                                                                <span className="fs-8 fw-semibold">extra</span>
                                                            </span>
                                                        ) : (
                                                            <span className={`fw-bold fs-6 ${remaining === 0 ? 'text-success' : 'text-danger'}`}>
                                                                {formatINR(remaining)}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="text-center">
                                                        {getStatusBadge(payment)}
                                                    </td>
                                                    <td style={{ minWidth: 140, maxWidth: 220 }}>
                                                        <div className="d-flex flex-column gap-1">
                                                            {payment.transactionId && (
                                                                <span
                                                                    className="text-gray-800 fw-semibold fs-7"
                                                                    title={payment.transactionId}
                                                                >
                                                                    {payment.transactionId}
                                                                </span>
                                                            )}
                                                            {payment.remarks && (
                                                                <span
                                                                    className="text-gray-600 fw-semibold fs-7"
                                                                    style={{ wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.4' }}
                                                                    title={payment.remarks}
                                                                >
                                                                    {payment.remarks}
                                                                </span>
                                                            )}
                                                            {!payment.transactionId && !payment.remarks && (
                                                                <span className="text-gray-500 fw-semibold fs-7">--</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="d-flex justify-content-center gap-2">
                                                            <Button
                                                                variant="light-primary"
                                                                className="btn-icon btn-sm"
                                                                title="Edit payment"
                                                                onClick={() => onEditPayment?.(payment)}
                                                            >
                                                                <KTIcon iconName="pencil" className="fs-3" />
                                                            </Button>
                                                            <Button
                                                                variant="light-danger"
                                                                className="btn-icon btn-sm"
                                                                title="Delete payment"
                                                                onClick={() => handleDelete(payment)}
                                                            >
                                                                <KTIcon iconName="trash" className="fs-3" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReimbursementPaymentHistoryTable;
