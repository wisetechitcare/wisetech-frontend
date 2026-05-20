import { Box, Chip, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';

export interface YearlyBreakdownRow {
    month: string;
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
}

const statusStyles = {
    Paid: { color: '#15803d', bg: '#ecfdf3' },
    Pending: { color: '#dc2626', bg: '#fef2f2' },
    Partial: { color: '#d97706', bg: '#fff7e8' },
} as const;

const SalaryBreakdownTable = ({ rows, loading = false, showGovtDeduction = true }: SalaryBreakdownTableProps) => {
    if (loading) {
        return (
            <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e5edf6', p: 1.75, boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 20px rgba(15, 23, 42, 0.045)' }}>
                <Skeleton variant="text" width={220} height={34} />
                <Skeleton variant="rounded" height={280} sx={{ mt: 2, borderRadius: '14px' }} />
            </Paper>
        );
    }

    const hasRealRows = rows.some((row) => !row.isPlaceholder);

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
                            {['Month', 'Net Payable', 'Paid', 'Pending', 'PF Deduction', ...(showGovtDeduction ? ['Professional Fees'] : []), 'Status'].map((head) => (
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
                                        '&:last-child td': { borderBottom: 'none' },
                                        '&:hover td': { backgroundColor: '#fbfdff' },
                                    }}
                                >
                                    <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', py: 1.15 }}>{row.month}</TableCell>
                                    <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', py: 1.15 }}>{row.netPayable}</TableCell>
                                    <TableCell sx={{ fontSize: 13, color: '#2563eb', fontWeight: 700, whiteSpace: 'nowrap', py: 1.15 }}>{row.paid}</TableCell>
                                    <TableCell sx={{ fontSize: 13, color: '#d97706', fontWeight: 700, whiteSpace: 'nowrap', py: 1.15 }}>{row.pending}</TableCell>
                                    <TableCell sx={{ fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', py: 1.15 }}>{row.pfDeduction}</TableCell>
                                    {showGovtDeduction && (
                                        <TableCell sx={{ fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', py: 1.15 }}>{row.govtDeduction}</TableCell>
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
                                                '& .MuiChip-label': { px: 0.95 },
                                            }}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
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
