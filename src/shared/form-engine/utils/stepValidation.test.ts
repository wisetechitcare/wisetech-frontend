import { describe, expect, it } from 'vitest';
import { hasStepErrors, stepValueSignature } from './stepValidation';

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
