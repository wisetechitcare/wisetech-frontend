import React from 'react';
import { Row, Col } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import { PayrollSummary } from '../../types/payroll.types';
import { formatINRRounded } from '../../utils/payrollFormatters';

interface PayrollStatsCardsProps {
    summaryData: PayrollSummary;
    showSensitiveData: boolean;
}

const PayrollStatsCards: React.FC<PayrollStatsCardsProps> = ({ summaryData, showSensitiveData }) => {
    const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';

    // Calculate Gov Pending
    const govPending = Math.max(0, summaryData.governmentPending || 0);
    const hasProfessionalFees = !!summaryData.activeGovType;
    const displayGovType = summaryData.activeGovType === 'Professional Fees' ? 'Tax Deducted at Source (TDS)' : summaryData.activeGovType || 'Gov Fee';

    const cards = [
        { 
            label: 'Salary In Hand', 
            value: summaryData.netSalary, 
            pendingValue: summaryData.salaryPending,
            icon: 'wallet', 
            color: 'primary', // Blue
            statusLabel: 'Pending'
        },
        ...(hasProfessionalFees ? [{ 
            label: `${displayGovType} Payable`, 
            value: summaryData.totalFixedDeduction, 
            pendingValue: govPending,
            icon: 'percentage', 
            color: 'danger', // Pinkish
            statusLabel: 'Pending'
        }] : []),
        { 
            label: 'Salary Paid', 
            value: summaryData.salaryPaid, 
            icon: 'check-circle', 
            color: 'success', // Green
            statusLabel: 'Paid to Employee'
        },
        ...(hasProfessionalFees ? [{ 
            label: `${displayGovType} Paid`, 
            value: summaryData.governmentPaid, 
            icon: 'shield-tick', 
            color: 'success', // Green
            statusLabel: 'Paid to Govt'
        }] : []),
    ];

    return (
        <div className="mb-10 px-0">
            <div className="row g-4 gx-xl-5 align-items-stretch">
                {cards.map((card, idx) => (
                    <div key={idx} className="col-12 col-sm-6 col-lg-3">
                    <div 
                        className={`card h-100 border-1 border-${card.color} border-opacity-10 shadow-sm rounded-4 overflow-hidden position-relative`}
                        style={{ backgroundColor: `var(--bs-light-${card.color})` }}
                    >
                        <div className="card-body p-7 d-flex flex-column">
                            <div className="d-flex align-items-center mb-5">
                                <span className="text-gray-600 fw-bold fs-8 text-uppercase ls-2 tracking-wider">
                                    {card.label}
                                </span>
                            </div>
                            
                            <div className="d-flex flex-column mb-5">
                                <span className={`fs-1 fw-bolder text-gray-900 ${sensitiveCls} mb-1`}>
                                    {formatINRRounded(card.value)}
                                </span>
                            </div>

                            <div className="mt-auto w-100">
                                {card.statusLabel.includes('Pending') ? (
                                    (() => {
                                        const isPaidExtra = card.statusLabel === 'Pending' && (card.pendingValue || 0) < 0;
                                        const colorClass = isPaidExtra ? 'info' : 'danger';
                                        const displayLabel = isPaidExtra ? 'Paid Extra' : card.statusLabel;
                                        const displayValue = isPaidExtra ? Math.abs(card.pendingValue || 0) : (card.pendingValue || 0);

                                        return (
                                            <div className={`d-flex justify-content-between align-items-center bg-${colorClass} bg-opacity-10 rounded-3 px-4 py-3 border border-${colorClass} border-opacity-25 w-100`} style={{ minHeight: '48px' }}>
                                                <div className="d-flex align-items-center">
                                                    <span className={`rounded-circle bg-${colorClass} me-2`} style={{ width: '8px', height: '8px' }}></span>
                                                    <span className={`text-${colorClass} fw-bold fs-7`}>
                                                        {displayLabel}
                                                    </span>
                                                </div>
                                                <span className={`text-${colorClass} fw-bolder fs-7 ${sensitiveCls}`}>
                                                    {formatINRRounded(displayValue)}
                                                </span>
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <div className={`d-flex align-items-center bg-${card.color} bg-opacity-10 rounded-3 px-4 py-3 border border-${card.color} border-opacity-25 w-100`} style={{ minHeight: '48px' }}>
                                        <span className={`rounded-circle bg-${card.color} me-2`} style={{ width: '8px', height: '8px' }}></span>
                                        <span className={`text-${card.color} fw-bold fs-7`}>{card.statusLabel}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                ))}
            </div>
        </div>
    );
};

export default React.memo(PayrollStatsCards);
