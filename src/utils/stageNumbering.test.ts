import { describe, expect, it } from 'vitest';
import { formatStageNo, resolveStageFormat, stageNumber, type StageNumberingFormat } from './stageNumbering';

describe('stageNumber', () => {
  it('renders every style', () => {
    expect(stageNumber(4, 'ARABIC')).toBe('4');
    expect(stageNumber(4, 'ARABIC_PAD2')).toBe('04');
    expect(stageNumber(4, 'ARABIC_PAD3')).toBe('004');
    expect(stageNumber(4, 'ALPHA_LOWER')).toBe('d');
    expect(stageNumber(4, 'ALPHA_UPPER')).toBe('D');
    expect(stageNumber(4, 'ROMAN_LOWER')).toBe('iv');
    expect(stageNumber(4, 'ROMAN_UPPER')).toBe('IV');
  });

  it('keeps going past z and past short romans', () => {
    expect(stageNumber(26, 'ALPHA_LOWER')).toBe('z');
    expect(stageNumber(27, 'ALPHA_LOWER')).toBe('aa');
    expect(stageNumber(52, 'ALPHA_UPPER')).toBe('AZ');
    expect(stageNumber(1994, 'ROMAN_UPPER')).toBe('MCMXCIV');
    expect(stageNumber(4000, 'ROMAN_UPPER')).toBe('4000');
  });
});

describe('formatStageNo', () => {
  it('joins prefix, separator and number', () => {
    expect(formatStageNo({ prefix: 'Stage', separator: ' ', style: 'ARABIC' }, 0)).toBe('Stage 1');
    expect(formatStageNo({ prefix: 'STG', separator: '-', style: 'ARABIC_PAD2' }, 1)).toBe('STG-02');
    expect(formatStageNo({ prefix: 'stage', separator: ' ', style: 'ALPHA_LOWER' }, 2)).toBe('stage c');
  });

  it('drops the separator when there is no prefix', () => {
    expect(formatStageNo({ prefix: '', separator: ' ', style: 'ROMAN_UPPER' }, 2)).toBe('III');
  });

  it('falls back to the position with no format', () => {
    expect(formatStageNo(null, 4)).toBe('5');
  });
});

describe('resolveStageFormat', () => {
  const def: StageNumberingFormat = { id: 'd', prefix: 'Stage', separator: ' ', style: 'ARABIC', isDefault: true };
  const alt: StageNumberingFormat = { id: 'a', prefix: 'STG', separator: '-', style: 'ARABIC_PAD2' };

  it("uses the plan's own format, else the default", () => {
    expect(resolveStageFormat([def, alt], 'a')).toBe(alt);
    expect(resolveStageFormat([def, alt], null)).toBe(def);
    expect(resolveStageFormat([def, alt], 'deleted')).toBe(def);
    expect(resolveStageFormat([], null)).toBeNull();
  });
});
