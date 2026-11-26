// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseDate } from '@internationalized/date';
import { KitProvider } from '@/ds/provider';
import { Calendar } from './calendar';

afterEach(cleanup);

describe('Calendar hideOutsideDays', () => {
  it('blanks adjacent-month cells while keeping in-month days pickable', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <KitProvider>
        <Calendar
          aria-label="Joining date"
          firstDayOfWeek="mon"
          hideOutsideDays
          defaultFocusedValue={parseDate('2026-10-01')}
          onChange={onChange}
        />
      </KitProvider>,
    );

    const outside = screen.getByRole('button', { name: /28 September 2026/ });
    expect(outside.classList.contains('invisible')).toBe(true);
    await user.click(outside);
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Thursday, 1 October 2026/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]?.toString()).toBe('2026-10-01');
  });

  it('shows muted outside days when hideOutsideDays is off', () => {
    render(
      <KitProvider>
        <Calendar
          aria-label="Joining date"
          firstDayOfWeek="mon"
          defaultFocusedValue={parseDate('2026-10-01')}
        />
      </KitProvider>,
    );

    const outside = screen.getByRole('button', { name: /28 September 2026/ });
    expect(outside.classList.contains('invisible')).toBe(false);
    expect(outside.textContent).toContain('28');
  });
});

describe('Calendar Monday-first week', () => {
  it('opens October 2026 with Mon 28 Sep as the first outside day (not Sun 27)', () => {
    // Oct 1 2026 is Thursday. Sunday-first would include 27 Sep; Monday-first starts at 28 Sep.
    render(
      <KitProvider>
        <Calendar
          aria-label="Joining date"
          firstDayOfWeek="mon"
          defaultFocusedValue={parseDate('2026-10-28')}
        />
      </KitProvider>,
    );

    expect(screen.getByRole('button', { name: /28 September 2026/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /27 September 2026/ })).toBeNull();
  });
});
