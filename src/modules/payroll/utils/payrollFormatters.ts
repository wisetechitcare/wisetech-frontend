export const roundPayrollAmount = (n: number) => Math.round(Number.isFinite(n) ? n : 0);

export const formatINR2 = (n: number) =>
    `₹${roundPayrollAmount(n).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })}`;

export const parseCurrencyString = (str: string | undefined): number => {
    if (!str) return 0;
    return parseFloat(str.replace(/[₹â‚¹,\s]/g, '') || '0');
};

export const sumBreakdownEarnings = (entries: Record<string, any> | undefined) =>
    Object.values(entries || {}).reduce(
        (acc, item: any) => acc + Number(item?.earned || 0),
        0
    );

export const formatValue = (value: any, type?: string) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
        const formatted = Number.isInteger(value) ?
            value.toString() :
            value.toFixed(2);
        return type === 'percentage' ? `${formatted}%` : formatted;
    }
    return value.toString();
};
