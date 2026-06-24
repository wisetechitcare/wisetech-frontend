import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { DetailCard, DetailRow, DetailProfileBlock, DetailStatusBadge } from '@app/modules/detail-page/DetailPageComponents';
import { EmptyState } from '../widgets';
import { employeeUserName, employeeNameById, projectManagerName, fmtDate, DASH } from '../entityViewModel';
import { getTimelineProgress } from '../../entityUtils';

/**
 * Project Detail — the project extension's execution metadata (ownership,
 * timeline, purchase order, custody) surfaced inside the Summary page once the
 * lead becomes a project. The operational modules (Tasks / Timesheet /
 * Reimbursement) live in their own top-level tabs; this section is read-only
 * context. Ported from the former Execution tab's metadata cards.
 */
const ProjectDetailSection: React.FC<{ lead: any }> = ({ lead }) => {
  const allEmployees = useSelector((s: RootState) => s.allEmployees?.list) || [];
  const p = lead?.project || {};
  const empName = (id?: string | null) => employeeNameById(allEmployees, id);

  const pmName = projectManagerName(p, allEmployees) || DASH;
  const teamNames: string[] = [
    ...(p?.team?.name ? [p.team.name] : []),
    ...((p?.projectTeams || []).map((pt: any) => pt?.team?.name).filter(Boolean)),
  ].filter((n, i, a) => a.indexOf(n) === i);
  const handledBy: any[] = p?.handledByEntries || [];
  const progress = getTimelineProgress(p?.startDate, p?.endDate);

  const accessLabel = p?.projectAccess ? String(p.projectAccess) : DASH;
  const poStatus = p?.poStatus ? String(p.poStatus) : DASH;

  return (
    <div>
      <div className="row g-5 mb-2">
        <div className="col-12 col-xl-6">
          <DetailCard title="Ownership & Status" subtitle="Who runs this project" icon="bi bi-person-workspace" accentColor="blue">
            <div style={{ padding: '8px 0 4px' }}>
              <DetailProfileBlock name={pmName} subtitle="Project Manager" href={p?.projectManagerId ? `/employees/${p.projectManagerId}` : undefined} accentColor="blue" />
            </div>
            <DetailRow label="Assigned (Lead)" value={empName(lead?.assignedToId) || employeeUserName(lead?.assignedTo) || DASH} />
            <DetailRow label="Teams" value={teamNames.length ? teamNames.join(', ') : DASH} />
            <DetailRow label="Stakeholder Service" value={p?.stakeholderService?.name || DASH} />
            <DetailRow label="Visibility" value={accessLabel} />
            <DetailRow label="Live" value={<DetailStatusBadge status={p?.isLive ? 'Live' : 'Not live'} color={p?.isLive ? '#16a34a' : '#94A3B8'} />} />
            <DetailRow label="Status" value={<DetailStatusBadge status={p?.isProjectOpen === false ? 'Closed' : 'Open'} color={p?.isProjectOpen === false ? '#f1416c' : '#16a34a'} />} isLast />
          </DetailCard>
        </div>
        <div className="col-12 col-xl-6">
          <DetailCard title="Timeline" subtitle="Schedule & progress" icon="bi bi-calendar-range" accentColor="amber">
            <DetailRow label="Start Date" value={fmtDate(p?.startDate)} />
            <DetailRow label="Expected Completion" value={fmtDate(p?.endDate)} />
            <DetailRow label="Received / PO Date" value={fmtDate(p?.receivedDate)} />
            <div style={{ padding: '12px 0 4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>
                <span>Progress</span>
                <span style={{ color: '#1E293B' }}>{progress != null ? `${progress}%` : DASH}</span>
              </div>
              <div style={{ height: 8, background: '#EEF2F6', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${progress != null ? Math.min(100, Math.max(0, progress)) : 0}%`, height: '100%', background: 'linear-gradient(90deg,#f5a623,#f59e0b)', borderRadius: 999, transition: 'width .4s ease' }} />
              </div>
            </div>
          </DetailCard>
        </div>
      </div>

      <div className="row g-5 mb-2">
        <div className="col-12 col-xl-5">
          <DetailCard title="Purchase Order" subtitle="PO tracking" icon="bi bi-receipt" accentColor="green">
            <DetailRow label="PO Status" value={poStatus === DASH ? DASH : <DetailStatusBadge status={poStatus} />} />
            <DetailRow label="PO Number" value={p?.poNumber || DASH} />
            <DetailRow label="PO Date" value={fmtDate(p?.poDate)} isLast />
          </DetailCard>
        </div>
        <div className="col-12 col-xl-7">
          <DetailCard title="Handled By" subtitle="Custody timeline" icon="bi bi-people" accentColor="primary">
            {handledBy.length === 0 ? (
              <EmptyState icon="bi bi-people" title="No custody records" message="No handled-by entries have been logged for this project." />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter' }}>
                  <thead>
                    <tr style={{ textAlign: 'left' }}>
                      {['Employee', 'Date In', 'Date Out'].map(h => (
                        <th key={h} style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, padding: '10px 12px', borderBottom: '1px solid #EEF2F6' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {handledBy.map((e, i) => (
                      <tr key={e.id || i}>
                        <td style={{ padding: '11px 12px', borderBottom: '1px solid #F4F6F9', fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{empName(e.employeeId) || e.employeeId || DASH}</td>
                        <td style={{ padding: '11px 12px', borderBottom: '1px solid #F4F6F9', fontSize: 13, color: '#475569' }}>{fmtDate(e.handledDate)}</td>
                        <td style={{ padding: '11px 12px', borderBottom: '1px solid #F4F6F9', fontSize: 13, color: '#475569' }}>{e.handledOutDate ? fmtDate(e.handledOutDate) : DASH}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailCard>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailSection;
