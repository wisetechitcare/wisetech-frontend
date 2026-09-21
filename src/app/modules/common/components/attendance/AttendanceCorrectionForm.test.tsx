// @vitest-environment jsdom
/**
 * The ONE correction form, rendered the way every screen now renders it.
 *
 * The form is presentational — every decision is on the `correction` object from
 * `useAttendanceCorrection` — so these mount it with a plain object and assert what
 * a person actually sees: that a closed day says WHY instead of offering a form that
 * fails, that an employee never sees a status control, and that the inline and
 * dialog placements differ only in their way out.
 */
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render as rtlRender, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AttendanceCorrectionForm } from './AttendanceCorrectionForm';
import { correctionContextFromDay, emptyDraft } from './attendanceRequest';
import type { AttendanceCorrection } from './useAttendanceCorrection';

afterEach(cleanup);

/**
 * The time wheel reads the viewer's 12/24h preference from Redux — the same minimal
 * store the other render tests in this app use.
 */
const render = (ui: ReactElement) =>
  rtlRender(<Provider store={configureStore({ reducer: { employee: () => ({ currentEmployee: { id: 'emp-1' } }) } })}>{ui}</Provider>);

const correction = (over: Partial<AttendanceCorrection> = {}): AttendanceCorrection =>
  ({
    mode: 'raise',
    asAdmin: false,
    date: '2026-09-15',
    employeeId: 'emp-1',
    day: null,
    loadingDay: false,
    timezone: 'Asia/Kolkata',
    methods: [{ value: 'wm-office', label: 'Office' }],
    draft: { ...emptyDraft('checkout'), checkOut: '19:50', workingMethodId: 'wm-office', remarks: 'forgot' },
    onDraftChange: vi.fn(),
    kinds: ['checkin', 'checkout', 'both'],
    kindBlocked: () => null,
    context: correctionContextFromDay(null),
    refusal: null,
    nothingLeft: false,
    gate: { checking: false, blocked: false, blockingDate: '' },
    blocked: false,
    status: '0',
    setStatus: vi.fn(),
    attempted: false,
    saving: false,
    canSubmit: true,
    submit: vi.fn(),
    ...over,
  }) as AttendanceCorrection;

describe('AttendanceCorrectionForm — an open day', () => {
  test('shows the shared fields and submits', async () => {
    const c = correction();
    render(<AttendanceCorrectionForm correction={c} onCancel={() => {}} />);

    expect(screen.getByText('What are you correcting?')).toBeTruthy();
    expect(screen.getAllByText(/Working method/i).length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: /submit request/i }));
    expect(c.submit).toHaveBeenCalledTimes(1);
  });

  /** An employee never chooses where their own correction lands. */
  test('never shows a status control to an employee', () => {
    render(<AttendanceCorrectionForm correction={correction()} onCancel={() => {}} />);
    expect(screen.queryByText('Status')).toBeNull();
  });

  test('shows the status control when an admin is deciding', () => {
    render(<AttendanceCorrectionForm correction={correction({ asAdmin: true })} showStatus onCancel={() => {}} />);
    expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
  });

  test('labels an edit as saving changes, not raising a request', () => {
    render(<AttendanceCorrectionForm correction={correction({ mode: 'edit' })} onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: /save changes/i })).toBeTruthy();
  });

  test('disables submit while it cannot be sent', () => {
    render(<AttendanceCorrectionForm correction={correction({ canSubmit: false })} onCancel={() => {}} />);
    expect((screen.getByRole('button', { name: /submit request/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('AttendanceCorrectionForm — a closed day says why', () => {
  /**
   * The screenshot that started this: a row reading "Not Allowed" with no reason.
   * A refused day now names the rule, and offers no form that would fail.
   */
  test('explains a closed window and hides the fields and submit', () => {
    const refusal = 'This date is outside the correction window. Corrections can be raised for 18 Aug 2026 onwards.';
    render(<AttendanceCorrectionForm correction={correction({ refusal, blocked: true })} onCancel={() => {}} />);

    expect(screen.getByRole('alert').textContent).toContain('18 Aug 2026');
    expect(screen.queryByText('What are you correcting?')).toBeNull();
    expect(screen.queryByRole('button', { name: /submit request/i })).toBeNull();
  });

  test('names the earlier day that has to be filled first', () => {
    const c = correction({ gate: { checking: false, blocked: true, blockingDate: '2026-09-12' }, blocked: true });
    render(<AttendanceCorrectionForm correction={c} onCancel={() => {}} />);
    expect(screen.getByRole('alert').textContent).toContain('12-09-2026');
  });

  test('says when both halves are already awaiting approval', () => {
    render(<AttendanceCorrectionForm correction={correction({ nothingLeft: true, blocked: true })} onCancel={() => {}} />);
    expect(screen.getByText(/already awaiting approval/i)).toBeTruthy();
  });
});

describe('AttendanceCorrectionForm — inline and dialog differ only in the way out', () => {
  test('the calendar panel gets Back', async () => {
    const onBack = vi.fn();
    render(<AttendanceCorrectionForm correction={correction()} onBack={onBack} />);
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull();
  });

  test('a dialog gets Cancel', () => {
    render(<AttendanceCorrectionForm correction={correction()} onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /back/i })).toBeNull();
  });
});
