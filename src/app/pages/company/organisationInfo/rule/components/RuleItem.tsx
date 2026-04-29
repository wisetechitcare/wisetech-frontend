import React from 'react';

interface RuleItemProps {
  label: string;
  value: string;
  description?: string;
  labelWeight?: number;
}

const RuleItem: React.FC<RuleItemProps> = ({ label, value, description, labelWeight = 500 }) => {
  return (
    <div className="d-flex align-items-center justify-content-between w-100">
      <div className="d-flex flex-column gap-1">
        <span
          style={{
            fontSize: '14px',
            fontWeight: labelWeight,
            color: '#000',
          }}
        >
          {label}
        </span>
        {description && (
          <span
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#8998ab',
            }}
          >
            {description}
          </span>
        )}
      </div>
      <span
        style={{
          fontSize: '14px',
          fontWeight: 400,
          color: '#000',
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  );
};

export default RuleItem;
