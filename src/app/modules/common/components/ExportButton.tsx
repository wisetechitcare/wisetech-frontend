import React, { useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/ds/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/ds/ui/dropdown-menu';
import { saveAs } from 'file-saver';
import { formatCurrencyDecimal, usesIndianGrouping, currencyPrefix } from '@utils/currency';
import { toast } from '@app/modules/common/components/ui/feedback';


// ─── Column definition ─────────────────────────────────────────────────────────

export interface ExportColumn<T = any> {
    /** Key to read from each row object */
    key: string;
    /** Column header shown in the export */
    header: string;
    /**
     * 'currency'  → right-aligned, formatted as ₹x,xx,xxx.xx
     * 'number'    → right-aligned numeric
     * 'status'    → center-aligned coloured pill in Excel
     * 'text'      → default left-aligned
     */
    type?: 'text' | 'currency' | 'number' | 'status';
    align?: 'left' | 'center' | 'right';
    /** Custom formatter — return the string to display in the cell */
    format?: (value: any, row: T) => string;
    /** Fixed text colour OR function returning a hex colour */
    color?: string | ((value: any, row: T) => string);
    /** Colour map for status pills: { Paid: { bg, text }, Pending: { bg, text } } */
    statusConfig?: Record<string, { bg: string; text: string }>;
    /** Include this column in the auto-calculated totals row (currency/number only) */
    showTotal?: boolean;
    /** Omit this column from CSV output */
    csvSkip?: boolean;
    /** Omit this column from Excel output */
    xlsSkip?: boolean;
}

// ─── Component props ───────────────────────────────────────────────────────────

export interface ExportButtonProps<T = any> {
    data: T[];
    /**
     * Fetches the rows to export at click time, in place of `data`.
     *
     * For a server-paginated table, whose `data` is one page: the export has to hold every
     * row matching the current filters, and those are only on the server. Rejecting aborts
     * the export, so a failed fetch never writes a file that looks complete but is not.
     */
    getData?: () => Promise<T[]>;
    columns: ExportColumn<T>[];
    /** Base filename without extension, e.g. "monthly-salary-june-2025" */
    filename?: string;
    /** Main title rendered at the top of the exported file */
    title?: string;
    /** Subtitle / description line below the title */
    subtitle?: string;
    /** Excel sheet name (max 31 chars) */
    sheetName?: string;
    /** Append a TOTAL row summing all columns that have showTotal=true */
    showTotals?: boolean;
    /** Label for the totals row (default "TOTAL") */
    totalLabel?: string;
    /** Disable both buttons */
    disabled?: boolean;
    size?: 'small' | 'medium';
    /**
     * Button text. Defaults to "Export".
     *
     * Set it whenever a screen offers TWO exports — two identical "Export" buttons side by side
     * is a coin toss, and the reader finds out which one they wanted only after opening the file.
     */
    label?: string;
    /**
     * What will be exported, shown at the top of the menu (e.g. "2 selected rows"). Defaults to the row and
     * column counts, so the reader knows before downloading whether a filter or a selection applies.
     */
    scope?: string;
    /**
     * One square download button instead of the "Export ▾" split button — for card headers on
     * phones, where the split button wrapped onto a row of its own. Same menu, same formats;
     * the label becomes the accessible name.
     */
    iconOnly?: boolean;
}

/**
 * Column-visibility map supplied by the surrounding table (accessorKey → visible).
 * Any ExportButton rendered inside a table drops the columns the user toggled off,
 * so the file matches what is on screen. A key the map does not mention stays in —
 * export columns that have no table counterpart must not silently vanish.
 */
export const ExportVisibilityContext = React.createContext<Record<string, boolean> | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
    Paid:    { bg: '#d1fae5', text: '#065f46' },
    Pending: { bg: '#fee2e2', text: '#991b1b' },
    Partial: { bg: '#fef3c7', text: '#92400e' },
    Active:  { bg: '#dbeafe', text: '#1e40af' },
    Inactive:{ bg: '#f1f5f9', text: '#475569' },
};

// Two decimals, in whatever currency the app is showing. The hand-built version this
// replaced pasted a rupee sign in front of an en-IN number, so an export from a branch
// that bills in anything else was mislabelled in a file people keep.
function fmtCurrency(n: number): string {
    return formatCurrencyDecimal(n);
}

