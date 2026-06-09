import { Employee } from "@redux/slices/employee";
import { ISalaryData } from "@redux/slices/salaryData";

// Use the existing ISalaryData interface
export type ApiSalaryData = ISalaryData;

export interface SalarySlipProps {
  grossPayVariable: { name: string; value?: string; earned: string }[];
  grossPayFixed: { name: string; value?: string; earned: string }[];
  deductions: { name: string; value: string; earned: string }[];
  taxes: { name: string; value?: string; earned: string }[];
  totalGrossPayEarned: string;
  totalDeductionsEarned: string;
  finalAmount: string;
  totalPayableDays: number;
  date: string;
  paidLeaves: number;
  unpaidLeaves: number;
  employee: Employee;
  /** v2 payroll pipeline breakdown (computed locally from the existing API split). */
  pipeline: {
    grossPay: string;
    totalVariableDeductions: string;
    intermediateSalary: string;
    totalFixedDeductions: string;
    finalNetSalary: string;
    variableDeductions: { name: string; earned: string }[];
    fixedDeductions: { name: string; earned: string }[];
  };
  hourlySalary?: number;
  presentDays?: number;
  monthStartDate?: string;
  monthEndDate?: string;
}

/**
 * Transforms API salary data to the format expected by SalarySlipTemplate
 * @param apiData - The salary data from the API
 * @param employee - Employee object
 * @returns Transformed data for SalarySlipTemplate or null if no API data
 */
// Validation function for API data
function validateApiSalaryData(apiData: ApiSalaryData | null): boolean {
  if (!apiData) {
    console.error('📊 [Validator] API data is null or undefined');
    return false;
  }

  // Check if required breakdown data exists
  if (!apiData.grossPayBreakdown) {
    console.error('📊 [Validator] grossPayBreakdown is missing from API data');
    return false;
  }

  if (!apiData.deductionBreakdown) {
    console.error('📊 [Validator] deductionBreakdown is missing from API data');
    return false;
  }

  // Check if at least fixed or variable data exists in grossPayBreakdown
  const hasGrossPayData = (apiData.grossPayBreakdown.fixed && Object.keys(apiData.grossPayBreakdown.fixed).length > 0) ||
                          (apiData.grossPayBreakdown.variable && Object.keys(apiData.grossPayBreakdown.variable).length > 0);

  if (!hasGrossPayData) {
    console.error('📊 [Validator] No valid gross pay data found in API response');
    return false;
  }

  // Check if required amount fields exist
  const requiredFields = ['totalGrossPayAmount', 'totalDeductedAmount', 'netAmount'];
  for (const field of requiredFields) {
    if (!apiData[field as keyof ApiSalaryData]) {
      console.error(`📊 [Validator] Required field ${field} is missing from API data`);
      return false;
    }
  }

  console.log('📊 [Validator] API data validation passed');
  return true;
}

