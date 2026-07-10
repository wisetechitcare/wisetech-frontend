import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { DetailCard, DetailRow, DetailStatusBadge } from '@app/modules/detail-page/DetailPageComponents';
import { C, FONT, RADIUS, ICON_COLORS } from '@app/modules/configuration/ConfigDesignSystem';
import { HealthGauge, MissingInfoChip } from '../widgets';
import SystemSection from './SystemSection';
import ProjectDetailSection from './ProjectDetailSection';
import { companyContactCards } from './CompanyContactSection';
import { AddressesCard, clientExtraCards } from './ClientSection';
import ScopeSection, { ServiceScopeCard } from './ScopeSection';
import CommercialsSection from './CommercialsSection';
import type { EntityVM } from '../facets';
import {
  fmtDate,
  employeeUserName,
  employeeNameById,
  projectManagerName,
  computeHealth,
  computeMissingInfo,
  conversionProbability,
  DASH,
} from '../entityViewModel';
import { getTimelineProgress, isDelayedProject } from '../../entityUtils';

interface Stat {
  label: string;
  value: React.ReactNode;
  icon: string;
  accent: keyof typeof ICON_COLORS;
}

/**
 * Dense metrics grid — auto-fitting cells separated by hairline rules (drawn via a
 * 1px gap over the border color), so several stats pack into one compact band with
 * no chunky card boxes. Used inside the unified summary panel.
 */
const StatGrid: React.FC<{ items: Stat[] }> = ({ items }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 1, backgroundColor: C.border }}>
    {items.map((it, i) => {
      const { bg, color } = ICON_COLORS[it.accent] ?? ICON_COLORS.primary;
      return (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', backgroundColor: C.bgCard, minWidth: 0 }}>
          <span style={{ width: 30, height: 30, borderRadius: RADIUS.md, backgroundColor: bg, color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className={it.icon} style={{ fontSize: 13 }} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: FONT.body, fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{it.label}</div>
            <div style={{ fontFamily: FONT.heading, fontSize: 14.5, fontWeight: 700, color: C.textPrimary, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.value}</div>
          </div>
        </div>
      );
    })}
  </div>
);

/**
 * Two-per-row card grid. Cards flow left→right, two to a row; when the count is
 * odd the final card spans the full width (e.g. 3 cards → two on top, one
 * full-width below). Collapses to a single column on narrow screens.
 */
const CardGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const items = React.Children.toArray(children).filter(Boolean);
  const oddLast = items.length % 2 === 1;
  return (
    <div className="row g-5">
      {items.map((node, i) => (
        <div className={oddLast && i === items.length - 1 ? 'col-12' : 'col-12 col-lg-6'} key={i}>
          {node}
        </div>
      ))}
    </div>
  );
};

/** Section divider with an uppercase label — used where one sub-page holds two domains. */
const SectionHeading: React.FC<{ icon: string; title: string; color?: string }> = ({ icon, title, color = '#94A3B8' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '6px 2px 12px' }}>
    <span style={{ width: 26, height: 26, borderRadius: 8, background: `${color}18`, color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <i className={icon} style={{ fontSize: 13 }} />
    </span>
    <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 800, letterSpacing: 0.7, textTransform: 'uppercase', color: '#475569' }}>{title}</span>
    <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,#E2E8F0,transparent)' }} />
  </div>
);

export type SummaryView = 'leads' | 'projects' | 'commercial';

/**
 * Summary — the entity overview area, divided into focused views (Leads /
 * Projects / Commercial), now selected by the page's own top-level tab bar
 * rather than an internal pill sub-nav. Each view is one concern; the long
 * single-scroll is gone. The operational project modules (Tasks / Timesheet /
 * Reimbursement) and Documents remain their own top-level tabs.
 */
