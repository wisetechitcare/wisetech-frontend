// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Formik } from 'formik';
import { CompanyMoveFields, CompanyMoveStage, stintDates } from './CompanyMoveFields';

afterEach(cleanup);

const history = [
  { id: 'h1', companyId: 'opal', endDate: null, company: { id: 'opal', companyName: 'Opal Builders' } },
  { id: 'h0', companyId: 'old', startDate: '2022-01-10', endDate: '2024-06-30', roleInCompany: 'Manager', company: { id: 'old', companyName: 'Blue Star' } },
];

const withFormik = (ui: React.ReactNode, emails: any[] = []) =>
  render(
    <Formik initialValues={{ companyId: 'acme', companyMovedOn: '2026-10-28', emails } as any} onSubmit={() => undefined}>
      <>{ui}</>
    </Formik>,
  );

describe('CompanyMoveFields', () => {
  it('offers the move when not moving, and lists only past companies', () => {
    const onMove = vi.fn();
    withFormik(<CompanyMoveFields canMove moving={false} originalCompanyName="Opal Builders" history={history} onMove={onMove} />);
    fireEvent.click(screen.getByRole('button', { name: /move to another company/i }));
    expect(onMove).toHaveBeenCalled();
    expect(screen.getByText('Blue Star')).toBeTruthy();
    expect(screen.queryAllByText('Opal Builders')).toHaveLength(0);
  });

  it('hides the move button mid-move', () => {
    withFormik(<CompanyMoveFields canMove moving originalCompanyName="Opal Builders" history={[]} onMove={() => undefined} />);
    expect(screen.queryByRole('button', { name: /move to another company/i })).toBeNull();
  });
});

describe('CompanyMoveStage', () => {
  it('without a move it is just the fields: editing them is a correction', () => {
    withFormik(<CompanyMoveStage movedFrom={null} onUndo={() => undefined}><span>fields</span></CompanyMoveStage>);
    expect(screen.getByText('fields')).toBeTruthy();
    expect(screen.queryByText(/leaving/i)).toBeNull();
  });

  it('mid-move shows the old company read-only above the new one, and flags a Work primary email', () => {
    const onUndo = vi.fn();
    withFormik(
      <CompanyMoveStage
        movedFrom={{ companyName: 'Opal Builders', branch: 'Pune', role: 'Director', status: 'Active', services: [] }}
        onUndo={onUndo}
      >
        <span>new company fields</span>
      </CompanyMoveStage>,
      [{ key: 'a', value: 'me@opal.example', label: 'Work', isPrimary: true }],
    );
    expect(screen.getByText(/Leaving · 28 Oct 2026/)).toBeTruthy();
    expect(screen.getByText('Opal Builders')).toBeTruthy();
    expect(screen.getByText('Director')).toBeTruthy();
    expect(screen.getByText('Joining')).toBeTruthy();
    expect(screen.getByText('new company fields')).toBeTruthy();
    expect(screen.getByText(/me@opal.example/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /undo move/i }));
    expect(onUndo).toHaveBeenCalled();
  });
});

describe('stintDates', () => {
  it('formats a stint with and without a known start', () => {
    expect(stintDates({ startDate: '2022-01-10', endDate: '2024-06-30' })).toBe('Jan 2022 – Jun 2024');
    expect(stintDates({ startDate: null, endDate: '2024-06-30' })).toBe('Until Jun 2024');
  });
});
