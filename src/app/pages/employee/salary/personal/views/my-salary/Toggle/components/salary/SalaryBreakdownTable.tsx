import { Box, Chip, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import ExportButton, { ExportColumn } from '@app/modules/common/components/ExportButton';

/** One vocabulary for every "was this money actually paid?" question in the table. */
export type PayState = 'Paid' | 'Unpaid' | 'Partial' | 'Extra Paid' | 'None';

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
    /** Company-side retention (fresher bond) held back this month, if any. */
    retention?: string;
    /** Whether the retention held back has been settled back to the employee. */
    retentionStatus?: PayState;
    status: PayState;
    /** Whether PF + PTax + TDS deducted this month actually reached the government. */
    govtStatus?: PayState;
    /** Per-type breakdown behind govtStatus, shown on hover. */
    govtDetail?: string;
    /** Remittance state of each statutory head, so its amount can be coloured. */
    pfStatus?: PayState;
    ptaxStatus?: PayState;
    tdsStatus?: PayState;
    isPlaceholder?: boolean;
}

interface SalaryBreakdownTableProps {
    rows: YearlyBreakdownRow[];
    loading?: boolean;
    showPtax?: boolean;
    showTds?: boolean;
    tdsLabel?: string;
    showTds2?: boolean;
    showSensitiveData?: boolean;
}

const stateStyles = {
    Paid: { color: '#15803d', bg: '#ecfdf3' },
    Unpaid: { color: '#dc2626', bg: '#fef2f2' },
    Partial: { color: '#d97706', bg: '#fff7e8' },
    'Extra Paid': { color: '#2563eb', bg: '#dbeafe' },
} as const;

const NEUTRAL = '#0f172a';
const styleOf = (state?: PayState) => (state && state !== 'None' ? stateStyles[state] : null);
/** Amounts take their state's colour; anything unstated stays neutral. */
const colourOf = (state?: PayState) => styleOf(state)?.color ?? NEUTRAL;

const exportStatusConfig = {
    Paid:         { bg: stateStyles.Paid.bg,         text: stateStyles.Paid.color },
    Unpaid:       { bg: stateStyles.Unpaid.bg,       text: stateStyles.Unpaid.color },
    Partial:      { bg: stateStyles.Partial.bg,      text: stateStyles.Partial.color },
    'Extra Paid': { bg: stateStyles['Extra Paid'].bg, text: stateStyles['Extra Paid'].color },
};

const StateChip = ({ state, detail }: { state?: PayState; detail?: string }) => {
    const style = styleOf(state);
    if (!style) return <Typography sx={{ fontSize: 13, color: '#94a3b8' }}>-</Typography>;

    const chip = (
        <Chip
            size="small"
            label={state}
            sx={{
                height: 22,
                fontSize: 10.5,
                fontWeight: 800,
                borderRadius: '999px',
                color: style.color,
                backgroundColor: style.bg,
                '& .MuiChip-label': { px: 0.95 },
            }}
        />
    );

    return detail ? <Tooltip title={detail} placement="top" arrow>{chip}</Tooltip> : chip;
};

