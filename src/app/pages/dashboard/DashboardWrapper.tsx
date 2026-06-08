import { useCallback, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { PageLink, PageTitle } from "../../../_metronic/layout/core";
import { PageHeadingTitle } from "@metronic/layout/components/header/page-title/PageHeadingTitle";
import { KTCard, KTCardBody } from "@metronic/helpers";
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
import TaskForm from "../employee/tasks/tasks/components/TaskForm";
import PerformanceBadge from "@pages/employee/kpis/personal/components/PerformanceBadge";
import { useNavigate } from "react-router-dom";
import DashboardAnnouncements from "./DashboardAnnouncements";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";

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
          <button
            type="button"
            className="btn btn-sm"
            style={{
              borderColor: '#9d4141',
              color: '#9d4141',
              fontFamily: 'Inter',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '6px',
              border: '1px solid #9d4141',
              padding: '8px 18px',
              whiteSpace: 'nowrap',
              display:"flex",
              flexDirection:"row",
              gap:"8px",
            }}
            onClick={() => setShowCustomizeModal(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={20}
              height={20}
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M7.99509 3.28333C8.07009 2.83167 8.46176 2.5 8.92009 2.5H11.0809C11.5393 2.5 11.9309 2.83167 12.0059 3.28333L12.1834 4.35083C12.2359 4.6625 12.4443 4.9225 12.7209 5.07583C12.7826 5.10917 12.8434 5.145 12.9043 5.18167C13.1751 5.345 13.5043 5.39583 13.8001 5.285L14.8143 4.905C15.0221 4.82684 15.2509 4.82498 15.46 4.89976C15.6691 4.97454 15.8448 5.1211 15.9559 5.31333L17.0359 7.18583C17.1468 7.37809 17.1859 7.60344 17.1462 7.8218C17.1065 8.04017 16.9907 8.23737 16.8193 8.37833L15.9834 9.0675C15.7393 9.26833 15.6184 9.57833 15.6251 9.89417C15.6263 9.96499 15.6263 10.0358 15.6251 10.1067C15.6184 10.4217 15.7393 10.7317 15.9834 10.9325L16.8201 11.6217C17.1734 11.9133 17.2651 12.4175 17.0368 12.8133L15.9551 14.6858C15.8441 14.878 15.6686 15.0246 15.4597 15.0996C15.2508 15.1745 15.0221 15.1729 14.8143 15.095L13.8001 14.715C13.5043 14.6042 13.1751 14.655 12.9034 14.8183C12.843 14.8551 12.7819 14.8906 12.7201 14.925C12.4443 15.0775 12.2359 15.3375 12.1834 15.6492L12.0059 16.7167C11.9309 17.1692 11.5393 17.5 11.0809 17.5H8.91926C8.46092 17.5 8.07009 17.1683 7.99426 16.7167L7.81676 15.6492C7.76509 15.3375 7.55676 15.0775 7.28009 14.9242C7.2183 14.8901 7.15717 14.8548 7.09676 14.8183C6.82592 14.655 6.49676 14.6042 6.20009 14.715L5.18592 15.095C4.9782 15.1729 4.74956 15.1747 4.54067 15.0999C4.33178 15.0251 4.15618 14.8787 4.04509 14.6867L2.96426 12.8142C2.85338 12.6219 2.8143 12.3966 2.85397 12.1782C2.89364 11.9598 3.0095 11.7626 3.18092 11.6217L4.01759 10.9325C4.26092 10.7325 4.38176 10.4217 4.37592 10.1067C4.37462 10.0358 4.37462 9.96499 4.37592 9.89417C4.38176 9.5775 4.26092 9.26833 4.01759 9.0675L3.18092 8.37833C3.00971 8.23741 2.89399 8.04036 2.85432 7.82219C2.81465 7.60401 2.8536 7.37884 2.96426 7.18667L4.04509 5.31417C4.15608 5.12178 4.33177 4.97505 4.54085 4.90011C4.74993 4.82518 4.97883 4.82691 5.18676 4.905L6.20009 5.285C6.49676 5.39583 6.82592 5.345 7.09676 5.18167C7.15676 5.145 7.21842 5.11 7.28009 5.075C7.55676 4.9225 7.76509 4.6625 7.81676 4.35083L7.99509 3.28333Z"
                stroke="#9D4141"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12.5 10C12.5 10.663 12.2366 11.2989 11.7678 11.7678C11.2989 12.2366 10.663 12.5 10 12.5C9.33696 12.5 8.70107 12.2366 8.23223 11.7678C7.76339 11.2989 7.5 10.663 7.5 10C7.5 9.33696 7.76339 8.70107 8.23223 8.23223C8.70107 7.76339 9.33696 7.5 10 7.5C10.663 7.5 11.2989 7.76339 11.7678 8.23223C12.2366 8.70107 12.5 9.33696 12.5 10Z"
                stroke="#9D4141"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Customize Dashboard
          </button>
        </div>

        {/* New Dashboard Layout */}
        <div className="row g-3 mb-5">
          {/* Announcements Section */}
          {isSectionEnabled("announcements") && <DashboardAnnouncements />}

          {/* MarkAttendance Component */}
          {isSectionEnabled("attendance") && (
          <div className="col-lg-5">
            <KTCard className="h-100">
              <KTCardBody>
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
      {showTaskModal && (
        <TaskForm
          open={showTaskModal}
          onClose={handleTaskModalClose}
          onSubmit={handleTaskSubmitSuccess}
          isEdit={isEdit}
          selectedTask={selectedTask}
          title={isEdit ? "Edit Task" : "Add New Task"}
          taskType={selectedTask?.taskType || 'PRESETS'}
          taskName={selectedTask?.taskName || ''}
          taskDescription={selectedTask?.taskDescription || ''}
          chooseProject={selectedTask?.project?.id || ''}
          assignTo={selectedTask?.assignedTo?.id || ''}
          status={selectedTask?.status?.id || ''}
          priority={selectedTask?.priority?.id || ''}
          billable={selectedTask?.billingType ?? "BILLABLE"}
          startDate={selectedTask?.startDate ? new Date(selectedTask.startDate).toISOString().split('T')[0] : ''}
          dueDate={selectedTask?.dueDate ? new Date(selectedTask.dueDate).toISOString().split('T')[0] : ''}
          startTime={selectedTask?.startTime ? new Date(selectedTask.startTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : ''}
          dueTime={selectedTask?.dueTime ? new Date(selectedTask.dueTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : ''}
          logTime={
            selectedTask
              ? `${String(selectedTask.logTimeHours || 0).padStart(2, '0')}:${String(selectedTask.logTimeMinutes || 0).padStart(2, '0')}:${String(selectedTask.logTimeSeconds || 0).padStart(2, '0')}`
              : undefined
          }
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
