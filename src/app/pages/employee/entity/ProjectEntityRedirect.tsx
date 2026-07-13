import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getAllProjectDataForOverviewById } from '@services/projects';

/**
 * Legacy URL bridge: /projects/:projectId → /employee/lead/:leadId.
 *
 * Under the unified entity model the detail page is always the lead's page.
 * Old bookmarks, notifications and in-app links that still point at a project
 * id resolve here to the owning lead. Orphan projects (no linked lead — only
 * possible for rows created outside the lead pipeline) get an explanatory
 * dead-end instead of a broken page.
 */
const ProjectEntityRedirect = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'orphan' | 'missing'>('loading');

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      if (!projectId) {
        setState('missing');
        return;
      }
      try {
        const data = await getAllProjectDataForOverviewById(projectId);
        const project = data?.projectDataById;
        if (!project) {
          if (!cancelled) setState('missing');
          return;
        }
        const leadId = project?.leads?.[0]?.id;
        if (leadId) {
          // Arriving via a project URL = project context: the detail page lands
          // on the Projects tab with the full project tab set (same state flag
          // the Projects table passes).
          navigate(`/employee/lead/${leadId}`, { replace: true, state: { isProject: true } });
        } else if (!cancelled) {
          setState('orphan');
        }
      } catch (err) {
        console.error('Failed to resolve project → lead:', err);
        if (!cancelled) setState('missing');
      }
    }
    resolve();
    return () => { cancelled = true; };
  }, [projectId, navigate]);

  if (state === 'loading') {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="alert alert-warning">
        {state === 'missing' ? (
          <>Project not found or failed to load.</>
        ) : (
          <>
            This project is not linked to any lead, so it has no unified detail page.
            Every project should originate from a lead — link it by editing the lead
            that owns it, or recreate it through the lead pipeline.
          </>
        )}
        <div className="mt-3">
          <Link to="/qc/leads" className="btn btn-sm btn-primary">Go to Leads &amp; Projects</Link>
        </div>
      </div>
    </div>
  );
};

export default ProjectEntityRedirect;
