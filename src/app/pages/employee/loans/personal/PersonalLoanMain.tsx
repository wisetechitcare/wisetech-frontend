import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import { leadsIcons, reimbursementsIcons } from '@metronic/assets/sidepanelicons';
import { PageLink, PageTitle } from '@metronic/layout/core';
import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux';
import PersonalLoan from './views/PersonalLoan';
import Installments from './views/Installments';
import Information from './Information';
import Overview from '../admin/views/Overview';
import InstallmentsAdmin from '../admin/views/Installments';
import SearchEmployee from '../admin/views/SearchEmployee';
import EmployeeLoanInformation from './EmployeeLoanInformation';
import { loanIcons } from '@metronic/assets/sidepanelicons';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import { hasPermission } from '@utils/authAbac';
import { useTabRoute } from '@app/hooks/useTabRoute';

function PersonalLoanMain() {
    const dispatch = useDispatch();

    const viewOwnPermissionLoan = hasPermission(resourceNameMapWithCamelCase.loan, permissionConstToUseWithHasPermission.readOwn)
    const viewOthersPermissionLoan = hasPermission(resourceNameMapWithCamelCase.loan, permissionConstToUseWithHasPermission.readOthers)
    const viewOwnPermissionLoanInstallment = hasPermission(resourceNameMapWithCamelCase.loanInstallment, permissionConstToUseWithHasPermission.readOwn)
    const viewOthersPermissionLoanInstallment = hasPermission(resourceNameMapWithCamelCase.loanInstallment, permissionConstToUseWithHasPermission.readOthers)
  
    const tabItems: TabItem[] = [
      {
        title: "Loans",
        component: <PersonalLoan resource={resourceNameMapWithCamelCase.loan} viewOthers={true} viewOwn={true} />,
        icon: 'bi-cash-coin',
      },
      {
        title: "Installments",
        component: <Installments />,
        icon: 'bi-calendar-week',
      },
      {
        title: "Configure",
        component: <EmployeeLoanInformation />,
        icon: 'bi-gear',
      }
    ];

    const tabItemsAdmin: TabItem[] = [
      ...(viewOwnPermissionLoan ? [{
        title: "Personal Loans",
        component: <PersonalLoan resource={resourceNameMapWithCamelCase.loan} viewOthers={true} viewOwn={true} />,
        icon: 'bi-cash-coin',
      }] : []),
      ...(viewOwnPermissionLoanInstallment ? [{
        title: "Personal Installments",
        component: <Installments />,
        icon: 'bi-calendar-week',
      }]:[]),
      ...(viewOthersPermissionLoan ? [{
        title: "Overview",
        component: <Overview />,
        icon: 'bi-grid-1x2',
      }]:[]),
      ...(viewOthersPermissionLoanInstallment ? [{
        title: "Installments",
        component: <InstallmentsAdmin />,
        icon: 'bi-calendar-week',
      }]:[]),
      ...(viewOthersPermissionLoan ? [{
        title: "Search Employees",
        component: <SearchEmployee />,
        icon: 'bi-search',
      }]:[]),
      ...((viewOthersPermissionLoan|| viewOwnPermissionLoan) ? [{
        title: "Configure",
        component: <Information />,
        icon: 'bi-gear',
      }]:[]),
    ];

    // The tab is the URL (/finance/loans/personal-installments), so it survives a refresh,
    // a shared link, and the remount the header does at the mobile breakpoint. Derived from
    // the titles, so a tab hidden by permissions can't shift the others.
    const { activeTab, setActiveTab } = useTabRoute('/finance/loans', tabItemsAdmin.map((t) => t.title));

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
        <MaterialHeaderTab tabItems={tabItemsAdmin} activeTab={activeTab} onTabChange={setActiveTab}/>
        {/* {!isAdmin && <MaterialHeaderTab tabItems={tabItems} onTabChange={setActiveTab}/>} */}
        {/* {isAdmin && } */}
      </>
    );
}

export default PersonalLoanMain