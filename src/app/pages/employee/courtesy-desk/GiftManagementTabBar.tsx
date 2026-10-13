import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import { GIFT_MANAGEMENT_BASE } from './giftPaths';

const TAB_TITLES = ['Overview', 'People Groups', 'Gift Runs', 'Configure'] as const;

/** Tab highlight on list routes and nested detail routes (`/groups/*`, `/drives/*`). */
export function giftTabIndexFromPath(pathname: string): number {
  if (pathname.includes('/people-groups') || pathname.includes('/groups')) return 1;
  if (pathname.includes('/drives') || pathname.includes('/gift-runs')) return 2;
  if (pathname.includes('/configure')) return 3;
  return 0;
}

export default function GiftManagementTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = giftTabIndexFromPath(location.pathname);

  const tabItems: TabItem[] = useMemo(
    () => [
      { title: 'Overview', component: null, icon: 'bi-grid-1x2' },
      { title: 'People Groups', component: null, icon: 'bi-people' },
      { title: 'Gift Runs', component: null, icon: 'bi-gift' },
      { title: 'Configure', component: null, icon: 'bi-gear' },
    ],
    []
  );

  const onTabChange = (index: number) => {
    const title = TAB_TITLES[index];
    if (title === 'Overview') navigate(`${GIFT_MANAGEMENT_BASE}/overview`);
    else if (title === 'People Groups') navigate(`${GIFT_MANAGEMENT_BASE}/people-groups`);
    else if (title === 'Gift Runs') navigate(`${GIFT_MANAGEMENT_BASE}/drives`);
    else navigate(`${GIFT_MANAGEMENT_BASE}/configure`);
  };

  return (
    <MaterialHeaderTab
      tabItems={tabItems}
      activeTab={activeTab}
      onTabChange={onTabChange}
      hideScrollButtons
    />
  );
}
