// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { WtPhoneField } from './WtPhoneField';

afterEach(cleanup);

describe('WtPhoneField', () => {
  it('renders the ESM-safe phone control', () => {
    render(<WtPhoneField label="Phone" defaultCountry="in" value="+919594107173" onChange={() => {}} name="phone" />);
    expect(screen.getByRole('textbox', { name: 'Phone' })).toBeTruthy();
  });

  it('associates the shared error message with the input', () => {
    render(<WtPhoneField label="Phone" value="" onChange={() => {}} name="phone" error="Phone is required" />);
    expect(screen.getByRole('textbox', { name: 'Phone' }).getAttribute('aria-describedby')).toBe('phone-error');
    expect(screen.getByRole('alert').textContent).toContain('Phone is required');
  });
});
