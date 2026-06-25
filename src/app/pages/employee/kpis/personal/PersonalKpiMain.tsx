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
import { isSubsectionVisible } from '@utils/accessAreas';


function PersonalKpiMain() {
  const dispatch = useDispatch();

  const [, setActiveTab] = useState(0);
  const isAdmin = useSelector(
    (state: RootState) => state.auth.currentUser.isAdmin
  );
  // Re-render when capabilities/blocked sections change so tabs reflect access.
  useSelector((state: RootState) => (state as any).authz?.capabilities);
  useSelector((state: RootState) => (state as any).authz?.blockedSections);

  // Each tab is gated by its own sub-section key. A tab shows when it's allowed
  // by default (baseAllowed) AND not explicitly blocked — and an admin can also
  // grant a normally-hidden tab to a specific employee via View/Edit.
  const allTabs: Array<{ key: string; baseAllowed: boolean; item: TabItem }> = [
    { key: "kpi.my", baseAllowed: true, item: { title: "My KPI", component: <MyKpi />, icon: kpiIcons.myKpiIcon.default } },
    { key: "kpi.search", baseAllowed: isAdmin, item: { title: "Search Employees", component: <SearchEmployee />, icon: kpiIcons.searchEmployeeIcon.default } },
    { key: "kpi.leaderboard", baseAllowed: true, item: { title: "Leaderboard", component: <KpiLeaderboard />, icon: kpiIcons.kpiLeaderboardIcon.default } },
    { key: "kpi.configure", baseAllowed: isAdmin, item: { title: "Configure", component: <KPISettings />, icon: leadsIcons.leadsConfigIcon.default } },
  ];

  const visibleTabs: TabItem[] = allTabs
    .filter((t) => isSubsectionVisible(t.key, t.baseAllowed))
    .map((t) => t.item);



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