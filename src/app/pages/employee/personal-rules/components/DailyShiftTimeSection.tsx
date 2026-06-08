import React from 'react';
import { Row, Col } from 'react-bootstrap';

interface DayWiseShiftData {
  id: string;
  day: string;
  checkIn: string | null;
  checkOut: string | null;
  isActive: boolean;
}

interface DailyShiftTimeSectionProps {
  dayWiseShifts: DayWiseShiftData[];
}

const DailyShiftTimeSection: React.FC<DailyShiftTimeSectionProps> = ({ dayWiseShifts }) => {


  const formatShiftTime = (checkIn: string | null, checkOut: string | null, isActive: boolean) => {
    if (!isActive) return 'Holiday';
    if (!checkIn || !checkOut) return 'Not Set';
    return `${(checkIn)} - ${(checkOut)}`;
  };

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
          Shift time
        </p>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          fontSize: '14px',
          color: '#8998ab',
          margin: 0
        }}>
          Your daily work schedule
        </p>
      </div>

      {/* Shift Times List */}
      <div style={{ maxWidth: '820px' }}>
        {dayWiseShifts.map((shift) => (
          <Row key={shift.id} className="g-2 align-items-center mb-2">
            <Col xs={6} sm={8} md={8}>
              <p style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                fontSize: '14px',
                color: '#000',
                margin: 0
              }}>
                {shift.day}
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
                {formatShiftTime(shift.checkIn, shift.checkOut, shift.isActive)}
              </p>
            </Col>
          </Row>
        ))}
      </div>
    </div>
  );
};

export default DailyShiftTimeSection;
