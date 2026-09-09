import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import { useDispatch } from 'react-redux';
import { getLeadById } from '@services/leads';
import { getClientCompanyById, getClientContactById } from '@services/companies';
import { miscellaneousIcons } from '@metronic/assets/miscellaneousicons';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { mapLeadToFormInitialValues } from '@pages/employee/leads/lead/utils';
import { loadAllEmployeesIfNeeded } from '@redux/slices/allEmployees';
import type { AppDispatch } from '@redux/store';

import LeadWizardModal from '@pages/employee/leads/lead/LeadWizardModal';
import ProposalTemplatePage from '@pages/employee/leads/lead/components/ProposalTemplatePage';
import { DMSProvider } from '@pages/employee/leads/lead/components/dms/store/DmsContext';

import { isProjectEntity, getProjectPhase, projectNumberOf, PHASE_THEMES } from './entityUtils';
import { DensityProvider } from './detail/density';
import { buildEntityVM, ENTITY_TABS } from './detail/facets';

import SummarySection from './detail/sections/SummarySection';
import { TasksTab, TimesheetTab, ReimbursementTab } from './detail/sections/ProjectModuleTabs';
import DocumentsTab from './detail/sections/DocumentsTab';
import AuditSection from './detail/sections/AuditSection';
import TeamsSection from './detail/sections/TeamsSection';
import ExecutionSection from './detail/sections/ExecutionSection';
import ProjectMeetings from './detail/sections/ProjectMeetings';
import ProjectStatusControl from './detail/ProjectStatusControl';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import { UnderlineTabs } from '@app/modules/common/components/ui';

/**
 * Unified Entity detail page. ONE entity, ONE page. The Lead is the master; the
 * Project is an extension that surfaces — inside the SAME tabs — once the lead
 * reaches a project-trigger status (exactly like the wizard reveals its
 * execution step). The only conditional tab is Execution. There is no separate
 * "project view": `isProject` is driven purely by the data, not navigation.
 */
