import React from 'react';
import dayjs from 'dayjs';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import HourglassBottomOutlinedIcon from '@mui/icons-material/HourglassBottomOutlined';
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
    `₹${Math.round(Math.abs(n)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const pendingFooter = (amount: number): { label: string; value: string } => {
    const rounded = Math.round(amount);
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
    const deductionsPending    = Math.round(summaryData.governmentPending);
    const payablePending       = Math.round(summaryData.salaryPending);
    const hasPendingArrears    = (summaryData.totalPendingArrears ?? 0) > 0;

    let deductionLabel = 'DEDUCTIONS';
    if (summaryData.hasTDS && summaryData.hasPTax) deductionLabel = 'DEDUCTIONS (TDS & PTAX)';
    else if (summaryData.hasTDS)                   deductionLabel = 'DEDUCTIONS (TDS)';
    else if (summaryData.hasPTax)                  deductionLabel = 'DEDUCTIONS (PTAX)';

    const deductionFt  = pendingFooter(deductionsPending);
    const payableFt    = pendingFooter(payablePending);

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
            sublabel:    'Govt. & fixed charges',
            value:       formatINRDecimal(summaryData.totalFixedDeduction),
            footer:      deductionFt.label,
            footerValue: deductionFt.value,
            tone:        'purple',
            icon:        <AccountBalanceOutlinedIcon fontSize="small" />,
            showSensitiveData,
        },
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

    const cols = hasPendingArrears ? 4 : 3;

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
