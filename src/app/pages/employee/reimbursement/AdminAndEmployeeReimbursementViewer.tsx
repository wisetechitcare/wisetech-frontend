import React, { useEffect, useState } from "react";
import { PageLink, PageTitle } from "@metronic/layout/core";
import MaterialHeaderTab, {
  TabItem,
} from "@app/modules/common/components/MaterialHeaderTab";
import Reimbursement from "./Reimbursement";
import AllEmployee from "./views/admin/AllEmployee";
import SearchEmployee from "./views/admin/SearchEmployee";
import PaymentTab from "./views/admin/PaymentTab";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import ReimbursementConfiguration from "./views/admin/ReimbursementConfiguration";
import overviewIcon from '../../../../_metronic/assets/sidepanelicons/overview.svg'
import { leadsIcons, loanIcons, reimbursementsIcons } from "@metronic/assets/sidepanelicons";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";


function AdminAndEmployeeReimbursementViewer() {
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState(0);
  const isAdmin = useSelector(
    (state: RootState) => state.auth.currentUser.isAdmin
  );
  useEffect(()=>{
    dispatch(fetchRolesAndPermissions() as any);
  },[])

  const tabItems: TabItem[] = [
    ...(hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.readOwn) ? [{
      title: "My Reimbursements",
      component: <Reimbursement />,
      icon: activeTab === 0 ? reimbursementsIcons.reimbursementsIcon.active : reimbursementsIcons.reimbursementsIcon.default,
    }]:[]),
    ...(hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.readOthers) ? [{
      title: "Search Employee",
      component: <SearchEmployee />,
      icon: activeTab === 1 ? reimbursementsIcons.serchEmployee.active : reimbursementsIcons.serchEmployee.default,
    }]:[]),
    ...(hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.readOthers) ? [{
      title: "Payment",
      component: <PaymentTab />,
      icon: activeTab === 2 ? loanIcons.installmentsIcon.active : loanIcons.installmentsIcon.default,
    }]:[]),
    ...(hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.readOthers) ? [{
      title: "Employees Reimbursements",
      component: <AllEmployee />,
      icon: activeTab === 3 ? reimbursementsIcons.employeesReimbursements.active : reimbursementsIcons.employeesReimbursements.default,
    }]:[]),
    ...(hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.readOthers) ? [{
      title: "Configure",
      component: <ReimbursementConfiguration />,
      icon: activeTab === 4 ? leadsIcons.leadsConfigIcon.active : leadsIcons.leadsConfigIcon.default,
    }]:[]),
  ];

  const ReimbursementWizardBreadcrumb: Array<PageLink> = [
    {
      title: "Finance",
      path: "/finance/bills",
      isSeparator: false,
      isActive: false,
    },
    {
      title: "Reimbursement",
      path: "",
      isSeparator: true,
      isActive: false,
    },
  ];

  return (
    <>
      <PageTitle breadcrumbs={ReimbursementWizardBreadcrumb}>
        Reimbursements
      </PageTitle>
      
      <MaterialHeaderTab tabItems={tabItems} onTabChange={setActiveTab}/>
    </>
  );
}

export default AdminAndEmployeeReimbursementViewer;
