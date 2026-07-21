import React from 'react';
import dayjs from 'dayjs';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import HourglassBottomOutlinedIcon from '@mui/icons-material/HourglassBottomOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import { Box, Skeleton } from '@mui/material';
import YearlyKpiCard, { YearlyKpiCardProps } from '@pages/employee/salary/personal/views/my-salary/Toggle/components/salary/YearlyKpiCard';
import { PayrollSummary } from '../../types/payroll.types';
import { formatINRDecimal } from '../../utils/payrollFormatters';

interface PayrollStatsCardsProps {
    summaryData: PayrollSummary;
    showSensitiveData: boolean;
    month?: string | number;
    year?: string | number;
    isLoading?: boolean;
}

const fmtAbs = (n: number) =>
    `₹${Math.trunc(Math.abs(n)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const pendingFooter = (amount: number): { label: string; value: string } => {
    const rounded = Math.trunc(amount);
    if (rounded > 0) return { label: 'Pending', value: fmtAbs(amount) };
    if (rounded < 0) return { label: 'Extra',   value: fmtAbs(amount) };
    return { label: 'Cleared', value: '' };
};

const PayrollStatsCards: React.FC<PayrollStatsCardsProps> = ({
    summaryData,
    showSensitiveData,
    month,
    year,
    isLoading = false,
}) => {
    if (isLoading) {
        return (
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' },
                    gap: '14px',
                    mb: 3,
                }}
            >
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={130} sx={{ borderRadius: '16px' }} />
                ))}
            </Box>
        );
    }

    const now = dayjs();
    const isCurrentMonth =
        String(month ?? now.format('MM')) === now.format('MM') &&
        String(year ?? now.format('YYYY')) === now.format('YYYY');

    const monthLabel = isCurrentMonth
        ? 'Current Month'
        : dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('MMMM YYYY');

    const totalAfterAttendance = Math.max(0, summaryData.totalGrossPay - summaryData.totalVariableDeduction);
    const deductionsPending    = Math.trunc(summaryData.governmentPending);
    const payablePending       = Math.trunc(summaryData.salaryPending);
    const hasPendingArrears    = (summaryData.totalPendingArrears ?? 0) > 0;

    // Retention (fresher bond) is a company-side deduction — it gets its own card
    // instead of being folded into the government/statutory total.
    const hasRetention     = !!summaryData.hasRetention && (summaryData.totalRetention ?? 0) > 0;
    const retentionTotal   = summaryData.totalRetention ?? 0;
    const retentionPending = Math.trunc(summaryData.retentionPending ?? 0);
    const govtDeductions   = summaryData.totalGovtDeduction ?? Math.max(0, summaryData.totalFixedDeduction - retentionTotal);

    // Government-only label — retention is never listed here.
    const deductionParts = [
        ...(summaryData.hasTDS ? ['TDS'] : []),
        ...(summaryData.hasPTax ? ['PTAX'] : []),
    ];
    const deductionLabel = deductionParts.length > 0
        ? `DEDUCTIONS (${deductionParts.join(' & ')})`
        : 'DEDUCTIONS';

    const deductionFt  = pendingFooter(deductionsPending);
    const payableFt    = pendingFooter(payablePending);
    const retentionFt  = pendingFooter(retentionPending);

    const cards: YearlyKpiCardProps[] = [
        {
            label:      'TOTAL SALARY AFTER ATTENDANCE ADJUSTMENTS',
            sublabel:   'After variable deductions',
            value:      formatINRDecimal(totalAfterAttendance),
            footer:     monthLabel,
            footerValue: '',
            tone:       'blue',
            icon:       <AccountBalanceWalletOutlinedIcon fontSize="small" />,
            showSensitiveData,
        },
        {
            label:       deductionLabel,
            sublabel:    'Govt. & statutory charges',
            value:       formatINRDecimal(govtDeductions),
            footer:      deductionFt.label,
            footerValue: deductionFt.value,
            tone:        'purple',
            icon:        <AccountBalanceOutlinedIcon fontSize="small" />,
            showSensitiveData,
        },
        ...(hasRetention
            ? [{
                label:       'COMPANY DEDUCTION (RETENTION)',
                sublabel:    'Fresher bond held back',
                value:       formatINRDecimal(retentionTotal),
                footer:      retentionFt.label,
                footerValue: retentionFt.value,
                tone:        'amber' as const,
                icon:        <SavingsOutlinedIcon fontSize="small" />,
                showSensitiveData,
            }]
            : []),
        {
            label:       'PAYABLE SALARY',
            sublabel:    'Net take-home amount',
            value:       formatINRDecimal(Math.abs(summaryData.netSalary)),
            footer:      payableFt.label,
            footerValue: payableFt.value,
            tone:        summaryData.netSalary < 0 ? 'danger' : 'green',
            icon:        <CheckCircleOutlineOutlinedIcon fontSize="small" />,
            showSensitiveData,
        },
        ...(hasPendingArrears
            ? [{
                label:       'PENDING ARREARS',
                sublabel:    'Backdated increments',
                value:       formatINRDecimal(summaryData.totalPendingArrears!),
                footer:      `${summaryData.arrearCount ?? 0} record(s)`,
                footerValue: fmtAbs(summaryData.totalPendingArrears!),
                tone:        'amber' as const,
                icon:        <HourglassBottomOutlinedIcon fontSize="small" />,
                badge:       'Action Required',
                showSensitiveData,
            }]
            : []),
    ];

    // Cap at 4 per row — a 5th card (retention + arrears both present) wraps.
    const cols = Math.min(cards.length, 4);

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0,1fr))',
                    lg: `repeat(${cols}, minmax(0,1fr))`,
                },
                gap: '14px',
                mb: 3,
            }}
        >
            {cards.map((card) => (
                <YearlyKpiCard key={card.label} {...card} />
            ))}
        </Box>
    );
};

export default React.memo(PayrollStatsCards);
