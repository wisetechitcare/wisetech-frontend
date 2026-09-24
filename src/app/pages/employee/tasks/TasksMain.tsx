import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import MaterialHeaderTab, {
  TabItem,
} from "@app/modules/common/components/MaterialHeaderTab";
import { PageTitle } from "@metronic/layout/core";
import type { AppDispatch } from "@redux/store";
import { initializeChartSettings } from "@redux/slices/leadProjectCompanies";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import { usePermission } from "@hooks/usePermission";
import { useTabRoute } from "@app/hooks/useTabRoute";
import { fetchConfiguration } from "@services/company";
import { DATE_SETTINGS_KEY } from "@constants/configurations-key";
import { safeJsonParse } from "@utils/safeJson";
import { TasksWorkspace } from "./TasksWorkspace";
import TasksConfigure from "./configure/TasksConfigure";
import TaskOverviewToggle from "./taskOverView/TaskOverviewToggle";

/**
 * The Tasks section's tab bar — the same MaterialHeaderTab every other section uses.
 *
 * The Tasks tab hosts the BOARD (TasksWorkspace), which is what /tasks has always rendered;
 * it measures its own start position (useFillViewport), so it absorbs the height of the bar
 * above it without a hard-coded offset here.
 *
 * ─── CONFIGURE IS A TAB *AND* STILL A ROUTE ──────────────────────────────────
 * /tasks/configure stays, so the page keeps its own URL to link to. The tab is the same page
 * behind the same permission — task config is shared by EVERY tenant, so deactivating a
 * status is a cross-tenant outage rather than a personal preference (Phase 0 audit §4.1),
 * and a tab that ignored that gate would hand it to everyone.
 *
 * ⚠️ The gate is UX only: the backend task-statuses / task-priorities / task-persest write
 * routes still carry no authorize(). See RSK-091.
 */
const TasksMain = () => {
  const [dateSettingsEnabled, setDateSettingsEnabled] = useState(false);
  const canConfigure = usePermission("tasks.manage.all");

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
          typeof configuration?.configuration === "string"
            ? safeJsonParse(configuration.configuration)
            : configuration?.configuration;
        setDateSettingsEnabled(parsed?.useDateSettings ?? false);
      } catch (err) {
        console.error("Error fetching date settings", err);
        setDateSettingsEnabled(false);
      }
    }

    fetchDateSettings();
  }, []);

  const tabItems: TabItem[] = useMemo(() => {
    const items: TabItem[] = [
      {
        title: "Overview",
        component: <TaskOverviewToggle dateSettingsEnabled={dateSettingsEnabled} />,
        icon: "bi-grid-1x2",
      },
      {
        title: "Tasks",
        component: <TasksWorkspace />,
        icon: "bi-check2-square",
      },
    ];

    if (canConfigure) {
      items.push({
        title: "Configure",
        component: <TasksConfigure />,
        icon: "bi-gear",
      });
    }

    return items;
  }, [dateSettingsEnabled, canConfigure]);

  /**
   * The open tab is the PATH (/tasks/tasks), so returning here lands where you left — a task's
   * "Back to tasks" used to arrive on Overview, with the board (and the ?scope= it carried)
   * never mounted. The query string is left alone, so `?scope=` still reaches the board; old
   * `?tab=` links are rewritten to the path form once.
   *
   * Slugs come from the TITLES, not an index: the Configure tab only exists for users who may
   * configure, so an index would open a different tab for different people.
   */
  const { activeTab, setActiveTab } = useTabRoute("/tasks", tabItems.map((t) => t.title));

  const TasksBreadcrumbs = [
    {
      title: "Tasks",
      path: "/tasks",
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
      <PageTitle breadcrumbs={TasksBreadcrumbs}>
        {tabItems[activeTab]?.title ?? "Tasks"}
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
