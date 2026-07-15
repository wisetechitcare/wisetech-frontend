import { useState } from 'react';
import { PageTitle } from '@metronic/layout/core';
import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import { navbarIcon } from '@metronic/assets/sidepanelicons';
import DelegationsTable from './DelegationsTable';

function Delegations() {
  const [activeTab, setActiveTab] = useState(0);
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

  return (
    <>
      <PageTitle breadcrumbs={[]}>My Team - Delegations</PageTitle>
      <MaterialHeaderTab tabItems={tabItems} activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );
}

export default Delegations;
