import { PageLink, PageTitle } from "@metronic/layout/core";
import MaterialHeaderTab, { TabItem } from "@app/modules/common/components/MaterialHeaderTab";
import AllEmployeesSearchDropdown from "@app/modules/common/components/AllEmployeesSearchDropdown";
import { financeSalaryAllIcoon } from "@metronic/assets/sidepanelicons";
import { useSearchParams } from "react-router-dom";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import IncrementView from "./IncrementView";

const breadcrumbs: Array<PageLink> = [
  { title: "Finance", path: "/finance/increment", isSeparator: false, isActive: false },
  { title: "Increment", path: "", isSeparator: true, isActive: false },
];

function Increment() {
  // Active tab lives in the URL (?tab=my|employees) so refresh/share restores it.
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: Array<{ key: string; title: string; icon: string; component: JSX.Element }> = [
    ...(hasPermission(resourceNameMapWithCamelCase.increment, permissionConstToUseWithHasPermission.readOwn) ? [{
      key: "my",
      title: "My Increment",
      icon: 'bi-graph-up-arrow',
      component: <IncrementView />,
    }] : []),
    ...(hasPermission(resourceNameMapWithCamelCase.increment, permissionConstToUseWithHasPermission.readOthers) ? [{
      key: "employees",
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

  const paramIndex = tabs.findIndex(t => t.key === searchParams.get("tab"));
  const activeTab = paramIndex >= 0 ? paramIndex : 0;

  const handleTabChange = (index: number) => {
    if (!tabs[index]) return;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("tab", tabs[index].key);
      return next;
    }, { replace: true });
  };

  const tabItems: TabItem[] = tabs.map((tab, idx) => ({
    title: tab.title,
    component: tab.component,
    icon: tab.icon,
  }));

  return (
    <>
      <PageTitle breadcrumbs={breadcrumbs}>Increment</PageTitle>
      <MaterialHeaderTab tabItems={tabItems} activeTab={activeTab} onTabChange={handleTabChange} />
    </>
  );
}

export default Increment;
