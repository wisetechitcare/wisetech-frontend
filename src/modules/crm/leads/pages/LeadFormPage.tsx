import React from 'react';
import { useParams } from 'react-router-dom';

const LeadFormPage: React.FC = () => {
  const { leadId } = useParams();
  const isEdit = !!leadId;

  return (
    <div className="p-6">
      <h2>{isEdit ? 'Edit Lead' : 'Create Lead'}</h2>
      <p>This form is strictly for Sales and CRM Lead fields.</p>
      {/* TODO: Add Customer, Company, Contact Person, Lead Source, Sales Notes, etc. */}
    </div>
  );
};

export default LeadFormPage;
