import { PageLink, PageTitle } from "@metronic/layout/core";
import MaterialHeaderTab, { TabItem } from "@app/modules/common/components/MaterialHeaderTab";
import { BarChart } from "@mui/icons-material";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import SalaryConfiguration from "./admin/SalaryConfiguration";
import SearchEmployee from "./admin/SearchEmployee";
import MySalary from "./admin/MySalary";
import SalaryView from "./personal/SalaryView";
import AllEmployeeData from "./admin/AllEmployeesData";
import { financeSalaryAllIcoon, leadsIcons } from "@metronic/assets/sidepanelicons";
import { useState } from "react";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import SalaryEmployeeData from "./admin/SalaryEmployeeData";

function Salary() {
  const [activeTab, setActiveTab] = useState(0);
  
  const isAdmin = useSelector(
    (state: RootState) => state.auth.currentUser.isAdmin
  );

  const tabItems: TabItem[] = [
    ...(hasPermission(resourceNameMapWithCamelCase.salary, permissionConstToUseWithHasPermission.readOwn) ? [{
      title: "My Salary", 
      component: <MySalary />,
      icon: activeTab === 0 ? financeSalaryAllIcoon.salaryIcon.active : financeSalaryAllIcoon.salaryIcon.default,
    }]:[]),
    ...(hasPermission(resourceNameMapWithCamelCase.salary, permissionConstToUseWithHasPermission.readOthers) ? [{
      title: "Salary Employees",
      component: <SalaryEmployeeData/>,
      icon:activeTab === 2 ? financeSalaryAllIcoon.empSalaey.active : financeSalaryAllIcoon.empSalaey.default,
    }]:[]),
    ...(hasPermission(resourceNameMapWithCamelCase.salary, permissionConstToUseWithHasPermission.readOthers) ? [{
      title: "Search Employee",
      component: <SearchEmployee />,
      icon:activeTab === 1 ? financeSalaryAllIcoon.serchEmployeeIcon.active : financeSalaryAllIcoon.serchEmployeeIcon.default,
    }]:[]),
    // ...(hasPermission(resourceNameMapWithCamelCase.salary, permissionConstToUseWithHasPermission.readOthers) ? [{
    //   title: "All Employees",
    //   component: <AllEmployeeData/>,
    //   icon:activeTab === 2 ? financeSalaryAllIcoon.empSalaey.active : financeSalaryAllIcoon.empSalaey.default,
    // }]:[]),
    ...((hasPermission(resourceNameMapWithCamelCase.salaryConfig, permissionConstToUseWithHasPermission.readOthers)) ? [{
      title: "Configure",
      component: <SalaryConfiguration />,
      icon:activeTab === 3 ? leadsIcons.leadsConfigIcon.active
                            : leadsIcons.leadsConfigIcon.default,
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
      <MaterialHeaderTab tabItems={tabItems} onTabChange={setActiveTab} />
    </>
  );
}

export default Salary;
