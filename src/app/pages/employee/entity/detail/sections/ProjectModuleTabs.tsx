import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { DetailSummaryBar } from '@app/modules/detail-page/DetailPageComponents';
import TasksMainTable from '@pages/employee/tasks/tasks/TasksMainTable';
import TaskTimesheet from '@pages/employee/tasks/tasks/components/TaskTimesheet';
import ProjectReimbursements from '@pages/employee/projects/project/components/ProjectReimbursements';
import { projectManagerName, fmtDate, DASH } from '../entityViewModel';
import { getTimelineProgress } from '../../entityUtils';

/**
 * Project operational modules promoted to their own top-level tabs. Each is a
 * thin wrapper around the existing, proven project-scoped component (the same
 * ones the old Execution sub-nav embedded) plus a context summary bar so the
 * tab matches the rest of the detail-page design.
 */

const TabShell: React.FC<{ items: any[]; children: React.ReactNode }> = ({ items, children }) => (
  <div>
    <DetailSummaryBar items={items} />
    <div className="mt-2">{children}</div>
  </div>
);

export const TasksTab: React.FC<{ lead: any; projectId: string }> = ({ lead, projectId }) => {
  const allEmployees = useSelector((s: RootState) => s.allEmployees?.list) || [];
  const p = lead?.project || {};
  const progress = getTimelineProgress(p?.startDate, p?.endDate);
  return (
    <TabShell
      items={[
        { label: 'Tasks', value: p?._count?.tasks ?? 0, icon: 'bi bi-check2-square', accentColor: 'primary' },
        { label: 'Project Manager', value: projectManagerName(p, allEmployees) || DASH, icon: 'bi bi-person-workspace', accentColor: 'blue' },
        { label: 'Timeline', value: progress != null ? `${progress}%` : DASH, icon: 'bi bi-hourglass-split', accentColor: 'amber' },
        { label: 'Due', value: fmtDate(p?.endDate), icon: 'bi bi-calendar-check', accentColor: 'green' },
      ]}
    >
      <TasksMainTable projectId={projectId} />
    </TabShell>
  );
};

export const TimesheetTab: React.FC<{ lead: any; projectId: string }> = ({ lead, projectId }) => {
  const p = lead?.project || {};
  return (
    <TabShell
      items={[
        { label: 'Time Entries', value: p?._count?.timesheets ?? 0, icon: 'bi bi-stopwatch', accentColor: 'primary' },
        { label: 'Tasks', value: p?._count?.tasks ?? 0, icon: 'bi bi-check2-square', accentColor: 'blue' },
        { label: 'Start', value: fmtDate(p?.startDate), icon: 'bi bi-calendar-event', accentColor: 'teal' },
        { label: 'End', value: fmtDate(p?.endDate), icon: 'bi bi-calendar-check', accentColor: 'green' },
      ]}
    >
      <TaskTimesheet fetchMode="project" projectId={projectId} />
    </TabShell>
  );
};

export const ReimbursementTab: React.FC<{ lead: any; projectId: string }> = ({ lead, projectId }) => {
  const p = lead?.project || {};
  return (
    <TabShell
      items={[
        { label: 'Reimbursements', value: p?._count?.reimbursements ?? 0, icon: 'bi bi-wallet2', accentColor: 'green' },
        { label: 'Project', value: p?.prefix || DASH, icon: 'bi bi-kanban', accentColor: 'blue' },
      ]}
    >
      <ProjectReimbursements projectId={projectId} />
    </TabShell>
  );
};
