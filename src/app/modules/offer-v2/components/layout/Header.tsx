import React from 'react';

export const Header: React.FC = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #0056b3', paddingBottom: '10px' }}>
      <div>
        <h2 style={{ margin: 0, color: '#0056b3', fontSize: '24px' }}>COMPANY LOGO</h2>
      </div>
      <div style={{ textAlign: 'right', fontSize: '12px', color: '#666' }}>
        <div>123 Business Rd, Tech City</div>
        <div>contact@company.com</div>
        <div>+1 234 567 890</div>
      </div>
    </div>
  );
};
