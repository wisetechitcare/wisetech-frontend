import React, { useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import dayjs from 'dayjs';
import { saveToggleChange } from '@redux/slices/attendanceStats';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { toast } from 'react-toastify';
import { PayrollService } from '../services/payroll.service';
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

    const handleDeletePayment = async (payment: any) => {
        try {
            if (!payment?.id) {
                throw new Error('Missing payment id');
            }
            // Legacy synthetic IDs cannot be deleted via API (no DB record)
            if (String(payment.id).includes('-legacy-')) {
                toast.warning('Legacy payment records cannot be deleted individually. Edit the salary record instead.', { position: 'bottom-right', autoClose: 5000 });
                return;
            }
            // The backend now checks both tables, so always call salary payment delete
            await PayrollService.deletePayment(payment.id);
            successConfirmation('Payment deleted successfully');
            handleRefresh();
        } catch (error) {
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

            const basePayload = {
                id: values.id || undefined,
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
                    const res = await PayrollService.recordSalaryPayment({
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
                            React.createElement('div', { style: { fontWeight: 700, color: '#0f172a', marginBottom: '4px', fontSize: '0.95rem' } }, 'Email Sent Successfully'),
                            React.createElement('div', { style: { fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' } }, 'Salary slip delivered to:'),
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
                remarks: selectedPayment.remarks || ''
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
