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
import { useDispatch } from "react-redux";
import ReimbursementConfiguration from "./views/admin/ReimbursementConfiguration";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import { hasPermission } from "@utils/authAbac";
import { can } from "@utils/can";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";


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

  const tabItems: TabItem[] = [
    ...(hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.readOwn) ? [{
      title: "My Reimbursements",
      component: <Reimbursement />,
      icon: 'bi-receipt',
    }]:[]),
    ...(hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.readOthers) ? [{
      title: "Employees Reimbursements",
      component: <AllEmployee />,
      icon: 'bi-receipt-cutoff',
    }]:[]),
    ...(hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.readOthers) ? [{
      title: "Search Employee",
      component: <SearchEmployee />,
      icon: 'bi-search',
    }]:[]),
    // Payment and Configure are WRITE surfaces — recording payouts, and rewriting expense
    // categories and per-employee spending limits. All five tabs used to gate on `readOthers`
    // (`finance.view.team`), so anyone who could view the team could also pay and reconfigure.
    // These two now require an explicit finance write grant.
    ...(can('finance.manage.team') ? [{
      title: "Payment",
      component: <PaymentTab />,
      icon: 'bi-credit-card',
    }]:[]),
    ...(can('finance.manage.all') ? [{
      title: "Configure",
      component: <ReimbursementConfiguration />,
      icon: 'bi-gear',
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
