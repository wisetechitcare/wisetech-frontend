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

import { ActionIconButton } from '@app/modules/common/components/ui';
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
import { useNavigate } from "react-router-dom";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { deleteConfirmation, errorConfirmation, successConfirmation } from "@utils/modal";
import ProjectConfigForm from "./components/TaskConfigForm";
import PresetTaskTree from "./components/PresetTaskTree";
import { Container } from "react-bootstrap";
import Loader from "@app/modules/common/utils/Loader";
import { ProjectItem } from "@models/clientProject";
import { useDeleteConfirmation } from "@hooks/useDeleteConfirmation";
import { getPresetChildren, getPresetPath, PATH_SEPARATOR } from "@utils/presetTaskHierarchy";
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
  const navigate = useNavigate();
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
  const handleServiceModalOpen = () => {
    setEditingService(null);
    setShowServiceModal(true);
  };

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

  // "Add child" from any tree row → open the New Preset Task modal with that row
  // preselected as the parent (no id → create mode). Works at any depth.
  const handleAddChildTask = (parentId: string) => {
    setEditingService({ parentId } as ProjectItem);
    setShowServiceModal(true);
  };

  // A node with children cannot be deleted: cascading a soft-delete down a tree of
  // unknown depth is not recoverable from this screen. The server enforces this too
  // (409) — checking here as well just saves a round-trip and gives a clearer message.
  const handlePresetTaskDelete = async (id: string) => {
    const item = projectServices.find((t) => t.id === id);
    const children = getPresetChildren(projectServices as any, id);

    if (children.length > 0) {
      const names = children.slice(0, 3).map((c: any) => c.name).join(', ');
      const more = children.length > 3 ? `, +${children.length - 3} more` : '';
      await errorConfirmation(
        `"${item?.name}" has ${children.length} child task${children.length > 1 ? 's' : ''} (${names}${more}). ` +
        'Move or delete them first.'
      );
      return;
    }

    const path = getPresetPath(projectServices as any, id);
    const confirmed = await deleteConfirmation(
      path.length > 1
        ? `Delete "${item?.name}" from ${path.slice(0, -1).join(PATH_SEPARATOR)}?`
        : `Are you sure you want to delete "${item?.name}"?`
    );
    if (!confirmed) return;

    try {
      await deletePresetTask(id);
      fetchProjectServices();
      successConfirmation("Preset Task deleted successfully");
    } catch (err: any) {
      // The server refuses when children appeared meanwhile — show its reason verbatim.
      await errorConfirmation(
        err?.response?.data?.detail || err?.response?.data?.message || 'Failed to delete preset task.'
      );
    }
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


  // Only the FIRST load blanks the page. A refetch after a save used to flip this too, which
  // unmounted the whole tree and reset the scroll position to the top — so saving a subtask
  // three screens down meant scrolling back to find it.
  if (loading && !projectServices.length && !projectCategories.length && !projectSubcategories.length) {
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
      <div style={{ display: 'flex', gap: SP.xs, alignItems: 'center', flexShrink: 0 }}>
        <ActionIconButton iconName="pencil" title="Edit" onClick={() => onEdit(item)} size="sm" />
        {showDelete && (
          <ActionIconButton
            iconName="trash"
            title="Delete"
            tone="danger"
            onClick={() => onDelete(item.id)}
            size="sm"
          />
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
        // This is its own route now rather than a tab beside the board, so it needs an explicit
        // way back — `breadcrumbs` is accepted by the layout but never rendered, so the action
        // slot is the one that actually reaches the screen.
        actions={
          <ActionIconButton
            iconName="arrow-left"
            title="Back to tasks"
            // The banner is brand navy, so the default (built to read on a white card)
            // all but disappeared on it.
            tone="onBrand"
            onClick={() => navigate('/tasks')}
          />
        }
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

          {/* Preset Tasks — a recursive task tree. Every row is the same kind of node
              and can take children, however deep the branch already runs. */}
          <ConfigSectionCard
            title={`Preset Tasks (${projectServices.length})`}
            description="A task tree of any depth. Use the row actions to add a task under any task."
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
              <PresetTaskTree
                presetTasks={projectServices}
                onAddChild={handleAddChildTask}
                onEditTask={handleServiceEdit}
                onDeleteTask={handlePresetTaskDelete}
              />
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

      {/* Preset Task Modal — also creates child tasks (initialData carries only a
          parentId in that case, so there is no id and it stays in create mode). */}
      <ProjectConfigForm
        show={showServiceModal}
        onClose={handleServiceModalClose}
        onSuccess={fetchProjectServices}
        type="presetTask"
        title="Preset Task"
        isEditing={!!editingService?.id}
        initialData={editingService}
        // Already loaded for the tree — pass it down so the Parent Task picker resolves
        // immediately instead of racing the modal's own fetch on first open.
        presetTasks={projectServices}
      />
    </>
  );
};

export default TasksConfigure;