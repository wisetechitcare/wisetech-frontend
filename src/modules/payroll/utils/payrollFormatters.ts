export const roundPayrollAmount = (n: number) => Math.round(Number.isFinite(n) ? n : 0);

export const truncatePayrollAmount = (n: number, fractionDigits = 2) => {
    const value = Number.isFinite(n) ? n : 0;
    const factor = 10 ** fractionDigits;
    return Math.trunc(value * factor) / factor;
};

const formatINR = (n: number, fractionDigits: number) =>
    `₹${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN', {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    })}`;

export const formatINRDecimal = (n: number) => formatINR(n, 2);

export const formatINRDecimalTruncated = (n: number) => formatINR(truncatePayrollAmount(n, 2), 2);

export const formatINRRounded = (n: number) => formatINR(roundPayrollAmount(n), 0);

export const formatINR2 = formatINRRounded;

export const parseCurrencyString = (str: string | undefined): number => {
    if (!str) return 0;
    return parseFloat(str.replace(/[₹,\s]/g, '') || '0');
};

export const sumBreakdownEarnings = (entries: Record<string, any> | undefined) =>
    Object.values(entries || {}).reduce(
        (acc, item: any) => acc + Number(item?.earned || 0),
        0
    );

export const formatValue = (value: any, type?: string) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
        const formatted = value.toFixed(2);
        return type === 'percentage' ? `${formatted}%` : formatted;
    }
    return value.toString();
};
