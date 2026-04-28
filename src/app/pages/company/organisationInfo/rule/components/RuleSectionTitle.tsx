import React from 'react';

interface RuleSectionTitleProps {
  title: string;
  description?: string;
}

const RuleSectionTitle: React.FC<RuleSectionTitleProps> = ({ title, description }) => {
  return (
    <div className="d-flex flex-column gap-1">
      <h4
        className="text-uppercase mb-0"
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#000',
          letterSpacing: '0.16px',
        }}
      >
        {title}
      </h4>
      {description && (
        <p
          className="mb-0"
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#8998ab',
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
};

export default RuleSectionTitle;
