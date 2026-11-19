import React from 'react';
import { ShiftTime } from '../types';

interface ShiftTimeListProps {
  shifts: ShiftTime[];
}

const ShiftTimeList: React.FC<ShiftTimeListProps> = ({ shifts }) => {
  return (
    <div className="d-flex flex-column gap-3" style={{ maxWidth: '820px' }}>
      {shifts.map((shift, index) => (
        <div
          key={index}
          className="d-flex align-items-center justify-content-between w-100"
        >
          <span
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#000',
            }}
          >
            {shift.day}
          </span>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 400,
              color: '#000',
              textAlign: 'right',
            }}
          >
            {shift.time}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ShiftTimeList;
