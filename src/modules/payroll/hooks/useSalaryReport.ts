import { useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import dayjs from 'dayjs';
import { saveToggleChange } from '@redux/slices/attendanceStats';
import { successConfirmation, errorConfirmation } from '@utils/modal';
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

    const handleDeletePayment = async (paymentId: string) => {
        try {
            await PayrollService.deletePayment(paymentId);
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
            const { paymentType, salaryAmount, govtDeductions, paidAt, paymentMethod, transactionId, remarks } = values;

            const basePayload = {
                salaryId,
                employeeId,
                month: Number(month),
                year: Number(year),
                companyId,
                paymentDate: paidAt,
                paymentMethod,
                transactionId,
                remarks
            };

            // 1. Process Salary Payment
            if (paymentType === 'SALARY' || paymentType === 'COMBINED') {
                const amount = typeof salaryAmount === 'string' ? parseCurrencyString(salaryAmount) : Number(salaryAmount);
                if (amount > 0) {
                    await PayrollService.recordSalaryPayment({
                        ...basePayload,
                        amount: amount,
                        paymentType: 'SALARY'
                    });
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
        } catch (error) {
            console.error("Disbursement authorization error:", error);
            errorConfirmation('Authorization failed. Please check transaction logs.');
        } finally {
            setLoading(false);
        }
    };

    const paymentInitialValues = useMemo(() => {
        if (editMode && selectedPayment) {
            return {
                paymentType: 'SALARY',
                salaryAmount: selectedPayment.amountPaid || 0,
                govtDeductions: {},
                paidAt: selectedPayment.paidAt ? dayjs(selectedPayment.paidAt).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
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
