import React from 'react';

const GlobalFilesView: React.FC = () => {
  return (
    <div className="mt-8">
      <div className="d-flex align-items-center justify-content-between mb-6">
        <div>
          <h3 className="fw-bold text-dark m-0" style={{ fontSize: '24px' }}>Global Document Center</h3>
          <span className="text-muted mt-1 fw-semibold fs-7 d-block">All project lifecycle documents across all leads</span>
        </div>
      </div>
      <div className="mt-2">
        <div className="alert alert-info">Document management is coming soon.</div>
      </div>
    </div>
  );
};

export default GlobalFilesView;
