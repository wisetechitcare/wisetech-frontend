import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import { miscellaneousIcons } from "@metronic/assets/miscellaneousicons";
import { getAllProjectDataForOverviewById } from "@services/projects";
import ProjectsOverviewById from "./ProjectsOverviewById";
import BlankBasicProjectForm from "../../overview/components/BlankBasicProjectForm";
import TasksMainTable from "@pages/employee/tasks/tasks/TasksMainTable";
import ProjectTimeSheets from "./ProjectTimeSheets";
import ProjectFiles from "./ProjectFlies";
import TaskTimesheet from "@pages/employee/tasks/tasks/components/TaskTimesheet";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";

type TabType = "overview" | "tasks" | "timelog" | "files";

const AllProjectMainToggle = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [projectData, setProjectData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBlankBasicProjectForm, setShowBlankBasicProjectForm] = useState(false);

  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await getAllProjectDataForOverviewById(projectId);
      setProjectData(data?.projectDataById);
    } catch (error) {
      console.error("Error fetching project data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Real-time refresh: re-fetch this project's data whenever:
  //  - a lead syncs to this project (backend emits lead_project_synced →
  //    useRealtimeSync translates to projectUpdated)
  //  - the project is edited directly (BlankBasicProjectForm emits projectUpdated)
  useEventBus(EVENT_KEYS.projectUpdated, fetchProjectData);
  // Also refresh when the linked lead is updated (lead status change that
  // creates/deletes the project emits projectCreated/projectDeleted, handled
  // by the list; the lead field sync emits projectUpdated above).
  useEventBus(EVENT_KEYS.projectCreated, fetchProjectData);

  const handleBackClick = () => {
    navigate(-1);
  };

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "timelog", label: "Timesheet" },
    { key: "tasks", label: "Tasks" },
    { key: "files", label: "Files"}
  ];

  const renderTabContent = () => {
    if (!projectData) return null;

    switch (activeTab) {
      case "overview":
        return (
          <ProjectsOverviewById
            projectId={projectId!}
            projectData={projectData}
          />
        );
      case "tasks":
        return <TasksMainTable projectId={projectId!} />;
      case "timelog":
        return <TaskTimesheet fetchMode="project" projectId={projectId!} />
      case "files":
        return <ProjectFiles projectId={projectId!}/>
    }
  };

  // Get current tab label for mobile dropdown
  const currentTabLabel =
    tabs.find((tab) => tab.key === activeTab)?.label || "Overview";

  if (isLoading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "400px" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!projectData) {
    return (
      <div className="p-2 p-md-4">
        <div className="alert alert-warning">
          Project not found or failed to load.
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 p-md-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 mb-md-4 pt-3 pt-md-6">
        <div className="d-flex align-items-center gap-2 gap-md-3 flex-grow-1">
          <button
            className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
            onClick={handleBackClick}
          >
            <img
              src={miscellaneousIcons.leftArrow}
              alt=""
              style={{
                width: "36px",
                height: "36px",
                cursor: "pointer",
              }}
              className="d-none d-md-block"
            />
          </button>
          <div className="flex-grow-1">
            <div className="text-muted small">{`Project #${
              projectData?.prefix || "N/A"
            }`}</div>
            <div className="d-flex align-items-center gap-2">
              <h2
                className="mb-0 text-truncate"
                style={{
                  fontFamily: "Barlow",
                  fontWeight: "600",
                  fontSize: "16px",
                }}
              >
                {projectData?.title}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header Update */}
      <style>{`
        @media (max-width: 767px) {
          .mobile-header h2 {
            font-size: 18px !important;
          }
          .mobile-header .text-muted {
            font-size: 12px !important;
          }
        }

        @media (min-width: 768px) {
          .desktop-header h2 {
            font-size: 24px !important;
          }
        }
      `}</style>

      {/* Navigation Tabs + Buttons Row */}
      <div className="mb-4 mb-md-8 pt-3">
        {/* Mobile Tab Dropdown */}
        <div className="d-block d-md-none mb-3">
          <div className="d-flex justify-content-between align-items-center gap-2">
            <div className="dropdown flex-grow-1">
              <div
                className="dropdown-toggle ps-4 text-start"
                data-bs-toggle="dropdown"
                style={{
                  fontFamily: "Barlow",
                  fontWeight: "500",
                  fontSize: "14px",
                  borderColor: "#7A2124",
                  color: "#7A2124",
                }}
              >
                {currentTabLabel}
              </div>
              <ul className="dropdown-menu">
                {tabs.map((tab) => (
                  <li key={tab.key}>
                    <button
                      className={`dropdown-item ${
                        activeTab === tab.key ? "active" : ""
                      }`}
                      onClick={() => setActiveTab(tab.key as TabType)}
                      style={{
                        fontFamily: "Barlow",
                        fontWeight: "500",
                        fontSize: "14px",
                      }}
                    >
                      {tab.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mobile Action Buttons */}
            <div className="d-flex align-items-center gap-1">
              {activeTab === "overview" && (
                <Button
                  variant="primary"
                  size="sm"
                  className="dropdown-toggle"
                  data-bs-toggle="dropdown"
                  style={{
                    fontFamily: "Barlow",
                    fontWeight: "600",
                    fontSize: "12px",
                  }}
                >
                  Edit Project
                </Button>
              )}
              {/* Edit Button show only for tab overview */}
              {/* {activeTab === "overview" && (
                <Button
                  variant="primary"
                  size="sm"
                  style={{
                    fontFamily: "Barlow",
                    fontWeight: "600",
                    fontSize: "12px",
                  }}
                >
                  New Task
                </Button>
              )} */}
            </div>
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="d-none d-md-flex justify-content-between align-items-center">
          {/* Tabs */}
          <ul className="nav nav-tabs nav-line-tabs nav-line-tabs-2x fs-4 fw-bold mb-0">
            {tabs.map((tab) => (
              <li className="nav-item" key={tab.key}>
                <button
                  className={`nav-link text-active-primary  ${
                    activeTab === tab.key ? "active" : ""
                  }`}
                  onClick={() => setActiveTab(tab.key as TabType)}
                  style={{
                    border: "1px solid #7A2124",
                    color: "black",
                    borderRadius: "20px",
                    fontFamily: "Barlow",
                    fontWeight: "500",
                    fontSize: "14px",
                    padding: "8px 20px",
                    marginRight: "0px",
                  }}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>

          {/* Desktop Action Buttons */}
          <div className="d-flex align-items-center gap-2">
            {activeTab === "overview" && (
              <Button
                onClick={() => setShowBlankBasicProjectForm(true)}
                variant="primary"
                style={{
                  fontFamily: "Barlow",
                  fontWeight: "600",
                  fontSize: "16px",
                }}
              >
                Edit Project
              </Button>
            )}
            {/* Edit Button show only for tab overview */}
            {/* {activeTab === "overview" && (
              <Button
                variant="primary"
                style={{
                  fontFamily: "Barlow",
                  fontWeight: "600",
                  fontSize: "16px",
                }}
              >
                New Task
              </Button>
            )} */}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">{renderTabContent()}</div>

      <BlankBasicProjectForm
        showBlankProjectForm={showBlankBasicProjectForm}
        onHide={() => setShowBlankBasicProjectForm(false)}
        projectType={projectData?.projectTempletId}
        editingProjectId={projectId}
        selectedProjectType={projectData?.projectTempletId}
      />
    </div>
  );
};

export default AllProjectMainToggle;