const SalaryBreakdownTable = ({ rows, loading = false, showPtax = false, showTds = true, tdsLabel = 'TDS', showTds2 = false, showSensitiveData = true }: SalaryBreakdownTableProps) => {
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

    // Whole rupees only — the table shows no paise, so the totals must not either.
    const formatCurrency = (value: number) =>
        `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    const realRows = rows.filter((r) => !r.isPlaceholder);

    // Hide any amount column that is zero for every real month.
    const allZero = (pick: (r: YearlyBreakdownRow) => string) =>
        hasRealRows && realRows.every((r) => parseAmount(pick(r)) === 0);

    const colOvertime = !allZero((r) => r.overtime);
    const colPf = !allZero((r) => r.pfDeduction);
    const colPtax = showPtax && !allZero((r) => r.ptaxDeduction);
    const colTds = showTds && !allZero((r) => r.tdsDeduction);
    const colTds2 = showTds2 && !allZero((r) => r.tds2Deduction);
    // Retention only applies to some employees — show the column only when there is any
    // (unlike the other columns, an empty year shouldn't advertise it either).
    const colRetention = hasRealRows && !allZero((r) => r.retention ?? '');
    const colPaid = !allZero((r) => r.paid);
    const colPending = !allZero((r) => r.pending);
    // Only worth a column when there is statutory money to remit at all.
    const colGovt = realRows.some((r) => r.govtStatus && r.govtStatus !== 'None');

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
            acc.retention += parseAmount(row.retention ?? '');

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
            retention: 0,
        }
    );

    // Styled export via the shared SpreadsheetML exporter (coloured headers,
    // striped rows, status pills and a totals row). Currency columns receive
    // numeric values so totals compute correctly.
    const exportData = realRows.map(r => ({
        month: r.month,
        basicSalary: parseAmount(r.basicSalary),
        overtime: parseAmount(r.overtimeDisplay || r.overtime),
        pf: parseAmount(r.pfDeduction),
        ptax: parseAmount(r.ptaxDeduction),
        tds: parseAmount(r.tdsDeduction),
        tds2: parseAmount(r.tds2Deduction),
        retention: parseAmount(r.retention ?? ''),
        netPayable: parseAmount(r.netPayable),
        paid: parseAmount(r.paid),
        pending: parseAmount(r.pending),
        status: r.status === 'None' ? '-' : r.status,
        govtStatus: r.govtStatus === 'None' ? '-' : (r.govtStatus ?? '-'),
    }));

    const exportColumns: ExportColumn[] = [
        { key: 'month',       header: 'Month',        type: 'text' },
        { key: 'basicSalary', header: 'Basic Salary', type: 'currency', showTotal: true },
        ...(colOvertime ? [{ key: 'overtime', header: 'Overtime', type: 'currency' as const, showTotal: true }] : []),
        ...(colPf    ? [{ key: 'pf',   header: 'PF',     type: 'currency' as const, showTotal: true }] : []),
        ...(colPtax ? [{ key: 'ptax', header: 'PTax', type: 'currency' as const, showTotal: true }] : []),
        ...(colTds  ? [{ key: 'tds',  header: tdsLabel, type: 'currency' as const, showTotal: true }] : []),
        ...(colTds2 ? [{ key: 'tds2', header: 'TDS 2', type: 'currency' as const, showTotal: true }] : []),
        ...(colRetention ? [{ key: 'retention', header: 'Retention', type: 'currency' as const, showTotal: true, color: '#b45309' }] : []),
        { key: 'netPayable',  header: 'Net Payable',  type: 'currency', showTotal: true },
        ...(colPaid    ? [{ key: 'paid',    header: 'Paid',    type: 'currency' as const, showTotal: true, color: '#1d4ed8' }] : []),
        ...(colPending ? [{ key: 'pending', header: 'Pending', type: 'currency' as const, showTotal: true, color: '#dc2626' }] : []),
        { key: 'status', header: 'Status', type: 'status', statusConfig: exportStatusConfig },
        ...(colGovt ? [{
            key: 'govtStatus', header: 'Govt. Deductions Paid', type: 'status' as const,
            statusConfig: exportStatusConfig,
        }] : []),
    ];

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: '16px',
                border: '1px solid #e5edf6',
                p: { xs: 1.5, sm: 1.75 },
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 20px rgba(15, 23, 42, 0.045)',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: { xs: 1.25, sm: 2 },
                    mb: 1.5,
                }}
            >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: { xs: 16, sm: 17 }, fontWeight: 800, color: '#0f172a' }}>
                        Yearly Salary Breakdown
                    </Typography>
                    <Typography sx={{ mt: 0.3, fontSize: { xs: 11.5, sm: 12 }, color: '#64748b', lineHeight: 1.4 }}>
                        Month-wise view of salary, payment status, and statutory deductions.
                    </Typography>
                </Box>
                {hasRealRows && (
                    // Full width on a phone. Floated right on its own line it spent a whole
                    // row on one control and still read as detached from the card — and a
                    // right-hugging split button is an awkward thumb reach.
                    <Box sx={{ alignSelf: { xs: 'stretch', sm: 'center' }, flexShrink: 0 }}>
                        <ExportButton
                            data={exportData}
                            columns={exportColumns}
                            filename="yearly-salary-breakdown"
                            title="Yearly Salary Breakdown"
                            subtitle="Month-wise salary, payment status and statutory deductions"
                            sheetName="Yearly Salary"
                            showTotals
                            totalLabel="TOTAL"
                            sx={{ width: { xs: '100%', sm: 'auto' } }}
                        />
                    </Box>
                )}
            </Box>

            {/* Mobile: one card per month.
                The table is 860px of thirteen columns, so on a phone it was a sideways
                scroll where the month scrolled out of view before the money arrived — you
                could see a number without knowing which month it belonged to. The card keeps
                the month, the three figures that answer "was I paid", and the deductions
                that are actually non-zero this year. */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1 }}>
                {realRows.map((row) => {
                    // Only the heads this employee actually has, using the same flags that
                    // decide the table's columns — so the two views never disagree.
                    const deductions = [
                        ...(colPf ? [{ label: 'PF', value: row.pfDeduction, state: row.pfStatus }] : []),
                        ...(colPtax ? [{ label: 'PTax', value: row.ptaxDeduction, state: row.ptaxStatus }] : []),
                        ...(colTds ? [{ label: tdsLabel, value: row.tdsDeduction, state: row.tdsStatus }] : []),
                        ...(colTds2 ? [{ label: 'TDS 2', value: row.tds2Deduction, state: undefined }] : []),
                        ...(colRetention ? [{ label: 'Retention', value: row.retention ?? '', state: row.retentionStatus }] : []),
                    ].filter((d) => parseAmount(d.value) > 0);

                    return (
                        <Box
                            key={row.month}
                            sx={{
                                border: '1px solid #e9eff6', borderRadius: '12px',
                                p: 1.25, backgroundColor: '#ffffff',
                            }}
                        >
                            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
                                <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                                    {row.month}
                                </Typography>
                                <StateChip state={row.status} />
                            </Stack>

                            {/* Read together: paid AGAINST payable, with what is left. */}
                            <Stack direction="row" alignItems="flex-end" justifyContent="space-between" spacing={1}>
                                <Box>
                                    <Typography sx={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Net Payable</Typography>
                                    <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>{row.netPayable}</Typography>
                                </Box>
                                {colPaid && (
                                    <Box>
                                        <Typography sx={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Paid</Typography>
                                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#1d4ed8' }}>{row.paid}</Typography>
                                    </Box>
                                )}
                                {colPending && (
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography sx={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Pending</Typography>
                                        <Typography sx={{
                                            fontSize: 13.5, fontWeight: 700,
                                            color: parseAmount(row.pending) > 0 ? '#dc2626' : '#16a34a',
                                        }}>
                                            {row.pending}
                                        </Typography>
                                    </Box>
                                )}
                            </Stack>

                            {/* Secondary by design — deductions explain the gap, they are not
                                the answer someone opened this for. Zero heads are omitted
                                rather than printed as a row of ₹0. */}
                            {(deductions.length > 0 || (colGovt && row.govtStatus && row.govtStatus !== 'None')) && (
                                <Stack
                                    direction="row" flexWrap="wrap" alignItems="center" columnGap={1.25} rowGap={0.5}
                                    sx={{ mt: 1, pt: 1, borderTop: '1px solid #f1f5f9' }}
                                >
                                    {deductions.map((d) => (
                                        <Typography key={d.label} sx={{ fontSize: 11, color: '#64748b' }}>
                                            {d.label}{' '}
                                            <Box component="span" sx={{ fontWeight: 700, color: '#334155' }}>{d.value}</Box>
                                        </Typography>
                                    ))}
                                    {colGovt && row.govtStatus && row.govtStatus !== 'None' && (
                                        <Tooltip title={row.govtDetail ?? ''} disableHoverListener={!row.govtDetail}>
                                            <Typography sx={{ fontSize: 11, color: '#64748b' }}>
                                                Govt{' '}
                                                <Box component="span" sx={{ fontWeight: 700, color: '#334155' }}>{row.govtStatus}</Box>
                                            </Typography>
                                        </Tooltip>
                                    )}
                                </Stack>
                            )}
                        </Box>
                    );
                })}
            </Box>

            <TableContainer
                sx={{
                    display: { xs: 'none', md: 'block' },
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
                            'Month', 'Basic Salary',
                                ...(colOvertime ? ['Overtime'] : []),
                                ...(colPf ? ['PF'] : []),
                                ...(colPtax ? ['PTax'] : []),
                                ...(colTds  ? [tdsLabel] : []),
                                ...(colTds2 ? ['TDS 2'] : []),
                                ...(colRetention ? ['Retention'] : []),
                                'Net Payable',
                                ...(colPaid ? ['Paid'] : []),
                                ...(colPending ? ['Pending'] : []),
                                'Salary Statu',
                                ...(colGovt ? ['Govt. Deductions Paid'] : []),
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
                            const salaryColour = colourOf(row.status);

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

                                    {colOvertime && (
                                        <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', py: 1.15 }}>
                                            <span className={sensitiveCls}>{row.overtimeDisplay || row.overtime}</span>
                                        </TableCell>
                                    )}

                                    {colPf && (
                                        <TableCell sx={{ fontSize: 13, fontWeight: 700, color: colourOf(row.pfStatus), whiteSpace: 'nowrap', py: 1.15 }}>
                                            <span className={sensitiveCls}>{row.pfDeduction}</span>
                                        </TableCell>
                                    )}

                                    {colPtax && (
                                        <TableCell sx={{ fontSize: 13, fontWeight: 700, color: colourOf(row.ptaxStatus), whiteSpace: 'nowrap', py: 1.15 }}>
                                            <span className={sensitiveCls}>{row.ptaxDeduction}</span>
                                        </TableCell>
                                    )}

                                    {colTds && (
                                        <TableCell sx={{ fontSize: 13, fontWeight: 700, color: colourOf(row.tdsStatus), whiteSpace: 'nowrap', py: 1.15 }}>
                                            <span className={sensitiveCls}>{row.tdsDeduction}</span>
                                        </TableCell>
                                    )}

                                    {colTds2 && (
                                        <TableCell sx={{ fontSize: 13, fontWeight: 700, color: colourOf(row.tdsStatus), whiteSpace: 'nowrap', py: 1.15 }}>
                                            <span className={sensitiveCls}>{row.tds2Deduction}</span>
                                        </TableCell>
                                    )}

                                    {colRetention && (
                                        <TableCell sx={{ fontSize: 13, fontWeight: 700, color: colourOf(row.retentionStatus), whiteSpace: 'nowrap', py: 1.15 }}>
                                            <span className={sensitiveCls}>{row.retention || '-'}</span>
                                        </TableCell>
                                    )}

                                    <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', py: 1.15 }}>
                                        <span className={sensitiveCls}>{row.netPayable}</span>
                                    </TableCell>

                                    {colPaid && (
                                        <TableCell
                                            sx={{
                                                fontSize: 13,
                                                color: salaryColour,
                                                fontWeight: 700,
                                                whiteSpace: 'nowrap',
                                                py: 1.15,
                                            }}
                                        >
                                            <span className={sensitiveCls}>{row.paid}</span>
                                        </TableCell>
                                    )}

                                    {colPending && (
                                        <TableCell
                                            sx={{
                                                fontSize: 13,
                                                color: salaryColour,
                                                fontWeight: 700,
                                                whiteSpace: 'nowrap',
                                                py: 1.15,
                                            }}
                                        >
                                            <span className={sensitiveCls}>{row.pending}</span>
                                        </TableCell>
                                    )}

                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        <StateChip state={row.status} />
                                    </TableCell>

                                    {colGovt && (
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                            <StateChip state={row.govtStatus} detail={row.govtDetail} />
                                        </TableCell>
                                    )}
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
                                {colOvertime && <TableCell><span className={sensitiveCls}>{formatCurrency(totals.overtime)}</span></TableCell>}
                                {colPf && <TableCell><span className={sensitiveCls}>{formatCurrency(totals.pfDeduction)}</span></TableCell>}

                                {colPtax && (
                                    <TableCell>
                                        <span className={sensitiveCls}>{formatCurrency(totals.ptaxDeduction)}</span>
                                    </TableCell>
                                )}

                                {colTds && (
                                    <TableCell>
                                        <span className={sensitiveCls}>{formatCurrency(totals.tdsDeduction)}</span>
                                    </TableCell>
                                )}

                                {colTds2 && (
                                    <TableCell>
                                        <span className={sensitiveCls}>{formatCurrency(totals.tds2Deduction)}</span>
                                    </TableCell>
                                )}

                                {colRetention && (
                                    <TableCell sx={{ color: '#b45309' }}>
                                        <span className={sensitiveCls}>{formatCurrency(totals.retention)}</span>
                                    </TableCell>
                                )}

                                <TableCell><span className={sensitiveCls}>{formatCurrency(totals.netPayable)}</span></TableCell>

                                {colPaid && (
                                    <TableCell sx={{ color: '#2563eb' }}>
                                        <span className={sensitiveCls}>{formatCurrency(totals.paid)}</span>
                                    </TableCell>
                                )}

                                {colPending && (
                                    <TableCell sx={{ color: '#d97706' }}>
                                        <span className={sensitiveCls}>{formatCurrency(totals.pending)}</span>
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

                                {colGovt && <TableCell />}
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
