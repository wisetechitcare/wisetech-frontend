import React, { useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import dayjs from 'dayjs';
import { saveToggleChange } from '@redux/slices/attendanceStats';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { toast } from 'react-toastify';
import { PayrollService } from '../services/payroll.service';
import { payrollService } from '../services/payrollService';
import { parseCurrencyString } from '../utils/payrollFormatters';

export const useSalaryReport = () => {
    const dispatch = useDispatch();
    const toggleChange = useSelector((state: RootState) => state.attendanceStats.toggleChange);

    // Modal states
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showGrossModal, setShowGrossModal] = useState(false);
    const [showDeductionModal, setShowDeductionModal] = useState(false);
    const [showIncrementModal, setShowIncrementModal] = useState(false);
    
    const [editMode, setEditMode] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleRefresh = useCallback((onSuccess?: () => void) => {
        dispatch(saveToggleChange(!toggleChange));
        if (onSuccess) {
            console.log('🔄 [useSalaryReport] Calling onSuccess callback after refresh');
            onSuccess();
        }
    }, [dispatch, toggleChange]);

    const handlePaymentEdit = (payment?: any) => {
        setSelectedPayment(payment || null);
        setEditMode(!!payment);
        setShowPaymentModal(true);
    };

    const handleDeletePayment = async (payment: any, onRefreshCallback?: () => void) => {
        try {
            if (!payment?.id) {
                throw new Error('Missing payment id');
            }
            const idStr = String(payment.id);

            // Resolve the id the backend can actually delete:
            //  - Real history payments:  "payment_<ts>_<rand>"  → removed from paymentHistoryJson
            //  - Real government payments: a plain UUID          → removed from governmentPayments
            //  - Derived/legacy rows:    "<masterId>-legacy-salary" | "<masterId>-legacy-gov"
            //                            | "<masterId>-SALARY-<date>" | "<masterId>-GOVERNMENT-<date>"
            //    These have no standalone DB row, so strip the suffix and reset the salary master.
            let deleteId = idStr;
            if (!idStr.startsWith('payment_')) {
                const derived = idStr.match(/^(.+?)-(?:legacy-(?:salary|gov)|SALARY|GOVERNMENT)\b/);
                if (derived) deleteId = derived[1];
            }

            console.log('🗑️ [DeletePayment] row id:', idStr, '→ backend id:', deleteId);
            const response = await payrollService.deletePayment(deleteId);
            console.log('🗑️ [DeletePayment] API response:', response);

            successConfirmation('Payment deleted successfully');
            handleRefresh(onRefreshCallback);
        } catch (error) {
            console.error('❌ [DeletePayment] failed:', error);
            errorConfirmation('Failed to delete payment');
        }
    };

    const handlePaymentSubmit = async (
        values: any,
        salaryId: string | undefined,
        employeeId: string,
        month: string | number,
        year: string | number,
        companyId: string | undefined,
        onSuccess?: () => void
    ) => {
        try {
            setLoading(true);
            const { paymentType, salaryAmount, govtDeductions, paidAt, paymentMethod, transactionId, remarks, _netSalary, _salaryPaid, sendEmail } = values;

            const editingId = values.id ? String(values.id) : '';
            // Real salary payments live inside paymentHistoryJson with "payment_*" ids.
            // The backend appends on record (it never replaces by id), so to EDIT one we
            // delete the original transaction first and then re-record the new values.
            const isHistoryPayment = editingId.startsWith('payment_');
            if (editMode && isHistoryPayment) {
                try {
                    console.log('✏️ [PaymentSubmit] replacing history payment, removing original:', editingId);
                    await payrollService.deletePayment(editingId);
                } catch (e) {
                    console.warn('⚠️ [PaymentSubmit] failed to remove original before edit:', e);
                }
            }

            // History edits are re-created as a fresh entry (new payment_ id).
            // Government payments (real UUID) keep their id so the backend updates in place.
            const paymentId = isHistoryPayment ? undefined : (values.id || undefined);

            const basePayload = {
                id: paymentId || undefined,
                salaryId,
                employeeId,
                month: Number(month),
                year: Number(year),
                companyId,
                paymentDate: paidAt,
                paymentMethod,
                transactionId,
                remarks,
                skipEmail: sendEmail === false,
            };

            // 1. Process Salary Payment
            let emailNotification: { sent: boolean; to: string; type: string; error?: string } | null = null;

            if (paymentType === 'SALARY' || paymentType === 'COMBINED') {
                const amount = typeof salaryAmount === 'string' ? parseCurrencyString(salaryAmount) : Number(salaryAmount);
                if (amount > 0) {
                    const res = await payrollService.recordPayment({
                        ...basePayload,
                        amount: amount,
                        paymentType: 'SALARY',
                        netSalary:       _netSalary  ?? 0,
                        totalPaidBefore: _salaryPaid ?? 0,
                    });
                    emailNotification = res?.data?.emailNotification ?? null;
                }
            }

            // 2. Process Government Payment (Single Entry)
            if (paymentType === 'GOVERNMENT' || paymentType === 'COMBINED') {
                const amount = typeof values.govAmount === 'string' ? parseCurrencyString(values.govAmount) : Number(values.govAmount);
                if (amount > 0) {
                    await PayrollService.recordGovernmentPayment({
                        ...basePayload,
                        deductionType: values.govType || 'TDS',
                        amount: amount,
                        paidAmount: amount,
                        challanNumber: values.govChallan,
                        status: 'PAID'
                    });
                }
            }

            successConfirmation('Disbursement authorized successfully');
            setShowPaymentModal(false);
            handleRefresh(onSuccess);

            // Show email notification status as a toast
            if (emailNotification) {
                if (emailNotification.sent) {
                    const uniqueEmails = Array.from(new Set(emailNotification.to.split(',').map(e => e.trim())));
                    toast.success(
                        React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } },
                            React.createElement('div', { style: { fontWeight: 700, color: '#0f172a', marginBottom: '4px', fontSize: '0.95rem' } }, 'Payment Confirmation Sent'),
                            React.createElement('div', { style: { fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' } }, 'Payment notification emailed to:'),
                            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                                uniqueEmails.map((email, i) => 
                                    React.createElement('div', { key: i, style: { display: 'inline-flex', alignItems: 'center', backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem', color: '#334155', fontWeight: 600, border: '1px solid #e2e8f0' } },
                                        React.createElement('span', { style: { marginRight: '8px', fontSize: '1.1em' } }, '✉️'),
                                        email
                                    )
                                )
                            )
                        ),
                        {
                            position: 'bottom-right',
                            autoClose: 6000,
                            style: {
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                            }
                        }
                    );
                } else {
                    toast.warning(
                        `📧 Email not sent${emailNotification.error ? ` — ${emailNotification.error}` : ''}`,
                        { position: 'bottom-right', autoClose: 6000 }
                    );
                }
            }
        } catch (error) {
            console.error("Disbursement authorization error:", error);
            errorConfirmation('Authorization failed. Please check transaction logs.');
        } finally {
            setLoading(false);
        }
    };

    const paymentInitialValues = useMemo(() => {
        if (editMode && selectedPayment) {
            const isGov = selectedPayment.paymentType === 'GOVERNMENT';
            return {
                id: selectedPayment.id,
                paymentType: selectedPayment.paymentType || 'SALARY',
                salaryAmount: isGov ? 0 : (selectedPayment.calculatedPaidAmount || 0),
                govAmount: isGov ? (selectedPayment.calculatedPaidAmount || 0) : 0,
                govType: selectedPayment.remarks?.startsWith('Gov Payment:') ? selectedPayment.remarks.split(':')[1]?.trim() : 'Professional Fees',
                govChallan: selectedPayment.transactionId || '',
                govtDeductions: {},
                paidAt: selectedPayment.displayDate ? dayjs(selectedPayment.displayDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
                paymentMethod: selectedPayment.paymentMethod || 'BANK_TRANSFER',
                transactionId: selectedPayment.transactionId || '',
                remarks: ''
            };
        }
        return {
            paymentType: 'SALARY',
            salaryAmount: 0,
            govAmount: 0,
            govType: 'TDS',
            govChallan: '',
            paidAt: dayjs().format('YYYY-MM-DD'),
            paymentMethod: 'BANK_TRANSFER',
            transactionId: '',
            remarks: ''
        };
    }, [editMode, selectedPayment]);

    return {
        showPaymentModal,
        setShowPaymentModal,
        showGrossModal,
        setShowGrossModal,
        showDeductionModal,
        setShowDeductionModal,
        showIncrementModal,
        setShowIncrementModal,
        editMode,
        selectedPayment,
        loading,
        setLoading,
        handleRefresh,
        handlePaymentEdit,
        handleDeletePayment,
        handlePaymentSubmit,
        paymentInitialValues
    };
};
