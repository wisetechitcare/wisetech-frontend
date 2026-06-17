import axios from 'axios';

const API_URL = `${import.meta.env.VITE_APP_WISE_TECH_BACKEND}/api`;

export interface PayrollComponent {
  id: string;
  companyId: string;
  key: string;
  displayName: string;
  shortCode?: string;
  description?: string;
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
  category: string;
  direction: string;
  calculationType: string;
  enableInOnboarding: boolean;
  applyDuration: string;
  defaultAmount?: number | null;
  defaultPercentage?: number | null;
  effectiveFrom?: string;
  createdAt: string;
  updatedAt: string;
}

export const deductionMasterService = {
  getAll: async (): Promise<PayrollComponent[]> => {
    const res = await axios.get(`${API_URL}/salary-component-master`);
    return res.data?.data?.items || [];
  },
  seed: async (): Promise<PayrollComponent[]> => {
    const res = await axios.post(`${API_URL}/salary-component-master/seed`);
    return res.data?.data?.items || [];
  },
  create: async (data: Partial<PayrollComponent>): Promise<PayrollComponent> => {
    const res = await axios.post(`${API_URL}/salary-component-master`, data);
    return res.data?.data?.item;
  },
  update: async (id: string, data: Partial<PayrollComponent>): Promise<PayrollComponent> => {
    const res = await axios.put(`${API_URL}/salary-component-master/${id}`, data);
    return res.data?.data?.item;
  },
  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/salary-component-master/${id}`);
  },
};

export const payrollService = {
  /**
   * Fetch all monthly payroll summaries
   */
  getAllPayrolls: async () => {
    const response = await axios.get(`${API_URL}/payroll`);
    return response.data?.data?.payrolls || [];
  },

  /**
   * Fetch detailed ledger for a specific payroll cycle
   */
  getPayrollById: async (id: string) => {
    const response = await axios.get(`${API_URL}/payroll/${id}`);
    return response.data?.data?.payroll || null;
  },

  /**
   * Generate/Recalculate payroll for all employees for a month
   */
  generatePayroll: async (month: number, year: number) => {
    const response = await axios.post(`${API_URL}/payroll`, { month, year });
    return response.data;
  },

  /**
   * Record a salary payment
   */
  recordPayment: async (paymentData: {
    payrollId?: string;
    employeeId: string;
    amountPaid?: number;
    amount?: number;           // legacy alias
    paymentDate: string;
    paymentMethod: string;
    transactionId?: string;
    referenceNumber?: string;
    remarks?: string;
    paymentType?: string;      // legacy alias for paymentCategory
    paymentCategory?: string;
    month?: number;
    year?: number;
    salaryId?: string;
    netSalary?: number;
    totalPaidBefore?: number;
    skipEmail?: boolean;
    id?: string;
  }) => {
    const response = await axios.post(`${API_URL}/payroll/payment`, paymentData);
    return response.data;
  },

  /**
   * Record a government fee payment
   */
  recordGovtPayment: async (paymentData: {
    payrollId: string;
    paymentType: string;
    amount: number;
    paymentDate: string;
    transactionId?: string;
    remarks?: string;
  }) => {
    const response = await axios.post(`${API_URL}/payroll/govt-payment`, paymentData);
    return response.data;
  },

  /**
   * Delete a salary or government payment by ID
   */
  deletePayment: async (id: string) => {
    const response = await axios.delete(`${API_URL}/payroll/payment/${id}`);
    return response.data;
  },

  /**
   * Delete a government payment by ID
   */
  deleteGovernmentPayment: async (id: string) => {
    const response = await axios.delete(`${API_URL}/payroll/govt-payment/${id}`);
    return response.data;
  },

  /**
   * Download Salary Slip PDF
   */
  downloadSalarySlip: async (salaryId: string) => {
    const response = await axios.get(`${API_URL}/payroll/salary/${salaryId}/download-slip`, {
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Fetch salary record details
   */
  getSalaryById: async (salaryId: string) => {
    const response = await axios.get(`${API_URL}/payroll/salary/${salaryId}`);
    return response.data?.data?.salary || null;
  },

  /**
   * Download Contract Bill PDF
   */
  downloadContractBill: async (salaryId: string) => {
    const response = await axios.get(`${API_URL}/payroll/salary/${salaryId}/download-contract-bill`, {
      responseType: 'blob'
    });
    return response.data;
  },
};
