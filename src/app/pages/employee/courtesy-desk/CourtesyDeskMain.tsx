import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import { PageTitle } from '@metronic/layout/core';
import Overview from './components/Overview';
import PeopleGroupsList from './components/PeopleGroupsList';
import DrivesList from './components/DrivesList';
import Configure from './components/Configure';

const TAB_TITLES = ['Overview', 'People Groups', 'Gift Runs', 'Configure'] as const;

function tabIndexFromPath(pathname: string): number {
  if (pathname.includes('/people-groups')) return 1;
  if (pathname.includes('/drives') || pathname.includes('/gift-runs')) return 2;
  if (pathname.includes('/configure')) return 3;
  return 0;
}

export default function CourtesyDeskMain() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = tabIndexFromPath(location.pathname);

  const tabItems: TabItem[] = useMemo(
    () => [
      { title: 'Overview', component: <Overview />, icon: 'bi-grid-1x2' },
      { title: 'People Groups', component: <PeopleGroupsList />, icon: 'bi-people' },
      { title: 'Gift Runs', component: <DrivesList />, icon: 'bi-gift' },
      { title: 'Configure', component: <Configure />, icon: 'bi-gear' },
    ],
    []
  );

  const onTabChange = (index: number) => {
    const title = TAB_TITLES[index];
    if (title === 'Overview') navigate('/courtesy-desk/overview');
    else if (title === 'People Groups') navigate('/courtesy-desk/people-groups');
    else if (title === 'Gift Runs') navigate('/courtesy-desk/drives');
    else navigate('/courtesy-desk/configure');
  };

  const breadcrumbs = [
    { title: 'Home', path: '/dashboard', isSeparator: false, isActive: false },
    { title: '', path: '', isSeparator: true, isActive: false },
    { title: 'CRM', path: '/workspace/crm', isSeparator: false, isActive: false },
    { title: '', path: '', isSeparator: true, isActive: false },
    { title: 'Courtesy Desk', path: '/courtesy-desk', isSeparator: false, isActive: true },
  ];

  return (
    <>
      <PageTitle breadcrumbs={breadcrumbs}>Courtesy Desk</PageTitle>
      <MaterialHeaderTab
        tabItems={tabItems}
        activeTab={activeTab}
        onTabChange={onTabChange}
        hideScrollButtons
      />
    </>
  );
}
