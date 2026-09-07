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

import { ActionIconButton, AppIcon, ViewModeSwitch } from '@app/modules/common/components/ui';
import {
  getAllTasksStatus,
  createTasksStatus,
  updateTasksStatus,

  deleteTasksStatus,

  getAllPriority,
  createPriority,
  updatePriority,
  deletePriority,

  getAllPersetTasks,
  createPresetTask,
  updatePresetTask,
  deletePresetTask,

  getAllTaskStages,
  deleteTaskStage,
} from "@services/tasks";
import { useEffect, useState } from "react";
import { useEventBus } from "@hooks/useEventBus";
import { useInvalidateTasks } from "@app/pages/employee/tasks/useTaskQueries";
import { EVENT_KEYS } from "@constants/eventKeys";
import { deleteConfirmation, errorConfirmation, successConfirmation } from "@utils/modal";
import ProjectConfigForm from "./components/TaskConfigForm";
import PresetTaskTree from "./components/PresetTaskTree";
import StageBoard, { StageView } from "./components/StageBoard";
import {
  CategoryLike,
  SubCategoryLike,
  buildCategoryNodes,
  nodeIdFromScope,
  scopeFromNodeId,
} from "@utils/categoryScope";
import { HierarchicalTaskPicker, buildTaskOptions } from "@app/pages/employee/tasks/components/HierarchicalTaskSelect";
import { getAllProjectCategories, getAllProjectSubcategories } from "@services/projects";
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



// Bootstrap Icon CLASSES, not AppIcon names: the mapped keenicons do not read as "grid" and
// "list", which is the one thing an icon-only control has to get right.
const STAGE_VIEW_OPTIONS = [
  { value: 'grid' as const, icon: 'bi-grid-3x3-gap-fill', label: 'Grid view' },
  { value: 'list' as const, icon: 'bi-list-ul', label: 'List view' },
];

