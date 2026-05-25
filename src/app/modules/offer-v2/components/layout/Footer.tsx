import React from 'react';

interface FooterProps {
  pageNumber: number;
}

export const Footer: React.FC<FooterProps> = ({ pageNumber }) => {
  return (
    <div style={{ marginTop: 'auto', borderTop: '1px solid #ddd', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888' }}>
      <div>Confidential - Company Name</div>
      <div>Page {pageNumber}</div>
    </div>
  );
};
