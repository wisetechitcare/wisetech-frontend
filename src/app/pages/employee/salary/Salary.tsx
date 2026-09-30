import { PageLink, PageTitle } from "@metronic/layout/core";
import MaterialHeaderTab, { TabItem } from "@app/modules/common/components/MaterialHeaderTab";
import { BarChart } from "@mui/icons-material";
import SalaryConfiguration from "./admin/SalaryConfiguration";
import MySalary from "./admin/MySalary";
import SalaryView from "./personal/SalaryView";
import AllEmployeeData from "./admin/AllEmployeesData";
import { financeSalaryAllIcoon, leadsIcons } from "@metronic/assets/sidepanelicons";
import { useTabRoute } from "@app/hooks/useTabRoute";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import SalaryEmployeeData from "./admin/SalaryEmployeeData";
import SensitiveDataProvider, { SensitiveDataHeaderToggle } from "@app/modules/common/components/SensitiveData";
import { SecurityPinGate, SecurityPinLockButton, useSecurityPin } from "@app/modules/common/components/SecurityPin";

function Salary() {
  const { unlocked } = useSecurityPin();
  const tabItems: TabItem[] = [
    ...(hasPermission(resourceNameMapWithCamelCase.salary, permissionConstToUseWithHasPermission.readOwn) ? [{
      title: "My Salary",
      component: <SecurityPinGate><MySalary /></SecurityPinGate>,
      icon: 'bi-wallet2',
    }]:[]),
    ...(hasPermission(resourceNameMapWithCamelCase.salary, permissionConstToUseWithHasPermission.readOthers) ? [{
      title: "Employee Payrolls",
      component: <SecurityPinGate><SalaryEmployeeData/></SecurityPinGate>,
      icon: 'bi-cash-stack',
    }]:[]),
    ...((hasPermission(resourceNameMapWithCamelCase.salaryConfig, permissionConstToUseWithHasPermission.readOthers)) ? [{
      title: "Configure",
      component: <SecurityPinGate><SalaryConfiguration /></SecurityPinGate>,
      icon: 'bi-gear',
    }]:[]),
  ];

  // The tab is the URL (/finance/salary/employee-payrolls), so it survives a refresh,
  // a shared link, and the remount the header does at the mobile breakpoint. Derived
  // from the titles, so a tab hidden by permissions can't shift the others.
  const { activeTab, setActiveTab } = useTabRoute("/finance/salary", tabItems.map((t) => t.title));

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
          accessSection="finance.salary"
          headerAction={
            // Lock sits beside the eye: the eye hides figures for a glance over the shoulder,
            // Lock ends the unlock for stepping away. Lock renders nothing while locked.
            <div className="flex items-center gap-2">
              <SecurityPinLockButton />
              {tabItems[activeTab]?.title === "My Salary" && unlocked && <SensitiveDataHeaderToggle />}
            </div>
          }
        />
      </SensitiveDataProvider>
    </>
  );
}

export default Salary;
