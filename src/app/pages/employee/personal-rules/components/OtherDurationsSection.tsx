import React from 'react';
import { Row, Col } from 'react-bootstrap';

interface OtherDurationsSectionProps {
  lunchTime: string;
  graceTime: string;
  graceTimeOnSite: string;
  deductionTime: string;
}

const OtherDurationsSection: React.FC<OtherDurationsSectionProps> = ({
  lunchTime,
  graceTime,
  graceTimeOnSite,
  deductionTime
}) => {
  const DataRowWithSubtitle: React.FC<{ label: string; subtitle: string; value: string }> = ({ label, subtitle, value }) => (
    <Row className="g-2 align-items-center mb-2">
      <Col xs={12} sm={8} md={8}>
        <div>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            fontSize: '14px',
            color: '#000',
            margin: 0
          }}>
            {label}
          </p>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            fontSize: '14px',
            color: '#8998ab',
            margin: 0
          }}>
            {subtitle}
          </p>
        </div>
      </Col>
      <Col xs={12} sm={4} md={4}>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 400,
          fontSize: '14px',
          color: '#000',
          margin: 0,
          textAlign: 'right',
          wordBreak: 'break-word'
        }}>
          {value}
        </p>
      </Col>
    </Row>
  );

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
          Other Durations
        </p>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          fontSize: '14px',
          color: '#8998ab',
          margin: 0
        }}>
          Additional time configurations
        </p>
      </div>

      {/* Other Durations List */}
      <div style={{ maxWidth: '820px' }}>
        <DataRowWithSubtitle
          label="Lunch time"
          subtitle="Daily lunch break duration"
          value={lunchTime}
        />
        <DataRowWithSubtitle
          label="Grace Time"
          subtitle="Check-in tolerance period for office"
          value={`${graceTime} Hrs`}
        />
        <DataRowWithSubtitle
          label="Grace Time - On Site"
          subtitle="Check-in tolerance period for on-site"
          value={`${graceTimeOnSite} Hrs`}
        />
        <DataRowWithSubtitle
          label="Deduction Time"
          subtitle="Time deducted for lunch break"
          value={deductionTime}
        />
      </div>
    </div>
  );
};

export default OtherDurationsSection;
