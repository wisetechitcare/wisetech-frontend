import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import { PageLink, PageTitle } from '@metronic/layout/core';
import { RootState } from '@redux/store';
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import MyKpi from "./views/MyKpiView"
import KPISettings from '@pages/employee/loans/admin/views/KPISettings';
import SearchEmployee from './views/SearchEmployee';
import KpiLeaderboard from '../KpiLeaderboard';
import { kpiIcons, leadsIcons } from '@metronic/assets/sidepanelicons';
import { canDo } from '@utils/can';


function PersonalKpiMain() {
  const dispatch = useDispatch();

  const [, setActiveTab] = useState(0);
  // Re-render when capabilities/blocked sections change so tabs reflect access.
  useSelector((state: RootState) => (state as any).authz?.capabilities);
  useSelector((state: RootState) => (state as any).authz?.blockedSections);

  // KPI is a single module (Access editor grants Read/Write for "KPI" as a
  // whole, not per-tab). My KPI and Leaderboard are the read-level content;
  // Search Employees and Configure are write-only, same convention as Tasks/
  // Leads Configure and Organization's write-only sub-items.
  const canWrite = canDo("kpi", "update");

  const visibleTabs: TabItem[] = [
    { title: "My KPI", component: <MyKpi />, icon: kpiIcons.myKpiIcon.default },
    { title: "Leaderboard", component: <KpiLeaderboard />, icon: kpiIcons.kpiLeaderboardIcon.default },
    ...(canWrite
      ? [
          { title: "Search Employees", component: <SearchEmployee />, icon: kpiIcons.searchEmployeeIcon.default },
          { title: "Configure", component: <KPISettings />, icon: leadsIcons.leadsConfigIcon.default },
        ]
      : []),
  ];


  const LoanBreadcrumb: Array<PageLink> = [
    {
      title: "Report",
      path: "/MyKpi",
      isSeparator: false,
      isActive: false,

    },
    {
      title: "Report",
      path: "",
      isSeparator: true,
      isActive: false,
    },
  ];

  return (
    <>
      <PageTitle breadcrumbs={LoanBreadcrumb}>
        Kpi
      </PageTitle>
      <MaterialHeaderTab tabItems={visibleTabs} onTabChange={setActiveTab} />
    </>
  );
}

export default PersonalKpiMain