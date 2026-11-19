import React from 'react';
import { DeductionRule } from '../types';

interface DeductionRulesTableProps {
  rules: DeductionRule[];
}

const DeductionRulesTable: React.FC<DeductionRulesTableProps> = ({ rules }) => {
  return (
    <div className="d-flex flex-column gap-3" style={{ width: '100%' }}>
      {/* Header */}
      <div className="d-flex align-items-center gap-3 w-100">
        <span
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#8998ab',
            width: '474px',
          }}
        >
          Name
        </span>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#8998ab',
            width: '197px',
          }}
        >
          Period
        </span>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#8998ab',
            width: '147px',
          }}
        >
          Deduction/Value
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
                width: '474px',
              }}
            >
              {rule.name}
            </span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#000',
                width: '201px',
              }}
            >
              {rule.period}
            </span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#000',
                width: '147px',
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

export default DeductionRulesTable;
