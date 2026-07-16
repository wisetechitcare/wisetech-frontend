import { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import ReorderableGroup from '@app/modules/common/components/ReorderableGroup';
import { PageTitle } from '@metronic/layout/core';
import { fetchAllApprovalInstances, fetchPendingApprovals } from '@services/employee';
import { navbarIcon } from '@metronic/assets/sidepanelicons';
import AttendanceApprovals from './AttendanceApprovals';
import LeaveApprovals from './LeaveApprovals';
import TaskApprovals from './TaskApprovals';
import OtherApprovals from './OtherApprovals';
import ReimbursementApprovals from './ReimbursementApprovals';

type ApprovalStep = {
  delegatedFrom?: string | null;
  createdAt?: string;
  updatedAt?: string;
  instance: {
    status: string;
    createdAt: string;
    workflowType: string;
  };
};

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconPending = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconApprovedToday = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M3 9h18" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 14l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconRejectedToday = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M3 9h18" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M9.5 14.5l5 5M14.5 14.5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconSLA = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="17" r="1" fill="currentColor"/>
  </svg>
);

const IconDelegated = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── Card definitions ──────────────────────────────────────────────────────────

type KpiDef = {
  id: string;
  label: string;
  sublabel: string;
  accent: string;
  iconBg: string;
  icon: React.ReactNode;
};

const KPI_DEFS: KpiDef[] = [
  { id: 'pending',       label: 'Pending',        sublabel: 'Awaiting your action', accent: '#d97706', iconBg: '#fffbeb', icon: <IconPending /> },
  { id: 'approvedToday', label: 'Approved Today',  sublabel: 'Cleared today',        accent: '#16a34a', iconBg: '#f0fdf4', icon: <IconApprovedToday /> },
  { id: 'rejectedToday', label: 'Rejected Today',  sublabel: 'Declined today',       accent: '#dc2626', iconBg: '#fef2f2', icon: <IconRejectedToday /> },
  { id: 'slaBreaches',   label: 'SLA Breaches',   sublabel: 'Overdue 48h+',         accent: '#ea580c', iconBg: '#fff7ed', icon: <IconSLA /> },
  { id: 'delegated',     label: 'Delegated',      sublabel: 'Forwarded to you',     accent: '#7c3aed', iconBg: '#f5f3ff', icon: <IconDelegated /> },
];

const KPI_DEFS_BY_ID = new Map(KPI_DEFS.map((d) => [d.id, d]));
const DEFAULT_KPI_ORDER = KPI_DEFS.map((d) => d.id);
const SESSION_KEY = 'approvals-kpi-order';

// ── KPI card ──────────────────────────────────────────────────────────────────

