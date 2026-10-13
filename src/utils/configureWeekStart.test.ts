import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { APP_WEEK_START, configureWeekStart } from './configureWeekStart';

configureWeekStart();

describe('configureWeekStart', () => {
  it('sets the app constant to Monday', () => {
    expect(APP_WEEK_START).toBe(1);
  });

  it('makes dayjs weeks begin on Monday', () => {
    // 2026-10-11 is a Sunday — startOf('week') must land on Mon 5 Oct, not Sun 11.
    const sunday = dayjs('2026-10-11');
    expect(sunday.day()).toBe(0);
    const weekStart = sunday.startOf('week');
    expect(weekStart.day()).toBe(1);
    expect(weekStart.format('YYYY-MM-DD')).toBe('2026-10-05');
  });

  it('exposes Monday via localeData (MUI AdapterDayjs reads this)', () => {
    expect(dayjs().localeData().firstDayOfWeek()).toBe(1);
  });
});
