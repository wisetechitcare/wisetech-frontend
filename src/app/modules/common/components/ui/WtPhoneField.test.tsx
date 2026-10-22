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
});
