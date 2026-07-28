import MaterialHeaderTab, {
  TabItem,
} from "@app/modules/common/components/MaterialHeaderTab";
import { leadsIcons, projectsIcons } from "@metronic/assets/sidepanelicons";
import { useEffect, useState } from "react";
import ProjectConfigure from "./configure/ProjectConfigure";

import ProjectTablePage from "./table/ProjectTablePage";
import ProjectOverview from "./overview/ProjectOverview";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@redux/store";
import { initializeChartSettings } from "@redux/slices/leadProjectCompanies";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import { useSearchParams } from "react-router-dom";
import { PageTitle } from "@metronic/layout/core";
import Maps from "../companies/companyOverview/components/Map";
import { getProjectMapPoints } from "@services/projects";
import { worldIcons } from "@metronic/assets/sidepanelicons";
import { canDo, evaluateCapability } from "@utils/can";
import MyProjects from "./MyProjects";

const TAB_KEYS = ["overview", "projects", "map", "configure"] as const;

const ProjectsMain = () => {
  // The full page is a CRM/company-wide dashboard (lead analytics, all projects,
  // map). A plain employee — who can only see the projects they're staffed on —
  // gets the focused "My Projects" list instead, and none of the company-wide
  // calls below fire for them.
  const capabilities = useSelector((s: RootState) => (s as any).authz?.capabilities || []);
  const canSeeAllProjects =
    evaluateCapability(capabilities, "crm.leads.view.team") ||
    evaluateCapability(capabilities, "projects.view.team");

  const [searchParams, setSearchParams] = useSearchParams();
  const tabKey = searchParams.get("tab") || "overview";
  const activeTab = Math.max(0, TAB_KEYS.indexOf(tabKey as any));
  const setActiveTab = (index: number) => {
    setSearchParams({ tab: TAB_KEYS[index] ?? "overview" }, { replace: true });
  };
  // Configure is a write-only surface: hidden for read-only viewers.
  const canConfigure = canDo("projects", "update");
  useEffect(() => {
    if (tabKey === "configure" && !canConfigure) {
      setSearchParams({ tab: "overview" }, { replace: true });
    }
  }, [tabKey, canConfigure, setSearchParams]);
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number}[]>([]);
  const [projectData, setProjectData] = useState<any>([]);

  const dispatch = useDispatch<AppDispatch>();

 
  useEffect(() => {
    if (!canSeeAllProjects) return; // company-wide employee list is manager-only
    dispatch(loadAllEmployeesIfNeeded());
    dispatch(initializeChartSettings());
  }, [dispatch, canSeeAllProjects]);

  useEffect(() => {
    if (!canSeeAllProjects) return; // map-points needs projects.view.team
    // Map loads EVERY coordinated project (no 500-row pagination) via the slim endpoint.
    getProjectMapPoints().then((res) => {
      setProjectData(res?.data?.projects);
      const allCoordinates = res?.data?.projects
        ?.filter((item: any) => item.latitude && item.longitude)
        ?.map((item: any) => ({
          lat: parseFloat(item.latitude),
          lng: parseFloat(item.longitude),
          id: item.id
        })) || [];
      setCoordinates(allCoordinates);
    });
  }, [canSeeAllProjects]);


  const points = coordinates;
  
  const tabItems: TabItem[] = [
    {
      title: "Overview",
      component: <ProjectOverview />,
      icon: 'bi-grid-1x2',
    },
    {
      title: "Projects",
      component: <ProjectTablePage />,
      icon: 'bi-briefcase',
    },
    {
      title: "Map",
      component: <Maps points={points} projectData={projectData} />,
      icon: 'bi-geo-alt',
    },
    ...(canConfigure
      ? [{
          title: "Configure",
          component: <ProjectConfigure />,
          icon: 'bi-gear',
        }]
      : []),
  ];
  const safeActiveTab = Math.min(activeTab, tabItems.length - 1);

  const PorjectBreadcrumbs = [
    {
      title: 'project',
      path: '/project',
      isSeparator: false,
      isActive: false,
    },
    {
      title: '',
      path: '',
      isSeparator: true,
      isActive: false,
    },
  ];

  // Employee view: just the projects they're staffed on — no CRM tabs/analytics/map.
  if (!canSeeAllProjects) {
    return (
      <div>
        <PageTitle breadcrumbs={PorjectBreadcrumbs}>Projects</PageTitle>
        <MyProjects />
      </div>
    );
  }

  return (
    <div>
      <PageTitle breadcrumbs={PorjectBreadcrumbs}>
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

export default ProjectsMain;

