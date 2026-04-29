import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

// NEW SERVICE: Employee-specific salary configuration (separate from existing employee service)

export interface EmployeeSalaryConfigurationResponse {
    employeeConfiguration: {
        employeeGrossPayConfig: Record<string, any> | null;
        employeeDeductionsConfig: Record<string, any> | null;
        customGrossPayFields: Record<string, any> | null;
        customDeductionFields: Record<string, any> | null;
        lastModifiedBy: string | null;
        source: string;
    } | null;
    hasEmployeeSpecificConfig: boolean;
    employeeId: string;
    month: number;
    year: number;
}

export interface EmployeeSalaryConfigurationRequest {
    employeeId: string;
    month: number;
    year: number;
    employeeGrossPayConfig?: Record<string, any>;
    employeeDeductionsConfig?: Record<string, any>;
    customGrossPayFields?: Record<string, any>;
    customDeductionFields?: Record<string, any>;
}

/**
 * Get employee-specific salary configuration
 */
export const getEmployeeSpecificSalaryConfiguration = async (
    employeeId: string, 
    month: number, 
    year: number
): Promise<EmployeeSalaryConfigurationResponse> => {
    try {
        const endpoint = `${API_BASE_URL}/employee/salary-configuration/${employeeId}?month=${month}&year=${year}`;
        const { data } = await axios.get(endpoint);
        return data.data;
    } catch (err) {
        throw err;
    }
};

/**
 * Create or update employee-specific salary configuration
 */
export const saveEmployeeSpecificSalaryConfiguration = async (
    configData: EmployeeSalaryConfigurationRequest
): Promise<void> => {
    try {
        const endpoint = `${API_BASE_URL}/employee/salary-configuration`;
        await axios.post(endpoint, configData);
    } catch (err) {
        throw err;
    }
};

/**
 * Reset employee to common salary configuration (remove overrides)
 */
export const resetEmployeeSalaryConfiguration = async (
    employeeId: string, 
    month: number, 
    year: number
): Promise<void> => {
    try {
        const endpoint = `${API_BASE_URL}/employee/salary-configuration/${employeeId}?month=${month}&year=${year}`;
        await axios.delete(endpoint);
    } catch (err) {
        throw err;
    }
};

/**
 * Get effective salary configuration with fallback info
 * This tells you whether the employee has overrides and what the effective config looks like
 */
export const getEffectiveSalaryConfiguration = async (
    employeeId: string, 
    month: number, 
    year: number
): Promise<{
    grossPayConfig: Record<string, any>;
    deductionsConfig: Record<string, any>;
    customGrossPayFields: Record<string, any>;
    customDeductionFields: Record<string, any>;
    isEmployeeSpecific: boolean;
    source: 'common' | 'employee_specific';
    hasEmployeeOverrides: boolean;
}> => {
    try {
        const response = await getEmployeeSpecificSalaryConfiguration(employeeId, month, year);
        
        if (response.hasEmployeeSpecificConfig && response.employeeConfiguration) {
            return {
                grossPayConfig: response.employeeConfiguration.employeeGrossPayConfig || {},
                deductionsConfig: response.employeeConfiguration.employeeDeductionsConfig || {},
                customGrossPayFields: response.employeeConfiguration.customGrossPayFields || {},
                customDeductionFields: response.employeeConfiguration.customDeductionFields || {},
                isEmployeeSpecific: true,
                source: 'employee_specific',
                hasEmployeeOverrides: true
            };
        } else {
            // No employee-specific config, will use common configuration
            return {
                grossPayConfig: {},
                deductionsConfig: {},
                customGrossPayFields: {},
                customDeductionFields: {},
                isEmployeeSpecific: false,
                source: 'common',
                hasEmployeeOverrides: false
            };
        }
    } catch (err) {
        throw err;
    }
};