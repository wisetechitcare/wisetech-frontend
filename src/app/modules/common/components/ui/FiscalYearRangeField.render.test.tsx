// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KitProvider } from '@/ds/provider';
import { FiscalYearRangeField } from './FiscalYearRangeField';

afterEach(cleanup);

const FISCAL_YEAR = '2026-04-01 to 2027-03-31';

const openCalendar = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /calendar/i }));
  return screen.findByRole('dialog');
};

describe('FiscalYearRangeField on the shared picker', () => {
  it('commits two day picks on OK as the stored string', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <KitProvider>
        <FiscalYearRangeField value={FISCAL_YEAR} onChange={onChange} />
      </KitProvider>,
    );

    const dialog = await openCalendar(user);
    await user.click(within(dialog).getByRole('button', { name: /, 1 April 2026/ }));
    await user.click(within(dialog).getByRole('button', { name: /30 April 2026/ }));
    await user.click(within(dialog).getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('2026-04-01 to 2026-04-30'));
  });

  it('uses the shared defaults: Monday-first, outside-month days hidden', async () => {
    const user = userEvent.setup();
    render(
      <KitProvider>
        <FiscalYearRangeField value={FISCAL_YEAR} onChange={vi.fn()} />
      </KitProvider>,
    );

    const dialog = await openCalendar(user);
    const leadingDay = within(dialog).getByRole('button', { name: /Monday, 30 March 2026/ });
    expect(leadingDay.classList.contains('invisible')).toBe(true);
  });

  it('shows outside-month days when hideOutsideDays is off', async () => {
    const user = userEvent.setup();
    render(
      <KitProvider>
        <FiscalYearRangeField value={FISCAL_YEAR} onChange={vi.fn()} hideOutsideDays={false} />
      </KitProvider>,
    );

    const dialog = await openCalendar(user);
    const leadingDay = within(dialog).getByRole('button', { name: /Monday, 30 March 2026/ });
    expect(leadingDay.classList.contains('invisible')).toBe(false);
  });

  it('keeps OK disabled for a draft past maxValue', async () => {
    const user = userEvent.setup();
    render(
      <KitProvider>
        <FiscalYearRangeField value={FISCAL_YEAR} onChange={vi.fn()} maxValue="2027-01-31" />
      </KitProvider>,
    );

    const dialog = await openCalendar(user);
    expect((within(dialog).getByRole('button', { name: 'OK' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('cannot open the calendar while readOnly', () => {
    render(
      <KitProvider>
        <FiscalYearRangeField value={FISCAL_YEAR} onChange={vi.fn()} readOnly />
      </KitProvider>,
    );

    expect((screen.getByRole('button', { name: /calendar/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('clears to an empty string when clearable', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <KitProvider>
        <FiscalYearRangeField value={FISCAL_YEAR} onChange={onChange} clearable />
      </KitProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenLastCalledWith('');
  });
});
