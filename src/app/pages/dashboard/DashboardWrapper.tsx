import { useCallback, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { PageLink, PageTitle } from "../../../_metronic/layout/core";
import { PageHeadingTitle } from "@metronic/layout/components/header/page-title/PageHeadingTitle";
import { KTCard, KTCardBody, KTIcon } from "@metronic/helpers";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@redux/store";
import TodoCard from "./Todo";
import UpcomingEventsCard from "./UpcomingThings";
import PendingRequestsTable from "./PendingRequestsTable";
import DashboardLeaderboard from "./DashboardLeaderboard";
import DashboardGraph from "./DashboardGraph";
import DashboardKpi from "./DashboardKpi";
import DashboardLoans from "./DashboardLoans";
import DashboardOngoingLoans from "./DashboardOngoingLoans";
import DashboardAttendance from "./DashboardAttendance";
import DashboardTasks from "./DashboardTasks";
import DashboardDailyAttendanceOverview from "./DashboardDailyAttendanceOverview";
import CustomizeDashboard from "./CustomizeDashboard";
import type { AppDispatch } from "@redux/store";
import { initializeChartSettings } from "@redux/slices/leadProjectCompanies";
import { useDashboardSettings } from "./useDashboardSettings";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import TaskFormDialog, { taskRowToDialogTask } from "@pages/employee/tasks/components/TaskFormDialog";
import PerformanceBadge from "@pages/employee/kpis/personal/components/PerformanceBadge";
import { useNavigate } from "react-router-dom";
import DashboardAnnouncements from "./DashboardAnnouncements";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { WtButton } from "@app/modules/common/components/ui";

const dashboardBreadCrumbs: Array<PageLink> = [
  {
    title: "Home",
    path: "/dashboard",
    isSeparator: false,
    isActive: false,
  },
  {
    title: "",
    path: "/dashboard",
    isSeparator: true,
    isActive: false,
  },
];

const DashboardPage = () => {
  // Tasks related states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Performance Badge states
  const [remark, setRemark] = useState<string>("");
  const [rank, setRank] = useState<number>(0);
  const [yourPoints, setYourPoints] = useState<number>(0);
  const [maxTotal, setMaxTotal] = useState<number>(0);
  const fromAdmin = false; // Set to true if viewing from admin perspective

  // Customize Dashboard Modal state
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [settingsRefreshKey, setSettingsRefreshKey] = useState(0);

  // Dashboard settings hook (key forces re-render when settings change)
  const { isSectionEnabled, refreshSettings } = useDashboardSettings();

  const dispatch = useDispatch<AppDispatch>();

  const navigate = useNavigate();

  const handleSettingsChange = () => {
    setSettingsRefreshKey((prev) => prev + 1);
  };

  // Listen to dashboard settings updated event
  useEventBus(EVENT_KEYS.dashboardSettingsUpdated, useCallback(() => {
    refreshSettings();
  }, [refreshSettings]));

  useEffect(() => {
    // Initialize chart settings and fetch roles/permissions when app loads
    dispatch(initializeChartSettings());
    dispatch(fetchRolesAndPermissions() as any);
  }, [dispatch]);

  useEffect(() => {
    // We have to show toolbar only for dashboard page
    document.getElementById("kt_layout_toolbar")?.classList.remove("d-none");
    return () => {
      document.getElementById("kt_layout_toolbar")?.classList.add("d-none");
    };
  }, []);


  // Task handler functions
  const handleNewTaskClick = () => {
    setSelectedTask(null);
    setIsEdit(false);
    setShowTaskModal(true);
  };

  const handleEditTask = (task: any) => {
    setSelectedTask(task);
    setIsEdit(true);
    setShowTaskModal(true);
  };

  const handleTaskModalClose = () => {
    setShowTaskModal(false);
    setSelectedTask(null);
    setIsEdit(false);
  };

  const handleTaskSubmitSuccess = (taskData: any) => {
    handleTaskModalClose();
    // Task list will be refreshed in DashboardTasks component
  };

  return (
    <>
      <div className="px-lg-9 px-4 py-3">
        <div className="d-flex align-items-center justify-content-between w-100 mb-4">
          <PageHeadingTitle />
          <WtButton
            inverted
            type="button"
            startIcon={<KTIcon iconName="setting-2" className="fs-3" />}
            onClick={() => setShowCustomizeModal(true)}
          >
            Customize Dashboard
          </WtButton>
        </div>

        {/* New Dashboard Layout */}
        <div className="row g-3 mb-5">
          {/* Announcements Section */}
          {isSectionEnabled("announcements") && <DashboardAnnouncements />}

          {/* MarkAttendance Component */}
          {isSectionEnabled("attendance") && (
          <div className="col-lg-5 col-md-12 mb-3 mb-lg-0 d-flex flex-column">
            <KTCard className="h-100">
              <KTCardBody className="h-100 d-flex flex-column">
                <DashboardAttendance />
              </KTCardBody>
            </KTCard>
          </div>
          )}

        </div>

        {/* Daily Attendance Overview Section */}
        { isSectionEnabled("dailyAttendanceOverview") && <DashboardDailyAttendanceOverview />}

        {/* Tasks Section */}
        {isSectionEnabled("tasks") && (
        <DashboardTasks
          onNewTaskClick={handleNewTaskClick}
          onEditTask={handleEditTask}
        />
        )}

        {/* Existing Todo and Events Cards */}
        <div className="row mt-5">
          {isSectionEnabled("upcomingEvents") && (
          <div className="col-lg-6 mb-5 mt-sm-0">
            <UpcomingEventsCard />
          </div>
          )}

          {isSectionEnabled("todoCard") && (
          <div className="col-lg-6 mb-5 mt-sm-0">
            <TodoCard />
          </div>
          )}
        </div>

        {/* Reminders Table */}
        {/* <div className="row mt-5">
          <div className="col-12 mb-5">
            <RemindersTable />
          </div>
        </div> */}

        {/* Pending Requests Table */}
        {isSectionEnabled("pendingRequests") && (
        <div className="row mt-5">
          <div className="col-12 mb-5">
            <PendingRequestsTable />
          </div>
        </div>
        )}

        {/* Leaderboard Section */}
        {isSectionEnabled("leaderboard") && (
        <div className="row mt-5">
          <div className="col-12 mb-5">
            <DashboardLeaderboard />
          </div>
        </div>
        )}

        {/* Lead Analytics Graphs */}
        {isSectionEnabled("analyticsGraphs") && (
        <div className="row mt-5">
          <div className="col-12 mb-5">
            <DashboardGraph />
          </div>
        </div>
        )}

        {/* All Loans Overview Section */}
        {/* {isSectionEnabled("allLoans") && (
        <div className="row mt-5">
          <div className="col-12 mb-5">
            <DashboardLoans />
          </div>
        </div>
        )} */}

        {/* Ongoing Loans Overview Section */}
        {isSectionEnabled("ongoingLoans") && (
        <div className="row mt-5">
          <div className="col-12 mb-5">
            <DashboardOngoingLoans />
          </div>
        </div>
        )}
        
        {/* My KPI Section */}
        {isSectionEnabled("kpiSection") && (
        <div className="row mt-5">
          <div className="col-12 mb-5">
            <DashboardKpi fromAdmin={fromAdmin} />
          </div>
        </div>
        )}

        {/* Performance Badge - Only show if remark exists */}
        {remark && (
          <PerformanceBadge
            remark={remark}
            rank={rank}
            yourPoints={yourPoints}
            maxTotal={maxTotal}
            fromAdmin={fromAdmin}
          />
        )}
      </div>
      {/* 
      <div className="row mt-8">
        <div className="col-lg-4">
          <img
            src={toAbsoluteUrl("media/svg/misc/imp-dates.svg")}
            style={{
              width: "60px",
              height: "40px",
              objectFit: "contain",
            }}
          />
        </div>

        <div className="col-lg-4">
          <img
            src={toAbsoluteUrl("media/svg/misc/reminders.svg")}
            style={{
              width: "60px",
              height: "40px",
              objectFit: "contain",
            }}
          />
        </div>
      </div> */}

      {/* Task Form Modal */}
      {/* The one task form — this screen used the older one. */}
      {showTaskModal && (
          <TaskFormDialog
          open={showTaskModal}
          onClose={handleTaskModalClose}
          onSaved={() => handleTaskSubmitSuccess(null)}
          task={isEdit ? taskRowToDialogTask(selectedTask) : null}
        />
      )}

      {/* Customize Dashboard Modal */}
      <CustomizeDashboard
        show={showCustomizeModal}
        onHide={() => setShowCustomizeModal(false)}
        onSettingsChange={handleSettingsChange}
      />
    </>
  );
};

const DashboardWrapper = () => {
  const intl = useIntl();
  return (
    <>
      <PageTitle breadcrumbs={dashboardBreadCrumbs}>
        {intl.formatMessage({ id: "MENU.DASHBOARD" })}
      </PageTitle>

      <DashboardPage />
    </>
  );
};

export { DashboardWrapper };
