import { describe, expect, it } from 'vitest';
import {
  firstErrorPath, firstErrorPathIn, firstErroredStepIndex, hasFilledValue, hasStepErrors, stepValueSignature,
} from './stepValidation';

describe('wizard section validation', () => {
  it('finds nested and indexed errors without blocking on another section', () => {
    const errors = { address: { city: 'Required' }, contacts: [{ email: 'Invalid' }] };
    expect(hasStepErrors(errors, ['address.city'])).toBe(true);
    expect(hasStepErrors(errors, ['contacts[0].email'])).toBe(true);
    expect(hasStepErrors(errors, ['contacts'])).toBe(true);
    expect(hasStepErrors(errors, ['address.country'])).toBe(false);
    expect(hasStepErrors({ 'address.city': 'Required' }, ['address'])).toBe(true);
  });

  it('invalidates completion only when owned values change', () => {
    const fields = ['address.city', 'notes'];
    const before = stepValueSignature({ address: { city: 'Pune' }, notes: '', other: 1 }, fields);
    expect(stepValueSignature({ address: { city: 'Pune' }, notes: '', other: 2 }, fields)).toBe(before);
    expect(stepValueSignature({ address: { city: 'Mumbai' }, notes: '', other: 1 }, fields)).not.toBe(before);
  });
});

describe('firstErrorPath', () => {
  it('returns null for an empty or missing error tree', () => {
    expect(firstErrorPath(undefined)).toBeNull();
    expect(firstErrorPath({})).toBeNull();
    expect(firstErrorPath([])).toBeNull();
  });

  it('walks nested objects to the first leaf message as a dotted path', () => {
    expect(firstErrorPath({ name: 'Required' })).toBe('name');
    expect(firstErrorPath({ addressInfo: { presentCity: 'Required', zip: 'Bad' } })).toBe('addressInfo.presentCity');
  });

  it('skips empty array slots and keeps the row index', () => {
    expect(firstErrorPath({ familyInfo: [undefined, { name: 'Required' }] })).toBe('familyInfo.1.name');
  });

  it('honours a prefix for a subtree read with getIn', () => {
    expect(firstErrorPath({ city: 'Required' }, 'address')).toBe('address.city');
    expect(firstErrorPath('Required', 'email')).toBe('email');
  });
});

describe('firstErrorPathIn / firstErroredStepIndex', () => {
  it('resolves the first error owned by the given fields, in field order', () => {
    const errors = { email: 'Invalid', address: { city: 'Required' } };
    expect(firstErrorPathIn(errors, ['address', 'email'])).toBe('address.city');
    expect(firstErrorPathIn(errors, ['phone'])).toBeNull();
    expect(firstErrorPathIn({ 'address.city': 'Required' }, ['address'])).toBe('address.city');
  });

  it('finds the first step that owns an error', () => {
    const steps = [{ fields: ['name'] }, { fields: ['email'] }, { fields: ['city'] }];
    expect(firstErroredStepIndex({ city: 'x', email: 'y' }, steps)).toBe(1);
    expect(firstErroredStepIndex({}, steps)).toBe(-1);
  });
});

describe('hasFilledValue', () => {
  it('treats blanks, empty arrays and seeded identity-only rows as empty', () => {
    expect(hasFilledValue(undefined)).toBe(false);
    expect(hasFilledValue('   ')).toBe(false);
    expect(hasFilledValue([])).toBe(false);
    expect(hasFilledValue([{ rowId: 'r1', documentId: 7, title: '' }])).toBe(false);
  });

  it('counts real content', () => {
    expect(hasFilledValue('Asha')).toBe(true);
    expect(hasFilledValue(0)).toBe(true);
    expect(hasFilledValue(false)).toBe(true);
    expect(hasFilledValue([{ rowId: 'r1', title: 'BSc' }])).toBe(true);
  });
});
