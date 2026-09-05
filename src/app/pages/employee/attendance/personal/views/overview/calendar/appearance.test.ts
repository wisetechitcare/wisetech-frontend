/**
 * The registry's resolution order, and the promise that nobody's saved colours
 * are lost when the settings screen moves onto it.
 */
import { describe, expect, it } from 'vitest';
import {
  CALENDAR_TONES,
  TONE_BY_KEY,
  resolveCalendarAppearance,
  resolveToneColor,
  resolveToneLabel,
} from './appearance';

/**
 * The config shape, cast once. The stored blob is wider than the slice's
 * interface (it carries the nested `tones` map, and older rows carry fields
 * nobody reads any more), so one narrow helper beats sprinkling casts through
 * the cases.
 */
type Cfg = Parameters<typeof resolveToneColor>[1];
const cfg = (v: unknown): Cfg => v as Cfg;

const calendar = {
  todayColor: '#4733DB',
  presentColor: '#2ecc71',
  absentColor: '#ff000d',
  onLeaveColor: '#ffbb00',
  weekendColor: '#dad9be',
  workingWeekendColor: '#3503fc',
  markedPresentViaRequestRaisedColor: '#ff00c8',
};

const saved = cfg({
  attendanceCalendar: calendar,
  attendanceOverview: { holidayColor: '#9B59B6' },
});

describe('colours already chosen survive the move', () => {
  it.each([
    ['present', '#2ecc71'],
    ['absent', '#ff000d'],
    ['leave', '#ffbb00'],
    ['half_day', '#ffbb00'],
    ['weekly_off', '#dad9be'],
    ['holiday', '#9B59B6'],
    ['regularized', '#ff00c8'],
    ['worked_on_off_day', '#3503fc'],
    ['today', '#4733DB'],
  ] as const)('%s inherits its old flat field', (key, expected) => {
    expect(resolveToneColor(key, saved)).toBe(expected);
  });

  it('falls back to the built-in tone where nothing was ever saved', () => {
    expect(resolveToneColor('overtime', saved)).toBe(TONE_BY_KEY.overtime.trio.c);
  });

  /**
   * The guard against silently repainting a grid that is currently correct:
   * `workingPattern.lateCheckinColor` is red, chosen for a bar chart. Adopting
   * it would turn the graded amber late dots red without anyone asking.
   */
  it('does NOT adopt fields the calendar never read', () => {
    const withChartColours = cfg({
      attendanceCalendar: calendar,
      attendanceOverview: { holidayColor: '#9B59B6' },
      workingPattern: { lateCheckinColor: '#E74C3C', earlyCheckoutColor: '#F39C12' },
      workingLocation: { remoteColor: '#9B59B6', onSiteColor: '#E67E22' },
    });
    expect(resolveToneColor('late_in', withChartColours)).toBe(TONE_BY_KEY.late_in.trio.c);
    expect(resolveToneColor('remote', withChartColours)).toBe(TONE_BY_KEY.remote.trio.c);
  });
});

describe('per-key overrides win, and bad values cannot paint', () => {
  const withTones = cfg({
    attendanceCalendar: { ...calendar, tones: { present: { color: '#123456', label: 'At work' } } },
  });

  it('takes the per-key colour over the legacy field', () => {
    expect(resolveToneColor('present', withTones)).toBe('#123456');
  });

  it('takes the per-key label over the shipped default', () => {
    expect(resolveToneLabel('present', withTones)).toBe('At work');
  });

  it('ignores a malformed colour and keeps resolving', () => {
    const bad = cfg({ attendanceCalendar: { presentColor: '#2ecc71', tones: { present: { color: 'green' } } } });
    expect(resolveToneColor('present', bad)).toBe('#2ecc71');
  });

  it('treats a blank label as unset rather than rendering an empty chip', () => {
    const blank = cfg({ attendanceCalendar: { tones: { present: { label: '   ' } } } });
    expect(resolveToneLabel('present', blank)).toBe('Present');
  });

  it('resolves against an empty config without throwing', () => {
    expect(resolveToneColor('present', undefined)).toBe(TONE_BY_KEY.present.trio.c);
    expect(resolveToneLabel('absent', null)).toBe('Absent');
  });
});

describe('the registry itself', () => {
  it('has no duplicate keys', () => {
    const keys = CALENDAR_TONES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives every entry a label, a hint and a valid default colour', () => {
    CALENDAR_TONES.forEach((t) => {
      expect(t.label.trim()).not.toBe('');
      expect(t.hint.trim()).not.toBe('');
      expect(t.trio.c).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('resolves every key in one pass, so the settings screen can list them all', () => {
    const { colors, labels } = resolveCalendarAppearance(saved);
    CALENDAR_TONES.forEach((t) => {
      expect(colors[t.key]).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(labels[t.key]).toBeTruthy();
    });
  });
});
