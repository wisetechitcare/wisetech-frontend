import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { DetailCard, DetailStatusBadge } from '@app/modules/detail-page/DetailPageComponents';
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
  compactMoney,
  employeeUserName,
  employeeNameById,
  projectManagerName,
  sumLeadCommercials,
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

type SubKey = 'overview' | 'client' | 'scope' | 'project';
interface SubDef {
  key: SubKey;
  label: string;
  icon: string;
  projectOnly?: boolean;
}
const SUB_PAGES: SubDef[] = [
  { key: 'overview', label: 'Overview', icon: 'bi bi-speedometer2' },
  { key: 'client', label: 'Client', icon: 'bi bi-buildings' },
  { key: 'scope', label: 'Scope & Commercials', icon: 'bi bi-diagram-3' },
  { key: 'project', label: 'Project', icon: 'bi bi-kanban', projectOnly: true },
];

/**
 * Segmented pill sub-nav inside the Summary tab. Styled to match the Audit Trail
 * Timeline/Compare/Insights toggle: one rounded track on a light slate ground,
 * the active sub-page raised as a white card, the rest flat.
 */
const SubNav: React.FC<{ items: SubDef[]; active: SubKey; onChange: (k: SubKey) => void }> = ({ items, active, onChange }) => (
  <div
    style={{
      display: 'inline-flex',
      gap: 3,
      flexWrap: 'wrap',
      marginBottom: 18,
      background: '#EEF2F6',
      padding: 4,
      borderRadius: 12,
    }}
  >
    {items.map(s => {
      const isActive = s.key === active;
      return (
        <button
          key={s.key}
          type="button"
          onClick={() => onChange(s.key)}
          aria-pressed={isActive}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            border: 'none',
            background: isActive ? '#fff' : 'transparent',
            color: isActive ? '#AA393D' : '#475569',
            borderRadius: 9,
            padding: '7px 16px',
            cursor: 'pointer',
            fontFamily: 'Inter',
            fontSize: 13,
            fontWeight: isActive ? 700 : 500,
            boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
        >
          <i className={s.icon} />
          {s.label}
        </button>
      );
    })}
  </div>
);

/**
 * Summary — the entity overview area, divided into focused sub-pages via an
 * in-tab segmented nav (Overview / Client / Scope & Commercials / Project /
 * System). Each sub-page is one concern; the long single-scroll is gone. The
 * operational project modules (Tasks / Timesheet / Reimbursement) and Documents
 * remain their own top-level tabs.
 */
