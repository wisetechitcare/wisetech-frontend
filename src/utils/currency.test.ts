import { describe, test, expect, vi } from 'vitest';

// The module reads the store only as a fallback before the app has published a currency.
vi.mock('@redux/store', () => ({ store: { getState: () => ({}) } }));

const { formatCurrency, formatCurrencyCompact, getCurrencyLocale, getCurrencySymbol } = await import('./currency');

// Characters are built from code points, never typed: the lint rule bans a typed rupee sign in
// app code, and invisible characters in source are unreviewable.
const RUPEE = String.fromCodePoint(0x20b9);
const EURO = String.fromCodePoint(0x20ac);
const POUND = String.fromCodePoint(0xa3);
const NBSP = String.fromCodePoint(0xa0);

/** Intl separates a letter code with a no-break space; compare on plain spaces for readability. */
const plain = (s: string) => s.split(NBSP).join(' ');

/** Arabic, Devanagari or Bengali script, or a bidi mark — none of which belong in an English screen. */
const hasForeignScript = (s: string) =>
  Array.from(s).some((ch) => {
    const c = ch.codePointAt(0) ?? 0;
    return (c >= 0x0600 && c <= 0x06ff) || (c >= 0x0900 && c <= 0x09ff) || c === 0x200e || c === 0x200f;
  });

describe('amounts are written in English, whatever the currency', () => {
  test('rupees, dollars and pounds print exactly as they always have', () => {
    expect(formatCurrency(1234567.5, 'INR')).toBe(`${RUPEE}12,34,567.5`);
    expect(formatCurrency(1234567.5, 'USD')).toBe('$1,234,567.5');
    expect(formatCurrency(1234567.5, 'GBP')).toBe(`${POUND}1,234,567.5`);
  });

  test('no native script, no right-to-left marks, no decimal comma', () => {
    // Each of these used to render in its home locale inside an English screen.
    expect(plain(formatCurrency(1234567.5, 'AED'))).toBe('AED 1,234,567.5');
    expect(plain(formatCurrency(1234567.5, 'SAR'))).toBe('SAR 1,234,567.5');
    expect(formatCurrency(1234567.5, 'EUR')).toBe(`${EURO}1,234,567.5`);
    for (const code of ['AED', 'SAR', 'BDT', 'NPR', 'EUR', 'THB']) {
      expect(hasForeignScript(formatCurrency(1234567.5, code))).toBe(false);
    }
  });

  test('the currency decides only the grouping — lakh and crore where they are read', () => {
    expect(getCurrencyLocale('INR')).toBe('en-IN');
    expect(getCurrencyLocale('LKR')).toBe('en-IN');
    expect(getCurrencyLocale('BDT')).toBe('en-IN');
    expect(getCurrencyLocale('AED')).toBe('en-US');
    expect(getCurrencyLocale('EUR')).toBe('en-US');
  });

  test('the symbol and the formatted amount agree about the currency', () => {
    for (const code of ['INR', 'USD', 'AED', 'EUR', 'SAR']) {
      expect(plain(formatCurrency(100, code)).startsWith(getCurrencySymbol(code))).toBe(true);
    }
  });
});

describe('formatCurrencyCompact', () => {
  test('a letter code is set apart from the figure, as Intl does it', () => {
    expect(plain(formatCurrencyCompact(180000, 'AED'))).toBe('AED 180K');
    expect(plain(formatCurrencyCompact(2400000, 'SAR'))).toBe('SAR 2.4M');
  });

  test('a glyph sits flush, unchanged', () => {
    expect(formatCurrencyCompact(1200000, 'INR')).toBe(`${RUPEE}12 L`);
    expect(formatCurrencyCompact(1200000, 'USD')).toBe('$1.2M');
  });
});
