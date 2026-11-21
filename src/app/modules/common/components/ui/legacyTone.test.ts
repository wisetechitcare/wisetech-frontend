import { describe, expect, it } from 'vitest';
import { HUE_TONES, STATUS_TONES } from '@/ds/lib/tone';
import { legacyTone } from './legacyTone';

describe('legacyTone', () => {
  it('translates the two legacy names that are not kit tones', () => {
    expect(legacyTone('primary')).toBe('brand');
    // There is no teal token in the kit; cyan is the same colour role.
    expect(legacyTone('teal')).toBe('cyan');
  });

  it('passes every real kit tone through untouched', () => {
    for (const tone of [...STATUS_TONES, ...HUE_TONES]) {
      expect(legacyTone(tone), tone).toBe(tone);
    }
  });

  it('falls back rather than handing a component a tone no token defines', () => {
    // Card and IconBox paint `var(--tone)`, so an unknown name would render a transparent
    // accent with nothing to say why.
    expect(legacyTone('burgundy')).toBe('brand');
    expect(legacyTone(undefined)).toBe('brand');
    expect(legacyTone(null)).toBe('brand');
    expect(legacyTone('')).toBe('brand');
    expect(legacyTone('nonsense', 'neutral')).toBe('neutral');
  });

  it('ignores inherited Object.prototype keys', () => {
    for (const name of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
      expect(legacyTone(name), name).toBe('brand');
    }
  });
});
