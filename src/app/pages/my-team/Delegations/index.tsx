import { PageTitle } from '@metronic/layout/core';
import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import { navbarIcon } from '@metronic/assets/sidepanelicons';
import DelegationsTable from './DelegationsTable';
import { useTabRoute } from '@app/hooks/useTabRoute';

function Delegations() {
  const tabItems: TabItem[] = [
    {
      title: 'My Delegations',
      component: <DelegationsTable mode='my' />,
      icon: 'bi-arrow-left-right',
    },
    {
      title: 'Delegated to Me',
      component: <DelegationsTable mode='toMe' />,
      icon: 'bi-person-check',
    },
  ];

  // The tab is the URL, so it survives a refresh, a shared link, and the remount the
  // header does at the mobile breakpoint.
  const { activeTab, setActiveTab } = useTabRoute(undefined, tabItems.map((t) => t.title));

  return (
    <>
      <PageTitle breadcrumbs={[]}>My Team - Delegations</PageTitle>
      <MaterialHeaderTab tabItems={tabItems} activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );
}

export default Delegations;