function fmtNumber(n: number): string {
    if (n === 0) return '0';
    return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function getRawValue<T>(row: T, col: ExportColumn<T>): any {
    const keys = col.key.split('.');
    let val: any = row;
    for (const k of keys) val = val?.[k];
    return val;
}

function getCellDisplay<T>(row: T, col: ExportColumn<T>): string {
    const raw = getRawValue(row, col);
    if (col.format) return col.format(raw, row);
    if (raw === null || raw === undefined || raw === '' || raw === '-') return '-';
    const n = Number(raw);
    if (col.type === 'currency') return isNaN(n) ? String(raw) : fmtCurrency(n);
    if (col.type === 'number') return isNaN(n) ? String(raw) : fmtNumber(n);
    return String(raw);
}

function getNumericValue<T>(row: T, col: ExportColumn<T>): number {
    if (col.format) {
        // Strip everything that is not part of a number rather than naming the characters
        // to remove. The old version stripped a rupee sign and a comma specifically, so a
        // column formatted as "AED 1,234.00" parsed to 0 and silently vanished from the
        // totals row.
        const s = col.format(getRawValue(row, col), row).replace(/[^0-9.-]/g, '');
        return Number(s) || 0;
    }
    const raw = getRawValue(row, col);
    return Number(raw) || 0;
}

function getCellColor<T>(row: T, col: ExportColumn<T>): string {
    if (!col.color) return '#0f172a';
    if (typeof col.color === 'function') return col.color(getRawValue(row, col), row);
    return col.color;
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

/**
 * CSV/formula injection guard (OWASP). A CSV cell is plain text, and spreadsheet apps EVALUATE any cell that
 * starts with = + - @ (or a tab / carriage return): an employee's remark `=HYPERLINK("http://x","Open")` became
 * a live link in finance's file. Such cells get a leading apostrophe, which spreadsheets read as "this is text".
 * Genuine numbers ("-120.50", "+5") and the empty-value dash stay as they are, so negative amounts are not
 * mangled. The .xlsx writer needs none of this: ExcelJS stores these as typed TEXT cells, never formulas.
 *
 * The trigger is checked on the value as an importer may SEE it: NFKC-normalised (full-width "＝" is "=") and
 * with leading whitespace dropped (" =1+1" — some importers trim before evaluating). The cell keeps its own
 * text; it only gains the apostrophe.
 */
export function neutralizeCsvFormula(value: string): string {
    if (value === '' || value === '-') return value;
    // A leading tab or carriage return is itself a trigger — check it before trimming whitespace away.
    if (/^[\t\r]/.test(value)) return `'${value}`;
    const seen = value.normalize('NFKC').replace(/^[\s\u00a0\ufeff]+/, '');
    if (/^[-+]?\d[\d,.\s]*$/.test(seen)) return value;
    return /^[=+\-@]/.test(seen) ? `'${value}` : value;
}

/**
 * One CSV cell: formula-neutralised, then ALWAYS quoted (inner quotes doubled). Quoting every cell, not only
 * those with a comma or newline, keeps a ';' or tab inside the cell for locales whose Excel splits on ';' —
 * an unquoted "a;=1+1" would become two cells, the second a formula. (No `sep=,` line: it breaks Excel's
 * UTF-8 BOM detection — ₹ and names would garble — and is a junk first row everywhere else.)
 */
export function csvCell(value: string): string {
    return `"${neutralizeCsvFormula(value).replace(/"/g, '""')}"`;
}

export function exportCsv<T>(
    data: T[],
    columns: ExportColumn<T>[],
    filename: string,
    title: string,
    showTotals: boolean,
    totalLabel: string,
) {
    const cols = columns.filter(c => !c.csvSkip);
    // Every cell, title and headers included: neutralised and quoted (csvCell).
    const escape = csvCell;

    const rows: string[] = [];

    // Title
    rows.push(escape(title));
    rows.push('');

    // Header row
    rows.push(cols.map(c => escape(c.header)).join(','));

    // Data rows
    data.forEach(row => {
        rows.push(cols.map(col => escape(getCellDisplay(row, col))).join(','));
    });

    // Totals row
    if (showTotals) {
        const totalCols = cols.map(col => {
            if (col.showTotal && (col.type === 'currency' || col.type === 'number')) {
                const sum = data.reduce((acc, row) => acc + getNumericValue(row, col), 0);
                return escape(col.type === 'currency' ? fmtCurrency(sum) : fmtNumber(sum));
            }
            return col === cols[0] ? escape(totalLabel) : '';
        });
        rows.push('');
        rows.push(totalCols.join(','));
    }

    const bom = '\ufeff';
    const blob = new Blob([bom + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `${filename}.csv`);
}

// ─── Excel (.xlsx) Export ─────────────────────────────────────────────────────
// Builds a real Office Open XML workbook via ExcelJS (lazy-loaded so it stays
// out of the main bundle). A true .xlsx avoids Excel's "file format and
// extension don't match" warning that XML-based .xls files always trigger.

const argb = (hex: string) => 'FF' + hex.replace('#', '').toUpperCase();

/**
 * Excel's number format for a money column, in the app's active currency.
 *
 * It has to be built rather than chosen, because a numFmt pattern carries its own digit
 * grouping — Excel will not infer lakh/crore from a locale. Indian-grouped currencies get
 * the three-section pattern (₹1,23,45,678.90, negatives falling through to the last
 * section as -₹48,079.00); everything else gets plain thousands.
 *
 * Called once per export, not per cell: resolving the symbol builds an Intl formatter, and
 * a sheet can run to thousands of rows.
 */
const currencyNumFmt = (): string => {
    // A double quote inside the symbol would end the literal and corrupt the pattern.
    const sym = currencyPrefix().replace(/"/g, '');
    return usesIndianGrouping()
        ? `[>=10000000]"${sym}"##\\,##\\,##\\,##0.00;[>=100000]"${sym}"##\\,##\\,##0.00;"${sym}"#,##0.00`
        : `"${sym}"#,##0.00`;
};

const thinBorder = (hex: string) => {
    const side = { style: 'thin' as const, color: { argb: argb(hex) } };
    return { top: side, left: side, bottom: side, right: side };
};

const colAlign = (col: ExportColumn): 'left' | 'center' | 'right' => {
    if (col.align) return col.align;
    if (col.type === 'currency' || col.type === 'number') return 'right';
    if (col.type === 'status') return 'center';
    return 'left';
};

export async function exportXlsx<T>(
    data: T[],
    columns: ExportColumn<T>[],
    filename: string,
    title: string,
    subtitle: string,
    sheetName: string,
    showTotals: boolean,
    totalLabel: string,
) {
    const ExcelJS: any = await import('exceljs');
    const Workbook = ExcelJS.Workbook ?? ExcelJS.default?.Workbook;
    const wb = new Workbook();
    const ws = wb.addWorksheet(sheetName.slice(0, 31) || 'Sheet1');

    const cols = columns.filter(c => !c.xlsSkip);
    const colCount = cols.length;
    const moneyFmt = currencyNumFmt();

    // Column widths (ExcelJS width ≈ character count; old widths were px)
    ws.columns = cols.map(col => {
        let px = 100;
        if (col.type === 'currency') px = 120;
        if (col.type === 'status') px = 90;
        if (col.header.length > 15) px = Math.max(px, col.header.length * 8);
        return { width: Math.round(px / 7) };
    });

    let r = 1;

    // Title row (merged)
    ws.mergeCells(r, 1, r, colCount);
    const titleCell = ws.getCell(r, 1);
    titleCell.value = title;
    titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: argb('#0f172a') } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(r).height = 28;
    r++;

    // Subtitle row
    if (subtitle) {
        ws.mergeCells(r, 1, r, colCount);
        const subCell = ws.getCell(r, 1);
        subCell.value = subtitle;
        subCell.font = { name: 'Calibri', size: 12, color: { argb: argb('#64748b') } };
        subCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(r).height = 18;
        r++;
    }

    // Blank spacer
    ws.getRow(r).height = 8;
    r++;

    // Header row
    const headerRow = ws.getRow(r);
    cols.forEach((col, i) => {
        const c = headerRow.getCell(i + 1);
        c.value = col.header;
        c.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb('#1e3a5f') } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = thinBorder('#2d4f7c');
    });
    headerRow.height = 22;
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: r }];
    r++;

    // Data rows
    data.forEach((row, i) => {
        const stripe = i % 2 === 0 ? '#ffffff' : '#f8fafd';
        const xRow = ws.getRow(r);

        cols.forEach((col, ci) => {
            const cell = xRow.getCell(ci + 1);
            const raw = getRawValue(row, col);
            const display = getCellDisplay(row, col);

            let bg = stripe;
            let textColor = '#0f172a';
            let bold = false;
            if (typeof col.color === 'function') textColor = col.color(raw, row) || '#0f172a';
            else if (typeof col.color === 'string') textColor = col.color;

            if (col.type === 'status') {
                const cfg = { ...DEFAULT_STATUS_CONFIG, ...(col.statusConfig ?? {}) };
                const sc = cfg[String(raw ?? display)] ?? { bg: '#f1f5f9', text: '#475569' };
                bg = sc.bg;
                textColor = sc.text;
                bold = true;
                cell.value = display;
            } else if (col.type === 'currency' || col.type === 'number') {
                bold = true;
                const n = Number(raw);
                // Write real numbers so Excel can sort/sum them; formatted
                // strings only when a custom formatter or non-numeric value.
                if (!col.format && raw !== null && raw !== undefined && raw !== '' && raw !== '-' && !isNaN(n)) {
                    cell.value = n;
                    if (col.type === 'currency') cell.numFmt = moneyFmt;
                } else {
                    cell.value = display;
                }
            } else {
                cell.value = display;
            }

            cell.font = { name: 'Calibri', size: 11, bold, color: { argb: argb(textColor) } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(bg) } };
            cell.alignment = { horizontal: colAlign(col), vertical: 'middle' };
            cell.border = thinBorder('#d1d9e6');
        });
        r++;
    });

    // Totals row
    if (showTotals) {
        const totalRow = ws.getRow(r);
        cols.forEach((col, idx) => {
            const cell = totalRow.getCell(idx + 1);
            let textColor = '#0f172a';
            let align: 'left' | 'right' = 'left';

            if (idx === 0) {
                cell.value = totalLabel;
                textColor = '#1e3a5f';
            } else if (col.showTotal && (col.type === 'currency' || col.type === 'number')) {
                const sum = data.reduce((acc, row) => acc + getNumericValue(row, col), 0);
                cell.value = sum;
                if (col.type === 'currency') cell.numFmt = moneyFmt;
                if (typeof col.color === 'string') textColor = col.color;
                align = 'right';
            }

            cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: argb(textColor) } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb('#dbeafe') } };
            cell.alignment = { horizontal: align, vertical: 'middle' };
            cell.border = thinBorder('#93c5fd');
        });
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `${filename}.xlsx`);
}

