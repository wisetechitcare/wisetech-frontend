import React, { useState } from 'react';
import { DocumentManagementCenter } from './dms/components/DocumentManagementCenter';
import { ExportCenterModal } from './dms/components/ExportCenterModal';

interface LeadFilesProps {
  lead: any;
}

const LeadFiles: React.FC<LeadFilesProps> = ({ lead }) => {
  return (
    <div className="mt-4">
      <DocumentManagementCenter />
    </div>
  );
};

export default LeadFiles;