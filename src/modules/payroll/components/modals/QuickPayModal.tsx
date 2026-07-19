import React, { useEffect, useState } from 'react';
import { Dayjs } from 'dayjs';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { RootState } from '@redux/store';
import { Employee } from '@redux/slices/employee';
import { fetchSalaryDataForDateRangeMonthly } from '@services/company';
import PaymentModal from './PaymentModal';
import { useSalaryReport } from '../../hooks/useSalaryReport';
import { useSalaryCalculations } from '../../hooks/useSalaryCalculations';

interface QuickPayModalProps {
    employeeId: string;
    employeeName: string;
    month: Dayjs;
    onClose: () => void;
}

// Opens the Record Payroll Payout dialog in place (e.g. from the Employee
// Payrolls table) — fetches the employee's salary record for the month itself,
// so the caller only needs an employee id. Payment success flips the
// attendanceStats.toggleChange flag, which the payroll tables already watch to
// refetch their data.
const QuickPayModal: React.FC<QuickPayModalProps> = ({ employeeId, employeeName, month, onClose }) => {
    const [monthlyApiData, setMonthlyApiData] = useState<any>(null);
    const companyIdFromStore = useSelector((state: RootState) => state.company.currentCompany.id);

    const ui = useSalaryReport();
    const { summaryData, apiSalaryData } = useSalaryCalculations(
        monthlyApiData,
        {} as Employee,
        !!monthlyApiData,
        0,
        month.format('MM'),
        month.format('YYYY')
    );

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const response = await fetchSalaryDataForDateRangeMonthly({
                    employeeId,
                    startDate: month.startOf('month').format('YYYY-MM-DD'),
                    endDate: month.endOf('month').format('YYYY-MM-DD'),
                });
                if (cancelled) return;
                if (response?.message?.salaryData?.length) {
                    setMonthlyApiData(response.message);
                } else {
                    toast.warning('No salary record found for this month');
                    onClose();
                }
            } catch (error) {
                console.error('❌ [QuickPayModal] Failed to load salary data:', error);
                if (!cancelled) {
                    toast.error('Failed to load salary details');
                    onClose();
                }
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employeeId]);

    useEffect(() => {
        if (apiSalaryData && !ui.showPaymentModal) {
            ui.setShowPaymentModal(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiSalaryData]);

    if (!apiSalaryData) {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 1060,
                backgroundColor: 'rgba(255,255,255,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <PaymentModal
            show={ui.showPaymentModal}
            onHide={onClose}
            loading={ui.loading}
            initialValues={ui.paymentInitialValues}
            editMode={ui.editMode}
            onSubmit={(values) => {
                ui.handlePaymentSubmit(
                    values,
                    apiSalaryData?.id as string | undefined,
                    employeeId,
                    month.format('MM'),
                    month.format('YYYY'),
                    (apiSalaryData as any)?.companyId || companyIdFromStore,
                    onClose
                );
            }}
            employeeName={employeeName}
            month={month.format('MMMM')}
            year={month.format('YYYY')}
            netPayable={summaryData.netSalary}
            salaryPaid={summaryData.salaryPaid}
            governmentPaid={summaryData.governmentPaid}
            grossSalary={summaryData.totalGrossPay}
            variableDeductions={summaryData.totalVariableDeduction}
            fixedDeductions={summaryData.totalFixedDeduction}
            statutoryBreakdown={apiSalaryData?.deductionBreakdown?.fixed || {}}
            govtPayments={(apiSalaryData as any)?.govtPayments || []}
        />
    );
};

export default QuickPayModal;
