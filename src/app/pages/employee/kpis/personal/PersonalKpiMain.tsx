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


function PersonalKpiMain() {
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState(0);
  const isAdmin = useSelector(
    (state: RootState) => state.auth.currentUser.isAdmin
  );


  const tabItems: TabItem[] = [
    {
      title: "My KPI",
      component: <MyKpi />,
       icon: activeTab === 0 ? kpiIcons.myKpiIcon.active : kpiIcons.myKpiIcon.default,
    },
    {
      title: "Leaderboard",
      component: <KpiLeaderboard />,
       icon: activeTab === 1 ? kpiIcons.kpiLeaderboardIcon.active : kpiIcons.kpiLeaderboardIcon.default,
    }
    //   {
    //     title: "Rules And FAQs",
    //     component: <EmployeeLoanInformation />,
    //     icon: activeTab === 2 ? reimbursementsIcons.employeesReimbursements.active : reimbursementsIcons.employeesReimbursements.default,
    //   }
  ];

  const tabItems2: TabItem[] = [
    {
      title: "My KPI",
      component: <MyKpi />,
      icon: activeTab === 0 ? kpiIcons.myKpiIcon.active : kpiIcons.myKpiIcon.default,
    },
    {
      title: "Search Employees",
      component: <SearchEmployee />,
      icon: activeTab === 1 ? kpiIcons.searchEmployeeIcon.active : kpiIcons.searchEmployeeIcon.default,
    },
    {
      title: "Leaderboard",
      component: <KpiLeaderboard />,
      icon: activeTab === 2 ? kpiIcons.kpiLeaderboardIcon.active : kpiIcons.kpiLeaderboardIcon.default,
    },
    {
      title: "Configure",
      component: <KPISettings />,
      icon: activeTab === 3 ? leadsIcons.leadsConfigIcon.active
                            : leadsIcons.leadsConfigIcon.default,
    }
    //   {
    //     title: "Rules And FAQs",
    //     component: <EmployeeLoanInformation />,
    //     icon: activeTab === 2 ? reimbursementsIcons.employeesReimbursements.active : reimbursementsIcons.employeesReimbursements.default,
    //   }
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
      {isAdmin && <MaterialHeaderTab tabItems={tabItems2} onTabChange={setActiveTab} />}
      {!isAdmin && <MaterialHeaderTab tabItems={tabItems} onTabChange={setActiveTab} />}
    </>
  );
}

export default PersonalKpiMain