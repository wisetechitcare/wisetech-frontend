import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type InstallmentType = 'Upcoming' | 'Paid' | 'Skipped' | 'Custom_Paid';

export interface IInstallment {
  id: string;
  installmentType: InstallmentType;
  status: number;
  isActive: boolean;
  dueDate: string;
  installmentAmount: string;
  paidAmount: string;
  createdAt: string;
}



export interface InstallmentSummary {
  total: number;
  paid: number;
  pending: number;
  customPaid: number;
  skipped: number;
}

export interface ILoan {
  id?: string;
  name: string;
  employeeId:string;
  loanAmount: number;
  collectedAmount: number;
  pendingAmount: number;
  startDate: string;
  endDate: string | null;
  loanDuration: number;
  status: number;
  loanType: 'EMI' | 'OneTime';
  installments: IInstallment[];
  installmentSummary: InstallmentSummary;
  isActive:boolean
}


interface LoanState {
  personalLoans: ILoan[];
}

const initialState: LoanState = {
  personalLoans: [],
};

export const loanSlice = createSlice({
  name: "loan",
  initialState,
  reducers: {
    savePersonalLoans: (state, action: PayloadAction<ILoan[]>) => {      
      state.personalLoans = action.payload;
    },
    clearPersonalLoans: (state) => {
      state.personalLoans = [];
    }
  },
});

export const { savePersonalLoans, clearPersonalLoans } = loanSlice.actions;

export default loanSlice.reducer;
