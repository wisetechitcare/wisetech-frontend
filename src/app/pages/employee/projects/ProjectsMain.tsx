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
import { useTabRoute } from "@app/hooks/useTabRoute";
import { PageTitle } from "@metronic/layout/core";
import Maps from "../companies/companyOverview/components/Map";
import { getProjectMapPoints } from "@services/projects";
import { worldIcons } from "@metronic/assets/sidepanelicons";

/** Tab titles, in order. Their slugs are the URL: /projects/map — see useTabRoute. */
const TAB_TITLES = ["Overview", "Projects", "Map", "Configure"] as const;

const ProjectsMain = () => {
  // The tab is the path segment, and the query string stays the table's own
  // (?manager=/?search=/?status=). Old ?tab= links are rewritten once.
  const { activeTab, setActiveTab } = useTabRoute("/projects", TAB_TITLES);
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
  
  const tabItems: TabItem[] = [
    {
      title: TAB_TITLES[0],
      component: <ProjectOverview />,
      icon: 'bi-grid-1x2',
    },
    {
      title: TAB_TITLES[1],
      component: <ProjectTablePage />,
      icon: 'bi-briefcase',
    },
    {
      title: TAB_TITLES[2],
      component: <Maps points={points} projectData={projectData} />,
      icon: 'bi-geo-alt',
    },
    {
      title: TAB_TITLES[3],
      component: <ProjectConfigure />,
      icon: 'bi-gear',
    },
  ];

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

export default ProjectsMain;

