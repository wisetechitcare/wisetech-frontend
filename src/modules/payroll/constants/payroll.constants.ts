import { CUSTOM_SALARY, DEDUCTIONS, GROSS_PAY, LEAVE_MANAGEMENT, SANDWICH_LEAVE_KEY } from '@constants/configurations-key';

export const CONFIG_KEYS = {
    CUSTOM_SALARY,
    DEDUCTIONS,
    GROSS_PAY,
    LEAVE_MANAGEMENT,
    SANDWICH_LEAVE_KEY,
};

export const PAYMENT_STATUS = {
    PAID: 'Paid',
    PARTIAL: 'Partial',
    NO_PAYMENT: 'No Payment',
    DUE: 'Due',
    UPCOMING: 'Upcoming',
} as const;

export const BREAKDOWN_TYPES = {
    GROSS: 'gross',
    DEDUCTION: 'deduction',
} as const;