const SummarySection: React.FC<{
  lead: any;
  vm: EntityVM;
  company?: any;
  contact?: any;
  onJump: (step: number) => void;
  view: SummaryView;
}> = ({ lead, vm, company, contact, onJump, view }) => {
  const allEmployees = useSelector((s: RootState) => s.allEmployees?.list) || [];
  const isProject = !!lead?.status?.isProjectTrigger || !!lead?.project;
  const p = lead?.project || {};
  // Lead-as-master: execution-only fields now come from the lead's 1:1 execution
  // extension. Fall back to the (transitional) project row when present.
  const exec = lead?.execution || {};

  // Projects is project-only; fall back to Leads if the tab is somehow active
  // on a non-project lead (e.g. right after a status change removes it).
  const active = view === 'projects' && !isProject ? 'leads' : view;

  const owner = employeeUserName(lead?.assignedTo) || employeeNameById(allEmployees, lead?.assignedToId) || DASH;
  const missing = computeMissingInfo(lead);
  const health = computeHealth(lead, missing.length);
  const probability = conversionProbability(lead, health);
  // Dates live on the lead now (fallback to the project row during transition).
  const execStart = lead?.startDate || p?.startDate;
  const execEnd = lead?.endDate || p?.endDate;
  const progress = getTimelineProgress(execStart, execEnd);
  const delayed = isDelayedProject(lead);
  const execManager = exec?.projectManager
    ? employeeUserName(exec.projectManager)
    : employeeNameById(allEmployees, exec?.projectManagerId);
  const pmName = execManager || projectManagerName(p, allEmployees) || DASH;
  const execStatus = exec?.projectStatus || p?.status || null;
  // Most specific first: a referral traces back to an actual person (contact or
  // internal employee) or company — show that name instead of a generic bucket
  // like "Other". Only fall back to the direct-source / raw type label when no
  // referral detail is on record.
  const referral = (lead?.referrals || [])[0];
  const leadSource =
    referral?.referredByContact?.fullName ||
    employeeUserName(referral?.referredByEmployee) ||
    referral?.referringCompany?.companyName ||
    lead?.leadDirectSource?.name ||
    lead?.source?.name ||
    (lead?.leadSourceType ? String(lead.leadSourceType).replace(/_/g, ' ') : '') ||
    DASH;

  // ── LEADS ─ all lead master data: health, identity, client, specs, address,
  //           notes, system metadata (everything that belongs to the lead). ─────
  const Leads = (
    <div>


      {/* Primary lead identity — the "main things", lead number first. */}
      <StatGrid
        items={[
          { label: 'Inquiry Date', value: fmtDate(lead?.inquiryDate), icon: 'bi bi-calendar-event', accent: 'teal' },
          { label: 'Lead No.', value: lead?.prefix || DASH, icon: 'bi bi-hash', accent: 'primary' },
          { label: 'Status', value: <DetailStatusBadge status={lead?.status?.name || DASH} color={lead?.status?.color} />, icon: 'bi bi-activity', accent: 'blue' },
          { label: 'Assigned To', value: owner, icon: 'bi bi-person-badge', accent: 'purple' },
          { label: 'Lead Source', value: leadSource, icon: 'bi bi-signpost-split', accent: 'info' },
          { label: 'Next Follow-up', value: fmtDate(lead?.nextFollowUpDate), icon: 'bi bi-calendar-check', accent: 'amber' },
        ]}
      />

      <div className="mt-5">
        <SectionHeading icon="bi bi-buildings" title="Client & Contacts" color={ICON_COLORS.blue.color} />
        <CardGrid>
          {companyContactCards(company, contact, lead)}
          <ServiceScopeCard vm={vm} />
          {clientExtraCards(vm, lead?.companyId)}
        </CardGrid>
      </div>

      <div className="mt-6">
        <SectionHeading icon="bi bi-rulers" title="Specifications" color="#7c3aed" />
        <ScopeSection vm={vm} />
      </div>

      <div className="mt-5">
        <AddressesCard vm={vm} only="lead" title="Lead Address" />
      </div>

      {(vm.notes.remarks || vm.notes.description) && (
        <div className="mt-5">
          <DetailCard title="Notes & Description" subtitle="Remarks captured on this record" icon="bi bi-card-text" accentColor="amber">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
              {vm.notes.description && (
                <div>
                  <div style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.textMuted, marginBottom: 5 }}>Description</div>
                  <div style={{ fontFamily: FONT.body, fontSize: 13.5, color: C.textPrimary, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{vm.notes.description}</div>
                </div>
              )}
              {vm.notes.remarks && (
                <div>
                  <div style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.textMuted, marginBottom: 5 }}>Remarks</div>
                  <div style={{ fontFamily: FONT.body, fontSize: 13.5, color: C.textPrimary, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{vm.notes.remarks}</div>
                </div>
              )}
            </div>
          </DetailCard>
        </div>
      )}

      {/* File Location moved to the Documents tab (single source of truth) to avoid
          duplicating it here. See DocumentsSection. */}

      {lead?.isCancelled && (
        <div className="mt-5">
          <DetailCard title="Closure / Cancellation" subtitle="Why this lead was closed" icon="bi bi-x-octagon" accentColor="danger">
            <DetailRow label="Reason" value={lead?.reasonForCancellation || lead?.reason?.name || DASH} />
            <DetailRow label="Note" value={lead?.cancellationNote || DASH} />
            <DetailRow label="Closed On" value={fmtDate(lead?.cancellationDate)} isLast />
          </DetailCard>
        </div>
      )}

      <div className="mt-6">
        <SectionHeading icon="bi bi-gear" title="System & Metadata" color="#64748B" />
        <SystemSection vm={vm} variant="lead" />
      </div>
    </div>
  );

  // ── PROJECTS ─ execution snapshot + the full project execution cards.
  //              Only rendered once the lead reaches a project-trigger status. ───
  const Projects = (
    <div>
      <SectionHeading icon="bi bi-kanban" title="Project Snapshot" color={ICON_COLORS.green.color} />
      <StatGrid
        items={[
          { label: 'Project No.', value: lead?.prefix || DASH, icon: 'bi bi-hash', accent: 'primary' },
          { label: 'Project Status', value: <DetailStatusBadge status={execStatus?.name || DASH} color={execStatus?.color} />, icon: 'bi bi-kanban', accent: 'blue' },
          { label: 'Execution Team', value: exec?.team?.name || DASH, icon: 'bi bi-people', accent: 'purple' },
          { label: 'Project Manager', value: pmName, icon: 'bi bi-person-workspace', accent: 'primary' },
          { label: 'Start Date', value: fmtDate(execStart), icon: 'bi bi-calendar-event', accent: 'teal' },
          { label: 'Expected Closure', value: fmtDate(execEnd), icon: 'bi bi-calendar-check', accent: 'green' },
        ]}
      />
      <div className="mt-5">
        <ProjectDetailSection lead={lead} />
      </div>

      {vm.client.addresses.some(a => a.kind === 'project') && (
        <div className="mt-5">
          <AddressesCard vm={vm} only="project" title="Project Site Address" />
        </div>
      )}

      {vm.projectSystemRows && (
        <div className="mt-6">
          <SectionHeading icon="bi bi-gear" title="Project Metadata" color="#64748B" />
          <SystemSection vm={vm} variant="project" />
        </div>
      )}
    </div>
  );

  // ── COMMERCIAL ─ the quote / contract commercial breakdown (line items + totals).
  const Commercial = (
    <div>
      <SectionHeading icon="bi bi-cash-stack" title="Commercials" color="#16a34a" />
      <CommercialsSection vm={vm} rawLead={lead} />
    </div>
  );

  return (
    <div>
      {active === 'leads' && Leads}
      {active === 'projects' && isProject && Projects}
      {active === 'commercial' && Commercial}
    </div>
  );
};

export default SummarySection;
