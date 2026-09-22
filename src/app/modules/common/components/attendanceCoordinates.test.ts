/**
 * Which point an attendance cell links to.
 *
 * The bug this exists for: the check-out cell fell back to the row's entry in the `location`
 * prop, which holds the CHECK-IN's coordinates. A row could therefore read "Check out missing"
 * and still offer a live Google Maps link pointing at the morning location — and the link was
 * believed, hiding a checkout that had never been recorded (WT-107, 16 Sept 2026).
 */
import { describe, expect, it } from 'vitest';
import { hasValidMapCoordinates, resolveAttendanceCoordinates } from './attendanceCoordinates';

const rows = [{ id: 'row-1', latitude: 19.2792793, longitude: 73.2043695 }];

describe('resolveAttendanceCoordinates — the check-in may fall back to the row', () => {
  it('uses the row entry when the cell has no coordinates of its own', () => {
    expect(resolveAttendanceCoordinates('row-1', rows)).toEqual({ lat: 19.2792793, lng: 73.2043695 });
  });

  it('prefers explicit coordinates over the row entry', () => {
    expect(resolveAttendanceCoordinates('row-1', rows, 12.5, 77.5)).toEqual({ lat: 12.5, lng: 77.5 });
  });

  it('returns null for an unknown row', () => {
    expect(resolveAttendanceCoordinates('row-9', rows)).toBeNull();
  });
});

describe('resolveAttendanceCoordinates — the check-out may NOT', () => {
  /** The regression: no checkout coordinates means no pin, never the morning pin. */
  it('returns null rather than borrowing the check-in point', () => {
    expect(resolveAttendanceCoordinates('row-1', rows, null, null, false)).toBeNull();
  });

  it('still links when the checkout has its own coordinates', () => {
    expect(resolveAttendanceCoordinates('row-1', rows, 19.14, 72.84, false)).toEqual({ lat: 19.14, lng: 72.84 });
  });
});

describe('hasValidMapCoordinates', () => {
  it('accepts a real point', () => {
    expect(hasValidMapCoordinates({ lat: 19.2792793, lng: 73.2043695 })).toBe(true);
  });

  /** 0,0 is what the write paths store when a punch carried no geolocation. */
  it('rejects null island, null and NaN', () => {
    expect(hasValidMapCoordinates({ lat: 0, lng: 0 })).toBe(false);
    expect(hasValidMapCoordinates(null)).toBe(false);
    expect(hasValidMapCoordinates({ lat: NaN, lng: 5 })).toBe(false);
  });
});
