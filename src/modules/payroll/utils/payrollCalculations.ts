import dayjs from 'dayjs';

/**
 * Helper function to get effective end date considering employee exit date
 */
export const getEffectiveEndDate = (
    isYearly: boolean, 
    year: string, 
    month: string, 
    fiscalEndDate: string, 
    dateOfExit?: string
) => {
    let endDate = isYearly ? fiscalEndDate : dayjs(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');
    const currentDate = dayjs().format('YYYY-MM-DD');

    if (dateOfExit) {
        const exitDate = dayjs(dateOfExit).format('YYYY-MM-DD');
        endDate = dayjs(endDate).isAfter(exitDate) ? exitDate : endDate;
    }

    return dayjs(endDate).isAfter(currentDate) ? currentDate : endDate;
};

/**
 * Calculate intermediate salary: Gross - Variable Deductions
 */
export const calculateIntermediateSalary = (grossPay: number, totalVariableDeductions: number) => {
    return Math.max(0, grossPay - totalVariableDeductions);
};

/**
 * Calculate net salary: Intermediate - Fixed Deductions
 */
export const calculateNetSalary = (intermediateSalary: number, totalFixedDeductions: number) => {
    return intermediateSalary - totalFixedDeductions;
};
