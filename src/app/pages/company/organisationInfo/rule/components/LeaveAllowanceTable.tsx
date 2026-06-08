import React from 'react';
import { LeaveAllowance } from '../types';

interface LeaveAllowanceTableProps {
  allowances: LeaveAllowance[];
}

const LeaveAllowanceTable: React.FC<LeaveAllowanceTableProps> = ({ allowances }) => {
  return (
    <div className="d-flex flex-column gap-3 px-4" style={{ width: '100%' }}>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between w-100">
        <span
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#8998ab',
            width: '330px',
          }}
        >
          Name
        </span>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#8998ab',
          }}
        >
          Value
        </span>
      </div>

      {/* Rows */}
      <div className="d-flex flex-column gap-3">
        {allowances.map((allowance, index) => (
          <div
            key={index}
            className="d-flex align-items-center justify-content-between w-100"
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#000',
                width: '330px',
              }}
            >
              {allowance.years}
            </span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#000',
              }}
            >
              {allowance.leaves}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeaveAllowanceTable;
