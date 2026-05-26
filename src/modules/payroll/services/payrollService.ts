import axios from 'axios';

const API_URL = import.meta.env.VITE_APP_API_URL;

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
    amountPaid: number;
    paymentDate: string;
    paymentMethod: string;
    transactionId?: string;
    remarks?: string;
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
};
