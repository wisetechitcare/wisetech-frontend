export interface FAQ {
  id: string;
  question: string;
  answer: string;
  isExpanded?: boolean;
}

export interface FAQSection {
  id: string;
  title: string;
  faqs: FAQ[];
  icon?: string;
}

export type FAQType = 'attendance' | 'leaves' | 'salary' | 'reimbursement' | 'general_rules';

export type FAQCategory = 'Attendance' | 'Leaves' | 'Salary' | 'Reimbursement' | 'General Rules';
