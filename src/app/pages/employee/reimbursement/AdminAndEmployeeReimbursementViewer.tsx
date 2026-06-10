import React, { useEffect, useState } from "react";
import { PageLink, PageTitle } from "@metronic/layout/core";
import MaterialHeaderTab, {
  TabItem,
} from "@app/modules/common/components/MaterialHeaderTab";
import Reimbursement from "./Reimbursement";
import AllEmployee from "./views/admin/AllEmployee";
import { BarChart } from "@mui/icons-material";
import SearchEmployee from "./views/admin/SearchEmployee";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import Settings from "./views/admin/Settings";
import ReimbursementEmployeeLimit from "./views/admin/ReimbursementEmployeeLimit";
import overviewIcon from '../../../../_metronic/assets/sidepanelicons/overview.svg'
import { leadsIcons, reimbursementsIcons } from "@metronic/assets/sidepanelicons";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";

function ConfigureView() {
  const [configTab, setConfigTab] = useState<"categories" | "limits">("categories");

  return (
    <div>
      <div className="d-flex gap-3 mb-6 border-bottom pb-3">
        <button
          type="button"
          className={`btn btn-sm ${configTab === "categories" ? "btn-primary" : "btn-light"}`}
          onClick={() => setConfigTab("categories")}
        >
          Reimbursement Categories
        </button>
        <button
          type="button"
          className={`btn btn-sm ${configTab === "limits" ? "btn-primary" : "btn-light"}`}
          onClick={() => setConfigTab("limits")}
        >
          Reimbursement Employee Per Request Limit
        </button>
      </div>
      {configTab === "categories" ? <Settings /> : <ReimbursementEmployeeLimit />}
    </div>
  );
}

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
      title: "Employees Reimbursements",
      component: <AllEmployee />,
      icon: activeTab === 1 ? reimbursementsIcons.employeesReimbursements.active : reimbursementsIcons.employeesReimbursements.default,
    }]:[]),
    ...(hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.readOthers) ? [{
      title: "Search Employee",
      component: <SearchEmployee />,
      icon: activeTab === 2 ? reimbursementsIcons.serchEmployee.active : reimbursementsIcons.serchEmployee.default,
    }]:[]),
    ...(hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.readOthers) ? [{
      title: "Configure",
      component: <ConfigureView />,
      icon: activeTab === 3 ? leadsIcons.leadsConfigIcon.active : leadsIcons.leadsConfigIcon.default,
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
