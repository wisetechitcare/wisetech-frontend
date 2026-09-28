import MaterialHeaderTab, {
  TabItem,
} from "@app/modules/common/components/MaterialHeaderTab";
import { leadsIcons, projectsIcons } from "@metronic/assets/sidepanelicons";
import LeadsConfigurationMain from "./configuration/LeadsConfigurationMain";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@redux/store";
import { initializeChartSettings } from "@redux/slices/leadProjectCompanies";
import { useEffect } from "react";
import { tabSlug, useTabRoute } from "@app/hooks/useTabRoute";
import { canTab } from "@utils/can";
import { useSelector } from "react-redux";
import type { RootState } from "@redux/store";
import { PageTitle } from "@metronic/layout/core";
import LeadNewLead from "./lead/LeadNewLead";
import LeadsOverviewMain from "./overview/LeadsOverviewMain";
import GlobalFilesView from "./GlobalFilesView";

const LeadsMain = () => {

  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Initialize chart settings when app loads
    dispatch(initializeChartSettings());
  }, [dispatch]);

  useSelector((st: RootState) => (st as any).authz);
  // The tabs this person gets: each follows the section (Configure needs Write) unless turned
  // off for them under Access -> Advanced. The URL names a tab by its title (useTabRoute).
  const tabItems: TabItem[] = ([
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
  ] as TabItem[]).filter((t) => canTab("crm.leads", tabSlug(t.title)));
  const { activeTab, setActiveTab } = useTabRoute("/leads", tabItems.map((t) => t.title));

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
        {tabItems[activeTab]?.title}
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
