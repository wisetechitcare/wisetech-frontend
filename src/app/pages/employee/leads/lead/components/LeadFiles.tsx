import React from 'react';
import { DocumentManagementCenter } from './dms/components/DocumentManagementCenter';
import { DMSProvider } from './dms/store/DmsContext';

interface LeadFilesProps {
  lead: any;
}

const LeadFiles: React.FC<LeadFilesProps> = ({ lead }) => {
  if (!lead?.id) {
    return (
      <div className="alert alert-warning mt-4">Lead data is not available yet.</div>
    );
  }

  return (
    <DMSProvider
      leadId={lead.id}
      inquiryNumber={lead.inquiryNo || lead.prefix || 'N/A'}
      leadTitle={lead.title || lead.name || 'Lead'}
    >
      <div className="mt-4">
        <DocumentManagementCenter />
      </div>
    </DMSProvider>
  );
};

export default LeadFiles;