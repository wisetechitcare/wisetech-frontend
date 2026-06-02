import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { TeamFilterProvider } from '@/contexts/TeamFilterContext';
import { fetchMyApprovees } from '@services/employee';
import { fetchRolesAndPermissions } from '@redux/slices/rolesAndPermissions';
import { loadAllEmployeesIfNeeded } from '@redux/slices/allEmployees';
import { AppDispatch } from '@redux/store';
import { usePermission } from '@hooks/usePermission';
import { KTIcon } from '@metronic/helpers';
import { PageTitle } from '@metronic/layout/core';
import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import OverviewView from '@pages/employee/attendance/admin/OverviewView';
import IndividualView from '@pages/employee/attendance/admin/IndividualView';
import { navbarIcon } from '@metronic/assets/sidepanelicons';

function MyTeam() {
  const canView = usePermission('approvals.view.team');
  const dispatch = useDispatch<AppDispatch>();
  const [approveeIds, setApproveeIds] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (!canView) return;
    dispatch(fetchRolesAndPermissions() as any);
    dispatch(loadAllEmployeesIfNeeded());
  }, [canView, dispatch]);

  useEffect(() => {
    if (!canView) return;
    setLoading(true);
    fetchMyApprovees()
      .then((res) => {
        const list: any[] = res?.data ?? res ?? [];
        setApproveeIds(list.map((a: any) => a.id));
      })
      .catch(() => setApproveeIds([]))
      .finally(() => setLoading(false));
  }, [canView]);

  if (!canView) {
    return (
      <div className='card'>
        <div className='card-body d-flex flex-column align-items-center justify-content-center py-20'>
          <KTIcon iconName='lock' className='fs-3x text-muted mb-4' />
          <span className='text-muted fs-6'>You do not have permission to view this page.</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className='d-flex justify-content-center py-20'>
        <span className='spinner-border text-primary' />
      </div>
    );
  }

  if (approveeIds && approveeIds.length === 0) {
    return (
      <div className='card'>
        <div className='card-body d-flex flex-column align-items-center justify-content-center py-20'>
          <KTIcon iconName='people' className='fs-3x text-muted mb-4' />
          <div className='fw-bold fs-5 mb-2'>No team members found</div>
          <div className='text-muted fs-7'>You are not configured as an approver for any employees yet.</div>
        </div>
      </div>
    );
  }

  const tabItems: TabItem[] = [
    {
      title: 'Overview',
      component: <OverviewView />,
      icon: activeTab === 0 ? navbarIcon.overview.active : navbarIcon.overview.default,
    },
    {
      title: 'Individual',
      component: <IndividualView />,
      icon: activeTab === 1 ? navbarIcon.individualIcon.active : navbarIcon.individualIcon.default,
    },
  ];

  return (
    <TeamFilterProvider value={{ filterIds: approveeIds }}>
      <PageTitle breadcrumbs={[]}>My Team</PageTitle>
      <MaterialHeaderTab tabItems={tabItems} activeTab={activeTab} onTabChange={setActiveTab} />
    </TeamFilterProvider>
  );
}

export default MyTeam;