const SummarySection: React.FC<{
  lead: any;
  vm: EntityVM;
  company?: any;
  contact?: any;
  onJump: (step: number) => void;
}> = ({ lead, vm, company, contact, onJump }) => {
  const allEmployees = useSelector((s: RootState) => s.allEmployees?.list) || [];
  const isProject = !!lead?.status?.isProjectTrigger || !!lead?.project;
  const p = lead?.project || {};
  // Lead-as-master: execution-only fields now come from the lead's 1:1 execution
  // extension. Fall back to the (transitional) project row when present.
  const exec = lead?.execution || {};
  const [sub, setSub] = useState<SubKey>('overview');

  const subPages = useMemo(() => SUB_PAGES.filter(s => !s.projectOnly || isProject), [isProject]);
  const active = subPages.some(s => s.key === sub) ? sub : 'overview';

  const owner = employeeUserName(lead?.assignedTo) || employeeNameById(allEmployees, lead?.assignedToId) || DASH;
  const missing = computeMissingInfo(lead);
  const health = computeHealth(lead, missing.length);
  const probability = conversionProbability(lead, health);
  const commercials = sumLeadCommercials(lead);
  const value = commercials.totalCost;
  const totalArea = commercials.totalArea;
  const totalRate = totalArea > 0 ? (value / totalArea).toFixed(2) : 0;
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

  const Overview = (
    <div>
      <div style={{ position: 'relative', background: `linear-gradient(135deg, ${health.color}14 0%, ${C.bgCard} 58%)`, border: `1px solid ${C.border}`, borderRadius: RADIUS.xl, boxShadow: C.shadowCard, padding: '22px 26px 22px 30px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', overflow: 'visible' }}>
        <span style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 5, borderRadius: '0 4px 4px 0', background: `linear-gradient(${health.color}, ${health.color}99)` }} aria-hidden />
        <HealthGauge health={health} probability={probability} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <MissingInfoChip items={missing} onJump={onJump} />
          {isProject && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: C.successLight, color: '#16a34a', border: `1px solid ${C.success}33`, borderRadius: RADIUS.full, padding: '6px 13px', fontFamily: FONT.body, fontSize: 12, fontWeight: 700 }}>
              <i className="bi bi-kanban-fill" /> Project active
            </span>
          )}
          {lead?.isCancelled && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: C.dangerLight, color: C.danger, border: `1px solid ${C.danger}33`, borderRadius: RADIUS.full, padding: '6px 13px', fontFamily: FONT.body, fontSize: 12, fontWeight: 700 }}>
              <i className="bi bi-x-octagon-fill" /> Cancelled
            </span>
          )}
        </div>
      </div>

      <StatGrid
        items={[
          { label: 'Status', value: <DetailStatusBadge status={lead?.status?.name || DASH} color={lead?.status?.color} />, icon: 'bi bi-activity', accent: 'blue' },
          { label: 'Assigned To', value: owner, icon: 'bi bi-person-badge', accent: 'primary' },
          { label: 'Inquiry Date', value: fmtDate(lead?.inquiryDate), icon: 'bi bi-calendar-event', accent: 'teal' },
          { label: 'Total Area', value: totalArea ? `${totalArea.toLocaleString('en-IN')} SFT` : DASH, icon: 'bi bi-diagram-2', accent: 'warning' },
          { label: 'Total Rate', value: totalRate ? `₹${parseFloat(totalRate as any).toLocaleString('en-IN')}` : DASH, icon: 'bi bi-graph-up', accent: 'info' },
          { label: 'Cost', value: compactMoney(value), icon: 'bi bi-currency-rupee', accent: 'green' },
        ]}
      />

      {isProject && (
        <div className="mt-4">
          <SectionHeading icon="bi bi-kanban" title="Project Snapshot" color={ICON_COLORS.green.color} />
          <StatGrid
            items={[
              { label: 'Project Status', value: <DetailStatusBadge status={execStatus?.name || DASH} color={execStatus?.color} />, icon: 'bi bi-kanban', accent: 'blue' },
              { label: 'Project Manager', value: pmName, icon: 'bi bi-person-workspace', accent: 'primary' },
              { label: 'Progress', value: progress != null ? `${progress}%` : DASH, icon: 'bi bi-hourglass-split', accent: delayed ? 'danger' : 'warning' },
              { label: 'Start Date', value: fmtDate(execStart), icon: 'bi bi-calendar-event', accent: 'teal' },
              { label: 'Expected Closure', value: fmtDate(execEnd), icon: 'bi bi-calendar-check', accent: 'green' },
            ]}
          />
        </div>
      )}

      <div className="mt-5">
        <AddressesCard vm={vm} />
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

      <div className="mt-6">
        <SectionHeading icon="bi bi-gear" title="System & Metadata" color="#64748B" />
        <SystemSection vm={vm} />
      </div>
    </div>
  );

  const Client = (
    <CardGrid>
      {companyContactCards(company, contact, lead)}
      <ServiceScopeCard vm={vm} />
      {clientExtraCards(vm, lead?.companyId)}
    </CardGrid>
  );

  const ScopeCommercials = (
    <div>
      <SectionHeading icon="bi bi-rulers" title="Specifications" color="#7c3aed" />
      <ScopeSection vm={vm} />
      <div className="mt-6">
        <SectionHeading icon="bi bi-cash-stack" title="Commercials" color="#16a34a" />
        <CommercialsSection vm={vm} />
      </div>
    </div>
  );

  return (
    <div>
      <SubNav items={subPages} active={active} onChange={setSub} />
      {active === 'overview' && Overview}
      {active === 'client' && Client}
      {active === 'scope' && ScopeCommercials}
      {active === 'project' && isProject && <ProjectDetailSection lead={lead} />}
    </div>
  );
};

export default SummarySection;
