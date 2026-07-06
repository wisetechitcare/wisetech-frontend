import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { loadAllEmployeesIfNeeded } from '@redux/slices/allEmployees';
import type { AppDispatch, RootState } from '@redux/store';
import { KTIcon } from '@metronic/helpers';
import { miscellaneousIcons } from '@metronic/assets/miscellaneousicons';

import { useLead } from '@hooks/useCrmQueries';
import { queryKeys } from '@/lib/queryKeys';

import {
  isProjectEntity,
  getProjectPhase,
  getTimelineProgress,
  isDelayedProject,
  formatCompactCurrency,
  PHASE_THEMES,
} from '@pages/employee/entity/entityUtils';
import { buildEntityVM } from '@pages/employee/entity/detail/facets';
import { DensityProvider } from '@pages/employee/entity/detail/density';
import { employeeNameById, employeeUserName, fmtDate, DASH } from '@pages/employee/entity/detail/entityViewModel';
import { TasksTab, TimesheetTab, ReimbursementTab } from '@pages/employee/entity/detail/sections/ProjectModuleTabs';
import DocumentsTab from '@pages/employee/entity/detail/sections/DocumentsTab';
import AuditSection from '@pages/employee/entity/detail/sections/AuditSection';
import { DMSProvider } from '@pages/employee/leads/lead/components/dms/store/DmsContext';
import {
  DetailCard,
  DetailRow,
  DetailStatusBadge,
  DetailSummaryBar,
  DetailProfileBlock,
} from '@app/modules/detail-page/DetailPageComponents';

/**
 * Project Workspace — the execution-persona home for a project (Phase 3 of
 * docs/LEAD_PROJECT_DUAL_WORKSPACE_ARCHITECTURE.md). One aggregate, two
 * workspaces: this page renders the SAME lead the Lead workspace edits, but
 * leads with delivery language — health strip, execution overview, operational
 * tabs. Lead-owned data appears read-only with a deep link to the Lead page.
 *
 * :projectId IS the lead id (lead-as-master). Non-project leads redirect to
 * the lead detail page — the record exists, its stage just isn't Project yet.
 */

// Workspace accent — deliberately distinct from the Lead pages' burgundy so the
// two experiences read as different products (§8.4), while staying in the
// existing token palette (teal ICON_COLORS family).
const ACCENT = '#0F766E';
const ACCENT_SOFT = '#F0FDFA';

const WORKSPACE_TABS: { key: string; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'bi bi-speedometer2' },
  { key: 'tasks', label: 'Tasks', icon: 'bi bi-check2-square' },
  { key: 'timesheet', label: 'Timeline & Time', icon: 'bi bi-stopwatch' },
  { key: 'reimbursement', label: 'Expenses', icon: 'bi bi-wallet2' },
  { key: 'documents', label: 'Files', icon: 'bi bi-folder2-open' },
  { key: 'history', label: 'History', icon: 'bi bi-clock-history' },
];

const sumCommercials = (lead: any): { totalCost: number; totalArea: number } => {
  const rows: any[] = Array.isArray(lead?.commercials) ? lead.commercials : [];
  return {
    totalCost: rows.reduce((acc, c) => acc + (parseFloat(c?.cost) || 0), 0),
    totalArea: rows.reduce((acc, c) => acc + (parseFloat(c?.area) || 0), 0),
  };
};

