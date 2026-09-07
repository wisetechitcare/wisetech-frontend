import { describe, test, expect } from 'vitest';
import { DIAL_CODE_TO_ISO, ISO_TO_DIAL_CODE } from './dialCodes';

describe('dial code ↔ country', () => {
  // The bug this table replaced: 504 was not in the 44 entries someone typed out, so the
  // form fell back to +91 while the record kept "504" and every save wrote it back.
  test('resolves a country the hand-written list had missed', () => {
    expect(DIAL_CODE_TO_ISO['504']).toBe('hn');
    expect(ISO_TO_DIAL_CODE.hn).toBe('504');
  });

  test('shared dial codes resolve to the primary country', () => {
    expect(DIAL_CODE_TO_ISO['1']).toBe('us'); // not ca / pr / do / ky
    expect(DIAL_CODE_TO_ISO['39']).toBe('it'); // not va
    expect(DIAL_CODE_TO_ISO['91']).toBe('in');
  });

  // What the component relies on: the code it prints beside a flag is that flag's own,
  // so the two can never contradict each other.
  test('every dial code round-trips through its country', () => {
    for (const [dial, iso] of Object.entries(DIAL_CODE_TO_ISO)) {
      expect(ISO_TO_DIAL_CODE[iso]).toBe(dial);
    }
  });

  test('covers the whole dropdown, not a curated slice', () => {
    expect(Object.keys(ISO_TO_DIAL_CODE).length).toBeGreaterThan(200);
  });
});
