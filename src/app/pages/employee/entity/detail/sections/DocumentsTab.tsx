import React from 'react';
import { DetailSummaryBar } from '@app/modules/detail-page/DetailPageComponents';
import LeadFiles from '@pages/employee/leads/lead/components/LeadFiles';
import ProjectFiles from '@pages/employee/projects/project/components/ProjectFlies';
import DocumentsSection from './DocumentsSection';
import type { EntityVM } from '../facets';

/**
 * Documents — the single home for everything document-related: the file-location
 * pointer and the DMS file modules (lead drawings/contracts and, for projects,
 * project files). Always available (leads have documents too).
 */
const DocumentsTab: React.FC<{
  lead: any;
  vm: EntityVM;
  isProject: boolean;
  projectId: string | null;
}> = ({ lead, vm, isProject, projectId }) => (
  <div>
    <DetailSummaryBar
      items={[
        { label: 'File Location', value: vm.fileLocation.path || '—', icon: 'bi bi-folder2-open', accentColor: 'amber' },
        ...(isProject ? [{ label: 'Project', value: lead?.project?.prefix || '—', icon: 'bi bi-kanban', accentColor: 'green' as const }] : []),
      ]}
    />
    <div className="mt-2">
      <DocumentsSection vm={vm}>
        <LeadFiles lead={lead} />
        {isProject && projectId && (
          <div className="mt-2">
            <ProjectFiles projectId={projectId} />
          </div>
        )}
      </DocumentsSection>
    </div>
  </div>
);

export default DocumentsTab;
