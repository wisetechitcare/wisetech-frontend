import React from 'react';

interface RuleSectionHeaderProps {
  icon?: string;
  title: string;
  subtitle?: string;
}

const RuleSectionHeader: React.FC<RuleSectionHeaderProps> = ({ icon, title, subtitle }) => {
  return (
    <div className="d-flex align-items-center gap-3">
      <div
      />
      <img src={icon} alt="Section Icon" width={44} height={44} />
      <h3
        className="mb-0"
        style={{
          fontSize: '19px',
          fontWeight: 600,
          color: '#000',
          letterSpacing: '0.19px',
        }}
      >
        {title}
      </h3>
    </div>
  );
};

export default RuleSectionHeader;
