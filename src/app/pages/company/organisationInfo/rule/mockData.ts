import { RuleData } from './types';

export const mockRuleData: RuleData = {
  attendance: {
    shiftType: 'SHIFT TIME',
    description: 'lorem ispum shs aj dks dk',
    shiftTimes: [
      { day: 'Monday', time: '9:30 AM - 6:30 PM' },
      { day: 'Tuesday', time: '9:30 AM - 6:30 PM' },
      { day: 'Wednesday', time: '9:30 AM - 6:30 PM' },
      { day: 'Thursday', time: '9:30 AM - 6:30 PM' },
      { day: 'Friday', time: '9:30 AM - 6:30 PM' },
      { day: 'Saturday', time: '9:30 AM - 12:30 PM' },
      { day: 'Sunday', time: 'Holiday' },
    ],
    otherDurations: [
      {
        label: 'Lunch time',
        description: 'lorem ispum shs aj dks dk',
        value: '01:30 PM - 2:30 PM',
      },
      {
        label: 'Grace Time',
        description: 'lorem ispum shs aj dks dk',
        value: '1:00:00 Hrs',
      },
      {
        label: 'Financial Year',
        description: 'lorem ispum shs aj dks dk',
        value: '1/2/2024 - 31/3/2025',
      },
      {
        label: 'Deduction Time',
        description: 'lorem ispum shs aj dks dk',
        value: '1:00:00 Hrs',
      },
    ],
  },
  leaves: {
    general: [
      {
        label: 'Number of casual leaves allowed per month',
        description: 'lorem ispum shs aj dks dk',
        value: '2',
      },
      {
        label: 'Number of floater allowed per year',
        description: 'lorem ispum shs aj dks dk',
        value: '1',
      },
    ],
    allowances: [
      { years: '1 Year', leaves: '+ 12 Leaves' },
      { years: '2 Years', leaves: '+ 18 Leaves' },
      { years: '3 Years', leaves: '+ 20 Leaves' },
      { years: '3 Years', leaves: '+ 20 Leaves' },
    ],
  },
  salary: {
    deductionRules: [
      {
        name: 'Late Check-in',
        period: '4 Days',
        deduction: '50% of 1 day',
      },
    ],
    grossPayDistribution: [
      { name: 'Basic Salary', percentage: '60%' },
      { name: 'House Rent  Allowance', percentage: '25%' },
      { name: 'Dearness Allowance', percentage: '25%' },
      { name: 'Special Allowance', percentage: '15%' },
      { name: 'Refund of Retention', percentage: '10%' },
      { name: 'Leave & Travel Allowance', percentage: '10%' },
      { name: 'Medical allowance', percentage: '10%' },
      { name: 'Other allowance', percentage: '5%' },
    ],
    professionalTax: [
      { salary: 'Male - Till ₹7500', deduction: 'NIL' },
      { salary: 'Male  - ₹7501-₹10000', deduction: '₹175 per month' },
      {
        salary: 'Male - More than ₹10000',
        deduction: '₹200 per month except February, ₹300 in February',
      },
      { salary: 'Female - Till ₹25000', deduction: 'NIL' },
      {
        salary: 'Female - Above ₹25000',
        deduction: '₹200 per month except Febraury, ₹300 in February',
      },
    ],
    providentFund: [{ name: 'Employee Provident Fund (EPF)', deduction: '12%' }],
  },
  reimbursement: {},
};
