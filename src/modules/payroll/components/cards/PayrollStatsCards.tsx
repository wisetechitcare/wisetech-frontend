import React from 'react';
import { Row, Col } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import { PayrollSummary } from '../../types/payroll.types';
import { formatStringINR } from '@utils/statistics';

interface PayrollStatsCardsProps {
    summaryData: PayrollSummary;
    showSensitiveData: boolean;
}

const PayrollStatsCards: React.FC<PayrollStatsCardsProps> = ({ summaryData, showSensitiveData }) => {
    const cards = [
        { label: 'Total Gross Pay', value: summaryData.totalGrossPay, icon: 'wallet', color: '#295D8E', bg: 'rgba(41,93,142,0.10)' },
        { label: 'Total Variable Deduction', value: summaryData.totalVariableDeduction, icon: 'minus-circle', color: '#B7791F', bg: 'rgba(226,160,63,0.12)' },
        { label: 'Total Fixed Deduction', value: summaryData.totalFixedDeduction, icon: 'lock', color: '#AA393D', bg: 'rgba(170,57,61,0.10)' },
        { label: 'Total Deduction', value: summaryData.totalDeduction, icon: 'calculator', color: '#0E61B6', bg: 'rgba(14,97,182,0.10)' },
        { label: 'Total Paid', value: summaryData.totalPaid, icon: 'check-circle', color: '#008C7C', bg: 'rgba(0,202,180,0.12)' },
        { label: 'Pending Amount', value: summaryData.pendingAmount, icon: 'clock', color: '#C74E52', bg: 'rgba(199,78,82,0.10)' },
    ];

    return (
        <Row className="g-4 mb-5">
            {cards.map((card, idx) => (
                <Col key={idx} xs={12} sm={6} lg={4} xl={2}>
                    <div className="payroll-summary-card">
                        <div className="payroll-summary-icon" style={{ backgroundColor: card.bg, color: card.color }}>
                            <KTIcon iconName={card.icon} className="fs-2" />
                        </div>
                        <div className="text-muted fs-7 mb-1">{card.label}</div>
                        <div className={`fs-4 fw-bolder currency-text ${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>
                            {formatStringINR(card.value.toString())}
                        </div>
                    </div>
                </Col>
            ))}
        </Row>
    );
};

export default React.memo(PayrollStatsCards);
