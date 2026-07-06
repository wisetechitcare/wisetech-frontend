import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ProjectFormPage: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!projectId;

  return (
    <div className="p-6">
      <h2>{isEdit ? 'Edit Project' : 'Create Project'}</h2>
      <p>This form is strictly for Project execution fields.</p>
      
      {/* TODO: Add Project Code, Manager, Milestones, Budget, etc. */}
      
      {isEdit && (
        <div className="mt-8 border p-4 bg-gray-50 rounded">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="m-0">Lead Information</h3>
            <button 
              className="btn btn-sm btn-primary"
              onClick={() => {
                // Example redirect workflow: Edit Lead from Project Form
                // navigate(`/crm/leads/${leadId}/edit?returnTo=project&projectId=${projectId}`);
              }}
            >
              Edit Lead
            </button>
          </div>
          <p className="text-muted">Read-only details of the associated lead...</p>
          {/* TODO: Add Customer, Company, Contact, Sales Exec (Read-only) */}
        </div>
      )}
    </div>
  );
};

export default ProjectFormPage;
