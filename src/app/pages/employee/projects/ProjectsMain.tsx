import MaterialHeaderTab, {
  TabItem,
} from "@app/modules/common/components/MaterialHeaderTab";
import { leadsIcons, projectsIcons } from "@metronic/assets/sidepanelicons";
import { useEffect, useState } from "react";
import ProjectConfigure from "./configure/ProjectConfigure";

import ProjectTablePage from "./table/ProjectTablePage";
import ProjectOverview from "./overview/ProjectOverview";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@redux/store";
import { initializeChartSettings } from "@redux/slices/leadProjectCompanies";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import { tabSlug, useTabRoute } from "@app/hooks/useTabRoute";
import { canTab } from "@utils/can";
import { useSelector } from "react-redux";
import type { RootState } from "@redux/store";
import { PageTitle } from "@metronic/layout/core";
import Maps from "../companies/companyOverview/components/Map";
import { getProjectMapPoints } from "@services/projects";
import { worldIcons } from "@metronic/assets/sidepanelicons";

const ProjectsMain = () => {
  // The tab is the path segment, and the query string stays the table's own
  // (?manager=/?search=/?status=). Old ?tab= links are rewritten once.
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number}[]>([]);
  const [projectData, setProjectData] = useState<any>([]);

  const dispatch = useDispatch<AppDispatch>();

 
  useEffect(() => {
    dispatch(loadAllEmployeesIfNeeded());
    dispatch(initializeChartSettings());
  }, [dispatch]);

  useEffect(() => {
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
  }, []);


  const points = coordinates;
  
  useSelector((st: RootState) => (st as any).authz);
  // The tabs this person gets: each follows the section (Configure needs Write) unless turned
  // off for them under Access -> Advanced. The URL names a tab by its title (useTabRoute).
  const tabItems: TabItem[] = ([
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
    {
      title: "Configure",
      component: <ProjectConfigure />,
      icon: 'bi-gear',
    },
  ] as TabItem[]).filter((t) => canTab("projects", tabSlug(t.title)));
  const { activeTab, setActiveTab } = useTabRoute("/projects", tabItems.map((t) => t.title));


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
  return (
    <div>
      <PageTitle breadcrumbs={PorjectBreadcrumbs}>
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

export default ProjectsMain;

