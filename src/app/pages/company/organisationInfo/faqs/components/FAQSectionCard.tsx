import React, { useState } from 'react';
import { ExpandMore } from '@mui/icons-material';

interface FAQSectionCardProps {
  title: string;
  children: React.ReactNode;
  showAddButton?: boolean;
  onAddNew?: () => void;
  icon?: React.ReactNode;
  defaultExpanded?: boolean;
}

const FAQSectionCard: React.FC<FAQSectionCardProps> = ({
  title,
  children,
  showAddButton = false,
  onAddNew,
  icon,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleAccordion = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '16px',
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
      }}
    >
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div
          className="d-flex align-items-center gap-3 ms-0"
          style={{ cursor: 'pointer', flex: 1 }}
          onClick={toggleAccordion}
        >
          <div
            style={{
            }}
          />
          <img src={icon as string} alt="icon" width={44} height={44} />
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#000',
              marginBottom: '0',
            }}
          >
            {title}
          </h3>
          <ExpandMore
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease',
              color: '#666',
              marginLeft: 'auto',
              fontSize: '32px',
            }}
          />
        </div>
        {showAddButton && (
          <button
            onClick={onAddNew}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #9d4141',
              borderRadius: '6px',
              color: '#9d4141',
              fontSize: '14px',
              fontWeight: 500,
              padding: '8px 20px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginLeft: '16px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#9d4141';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#9d4141';
            }}
          >
            Add New
          </button>
        )}
      </div>
      <div
        style={{
          maxHeight: isExpanded ? '10000px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default FAQSectionCard;