export function transformApiDataToSalarySlipProps(
  apiData: ApiSalaryData | null, 
  employee: Employee
): SalarySlipProps {
  // Validate API data comprehensively
  if (!validateApiSalaryData(apiData)) {
    throw new Error('Invalid or incomplete API salary data provided for salary slip generation');
  }

  // TypeScript now knows apiData is not null due to validation
  const validApiData = apiData as ApiSalaryData;

  // Format currency helper - removes currency symbol and formats as string.
  // Null/undefined/NaN values (e.g. an unset salary component) fall back to 0
  // instead of throwing "Cannot read property 'toFixed' of null".
  const formatCurrency = (value: number | string | null | undefined): string => {
    const parsed = typeof value === 'string'
      ? parseFloat(value.replace(/[₹,]/g, ''))
      : value;
    const numValue = (parsed === null || parsed === undefined || Number.isNaN(parsed)) ? 0 : parsed;

    // Return formatted number with commas but without currency symbol
    return numValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Format value based on type
  const formatValue = (value: any, type?: string): string => {
    if (value === null || value === undefined) return '-';
    
    if (type === 'percentage') {
      return `${value}%`;
    }
    
    // Handle time format (e.g., "13:47:00")
    if (typeof value === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(value)) {
      return value;
    }
    
    // Handle numeric values
    if (typeof value === 'number') {
      return Number.isInteger(value) ? value.toString() : value.toFixed(2);
    }
    
    return value.toString();
  };

  // Transform grossPayVariable (from API's grossPayBreakdown.variable)
  const grossPayVariable = Object.entries(validApiData.grossPayBreakdown?.variable || {})
    .map(([name, data]) => ({
      name,
      value: formatValue(data.value, data.type),
      earned: formatCurrency(data.earned)
    }));

  // Transform grossPayFixed (from API's grossPayBreakdown.fixed)
  const grossPayFixed = Object.entries(validApiData.grossPayBreakdown?.fixed || {})
    .map(([name, data]) => ({
      name,
      value: formatValue(data.value, data.type),
      earned: formatCurrency(data.earned)
    }));

  // Transform deductions (from API's deductionBreakdown.variable)
  // These will show as "Variables" in the deductions column
  const deductions = Object.entries(validApiData.deductionBreakdown?.variable || {})
    .map(([name, data]) => ({
      name,
      value: formatValue(data.value, data.type),
      earned: formatCurrency(data.earned)
    }));

  // Transform taxes (from API's deductionBreakdown.fixed)
  // These will show as "Fixed" in the deductions column (not as "TAX")
  const taxes = Object.entries(validApiData.deductionBreakdown?.fixed || {})
    .map(([name, data]) => ({
      name,
      value: formatValue(data.value, data.type),
      earned: formatCurrency(data.earned)
    }));

  // Parse amounts and remove currency symbols since SalarySlipTemplate will format them
  const parseAmount = (amount: string | undefined): string => {
    if (!amount) return '0';
    const parsed = parseFloat(amount.replace(/[₹,]/g, ''));
    return parsed.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Format date
  const formatDate = (): string => {
    const month = validApiData.month || '';
    // Extract year from API data or use current year as fallback
    const year = (validApiData as any).employeeCardDeatils?.year || 
                 (validApiData.monthStartDate ? new Date(validApiData.monthStartDate).getFullYear() : new Date().getFullYear());
    return `${month} ${year}`;
  };

  // Create employee object with updated CTC if available
  const updatedEmployee = {
    ...employee,
    ...(validApiData.annualCTC && { ctcInLpa: validApiData.annualCTC.toString() })
  };

  // Extract paid/unpaid leaves from the API data structure
  // Check if it's in extraData (as per your API payload) or directly in the root
  const paidLeaves = (validApiData as any).extraData?.paidLeaveCount || 
                     (validApiData as any).paidLeaveCount || 0;
  const unpaidLeaves = (validApiData as any).extraData?.unpaidLeavesCount || 
                       (validApiData as any).unpaidLeavesCount || 0;
  
  // Extract totalPayableDays from the API data
  const totalPayableDays = parseFloat((validApiData as any).totalPayableDays || '0');

  // ── v2 payroll pipeline breakdown ──────────────────────────────────────────
  // The legacy API response already exposes deductionBreakdown.fixed and
  // deductionBreakdown.variable. We compute the staged numbers locally:
  //   intermediateSalary = grossPay − Σ(variableDeductions)
  //   finalNetSalary     = intermediateSalary − Σ(fixedDeductions)
  const sumEarned = (entries: Record<string, any> | undefined): number =>
    Object.values(entries ?? {}).reduce((acc, item: any) => acc + Number(item?.earned ?? 0), 0);

  const numericGrossPay = parseFloat(
    (validApiData.totalGrossPayAmount || '0').replace(/[₹,]/g, '')
  );
  const totalVariableDeductionsNum = sumEarned(validApiData.deductionBreakdown?.variable);
  const totalFixedDeductionsNum = sumEarned(validApiData.deductionBreakdown?.fixed);
  const intermediateSalaryNum = Math.max(0, numericGrossPay - totalVariableDeductionsNum);
  const finalNetSalaryNum = Math.max(0, intermediateSalaryNum - totalFixedDeductionsNum);

  const formatLineItems = (entries: Record<string, any> | undefined) =>
    Object.entries(entries ?? {})
      .filter(([, item]: any) => Number(item?.earned ?? 0) > 0)
      .map(([name, item]: any) => ({ name, earned: formatCurrency(item.earned) }));

  return {
    grossPayVariable,
    grossPayFixed,
    deductions, // These map to "Variable" section in deductions column (from deductionBreakdown.fixed)
    taxes,      // These map to "Fixed" section in deductions column (from deductionBreakdown.variable)
    totalGrossPayEarned: parseAmount(validApiData.totalGrossPayAmount),
    totalDeductionsEarned: parseAmount(validApiData.totalDeductedAmount),
    finalAmount: parseAmount(validApiData.netAmount),
    totalPayableDays: Math.round(totalPayableDays),
    date: formatDate(),
    paidLeaves,
    unpaidLeaves,
    employee: updatedEmployee,
    pipeline: {
      grossPay: formatCurrency(numericGrossPay),
      totalVariableDeductions: formatCurrency(totalVariableDeductionsNum),
      intermediateSalary: formatCurrency(intermediateSalaryNum),
      totalFixedDeductions: formatCurrency(totalFixedDeductionsNum),
      finalNetSalary: formatCurrency(finalNetSalaryNum),
      variableDeductions: formatLineItems(validApiData.deductionBreakdown?.variable),
      fixedDeductions: formatLineItems(validApiData.deductionBreakdown?.fixed),
    },
    hourlySalary: (validApiData as any).hourlySalary ?? undefined,
    presentDays: (validApiData as any).presentDays ?? (validApiData as any).extraData?.presentDays ?? undefined,
    monthStartDate: validApiData.monthStartDate ?? undefined,
    monthEndDate: validApiData.monthEndDate ?? undefined,
  };
}

