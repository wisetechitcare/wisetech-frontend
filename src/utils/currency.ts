import { store } from '@redux/store';

/**
 * Format a number as currency.
 *
 * Omit the currency and it uses whatever the app is currently showing — see
 * `getActiveCurrency` at the foot of this file. Pass one only when formatting an amount
 * that is NOT in the viewer's own currency, which is rare and should be deliberate.
 *
 * @param amount - The number or string to format
 * @param branchCurrency - Overrides the active currency. Omit in almost every case.
 * @param options - Optional Intl.NumberFormatOptions to customize formatting
 * @returns Formatted currency string (e.g., "₹1,234.56" or "$1,234.56")
 *
 * @example
 * // With branch currency
 * formatCurrency(1234.56, 'USD') // "$1,234.56"
 *
 * @example
 * // Without currency (uses the active one)
 * formatCurrency(1234.56) // "₹1,234.56" at an Indian branch, "د.إ1,234.56" at a Dubai one
 *
 * @example
 * // With custom options
 * formatCurrency(1234.56, 'EUR', { minimumFractionDigits: 0 }) // "€1,235"
 */
export const formatCurrency = (
  amount: number | string,
  branchCurrency?: string,
  options?: Partial<Intl.NumberFormatOptions>
): string => {
  const currency = branchCurrency || getActiveCurrency();

  // Get locale based on currency - uses Western grouping (1,000,000) by default
  // Only INR uses Indian grouping (10,00,000)
  const localeMap: Record<string, string> = {
    // Americas
    'USD': 'en-US',      // United States Dollar
    'CAD': 'en-CA',      // Canadian Dollar
    'MXN': 'es-MX',      // Mexican Peso
    'BRL': 'pt-BR',      // Brazilian Real
    'ARS': 'es-AR',      // Argentine Peso
    'CLP': 'es-CL',      // Chilean Peso
    'COP': 'es-CO',      // Colombian Peso
    'PEN': 'es-PE',      // Peruvian Sol

    // Europe
    'EUR': 'de-DE',      // Euro
    'GBP': 'en-GB',      // British Pound Sterling
    'CHF': 'de-CH',      // Swiss Franc
    'SEK': 'sv-SE',      // Swedish Krona
    'NOK': 'nb-NO',      // Norwegian Krone
    'DKK': 'da-DK',      // Danish Krone
    'PLN': 'pl-PL',      // Polish Zloty
    'CZK': 'cs-CZ',      // Czech Koruna
    'HUF': 'hu-HU',      // Hungarian Forint
    'RON': 'ro-RO',      // Romanian Leu
    'BGN': 'bg-BG',      // Bulgarian Lev
    'HRK': 'hr-HR',      // Croatian Kuna
    'RUB': 'ru-RU',      // Russian Ruble
    'TRY': 'tr-TR',      // Turkish Lira
    'UAH': 'uk-UA',      // Ukrainian Hryvnia

    // Middle East & Africa
    'AED': 'ar-AE',      // UAE Dirham
    'SAR': 'ar-SA',      // Saudi Riyal
    'QAR': 'ar-QA',      // Qatari Riyal
    'OMR': 'ar-OM',      // Omani Rial
    'KWD': 'ar-KW',      // Kuwaiti Dinar
    'BHD': 'ar-BH',      // Bahraini Dinar
    'JOD': 'ar-JO',      // Jordanian Dinar
    'LBP': 'ar-LB',      // Lebanese Pound
    'EGP': 'ar-EG',      // Egyptian Pound
    'ILS': 'he-IL',      // Israeli Shekel
    'ZAR': 'en-ZA',      // South African Rand
    'NGN': 'en-NG',      // Nigerian Naira
    'KES': 'en-KE',      // Kenyan Shilling

    // Asia Pacific
    'INR': 'en-IN',      // Indian Rupee (Indian grouping: 10,00,000)
    'PKR': 'en-PK',      // Pakistani Rupee
    'BDT': 'bn-BD',      // Bangladeshi Taka
    'LKR': 'si-LK',      // Sri Lankan Rupee
    'NPR': 'ne-NP',      // Nepalese Rupee
    'CNY': 'zh-CN',      // Chinese Yuan
    'JPY': 'ja-JP',      // Japanese Yen
    'KRW': 'ko-KR',      // South Korean Won
    'TWD': 'zh-TW',      // Taiwan Dollar
    'HKD': 'zh-HK',      // Hong Kong Dollar
    'SGD': 'en-SG',      // Singapore Dollar
    'MYR': 'ms-MY',      // Malaysian Ringgit
    'IDR': 'id-ID',      // Indonesian Rupiah
    'PHP': 'en-PH',      // Philippine Peso
    'THB': 'th-TH',      // Thai Baht
    'VND': 'vi-VN',      // Vietnamese Dong
    'MMK': 'my-MM',      // Myanmar Kyat
    'KHR': 'km-KH',      // Cambodian Riel
    'LAK': 'lo-LA',      // Lao Kip
    'BND': 'ms-BN',      // Brunei Dollar

    // Oceania
    'AUD': 'en-AU',      // Australian Dollar
    'NZD': 'en-NZ',      // New Zealand Dollar
    'FJD': 'en-FJ',      // Fijian Dollar

    // Other important currencies
    'IRR': 'fa-IR',      // Iranian Rial
    'AFN': 'fa-AF',      // Afghan Afghani
    'IQD': 'ar-IQ',      // Iraqi Dinar
    'SYP': 'ar-SY',      // Syrian Pound
    'YER': 'ar-YE',      // Yemeni Rial
  };

  const locale = localeMap[currency] || 'en-US';  // Default to Western grouping

  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  };

  // Truncate the amount to avoid rounding up by Intl.NumberFormat
  let valueToFormat = Number(amount);
  if (defaultOptions.maximumFractionDigits !== undefined) {
    const factor = Math.pow(10, defaultOptions.maximumFractionDigits);
    // Use Math.trunc to simply chop off the extra decimals
    valueToFormat = Math.trunc(valueToFormat * factor) / factor;
  }

  try {
    return new Intl.NumberFormat(locale, defaultOptions).format(valueToFormat);
  } catch (error) {
    console.error('Error formatting currency:', error);
    // Fallback to INR if there's an error
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(valueToFormat);
  }
};

