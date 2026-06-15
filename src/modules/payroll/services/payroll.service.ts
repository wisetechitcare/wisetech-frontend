import {
    fetchAllPayments,
    fetchGrossPayDeductions,
    fetchEmpAttendanceStatistics,
    getAllLeaveManagements,
    fetchGrossPayConfiguration,
    createUpdateGrossPayConfiguration,
    updatePaymentById,
    createNewPayment,
    createUpdateGrossPayDeductions,
    recordGovernmentPayment,
    getPaymentHistory
} from '@services/employee';
import { fetchConfiguration, fetchCompanyOverview, fetchAllPublicHolidays } from '@services/company';
import { fetchDayWiseShifts } from '@services/dayWiseShift';
import { payrollService } from './payrollService';

export const PayrollService = {
    fetchPayments: fetchAllPayments,
    fetchGrossPayDeductions: fetchGrossPayDeductions,
    fetchAttendanceStats: fetchEmpAttendanceStatistics,
    fetchLeaveManagements: getAllLeaveManagements,
    fetchGrossPayConfig: fetchGrossPayConfiguration,
    saveGrossPayConfig: createUpdateGrossPayConfiguration,
    fetchGlobalConfig: fetchConfiguration,
    fetchCompanyOverview: fetchCompanyOverview,
    fetchPublicHolidays: fetchAllPublicHolidays,
    fetchShifts: fetchDayWiseShifts,
    deletePayment: payrollService.deletePayment,
    deleteGovernmentPayment: payrollService.deleteGovernmentPayment,
    updatePayment: updatePaymentById,
    createPayment: createNewPayment,
    saveSalaryReport: createUpdateGrossPayDeductions,
    recordGovernmentPayment,
    getPaymentHistory
};
