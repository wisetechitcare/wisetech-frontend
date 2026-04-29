import React from 'react';
import { FAQ } from '../types';

interface FAQItemProps {
  faq: FAQ;
  onToggle: (id: string) => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ faq, onToggle }) => {
  return (
    <div
      style={{
        borderBottom: '1px solid #cfd5de',
        paddingBottom: '12px',
      }}
    >
      <div
        className="d-flex align-items-center justify-content-between"
        onClick={() => onToggle(faq.id)}
        style={{
          cursor: 'pointer',
          paddingTop: '8px',
          paddingBottom: '8px',
        }}
      >
        <span
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#000',
          }}
        >
          {faq.question}
        </span>
        <i
          className={`bi ${faq.isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'}`}
          style={{
            fontSize: '20px',
            color: '#9d4141',
            transition: 'transform 0.3s ease',
          }}
        />
      </div>
      <div
        style={{
          maxHeight: faq.isExpanded ? '1000px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        <p
          style={{
            fontSize: '14px',
            fontWeight: 400,
            color: '#2a2a2a',
            marginTop: '8px',
            marginBottom: '0',
          }}
        >
          {faq.answer}
        </p>
      </div>
    </div>
  );
};

export default FAQItem;
