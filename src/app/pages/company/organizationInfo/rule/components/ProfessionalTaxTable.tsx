import React from 'react';
import { ProfessionalTaxRule } from '../types';

interface ProfessionalTaxTableProps {
  rules: ProfessionalTaxRule[];
}

const ProfessionalTaxTable: React.FC<ProfessionalTaxTableProps> = ({ rules }) => {
  return (
    <div className="d-flex flex-column gap-3 px-4" style={{ width: '100%' }}>
      {/* Header */}
      <div className="d-flex align-items-center gap-3 w-100">
        <span
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#8998ab',
            width: '387px',
          }}
        >
          Salary per month
        </span>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#8998ab',
            flex: 1,
          }}
        >
          Deduction
        </span>
      </div>

      {/* Rows */}
      <div className="d-flex flex-column gap-1">
        {rules.map((rule, index) => (
          <div
            key={index}
            className="d-flex align-items-center gap-3 w-100"
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#000',
                flex: 1,
              }}
            >
              {rule.salary}
            </span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 400,
                color: '#000',
                flex: 1,
              }}
            >
              {rule.deduction}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfessionalTaxTable;
