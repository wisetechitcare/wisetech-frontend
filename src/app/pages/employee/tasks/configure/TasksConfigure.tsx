// import {
//   getAllProjectSubcategories,
//   deleteProjectSubcategory,

//   getAllProjectCategories,
//   deleteProjectCategory,

//   deleteProjectService,
//   deleteProjectStatus,
//   getAllProjectServices,
//   getAllProjectStatuses,
//   getAllStakeholders,
//   deleteStakeholderService,
// } from "@services/projects";

import {
  getAllTasksStatus,
  createTasksStatus,
  updateTasksStatus,

  getAllPriority,
  createPriority,
  updatePriority,
  
  getAllPersetTasks,
  createPresetTask,
  updatePresetTask,
  deletePresetTask,
} from "@services/tasks";
import { useEffect, useState } from "react";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { deleteConfirmation } from "@utils/modal";
import ProjectConfigForm from "./components/TaskConfigForm";
import { Container } from "react-bootstrap";
import Loader from "@app/modules/common/utils/Loader";
import { ProjectItem } from "@models/clientProject";
import { useDeleteConfirmation } from "@hooks/useDeleteConfirmation";
import { DropdownOption } from "./../../../../../types/deleteConfirmation";

// Common button styles
const buttonStyles = {
  base: {
    border: "1px solid #9D4141",
    fontWeight: 500,
    color: "#9D4141",
    backgroundColor: "transparent",
    borderRadius: "5px",
    cursor: "pointer",
    transition: "all 0.3s ease-in-out",
    paddingLeft: "20px",
    paddingRight: "20px",
    height: "40px",
  },
  hover: {
    color: "white",
    backgroundColor: "#9D4141",
  },
};



