import { describe, test, expect } from 'vitest';
import { MIN_VALID_ANNUAL_CTC, annualAmountError, isAnnualAmountOrZero } from './ctc';

/**
 * The browser half of the salary rule. The server half is
 * wisetech-backend/src/utils/__tests__/recruitmentSalary.test.ts, with the same boundary values —
 * if one side moves and the other does not, a form passes what the API then refuses.
 */
describe('isAnnualAmountOrZero', () => {
  test('a full annual salary, zero and no answer all pass', () => {
    for (const v of [1_200_000, MIN_VALID_ANNUAL_CTC, 0, null, undefined]) {
      expect(isAnnualAmountOrZero(v)).toBe(true);
    }
  });

  test('a figure that can only be lakhs is refused', () => {
    for (const v of [12, 4.2, 999.99]) {
      expect(isAnnualAmountOrZero(v)).toBe(false);
    }
  });

  test('the floor is the one payroll uses', () => {
    expect(MIN_VALID_ANNUAL_CTC).toBe(1000);
  });
});

describe('annualAmountError', () => {
  test('names the field and says what to type instead — the words the API uses', () => {
    expect(annualAmountError('Offered CTC', 12)).toBe('Offered CTC is the full annual amount — for example 1200000, not 12');
  });

  test('says nothing about a valid amount', () => {
    expect(annualAmountError('Offered CTC', 1_200_000)).toBeUndefined();
    expect(annualAmountError('Current salary', 0)).toBeUndefined();
    expect(annualAmountError('Current salary', null)).toBeUndefined();
  });
});