function ApprovalKpiCard({ def, value }: { def: KpiDef; value: number }) {
  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        width: '100%',
        borderRadius: '16px',
        border: '1px solid #f0f0f0',
        background: '#ffffff',
        overflow: 'hidden',
        position: 'relative',
        transition: 'box-shadow 220ms ease, transform 220ms ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.05)',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.06), 0 12px 24px rgba(0,0,0,0.08)',
        },
      }}
    >
      <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: def.accent, borderRadius: '16px 0 0 16px' }} />
      <Box sx={{ p: '18px 20px 18px 24px' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', lineHeight: 1.2, mb: 0.3 }}>
              {def.label}
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: '#b0bec5', fontWeight: 500, lineHeight: 1.2 }}>
              {def.sublabel}
            </Typography>
          </Box>
          <Box sx={{ width: 40, height: 40, borderRadius: '12px', display: 'grid', placeItems: 'center', backgroundColor: def.iconBg, color: def.accent, flexShrink: 0 }}>
            {def.icon}
          </Box>
        </Stack>
        <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: def.accent, lineHeight: 1.1, letterSpacing: '-0.5px' }}>
          {value}
        </Typography>
      </Box>
    </Paper>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isToday(value?: string) {
  if (!value) return false;
  const d = new Date(value);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

// ── Main component ────────────────────────────────────────────────────────────

function Approvals() {
  const [activeTab, setActiveTab] = useState(0);
  const [pending, setPending] = useState<ApprovalStep[]>([]);
  const [completed, setCompleted] = useState<ApprovalStep[]>([]);

  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed) && parsed.length === DEFAULT_KPI_ORDER.length) return parsed;
      }
    } catch { /* ignore */ }
    return DEFAULT_KPI_ORDER;
  });

  useEffect(() => {
    fetchPendingApprovals().then((res: any) => setPending((res?.data ?? res ?? []) as ApprovalStep[])).catch(() => setPending([]));
    fetchAllApprovalInstances('completed').then((res: any) => setCompleted((res?.data ?? res ?? []) as ApprovalStep[])).catch(() => setCompleted([]));
  }, []);

  const stats = useMemo(() => {
    const approvedToday = completed.filter((s) => s.instance?.status === 'approved' && isToday(s.updatedAt || s.createdAt || s.instance?.createdAt)).length;
    const rejectedToday = completed.filter((s) => s.instance?.status === 'rejected' && isToday(s.updatedAt || s.createdAt || s.instance?.createdAt)).length;
    const slaBreaches = pending.filter((s) => {
      const created = new Date(s.instance?.createdAt || s.createdAt || '');
      if (Number.isNaN(created.getTime())) return false;
      return Date.now() - created.getTime() > 48 * 60 * 60 * 1000;
    }).length;
    const delegated = pending.filter((s) => !!s.delegatedFrom).length;
    return { pending: pending.length, approvedToday, rejectedToday, slaBreaches, delegated };
  }, [completed, pending]);

  const valueMap: Record<string, number> = {
    pending: stats.pending,
    approvedToday: stats.approvedToday,
    rejectedToday: stats.rejectedToday,
    slaBreaches: stats.slaBreaches,
    delegated: stats.delegated,
  };

  // Pending counts per tab, using the same workflow-type buckets each tab filters by.
  // Mirrors the include/exclude logic in DomainApprovalQueue so badges match the tables.
  const pendingByTab = useMemo(() => {
    const counts = { attendance: 0, leave: 0, reimbursement: 0, taskProject: 0, others: 0 };
    for (const s of pending) {
      const type = (s.instance?.workflowType || '').toLowerCase();
      if (type === 'attendance') counts.attendance++;
      else if (type === 'leave') counts.leave++;
      else if (type === 'reimbursement') counts.reimbursement++;
      else if (type === 'task' || type === 'project') counts.taskProject++;
      else counts.others++;
    }
    return counts;
  }, [pending]);

  const handleKpiReorder = (newOrder: string[]) => {
    setKpiOrder(newOrder);
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(newOrder)); } catch { /* ignore */ }
  };

  const kpiSection = (
    <ReorderableGroup
      items={kpiOrder}
      getItemId={(id) => id}
      onReorder={handleKpiReorder}
      axis="x"
      className="approvals-kpi-container"
      itemStyle={{ flex: '1 1 0', minWidth: 0, display: 'flex' }}
      renderItem={(id) => {
        const def = KPI_DEFS_BY_ID.get(id);
        if (!def) return null;
        return <ApprovalKpiCard def={def} value={valueMap[id] ?? 0} />;
      }}
    />
  );

  const tabItems: TabItem[] = [
    { title: 'Attendance',    component: <AttendanceApprovals />,        icon: 'bi-calendar-check', badge: pendingByTab.attendance },
    { title: 'Leaves',        component: <LeaveApprovals />,             icon: 'bi-calendar-x', badge: pendingByTab.leave },
    { title: 'Reimbursements',component: <ReimbursementApprovals />,     icon: 'bi-receipt', badge: pendingByTab.reimbursement },
    { title: 'Tasks/Projects',component: <TaskApprovals />,              icon: 'bi-kanban', badge: pendingByTab.taskProject },
    { title: 'Others',        component: <OtherApprovals />,             icon: 'bi-three-dots', badge: pendingByTab.others },
  ];

  return (
    <>
      <PageTitle breadcrumbs={[]}>My Team - Approvals</PageTitle>
      <MaterialHeaderTab
        tabItems={tabItems}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        aboveContent={kpiSection}
      />
    </>
  );
}

export default Approvals;