const TasksConfigure = () => {
  // Deletes here must reach the React Query cache the board and the New Task dialog read from,
  // for the same reason saves do — see the note in TaskConfigForm.
  const invalidateTasks = useInvalidateTasks();
  const [loading, setLoading] = useState(false);
  // Settings first: statuses and priorities are the vocabulary the other two tabs are written
  // in, so it is the tab someone lands on with nothing configured yet.
  const [activeTab, setActiveTab] = useState('settings');
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

  // General tasks — the SAME entity and the same tree as project tasks, in the other
  // catalogue (`scope: GENERAL`). Internal overhead with no project: the New Task dialog
  // offers this tree when "General task" is chosen, and the project one otherwise.
  const [generalTasks, setGeneralTasks] = useState<ProjectItem[]>([]);
  const [showGeneralTaskModal, setShowGeneralTaskModal] = useState(false);
  const [editingGeneralTask, setEditingGeneralTask] = useState<ProjectItem | null>(null);

  // Stages — a named bundle of preset tasks. NOT the board's stage/lane (that is a task
  // status); this one only records which preset tasks make up a phase of work.
  const [stages, setStages] = useState<ProjectItem[]>([]);
  const [showStageModal, setShowStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState<ProjectItem | null>(null);
  // Cards read best for a handful of stages, the list for a long configuration — which one
  // suits depends on the data, so it is the user's choice rather than a fixed layout.
  const [stageView, setStageView] = useState<StageView>('grid');
  // Optional FILTER over the board, not a gate: every project type and its stages are shown by
  // default, and picking a node narrows to that one. Empty = show everything.
  const [scopeNodeId, setScopeNodeId] = useState('');
  const [categories, setCategories] = useState<CategoryLike[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryLike[]>([]);

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
  const handleScopeChange = (nodeId: string) => {
    setScopeNodeId(nodeId);
    fetchStages(nodeId);
  };

  const handleGeneralTaskModalOpen = () => {
    setEditingGeneralTask(null);
    setShowGeneralTaskModal(true);
  };
  const handleGeneralTaskModalClose = () => {
    setShowGeneralTaskModal(false);
    setEditingGeneralTask(null);
  };
  const handleGeneralTaskEdit = (task: ProjectItem) => {
    setEditingGeneralTask(task);
    setShowGeneralTaskModal(true);
  };
  const handleAddGeneralChildTask = (parentId: string) => {
    setEditingGeneralTask({ parentId } as ProjectItem);
    setShowGeneralTaskModal(true);
  };

  const handleStageModalOpen = () => {
    // The destination is chosen INSIDE the dialog. When the board is filtered to one type that
    // is the obvious default, so it is pre-filled — but it stays editable, which is what makes
    // one Add button enough for every project type.
    const scope = scopeFromNodeId(scopeNodeId, subCategories);
    setEditingStage(
      scope
        ? ({ id: '', name: '', color: '#1E3A8A', isActive: true, ...scope } as ProjectItem)
        : null
    );
    setShowStageModal(true);
  };
  const handleStageModalClose = () => {
    setShowStageModal(false);
    setEditingStage(null);
  };
  const handleStageEdit = (stage: ProjectItem) => {
    setEditingStage(stage);
    setShowStageModal(true);
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

  /**
   * The delete flow every config row shares: confirm, call, refetch, report.
   *
   * `announce: false` because the server is the one that decides — a status still holding
   * tasks, or a priority still set on some, is REFUSED, and announcing success on confirm
   * (this helper's default) would tell the user the row was gone while it was still on screen.
   * The server's `detail` is shown verbatim: it names how many tasks are in the way.
   */
  const handleConfigDelete = async (
    label: string,
    item: ProjectItem,
    remove: (id: string) => Promise<unknown>,
    refetch: () => void,
  ) => {
    const confirmed = await deleteConfirmation(
      `Are you sure you want to delete "${item.name}"?`, 'Delete', 'Deleted', false,
    );
    if (!confirmed) return;

    try {
      await remove(item.id);
      refetch();
      invalidateTasks();
      successConfirmation(`${label} deleted successfully`);
    } catch (err: any) {
      await errorConfirmation(
        err?.response?.data?.detail || err?.response?.data?.message || `Failed to delete ${label.toLowerCase()}.`
      );
    }
  };

  // A node with children cannot be deleted: cascading a soft-delete down a tree of
  // unknown depth is not recoverable from this screen. The server enforces this too
  // (409) — checking here as well just saves a round-trip and gives a clearer message.
  const handlePresetTaskDelete = (id: string) =>
    deletePresetTaskFrom(id, projectServices, fetchProjectServices, 'Project Task');
  const handleGeneralTaskDelete = (id: string) =>
    deletePresetTaskFrom(id, generalTasks, fetchGeneralTasks, 'General Task');

  // Both catalogues are the same entity and the same rules — one flow, told which list it is
  // working on. The child check mirrors the server's 409 to save a round-trip.
  const deletePresetTaskFrom = async (
    id: string,
    list: ProjectItem[],
    refetch: () => void,
    label: string,
  ) => {
    const item = list.find((t) => t.id === id);
    const children = getPresetChildren(list as any, id);

    if (children.length > 0) {
      const names = children.slice(0, 3).map((c: any) => c.name).join(', ');
      const more = children.length > 3 ? `, +${children.length - 3} more` : '';
      await errorConfirmation(
        `"${item?.name}" has ${children.length} child task${children.length > 1 ? 's' : ''} (${names}${more}). ` +
        'Move or delete them first.'
      );
      return;
    }

    const path = getPresetPath(list as any, id);
    // `announce: false` — the server can still refuse (children appeared meanwhile), and the
    // default announces success the moment the user confirms, before the call is even made.
    const confirmed = await deleteConfirmation(
      path.length > 1
        ? `Delete "${item?.name}" from ${path.slice(0, -1).join(PATH_SEPARATOR)}?`
        : `Are you sure you want to delete "${item?.name}"?`,
      'Delete', 'Deleted', false,
    );
    if (!confirmed) return;

    try {
      await deletePresetTask(id);
      refetch();
      invalidateTasks();
      successConfirmation(`${label} deleted successfully`);
    } catch (err: any) {
      // The server refuses when children appeared meanwhile — show its reason verbatim.
      await errorConfirmation(
        err?.response?.data?.detail || err?.response?.data?.message || `Failed to delete ${label.toLowerCase()}.`
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

  const fetchGeneralTasks = async () => {
    try {
      setLoading(true);
      const { presetTaskStatuses } = await getAllPersetTasks('GENERAL');
      if (presetTaskStatuses) {
        setGeneralTasks(presetTaskStatuses);
      }
    } catch (error) {
      console.error("Error fetching general tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  // The project-category tree the stage scope picker chooses from. Both lists are small,
  // cached lookups — one load serves the picker on the tab and the one in the modal.
  const fetchCategoryTree = async () => {
    try {
      const [cats, subs] = await Promise.all([
        getAllProjectCategories(),
        getAllProjectSubcategories(),
      ]);
      setCategories(cats?.projectCategories || []);
      setSubCategories(subs?.projectSubCategories || []);
    } catch (error) {
      console.error("Error fetching project categories:", error);
    }
  };

  // Stages with their task membership — every project type's, or one type's when the filter is
  // set. Takes the scope as an argument rather than reading state, so the refetch after a save
  // cannot race the filter.
  const fetchStages = async (nodeId: string = scopeNodeId) => {
    const scope = scopeFromNodeId(nodeId, subCategories) ?? undefined;

    try {
      setLoading(true);
      const { presetStages } = await getAllTaskStages(scope);
      setStages(presetStages || []);
    } catch (error) {
      console.error("Error fetching stages:", error);
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
  useEventBus(EVENT_KEYS.taskStageCreated, () => fetchStages());
  useEventBus(EVENT_KEYS.taskStageUpdated, () => fetchStages());
  // useEventBus(EVENT_KEYS.projectStatusUpdated, fetchProjectStatuses);
  // useEventBus(EVENT_KEYS.stakeholderCreated, fetchStakeholders);
  // useEventBus(EVENT_KEYS.stakeholderUpdated, fetchStakeholders);
  useEffect(() => {
    fetchProjectCategories();
    fetchProjectSubcategories();
    fetchProjectServices();
    fetchGeneralTasks();
    fetchCategoryTree();
    fetchStages();
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


  // The category tree in the picker's own shape — shared by the tab's scope picker and the
  // stage modal's, so both offer exactly the same choices.
  const categoryOptions = buildTaskOptions(buildCategoryNodes(categories, subCategories));

  // Only the FIRST load blanks the page. A refetch after a save used to flip this too, which
  // unmounted the whole tree and reset the scroll position to the top — so saving a subtask
  // three screens down meant scrolling back to find it.
  if (loading && !projectServices.length && !projectCategories.length && !projectSubcategories.length) {
    return <Loader />;
  }

  // Helper component for item chips
  const ItemChip = ({ item, onEdit, onDelete, showColor = false, showDelete = true, meta }: any) => (
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
        <div style={{ minWidth: 0 }}>
          <span style={{
            fontFamily: FONT.body,
            fontSize: '13px',
            color: C.textPrimary,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
          }} title={item.name}>
            {item.name}
          </span>
          {meta && (
            <span style={{ fontFamily: FONT.body, fontSize: '11px', color: C.textMuted }}>
              {meta}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: SP.xs, alignItems: 'center', flexShrink: 0 }}>
        <ActionIconButton iconName="pencil" title="Edit" onClick={() => onEdit(item)} size="sm" />
        {showDelete && (
          <ActionIconButton
            iconName="trash"
            title="Delete"
            tone="danger"
            onClick={() => onDelete(item)}
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
        subtitle="Manage task statuses, priorities, project tasks and stages"
        icon="bi-list-check"
        tabs={[
          { id: 'settings', label: 'Settings', icon: 'bi-gear', badge: projectCategories.length + projectSubcategories.length },
          { id: 'tasks', label: 'Project Tasks', icon: 'bi-clipboard-check', badge: projectServices.length },
          { id: 'general', label: 'General Tasks', icon: 'bi-house-door', badge: generalTasks.length },
          { id: 'stages', label: 'Stages', icon: 'bi-diagram-3', badge: stages.length },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>

          {/* Only the active tab's sections are mounted. The page was one column of four cards
              plus a preset tree deep enough to scroll past everything below it; tabs mean a
              screen answers one question at a time. */}
          {activeTab === 'settings' && (
            <>
            <ConfigSectionCard
              title="Task Statuses"
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
                      onDelete={() =>
                        handleConfigDelete('Task status', category, deleteTasksStatus, fetchProjectCategories)
                      }
                      showColor={true}
                    />
                  ))}
                  {projectCategories.length === 0 && (
                    <div style={{ textAlign: 'center', padding: SP.lg, color: C.textMuted, fontFamily: FONT.body }}>
                      <AppIcon name="bi-inbox" className="fs-1" style={{ display: 'block', marginBottom: SP.sm, opacity: 0.4 }} />
                      No statuses configured yet
                    </div>
                  )}
                </div>
              </div>
            </ConfigSectionCard>

            <ConfigSectionCard
              title="Task Priorities"
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
                      onDelete={() =>
                        handleConfigDelete('Task priority', subcategory, deletePriority, fetchProjectSubcategories)
                      }
                      showColor={true}
                    />
                  ))}
                  {projectSubcategories.length === 0 && (
                    <div style={{ textAlign: 'center', padding: SP.lg, color: C.textMuted, fontFamily: FONT.body }}>
                      <AppIcon name="bi-inbox" className="fs-1" style={{ display: 'block', marginBottom: SP.sm, opacity: 0.4 }} />
                      No priorities configured yet
                    </div>
                  )}
                </div>
              </div>
            </ConfigSectionCard>
            </>
          )}

          {activeTab === 'tasks' && (
            <>
            {/* Project Tasks — a recursive task tree. Every row is the same kind of node and
                can take children, however deep the branch already runs.
                Renamed from "Preset Tasks" on screen only: the entity, table and endpoints stay
                `preset_tasks`, because renaming a schema to match a label is churn that breaks
                every caller for nothing. */}
            <ConfigSectionCard
              title="Project Tasks"
              description="A task tree of any depth. Use the row actions to add a task under any task."
              icon="bi-clipboard-check"
              iconColor="amber"
              badge={{ label: `${projectServices.length}`, color: C.amber, bg: C.amberLight }}
              primaryAction={{
                label: 'New Project Task',
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
            </>
          )}

          {activeTab === 'general' && (
            <>
              {/* General Tasks — the SAME tree as Project Tasks, in the other catalogue.
                  Internal work with no project: the New Task dialog offers this one when
                  "General task" is chosen. Deliberately the same component and the same modal,
                  because it is the same entity — only `scope` differs. */}
              <ConfigSectionCard
                title="General Tasks"
                description="Internal work with no project. A task tree of any depth — use the row actions to add a task under any task."
                icon="bi-house-door"
                iconColor="teal"
                badge={{ label: `${generalTasks.length}`, color: C.info, bg: C.infoLight }}
                primaryAction={{
                  label: 'New General Task',
                  icon: 'bi-plus-lg',
                  onClick: handleGeneralTaskModalOpen,
                  variant: 'primary',
                }}
              >
                <div style={{ marginTop: SP.md }}>
                  <PresetTaskTree
                    presetTasks={generalTasks}
                    onAddChild={handleAddGeneralChildTask}
                    onEditTask={handleGeneralTaskEdit}
                    onDeleteTask={handleGeneralTaskDelete}
                  />
                </div>
              </ConfigSectionCard>
            </>
          )}

          {activeTab === 'stages' && (
            <>
            {/* Stages — a named bundle of project tasks ("Design", "Execution"). Built FROM
                the Tasks tab: a stage references tasks from that tree, it never copies or moves
                them. This is not the board's stage/lane — that is a Task Status. */}
            <ConfigSectionCard
              title="Stages"
              description="Stages are grouped by project category. Each stage names the tasks that make up one phase of work."
              icon="bi-diagram-3"
              iconColor="green"
              badge={{ label: `${stages.length}`, color: C.success, bg: C.successLight }}
              // Sits immediately left of the primary action, which is where the layout switch
              // belongs — it changes what the section below shows, not what the page does.
              headerRight={
                <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm }}>
                  {/* A FILTER, not a step: the board lists every project type and its stages by
                      default, and this narrows to one. Same drill-down control as the dialog, so
                      filtering and filing offer the same choices. Sized rather than fluid — it
                      shares the header row with the layout switch and the Add button. */}
                  <div style={{ width: '240px' }}>
                    <HierarchicalTaskPicker
                      value={scopeNodeId}
                      onChange={(option) => handleScopeChange(option?.value || '')}
                      options={categoryOptions}
                      placeholder="All categories"
                    />
                  </div>
                  {scopeNodeId && (
                    <ActionIconButton
                      iconName="cross"
                      title="Clear filter"
                      size="sm"
                      onClick={() => handleScopeChange('')}
                    />
                  )}
                  <ViewModeSwitch<StageView>
                    options={STAGE_VIEW_OPTIONS}
                    value={stageView}
                    onChange={setStageView}
                    ariaLabel="Stage layout"
                  />
                </div>
              }
              primaryAction={{
                label: 'Add',
                icon: 'bi-plus-lg',
                onClick: handleStageModalOpen,
                variant: 'primary',
              }}
            >
              <div style={{ marginTop: SP.md }}>
                <StageBoard
                  stages={stages as any}
                  view={stageView}
                  // The same list the tree above renders — a task added moments ago resolves its
                  // chain without a refetch.
                  presetTasks={projectServices as any}
                  // "Add Task" opens the stage's own editor, which already holds the picker AND
                  // the current list — a second dialog that could only add would be the same
                  // control with half the abilities.
                  onAddTask={(stage) => handleStageEdit(stage as any)}
                  onEditStage={(stage) => handleStageEdit(stage as any)}
                  onDeleteStage={(stage) =>
                    handleConfigDelete('Stage', stage as any, deleteTaskStage, () => fetchStages())
                  }
                />
              </div>
            </ConfigSectionCard>
            </>
          )}
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
        title="Project Task"
        isEditing={!!editingService?.id}
        initialData={editingService}
        // Already loaded for the tree — pass it down so the Parent Task picker resolves
        // immediately instead of racing the modal's own fetch on first open.
        presetTasks={projectServices}
      />

      {/* General Task Modal — the same form as a project task; `scope` is what files it in
          the other catalogue, and the parent picker only ever offers general tasks. */}
      <ProjectConfigForm
        show={showGeneralTaskModal}
        onClose={handleGeneralTaskModalClose}
        onSuccess={fetchGeneralTasks}
        type="presetTask"
        title="General Task"
        scope="GENERAL"
        isEditing={!!editingGeneralTask?.id}
        initialData={editingGeneralTask}
        presetTasks={generalTasks}
      />

      {/* Stage Modal — the task picker is fed the same preset list the tree renders, so a task
          added moments ago is selectable without a refetch. */}
      <ProjectConfigForm
        show={showStageModal}
        onClose={handleStageModalClose}
        // Refetch against the CURRENT scope. A stage moved to another type simply leaves this
        // board, which is the honest result of the move.
        onSuccess={() => fetchStages()}
        initialData={editingStage}
        isEditing={!!editingStage?.id}
        type="stage"
        title="Stage"
        presetTasks={projectServices}
        categories={categories}
        subCategories={subCategories}
      />
    </>
  );
};

export default TasksConfigure;