/** WtField `size="sm"` select value font — matches menu option text. */
const WT_FIELD_SM_FONT = '500 13.5px Inter, Roboto, "Helvetica Neue", Arial, sans-serif';
const WT_FIELD_MD_FONT = '500 14px Inter, Roboto, "Helvetica Neue", Arial, sans-serif';

const measureText = (s: string, size: 'sm' | 'md' = 'sm'): number => {
    if (typeof document === 'undefined') return s.length * 7.2;
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return s.length * 7.2;
    ctx.font = size === 'md' ? WT_FIELD_MD_FONT : WT_FIELD_SM_FONT;
    return ctx.measureText(s).width;
};

export interface WtFieldSelectWidthOpts {
    min?: number;
    max?: number;
    /** Horizontal chrome beyond the widest label (pad, caret, icon, prefix). */
    chromePx?: number;
    size?: 'sm' | 'md';
}

/** Pad + outline + select caret — before icon/prefix. */
export function wtFieldSelectChromePx(args: {
    hasIcon?: boolean;
    prefix?: string;
    clearable?: boolean;
    size?: 'sm' | 'md';
}): number {
    const base = args.size === 'md' ? 50 : 46;
    let extra = 0;
    if (args.hasIcon) extra += 34;
    if (args.prefix) extra += measureText(args.prefix, args.size ?? 'sm') + 10;
    if (args.clearable) extra += 24;
    return Math.ceil(base + extra + 6);
}

/**
 * Width for a content-sized WtField select — control and menu share this width so labels are
 * never ellipsized in the closed field while the menu stays inside dialogs.
 */
export function wtFieldSelectWidthPx(
    labels: readonly string[],
    { min = 96, max = 360, chromePx = 44, size = 'sm' }: WtFieldSelectWidthOpts = {},
): number {
    const list = labels.length ? labels : [''];
    const textW = list.reduce((n, s) => Math.max(n, measureText(s, size)), 0);
    return Math.min(max, Math.max(min, Math.ceil(textW + chromePx)));
}
