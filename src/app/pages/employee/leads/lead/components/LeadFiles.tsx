import React from 'react';

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
    <div className="mt-4">
      <div className="alert alert-info">Document management is coming soon.</div>
    </div>
  );
};

export default LeadFiles;
