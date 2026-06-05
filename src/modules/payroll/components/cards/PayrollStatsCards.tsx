import React from 'react';
import dayjs from 'dayjs';
import { KTIcon } from '@metronic/helpers';
import { PayrollSummary } from '../../types/payroll.types';
import { formatINRDecimal } from '../../utils/payrollFormatters';

interface PayrollStatsCardsProps {
    summaryData: PayrollSummary;
    showSensitiveData: boolean;
    month?: string | number;
    year?: string | number;
}

type Tone = 'blue' | 'purple' | 'green' | 'danger' | 'info' | 'warning';

const toneMap: Record<Tone, { color: string; bg: string; border: string }> = {
    blue:    { color: '#2563eb', bg: '#eff6ff', border: '#dbeafe' },
    purple:  { color: '#7c3aed', bg: '#f5f3ff', border: '#e9d5fe' },
    green:   { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    danger:  { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    info:    { color: '#7c3aed', bg: '#f5f3ff', border: '#d8b4fe' },
    warning: { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
};

const formatFooterAmount = (amount: number) =>
    `₹${Math.round(Math.abs(amount)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const formatPendingFooter = (pendingAmount: number) => {
    if (pendingAmount > 0) return { label: 'Pending', value: formatFooterAmount(pendingAmount) };
    if (pendingAmount < 0) return { label: 'Extra',   value: formatFooterAmount(pendingAmount) };
    return { label: 'Cleared', value: '' };
};

interface Card {
    label: string;
    value: number;
    tone: Tone;
    icon: string;
    footer: string;
    footerValue: string;
    footerTone: Tone;
}

const PayrollStatsCards: React.FC<PayrollStatsCardsProps> = ({ summaryData, showSensitiveData, month, year }) => {
    const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';

    const now = dayjs();
    const isCurrentMonth =
        String(month ?? now.format('MM')) === now.format('MM') &&
        String(year ?? now.format('YYYY')) === now.format('YYYY');

    const monthLabel = isCurrentMonth
        ? 'Current Month'
        : dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('MMMM YYYY');

    const totalAfterAttendance = Math.max(0, summaryData.totalGrossPay - summaryData.totalVariableDeduction);
    const deductionsPending    = summaryData.governmentPending;
    const payablePending       = summaryData.salaryPending;
    const hasPendingArrears    = (summaryData.totalPendingArrears ?? 0) > 0;

    let deductionLabel = 'DEDUCTIONS';
    if (summaryData.hasTDS && summaryData.hasPTax) deductionLabel = 'DEDUCTIONS (TDS & PTAX)';
    else if (summaryData.hasTDS)                   deductionLabel = 'DEDUCTIONS (TDS)';
    else if (summaryData.hasPTax)                  deductionLabel = 'DEDUCTIONS (PTAX)';

    const cards: Card[] = [
        {
            label: 'TOTAL SALARY AFTER LATE CHECKINS DEDUCTIONS',
            value: totalAfterAttendance,
            tone: 'blue',
            icon: 'wallet',
            footer: monthLabel,
            footerValue: '',
            footerTone: 'blue',
        },
        {
            label: deductionLabel,
            value: summaryData.totalFixedDeduction,
            tone: 'purple',
            icon: 'percentage',
            footer: formatPendingFooter(deductionsPending).label,
            footerValue: formatPendingFooter(deductionsPending).value,
            footerTone: deductionsPending > 0 ? 'danger' : deductionsPending < 0 ? 'info' : 'purple',
        },
        {
            label: 'PAYABLE SALARY',
            value: summaryData.netSalary,
            tone: 'green',
            icon: 'check-circle',
            footer: formatPendingFooter(payablePending).label,
            footerValue: formatPendingFooter(payablePending).value,
            footerTone: payablePending > 0 ? 'danger' : payablePending < 0 ? 'info' : 'green',
        },
    ];

    // Arrear card — only shown when pending arrears exist
    if (hasPendingArrears) {
        cards.push({
            label: 'PENDING ARREARS',
            value: summaryData.totalPendingArrears!,
            tone: 'warning',
            icon: 'time',
            footer: `${summaryData.arrearCount ?? 0} record(s)`,
            footerValue: formatFooterAmount(summaryData.totalPendingArrears!),
            footerTone: 'warning',
        });
    }

    return (
        <div className="mb-10 px-0">
            <div className="row g-4 gx-xl-5 align-items-stretch">
                {cards.map((card) => {
                    const palette       = toneMap[card.tone];
                    const footerPalette = toneMap[card.footerTone];
                    const displayValue  =
                        card.label === 'PAYABLE SALARY' && card.footer === 'Extra'
                            ? Math.abs(card.value)
                            : card.value;

                    return (
                        <div key={card.label} className="col-12 col-sm-6 col-lg-4">
                            <div
                                className="card h-100 border-1 shadow-sm rounded-4 overflow-hidden position-relative"
                                style={{ backgroundColor: '#ffffff', borderColor: palette.border }}
                            >
                                {/* Arrear badge */}
                                {card.label === 'PENDING ARREARS' && (
                                    <div
                                        className="position-absolute top-0 end-0 m-3 px-2 py-1 rounded-2 fs-9 fw-bold"
                                        style={{ backgroundColor: palette.bg, color: palette.color, border: `1px solid ${palette.border}` }}
                                    >
                                        ACTION REQUIRED
                                    </div>
                                )}

                                <div className="card-body p-7 d-flex flex-column">
                                    <div className="d-flex align-items-center gap-3 mb-5">
                                        <div
                                            className="d-grid rounded-3"
                                            style={{
                                                display: 'grid',
                                                width: 38,
                                                height: 38,
                                                placeItems: 'center',
                                                color: palette.color,
                                                backgroundColor: palette.bg,
                                                border: `1px solid ${palette.border}`,
                                            }}
                                        >
                                            <KTIcon iconName={card.icon} className="fs-2" />
                                        </div>
                                        <span className="text-gray-600 fw-bold fs-8 text-uppercase ls-2 tracking-wider">
                                            {card.label}
                                        </span>
                                    </div>

                                    <div className="d-flex flex-column mb-5">
                                        <span className={`fs-1 fw-bolder text-gray-900 ${sensitiveCls} mb-1`}>
                                            {formatINRDecimal(displayValue)}
                                        </span>
                                        {card.label === 'PENDING ARREARS' && (
                                            <span className="fs-8 text-muted mt-1">
                                                Backdated increments not yet processed
                                            </span>
                                        )}
                                    </div>

                                    <div
                                        className="mt-auto w-100 d-flex align-items-center justify-content-between rounded-3 px-4 py-3"
                                        style={{
                                            minHeight: '48px',
                                            backgroundColor: footerPalette.bg,
                                            border: `1px solid ${footerPalette.border}`,
                                        }}
                                    >
                                        <div className="d-flex align-items-center">
                                            <span
                                                className="rounded-circle me-2"
                                                style={{ width: '8px', height: '8px', backgroundColor: footerPalette.color }}
                                            />
                                            <span className="fw-bold fs-7" style={{ color: footerPalette.color }}>
                                                {card.footer}
                                            </span>
                                        </div>
                                        <span
                                            className={`fw-bolder fs-7 ${sensitiveCls}`}
                                            style={{ color: footerPalette.color }}
                                        >
                                            {card.footerValue}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default React.memo(PayrollStatsCards);
