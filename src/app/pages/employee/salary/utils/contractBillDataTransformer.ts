import { Employee } from "@redux/slices/employee";

export interface ContractBillItem {
  description: string;
  amount: number;
}

export interface ContractBillData {
  employee: Employee;
  billNumber: string;
  billDate: string;
  month: string;
  year: number;
  billItems: ContractBillItem[];
  totalAmount: number;
  tdsAmount: number;
  paidAmount: number;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  panNumber?: string;
  mobileNumber?: string;
}

/**
 * Transforms employee and billing data to format expected by ContractBillTemplate
 */
export function transformToContractBillData(
  employee: Employee,
  contractAmount: number,
  tdsPercentage: number = 10,
  paidAmount: number = 0,
  month: string = 'January',
  year: number = new Date().getFullYear()
): ContractBillData {
  const billNumber = generateBillNumber(employee, month, year);
  const billDate = new Date().toISOString();
  const tdsAmount = contractAmount * (tdsPercentage / 100);

  // Default bill items (can be extended)
  const billItems: ContractBillItem[] = [
    {
      description: `Consulting Services for ${month}`,
      amount: contractAmount
    }
  ];

  return {
    employee,
    billNumber,
    billDate,
    month,
    year,
    billItems,
    totalAmount: contractAmount,
    tdsAmount,
    paidAmount,
    bankName: (employee as any)?.bankName || '',
    accountNumber: (employee as any)?.accountNumber || '',
    ifscCode: (employee as any)?.ifscCode || '',
    panNumber: (employee as any)?.panNumber || '',
    mobileNumber: (employee as any)?.mobileNumber || (employee as any)?.personalMobile || '',
  };
}

/**
 * Generate unique bill number format: BILL-YYYY-MM-XXXXXX
 */
function generateBillNumber(employee: Employee, month: string, year: number): string {
  const months: { [key: string]: string } = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'May': '05', 'June': '06', 'July': '07', 'August': '08',
    'September': '09', 'October': '10', 'November': '11', 'December': '12'
  };

  const monthNum = months[month] || '01';
  const empNum = parseInt((employee?.id || '').slice(-4), 16) || 124;
  const empIdPart = String(empNum).padStart(6, '0').slice(0, 6);

  return `BILL-${year}-${monthNum}-${empIdPart}`;
}

/**
 * Calculate bill summary for validation
 */
export function calculateBillSummary(billData: ContractBillData) {
  const itemsTotal = billData.billItems.reduce((sum, item) => sum + item.amount, 0);
  const balance = billData.totalAmount - billData.tdsAmount - billData.paidAmount;

  return {
    itemsTotal,
    totalAmount: billData.totalAmount,
    tdsAmount: billData.tdsAmount,
    paidAmount: billData.paidAmount,
    balance,
    isBalancePositive: balance >= 0,
  };
}
