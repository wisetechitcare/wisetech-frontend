import React from 'react';
import { Row, Col } from 'react-bootstrap';
import { IAddonLeavesAllowance } from '@services/addonLeavesAllowance';

interface LeavesAllowanceSectionProps {
  addonAllowances: IAddonLeavesAllowance[];
}

const LeavesAllowanceSection: React.FC<LeavesAllowanceSectionProps> = ({ addonAllowances }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Section Header */}
      <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
        <p style={{
          fontFamily: 'Barlow, sans-serif',
          fontWeight: 600,
          fontSize: '16px',
          letterSpacing: '0.16px',
          textTransform: 'uppercase',
          color: '#000',
          margin: 0
        }}>
          Leaves allowance
        </p>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          fontSize: '14px',
          color: '#8998ab',
          margin: 0
        }}>
          Additional leaves based on experience
        </p>
      </div>

      {/* Addon Allowances List */}
      <div style={{ paddingLeft: '24px', maxWidth: '820px' }}>
        {/* Header Row */}
        <Row className="g-2 mb-3">
          <Col xs={6} sm={8} md={8}>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              color: '#8998ab',
              margin: 0
            }}>
              Experience
            </p>
          </Col>
          <Col xs={6} sm={4} md={4}>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              color: '#8998ab',
              margin: 0,
              textAlign: 'right'
            }}>
              Extra Leaves
            </p>
          </Col>
        </Row>

        {/* Data Rows */}
        {addonAllowances.length > 0 ? (
          addonAllowances
            .sort((a, b) => a.experienceInCompany - b.experienceInCompany)
            .map((allowance) => (
              <Row key={allowance.id} className="g-2 align-items-center mb-2">
                <Col xs={6} sm={8} md={8}>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    color: '#000',
                    margin: 0
                  }}>
                    {allowance.experienceInCompany} Year{allowance.experienceInCompany > 1 ? 's' : ''}
                  </p>
                </Col>
                <Col xs={6} sm={4} md={4}>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 400,
                    fontSize: '14px',
                    color: '#000',
                    margin: 0,
                    textAlign: 'right'
                  }}>
                    + {allowance.addonLeavesCount} Leaves
                  </p>
                </Col>
              </Row>
            ))
        ) : (
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            fontSize: '14px',
            color: '#8998ab',
            margin: 0,
            textAlign: 'center',
            padding: '20px 0'
          }}>
            No addon leaves configured
          </p>
        )}
      </div>
    </div>
  );
};

export default LeavesAllowanceSection;
