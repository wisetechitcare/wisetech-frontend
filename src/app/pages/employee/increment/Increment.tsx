import { PageLink, PageTitle } from "@metronic/layout/core";
import MaterialHeaderTab, { TabItem } from "@app/modules/common/components/MaterialHeaderTab";
import MyIncrement from "./admin/MyIncrement";
import SearchIncrementEmployee from "./admin/SearchIncrementEmployee";
import { financeSalaryAllIcoon, leadsIcons } from "@metronic/assets/sidepanelicons";
import { useState } from "react";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";

function Increment() {
  const [activeTab, setActiveTab] = useState(0);
  
  const tabItems: TabItem[] = [
    ...(hasPermission(resourceNameMapWithCamelCase.increment, permissionConstToUseWithHasPermission.readOwn) ? [{
      title: "My Increment", 
      component: <MyIncrement />,
      icon: activeTab === 0 ? financeSalaryAllIcoon.salaryIcon.active : financeSalaryAllIcoon.salaryIcon.default,
    }]:[]),
    ...(hasPermission(resourceNameMapWithCamelCase.increment, permissionConstToUseWithHasPermission.readOthers) ? [{
      title: "Employee Increment",
      component: <SearchIncrementEmployee />,
      icon:activeTab === 1 ? financeSalaryAllIcoon.serchEmployeeIcon.active : financeSalaryAllIcoon.serchEmployeeIcon.default,
    }]:[]),
  ];

  const IncrementWizardBreadcrumb: Array<PageLink> = [
    {
      title: "Finance",
      path: "/finance/increment",
      isSeparator: false,
      isActive: false,
    },
    {
      title: "Increment",
      path: "",
      isSeparator: true,
      isActive: false,
    },
  ];

  return (
    <>
      <PageTitle breadcrumbs={IncrementWizardBreadcrumb}>
        Increment
      </PageTitle>
      <MaterialHeaderTab tabItems={tabItems} onTabChange={setActiveTab} />
    </>
  );
}

export default Increment;
