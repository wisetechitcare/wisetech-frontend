import MaterialHeaderTab, {
  TabItem,
} from "@app/modules/common/components/MaterialHeaderTab";
import { leadsIcons, projectsIcons } from "@metronic/assets/sidepanelicons";
import { useEffect, useState } from "react";
import ProjectConfigure from "./configure/ProjectConfigure";
import ProjectsOverviewMain from "./overview/ProjectsOverviewMain";
import ProjectsMainTable from "./project/ProjectsMainTable";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@redux/store";
import { initializeChartSettings } from "@redux/slices/leadProjectCompanies";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import { PageTitle } from "@metronic/layout/core";
import Maps from "../companies/companyOverview/components/Map";
import { getAllProjects } from "@services/projects";
import { worldIcons } from "@metronic/assets/sidepanelicons";
 
const ProjectsMain = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number}[]>([]);
  const [projectData, setProjectData] = useState<any>([]);

  const dispatch = useDispatch<AppDispatch>();

 
  useEffect(() => {
    dispatch(loadAllEmployeesIfNeeded());
    dispatch(initializeChartSettings());
  }, [dispatch]);

  useEffect(() => {
    getAllProjects().then((res) => { 
      setProjectData(res?.data?.projects);
      const allCoordinates = res?.data?.projects
        ?.filter((item: any) => item.latitude && item.longitude) 
        ?.map((item: any) => ({
          lat: parseFloat(item.latitude),
          lng: parseFloat(item.longitude)
        })) || [];
      setCoordinates(allCoordinates);
    });
  }, []);


  const points = coordinates;
  
  const tabItems: TabItem[] = [
    {
      title: "Overview",
      component: <ProjectsOverviewMain />,
      icon:
        activeTab === 0
          ? leadsIcons.leadsOverviewIcon.active
          : leadsIcons.leadsOverviewIcon.default,
    },
    {
      title: "Projects",
      component: <ProjectsMainTable />,
      icon:
        activeTab === 1
          ? projectsIcons.projectsIcon.active
          : projectsIcons.projectsIcon.default,
    },
    {
      title: "World",
      component: <Maps points={points} projectData={projectData} />,
      icon:
        activeTab === 2
          ? worldIcons.worldIcon.active
          : worldIcons.worldIcon.default,
    },
    {
      title: "Configure",
      component: <ProjectConfigure />,
      icon:
        activeTab === 3
          ? leadsIcons.leadsConfigIcon.active
          : leadsIcons.leadsConfigIcon.default,
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

