import React from 'react';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { DetailCard, DetailStatusBadge } from '@app/modules/detail-page/DetailPageComponents';
import { HealthGauge, MissingInfoChip } from '../widgets';
import SystemSection from './SystemSection';
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

const TYPE_META: Record<string, { icon: string; color: string }> = {
  call: { icon: 'bi bi-telephone-fill', color: '#3b82f6' },
  meeting: { icon: 'bi bi-people-fill', color: '#7c3aed' },
  email: { icon: 'bi bi-envelope-fill', color: '#0d9488' },
  whatsapp: { icon: 'bi bi-whatsapp', color: '#16a34a' },
  note: { icon: 'bi bi-journal-text', color: '#f5a623' },
  visit: { icon: 'bi bi-geo-alt-fill', color: '#9d4141' },
};
const metaFor = (t?: string) => TYPE_META[(t || '').toLowerCase()] || { icon: 'bi bi-dot', color: '#64748B' };

interface Stat {
  label: string;
  value: React.ReactNode;
  icon: string;
  color: string;
}

/** Compact metrics strip — dense inline stats with dividers (no big tiles/whitespace). */
const StatBar: React.FC<{ items: Stat[] }> = ({ items }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
    {items.map((it, i) => (
      <div key={i} style={{ flex: '1 1 150px', minWidth: 140, padding: '9px 16px', borderRight: i === items.length - 1 ? 'none' : '1px solid #EEF2F6' }}>
        <div style={{ fontFamily: 'Inter', fontSize: 10.5, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className={it.icon} style={{ fontSize: 12, color: it.color }} /> {it.label}
        </div>
        <div style={{ fontFamily: 'Barlow', fontSize: 15, fontWeight: 700, color: '#1E293B', lineHeight: 1.15 }}>{it.value}</div>
      </div>
    ))}
  </div>
);

/**
 * Summary — highlights panel. Health + KPI tiles (the one summary home for those
 * metrics) + content that exists NOWHERE else: the entity's Description/Notes and
 * a Recent-Activity preview. No snapshot cards re-printing header/System/Client.
 */
const SummarySection: React.FC<{ lead: any; vm: EntityVM; onJump: (step: number) => void }> = ({ lead, vm, onJump }) => {
  const allEmployees = useSelector((s: RootState) => s.allEmployees?.list) || [];
  const isProject = !!lead?.status?.isProjectTrigger || !!lead?.project;
  const p = lead?.project || {};

  const owner = employeeUserName(lead?.assignedTo) || employeeNameById(allEmployees, lead?.assignedToId) || DASH;
  const missing = computeMissingInfo(lead);
  const health = computeHealth(lead, missing.length);
  const probability = conversionProbability(lead, health);
  const value = sumLeadCommercials(lead).totalCost;
  const progress = getTimelineProgress(p?.startDate, p?.endDate);
  const delayed = isDelayedProject(lead);
  const pmName = projectManagerName(p, allEmployees) || DASH;

  // Recent activity preview (top 3) — unique to Summary as a digest of the Activities tab.
  const recent = [
    ...(lead?.connections || []),
    ...(p?.connections || []),
  ]
    .map((c: any) => ({
      ts: new Date(c?.date || c?.createdAt).getTime(),
      ...metaFor(c?.type),
      title: c?.type ? c.type.charAt(0).toUpperCase() + c.type.slice(1) : 'Activity',
      body: c?.description || c?.notes,
      who: employeeNameById(allEmployees, c?.createdBy),
    }))
    .concat(
      (lead?.generatedProposals || []).map((d: any) => ({
        ts: new Date(d?.createdAt).getTime(),
        icon: 'bi bi-file-earmark-text-fill',
        color: '#7c3aed',
        title: 'Proposal generated',
        body: d?.template?.templateName,
        who: employeeUserName(d?.creator),
      })),
    )
    .concat(
      lead?.createdAt
        ? [{ ts: new Date(lead.createdAt).getTime(), icon: 'bi bi-plus-circle-fill', color: '#16a34a', title: 'Lead created', body: undefined, who: employeeUserName(lead?.createdBy) }]
        : [],
    )
    .filter(x => isFinite(x.ts))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 4);

  return (
    <div>
      {/* Health band */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', padding: '18px 22px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <HealthGauge health={health} probability={probability} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <MissingInfoChip items={missing} onJump={onJump} />
          {isProject && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EDFDF3', color: '#0A5C2A', border: '1px solid #17C96433', borderRadius: 999, padding: '5px 12px', fontFamily: 'Inter', fontSize: 12, fontWeight: 700 }}>
              <i className="bi bi-kanban-fill" /> Project active
            </span>
          )}
          {lead?.isCancelled && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFF1F3', color: '#9B1C44', border: '1px solid #F1416C33', borderRadius: 999, padding: '5px 12px', fontFamily: 'Inter', fontSize: 12, fontWeight: 700 }}>
              <i className="bi bi-x-octagon-fill" /> Cancelled
            </span>
          )}
        </div>
      </div>

      {/* Lead KPI strip — compact */}
      <StatBar
        items={[
          { label: 'Status', value: <DetailStatusBadge status={lead?.status?.name || DASH} color={lead?.status?.color} />, icon: 'bi bi-activity', color: '#3b82f6' },
          { label: 'Owner', value: owner, icon: 'bi bi-person-badge', color: '#9d4141' },
          { label: 'Inquiry Date', value: fmtDate(lead?.inquiryDate), icon: 'bi bi-calendar-event', color: '#0d9488' },
          { label: 'Value', value: compactMoney(value), icon: 'bi bi-currency-rupee', color: '#16a34a' },
          { label: 'Activities', value: (lead?.connections?.length || 0) + (p?.connections?.length || 0), icon: 'bi bi-chat-dots', color: '#7c3aed' },
        ]}
      />

      {/* Project KPI strip — only when the lead became a project */}
      {isProject && (
        <div className="mt-3">
          <div style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, letterSpacing: 0.7, textTransform: 'uppercase', color: '#0A5C2A', margin: '0 2px 8px' }}>Project Execution</div>
          <StatBar
            items={[
              { label: 'Project Status', value: <DetailStatusBadge status={p?.status?.name || DASH} color={p?.status?.color} />, icon: 'bi bi-kanban', color: '#3b82f6' },
              { label: 'Project Manager', value: pmName, icon: 'bi bi-person-workspace', color: '#9d4141' },
              { label: 'Progress', value: progress != null ? `${progress}%` : DASH, icon: 'bi bi-hourglass-split', color: delayed ? '#f1416c' : '#f5a623' },
              { label: 'Start Date', value: fmtDate(p?.startDate), icon: 'bi bi-calendar-event', color: '#0d9488' },
              { label: 'Expected Closure', value: fmtDate(p?.endDate), icon: 'bi bi-calendar-check', color: '#16a34a' },
            ]}
          />
        </div>
      )}

      {/* System & metadata — surfaced on Summary, above Recent Activity */}
      <div className="mt-6">
        <div style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, letterSpacing: 0.7, textTransform: 'uppercase', color: '#94A3B8', margin: '4px 2px 10px' }}>
          System &amp; Metadata
        </div>
        <SystemSection vm={vm} />
      </div>

      {/* Recent activity preview — digest of the Activities tab (bottom of Summary) */}
      <div className="row g-5 mt-5">
        <div className="col-12">
          <DetailCard title="Recent Activity" subtitle="Latest events" icon="bi bi-clock-history" accentColor="purple">
            {recent.length === 0 ? (
              <div style={{ padding: '14px 0', fontFamily: 'Inter', fontSize: 13, color: '#94A3B8' }}>
                No activity logged yet. Calls, meetings and notes will appear here.
              </div>
            ) : (
              <div style={{ padding: '6px 0' }}>
                {recent.map((it, i) => (
                  <div key={i} style={{ display: 'flex', gap: 11, paddingBottom: i === recent.length - 1 ? 0 : 14 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${it.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={it.icon} style={{ color: it.color, fontSize: 13 }} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{it.title}</div>
                      {it.body && <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.body}</div>}
                      <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#94A3B8' }}>{dayjs(it.ts).format('DD MMM YYYY')}{it.who ? ` · ${it.who}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DetailCard>
        </div>
      </div>
    </div>
  );
};

export default SummarySection;
