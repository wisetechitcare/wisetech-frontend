// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Formik } from 'formik';
import { CompanyMoveFields, stintDates } from './CompanyMoveFields';

afterEach(cleanup);

const history = [
  { id: 'h1', companyId: 'opal', endDate: null, company: { id: 'opal', companyName: 'Opal Builders' } },
  { id: 'h0', companyId: 'old', startDate: '2022-01-10', endDate: '2024-06-30', roleInCompany: 'Manager', company: { id: 'old', companyName: 'Blue Star' } },
];

const renderMove = (companyId: string, emails: any[] = [], onMove = vi.fn()) =>
  render(
    <Formik initialValues={{ companyId, companyMovedOn: '', emails } as any} onSubmit={() => undefined}>
      <CompanyMoveFields originalCompanyId="opal" originalCompanyName="Opal Builders" history={history}
        onMove={onMove} onUndo={() => undefined} />
    </Formik>,
  );

describe('CompanyMoveFields', () => {
  it('offers the move while the company is unchanged, and lists only past companies', () => {
    const onMove = vi.fn();
    renderMove('opal', [], onMove);
    fireEvent.click(screen.getByRole('button', { name: /move to another company/i }));
    expect(onMove).toHaveBeenCalled();
    expect(screen.getByText('Blue Star')).toBeTruthy();
    expect(screen.queryAllByText('Opal Builders')).toHaveLength(0);
  });

  it('once the company changes, explains the move and flags a Work primary email', () => {
    renderMove('', [{ key: 'a', value: 'me@opal.example', label: 'Work', isPrimary: true }]);
    expect(screen.getByText(/moving from opal builders/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /undo move/i })).toBeTruthy();
    expect(screen.getByText(/me@opal.example/)).toBeTruthy();
  });

  it('formats a stint with and without a known start', () => {
    expect(stintDates({ startDate: '2022-01-10', endDate: '2024-06-30' })).toBe('Jan 2022 – Jun 2024');
    expect(stintDates({ startDate: null, endDate: '2024-06-30' })).toBe('Until Jun 2024');
  });
});
