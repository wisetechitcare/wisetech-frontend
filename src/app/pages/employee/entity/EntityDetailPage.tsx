import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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

import { isProjectEntity, getProjectPhase, PHASE_THEMES } from './entityUtils';
import { DensityProvider } from './detail/density';
import { buildEntityVM, ENTITY_TABS } from './detail/facets';

import SummarySection from './detail/sections/SummarySection';
import { TasksTab, TimesheetTab, ReimbursementTab } from './detail/sections/ProjectModuleTabs';
import DocumentsTab from './detail/sections/DocumentsTab';
import AuditSection from './detail/sections/AuditSection';
import TeamsSection from './detail/sections/TeamsSection';
import BillingSection from './detail/sections/BillingSection';
import ProjectStatusControl from './detail/ProjectStatusControl';

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

  // ── Entry context — the SAME page behaves differently by origin. The Projects
  //    table (and legacy /projects/:id links) navigate with state.isProject, the
  //    Leads tables pass only state.leadData. From Projects: land on the Projects
  //    tab with the full project tab set. From Leads: land on Leads and hide the
  //    project-only tabs entirely (Projects/Tasks/Timesheet/…), even for a
  //    received lead. Direct URLs / notifications carry no state and keep the
  //    full data-driven view. history.state survives refresh, so the context
  //    sticks until the user navigates in from the other table. ────────────────
  const navState = (location.state ?? {}) as { isProject?: boolean; leadData?: unknown };
  const fromProjects = navState.isProject === true;
  const fromLeads = !fromProjects && navState.leadData != null;

  const [activeTab, setActiveTab] = useState<string>(fromProjects ? 'projects' : 'leads');
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

  useEventBus(EVENT_KEYS.leadUpdated, () => {
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
      case 'billing':
        return <BillingSection lead={lead} />;
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
                  {isProject && activeTab !== 'leads' ? (
                    <span style={{ color: '#059669' }}>{`#${lead?.originalProjectPrefix || lead?.project?.prefix || 'N/A'}`}</span>
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
                        <i className="bi bi-star-fill" style={{ fontSize: '11px', marginTop: '-1px' }} /> {lead.priority}
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
              
              {activeTab === 'leads' && (
                <>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={openEdit}
                    style={{ backgroundColor: '#AA393D', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: '1 1 auto' }}
                  >
                    <i className="bi bi-pencil-fill" style={{ fontSize: '12px' }} /> Edit
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setShowProposalModal(true)}
                    style={{ backgroundColor: '#7239ea', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: '1 1 auto' }}
                  >
                    <i className="bi bi-file-earmark-arrow-down-fill" style={{ fontSize: '13px' }} /> Export
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Sticky tab nav ── */}
          <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(248,250,252,0.92)', backdropFilter: 'blur(6px)', margin: '24px -8px 18px', padding: '6px 8px' }}>
            <div className="d-flex overflow-auto">
              {/* Primary nav = clean underline tab bar. The active tab carries a brand
                  underline indicator; the secondary sub-nav (Overview/Client/…) uses the
                  segmented pill control, giving a clear two-level hierarchy. */}
              <ul
                className="nav flex-nowrap mb-0"
                style={{ gap: '4px', listStyle: 'none', borderBottom: '1px solid #E2E8F0', width: '100%' }}
              >
                {tabs.map(tab => {
                  const isActive = activeTab === tab.key;
                  const count = tabCounts[tab.key];
                  return (
                    <li key={tab.key}>
                      <a
                        className="d-inline-flex align-items-center gap-2 px-3 cursor-pointer"
                        onClick={() => setActiveTab(tab.key)}
                        aria-pressed={isActive}
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          whiteSpace: 'nowrap',
                          fontWeight: isActive ? 700 : 500,
                          fontSize: '13.5px',
                          paddingTop: '8px',
                          paddingBottom: '10px',
                          marginBottom: '-1px',
                          color: isActive ? '#AA393D' : '#64748B',
                          background: 'transparent',
                          borderBottom: `2px solid ${isActive ? '#AA393D' : 'transparent'}`,
                          transition: 'color 0.15s ease, border-color 0.15s ease',
                        }}
                      >
                        <i className={tab.icon} />
                        {tab.label}
                        {count > 0 && (
                          <span
                            style={{
                              fontFamily: 'Barlow',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: isActive ? '#fff' : '#64748B',
                              background: isActive ? '#9d4141' : '#E2E8F0',
                              borderRadius: '999px',
                              minWidth: '18px',
                              height: '18px',
                              padding: '0 5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {count}
                          </span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

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
