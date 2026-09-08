import { describe, test, expect } from 'vitest';
import {
  DEFAULT_TIME_FORMAT,
  TIME_TOKENS,
  normalizeTimeFormatFlag,
  resolveTimeFormat,
} from './timeFormat';

describe('normalizeTimeFormatFlag', () => {
  // The same column arrives as a Prisma boolean (branch, via the employee payload)
  // and as the '1'/'0' strings the company Formik forms round-trip through Redux.
  test('accepts both shapes the app actually stores', () => {
    expect(normalizeTimeFormatFlag(true)).toBe(true);
    expect(normalizeTimeFormatFlag('1')).toBe(true);
    expect(normalizeTimeFormatFlag('true')).toBe(true);
    expect(normalizeTimeFormatFlag(false)).toBe(false);
    expect(normalizeTimeFormatFlag('0')).toBe(false);
    expect(normalizeTimeFormatFlag('false')).toBe(false);
  });

  // The distinction the whole precedence chain rests on: "unset" is not "24h".
  // Collapsing these is what would let a branch nobody configured silently
  // override the org setting.
  test('absent is null, never false', () => {
    expect(normalizeTimeFormatFlag(null)).toBeNull();
    expect(normalizeTimeFormatFlag(undefined)).toBeNull();
    expect(normalizeTimeFormatFlag('')).toBeNull();
    expect(normalizeTimeFormatFlag({})).toBeNull();
  });
});

describe('resolveTimeFormat precedence', () => {
  test('nobody has an opinion → 12-hour, which is what the app already showed', () => {
    expect(resolveTimeFormat('inherit', null, null)).toBe('12h');
    expect(resolveTimeFormat('inherit', undefined, undefined)).toBe(DEFAULT_TIME_FORMAT);
  });

  test('org applies when the branch is unset', () => {
    expect(resolveTimeFormat('inherit', null, false)).toBe('24h');
    expect(resolveTimeFormat('inherit', null, true)).toBe('12h');
  });

  test('branch overrides its org — a region can differ from the house standard', () => {
    expect(resolveTimeFormat('inherit', false, true)).toBe('24h');
    expect(resolveTimeFormat('inherit', true, false)).toBe('12h');
  });

  test('a personal choice beats every org layer', () => {
    expect(resolveTimeFormat('24h', true, true)).toBe('24h');
    expect(resolveTimeFormat('12h', false, false)).toBe('12h');
  });

  // 'inherit' has to stay distinct from picking the value the org happens to hold
  // today: an org later switching to 24h must carry the inheritors with it and
  // leave the people who chose 12h alone.
  test("'inherit' follows the org when it changes; an explicit choice does not", () => {
    expect(resolveTimeFormat('inherit', null, true)).toBe('12h');
    expect(resolveTimeFormat('inherit', null, false)).toBe('24h');
    expect(resolveTimeFormat('12h', null, true)).toBe('12h');
    expect(resolveTimeFormat('12h', null, false)).toBe('12h');
  });
});

describe('TIME_TOKENS', () => {
  // A 12h token without a meridiem would render 14:30 as a bare "2:30".
  test('every 12h token carries a meridiem and every 24h token does not', () => {
    for (const token of Object.values(TIME_TOKENS['12h'])) expect(token).toContain('A');
    for (const token of Object.values(TIME_TOKENS['24h'])) expect(token).not.toContain('A');
  });

  test('24h uses padded H and 12h does not, so 09:05 reads as 9:05 AM', () => {
    expect(TIME_TOKENS['24h'].TIME).toBe('HH:mm');
    expect(TIME_TOKENS['12h'].TIME).toBe('h:mm A');
  });

  test('both formats offer the same shapes, so no call site can lack one', () => {
    expect(Object.keys(TIME_TOKENS['12h']).sort()).toEqual(Object.keys(TIME_TOKENS['24h']).sort());
  });
});
