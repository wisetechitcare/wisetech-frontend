import React from 'react';
import { SalaryDistributionItem } from '../types';

interface SalaryDistributionTableProps {
  items: SalaryDistributionItem[];
}

const SalaryDistributionTable: React.FC<SalaryDistributionTableProps> = ({ items }) => {
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
        {items.map((item, index) => (
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
              {item.name}
            </span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#000',
              }}
            >
              {item.percentage}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalaryDistributionTable;
