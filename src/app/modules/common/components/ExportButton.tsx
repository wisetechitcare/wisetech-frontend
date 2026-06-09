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

// ─── Excel (SpreadsheetML / true .xls) Export ────────────────────────────────
// Uses the Excel 2003 XML Spreadsheet format — Excel opens it without warnings
// because the file IS a real XLS, not an HTML masquerading as one.

interface SmlStyle {
    bgColor: string;     // hex e.g. "#1e3a5f"
    textColor: string;   // hex
    bold: boolean;
    align: 'Left' | 'Center' | 'Right';
    fontSize: number;
    borders: boolean;
    borderColor: string;
}

function buildSpreadsheetML<T>(
    data: T[],
    columns: ExportColumn<T>[],
    title: string,
    subtitle: string,
    sheetName: string,
    showTotals: boolean,
    totalLabel: string,
): string {
    const cols = columns.filter(c => !c.xlsSkip);
    const colCount = cols.length;

    // ── Style registry: collects unique styles, assigns IDs ──────────────────
    const styleMap = new Map<string, string>();
    let styleIdx = 0;

    function sid(s: SmlStyle): string {
        const key = `${s.bgColor}|${s.textColor}|${s.bold}|${s.align}|${s.fontSize}|${s.borders}|${s.borderColor}`;
        if (!styleMap.has(key)) styleMap.set(key, `S${++styleIdx}`);
        return styleMap.get(key)!;
    }

    function styleXml(id: string, s: SmlStyle): string {
        const borders = s.borders ? `
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${s.borderColor}"/>
        <Border ss:Position="Left"   ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${s.borderColor}"/>
        <Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${s.borderColor}"/>
        <Border ss:Position="Top"    ss:LineStyle="Continuous" ss:Weight="1" ss:Color="${s.borderColor}"/>
      </Borders>` : '<Borders/>';
        return `  <Style ss:ID="${id}">
    <Alignment ss:Horizontal="${s.align}" ss:Vertical="Center" ss:WrapText="0"/>
    ${borders}
    <Font ss:FontName="Calibri" ss:Size="${s.fontSize}"${s.bold ? ' ss:Bold="1"' : ''} ss:Color="${s.textColor}"/>
    <Interior ss:Color="${s.bgColor}" ss:Pattern="Solid"/>
    <NumberFormat ss:Format="@"/>
  </Style>`;
    }

    // Pre-register fixed styles
    const ST_TITLE = sid({ bgColor:'#ffffff', textColor:'#0f172a', bold:true,  align:'Center', fontSize:18, borders:false, borderColor:'#ffffff' });
    const ST_SUB   = sid({ bgColor:'#ffffff', textColor:'#64748b', bold:false, align:'Center', fontSize:12, borders:false, borderColor:'#ffffff' });
    const ST_BLANK = sid({ bgColor:'#ffffff', textColor:'#ffffff', bold:false, align:'Left',   fontSize:11, borders:false, borderColor:'#ffffff' });
    const ST_HDR   = sid({ bgColor:'#1e3a5f', textColor:'#ffffff', bold:true,  align:'Center', fontSize:12, borders:true,  borderColor:'#2d4f7c' });

    const mkData = (bg: string, textColor: string, bold: boolean, align: 'Left'|'Center'|'Right') =>
        sid({ bgColor: bg, textColor, bold, align, fontSize: 11, borders: true, borderColor: '#d1d9e6' });

    const mkTotal = (textColor: string, align: 'Left'|'Center'|'Right') =>
        sid({ bgColor: '#dbeafe', textColor, bold: true, align, fontSize: 12, borders: true, borderColor: '#93c5fd' });

    // ── Helper: escape XML ────────────────────────────────────────────────────
    const esc = (v: string) =>
        v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    // ── Cell XML ─────────────────────────────────────────────────────────────
    const xmlCell = (value: string, styleId: string, mergeAcross = 0): string => {
        const merge = mergeAcross > 0 ? ` ss:MergeAcross="${mergeAcross}"` : '';
        return `      <Cell ss:StyleID="${styleId}"${merge}><Data ss:Type="String">${esc(value)}</Data></Cell>`;
    };

    // ── Determine per-column alignment ────────────────────────────────────────
    const colAlign = (col: ExportColumn): 'Left' | 'Center' | 'Right' => {
        if (col.align === 'left') return 'Left';
        if (col.align === 'center') return 'Center';
        if (col.align === 'right') return 'Right';
        if (col.type === 'currency' || col.type === 'number') return 'Right';
        if (col.type === 'status') return 'Center';
        return 'Left';
    };

    // ── Build rows XML ────────────────────────────────────────────────────────
    const xmlRows: string[] = [];

    // Title row (merged)
    xmlRows.push(`    <Row ss:Height="28">
${xmlCell(title, ST_TITLE, colCount - 1)}
    </Row>`);

    // Subtitle row
    if (subtitle) {
        xmlRows.push(`    <Row ss:Height="18">
${xmlCell(subtitle, ST_SUB, colCount - 1)}
    </Row>`);
    }

    // Blank spacer
    xmlRows.push(`    <Row ss:Height="8">
${xmlCell('', ST_BLANK, colCount - 1)}
    </Row>`);

    // Header row
    const hdrCells = cols.map(col => xmlCell(col.header, ST_HDR)).join('\n');
    xmlRows.push(`    <Row ss:Height="22">\n${hdrCells}\n    </Row>`);

    // Data rows
    data.forEach((row, i) => {
        const bg = i % 2 === 0 ? '#ffffff' : '#f8fafd';
        const cells = cols.map(col => {
            const display = getCellDisplay(row, col);
            const align = colAlign(col);

            let textColor = '#0f172a';

            if (col.type === 'status') {
                const cfg = { ...DEFAULT_STATUS_CONFIG, ...(col.statusConfig ?? {}) };
                const raw = String(getRawValue(row, col) ?? display);
                const sc = cfg[raw] ?? { bg: '#f1f5f9', text: '#475569' };
                const stId = sid({ bgColor: sc.bg, textColor: sc.text, bold: true, align: 'Center', fontSize: 11, borders: true, borderColor: '#d1d9e6' });
                return xmlCell(display, stId);
            }

            if (col.type === 'currency' || col.type === 'number') {
                const rawVal = getRawValue(row, col);
                if (typeof col.color === 'function') {
                    textColor = col.color(rawVal, row) || '#0f172a';
                } else if (typeof col.color === 'string') {
                    textColor = col.color;
                }
                return xmlCell(display, mkData(bg, textColor, true, align));
            }

            if (typeof col.color === 'function') {
                textColor = col.color(getRawValue(row, col), row) || '#0f172a';
            } else if (typeof col.color === 'string') {
                textColor = col.color;
            }
            return xmlCell(display, mkData(bg, textColor, false, align));
        }).join('\n');
        xmlRows.push(`    <Row>\n${cells}\n    </Row>`);
    });

    // Totals row
    if (showTotals) {
        const totalCells = cols.map((col, idx) => {
            if (idx === 0) return xmlCell(totalLabel, mkTotal('#1e3a5f', 'Left'));
            if (col.showTotal && (col.type === 'currency' || col.type === 'number')) {
                const sum = data.reduce((acc, r) => acc + getNumericValue(r, col), 0);
                const display = col.type === 'currency' ? fmtCurrency(sum) : fmtNumber(sum);
                const tc = typeof col.color === 'string' ? col.color : '#0f172a';
                return xmlCell(display, mkTotal(tc, 'Right'));
            }
            return xmlCell('', mkTotal('#0f172a', 'Left'));
        }).join('\n');
        xmlRows.push(`    <Row>\n${totalCells}\n    </Row>`);
    }

    // ── Generate <Styles> XML from registry ──────────────────────────────────
    const stylesXml = Array.from(styleMap.entries())
        .map(([key, id]) => {
            const parts = key.split('|');
            const s: SmlStyle = {
                bgColor:     parts[0],
                textColor:   parts[1],
                bold:        parts[2] === 'true',
                align:       parts[3] as SmlStyle['align'],
                fontSize:    Number(parts[4]),
                borders:     parts[5] === 'true',
                borderColor: parts[6],
            };
            return styleXml(id, s);
        })
        .join('\n');

    // ── Column widths ─────────────────────────────────────────────────────────
    const colWidthsXml = cols.map(col => {
        let w = 100;
        if (col.type === 'currency') w = 120;
        if (col.type === 'status') w = 90;
        if (col.header.length > 15) w = Math.max(w, col.header.length * 8);
        return `    <Column ss:Width="${w}"/>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Created>${new Date().toISOString()}</Created>
  </DocumentProperties>
  <ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">
    <WindowHeight>12000</WindowHeight>
    <WindowWidth>20000</WindowWidth>
    <ActiveSheet>0</ActiveSheet>
  </ExcelWorkbook>
  <Styles>
${stylesXml}
  </Styles>
  <Worksheet ss:Name="${esc(sheetName.slice(0, 31))}">
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
      <Selected/>
      <FreezePanes/>
      <FrozenNoSplit/>
      <SplitHorizontal>4</SplitHorizontal>
      <TopRowBottomPane>4</TopRowBottomPane>
      <ActivePane>2</ActivePane>
    </WorksheetOptions>
    <Table>
${colWidthsXml}
${xmlRows.join('\n')}
    </Table>
  </Worksheet>
</Workbook>`;
}

function exportXls<T>(
    data: T[],
    columns: ExportColumn<T>[],
    filename: string,
    title: string,
    subtitle: string,
    sheetName: string,
    showTotals: boolean,
    totalLabel: string,
) {
    const xml = buildSpreadsheetML(data, columns, title, subtitle, sheetName, showTotals, totalLabel);
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    saveAs(blob, `${filename}.xls`);
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
    const [loading, setLoading] = useState<'xls' | 'csv' | null>(null);
    const open = Boolean(anchorEl);

    const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
    const handleClose = () => setAnchorEl(null);

    const runExport = (type: 'xls' | 'csv') => {
        handleClose();
        setLoading(type);
        setTimeout(() => {
            try {
                if (type === 'xls') {
                    exportXls(data, columns, filename, title, subtitle, sheetName, showTotals, totalLabel);
                } else {
                    exportCsv(data, columns, filename, title, showTotals, totalLabel);
                }
            } finally {
                setLoading(null);
            }
        }, 10);
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
                <MenuItem onClick={() => runExport('xls')}>
                    <ListItemIcon>
                        <TableChartIcon sx={{ fontSize: 18, color: '#1d6f42' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary="Excel (.xls)"
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
