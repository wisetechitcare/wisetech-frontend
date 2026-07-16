import { safeJsonParse } from '@utils/safeJson';
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
import TasksMainTable from "./tasks/TasksMainTable";
import TasksConfigure from "./configure/TasksConfigure";
// import TaskOverviewToggle from "./taskOverView/TaskOverviewToggle";
import { fetchConfiguration } from "@services/company";
import { DATE_SETTINGS_KEY } from "@constants/configurations-key";
import { canDo } from "@utils/can";


const TasksMain = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [dateSettingsEnabled, setDateSettingsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Configure is a write-only surface: hidden for read-only viewers, so the
  // whole tab (not each button inside it) is the access control.
  const canConfigure = canDo("tasks", "update");

  const dispatch = useDispatch<AppDispatch>();

 
  useEffect(() => {
    dispatch(loadAllEmployeesIfNeeded());
    dispatch(initializeChartSettings());
  }, [dispatch]);



  
    useEffect(() => {
      async function fetchDateSettings() {
        try {
          const {
            data: { configuration },
          } = await fetchConfiguration(DATE_SETTINGS_KEY);
          const parsed =
            typeof configuration.configuration === "string"
              ? safeJsonParse(configuration.configuration)
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
    },
    ...(canConfigure
      ? [{
          title: "Configure",
          component: <TasksConfigure />,
          icon:
            activeTab === 1
              ? leadsIcons.leadsConfigIcon.active
              : leadsIcons.leadsConfigIcon.default,
        }]
      : []),
  ];
  const safeActiveTab = Math.min(activeTab, tabItems.length - 1);

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

export default TasksMain;