/**
 * Format a number as currency with EXACTLY 2 decimal places.
 * To be used for all intermediate calculations: daily salary, hourly salary, etc.
 */
export const formatCurrencyDecimal = (
  amount: number | string,
  branchCurrency?: string,
  options?: Partial<Intl.NumberFormatOptions>
): string => {
  return formatCurrency(amount, branchCurrency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  });
};

/**
 * Format a number as currency with exactly 0 decimal places.
 * To be used ONLY for the final net payable and TDS.
 */
export const formatCurrencyRounded = (
  amount: number | string,
  branchCurrency?: string,
  options?: Partial<Intl.NumberFormatOptions>
): string => {
  return formatCurrency(amount, branchCurrency, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options
  });
};

/**
 * Currencies a reader groups in lakh and crore rather than thousand and million.
 * Nothing to do with the country a branch sits in — it is how the NUMBER is read.
 */
const INDIAN_GROUPED = new Set(['INR', 'PKR', 'BDT', 'NPR', 'LKR']);

/**
 * Compact currency for dashboards and chips.
 * e.g. 249470070000 → "₹24,947.01 Cr" · 350000 → "₹3.50 L" · 1200000 → "$1.2M"
 */
export const formatCurrencyCompact = (
  amount: number | string,
  branchCurrency?: string
): string => {
  const currency = branchCurrency || getActiveCurrency();
  const n = Number(amount) || 0;
  const symbol = getCurrencySymbol(currency);
  const abs = Math.abs(n);

  // "24,947 Cr" is how an Indian reader takes in a large number at a glance. The same
  // suffix on dollars is not a quantity anyone reads, so only the lakh/crore currencies
  // get it and everything else gets K/M/B.
  if (INDIAN_GROUPED.has(currency)) {
    if (abs >= 1e7) return `${symbol}${(n / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
    if (abs >= 1e5) return `${symbol}${(n / 1e5).toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`;
    return formatCurrencyRounded(n, currency);
  }

  if (abs >= 1e9) return `${symbol}${(n / 1e9).toLocaleString('en-US', { maximumFractionDigits: 2 })}B`;
  if (abs >= 1e6) return `${symbol}${(n / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 })}M`;
  if (abs >= 1e3) return `${symbol}${(n / 1e3).toLocaleString('en-US', { maximumFractionDigits: 1 })}K`;
  return formatCurrencyRounded(n, currency);
};

/**
 * Get the currency symbol for a given currency code
 *
 * @param currencyCode - ISO currency code (e.g., 'INR', 'USD')
 * @returns Currency symbol (e.g., '₹', '$')
 *
 * @example
 * getCurrencySymbol('INR') // "₹"
 * getCurrencySymbol('USD') // "$"
 */
/**
 * Resolved symbols, keyed by ISO code.
 *
 * Every lookup below builds an Intl.NumberFormat, formats a zero and throws the digits
 * away. Cheap once; not cheap inside a cell renderer running down a thousand-row table,
 * which is where most callers now are. A session has one active currency, so this map holds
 * one or two entries for its whole life.
 */
const symbolCache = new Map<string, string>();

export const getCurrencySymbol = (currencyCode?: string): string => {
  const code = currencyCode || getActiveCurrency();
  const cached = symbolCache.get(code);
  if (cached !== undefined) return cached;

  let symbol: string;
  try {
    symbol = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(0)
      .replace(/\d/g, '')
      .trim();
  } catch (error) {
    // An unknown ISO code from the database. Cached like any other answer, so it cannot
    // throw once per rendered cell.
    console.error('Error getting currency symbol:', error);
    symbol = '₹';
  }

  symbolCache.set(code, symbol);
  return symbol;
};

/** The currency assumed when neither the branch nor its country can say. */
export const DEFAULT_CURRENCY = 'INR';

/**
 * Which currency to actually use: what was explicitly set, else what the country uses,
 * else rupees.
 *
 * THE MISSING HALF OF THIS FILE. Everything above can format ~70 currencies and resolve a
 * symbol for each, but nothing ever told it WHICH — practically every `formatCurrency()`
 * call site omits the argument, so the support exists and every screen silently prints
 * rupees. This is the piece that answers the question; `hooks/useCurrency` is the React
 * binding that feeds it.
 *
 * An explicit setting always wins. A branch in the UAE billing in dollars is a real
 * arrangement, and deriving from the country would quietly overrule whoever chose it.
 *
 * Both arguments are plain values on purpose — no lookup, no fetch, no clock — so the rule
 * is testable on its own and cannot drift from wherever the data happens to come from.
 * `countryCurrency` is the ISO 4217 code off the country record (the geo directory carries
 * one for all 250 countries); do not hand-maintain a country-to-currency map, it would be a
 * smaller, staler copy of data the app already has.
 */
export const resolveCurrency = (
  explicit?: string | null,
  countryCurrency?: string | null,
): string => {
  const set = String(explicit ?? '').trim().toUpperCase();
  if (set.length === 3) return set;

  const derived = String(countryCurrency ?? '').trim().toUpperCase();
  if (derived.length === 3) return derived;

  return DEFAULT_CURRENCY;
};

/**
 * The currency the app is currently showing, for the code that cannot call a hook.
 *
 * Roughly half the money in this app is formatted from outside React: salary-slip export,
 * the analytics utils, the statistics helpers. Threading a currency argument through all of
 * them would mean touching every caller of every caller, and one missed link silently prints
 * the wrong unit. So the resolved currency is published here once and every formatter in this
 * file falls back to it. `hooks/useCurrency` is what publishes it.
 *
 * A module-level value is a deliberate trade. It is display-only, and a session shows one
 * user at one branch — the same assumption the app already makes for its date and time
 * format. It must never be used to DECIDE anything: a stored amount, a comparison, a total.
 * Those carry their own currency or they are wrong.
 */
let activeCurrency: string | null = null;

/** Publish the resolved currency. Called by the React binding; see `hooks/useCurrency`. */
export const setActiveCurrency = (code?: string | null): void => {
  const next = String(code ?? '').trim().toUpperCase();
  activeCurrency = next.length === 3 ? next : null;
};

/**
 * What the formatters fall back to.
 *
 * Before the React binding has published anything — a module formatting during the first
 * render, or a test — this reads the branch's own explicit currency straight off the store,
 * so an early call is still right for a branch that set one. The country-derived step needs
 * the geo directory, which only the hook has, so that one genuinely waits for it.
 */
export const getActiveCurrency = (): string => {
  if (activeCurrency) return activeCurrency;
  const explicit = (store.getState() as any)?.employee?.currentEmployee?.branches?.currency;
  return resolveCurrency(explicit);
};

/**
 * Does this currency group in lakh and crore rather than thousand and million?
 *
 * Exported for the places that must build their OWN number format and cannot call
 * formatCurrency — Excel's numFmt on an exported sheet being the one that matters, since
 * the grouping is baked into the pattern string rather than chosen by a locale.
 */
export const usesIndianGrouping = (code?: string): boolean =>
  INDIAN_GROUPED.has(code || getActiveCurrency());
