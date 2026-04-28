import MaterialHeaderTab, {
  TabItem,
} from "@app/modules/common/components/MaterialHeaderTab";
import { leadsIcons } from "@metronic/assets/sidepanelicons";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@redux/store";
import { initializeChartSettings } from "@redux/slices/leadProjectCompanies";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import { PageTitle } from "@metronic/layout/core";
import { getAllProjects } from "@services/projects";
import TasksMainTable from "./tasks/TasksMainTable";
import TasksConfigure from "./configure/TasksConfigure";
// import TaskOverviewToggle from "./taskOverView/TaskOverviewToggle";
import { fetchConfiguration } from "@services/company";
import { DATE_SETTINGS_KEY } from "@constants/configurations-key";

 
const TasksMain = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number}[]>([]);
  const [projectData, setProjectData] = useState<any>([]);
  const [dateSettingsEnabled, setDateSettingsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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


  
    useEffect(() => {
      async function fetchDateSettings() {
        try {
          const {
            data: { configuration },
          } = await fetchConfiguration(DATE_SETTINGS_KEY);
          const parsed =
            typeof configuration.configuration === "string"
              ? JSON.parse(configuration.configuration)
              : configuration.configuration;
          setDateSettingsEnabled(parsed?.useDateSettings ?? false);
        } catch (err) {
          console.error("Error fetching date settings", err);
          setDateSettingsEnabled(false);
        } finally {
          setIsLoading(false);
        }
      }
  
      fetchDateSettings();
    }, []);


  const points = coordinates;
  
  const tabItems: TabItem[] = [
    // {
    //   title: "Overview",
    //   component: <TaskOverviewToggle dateSettingsEnabled={dateSettingsEnabled} />,
    //   icon:
    //     activeTab === 0
    //       ? leadsIcons.leadsOverviewIcon.active
    //       : leadsIcons.leadsOverviewIcon.default,
    // },
    {
      title: "Tasks",
      component: <TasksMainTable />,
      icon:
        activeTab === 0
          ? leadsIcons.leadsOverviewIcon.active
          : leadsIcons.leadsOverviewIcon.default,
    },{
      title: "Configure",
      component: <TasksConfigure />,
      icon:
        activeTab === 1
          ? leadsIcons.leadsConfigIcon.active
          : leadsIcons.leadsConfigIcon.default,
    },
  ];

  const PorjectBreadcrumbs = [
    {
      title: 'Tasks',
      path: '/tasks',
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

export default TasksMain;
