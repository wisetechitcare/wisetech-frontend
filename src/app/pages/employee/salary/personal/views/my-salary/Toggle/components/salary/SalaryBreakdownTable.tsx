import { Box, Chip, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';

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
