import { useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import dayjs from 'dayjs';
import { saveToggleChange } from '@redux/slices/attendanceStats';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { PayrollService } from '../services/payroll.service';

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

    const handleRefresh = useCallback(() => {
        dispatch(saveToggleChange(!toggleChange));
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

    const handlePaymentSubmit = async (values: any, employeeId: string) => {
        try {
            setLoading(true);
            if (editMode && selectedPayment) {
                await PayrollService.updatePayment(selectedPayment.id, {
                    ...values,
                    employeeId
                });
                successConfirmation('Payment updated successfully');
            } else {
                await PayrollService.createPayment({
                    ...values,
                    employeeId
                });
                successConfirmation('Payment created successfully');
            }
            setShowPaymentModal(false);
            handleRefresh();
        } catch (error) {
            errorConfirmation('Failed to save payment');
        } finally {
            setLoading(false);
        }
    };

    const paymentInitialValues = useMemo(() => {
        if (editMode && selectedPayment) {
            return {
                amountPaid: selectedPayment.amountPaid || 0,
                paidAt: selectedPayment.paidAt ? dayjs(selectedPayment.paidAt).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')
            };
        }
        return {
            amountPaid: 0,
            paidAt: dayjs().format('YYYY-MM-DD')
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
