import React, { useState } from 'react';
import {
    Button, ButtonGroup, Menu, MenuItem, ListItemIcon, ListItemText,
    Divider, CircularProgress,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import TableChartIcon from '@mui/icons-material/TableChart';
import GridOnIcon from '@mui/icons-material/GridOn';
import { saveAs } from 'file-saver';

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
    /** Extra sx applied to the outer ButtonGroup */
    sx?: object;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
    Paid:    { bg: '#d1fae5', text: '#065f46' },
    Pending: { bg: '#fee2e2', text: '#991b1b' },
    Partial: { bg: '#fef3c7', text: '#92400e' },
    Active:  { bg: '#dbeafe', text: '#1e40af' },
    Inactive:{ bg: '#f1f5f9', text: '#475569' },
};

function fmtCurrency(n: number): string {
    if (n === 0) return '₹0.00';
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    return sign + '₹' + abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
        const s = col.format(getRawValue(row, col), row).replace(/[₹,]/g, '');
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

function exportCsv<T>(
    data: T[],
    columns: ExportColumn<T>[],
    filename: string,
    title: string,
    showTotals: boolean,
    totalLabel: string,
) {
    const cols = columns.filter(c => !c.csvSkip);
    const escape = (v: string) => {
        if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
        return v;
    };

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

    const bom = '﻿';
    const blob = new Blob([bom + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `${filename}.csv`);
}

// ─── Excel (.xlsx) Export ─────────────────────────────────────────────────────
// Builds a real Office Open XML workbook via ExcelJS (lazy-loaded so it stays
// out of the main bundle). A true .xlsx avoids Excel's "file format and
// extension don't match" warning that XML-based .xls files always trigger.

const argb = (hex: string) => 'FF' + hex.replace('#', '').toUpperCase();

// Indian-grouped rupee format (₹1,23,45,678.90). Negatives fall through to the
// last section and render as -₹48,079.00.
const INR_FORMAT = '[>=10000000]"₹"##\\,##\\,##\\,##0.00;[>=100000]"₹"##\\,##\\,##0.00;"₹"#,##0.00';

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

async function exportXlsx<T>(
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
                    if (col.type === 'currency') cell.numFmt = INR_FORMAT;
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
                if (col.type === 'currency') cell.numFmt = INR_FORMAT;
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
    columns,
    filename = 'export',
    title = 'Export',
    subtitle = '',
    sheetName = 'Sheet1',
    showTotals = false,
    totalLabel = 'TOTAL',
    disabled = false,
    size = 'small',
    sx = {},
}: ExportButtonProps<T>) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [loading, setLoading] = useState<'xlsx' | 'csv' | null>(null);
    const open = Boolean(anchorEl);

    const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
    const handleClose = () => setAnchorEl(null);

    const runExport = async (type: 'xlsx' | 'csv') => {
        handleClose();
        setLoading(type);
        try {
            if (type === 'xlsx') {
                await exportXlsx(data, columns, filename, title, subtitle, sheetName, showTotals, totalLabel);
            } else {
                exportCsv(data, columns, filename, title, showTotals, totalLabel);
            }
        } finally {
            setLoading(null);
        }
    };

    const btnSx = {
        textTransform: 'none',
        fontWeight: 700,
        fontSize: size === 'small' ? 13 : 14,
        borderColor: '#3b82f6',
        color: '#3b82f6',
        borderRadius: 0,
        '&:hover': { borderColor: '#2563eb', bgcolor: '#eff6ff' },
        '&.Mui-disabled': { opacity: 0.5 },
    };

    return (
        <>
            <ButtonGroup
                variant="outlined"
                size={size}
                disabled={disabled || loading !== null}
                sx={{
                    borderRadius: '10px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(59,130,246,0.10)',
                    ...sx,
                }}
            >
                {/* Main Export button — clicking it opens the menu too */}
                <Button
                    startIcon={
                        loading ? (
                            <CircularProgress size={14} sx={{ color: '#3b82f6' }} />
                        ) : (
                            <DownloadIcon sx={{ fontSize: 16 }} />
                        )
                    }
                    onClick={handleOpen}
                    sx={{ ...btnSx, borderRadius: '10px 0 0 10px', px: 2, py: 0.75 }}
                >
                    {loading ? 'Exporting…' : 'Export'}
                </Button>

                {/* Arrow to open menu */}
                <Button
                    size="small"
                    onClick={handleOpen}
                    sx={{ ...btnSx, borderRadius: '0 10px 10px 0', px: 0.5 }}
                    aria-controls={open ? 'export-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                >
                    <ArrowDropDownIcon sx={{ fontSize: 20 }} />
                </Button>
            </ButtonGroup>

            <Menu
                id="export-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                slotProps={{
                    paper: {
                        elevation: 3,
                        sx: {
                            mt: 0.5,
                            minWidth: 200,
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                            '& .MuiMenuItem-root': {
                                px: 2,
                                py: 1.2,
                                fontSize: 13,
                                fontWeight: 600,
                                color: '#1e293b',
                                '&:hover': { bgcolor: '#eff6ff', color: '#1d4ed8' },
                            },
                        },
                    },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <MenuItem onClick={() => runExport('xlsx')}>
                    <ListItemIcon>
                        <TableChartIcon sx={{ fontSize: 18, color: '#1d6f42' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary="Excel (.xlsx)"
                        secondary="Styled with colours"
                        secondaryTypographyProps={{ style: { fontSize: 11, color: '#64748b' } }}
                    />
                </MenuItem>
                <Divider sx={{ my: 0.25 }} />
                <MenuItem onClick={() => runExport('csv')}>
                    <ListItemIcon>
                        <GridOnIcon sx={{ fontSize: 18, color: '#0369a1' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary="CSV (.csv)"
                        secondary="Plain data, any app"
                        secondaryTypographyProps={{ style: { fontSize: 11, color: '#64748b' } }}
                    />
                </MenuItem>
            </Menu>
        </>
    );
}

export default ExportButton;
