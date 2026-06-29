import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const dispatch = useDispatch<AppDispatch>();

  const [activeTab, setActiveTab] = useState<string>('summary');
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
  // longer required (lead-as-master).
  const tabs = useMemo(() => ENTITY_TABS.filter(t => !t.projectOnly || isProject), [isProject]);
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
    if (!tabs.some(t => t.key === activeTab)) setActiveTab('summary');
  }, [tabs, activeTab]);

  const fetchLeadDetails = useCallback(async () => {
    if (!leadId) {
      setError('No lead ID provided');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const leadResponse = await getLeadById(leadId);
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

  useEventBus(EVENT_KEYS.leadUpdated, fetchLeadDetails);
  useEventBus(EVENT_KEYS.projectUpdated, fetchLeadDetails);
  useEventBus(EVENT_KEYS.projectCreated, fetchLeadDetails);

  const openEdit = useCallback(() => lead && setFormValues(mapLeadToFormInitialValues(lead)), [lead]);

  const renderTab = () => {
    if (error || !lead || !vm) return <div className="alert alert-danger">{error || 'No data available'}</div>;
    switch (activeTab) {
      case 'summary':
        return (
          <SummarySection
            lead={lead}
            vm={vm}
            company={company}
            contact={contact}
            onJump={openEdit}
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
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="d-flex align-items-center gap-2 gap-md-3 flex-grow-1">
              <button className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm" onClick={() => navigate(-1)}>
                <img src={miscellaneousIcons.leftArrow} alt="Back" style={{ width: '36px', height: '36px', cursor: 'pointer' }} />
              </button>
              <div className="flex-grow-1">
                <div className="text-muted small font-inter d-flex align-items-center flex-wrap gap-2">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: isProject ? phaseTheme.bg : '#F1F5F9', color: isProject ? phaseTheme.fg : '#475569', borderRadius: '999px', padding: '3px 12px', fontSize: '11px', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: isProject ? phaseTheme.fg : '#475569', display: 'inline-block' }} />
                    {isProject ? `LEAD → PROJECT · ${phaseTheme.label.toUpperCase()}` : 'LEAD'}
                  </span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '13px' }}>{`#${lead?.prefix || 'N/A'}`}</span>
                  {isProject && lead?.project?.prefix && (
                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '13px', color: '#0A5C2A' }}>· {`Project #${lead.project.prefix}`}</span>
                  )}
                  {(lead?.revisionCount !== undefined && lead?.revisionCount !== null) && (
                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '13px', color: '#64748B' }}>· {`R${lead.revisionCount}`}</span>
                  )}
                  {lead?.status?.name && (
                    <span className="badge" style={{ backgroundColor: lead.status.color || '#64748B', color: '#fff', fontSize: '10px' }}>{lead.status.name}</span>
                  )}
                </div>
                <div className="d-flex align-items-center gap-2">
                  <h2 className="mb-0 text-truncate" style={{ fontFamily: 'Barlow', fontWeight: '600', fontSize: '24px' }}>{lead?.title}</h2>
                  {lead?.priority && (
                    <div className="d-flex align-items-center gap-1">
                      <KTIcon iconName="star" className="fs-6 text-warning" />
                      <span className="text-muted small">{lead.priority}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Button variant="primary" onClick={openEdit} style={{ backgroundColor: '#AA393D', borderColor: '#AA393D' }}>
                <KTIcon iconName="pencil" className="fs-2" /> Edit
              </Button>
              <Button variant="info" onClick={() => setShowProposalModal(true)} style={{ backgroundColor: '#7239ea', borderColor: '#7239ea', color: 'white' }}>
                <KTIcon iconName="file-down" className="fs-2" /> Export
              </Button>
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