const TasksConfigure = () => {
  const [loading, setLoading] = useState(false);
  // Project Categories
  const [projectCategories, setProjectCategories] = useState<ProjectItem[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProjectItem | null>(null);
  // Project Subcategories
  const [projectSubcategories, setProjectSubcategories] = useState<
    ProjectItem[]
  >([]);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [editingSubcategory, setEditingSubcategory] =
    useState<ProjectItem | null>(null);

  // Project Services
  const [projectServices, setProjectServices] = useState<ProjectItem[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<ProjectItem | null>(null);

  // Project Statuses
  const [projectStatuses, setProjectStatuses] = useState<ProjectItem[]>([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<ProjectItem | null>(null);

  // Stakeholders
  const [stakeholders, setStakeholders] = useState<ProjectItem[]>([]);
  const [showStakeholderModal, setShowStakeholderModal] = useState(false);
  const [editingStakeholder, setEditingStakeholder] =
    useState<ProjectItem | null>(null);
  // Modal open handlers
  const handleCategoryModalOpen = () => setShowCategoryModal(true);
  const handleSubcategoryModalOpen = () => setShowSubcategoryModal(true);
  const handleStakeholderModalOpen = () => setShowStakeholderModal(true);
  const handleServiceModalOpen = () => setShowServiceModal(true);

  // Modal close handlers
  const handleCategoryModalClose = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
  };

  const handleSubcategoryModalClose = () => {
    setShowSubcategoryModal(false);
    setEditingSubcategory(null);
  };

  const handleServiceModalClose = () => {
    setShowServiceModal(false);
    setEditingService(null);
  };


  const handleStakeholderModalClose = () => {
    setShowStakeholderModal(false);
    setEditingStakeholder(null);
  };

  // Edit handlers
  const handleCategoryEdit = (category: ProjectItem) => {
    setEditingCategory(category);
    setShowCategoryModal(true);
  };

  const handleSubcategoryEdit = (subcategory: ProjectItem) => {
    setEditingSubcategory(subcategory);
    setShowSubcategoryModal(true);
  };

  const handleServiceEdit = (service: ProjectItem) => {
    setEditingService(service);
    setShowServiceModal(true);
  };

  const handleStatusEdit = (status: ProjectItem) => {
    setEditingStatus(status);
    setShowStatusModal(true);
  };

  const handleStakeholderEdit = (stakeholder: ProjectItem) => {
    setEditingStakeholder(stakeholder);
    setShowStakeholderModal(true);
  };

  // Fetch project categories
  const fetchProjectCategories = async () => {
    try {
      setLoading(true);
      const {taskStatuses} = await getAllTasksStatus();
      
      if (taskStatuses) {
        setProjectCategories(taskStatuses);
      }
    } catch (error) {
      console.error("Error fetching project categories:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch project subcategories
  const fetchProjectSubcategories = async () => {
    try {
      setLoading(true);
      const {taskPriorities} = await getAllPriority();
      if (taskPriorities) {
        setProjectSubcategories(taskPriorities);
      }
    } catch (error) {
      console.error("Error fetching project subcategories:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch project services
  const fetchProjectServices = async () => {
    try {
      setLoading(true);
      const {presetTaskStatuses} = await getAllPersetTasks();

      if (presetTaskStatuses) {
        setProjectServices(presetTaskStatuses);
      }
    } catch (error) {
      console.error("Error fetching project services:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch project statuses
  // const fetchProjectStatuses = async () => {
  //   try {
  //     setLoading(true);
  //     const response = await getAllProjectStatuses();
  //     if (response?.projectStatuses) {
  //       setProjectStatuses(response.projectStatuses);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching project statuses:", error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // // Fetch stakeholders
  // const fetchStakeholders = async () => {
  //   try {
  //     setLoading(true);
  //     const response = await getAllStakeholders();
  //     if (response?.stakeholderServices) {
  //       setStakeholders(response.stakeholderServices);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching stakeholders:", error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Event bus listeners
  useEventBus(EVENT_KEYS.projectCategoryCreated, fetchProjectCategories);
  useEventBus(EVENT_KEYS.projectSubcategoryCreated, fetchProjectSubcategories);
  useEventBus(EVENT_KEYS.projectServiceCreated, fetchProjectServices);
  // useEventBus(EVENT_KEYS.projectStatusCreated, fetchProjectStatuses);
  useEventBus(EVENT_KEYS.projectCategoryUpdated, fetchProjectCategories);
  useEventBus(EVENT_KEYS.projectSubcategoryUpdated, fetchProjectSubcategories);
  useEventBus(EVENT_KEYS.projectServiceUpdated, fetchProjectServices);
  // useEventBus(EVENT_KEYS.projectStatusUpdated, fetchProjectStatuses);
  // useEventBus(EVENT_KEYS.stakeholderCreated, fetchStakeholders);
  // useEventBus(EVENT_KEYS.stakeholderUpdated, fetchStakeholders);
  useEffect(() => {
    fetchProjectCategories();
    fetchProjectSubcategories();
    fetchProjectServices();
    // fetchProjectStatuses();
    // fetchStakeholders();
  }, []);

  // Delete confirmation hook for Project Services
  // const serviceDeleteConfirmation = useDeleteConfirmation({
  //   deleteFunction: async (itemId: string, targetId?: string) => {
  //     // Call the delete service with optional targetId for data transfer
  //     await deleteProjectService(itemId, targetId);
  //   },
  //   defaultConfig: {
  //     entityName: 'Project Service',
  //     entityDisplayName: '',
  //     showTransferOption: true,
  //     transferDescription: 'All projects and leads using this service will be transferred to the selected service.'
  //   },
  //   onSuccess: () => {
  //     fetchProjectServices(); // Refresh the list
  //   },
  //   onError: (error:any) => {
  //     console.error('Failed to delete project service:', error);
  //     alert('Failed to delete project service');
  //   }
  // });

  // New delete handler specifically for project services using the modal
  // const handleServiceDelete = (id: string) => {
  //   // Find the service being deleted to get its name
  //   const serviceToDelete = projectServices.find(service => service.id === id);
  //   const serviceName = serviceToDelete?.name || 'Unknown Service';
    
  //   // Create dropdown options from other project services (excluding the one being deleted)
  //   const dropdownOptions: DropdownOption[] = projectServices
  //     .filter(service => service.id !== id && service.id && service.name)
  //     .map(service => ({
  //       key: service.id!,
  //       value: service.name
  //     }));
    
  //   // Show the delete confirmation modal
  //   serviceDeleteConfirmation.showDeleteModal(id, serviceName, {
  //     dropdownOptions,
  //     showTransferOption: dropdownOptions.length > 0,
  //     transferDescription: dropdownOptions.length > 0 
  //       ? 'All projects and leads using this service will be transferred to the selected service.'
  //       : 'This is the last service and cannot be transferred.'
  //   });
  // };

  // Unified delete handler for all project configuration types
  // const handleDelete = async (
  //   id: string,
  //   type: "category" | "subcategory" | "service" | "status" | "stakeholder"
  // ) => {
  //   try {
  //     const confirmed = await deleteConfirmation(
  //       `Successfully deleted ${type}`
  //     );
  //     if (!confirmed) return;

  //     switch (type) {
  //       case "category":
  //         await deleteProjectCategory(id);
  //         fetchProjectCategories();
  //         break;
  //       case "subcategory":
  //         await deleteProjectSubcategory(id);
  //         fetchProjectSubcategories();
  //         break;
  //       case "service":
  //         await deleteProjectService(id);
  //         fetchProjectServices();
  //         break;
  //       case "status":
  //         await deleteProjectStatus(id);
  //         fetchProjectStatuses();
  //         break;
  //       case "stakeholder":
  //         await deleteStakeholderService(id);
  //         fetchStakeholders();
  //         break;
  //     }
  //   } catch (error) {
  //     console.error(`Error deleting ${type}:`, error);
  //   }
  // };


  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      {/* Configure Heading */}
      <div
        className="d-flex pb-4"
        style={{ fontFamily: "Barlow", fontSize: "24px", fontWeight: "600" }}
      >
        Configure
      </div>

      {/* Category Card */}
      <div
        className="card"
        style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}
      >
        <div className="card-body">
          <div  className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <h5 className="card-title" style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontStyle: "normal",
              fontSize: "16px",
              lineHeight: "100%",
              letterSpacing: "0"
            }}>Tasks Statuses</h5>
            <button
              onClick={handleCategoryModalOpen}
              className="btn"
              style={buttonStyles.base}
              onMouseEnter={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.hover)
              }
              onMouseLeave={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.base)
              }
            >
              New Status
            </button>
          </div>

          <div className="row mt-4">
            {projectCategories.map((category) => (
              <div key={category.id} className="col-12 col-md-3 mb-3">
                <div
                  className="d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: "#F2F5F8",
                    padding: "0 15px",
                    height: "40px",
                    borderRadius: "5px",
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="rounded-circle"
                      style={{
                        width: "18px",
                        height: "18px",
                        backgroundColor: category.color,
                      }}
                    ></div>
                    <div style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      fontStyle: 'normal',
                      fontSize: '14px',
                      lineHeight: '100%',
                      letterSpacing: '0',
                      cursor: "pointer"
                    }} title={category.name}>{category.name.length > 10 ? `${category.name.slice(0, 14)}...` : category.name}</div>
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleCategoryEdit(category)}
                    ></i>
                    {/* <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() => handleDelete(category.id, "category")}
                    ></i> */}
                    {category.subCategories}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subcategory Card */}
      <div
        className="card mt-5"
        style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}
      >
        <div className="card-body">
          <div  className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <h5 className="card-title" style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontStyle: "normal",
              fontSize: "16px",
              lineHeight: "100%",
              letterSpacing: "0"
            }}>Priority</h5>
            <button
              onClick={handleSubcategoryModalOpen}
              className="btn"
              style={buttonStyles.base}
              onMouseEnter={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.hover)
              }
              onMouseLeave={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.base)
              }
            >
             New Priority
            </button>
          </div>

          <div className="row mt-4">
            {projectSubcategories.map((subcategory) => (
              <div key={subcategory.id} className="col-12 col-md-3 mb-3">
                <div
                  className="d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: "#F2F5F8",
                    padding: "0 15px",
                    height: "40px",
                    borderRadius: "5px",
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="rounded-circle"
                      style={{
                        width: "18px",
                        height: "18px",
                        backgroundColor: subcategory.color,
                      }}
                    ></div>
                    <div style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      fontStyle: 'normal',
                      fontSize: '14px',
                      lineHeight: '100%',
                      letterSpacing: '0',
                      cursor: "pointer"
                    }} title={subcategory.name}>{subcategory.name.length > 10 ? `${subcategory.name.slice(0, 14)}...` : subcategory.name}</div>
                  </div>
                  <div className="ms-4 d-flex gap-3">
                     <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleSubcategoryEdit(subcategory)}
                    ></i>
                    {/*<i
                      className="fa fa-trash cursor-pointer"
                      onClick={() =>
                        handleDelete(subcategory.id, "subcategory")
                      }
                    ></i> */}
                    {/* {subcategory.subCategories} */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preset Tasks services */}
      <div
        className="card mt-5"
        style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}
      >
        <div className="card-body">
           <div  className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <h5 className="card-title" style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontStyle: "normal",
              fontSize: "16px",
              lineHeight: "100%",
              letterSpacing: "0"
            }}>Preset Tasks</h5>
            <button
              onClick={handleServiceModalOpen}
              className="btn"
              style={buttonStyles.base}
              onMouseEnter={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.hover)
              }
              onMouseLeave={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.base)
              }
            >
              New Preset Task
            </button>
          </div>
          <div className="row mt-4">
            {projectServices.map((stakeholder) => (
              <div key={stakeholder.id} className="col-12 col-md-3 mb-3">
                <div
                  className="d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: "#F2F5F8",
                    padding: "0 15px",
                    height: "40px",
                    borderRadius: "5px",
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    {/* <div
                      className="rounded-circle"
                      style={{
                        width: "18px",
                        height: "18px",
                        backgroundColor: stakeholder.color,
                      }}
                    ></div> */}
                    <div style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      fontStyle: 'normal',
                      fontSize: '14px',
                      lineHeight: '100%',
                      letterSpacing: '0',
                      cursor: "pointer"
                    }} title={stakeholder.name}>{stakeholder.name.length > 10 ? `${stakeholder.name.slice(0, 14)}...` : stakeholder.name}</div>
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleServiceEdit(stakeholder)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={async () => {
                        const confirmed = await deleteConfirmation(`Are you sure you want to delete "${stakeholder.name}"?`);
                        if (confirmed) {
                          try {
                            await deletePresetTask(stakeholder.id);
                            fetchProjectServices();
                            import("@utils/modal").then(({ successConfirmation }) => {
                              successConfirmation("Preset Task deleted successfully");
                            });
                          } catch (err) {
                            alert('Failed to delete preset task.');
                          }
                        }
                      }}
                    ></i>
                    
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* Category Modal */}
      <ProjectConfigForm
        show={showCategoryModal}
        onClose={handleCategoryModalClose}
        onSuccess={fetchProjectCategories}
        initialData={editingCategory}
        isEditing={!!editingCategory}
        type="taskStatus"
        title="Task Status"
      />

      {/* Subcategory Modal */}
      <ProjectConfigForm
        show={showSubcategoryModal}
        onClose={handleSubcategoryModalClose}
        onSuccess={fetchProjectSubcategories}
        initialData={editingSubcategory}
        isEditing={!!editingSubcategory}
        type="taskPriority"
        title="Proirity"
      />

      {/* Service Modal */}
      <ProjectConfigForm
        show={showServiceModal}
        onClose={handleServiceModalClose}
        onSuccess={fetchProjectServices}
        type="presetTask"
        title="Preset Task"
        isEditing={!!editingService}
        initialData={editingService}
      />

      
      {/* Delete Confirmation Modal for Project Services */}
      {/* {serviceDeleteConfirmation.DeleteModal} */}
    </div>
  );
};

export default TasksConfigure;