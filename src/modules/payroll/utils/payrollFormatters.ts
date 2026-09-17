import { getCurrencyLocale, currencyPrefix } from '@utils/currency';
export const roundPayrollAmount = (n: number) => Math.round(Number.isFinite(n) ? n : 0);

export const truncatePayrollAmount = (n: number, fractionDigits = 2) => {
    const value = Number.isFinite(n) ? n : 0;
    const factor = 10 ** fractionDigits;
    return Math.trunc(value * factor) / factor;
};

const formatMoney = (n: number, fractionDigits: number) => {
    let value = Number.isFinite(n) ? (n || 0) : 0;
    
    // Truncate the value to avoid rounding up
    const factor = 10 ** fractionDigits;
    value = Math.trunc(value * factor) / factor;
    
    return `${currencyPrefix()}${value.toLocaleString(getCurrencyLocale(), {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    })}`;
};

export const formatMoneyDecimal = (n: number) => formatMoney(Math.trunc(n), 0);

export const formatMoneyDecimalTruncated = (n: number) => formatMoney(truncatePayrollAmount(n, 0), 0);

export const formatMoneyRounded = (n: number) => formatMoney(Math.trunc(n), 0);

export const formatMoney2 = formatMoneyRounded;

export const parseCurrencyString = (str: string | undefined): number => {
    if (!str) return 0;
    // Strip everything that is not part of a number. Naming the characters to remove is
    // what made this rupee-only: a string carrying any other symbol parsed to 0.
    return parseFloat(str.replace(/[^0-9.-]/g, '') || '0');
};

export const sumBreakdownEarnings = (entries: Record<string, any> | undefined) =>
    Object.values(entries || {}).reduce(
        (acc, item: any) => {
            const val = Number(item?.earned || 0);
            return acc + (Math.trunc(val * 100) / 100);
        },
        0
    );

export const formatValue = (value: any, type?: string) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
        // Preserve fractional values (e.g. 0.5 day for half-day leave); show integers cleanly.
        const formatted = Number.isInteger(value)
            ? value.toString()
            : (Math.round(value * 100) / 100).toString();
        return type === 'percentage' ? `${formatted}%` : formatted;
    }
    return value.toString();
};
