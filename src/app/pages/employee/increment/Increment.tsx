import { PageLink, PageTitle } from "@metronic/layout/core";
import MaterialHeaderTab, { TabItem } from "@app/modules/common/components/MaterialHeaderTab";
import AllEmployeesSearchDropdown from "@app/modules/common/components/AllEmployeesSearchDropdown";
import { financeSalaryAllIcoon } from "@metronic/assets/sidepanelicons";
import { useTabRoute } from "@app/hooks/useTabRoute";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import IncrementView from "./IncrementView";

const breadcrumbs: Array<PageLink> = [
  { title: "Finance", path: "/finance/increment", isSeparator: false, isActive: false },
  { title: "Increment", path: "", isSeparator: true, isActive: false },
];

function Increment() {
  const tabItems: TabItem[] = [
    ...(hasPermission(resourceNameMapWithCamelCase.increment, permissionConstToUseWithHasPermission.readOwn) ? [{
      title: "My Increment",
      icon: 'bi-graph-up-arrow',
      component: <IncrementView />,
    }] : []),
    ...(hasPermission(resourceNameMapWithCamelCase.increment, permissionConstToUseWithHasPermission.readOthers) ? [{
      title: "Employee Increment",
      icon: 'bi-people',
      component: (
        <>
          <AllEmployeesSearchDropdown />
          <div className="mt-8" />
          <IncrementView fromAdmin={true} />
        </>
      ),
    }] : []),
  ];

  // The tab is the URL (/finance/increment/my-increment), so it survives a refresh, a shared
  // link, and the remount the header does at the mobile breakpoint. Derived from the titles,
  // so a tab hidden by permissions can't shift the others.
  const { activeTab, setActiveTab } = useTabRoute("/finance/increment", tabItems.map((t) => t.title));

  return (
    <>
      <PageTitle breadcrumbs={breadcrumbs}>Increment</PageTitle>
      <MaterialHeaderTab tabItems={tabItems} activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );
}

export default Increment;
