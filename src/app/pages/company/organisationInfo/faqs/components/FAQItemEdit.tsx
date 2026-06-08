import React from 'react';
import { FAQ } from '../types';

interface FAQItemEditProps {
  faq: FAQ;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const FAQItemEdit: React.FC<FAQItemEditProps> = ({ faq, onEdit, onDelete }) => {
  return (
    <div
      style={{
        paddingBottom: '16px',
        marginBottom: '16px',
      }}
    >
      <div className="d-flex align-items-start justify-content-between">
        <div className="flex-grow-1">
          <h6
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#000',
              marginBottom: '8px',
            }}
          >
            {faq.question}
          </h6>
          <p
            style={{
              fontSize: '14px',
              fontWeight: 400,
              color: '#2a2a2a',
              marginBottom: '0',
              lineHeight: '1.5',
            }}
          >
            {faq.answer}
          </p>
        </div>
        <div className="d-flex align-items-center gap-8 mt-6">
          <i
            className="bi bi-pencil"
            onClick={() => onEdit(faq.id)}
            style={{
              fontSize: '16px',
              color: '#9d4141',
              cursor: 'pointer',
            }}
          />
          <i
            className="bi bi-trash"
            onClick={() => onDelete(faq.id)}
            style={{
              fontSize: '16px',
              color: '#9d4141',
              cursor: 'pointer',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default FAQItemEdit;
