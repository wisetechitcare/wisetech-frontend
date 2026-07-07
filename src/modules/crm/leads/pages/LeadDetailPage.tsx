import React from 'react';
import { useParams } from 'react-router-dom';

const LeadDetailPage: React.FC = () => {
  const { leadId } = useParams();

  return (
    <div className="p-6">
      <h2>Lead Detail: {leadId}</h2>
      <p>This is the newly separated Lead Detail Workspace (Sales Focus).</p>
      {/* TODO: Add Lead Summary, Customer Info, Pipeline, Quotations, Activities */}
    </div>
  );
};

export default LeadDetailPage;
