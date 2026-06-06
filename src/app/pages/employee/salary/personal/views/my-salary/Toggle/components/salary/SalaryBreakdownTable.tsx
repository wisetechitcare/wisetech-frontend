import { Box, Button, Chip, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { saveAs } from 'file-saver';

export interface YearlyBreakdownRow {
    month: string;
    basicSalary: string;
    overtime: string;
    overtimeDisplay?: string; // optional formatted overtime value
    payable: string;
    netPayable: string;
    paid: string;
    pending: string;
    pfDeduction: string;
    govtDeduction: string;
    status: 'Paid' | 'Pending' | 'Partial';
    isPlaceholder?: boolean;
}

interface SalaryBreakdownTableProps {
    rows: YearlyBreakdownRow[];
    loading?: boolean;
    showGovtDeduction?: boolean;
    showSensitiveData?: boolean;
}

const statusStyles = {
    Paid: { color: '#15803d', bg: '#ecfdf3' },
    Pending: { color: '#dc2626', bg: '#fef2f2' },
    Partial: { color: '#d97706', bg: '#fff7e8' },
} as const;

const SalaryBreakdownTable = ({ rows, loading = false, showGovtDeduction = true, showSensitiveData = true }: SalaryBreakdownTableProps) => {
    const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';
    if (loading) {
        return (
            <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e5edf6', p: 1.75, boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 20px rgba(15, 23, 42, 0.045)' }}>
                <Skeleton variant="text" width={220} height={34} />
                <Skeleton variant="rounded" height={280} sx={{ mt: 2, borderRadius: '14px' }} />
            </Paper>
        );
    }

    const hasRealRows = rows.some((row) => !row.isPlaceholder);
    const parseAmount = (value: string) =>
        Number(value.replace(/[₹,]/g, '').trim()) || 0;

    const formatCurrency = (value: number) =>
        `₹${value.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;

    const totals = rows.reduce(
        (acc, row) => {
            if (row.isPlaceholder) return acc;

            acc.basicSalary += parseAmount(row.basicSalary);
            acc.overtime += parseAmount(row.overtime);
            acc.payable += parseAmount(row.payable);
            acc.netPayable += parseAmount(row.netPayable);
            acc.paid += parseAmount(row.paid);
            acc.pending += parseAmount(row.pending);
            acc.pfDeduction += parseAmount(row.pfDeduction);
            acc.govtDeduction += parseAmount(row.govtDeduction);

            return acc;
        },
        {
            basicSalary: 0,
            overtime: 0,
            payable: 0,
            netPayable: 0,
            paid: 0,
            pending: 0,
            pfDeduction: 0,
            govtDeduction: 0,
        }
    );
    const handleExportExcel = () => {
        const colCount = 9 + (showGovtDeduction ? 1 : 0);
        const headers = [
            'Month', 'Basic Salary', 'Overtime', 'Payable', 'Net Payable',
            'Paid', 'Pending', 'PF Deduction',
            ...(showGovtDeduction ? ['Tax Deducted at Source (TDS)'] : []),
            'Status',
        ];

        const fmt = (n: number) =>
            n === 0 ? '₹0.00' :
            (n < 0 ? '-' : '') + '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const statusBg: Record<string, string> = {
            Paid:    '#d1fae5',
            Pending: '#fee2e2',
            Partial: '#fef3c7',
        };
        const statusColor: Record<string, string> = {
            Paid:    '#065f46',
            Pending: '#991b1b',
            Partial: '#92400e',
        };

        const cell = (val: string, style = '') =>
            `<td style="padding:8px 12px;border:1px solid #d1d9e6;white-space:nowrap;font-size:12px;${style}">${val}</td>`;

        const numCell = (n: number, color = '#0f172a') =>
            cell(fmt(n), `text-align:right;color:${color};font-weight:600;`);

        const realRows = rows.filter(r => !r.isPlaceholder);

        const dataHtml = realRows.map((r, i) => {
            const bg = i % 2 === 0 ? '#ffffff' : '#f8fafd';
            const sColor = statusColor[r.status] || '#0f172a';
            const sBg    = statusBg[r.status]    || '#f1f5f9';
            return `
            <tr style="background:${bg};">
                ${cell(r.month, 'font-weight:700;color:#0f172a;')}
                ${numCell(parseAmount(r.basicSalary))}
                ${numCell(parseAmount(r.overtimeDisplay || r.overtime))}
                ${numCell(parseAmount(r.payable))}
                ${numCell(parseAmount(r.netPayable))}
                ${numCell(parseAmount(r.paid), '#1d4ed8')}
                ${numCell(parseAmount(r.pending), parseAmount(r.pending) < 0 ? '#dc2626' : '#d97706')}
                ${numCell(parseAmount(r.pfDeduction))}
                ${showGovtDeduction ? numCell(parseAmount(r.govtDeduction)) : ''}
                ${cell(r.status, `text-align:center;font-weight:700;font-size:11px;color:${sColor};background:${sBg};border-radius:4px;`)}
            </tr>`;
        }).join('');

        const totalHtml = `
            <tr style="background:#dbeafe;border-top:2px solid #3b82f6;">
                ${cell('TOTAL', 'font-weight:900;color:#1e3a5f;font-size:13px;')}
                ${numCell(totals.basicSalary)}
                ${numCell(totals.overtime)}
                ${numCell(totals.payable)}
                ${numCell(totals.netPayable)}
                ${numCell(totals.paid, '#1d4ed8')}
                ${numCell(totals.pending, totals.pending < 0 ? '#dc2626' : '#d97706')}
                ${numCell(totals.pfDeduction)}
                ${showGovtDeduction ? numCell(totals.govtDeduction) : ''}
                ${cell('Year Total', 'text-align:center;font-weight:800;color:#1e40af;background:#bfdbfe;font-size:11px;')}
            </tr>`;

        const headerCells = headers.map(h =>
            `<th style="padding:10px 14px;background:#1e3a5f;color:#ffffff;font-weight:700;font-size:12px;text-align:center;border:1px solid #2d4f7c;white-space:nowrap;">${h}</th>`
        ).join('');

        const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <!--[if gte mso 9]><xml>
    <x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>Yearly Salary</x:Name>
      <x:WorksheetOptions>
        <x:FreezePanes/><x:FrozenNoSplit/>
        <x:SplitHorizontal>4</x:SplitHorizontal>
        <x:TopRowBottomPane>4</x:TopRowBottomPane>
      </x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
  </xml><![endif]-->
  <style>
    body { font-family: Calibri, Arial, sans-serif; }
    table { border-collapse: collapse; width: 100%; }
  </style>
</head>
<body>
<table>
  <tr>
    <td colspan="${colCount}" style="font-size:18px;font-weight:900;color:#0f172a;padding:14px 12px 4px;border:none;text-align:center;">
      Yearly Salary Breakdown
    </td>
  </tr>
  <tr>
    <td colspan="${colCount}" style="font-size:12px;color:#64748b;padding:2px 12px 14px;border:none;text-align:center;">
      Month-wise view of salary, payment status, and statutory deductions.
    </td>
  </tr>
  <tr><td colspan="${colCount}" style="border:none;padding:4px;"></td></tr>
  <tr>${headerCells}</tr>
  ${dataHtml}
  <tr><td colspan="${colCount}" style="border:none;padding:3px;"></td></tr>
  ${totalHtml}
</table>
</body>
</html>`;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
        saveAs(blob, 'yearly-salary-breakdown.xls');
    };

    return (
        <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e5edf6', p: 1.75, boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 20px rgba(15, 23, 42, 0.045)' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Box>
                    <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                        Yearly Salary Breakdown
                    </Typography>
                    <Typography sx={{ mt: 0.3, fontSize: 12, color: '#64748b' }}>
                        Month-wise view of salary, payment status, and statutory deductions.
                    </Typography>
                </Box>
                {hasRealRows && (
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                        onClick={handleExportExcel}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: 13,
                            borderRadius: '10px',
                            borderColor: '#3b82f6',
                            color: '#3b82f6',
                            px: 2,
                            py: 0.75,
                            '&:hover': {
                                borderColor: '#2563eb',
                                backgroundColor: '#eff6ff',
                                color: '#2563eb',
                            },
                        }}
                    >
                        Export Excel
                    </Button>
                )}
            </Stack>

            <TableContainer
                sx={{
                    border: '1px solid #e9eff6',
                    borderRadius: '14px',
                    overflowX: 'auto',
                    backgroundColor: '#ffffff',
                }}
            >
                <Table stickyHeader sx={{ minWidth: 860 }}>
                    <TableHead>
                        <TableRow>
                            {['Month', 'Basic Salary', 'Overtime', 'Payable', 'Net Payable', 'Paid', 'Pending', 'PF Deduction', ...(showGovtDeduction ? ['Tax Deducted at Source (TDS)'] : []), 'Status'].map((head) => (
                                <TableCell
                                    key={head}
                                    sx={{
                                        backgroundColor: '#f8fafc',
                                        color: '#64748b',
                                        fontSize: 11.5,
                                        fontWeight: 800,
                                        borderBottom: '1px solid #e5edf6',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {head}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row) => {
                            const status = statusStyles[row.status];

                            return (
                                <TableRow
                                    key={row.month}
                                    hover
                                    sx={{
                                        '&:hover td': {
                                            backgroundColor: '#fbfdff',
                                        },
                                    }}
                                >
                                    <TableCell
                                        sx={{
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: '#0f172a',
                                            whiteSpace: 'nowrap',
                                            py: 1.15,
                                        }}
                                    >
                                        {row.month}
                                    </TableCell>

                                    <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', py: 1.15 }}>
                                        <span className={sensitiveCls}>{row.basicSalary}</span>
                                    </TableCell>

                                    <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', py: 1.15 }}>
                                        <span className={sensitiveCls}>{row.overtimeDisplay || row.overtime}</span>
                                    </TableCell>

                                    <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', py: 1.15 }}>
                                        <span className={sensitiveCls}>{row.payable}</span>
                                    </TableCell>

                                    <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', py: 1.15 }}>
                                        <span className={sensitiveCls}>{row.netPayable}</span>
                                    </TableCell>

                                    <TableCell
                                        sx={{
                                            fontSize: 13,
                                            color: '#2563eb',
                                            fontWeight: 700,
                                            whiteSpace: 'nowrap',
                                            py: 1.15,
                                        }}
                                    >
                                        <span className={sensitiveCls}>{row.paid}</span>
                                    </TableCell>

                                    <TableCell
                                        sx={{
                                            fontSize: 13,
                                            color: '#d97706',
                                            fontWeight: 700,
                                            whiteSpace: 'nowrap',
                                            py: 1.15,
                                        }}
                                    >
                                        <span className={sensitiveCls}>{row.pending}</span>
                                    </TableCell>

                                    <TableCell
                                        sx={{
                                            fontSize: 13,
                                            color: '#0f172a',
                                            whiteSpace: 'nowrap',
                                            py: 1.15,
                                        }}
                                    >
                                        <span className={sensitiveCls}>{row.pfDeduction}</span>
                                    </TableCell>

                                    {showGovtDeduction && (
                                        <TableCell
                                            sx={{
                                                fontSize: 13,
                                                color: '#0f172a',
                                                whiteSpace: 'nowrap',
                                                py: 1.15,
                                            }}
                                        >
                                            <span className={sensitiveCls}>{row.govtDeduction}</span>
                                        </TableCell>
                                    )}

                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        <Chip
                                            size="small"
                                            label={row.status}
                                            sx={{
                                                height: 22,
                                                fontSize: 10.5,
                                                fontWeight: 800,
                                                borderRadius: '999px',
                                                color: status.color,
                                                backgroundColor: status.bg,
                                                '& .MuiChip-label': {
                                                    px: 0.95,
                                                },
                                            }}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}

                        {/* TOTAL ROW */}
                        {hasRealRows && (
                            <TableRow
                                sx={{
                                    background:
                                        'linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)',
                                    borderTop: '2px solid #dbeafe',
                                    '& td': {
                                        fontWeight: 800,
                                        py: 1.5,
                                        backgroundColor: '#f8fbff',
                                    },
                                }}
                            >
                                <TableCell
                                    sx={{
                                        fontSize: 13,
                                        fontWeight: 900,
                                        color: '#0f172a',
                                    }}
                                >
                                    TOTAL
                                </TableCell>

                                <TableCell><span className={sensitiveCls}>{formatCurrency(totals.basicSalary)}</span></TableCell>
                                <TableCell><span className={sensitiveCls}>{formatCurrency(totals.overtime)}</span></TableCell>
                                <TableCell><span className={sensitiveCls}>{formatCurrency(totals.payable)}</span></TableCell>
                                <TableCell><span className={sensitiveCls}>{formatCurrency(totals.netPayable)}</span></TableCell>

                                <TableCell sx={{ color: '#2563eb' }}>
                                    <span className={sensitiveCls}>{formatCurrency(totals.paid)}</span>
                                </TableCell>

                                <TableCell sx={{ color: '#d97706' }}>
                                    <span className={sensitiveCls}>{formatCurrency(totals.pending)}</span>
                                </TableCell>

                                <TableCell>
                                    <span className={sensitiveCls}>{formatCurrency(totals.pfDeduction)}</span>
                                </TableCell>

                                {showGovtDeduction && (
                                    <TableCell>
                                        <span className={sensitiveCls}>{formatCurrency(totals.govtDeduction)}</span>
                                    </TableCell>
                                )}

                                <TableCell>
                                    <Chip
                                        size="small"
                                        label="Year Total"
                                        sx={{
                                            height: 24,
                                            fontSize: 10.5,
                                            fontWeight: 800,
                                            borderRadius: '999px',
                                            color: '#1d4ed8',
                                            backgroundColor: '#dbeafe',
                                        }}
                                    />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {!hasRealRows && (
                <Box
                    sx={{
                        mt: 1.5,
                        p: 2,
                        borderRadius: '14px',
                        backgroundColor: '#f8fafc',
                        border: '1px dashed #d6e0ea',
                    }}
                >
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>
                        No yearly salary records are available for this financial year yet.
                    </Typography>
                </Box>
            )}
        </Paper>
    );
};

export default SalaryBreakdownTable;
