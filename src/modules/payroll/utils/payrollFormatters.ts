export const roundPayrollAmount = (n: number) => Math.round(Number.isFinite(n) ? n : 0);

export const truncatePayrollAmount = (n: number, fractionDigits = 2) => {
    const value = Number.isFinite(n) ? n : 0;
    const factor = 10 ** fractionDigits;
    return Math.trunc(value * factor) / factor;
};

const formatINR = (n: number, fractionDigits: number) => {
    let value = Number.isFinite(n) ? (n || 0) : 0;
    
    // Truncate the value to avoid rounding up
    const factor = 10 ** fractionDigits;
    value = Math.trunc(value * factor) / factor;
    
    return `₹${value.toLocaleString('en-IN', {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    })}`;
};

export const formatINRDecimal = (n: number) => formatINR(n, 2);

export const formatINRDecimalTruncated = (n: number) => formatINR(truncatePayrollAmount(n, 2), 2);

export const formatINRRounded = (n: number) => formatINR(n, 2);

export const formatINR2 = formatINRRounded;

export const parseCurrencyString = (str: string | undefined): number => {
    if (!str) return 0;
    return parseFloat(str.replace(/[₹,\s]/g, '') || '0');
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
        const formatted = Math.round(value).toString();
        return type === 'percentage' ? `${formatted}%` : formatted;
    }
    return value.toString();
};
