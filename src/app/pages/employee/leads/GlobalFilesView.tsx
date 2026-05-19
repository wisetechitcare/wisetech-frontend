import React from 'react';
import { DMSProvider } from './lead/components/dms/store/DmsContext';
import { DocumentManagementCenter } from './lead/components/dms/components/DocumentManagementCenter';

const GlobalFilesView: React.FC = () => {
  return (
    <DMSProvider>
      <div className="mt-8">
        <div className="d-flex align-items-center justify-content-between mb-6">
          <div>
            <h3 className="fw-bold text-dark m-0" style={{ fontSize: '24px' }}>Global Document Center</h3>
            <span className="text-muted mt-1 fw-semibold fs-7 d-block">All project lifecycle documents across all leads</span>
          </div>
        </div>
        
        <div className="mt-2">
          <DocumentManagementCenter />
        </div>
      </div>
    </DMSProvider>
  );
};

export default GlobalFilesView;
