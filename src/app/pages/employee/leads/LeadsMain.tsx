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
import { canDo } from "@utils/can";

const TAB_KEYS = ["overview", "leads", "files", "configure"] as const;

const LeadsMain = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabKey = searchParams.get("tab") || "overview";
  const activeTab = Math.max(0, TAB_KEYS.indexOf(tabKey as any));
  const setActiveTab = (index: number) => {
    setSearchParams({ tab: TAB_KEYS[index] ?? "overview" }, { replace: true });
  };
  // Configure is a write-only surface: hidden for read-only viewers, so the
  // whole tab (not each button inside it) is the access control.
  const canConfigure = canDo("crm.leads", "update");
  useEffect(() => {
    if (tabKey === "configure" && !canConfigure) {
      setSearchParams({ tab: "overview" }, { replace: true });
    }
  }, [tabKey, canConfigure, setSearchParams]);

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
      component: <LeadNewLead />,
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
    ...(canConfigure
      ? [{
          title: "Configure",
          component: <LeadsConfigurationMain />,
          icon:
            activeTab === 2
              ? leadsIcons.leadsConfigIcon.active
              : leadsIcons.leadsConfigIcon.default,
        }]
      : []),
  ];
  const safeActiveTab = Math.min(activeTab, tabItems.length - 1);
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
        {tabItems[safeActiveTab].title}
      </PageTitle>

      <MaterialHeaderTab
        tabItems={tabItems}
        onTabChange={setActiveTab}
        activeTab={safeActiveTab}
      />
    </div>
  );
};

export default LeadsMain;
