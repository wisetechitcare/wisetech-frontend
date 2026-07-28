import { PageLink, PageTitle } from "@metronic/layout/core";
import MaterialHeaderTab, { TabItem } from "@app/modules/common/components/MaterialHeaderTab";
import { BarChart } from "@mui/icons-material";
import SalaryConfiguration from "./admin/SalaryConfiguration";
import SearchEmployee from "./admin/SearchEmployee";
import MySalary from "./admin/MySalary";
import SalaryView from "./personal/SalaryView";
import AllEmployeeData from "./admin/AllEmployeesData";
import { financeSalaryAllIcoon, leadsIcons } from "@metronic/assets/sidepanelicons";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import SalaryEmployeeData from "./admin/SalaryEmployeeData";
import { canViewFinanceTab } from "@utils/financeTabs";

function Salary() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if ((location.state as any)?.goToSearchEmployee) {
      const idx = tabItems.findIndex(t => t.title === "Search Employee");
      if (idx !== -1) setActiveTab(idx);
    }
  }, [location.state]);

  // Each tab is gated on its EXACT catalog key (canViewFinanceTab), so granting one
  // tab shows only that tab — no cascade. My Salary = view.self, Employee Payrolls =
  // view.all, Search + Configure = manage.all (a distinct admin tier, so a view/edit
  // grant on Payrolls never reveals the admin surfaces). Admins on flat `finance.*`
  // still see everything via the helper's flat-finance fallback.
  const tabItems: TabItem[] = [
    ...(canViewFinanceTab('salary.my') ? [{
      title: "My Salary",
      component: <MySalary />,
      icon: 'bi-wallet2',
    }]:[]),
    ...(canViewFinanceTab('salary.payrolls') ? [{
      title: "Employee Payrolls",
      component: <SalaryEmployeeData/>,
      icon: 'bi-cash-stack',
    }]:[]),
    ...(canViewFinanceTab('salary.search') ? [{
      title: "Search Employee",
      component: <SearchEmployee />,
      icon: 'bi-search',
    }]:[]),
    ...(canViewFinanceTab('salary.configure') ? [{
      title: "Configure",
      component: <SalaryConfiguration />,
      icon: 'bi-gear',
    }]:[]),
  ];

  const SalaryWizardBreadcrumb: Array<PageLink> = [
    {
      title: "Finance",
      path: "/finance/salary",
      isSeparator: false,
      isActive: false,
    },
    {
      title: "Salary",
      path: "",
      isSeparator: true,
      isActive: false,
    },
  ];

  return (
    <>
      <PageTitle breadcrumbs={SalaryWizardBreadcrumb}>
        Salary
      </PageTitle>
      {/* <SalaryView /> */}
      <MaterialHeaderTab tabItems={tabItems} activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );
}

export default Salary;
