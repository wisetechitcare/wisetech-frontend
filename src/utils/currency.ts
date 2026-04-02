import { store } from '@redux/store';

/**
 * Format a number as currency using branch currency settings
 * Falls back to INR if no currency is provided
 *
 * @param amount - The number or string to format
 * @param branchCurrency - Optional currency code from the branch (defaults to INR)
 * @param options - Optional Intl.NumberFormatOptions to customize formatting
 * @returns Formatted currency string (e.g., "₹1,234.56" or "$1,234.56")
 *
 * @example
 * // With branch currency
 * formatCurrency(1234.56, 'USD') // "$1,234.56"
 *
 * @example
 * // Without currency (defaults to INR)
 * formatCurrency(1234.56) // "₹1,234.56"
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
  const currency = branchCurrency || 'INR';

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

  try {
    return new Intl.NumberFormat(locale, defaultOptions).format(Number(amount));
  } catch (error) {
    console.error('Error formatting currency:', error);
    // Fallback to INR if there's an error
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  }
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
export const getCurrencySymbol = (currencyCode: string = 'INR'): string => {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(0)
      .replace(/\d/g, '')
      .trim();
  } catch (error) {
    console.error('Error getting currency symbol:', error);
    return '₹'; // Default to INR symbol
  }
};
