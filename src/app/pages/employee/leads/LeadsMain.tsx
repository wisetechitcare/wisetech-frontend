import MaterialHeaderTab, {
  TabItem,
} from "@app/modules/common/components/MaterialHeaderTab";
import { leadsIcons, projectsIcons } from "@metronic/assets/sidepanelicons";
import LeadsConfigurationMain from "./configuration/LeadsConfigurationMain";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@redux/store";
import { initializeChartSettings } from "@redux/slices/leadProjectCompanies";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageTitle } from "@metronic/layout/core";
import LeadNewLead from "./lead/LeadNewLead";
import LeadsOverviewMain from "./overview/LeadsOverviewMain";
import GlobalFilesView from "./GlobalFilesView";

const TAB_KEYS = ["overview", "leads", "files", "configure"] as const;

const LeadsMain = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabKey = searchParams.get("tab") || "overview";
  const activeTab = Math.max(0, TAB_KEYS.indexOf(tabKey as any));
  const setActiveTab = (index: number) => {
    setSearchParams({ tab: TAB_KEYS[index] ?? "overview" }, { replace: true });
  };

  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Initialize chart settings when app loads
    dispatch(initializeChartSettings());
  }, [dispatch]);

  const tabItems: TabItem[] = [
    {
      title: "Overview",
      component: <LeadsOverviewMain />,
      icon: 'bi-grid-1x2',
    },
    {
      title: "Leads",
      component: <LeadNewLead />,
      icon: 'bi-megaphone',
    },
    {
      title: "Files",
      component: <GlobalFilesView />,
      icon: 'bi-folder',
    },
    {
      title: "Configure",
      component: <LeadsConfigurationMain />,
      icon: 'bi-gear',
    },
  ];
  const LeadBreadcrumbs = [
    {
      title: "lead",
      path: "/lead",
      isSeparator: false,
      isActive: false,
    },
    {
      title: "",
      path: "",
      isSeparator: true,
      isActive: false,
    },
  ];
  return (
    <div>
      <PageTitle breadcrumbs={LeadBreadcrumbs}>
        {tabItems[activeTab].title}
      </PageTitle>

      <MaterialHeaderTab
        tabItems={tabItems}
        onTabChange={setActiveTab}
        activeTab={activeTab}
      />
    </div>
  );
};

export default LeadsMain;
