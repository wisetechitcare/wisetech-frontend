import { PageLink, PageTitle } from "@metronic/layout/core";
import MaterialHeaderTab, { TabItem } from "@app/modules/common/components/MaterialHeaderTab";
import { BarChart } from "@mui/icons-material";
import SalaryConfiguration from "./admin/SalaryConfiguration";
import MySalary from "./admin/MySalary";
import SalaryView from "./personal/SalaryView";
import AllEmployeeData from "./admin/AllEmployeesData";
import { financeSalaryAllIcoon, leadsIcons } from "@metronic/assets/sidepanelicons";
import { useState } from "react";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import SalaryEmployeeData from "./admin/SalaryEmployeeData";
import SensitiveDataProvider, { SensitiveDataHeaderToggle } from "@app/modules/common/components/SensitiveData";

function Salary() {
  const [activeTab, setActiveTab] = useState(0);

  const tabItems: TabItem[] = [
    ...(hasPermission(resourceNameMapWithCamelCase.salary, permissionConstToUseWithHasPermission.readOwn) ? [{
      title: "My Salary",
      component: <MySalary />,
      icon: 'bi-wallet2',
    }]:[]),
    ...(hasPermission(resourceNameMapWithCamelCase.salary, permissionConstToUseWithHasPermission.readOthers) ? [{
      title: "Employee Payrolls",
      component: <SalaryEmployeeData/>,
      icon: 'bi-cash-stack',
    }]:[]),
    ...((hasPermission(resourceNameMapWithCamelCase.salaryConfig, permissionConstToUseWithHasPermission.readOthers)) ? [{
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
      {/* Above the tabs, so the eye in the sticky bar governs every figure on My Salary. The
          Employee Payrolls detail dialog covers the bar, so it keeps an eye of its own — on the
          same state. */}
      <SensitiveDataProvider>
        <MaterialHeaderTab
          tabItems={tabItems}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          headerAction={tabItems[activeTab]?.title === "My Salary" ? <SensitiveDataHeaderToggle /> : undefined}
        />
      </SensitiveDataProvider>
    </>
  );
}

export default Salary;
