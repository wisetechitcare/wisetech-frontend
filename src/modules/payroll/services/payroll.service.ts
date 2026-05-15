import { 
    fetchAllPayments, 
    fetchGrossPayDeductions, 
    fetchEmpAttendanceStatistics, 
    getAllLeaveManagements,
    fetchGrossPayConfiguration,
    createUpdateGrossPayConfiguration,
    deletePaymentById,
    updatePaymentById,
    createNewPayment,
    createUpdateGrossPayDeductions
} from '@services/employee';
import { fetchConfiguration, fetchCompanyOverview, fetchAllPublicHolidays } from '@services/company';
import { fetchDayWiseShifts } from '@services/dayWiseShift';

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
    deletePayment: deletePaymentById,
    updatePayment: updatePaymentById,
    createPayment: createNewPayment,
    saveSalaryReport: createUpdateGrossPayDeductions
};
