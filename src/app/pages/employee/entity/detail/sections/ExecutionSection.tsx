import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { DetailCard, DetailRow, DetailProfileBlock, DetailStatusBadge, DetailSummaryBar } from '@app/modules/detail-page/DetailPageComponents';
import TasksMainTable from '@pages/employee/tasks/tasks/TasksMainTable';
import TaskTimesheet from '@pages/employee/tasks/tasks/components/TaskTimesheet';
import ProjectReimbursements from '@pages/employee/projects/project/components/ProjectReimbursements';
import { EmptyState } from '../widgets';
import { employeeUserName, employeeNameById, projectManagerName, fmtDate, DASH } from '../entityViewModel';
import { getTimelineProgress } from '../../entityUtils';

type Sub = 'tasks' | 'timesheet' | 'reimbursements' | 'milestones';
const SUBS: { key: Sub; label: string; icon: string }[] = [
  { key: 'tasks', label: 'Tasks', icon: 'bi bi-check2-square' },
  { key: 'timesheet', label: 'Timesheet', icon: 'bi bi-stopwatch' },
  { key: 'reimbursements', label: 'Reimbursements', icon: 'bi bi-wallet2' },
  { key: 'milestones', label: 'Milestones', icon: 'bi bi-flag' },
];

/**
 * Execution tab (project extension only). The single home for execution: team &
 * ownership, custody, and the operational modules (Tasks / Timesheet /
 * Reimbursements) under one sub-nav. Carries NOTHING from Client / Scope /
 * Commercials / Summary.
 */
const ExecutionSection: React.FC<{ lead: any; projectId: string }> = ({ lead, projectId }) => {
  const allEmployees = useSelector((s: RootState) => s.allEmployees?.list) || [];
  const [sub, setSub] = useState<Sub>('tasks');
  const p = lead?.project || {};
  const empName = (id?: string | null) => employeeNameById(allEmployees, id);

  const pmName = projectManagerName(p, allEmployees) || DASH;
  const teamNames: string[] = [
    ...(p?.team?.name ? [p.team.name] : []),
    ...((p?.projectTeams || []).map((pt: any) => pt?.team?.name).filter(Boolean)),
  ].filter((n, i, a) => a.indexOf(n) === i);
  const handledBy: any[] = p?.handledByEntries || [];
  const progress = getTimelineProgress(p?.startDate, p?.endDate);

  return (
    <div>
      <DetailSummaryBar
        items={[
          { label: 'Project Status', value: <DetailStatusBadge status={p?.status?.name || DASH} color={p?.status?.color} />, icon: 'bi bi-kanban', accentColor: 'blue' },
          { label: 'Tasks', value: p?._count?.tasks ?? 0, icon: 'bi bi-check2-square', accentColor: 'primary' },
          { label: 'Timeline', value: progress != null ? `${progress}%` : DASH, icon: 'bi bi-hourglass-split', accentColor: 'amber' },
          { label: 'Reimbursements', value: p?._count?.reimbursements ?? 0, icon: 'bi bi-wallet2', accentColor: 'green' },
        ]}
      />

      <div className="row g-5 mb-2">
        <div className="col-12 col-xl-5">
          <DetailCard title="Ownership" subtitle="Who runs this project" icon="bi bi-person-workspace" accentColor="blue">
            <div style={{ padding: '8px 0 4px' }}>
              <DetailProfileBlock name={pmName} subtitle="Project Manager" href={p?.projectManagerId ? `/employees/${p.projectManagerId}` : undefined} accentColor="blue" />
            </div>
            <DetailRow label="Assigned (Lead)" value={empName(lead?.assignedToId) || employeeUserName(lead?.assignedTo) || DASH} />
            <DetailRow label="Teams" value={teamNames.length ? teamNames.join(', ') : DASH} />
            <DetailRow label="Stakeholder Service" value={p?.stakeholderService?.name || DASH} isLast />
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

      {/* Operational modules */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '6px 0 16px' }}>
        {SUBS.map(s => {
          const active = s.key === sub;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setSub(s.key)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: `1px solid ${active ? '#9d4141' : '#E2E8F0'}`, background: active ? '#fff' : 'transparent', color: active ? '#9d4141' : '#64748B', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: active ? 700 : 500 }}
            >
              <i className={s.icon} />
              {s.label}
            </button>
          );
        })}
      </div>

      {sub === 'tasks' && <TasksMainTable projectId={projectId} />}
      {sub === 'timesheet' && <TaskTimesheet fetchMode="project" projectId={projectId} />}
      {sub === 'reimbursements' && <ProjectReimbursements projectId={projectId} />}
      {sub === 'milestones' && (
        <EmptyState icon="bi bi-flag" title="Milestones & work progress coming soon" message="Typed milestones and deliverable tracking need a milestones table. Task progress is available under the Tasks sub-tab." hint="Use Tasks for current execution progress" />
      )}
    </div>
  );
};

export default ExecutionSection;
