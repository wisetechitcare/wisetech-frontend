export const formatINR2 = (n: number) =>
    `₹${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

export const parseCurrencyString = (str: string | undefined): number => {
    if (!str) return 0;
    return parseFloat(str.replace(/[₹,]/g, '') || '0');
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
