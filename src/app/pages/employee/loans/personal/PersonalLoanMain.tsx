import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import { leadsIcons, reimbursementsIcons } from '@metronic/assets/sidepanelicons';
import { PageLink, PageTitle } from '@metronic/layout/core';
import React, { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux';
import PersonalLoan from './views/PersonalLoan';
import Installments from './views/Installments';
import Information from './Information';
import Overview from '../admin/views/Overview';
import InstallmentsAdmin from '../admin/views/Installments';
import SearchEmployee from '../admin/views/SearchEmployee';
import EmployeeLoanInformation from './EmployeeLoanInformation';
import { loanIcons } from '@metronic/assets/sidepanelicons';
import { resourceNameMapWithCamelCase } from '@constants/statistics';
import { canViewFinanceTab } from '@utils/financeTabs';

function PersonalLoanMain() {
    const dispatch = useDispatch();

    const [activeTab, setActiveTab] = useState(0);

    // Tabs gated on the finance tab catalog (finance.loans.*), so they respond to
    // role grants AND per-employee overrides from Employee Access.
    const tabItemsAdmin: TabItem[] = [
      ...(canViewFinanceTab('loans.my') ? [{
        title: "Personal Loans",
        component: <PersonalLoan resource={resourceNameMapWithCamelCase.loan} viewOthers={true} viewOwn={true} />,
        icon: 'bi-cash-coin',
      }] : []),
      ...(canViewFinanceTab('loans.my') ? [{
        title: "Personal Installments",
        component: <Installments />,
        icon: 'bi-calendar-week',
      }]:[]),
      ...(canViewFinanceTab('loans.overview') ? [{
        title: "Overview",
        component: <Overview />,
        icon: 'bi-grid-1x2',
      }]:[]),
      ...(canViewFinanceTab('loans.installments') ? [{
        title: "Installments",
        component: <InstallmentsAdmin />,
        icon: 'bi-calendar-week',
      }]:[]),
      ...(canViewFinanceTab('loans.search') ? [{
        title: "Search Employees",
        component: <SearchEmployee />,
        icon: 'bi-search',
      }]:[]),
      ...(canViewFinanceTab('loans.configure') ? [{
        title: "Configure",
        component: <Information />,
        icon: 'bi-gear',
      }]:[]),
    ];
  
    const LoanBreadcrumb: Array<PageLink> = [
      {
        title: "Home",
        path: "/finance/loans",
        isSeparator: false,
        isActive: false,
      },
      {
        title: "Finance",
        path: "",
        isSeparator: true,
        isActive: false,
      },
    ];
  
    return (
      <>
        <PageTitle breadcrumbs={LoanBreadcrumb}>
          Loans
        </PageTitle>
        <MaterialHeaderTab tabItems={tabItemsAdmin} onTabChange={setActiveTab}/>
        {/* {!isAdmin && <MaterialHeaderTab tabItems={tabItems} onTabChange={setActiveTab}/>} */}
        {/* {isAdmin && } */}
      </>
    );
}

export default PersonalLoanMain