// ─── Component ────────────────────────────────────────────────────────────────

function ExportButton<T = any>({
    data,
    getData,
    columns,
    filename = 'export',
    title = 'Export',
    subtitle = '',
    sheetName = 'Sheet1',
    showTotals = false,
    totalLabel = 'TOTAL',
    disabled = false,
    size: _size = 'small',
    label = 'Export',
    scope,
    iconOnly = false,
}: ExportButtonProps<T>) {
    // Inside a table, drop the columns the viewer hid, so the file matches the screen.
    const visibility = React.useContext(ExportVisibilityContext);
    const exportCols = React.useMemo(
        () => (visibility ? columns.filter(c => visibility[c.key] !== false) : columns),
        [columns, visibility],
    );
    const [loading, setLoading] = useState<'xlsx' | 'csv' | null>(null);

    const runExport = async (type: 'xlsx' | 'csv') => {
        setLoading(type);
        try {
            const rows = getData ? await getData() : data;
            if (type === 'xlsx') {
                await exportXlsx(rows, exportCols, filename, title, subtitle, sheetName, showTotals, totalLabel);
            } else {
                exportCsv(rows, exportCols, filename, title, showTotals, totalLabel);
            }
        } catch (error) {
            console.error('Export failed:', error);
            // A `userMessage` is a refusal written for the reader (e.g. too many rows); anything
            // else is a failure they can only retry.
            const userMessage = (error as { userMessage?: string })?.userMessage;
            toast({ icon: 'error', title: 'Export failed', text: userMessage ?? 'Nothing was downloaded. Please try again.' });
        } finally {
            setLoading(null);
        }
    };

    const busy = loading !== null;
    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
    // Say what the file will hold BEFORE the download — whether a filter or a selection applies.
    const what = scope
        ?? (getData ? `All matching rows · ${plural(exportCols.length, 'column')}`
            : `${plural(data.length, 'row')} · ${plural(exportCols.length, 'column')}`);

    /*
     * One button, one menu (Storybook "Components/Dropdown Menu"). It used to be a split button whose two halves
     * both opened the same MUI menu — two targets for one action — with hex colours and no word on what the file
     * would contain. The menu sits on the top layer: Export also lives inside chart drill-downs (2100).
     */
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                disabled={disabled || busy}
                render={iconOnly
                    ? <Button variant="tinted" size="icon" loading={busy} aria-label={label} title={label} />
                    : <Button variant="outline" loading={busy} />}
            >
                {iconOnly ? (
                    <Download aria-hidden />
                ) : (
                    <>
                        {!busy && <Download data-icon="inline-start" aria-hidden />}
                        {busy ? 'Exporting…' : label}
                        {!busy && <ChevronDown data-icon="inline-end" aria-hidden />}
                    </>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" layer="top" className="w-64">
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal text-muted-foreground">{what}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => runExport('xlsx')}>
                        <FileSpreadsheet aria-hidden className="text-success-foreground" />
                        <span className="flex flex-col">
                            <span className="font-medium">Excel (.xlsx)</span>
                            <span className="text-xs text-muted-foreground">
                                {showTotals ? 'Formatted, with totals' : 'Formatted for Excel'}
                            </span>
                        </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => runExport('csv')}>
                        <FileText aria-hidden className="text-info-foreground" />
                        <span className="flex flex-col">
                            <span className="font-medium">CSV (.csv)</span>
                            <span className="text-xs text-muted-foreground">Plain text, opens anywhere</span>
                        </span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default ExportButton;
