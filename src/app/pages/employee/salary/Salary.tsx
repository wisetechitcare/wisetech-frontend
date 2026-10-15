import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLink, PageTitle } from "@metronic/layout/core";
import MaterialHeaderTab, { TabItem } from "@app/modules/common/components/MaterialHeaderTab";
import SalaryConfiguration from "./admin/SalaryConfiguration";
import MySalary from "./admin/MySalary";
import { useTabRoute } from "@app/hooks/useTabRoute";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import SalaryEmployeeData from "./admin/SalaryEmployeeData";
import SensitiveDataProvider, { SensitiveDataHeaderToggle } from "@app/modules/common/components/SensitiveData";
import { SecurityPinGate, SecurityPinLockButton, SupportSessionBanner, useSecurityPin } from "@app/modules/common/components/SecurityPin";
import { securityPinBus, supportCoversArea } from "@utils/securityPinBus";


function Salary() {
  const snap = useSecurityPin();
  const navigate = useNavigate();
  // Lock / eye only while THIS salary tab is unlocked — not because another PIN area is open.
  const unlocked = securityPinBus.isAreaUnlocked(snap.activeArea);

  const supportRemoteSalary =
    !!snap.supportGrant
    && supportCoversArea("finance.salary/employee-payrolls");

  // Support is for someone else's record — land on their full-page salary view (payrolls tab).
  useEffect(() => {
    if (!supportRemoteSalary) return;
    if (snap.activeArea === "finance.salary/my-salary") {
      navigate("/finance/salary/employee-payrolls", { replace: true });
    }
  }, [supportRemoteSalary, snap.activeArea, navigate]);
  const tabItems: TabItem[] = [
    ...(hasPermission(resourceNameMapWithCamelCase.salary, permissionConstToUseWithHasPermission.readOwn) ? [{
      title: "My Salary",
      component: <SecurityPinGate area="finance.salary/my-salary"><MySalary /></SecurityPinGate>,
      icon: 'bi-wallet2',
    }]:[]),
    ...(hasPermission(resourceNameMapWithCamelCase.salary, permissionConstToUseWithHasPermission.readOthers) ? [{
      title: "Employee Payrolls",
      component: <SecurityPinGate area="finance.salary/employee-payrolls"><SalaryEmployeeData/></SecurityPinGate>,
      icon: 'bi-cash-stack',
    }]:[]),
    ...((hasPermission(resourceNameMapWithCamelCase.salaryConfig, permissionConstToUseWithHasPermission.readOthers)) ? [{
      title: "Configure",
      component: <SecurityPinGate area="finance.salary/configure"><SalaryConfiguration /></SecurityPinGate>,
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
      {/* Above the tabs, so the eye in the sticky bar governs every figure on My Salary. The
          Employee Payrolls detail dialog covers the bar, so it keeps an eye of its own — on the
          same state. */}
      <SensitiveDataProvider>
        <SupportSessionBanner />
        <MaterialHeaderTab
          tabItems={tabItems}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          accessSection="finance.salary"
          headerAction={
            // Only mount the action rail while unlocked — an empty wrapper still drew the
            // divider and stole width on phones, clipping Configure and hiding Sensitive.
            // Lock ends the unlock for stepping away; the eye hides figures for a glance.
            unlocked ? (
              <div className="flex h-9 shrink-0 items-center gap-1 sm:h-auto sm:gap-2">
                <SecurityPinLockButton />
                {(tabItems[activeTab]?.title === "My Salary"
                  || (supportRemoteSalary && tabItems[activeTab]?.title === "Employee Payrolls"))
                  && <SensitiveDataHeaderToggle />}
              </div>
            ) : undefined
          }
        />
      </SensitiveDataProvider>
    </>
  );
}

export default Salary;
