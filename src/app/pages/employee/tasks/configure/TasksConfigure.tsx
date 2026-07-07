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
import { deleteConfirmation, successConfirmation } from "@utils/modal";
import ProjectConfigForm from "./components/TaskConfigForm";
import { Container } from "react-bootstrap";
import Loader from "@app/modules/common/utils/Loader";
import { ProjectItem } from "@models/clientProject";
import { useDeleteConfirmation } from "@hooks/useDeleteConfirmation";
import { DropdownOption } from "./../../../../../types/deleteConfirmation";
import {
  ConfigPageLayout,
  ConfigSectionCard,
  C,
  FONT,
  SP,
  RADIUS,
  KEYFRAMES,
} from '@app/modules/configuration';



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

  // Helper component for item chips
  const ItemChip = ({ item, onEdit, onDelete, showColor = false, showDelete = true }: any) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: C.bgSection,
        padding: `${SP.sm} ${SP.md}`,
        borderRadius: RADIUS.lg,
        border: `1px solid ${C.border}`,
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        gap: SP.sm,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = C.bgCard;
        e.currentTarget.style.boxShadow = `0 4px 12px ${C.primaryShadow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = C.bgSection;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm, flex: 1, minWidth: 0 }}>
        {showColor && item.color && (
          <div
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: item.color,
              flexShrink: 0,
            }}
          />
        )}
        <span style={{
          fontFamily: FONT.body,
          fontSize: '13px',
          color: C.textPrimary,
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }} title={item.name}>
          {item.name}
        </span>
      </div>
      <div style={{ display: 'flex', gap: SP.xs, flexShrink: 0 }}>
        <button
          onClick={() => onEdit(item)}
          style={{
            background: 'transparent',
            border: 'none',
            color: C.info,
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = C.primary}
          onMouseLeave={(e) => e.currentTarget.style.color = C.info}
        >
          <i className="bi bi-pencil" style={{ fontSize: '14px' }} />
        </button>
        {showDelete && (
          <button
            onClick={() => onDelete(item.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: C.danger,
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#c41e3a'}
            onMouseLeave={(e) => e.currentTarget.style.color = C.danger}
          >
            <i className="bi bi-trash" style={{ fontSize: '14px' }} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <style>{KEYFRAMES}</style>
      <ConfigPageLayout
        title="Tasks Configuration"
        subtitle="Manage task statuses, priorities, and preset tasks"
        icon="bi-list-check"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>

          {/* Task Statuses Card */}
          <ConfigSectionCard
            title={`Task Statuses (${projectCategories.length})`}
            description="Define and manage different task status categories"
            icon="bi-list-ul"
            iconColor="blue"
            badge={{ label: `${projectCategories.length}`, color: C.info, bg: C.infoLight }}
            primaryAction={{
              label: 'New Status',
              icon: 'bi-plus-lg',
              onClick: handleCategoryModalOpen,
              variant: 'primary',
            }}
          >
            <div style={{ marginTop: SP.md }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: SP.md }}>
                {projectCategories.map((category) => (
                  <ItemChip
                    key={category.id}
                    item={category}
                    onEdit={handleCategoryEdit}
                    onDelete={() => {}}
                    showColor={true}
                    showDelete={false}
                  />
                ))}
                {projectCategories.length === 0 && (
                  <div style={{ textAlign: 'center', padding: SP.lg, color: C.textMuted, fontFamily: FONT.body }}>
                    <i className="bi bi-inbox" style={{ fontSize: '24px', display: 'block', marginBottom: SP.sm, opacity: 0.4 }} />
                    No statuses configured yet
                  </div>
                )}
              </div>
            </div>
          </ConfigSectionCard>

          {/* Priority Card */}
          <ConfigSectionCard
            title={`Task Priorities (${projectSubcategories.length})`}
            description="Define priority levels for task management"
            icon="bi-exclamation-circle"
            iconColor="purple"
            badge={{ label: `${projectSubcategories.length}`, color: C.purple, bg: C.purpleLight }}
            primaryAction={{
              label: 'New Priority',
              icon: 'bi-plus-lg',
              onClick: handleSubcategoryModalOpen,
              variant: 'primary',
            }}
          >
            <div style={{ marginTop: SP.md }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: SP.md }}>
                {projectSubcategories.map((subcategory) => (
                  <ItemChip
                    key={subcategory.id}
                    item={subcategory}
                    onEdit={handleSubcategoryEdit}
                    onDelete={() => {}}
                    showColor={true}
                    showDelete={false}
                  />
                ))}
                {projectSubcategories.length === 0 && (
                  <div style={{ textAlign: 'center', padding: SP.lg, color: C.textMuted, fontFamily: FONT.body }}>
                    <i className="bi bi-inbox" style={{ fontSize: '24px', display: 'block', marginBottom: SP.sm, opacity: 0.4 }} />
                    No priorities configured yet
                  </div>
                )}
              </div>
            </div>
          </ConfigSectionCard>

          {/* Preset Tasks Card */}
          <ConfigSectionCard
            title={`Preset Tasks (${projectServices.length})`}
            description="Create and manage predefined task templates"
            icon="bi-clipboard-check"
            iconColor="amber"
            badge={{ label: `${projectServices.length}`, color: C.amber, bg: C.amberLight }}
            primaryAction={{
              label: 'New Preset Task',
              icon: 'bi-plus-lg',
              onClick: handleServiceModalOpen,
              variant: 'primary',
            }}
          >
            <div style={{ marginTop: SP.md }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: SP.md }}>
                {projectServices.map((task) => (
                  <ItemChip
                    key={task.id}
                    item={task}
                    onEdit={handleServiceEdit}
                    onDelete={async (id: string) => {
                      const item = projectServices.find(t => t.id === id);
                      const confirmed = await deleteConfirmation(`Are you sure you want to delete "${item?.name}"?`);
                      if (confirmed) {
                        try {
                          await deletePresetTask(id);
                          fetchProjectServices();
                          successConfirmation("Preset Task deleted successfully");
                        } catch (err) {
                          alert('Failed to delete preset task.');
                        }
                      }
                    }}
                    showColor={false}
                    showDelete={true}
                  />
                ))}
                {projectServices.length === 0 && (
                  <div style={{ textAlign: 'center', padding: SP.lg, color: C.textMuted, fontFamily: FONT.body }}>
                    <i className="bi bi-inbox" style={{ fontSize: '24px', display: 'block', marginBottom: SP.sm, opacity: 0.4 }} />
                    No preset tasks configured yet
                  </div>
                )}
              </div>
            </div>
          </ConfigSectionCard>
        </div>
      </ConfigPageLayout>

      {/* Modals */}
      {/* Task Status Modal */}
      <ProjectConfigForm
        show={showCategoryModal}
        onClose={handleCategoryModalClose}
        onSuccess={fetchProjectCategories}
        initialData={editingCategory}
        isEditing={!!editingCategory}
        type="taskStatus"
        title="Task Status"
      />

      {/* Task Priority Modal */}
      <ProjectConfigForm
        show={showSubcategoryModal}
        onClose={handleSubcategoryModalClose}
        onSuccess={fetchProjectSubcategories}
        initialData={editingSubcategory}
        isEditing={!!editingSubcategory}
        type="taskPriority"
        title="Priority"
      />

      {/* Preset Task Modal */}
      <ProjectConfigForm
        show={showServiceModal}
        onClose={handleServiceModalClose}
        onSuccess={fetchProjectServices}
        type="presetTask"
        title="Preset Task"
        isEditing={!!editingService}
        initialData={editingService}
      />
    </>
  );
};

export default TasksConfigure;