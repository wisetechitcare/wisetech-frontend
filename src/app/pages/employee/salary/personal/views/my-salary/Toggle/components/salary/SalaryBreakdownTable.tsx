import { Box, Chip, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import ExportButton, { ExportColumn } from '@app/modules/common/components/ExportButton';

export interface YearlyBreakdownRow {
    month: string;
    basicSalary: string;
    overtime: string;
    overtimeDisplay?: string;
    netPayable: string;
    paid: string;
    pending: string;
    pfDeduction: string;
    ptaxDeduction: string;
    tdsDeduction: string;
    tds2Deduction: string;
    status: 'Paid' | 'Pending' | 'Partial';
    isPlaceholder?: boolean;
}

interface SalaryBreakdownTableProps {
    rows: YearlyBreakdownRow[];
    loading?: boolean;
    showPtax?: boolean;
    showTds2?: boolean;
    showSensitiveData?: boolean;
}

const statusStyles = {
    Paid: { color: '#15803d', bg: '#ecfdf3' },
    Pending: { color: '#dc2626', bg: '#fef2f2' },
    Partial: { color: '#d97706', bg: '#fff7e8' },
} as const;

const SalaryBreakdownTable = ({ rows, loading = false, showPtax = false, showTds2 = false, showSensitiveData = true }: SalaryBreakdownTableProps) => {
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
            acc.netPayable += parseAmount(row.netPayable);
            acc.paid += parseAmount(row.paid);
            acc.pending += parseAmount(row.pending);
            acc.pfDeduction += parseAmount(row.pfDeduction);
            acc.ptaxDeduction += parseAmount(row.ptaxDeduction);
            acc.tdsDeduction += parseAmount(row.tdsDeduction);
            acc.tds2Deduction += parseAmount(row.tds2Deduction);

            return acc;
        },
        {
            basicSalary: 0,
            overtime: 0,
            netPayable: 0,
            paid: 0,
            pending: 0,
            pfDeduction: 0,
            ptaxDeduction: 0,
            tdsDeduction: 0,
            tds2Deduction: 0,
        }
    );

    // Styled export via the shared SpreadsheetML exporter (coloured headers,
    // striped rows, status pills and a totals row). Currency columns receive
    // numeric values so totals compute correctly.
    const realRows = rows.filter(r => !r.isPlaceholder);

    const exportData = realRows.map(r => ({
        month: r.month,
        basicSalary: parseAmount(r.basicSalary),
        overtime: parseAmount(r.overtimeDisplay || r.overtime),
        pf: parseAmount(r.pfDeduction),
        ptax: parseAmount(r.ptaxDeduction),
        tds: parseAmount(r.tdsDeduction),
        tds2: parseAmount(r.tds2Deduction),
        netPayable: parseAmount(r.netPayable),
        paid: parseAmount(r.paid),
        pending: parseAmount(r.pending),
        status: r.status,
    }));

    const exportColumns: ExportColumn[] = [
        { key: 'month',       header: 'Month',        type: 'text' },
        { key: 'basicSalary', header: 'Basic Salary', type: 'currency', showTotal: true },
        { key: 'overtime',    header: 'Overtime',     type: 'currency', showTotal: true },
        { key: 'pf',          header: 'PF',           type: 'currency', showTotal: true },
        ...(showPtax ? [{ key: 'ptax', header: 'PTax', type: 'currency' as const, showTotal: true }] : []),
        { key: 'tds',         header: 'TDS',          type: 'currency', showTotal: true },
        ...(showTds2 ? [{ key: 'tds2', header: 'TDS 2', type: 'currency' as const, showTotal: true }] : []),
        { key: 'netPayable',  header: 'Net Payable',  type: 'currency', showTotal: true },
        { key: 'paid',        header: 'Paid',         type: 'currency', showTotal: true, color: '#1d4ed8' },
        { key: 'pending',     header: 'Pending',      type: 'currency', showTotal: true, color: '#dc2626' },
        {
            key: 'status', header: 'Status', type: 'status',
            statusConfig: {
                Paid:    { bg: '#ecfdf3', text: '#15803d' },
                Pending: { bg: '#fef2f2', text: '#dc2626' },
                Partial: { bg: '#fff7e8', text: '#d97706' },
            },
        },
    ];

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
                    <ExportButton
                        data={exportData}
                        columns={exportColumns}
                        filename="yearly-salary-breakdown"
                        title="Yearly Salary Breakdown"
                        subtitle="Month-wise salary, payment status and statutory deductions"
                        sheetName="Yearly Salary"
                        showTotals
                        totalLabel="TOTAL"
                    />
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
                            {[
                                'Month', 'Basic Salary', 'Overtime', 'PF',
                                ...(showPtax ? ['PTax'] : []),
                                'TDS',
                                ...(showTds2 ? ['TDS 2'] : []),
                                'Net Payable', 'Paid', 'Pending', 'Status',
                            ].map((head) => (
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
                                        <span className={sensitiveCls}>{row.pfDeduction}</span>
                                    </TableCell>

                                    {showPtax && (
                                        <TableCell sx={{ fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', py: 1.15 }}>
                                            <span className={sensitiveCls}>{row.ptaxDeduction}</span>
                                        </TableCell>
                                    )}

                                    <TableCell sx={{ fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', py: 1.15 }}>
                                        <span className={sensitiveCls}>{row.tdsDeduction}</span>
                                    </TableCell>

                                    {showTds2 && (
                                        <TableCell sx={{ fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', py: 1.15 }}>
                                            <span className={sensitiveCls}>{row.tds2Deduction}</span>
                                        </TableCell>
                                    )}

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
                                <TableCell><span className={sensitiveCls}>{formatCurrency(totals.pfDeduction)}</span></TableCell>

                                {showPtax && (
                                    <TableCell>
                                        <span className={sensitiveCls}>{formatCurrency(totals.ptaxDeduction)}</span>
                                    </TableCell>
                                )}

                                <TableCell>
                                    <span className={sensitiveCls}>{formatCurrency(totals.tdsDeduction)}</span>
                                </TableCell>

                                {showTds2 && (
                                    <TableCell>
                                        <span className={sensitiveCls}>{formatCurrency(totals.tds2Deduction)}</span>
                                    </TableCell>
                                )}

                                <TableCell><span className={sensitiveCls}>{formatCurrency(totals.netPayable)}</span></TableCell>

                                <TableCell sx={{ color: '#2563eb' }}>
                                    <span className={sensitiveCls}>{formatCurrency(totals.paid)}</span>
                                </TableCell>

                                <TableCell sx={{ color: '#d97706' }}>
                                    <span className={sensitiveCls}>{formatCurrency(totals.pending)}</span>
                                </TableCell>

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
