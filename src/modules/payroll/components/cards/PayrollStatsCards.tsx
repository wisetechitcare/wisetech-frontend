import React from 'react';
import { Row, Col } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import { PayrollSummary } from '../../types/payroll.types';
import { formatINR2 } from '../../utils/payrollFormatters';

interface PayrollStatsCardsProps {
    summaryData: PayrollSummary;
    showSensitiveData: boolean;
}

const PayrollStatsCards: React.FC<PayrollStatsCardsProps> = ({ summaryData, showSensitiveData }) => {
    const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';

    // Calculate Gov Pending
    const govPending = Math.max(0, (summaryData.totalFixedDeduction || 0) - (summaryData.governmentPaid || 0));

    const isProfFees = summaryData.activeGovType?.toLowerCase().includes('professional fees');

    const cards = [
        { 
            label: 'Salary In Hand', 
            value: summaryData.netSalary, 
            pendingValue: summaryData.salaryPending,
            icon: 'wallet', 
            color: 'primary', // Blue
            statusLabel: 'Pending'
        },
        ...(isProfFees ? [{ 
            label: `${summaryData.activeGovType || 'Gov Fee'} Payable`, 
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
        ...(isProfFees ? [{ 
            label: `${summaryData.activeGovType || 'Gov Fee'} Paid`, 
            value: summaryData.governmentPaid, 
            icon: 'shield-tick', 
            color: 'info', // Purpleish
            statusLabel: 'Paid to Govt'
        }] : []),
    ];

    return (
        <Row className="g-7 mb-10">
            {cards.map((card, idx) => (
                <Col xl={3} lg={6} key={idx}>
                    <div 
                        className={`card h-100 border-1 border-${card.color} border-opacity-10 shadow-sm rounded-4 overflow-hidden position-relative`}
                        style={{ backgroundColor: `var(--bs-light-${card.color})` }}
                    >
                        <div className="card-body p-7">
                            <div className="d-flex align-items-center mb-5">
                                <span className="text-gray-600 fw-bold fs-8 text-uppercase ls-2 tracking-wider">
                                    {card.label}
                                </span>
                            </div>
                            
                            <div className="d-flex flex-column mb-5">
                                <span className={`fs-1 fw-bolder text-gray-900 ${sensitiveCls} mb-1`}>
                                    {formatINR2(card.value)}
                                </span>
                            </div>

                            <div className="d-flex align-items-center">
                                {card.statusLabel.includes('Pending') ? (
                                    <div className={`badge badge-light-danger fw-bolder fs-8 px-4 py-2 rounded-2 border border-danger border-opacity-10`}>
                                        {card.statusLabel}: {formatINR2(card.pendingValue || 0)}
                                    </div>
                                ) : (
                                    <div className={`badge badge-light-${card.color} fw-bolder fs-8 px-4 py-2 rounded-2 border border-${card.color} border-opacity-10`}>
                                        {card.statusLabel}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Col>
            ))}
        </Row>
    );
};

export default React.memo(PayrollStatsCards);