/** Execution overview cards — reads lead.execution (the 1:1 extension) directly. */
const ExecutionOverview: React.FC<{ lead: any; onOpenLead: () => void }> = ({ lead, onOpenLead }) => {
  const allEmployees = useSelector((s: RootState) => s.allEmployees?.list) || [];
  const exec = lead?.execution || {};
  const progress = getTimelineProgress(lead?.startDate, lead?.endDate);

  const pmName =
    (exec?.projectManager && employeeUserName(exec.projectManager)) ||
    employeeNameById(allEmployees, exec?.projectManagerId) ||
    DASH;

  return (
    <div>
      <div className="row g-5 mb-2">
        <div className="col-12 col-xl-6">
          <DetailCard title="Ownership & Status" subtitle="Who runs this project" icon="bi bi-person-workspace" accentColor="teal">
            <div style={{ padding: '8px 0 4px' }}>
              <DetailProfileBlock
                name={pmName}
                subtitle="Project Manager"
                href={exec?.projectManagerId ? `/employees/${exec.projectManagerId}` : undefined}
                accentColor="teal"
              />
            </div>
            <DetailRow label="Team" value={exec?.team?.name || DASH} />
            <DetailRow
              label="Execution Status"
              value={
                exec?.projectStatus?.name
                  ? <DetailStatusBadge status={exec.projectStatus.name} color={exec.projectStatus.color || ACCENT} />
                  : DASH
              }
            />
            <DetailRow label="Visibility" value={exec?.projectAccess ? String(exec.projectAccess) : DASH} />
            <DetailRow
              label="Live"
              value={<DetailStatusBadge status={exec?.isLive ? 'Live' : 'Not live'} color={exec?.isLive ? '#16a34a' : '#94A3B8'} />}
            />
            <DetailRow
              label="Open / Closed"
              value={<DetailStatusBadge status={exec?.isProjectOpen === false ? 'Closed' : 'Open'} color={exec?.isProjectOpen === false ? '#f1416c' : '#16a34a'} />}
              isLast
            />
          </DetailCard>
        </div>
        <div className="col-12 col-xl-6">
          <DetailCard title="Timeline" subtitle="Schedule & progress" icon="bi bi-calendar-range" accentColor="amber">
            <DetailRow label="Start Date" value={fmtDate(lead?.startDate)} />
            <DetailRow label="Expected Completion" value={fmtDate(lead?.endDate)} />
            <DetailRow label="Received Date" value={fmtDate(lead?.receivedDate)} />
            <div style={{ padding: '12px 0 4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>
                <span>Progress</span>
                <span style={{ color: '#1E293B' }}>{progress != null ? `${progress}%` : DASH}</span>
              </div>
              <div style={{ height: 8, background: '#EEF2F6', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${progress ?? 0}%`, height: '100%', background: `linear-gradient(90deg, ${ACCENT}, #14B8A6)`, borderRadius: 999, transition: 'width .4s ease' }} />
              </div>
            </div>
          </DetailCard>
        </div>
      </div>

      <div className="row g-5 mb-2">
        <div className="col-12 col-xl-5">
          <DetailCard title="Purchase Order" subtitle="PO tracking" icon="bi bi-receipt" accentColor="green">
            <DetailRow
              label="PO Status"
              value={lead?.poStatus ? <DetailStatusBadge status={String(lead.poStatus)} /> : DASH}
            />
            <DetailRow
              label="PO File"
              value={
                lead?.poFile
                  ? <a href={lead.poFile} target="_blank" rel="noreferrer" style={{ color: ACCENT, fontWeight: 600 }}>View file</a>
                  : DASH
              }
              isLast
            />
          </DetailCard>
        </div>
        <div className="col-12 col-xl-7">
          <DetailCard
            title="Contract & Client (from Lead)"
            subtitle="Owned by the Lead workspace — edit there"
            icon="bi bi-briefcase"
            accentColor="blue"
            actions={
              <button className="btn btn-sm btn-light" onClick={onOpenLead} style={{ fontWeight: 600 }}>
                Edit in Lead <i className="bi bi-arrow-right ms-1" />
              </button>
            }
          >
            <DetailRow label="Client Company" value={lead?.company?.companyName || DASH} />
            <DetailRow label="Contact" value={lead?.contact?.fullName || DASH} />
            <DetailRow label="Pipeline Status" value={lead?.status?.name ? <DetailStatusBadge status={lead.status.name} color={lead.status.color} /> : DASH} />
            <DetailRow label="Contract Rate" value={exec?.rate != null ? `₹${parseFloat(exec.rate).toLocaleString('en-IN')}` : DASH} />
            <DetailRow label="Contract Cost" value={exec?.cost != null ? formatCompactCurrency(parseFloat(exec.cost)) : DASH} isLast />
          </DetailCard>
        </div>
      </div>
    </div>
  );
};

const ProjectWorkspacePage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const queryClient = useQueryClient();
  const allEmployees = useSelector((s: RootState) => s.allEmployees?.list) || [];

  const [activeTab, setActiveTab] = useState<string>('overview');

  const leadQuery = useLead(projectId);
  const lead = leadQuery.data?.data?.data?.lead ?? null;
  const isProject = isProjectEntity(lead);

  useEffect(() => {
    dispatch(loadAllEmployeesIfNeeded());
  }, [dispatch]);

  // A lead that isn't (yet) a project belongs in the Lead workspace — same
  // aggregate, different stage. Redirect instead of 404-ing.
  useEffect(() => {
    if (lead && !isProject) navigate(`/employee/lead/${lead.id}`, { replace: true });
  }, [lead, isProject, navigate]);

  const vm = useMemo(() => (lead ? buildEntityVM(lead) : null), [lead]);
  const phase = getProjectPhase(lead);
  const phaseTheme = PHASE_THEMES[phase] ?? PHASE_THEMES.none;
  const exec = lead?.execution || {};
  const progress = getTimelineProgress(lead?.startDate, lead?.endDate);
  const delayed = isDelayedProject(lead);
  const { totalCost } = useMemo(() => sumCommercials(lead), [lead]);
  const pmName =
    (exec?.projectManager && employeeUserName(exec.projectManager)) ||
    employeeNameById(allEmployees, exec?.projectManagerId) ||
    DASH;

  const refetchLead = () => {
    if (projectId) queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(projectId) });
  };
  const openLead = () => lead && navigate(`/employee/lead/${lead.id}`);

  if (leadQuery.isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border" role="status" style={{ color: ACCENT }}>
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (leadQuery.isError || !lead) {
    return (
      <div className="p-10 text-center">
        <h3 style={{ fontFamily: 'Barlow', fontWeight: 600 }}>Project not found</h3>
        <p className="text-muted">
          This project id doesn't resolve to a record. It may be a legacy id from the retired projects table.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/qc/projects')} style={{ backgroundColor: ACCENT, borderColor: ACCENT }}>
          Back to Projects
        </button>
      </div>
    );
  }

  if (!isProject) return null; // redirect effect is in flight

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <ExecutionOverview lead={lead} onOpenLead={openLead} />;
      case 'tasks':
        return <TasksTab lead={lead} projectId={lead.id} />;
      case 'timesheet':
        return <TimesheetTab lead={lead} projectId={lead.id} />;
      case 'reimbursement':
        return <ReimbursementTab lead={lead} projectId={lead.id} />;
      case 'documents':
        return <DocumentsTab lead={lead} vm={vm!} isProject projectId={lead.id} />;
      case 'history':
        return <AuditSection leadId={lead.id} isProject projectId={lead.id} onChanged={refetchLead} />;
      default:
        return null;
    }
  };

  return (
    <DMSProvider leadId={lead.id} inquiryNumber={lead.inquiryNo || lead.prefix || 'N/A'} leadTitle={lead.title || 'Project'}>
      <div className="d-flex flex-column p-6">
        {/* ── Header ── */}
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div className="d-flex align-items-center gap-2 gap-md-3 flex-grow-1">
            <button className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm" onClick={() => navigate('/qc/projects')}>
              <img src={miscellaneousIcons.leftArrow} alt="Back" style={{ width: 36, height: 36, cursor: 'pointer' }} />
            </button>
            <div className="flex-grow-1">
              <div className="text-muted small font-inter d-flex align-items-center flex-wrap gap-2">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: ACCENT_SOFT, color: ACCENT, borderRadius: 999, padding: '3px 12px', fontSize: 11, fontWeight: 700, fontFamily: 'Inter, sans-serif', border: `1px solid ${ACCENT}33` }}>
                  <i className="bi bi-kanban-fill" style={{ fontSize: 10 }} />
                  PROJECT WORKSPACE
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: phaseTheme.bg, color: phaseTheme.fg, borderRadius: 999, padding: '3px 12px', fontSize: 11, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: phaseTheme.fg, display: 'inline-block' }} />
                  {phaseTheme.label.toUpperCase()}
                </span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 13 }}>{`#${lead?.prefix || 'N/A'}`}</span>
                {delayed && (
                  <span className="badge" style={{ backgroundColor: '#f1416c', color: '#fff', fontSize: 10 }}>DELAYED</span>
                )}
              </div>
              <h2 className="mb-0 text-truncate" style={{ fontFamily: 'Barlow', fontWeight: 600, fontSize: 24 }}>{lead?.title}</h2>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button className="btn btn-light" onClick={openLead} style={{ fontWeight: 600 }}>
              <i className="bi bi-arrow-up-right-square me-1" /> Originating Lead
            </button>
          </div>
        </div>

        {/* ── Health strip ── */}
        <div className="mt-5">
          <DetailSummaryBar
            items={[
              { label: 'Execution Status', value: exec?.projectStatus?.name || DASH, icon: 'bi bi-activity', accentColor: 'teal' },
              { label: 'Progress', value: progress != null ? `${progress}%` : DASH, icon: 'bi bi-hourglass-split', accentColor: 'amber' },
              { label: 'Due', value: fmtDate(lead?.endDate), icon: 'bi bi-calendar-check', accentColor: delayed ? 'danger' : 'green' },
              { label: 'Contract Value', value: totalCost ? formatCompactCurrency(totalCost) : DASH, icon: 'bi bi-currency-rupee', accentColor: 'green' },
              { label: 'Project Manager', value: pmName, icon: 'bi bi-person-workspace', accentColor: 'blue' },
              { label: 'Team', value: exec?.team?.name || DASH, icon: 'bi bi-people', accentColor: 'purple' },
            ]}
          />
        </div>

        {/* ── Tab nav (workspace accent) ── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(248,250,252,0.92)', backdropFilter: 'blur(6px)', margin: '18px -8px 18px', padding: '6px 8px' }}>
          <ul className="nav flex-nowrap mb-0 d-flex overflow-auto" style={{ gap: 4, listStyle: 'none', borderBottom: '1px solid #E2E8F0', width: '100%' }}>
            {WORKSPACE_TABS.map(tab => {
              const isActive = activeTab === tab.key;
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
                      paddingTop: 8,
                      paddingBottom: 10,
                      marginBottom: -1,
                      color: isActive ? ACCENT : '#64748B',
                      borderBottom: `2px solid ${isActive ? ACCENT : 'transparent'}`,
                      transition: 'color 0.15s ease, border-color 0.15s ease',
                    }}
                  >
                    <i className={tab.icon} />
                    {tab.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="tab-content">
          <DensityProvider mode="advanced">{renderTab()}</DensityProvider>
        </div>
      </div>
    </DMSProvider>
  );
};

export default ProjectWorkspacePage;
