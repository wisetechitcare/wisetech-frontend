import React from 'react';

interface A4PageProps {
  id?: string;
  children: React.ReactNode;
}

export const A4Page: React.FC<A4PageProps> = ({ id, children }) => {
  return (
    <div
      id={id}
      style={{
        width: '794px',
        minHeight: '1123px',
        background: 'white',
        padding: '40px',
        margin: '20px auto',
        boxShadow: '0 0 20px rgba(0,0,0,0.12)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Times New Roman", Times, serif', // Standard professional font for proposals
        color: '#333',
        boxSizing: 'border-box',
        pageBreakAfter: 'always',
        breakAfter: 'page'
      }}
      className="a4-page-preview"
    >
      {children}
    </div>
  );
};
