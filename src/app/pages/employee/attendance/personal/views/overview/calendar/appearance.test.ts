/**
 * The registry's resolution order, and the promise that nobody's saved colours
 * are lost when the settings screen moves onto it.
 */
import { describe, expect, it } from 'vitest';
import {
  CALENDAR_TONES,
  LEGEND_TONES,
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
    expect(resolveToneColor('remote', saved)).toBe(TONE_BY_KEY.remote.trio.c);
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

/**
 * The alignment itself.
 *
 * Config and legend showed different things because they were built from
 * different lists. These pin the property that made that impossible: both are
 * projections of CALENDAR_TONES, and the only entries the legend drops are the
 * ones explicitly marked as grid furniture rather than day categories.
 */
describe('the settings screen and the legend list the same things', () => {
  it('drops exactly the entries marked legend:false, and nothing else', () => {
    const excluded = CALENDAR_TONES.filter((t) => !LEGEND_TONES.includes(t));
    expect(excluded.every((t) => t.legend === false)).toBe(true);
  });

  /**
   * The legend is a reading key, not an inventory. This pins it to the eleven
   * categories the product already shipped — an expansion to every paintable
   * key made it a three-row wall that taught less, not more.
   */
  it('keeps the legend to the eleven day categories', () => {
    expect(LEGEND_TONES.map((t) => t.key)).toEqual([
      'present', 'absent', 'leave', 'half_day', 'holiday', 'weekly_off',
      'regularized', 'worked_on_off_day', 'late_in', 'request_pending', 'missing_check_out',
    ]);
  });

  it('never drops a day STATUS from the legend — only marks and furniture', () => {
    CALENDAR_TONES.filter((t) => t.legend === false).forEach((t) => {
      expect(t.group).not.toBe('status');
    });
  });

  /** Every entry the legend omits stays configurable, and still paints. */
  it('keeps omitted entries in the settings screen', () => {
    const omitted = CALENDAR_TONES.filter((t) => t.legend === false);
    expect(omitted.length).toBeGreaterThan(0);
    omitted.forEach((t) => expect(CALENDAR_TONES).toContain(t));
  });

  /**
   * The rule that keeps a settings row from configuring a colour that can never
   * appear. `composeDay` emits none of these, so a row for them would be the
   * same dead control the seven flat fields used to be.
   */
  it('lists nothing the server never emits', () => {
    const neverEmitted = ['early_in', 'early_out', 'late_out', 'overtime'];
    const keys = CALENDAR_TONES.map((t) => String(t.key));
    neverEmitted.forEach((k) => expect(keys).not.toContain(k));
  });

  /**
   * "Present" is stored twice — once for the calendar, once for the Attendance
   * Overview group the dashboard reads — and the two had drifted apart. Editing
   * one must now write both.
   */
  it('mirrors the duplicated concepts into the Attendance Overview group', () => {
    const mirrors = Object.fromEntries(
      CALENDAR_TONES.filter((t) => t.mirrorTo).map((t) => [t.key, t.mirrorTo]),
    );
    expect(mirrors.present).toContain('attendanceOverview.presentColor');
    expect(mirrors.absent).toContain('attendanceOverview.absentColor');
    expect(mirrors.leave).toContain('attendanceOverview.onLeaveColor');
    expect(mirrors.worked_on_off_day).toContain('attendanceOverview.extraDayColor');
  });

  /** The three that used to resolve to the same green as Present. */
  it('gives the unresolved-day marks tones of their own', () => {
    const present = resolveToneColor('present', undefined);
    (['request_pending', 'request_rejected', 'missing_check_in', 'missing_check_out'] as const).forEach((k) => {
      expect(resolveToneColor(k, undefined)).not.toBe(present);
    });
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