const EntityDetailPage: React.FC = () => {
  const params = useParams<{ leadId?: string; id?: string }>();
  const leadId = params.leadId || params.id;
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();

  // ── Entry context lives in the PATH, not in history.state. ─────────────────
  //    /project/:id  → project view: land on the Projects tab, full project tab set.
  //    /leads/:id    → lead view: land on Leads, project-only tabs hidden entirely
  //                    (Projects/Tasks/Timesheet/…), even for a received lead.
  //
  //    It used to ride on location.state, which broke twice over: writing the
  //    ?tab= param navigated without carrying state forward, so the first tab
  //    click silently turned a lead into a project; and the choice was invisible
  //    in the URL, so it could not be shared or bookmarked. A path segment has
  //    neither problem — it survives refresh, copy-paste and every navigation.
  const fromProjects = location.pathname.startsWith('/project/');
  const fromLeads = !fromProjects;

  // ── Tab lives in the URL (?tab=billing) ─────────────────────────────────────
  //    Not cosmetic: a tab held only in component state cannot be linked to,
  //    survives no refresh, and gives a page navigated away from nowhere to
  //    return to. The Project Financial Workspace hands `?tab=billing` to Billing
  //    as its return address, so this has to be addressable for "Back" to land
  //    anywhere but the default tab.
  //
  //    Written with `replace` so flipping tabs does not stack history entries —
  //    browser Back should leave the project, not walk back through its tabs.
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTabState] = useState<string>(
    searchParams.get('tab') || (fromProjects ? 'projects' : 'leads'),
  );
  const setActiveTab = useCallback(
    (key: string) => {
      setActiveTabState(key);
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          next.set('tab', key);
          return next;
        },
        // `state` MUST be carried through. setSearchParams navigates, and a
        // navigation with no `state` writes a history entry whose state is
        // undefined — so the first tab click erased the entry context above and
        // `fromLeads` flipped to false, which made every project-only tab appear
        // on a lead the user had opened from the Leads table. Same reason it has
        // to survive a refresh: the context lives in history.state, not the URL.
        { replace: true, state: location.state },
      );
    },
    [setSearchParams, location.state],
  );
  const [lead, setLead] = useState<any | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [contact, setContact] = useState<any | null>(null);

  const [formValues, setFormValues] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProposalModal, setShowProposalModal] = useState(false);

  // The lead IS a project once it reaches a project-trigger status — data-driven, not nav-driven.
  const isProject = isProjectEntity(lead);
  const projectId = lead?.projectId || lead?.project?.id || null;
  const phase = getProjectPhase(lead);
  const phaseTheme = PHASE_THEMES[phase] ?? PHASE_THEMES.none;

  // Project-only tabs (Tasks/Timesheet/Reimbursement) show for ANY project-trigger
  // lead — they fetch operational data by lead id, so a linked project row is no
  // longer required (lead-as-master). Entering from the Leads table suppresses
  // them entirely (lead-focused view), regardless of project status.
  const tabs = useMemo(
    () => ENTITY_TABS.filter(t => !t.projectOnly || (isProject && !fromLeads)),
    [isProject, fromLeads],
  );
  const vm = useMemo(() => (lead ? buildEntityVM(lead) : null), [lead]);

  // Live counts surfaced AS TAB BADGES (replaces the redundant related-records
  // strip, which just re-navigated to these same tabs). Only shown when > 0.
  const tabCounts = useMemo<Record<string, number>>(() => {
    const p = lead?.project || {};
    return {
      tasks: p?._count?.tasks ?? 0,
      timesheet: p?._count?.timesheets ?? 0,
      reimbursement: p?._count?.reimbursements ?? 0,
      documents: lead?.generatedProposals?.length ?? 0,
    };
  }, [lead]);

  useEffect(() => {
    // Wait for the lead to load — until then isProject is false and this would
    // clobber the Projects landing tab requested by the Projects-table entry.
    if (!lead) return;
    if (!tabs.some(t => t.key === activeTab)) setActiveTab('leads');
  }, [lead, tabs, activeTab]);

  const fetchLeadDetails = useCallback(async () => {
    if (!leadId) {
      setError('No lead ID provided');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // Add cache-busting parameter to ensure fresh data
      const leadResponse = await getLeadById(leadId, { _t: Date.now() });
      const leadData = leadResponse.data.data.lead;
      setLead(leadData);
      const promises: Promise<any>[] = [];
      if (leadData.companyId) promises.push(getClientCompanyById(leadData.companyId).then(r => setCompany(r?.data?.company || null)).catch(console.error));
      if (leadData.contactId) promises.push(getClientContactById(leadData.contactId).then(r => setContact(r?.data?.contact || null)).catch(console.error));
      await Promise.all(promises);
      setError(null);
    } catch (err) {
      console.error('Error fetching lead details:', err);
      setError('Failed to load details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    dispatch(loadAllEmployeesIfNeeded());
  }, [dispatch]);

  useEffect(() => {
    fetchLeadDetails();
  }, [fetchLeadDetails]);

  useEventBus(EVENT_KEYS.leadUpdated, (payload) => {
    // A saver that already holds the updated lead hands it over and the page takes it as
    // given: the PATCH read it back AFTER its own transaction committed, so there is nothing
    // fresher to fetch. Every save used to wait 150ms and then re-fetch the whole lead behind
    // this page's loading spinner — a second round-trip whose only job was to see what the
    // first had already returned.
    //
    // Only when company/contact are unmoved: those two drive side fetches this page also
    // holds, so a save that changes either still takes the full path.
    const next = (payload as any)?.lead;
    if (next?.id && lead?.companyId === next.companyId && lead?.contactId === next.contactId) {
      setLead(next);
      return;
    }
    // Small delay to ensure backend has persisted the change
    setTimeout(fetchLeadDetails, 150);
  });
  useEventBus(EVENT_KEYS.projectUpdated, () => {
    setTimeout(fetchLeadDetails, 150);
  });
  useEventBus(EVENT_KEYS.projectCreated, () => {
    setTimeout(fetchLeadDetails, 150);
  });

  const openEdit = useCallback(() => lead && setFormValues(mapLeadToFormInitialValues(lead)), [lead]);

  const renderTab = () => {
    if (error || !lead || !vm) return <div className="alert alert-danger">{error || 'No data available'}</div>;
    switch (activeTab) {
      case 'leads':
      case 'projects':
      case 'commercial':
        return (
          <SummarySection
            lead={lead}
            vm={vm}
            company={company}
            contact={contact}
            onJump={openEdit}
            view={activeTab}
          />
        );
      // Lead-as-master: execution stages hang off the LEAD id, same as tasks/timesheets.
      case 'execution':
        return <ExecutionSection projectId={lead.id} />;
      case 'tasks':
        return <TasksTab lead={lead} projectId={projectId} />;
      case 'timesheet':
        return <TimesheetTab lead={lead} projectId={projectId} />;
      case 'reimbursement':
        return <ReimbursementTab lead={lead} projectId={projectId} />;
      case 'documents':
        return <DocumentsTab lead={lead} vm={vm} isProject={isProject} projectId={projectId} onExport={() => setShowProposalModal(true)} />;
      case 'audit':
        return <AuditSection leadId={leadId} isProject={isProject} projectId={projectId} onChanged={fetchLeadDetails} />;
      case 'teams':
        return <TeamsSection lead={lead} />;
      case 'meetings':
        // Meetings are linked by projectId = the lead id (lead-as-master).
        return <ProjectMeetings leadId={lead.id} />;
      default:
        return null;
    }
  };

  if (isLoading || !lead) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <DMSProvider leadId={lead.id} inquiryNumber={lead.inquiryNo || lead.prefix || 'N/A'} leadTitle={lead.title || lead.name || 'Lead'}>
      <div className="d-flex flex-column flex-lg-row p-6">
        <div className="flex-lg-row-fluid">
          {/* ── Header ── */}
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-4 mb-2">
            <div className="d-flex align-items-start gap-3 flex-grow-1" style={{ minWidth: 0 }}>
              <button 
                className="btn btn-icon btn-active-light-primary" 
                onClick={() => navigate(-1)}
                style={{ width: '40px', height: '40px', flexShrink: 0, border: 'none', background: 'transparent' }}
              >
                <img src={miscellaneousIcons.leftArrow} alt="Back" style={{ width: '36px', height: '36px' }} />
              </button>
              
              <div className="d-flex flex-column flex-grow-1" style={{ minWidth: 0 }}>
                {/* Meta string */}
                <div className="d-flex align-items-center flex-wrap gap-2 mb-1" style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px' }}>
                  {/* Which number identifies this record follows the VIEW, not just
                      the tab: in the lead view every tab is looking at the lead, so
                      it stays the lead/OFFER number throughout. Showing the project
                      number on the lead view's Commercial tab was the same
                      lead-vs-project mix-up as the Project No. tile. */}
                  {isProject && !fromLeads && activeTab !== 'leads' ? (
                    <span style={{ color: '#059669' }}>{`#${projectNumberOf(lead) || 'N/A'}`}</span>
                  ) : (
                    <span style={{ color: '#64748B' }}>{`#${lead?.prefix || 'N/A'}`}</span>
                  )}
                  {(lead?.revisionCount !== undefined && lead?.revisionCount !== null) && (
                    <>
                      <span style={{ color: '#CBD5E1' }}>•</span>
                      <span style={{ color: '#94A3B8' }}>{`R${lead.revisionCount}`}</span>
                    </>
                  )}
                  {lead?.priority && (
                    <>
                      <span style={{ color: '#CBD5E1' }}>•</span>
                      <span className="d-inline-flex align-items-center gap-1" style={{ color: '#F59E0B' }}>
                        <AppIcon name="bi-star-fill" className="fs-8" style={{ marginTop: '-1px' }} /> {lead.priority}
                      </span>
                    </>
                  )}
                </div>
                
                {/* Title */}
                <h2 className="mb-0 text-truncate" style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 700, fontSize: '26px', color: '#0F172A', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                  {lead?.title || 'Unnamed Entity'}
                </h2>
              </div>
            </div>

            {/* Status pill follows the active tab: Lead status while on the Leads
                tab, Project status everywhere else (once the lead is a project).
                Edit/Export stay lead-only actions, shown only on the Leads tab. */}
            <div className="d-flex flex-wrap align-items-stretch align-items-sm-center gap-2 mt-1 mt-md-0">
              {isProject && !fromLeads && activeTab !== 'leads' ? (
                <ProjectStatusControl
                  leadId={leadId!}
                  projectStatusId={lead?.execution?.projectStatusId}
                  projectStatus={lead?.execution?.projectStatus}
                  actualEndDate={lead?.actualEndDate}
                  onChanged={fetchLeadDetails}
                  prefix="Project - "
                />
              ) : (
                <div
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 9,
                    border: `1px solid ${lead?.status?.color || '#64748B'}3D`,
                    background: `linear-gradient(180deg, ${lead?.status?.color || '#64748B'}17, ${lead?.status?.color || '#64748B'}0A)`,
                    color: lead?.status?.color || '#64748B',
                    borderRadius: 10, padding: '7px 14px',
                    fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700,
                    letterSpacing: '-0.1px',
                    boxShadow: `0 1px 2px ${lead?.status?.color || '#64748B'}14`,
                  }}
                >
                  <span
                    style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: lead?.status?.color || '#64748B', display: 'inline-block',
                      boxShadow: `0 0 0 3px ${lead?.status?.color || '#64748B'}22`,
                    }}
                  />
                  Lead - {lead?.status?.name || 'Set status'}
                </div>
              )}
              
              {/* The lead view hides every project tab by design, so a lead that
                  IS a project needs a door through to the project view — without
                  it an old /leads/:id link to a project is a dead end. Only this
                  direction needs one: the Leads tab is present in both views. */}
              {isProject && fromLeads && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => navigate(`/project/${leadId}`)}
                  style={{ backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '8px 16px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: '1 1 auto' }}
                >
                  <AppIcon name="bi-kanban" className="fs-7" /> Project view
                </button>
              )}

              {activeTab === 'leads' && (
                <>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={openEdit}
                    style={{ backgroundColor: '#1E3A8A', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: '1 1 auto' }}
                  >
                    <AppIcon name="bi-pencil-fill" className="fs-7" /> Edit
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setShowProposalModal(true)}
                    style={{ backgroundColor: '#7239ea', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: '1 1 auto' }}
                  >
                    <AppIcon name="bi-file-earmark-arrow-down-fill" className="fs-7" /> Export
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Sticky tab nav ── */}
          <UnderlineTabs
            sticky
            tabs={tabs.map(t => ({ ...t, count: tabCounts[t.key] }))}
            value={activeTab}
            onChange={setActiveTab}
            ariaLabel="Record sections"
            sx={{ mt: 3 }}
          />

          <div className="tab-content">
            <DensityProvider mode="advanced">{renderTab()}</DensityProvider>
          </div>
        </div>
      </div>

      {formValues && (
        <LeadWizardModal
          key={formValues?.id || 'edit-lead-modal'}
          leadTemplateId={formValues?.leadTemplateId}
          open={true}
          onClose={() => setFormValues(null)}
          title={formValues?.id ? `Edit Lead / Project` : 'New Lead'}
          initialData={formValues?.id ? { id: formValues?.leadTemplateId } : { ...formValues, title: '' }}
          initialFormData={formValues}
          isEditMode={!!formValues?.id}
        />
      )}

      <ProposalTemplatePage
        show={showProposalModal}
        onHide={() => setShowProposalModal(false)}
        leadData={lead}
        companyData={company}
        contactData={contact}
        projectData={lead?.project || null}
      />
    </DMSProvider>
  );
};

export default EntityDetailPage;
