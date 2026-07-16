import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
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
import { canDo } from "@utils/can";


function AdminAndEmployeeReimbursementViewer() {
  const dispatch = useDispatch();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(0);
  useEffect(()=>{
    dispatch(fetchRolesAndPermissions() as any);
  },[])

  useEffect(() => {
    if ((location.state as any)?.goToSearchEmployee) {
      const idx = tabItems.findIndex(t => t.title === "Search Employee");
      if (idx !== -1) setActiveTab(idx);
    }
  }, [location.state]);

  // Employees Reimbursements / Search Employee / Payment / Configure are
  // write-only surfaces: a read-only viewer gets My Reimbursements only, same
  // convention as KPI/Tasks/Leads/Salary.
  const canWrite = canDo("finance.reimbursements", "update");

  const tabItems: TabItem[] = [
    ...(hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.readOwn) ? [{
      title: "My Reimbursements",
      component: <Reimbursement />,
      icon: activeTab === 0 ? reimbursementsIcons.reimbursementsIcon.active : reimbursementsIcons.reimbursementsIcon.default,
    }]:[]),
    ...(canWrite ? [{
      title: "Employees Reimbursements",
      component: <AllEmployee />,
      icon: activeTab === 1 ? reimbursementsIcons.employeesReimbursements.active : reimbursementsIcons.employeesReimbursements.default,
    }]:[]),
    ...(canWrite ? [{
      title: "Search Employee",
      component: <SearchEmployee />,
      icon: activeTab === 2 ? reimbursementsIcons.serchEmployee.active : reimbursementsIcons.serchEmployee.default,
    }]:[]),
    ...(canWrite ? [{
      title: "Payment",
      component: <PaymentTab />,
      icon: activeTab === 3 ? loanIcons.installmentsIcon.active : loanIcons.installmentsIcon.default,
    }]:[]),
    ...(canWrite ? [{
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
      
      <MaterialHeaderTab tabItems={tabItems} activeTab={activeTab} onTabChange={setActiveTab}/>
    </>
  );
}

export default AdminAndEmployeeReimbursementViewer;
