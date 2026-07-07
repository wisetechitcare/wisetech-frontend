import React from 'react';
import { useParams } from 'react-router-dom';

const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams();

  return (
    <div className="p-6">
      <h2>Project Detail: {projectId}</h2>
      <p>This is the newly separated Project Detail Workspace (Execution Focus).</p>
      {/* TODO: Add Project Summary, Team, Milestones, Budget, etc. */}
      {/* TODO: Add Read-only Lead Information card */}
    </div>
  );
};

export default ProjectDetailPage;
