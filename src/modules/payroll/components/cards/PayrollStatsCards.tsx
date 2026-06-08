import React from 'react';
import { KTIcon } from '@metronic/helpers';
import { PayrollSummary } from '../../types/payroll.types';
import { formatINRDecimal } from '../../utils/payrollFormatters';

interface PayrollStatsCardsProps {
    summaryData: PayrollSummary;
    showSensitiveData: boolean;
}

type Tone = 'blue' | 'purple' | 'green' | 'danger' | 'info';

const toneMap: Record<Tone, { color: string; bg: string; border: string }> = {
    blue: { color: '#2563eb', bg: '#eff6ff', border: '#dbeafe' },
    purple: { color: '#7c3aed', bg: '#f5f3ff', border: '#e9d5fe' },
    green: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    danger: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    info: { color: '#7c3aed', bg: '#f5f3ff', border: '#d8b4fe' },
};

const formatFooterAmount = (amount: number) =>
    `₹${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatPendingFooter = (pendingAmount: number) => {
    if (pendingAmount > 0) return { label: 'Pending', value: formatFooterAmount(pendingAmount) };
    if (pendingAmount < 0) return { label: 'Extra', value: formatFooterAmount(pendingAmount) };
    return { label: 'Cleared', value: '' };
};

const PayrollStatsCards: React.FC<PayrollStatsCardsProps> = ({ summaryData, showSensitiveData }) => {
    const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';

    const totalAfterAttendance = Math.max(0, summaryData.totalGrossPay - summaryData.totalVariableDeduction);
    const deductionsPending = summaryData.governmentPending;
    const payablePending = summaryData.salaryPending;

    interface Card {
    label: string;
    value: number;
    tone: Tone;
    icon: string;
    footer: string;
    footerValue: string;
    footerTone: Tone;
}

const cards: Card[] = [
        {
            label: 'TOTAL SALARY AFTER ATTENDANCE ADJUSTMENTS',
            value: totalAfterAttendance,
            tone: 'blue' as const,
            icon: 'wallet',
            footer: 'Current Month',
            footerValue: '',
            footerTone: 'blue' as Tone,
        },
        {
            label: 'DEDUCTIONS',
            value: summaryData.totalFixedDeduction,
            tone: 'purple' as const,
            icon: 'percentage',
            footer: formatPendingFooter(deductionsPending).label,
            footerValue: formatPendingFooter(deductionsPending).value,
            footerTone: deductionsPending > 0 ? 'danger' as Tone : deductionsPending < 0 ? 'info' as Tone : 'purple' as Tone,
        },
        {
            label: 'PAYABLE SALARY',
            value: summaryData.netSalary,
            tone: 'green' as const,
            icon: 'check-circle',
            footer: formatPendingFooter(payablePending).label,
            footerValue: formatPendingFooter(payablePending).value,
            footerTone: payablePending > 0 ? 'danger' as Tone : payablePending < 0 ? 'info' as Tone : 'green' as Tone,
        },
    ];

    return (
        <div className="mb-10 px-0">
            <div className="row g-4 gx-xl-5 align-items-stretch">
                {cards.map((card) => {
                    const palette = toneMap[card.tone];
                    const footerPalette = toneMap[card.footerTone];
                    const displayValue =
                        card.label === 'PAYABLE SALARY' && card.footer === 'Extra'
                            ? Math.abs(card.value)
                            : card.value;

                    return (
                        <div key={card.label} className="col-12 col-sm-6 col-lg-4">
                            <div
                                className="card h-100 border-1 shadow-sm rounded-4 overflow-hidden position-relative"
                                style={{
                                    backgroundColor: '#ffffff',
                                    borderColor: `${palette.border}`,
                                }}
                            >
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
                                                style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    backgroundColor: footerPalette.color,
                                                }}
                                            />
                                            <span
                                                className="fw-bold fs-7"
                                                style={{ color: footerPalette.color }}
                                            >
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
