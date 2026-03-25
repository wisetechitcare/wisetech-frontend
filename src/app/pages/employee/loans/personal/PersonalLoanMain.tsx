import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import { leadsIcons, reimbursementsIcons } from '@metronic/assets/sidepanelicons';
import { PageLink, PageTitle } from '@metronic/layout/core';
import { RootState } from '@redux/store';
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
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

function PersonalLoanMain() {
    const dispatch = useDispatch();

    const [activeTab, setActiveTab] = useState(0);
    const isAdmin = useSelector(
      (state: RootState) => state.auth.currentUser.isAdmin
    );
    const viewOwnPermissionLoan = hasPermission(resourceNameMapWithCamelCase.loan, permissionConstToUseWithHasPermission.readOwn)
    const viewOthersPermissionLoan = hasPermission(resourceNameMapWithCamelCase.loan, permissionConstToUseWithHasPermission.readOthers)
    const viewOwnPermissionLoanInstallment = hasPermission(resourceNameMapWithCamelCase.loanInstallment, permissionConstToUseWithHasPermission.readOwn)
    const viewOthersPermissionLoanInstallment = hasPermission(resourceNameMapWithCamelCase.loanInstallment, permissionConstToUseWithHasPermission.readOthers)
  
    const tabItems: TabItem[] = [
      {
        title: "Loans",
        component: <PersonalLoan resource={resourceNameMapWithCamelCase.loan} viewOthers={true} viewOwn={true} />,
        icon: activeTab === 0 ? loanIcons.loanOverviewIcon.active : loanIcons.loanOverviewIcon.default,
      },
      {
        title: "Installments",
        component: <Installments />,
        icon: activeTab === 1 ? loanIcons.installmentsIcon.active : loanIcons.installmentsIcon.default,
      },
      {
        title: "Configure",
        component: <EmployeeLoanInformation />,
        icon: activeTab === 2 ? leadsIcons.leadsConfigIcon.active
                              : leadsIcons.leadsConfigIcon.default,
      }
    ];

    const tabItemsAdmin: TabItem[] = [
      ...(viewOwnPermissionLoan ? [{
        title: "Personal Loans",
        component: <PersonalLoan resource={resourceNameMapWithCamelCase.loan} viewOthers={true} viewOwn={true} />,
        icon: activeTab === 0 ? reimbursementsIcons.reimbursementsIcon.active : reimbursementsIcons.reimbursementsIcon.default,
      }] : []),
      ...(viewOwnPermissionLoanInstallment ? [{
        title: "Personal Installments",
        component: <Installments />,
        icon: activeTab === 1 ? reimbursementsIcons.employeesReimbursements.active : reimbursementsIcons.employeesReimbursements.default,
      }]:[]),
      ...(viewOthersPermissionLoan ? [{
        title: "Overview",
        component: <Overview />,
        icon: activeTab === 2 ? loanIcons.loanOverviewIcon.active : loanIcons.loanOverviewIcon.default,
      }]:[]),
      ...(viewOthersPermissionLoanInstallment ? [{
        title: "Installments",
        component: <InstallmentsAdmin />,
        icon: activeTab === 3 ? loanIcons.installmentsIcon.active : loanIcons.installmentsIcon.default,
      }]:[]),
      ...(viewOthersPermissionLoan ? [{
        title: "Search Employees",
        component: <SearchEmployee />,
        icon: activeTab === 4 ? reimbursementsIcons.serchEmployee.active : reimbursementsIcons.serchEmployee.default,
      }]:[]),
      ...((viewOthersPermissionLoan|| viewOwnPermissionLoan) ? [{
        title: "Configure",
        component: <Information />,
        icon: activeTab === 5 ? leadsIcons.leadsConfigIcon.active
                              : leadsIcons.leadsConfigIcon.default,
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