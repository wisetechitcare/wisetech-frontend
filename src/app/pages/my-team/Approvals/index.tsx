import { useEffect, useMemo, useState } from 'react';
import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import { PageTitle } from '@metronic/layout/core';
import { fetchAllApprovalInstances, fetchPendingApprovals } from '@services/employee';
import { navbarIcon } from '@metronic/assets/sidepanelicons';
import AttendanceApprovals from './AttendanceApprovals';
import LeaveApprovals from './LeaveApprovals';
import ConveyanceApprovals from './ConveyanceApprovals';
import TaskApprovals from './TaskApprovals';
import OtherApprovals from './OtherApprovals';

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

function StatCard({ title, count, bubbleColor }: { title: string; count: number; bubbleColor: string }) {
  return (
    <div className='col-12 col-sm-6 col-xl'>
      <div className='card h-100 border-0 shadow-sm' style={{ borderRadius: '1rem' }}>
        <div className='card-body d-flex align-items-center gap-3 py-4 px-4'>
          <span style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: bubbleColor, display: 'inline-block' }} />
          <div>
            <div className='fw-bold fs-4'>{count}</div>
            <div className='text-muted fw-semibold fs-8'>{title}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function isToday(value?: string) {
  if (!value) return false;
  const d = new Date(value);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function Approvals() {
  const [activeTab, setActiveTab] = useState(0);
  const [pending, setPending] = useState<ApprovalStep[]>([]);
  const [completed, setCompleted] = useState<ApprovalStep[]>([]);

  useEffect(() => {
    fetchPendingApprovals().then((res: any) => setPending((res?.data ?? res ?? []) as ApprovalStep[])).catch(() => setPending([]));
    fetchAllApprovalInstances('completed').then((res: any) => setCompleted((res?.data ?? res ?? []) as ApprovalStep[])).catch(() => setCompleted([]));
  }, []);

  const stats = useMemo(() => {
    const approvedToday = completed.filter((step) => step.instance?.status === 'approved' && isToday(step.updatedAt || step.createdAt || step.instance?.createdAt)).length;
    const rejectedToday = completed.filter((step) => step.instance?.status === 'rejected' && isToday(step.updatedAt || step.createdAt || step.instance?.createdAt)).length;
    const slaBreaches = pending.filter((step) => {
      const created = new Date(step.instance?.createdAt || step.createdAt || '');
      if (Number.isNaN(created.getTime())) return false;
      return Date.now() - created.getTime() > 48 * 60 * 60 * 1000;
    }).length;
    const delegated = pending.filter((step) => !!step.delegatedFrom).length;
    return { pending: pending.length, approvedToday, rejectedToday, slaBreaches, delegated };
  }, [completed, pending]);

  const tabItems: TabItem[] = [
    { title: 'Attendance', component: <AttendanceApprovals />, icon: activeTab === 0 ? navbarIcon.overview.active : navbarIcon.overview.default },
    { title: 'Leaves', component: <LeaveApprovals />, icon: activeTab === 1 ? navbarIcon.individualIcon.active : navbarIcon.individualIcon.default },
    { title: 'Conveyance', component: <ConveyanceApprovals />, icon: activeTab === 2 ? navbarIcon.overview.active : navbarIcon.overview.default },
    { title: 'Tasks/Projects', component: <TaskApprovals />, icon: activeTab === 3 ? navbarIcon.individualIcon.active : navbarIcon.individualIcon.default },
    { title: 'Others', component: <OtherApprovals />, icon: activeTab === 4 ? navbarIcon.overview.active : navbarIcon.overview.default },
  ];

  return (
    <>
      <PageTitle breadcrumbs={[]}>My Team - Approvals</PageTitle>
      <div className='row g-4 mb-6 px-lg-9 px-5'>
        <StatCard title='Pending' count={stats.pending} bubbleColor='#FEF2E2' />
        <StatCard title='Approved Today' count={stats.approvedToday} bubbleColor='#E8F8EF' />
        <StatCard title='Rejected Today' count={stats.rejectedToday} bubbleColor='#FDECEC' />
        <StatCard title='SLA Breaches' count={stats.slaBreaches} bubbleColor='#FFF4DE' />
        <StatCard title='Delegated' count={stats.delegated} bubbleColor='#EEF3FF' />
      </div>
      <MaterialHeaderTab tabItems={tabItems} activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );
}

export default Approvals;
