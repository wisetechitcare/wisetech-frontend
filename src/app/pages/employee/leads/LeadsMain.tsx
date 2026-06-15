import MaterialHeaderTab, {
  TabItem,
} from "@app/modules/common/components/MaterialHeaderTab";
import { leadsIcons, projectsIcons } from "@metronic/assets/sidepanelicons";
import { useState, useEffect } from "react";
import LeadsConfigurationMain from "./configuration/LeadsConfigurationMain";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@redux/store";
import { initializeChartSettings } from "@redux/slices/leadProjectCompanies";
import { PageTitle } from "@metronic/layout/core";
import LeadTablePage from "./table/LeadTablePage";
import LeadsOverviewMain from "./overview/LeadsOverviewMain";
import GlobalFilesView from "./GlobalFilesView";

const LeadsMain = () => {
  const [activeTab, setActiveTab] = useState(0);

  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Initialize chart settings when app loads
    dispatch(initializeChartSettings());
  }, [dispatch]);

  const tabItems: TabItem[] = [
    {
      title: "Overview",
      component: <LeadsOverviewMain />,
      icon:
        activeTab === 0
          ? leadsIcons.leadsOverviewIcon.active
          : leadsIcons.leadsOverviewIcon.default,
    },
    {
      title: "Leads",
      component: <LeadTablePage />,
      icon:
        activeTab === 1
          ? leadsIcons.leadsIcon.active
          : leadsIcons.leadsIcon.default,
    },
    {
      title: "Files",
      component: <GlobalFilesView />,
      icon:
        activeTab === 3
          ? projectsIcons.projectsIcon.active
          : projectsIcons.projectsIcon.default,
    },
    {
      title: "Configure",
      component: <LeadsConfigurationMain />,
      icon:
        activeTab === 2
          ? leadsIcons.leadsConfigIcon.active
          : leadsIcons.leadsConfigIcon.default,
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
