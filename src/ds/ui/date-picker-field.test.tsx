// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KitProvider } from '@/ds/provider';
import { DatePickerField, DateRangePickerField } from './date-picker-field';

afterEach(cleanup);

const openCalendar = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /calendar/i }));
  return screen.findByRole('dialog');
};

describe('DatePickerField', () => {
  it('shows an ISO value and reports picks as ISO', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <KitProvider>
        <DatePickerField label="Joining date" value="2026-10-28" onChange={onChange} />
      </KitProvider>,
    );

    expect(screen.getByRole('group', { name: 'Joining Date' }).textContent).toContain('2026.10.28');
    const dialog = await openCalendar(user);
    await user.click(within(dialog).getByRole('button', { name: /30 October 2026/ }));
    expect(onChange).toHaveBeenLastCalledWith('2026-10-30');
  });

  it('opens Monday-first with outside-month days hidden by default', async () => {
    const user = userEvent.setup();
    render(
      <KitProvider>
        <DatePickerField label="Joining date" value="2026-10-28" onChange={vi.fn()} />
      </KitProvider>,
    );

    const dialog = await openCalendar(user);
    const leadingDay = within(dialog).getByRole('button', { name: /Monday, 28 September 2026/ });
    expect(leadingDay.classList.contains('invisible')).toBe(true);
    expect(within(dialog).queryByRole('button', { name: /27 September 2026/ })).toBeNull();
  });

  it('honours firstDayOfWeek and hideOutsideDays overrides', async () => {
    const user = userEvent.setup();
    render(
      <KitProvider>
        <DatePickerField
          label="Joining date"
          value="2026-10-28"
          onChange={vi.fn()}
          firstDayOfWeek="sun"
          hideOutsideDays={false}
        />
      </KitProvider>,
    );

    const dialog = await openCalendar(user);
    const leadingDay = within(dialog).getByRole('button', { name: /Sunday, 27 September 2026/ });
    expect(leadingDay.classList.contains('invisible')).toBe(false);
  });

  it('applies ISO min / max and unavailable days', async () => {
    const user = userEvent.setup();
    render(
      <KitProvider>
        <DatePickerField
          label="Joining date"
          value="2026-10-15"
          onChange={vi.fn()}
          minValue="2026-10-10"
          maxValue="2026-10-20"
          isDateUnavailable={(date) => date === '2026-10-16'}
        />
      </KitProvider>,
    );

    const dialog = await openCalendar(user);
    expect(within(dialog).getByRole('button', { name: /, 9 October 2026/ }).getAttribute('aria-disabled')).toBe('true');
    expect(within(dialog).getByRole('button', { name: /21 October 2026/ }).getAttribute('aria-disabled')).toBe('true');
    expect(within(dialog).getByRole('button', { name: /16 October 2026/ }).getAttribute('aria-disabled')).toBe('true');
    expect(within(dialog).getByRole('button', { name: /14 October 2026/ }).getAttribute('aria-disabled')).toBeNull();
  });

  it('clears to an empty string when clearable', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <KitProvider>
        <DatePickerField label="Joining date" value="2026-10-28" onChange={onChange} isClearable />
      </KitProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('treats an impossible ISO day as empty', () => {
    render(
      <KitProvider>
        <DatePickerField label="Joining date" value="2023-02-29" onChange={vi.fn()} isClearable />
      </KitProvider>,
    );

    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });
});

describe('DateRangePickerField', () => {
  it('reports a picked range as ISO start / end', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <KitProvider>
        <DateRangePickerField label="Leave dates" value={null} placeholderValue="2026-10-01" onChange={onChange} />
      </KitProvider>,
    );

    const dialog = await openCalendar(user);
    await user.click(within(dialog).getByRole('button', { name: /, 5 October 2026/ }));
    await user.click(within(dialog).getByRole('button', { name: /, 9 October 2026/ }));
    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-10-05', end: '2026-10-09' });
  });

  it('holds confirm-mode picks as a draft: Cancel discards, OK commits', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <KitProvider>
        <DateRangePickerField
          label="Leave dates"
          value={null}
          placeholderValue="2026-10-01"
          onChange={onChange}
          confirmSelection
          presets={[{ label: 'First week', value: { start: '2026-10-01', end: '2026-10-07' } }]}
        />
      </KitProvider>,
    );

    let dialog = await openCalendar(user);
    await user.click(within(dialog).getByRole('button', { name: 'First Week' }));
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onChange).not.toHaveBeenCalled();

    dialog = await openCalendar(user);
    await user.click(within(dialog).getByRole('button', { name: 'First Week' }));
    await user.click(within(dialog).getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-10-01', end: '2026-10-07' });
  });

  it('clears to null when clearable', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <KitProvider>
        <DateRangePickerField
          label="Leave dates"
          value={{ start: '2026-10-05', end: '2026-10-09' }}
          onChange={onChange}
          isClearable
        />
      </KitProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
