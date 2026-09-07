import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { Formik, Form as FormikForm, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  createTasksStatus,
  updateTasksStatus,
  createPriority,
  updatePriority,
  createPresetTask,
  updatePresetTask,
  getAllPersetTasks,
  createTaskStage,
  updateTaskStage
} from "@services/tasks"
import { successConfirmation } from "@utils/modal";
import HierarchicalTaskSelect, { buildTaskOptions } from "@app/pages/employee/tasks/components/HierarchicalTaskSelect";
import { PATH_SEPARATOR, getPresetPath, getPresetSubtreeIds } from "@utils/presetTaskHierarchy";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";
import { ConfigItem } from "@models/clientProject";
import { useInvalidateTasks } from "@app/pages/employee/tasks/useTaskQueries";
import {
  CategoryLike,
  SubCategoryLike,
  buildCategoryNodes,
  nodeIdFromScope,
  scopeFromNodeId,
} from "@utils/categoryScope";
import { AppIcon } from "@app/modules/common/components/ui";

interface ConfigFormProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: ConfigItem | null;
  isEditing?: boolean;
  type: "taskStatus" | "taskPriority" | "presetTask" | "stage";
  title: string;
  // presetTask callers that already hold the list (e.g. TasksConfigure, which loads it
  // for the tree) should pass it here — avoids an internal re-fetch racing the modal's
  // first open, which would briefly show the Parent Task picker as empty.
  presetTasks?: ConfigItem[];
  // stage callers pass the project-category tree they already hold, so the scope picker opens
  // populated instead of racing its own fetch.
  categories?: CategoryLike[];
  subCategories?: SubCategoryLike[];
  // presetTask callers only — which catalogue the node is filed in. PROJECT is a job's work,
  // GENERAL is internal overhead. Set once at creation; a task never changes catalogue.
  scope?: "PROJECT" | "GENERAL";
}

const validationSchema = (type: string) => {
  const baseSchema = {
    name: Yup.string().required('Name is required'),
    // Preset tasks carry no colour — the tree derives one from the row id.
    color: type === 'presetTask'
      ? Yup.string()
      : Yup.string().required('Color is required'),
    isActive: Yup.boolean().required()
  };

  // Subcategory require a category
  if (type === 'subcategory') {
    return Yup.object().shape({
      ...baseSchema,
      categoryId: Yup.string().required('Category is required')
    });
  }

  // Tasks are OPTIONAL: a stage is often named before anyone knows what goes in it, and
  // blocking the save would mean losing the name to keep an empty list. The project type is
  // NOT optional — a stage that belongs to no category is one nothing can ever list.
  if (type === 'stage') {
    return Yup.object().shape({
      ...baseSchema,
      presetTaskIds: Yup.array().of(Yup.string()),
      scopeNodeId: Yup.string().required('Project category is required'),
    });
  }

  return Yup.object().shape(baseSchema);
};

const ProjectConfigForm: React.FC<ConfigFormProps> = ({
  show,
  onClose,
  onSuccess,
  initialData,
  isEditing = false,
  type,
  title,
  presetTasks: presetTasksProp,
  categories = [],
  subCategories = [],
  scope = "PROJECT"
}) => {
  // This screen writes through plain service calls, but the task board and the New Task dialog
  // read the same configuration through React Query with a 5-minute staleTime. Without this the
  // two caches drift: a task added here would not appear in the dialog's picker until the entry
  // aged out. Invalidating covers statuses, priorities and BOTH preset catalogues at once.
  const invalidateTasks = useInvalidateTasks();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // presetTask → every node this one could be filed under.
  const [fetchedPresetTasks, setFetchedPresetTasks] = useState<ConfigItem[]>([]);
  const presetTasks = presetTasksProp || fetchedPresetTasks;

  useEffect(() => {
    // Stages pick FROM the preset tree, so they need the same list the parent picker uses.
    if (!presetTasksProp && show && (type === "presetTask" || type === "stage")) {
      getAllPersetTasks(type === "presetTask" ? scope : "PROJECT")
        .then((res: any) => setFetchedPresetTasks(res?.presetTaskStatuses || []))
        .catch(() => setFetchedPresetTasks([]));
    }
  }, [show, type, presetTasksProp, scope]);

  // Any node may be the parent, at any depth — EXCEPT the node being edited and
  // everything beneath it, which would detach that subtree from every root. The server
  // rejects those moves too; excluding them here keeps the invalid choice off-screen.
  const parentTaskOptions = React.useMemo(() => {
    // ConfigItem types `id` as optional; a saved row always has one.
    const nodes = presetTasks.filter((t) => !!t.id) as { id: string; name: string; parentId?: string | null }[];
    // A stage REFERENCES tasks rather than being one, so no node is off-limits to it — the
    // subtree exclusion only exists to stop a preset task being filed under itself.
    if (type === 'stage') return buildTaskOptions(nodes);
    return buildTaskOptions(nodes, getPresetSubtreeIds(nodes, initialData?.id));
  }, [presetTasks, initialData?.id, type]);

  // The category tree in the picker's own shape. Cheap enough to rebuild per render, and the
  // two lists are small config data.
  const categoryOptions = React.useMemo(
    () => buildTaskOptions(buildCategoryNodes(categories, subCategories)),
    [categories, subCategories]
  );

  /** The picked node's own hierarchy — "Industrial → Factory" — so the scope is unambiguous. */
  const scopeLabel = (nodeId: string): string => {
    const nodes = buildCategoryNodes(categories, subCategories);
    return getPresetPath(nodes, nodeId).join(PATH_SEPARATOR);
  };

  /** The chosen parent's own hierarchy, so it is obvious where this task will sit. */
  const parentPathFor = (parentId?: string) =>
    parentId ? getPresetPath(presetTasks as { id: string; name: string; parentId?: string | null }[], parentId) : [];

  // const needsCategory = type === 'subcategory';

  // useEffect(() => {
  //   if (show && needsCategory) {
  //     fetchCategories();
  //   }
  // }, [show, type, needsCategory]);

  // const fetchCategories = async () => {
  //   try {
  //     setLoadingCategories(true);
  //     const response = await getAllProjectCategories();
  //     console.log("Fetched Categories:", response);
  //     if (response && response.projectCategories) {
  //       setCategories(response.projectCategories);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching categories:', error);
  //     setError('Failed to load categories');
  //   } finally {
  //     setLoadingCategories(false);
  //   }
  // };

  const initialValues = {
    name: initialData?.name || "",
    color: initialData?.color || "#1E3A8A",
    isActive: initialData?.isActive ?? true,
    categoryId: initialData?.categoryId || "",
    // Preset from the tree's "Add child" action, or the row's current parent when editing.
    parentId: initialData?.parentId || "",
    // Stages only — the membership, in stage order. The API returns it as `tasks`; the form
    // works in plain ids and sends them back as one ordered list.
    presetTaskIds:
      initialData?.presetTaskIds
      || initialData?.tasks?.map((t) => t.presetTaskId ?? t.presetTask?.id).filter(Boolean) as string[]
      || [],
    // Scratch field for the stage's "add a task" picker — never submitted. It resets to empty
    // after every pick so the control reads as an ADD action, not a single-value selection.
    taskPicker: "",
    // Stages only — the picked category OR subcategory node. One field, because the picker
    // returns one id; it is split back into the (categoryId, subCategoryId) pair on submit.
    scopeNodeId: nodeIdFromScope({
      categoryId: initialData?.categoryId,
      subCategoryId: initialData?.subCategoryId ?? null,
    }),
  };

  type ApiFunction = ((id: string, payload: any) => Promise<any>) | ((payload: any) => Promise<any>);

  const getApiFunction = (type: string, isEditing: boolean): ApiFunction => {
    console.log("type ===========>",type)
    if (isEditing) {
      switch (type) {
        case "taskStatus": return updateTasksStatus;
        case "taskPriority": return updatePriority;
        case "presetTask": return updatePresetTask;
        case "stage": return updateTaskStage;
        default: throw new Error(`Unknown type: ${type}`);
      }
    } else {
      switch (type) {
        case "taskStatus": return createTasksStatus;
        case "taskPriority": return createPriority;
        case "presetTask": return createPresetTask;
        case "stage": return createTaskStage;
        default: throw new Error(`Unknown type: ${type}`);
      }
    }
  };

  const getEventKey = (type: string) => {
    switch (type) {
      case "taskStatus": return EVENT_KEYS.taskPriorityCreated;
      case "taskPriority": return EVENT_KEYS.taskStatusCreated;
      case "presetTask": return EVENT_KEYS.presetTaskCreated;
      case "stage": return EVENT_KEYS.taskStageCreated;
      default: throw new Error(`Unknown type: ${type}`);
    }
  };

  const handleSubmit = async (values: typeof initialValues) => {
    setError("");
    setIsSubmitting(true);

    try {
      const apiFunction = getApiFunction(type, isEditing);
      // console.log("types ===========:", type, "isEditing ===========:", isEditing, "apiFunction ===========:", apiFunction);
      // Prepare the payload based on the type
      const payload: any = {
        name: values.name,
        isActive: values.isActive,
        // ...(type === 'subcategory' && values.categoryId ? { categoryId: values.categoryId } : {})
      };
      // Only include color if not presetTask
      if (type !== 'presetTask') {
        payload.color = values.color;
      } else {
        // Only preset tasks carry a parent; null = a top-level task.
        payload.parentId = values.parentId || null;
        // Sent on create only — the server rejects a parent from the other catalogue, and a
        // saved task never moves between them.
        if (!isEditing) payload.scope = scope;
      }

      // The whole membership, every save — the server replaces the stage's task list with it,
      // so the order on screen is the order stored.
      if (type === 'stage') {
        payload.presetTaskIds = values.presetTaskIds;
        // One picked node → the pair the API stores. The server re-checks that the subcategory
        // belongs to the category, so a stale tree here cannot file a stage under two branches.
        const scope = scopeFromNodeId(values.scopeNodeId, subCategories);
        payload.categoryId = scope?.categoryId;
        payload.subCategoryId = scope?.subCategoryId ?? null;
      }

      if (isEditing && initialData?.id) {
        await (apiFunction as (id: string, payload: any) => Promise<any>)(initialData.id, payload);
        successConfirmation(`${effectiveTitle} updated successfully`);
      } else {
        await (apiFunction as (payload: any) => Promise<any>)(payload);
        successConfirmation(`${effectiveTitle} created successfully`);
      }

      const eventKey = getEventKey(type);
      eventBus.emit(eventKey, { id: isEditing ? "updated" : "created" });
      invalidateTasks();

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      const action = isEditing ? "update" : "create";
      // `detail` carries the specific reason (e.g. a rejected circular move); `message`
      // is only the generic status text.
      setError(
        err.response?.data?.detail
        || err.response?.data?.message
        || `Failed to ${action} ${effectiveTitle.toLowerCase()}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldLabel = (type: string) => {
    switch (type) {
      case 'taskStatus': return 'Task Status Name';
      case 'taskPriority': return 'Task Priority Name';
      // The name is always the node's OWN name — never its path.
      case 'presetTask': return 'Task Name';
      case 'stage': return 'Stage Name';
      default: return 'Name';
    }
  };

  const getFieldPlaceholder = (type: string) => {
    switch (type) {
      case 'taskStatus': return 'Enter task status name';
      case 'taskPriority': return 'Enter task priority name';
      case 'presetTask': return 'Enter task name';
      case 'stage': return 'e.g. Design, Execution';
      default: return 'Enter name';
    }
  };

  // Every level is the same entity, so the modal reads "Preset Task" at any depth.
  const effectiveTitle = title;

  if (!show) return null;

  return (
    <>
      <Modal show={show} onHide={onClose} centered style={{ zIndex: 1500 }}>
        <Modal.Header closeButton style={{ borderBottom: 'none', paddingBottom: '8px' }}>
          <Modal.Title style={{ fontWeight: '600', fontSize: '18px', color: '#1a1a1a' }}>
            {isEditing ? "Edit" : "New"} {effectiveTitle}
          </Modal.Title>
        </Modal.Header>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema(type)}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, setFieldValue }) => (
            <FormikForm>
              <Modal.Body style={{ paddingTop: '16px' }}>
                {error && <div className="alert alert-danger mb-3">{error}</div>}
                {/* Name Input */}
                <div className="mb-4">
                  <label
                    className="form-label"
                    style={{
                      fontWeight: '500',
                      color: '#1a1a1a',
                      fontSize: '14px',
                      marginBottom: '8px'
                    }}
                  >
                    {getFieldLabel(type)}
                    <span
                      style={{
                        color: '#dc3545',
                        marginLeft: '4px',
                        fontSize: '14px'
                      }}
                    >
                      *
                    </span>
                  </label>
                  <Field
                    name="name"
                    type="text"
                    placeholder={getFieldPlaceholder(type)}
                    className="form-control"
                    style={{
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      color: '#6c757d',
                      fontFamily: 'Inter, sans-serif',
                    }}
                    disabled={isSubmitting}
                  />
                  <ErrorMessage name="name" component="div" className="text-danger mt-1" />
                </div>

                {/* Parent Task — one searchable picker over the whole tree. Choosing a
                    parent is what places this node in the hierarchy; leaving it empty
                    makes it a root. A node can be moved to any branch except its own. */}
                {type === 'presetTask' && (
                  <div className="mb-4">
                    <HierarchicalTaskSelect
                      formikField="parentId"
                      inputLabel={
                        <>
                          Parent Task <span style={{ color: '#6c757d', fontWeight: 400, marginLeft: 4 }}>(optional)</span>
                        </>
                      }
                      options={parentTaskOptions}
                      placeholder="None — top-level task"
                      helpText={
                        <div className="text-muted mt-1" style={{ fontSize: '12px' }}>
                          {values.parentId ? (
                            <>
                              <span style={{ fontWeight: 500 }}>Parent:</span>{' '}
                              {parentPathFor(values.parentId).join(PATH_SEPARATOR)}
                              {values.name ? (
                                <>
                                  <br />
                                  <span style={{ fontWeight: 500 }}>{isEditing ? 'Full hierarchy:' : 'Will be created as:'}</span>{' '}
                                  {[...parentPathFor(values.parentId), values.name].join(PATH_SEPARATOR)}
                                </>
                              ) : null}
                            </>
                          ) : (
                            'Leave empty for a top-level task. Pick any task to file this one under it.'
                          )}
                        </div>
                      }
                    />
                  </div>
                )}

                {/* Project type — which category (or one subcategory within it) these phases
                    belong to. Same drill-down picker as the task field below, over the category
                    tree: the whole category and any single subcategory are both selectable,
                    which a grouped select could not offer. */}
                {type === 'stage' && (
                  <div className="mb-4">
                    <HierarchicalTaskSelect
                      formikField="scopeNodeId"
                      isRequired
                      inputLabel="Project Category"
                      options={categoryOptions}
                      placeholder="Search categories & subcategories…"
                      helpText={
                        <div className="text-muted mt-1" style={{ fontSize: '12px' }}>
                          {values.scopeNodeId
                            ? scopeLabel(values.scopeNodeId)
                            : 'Pick a category for the whole type, or a subcategory for just that one.'}
                        </div>
                      }
                    />
                  </div>
                )}

                {/* Stage tasks — the stage's whole content. The picker ADDS from the preset
                    tree (one searchable control over every level); chosen tasks are listed
                    below in stage order and removed from the list itself. A stage references
                    preset tasks, it never copies or moves them. */}
                {type === 'stage' && (
                  <div className="mb-4">
                    <HierarchicalTaskSelect
                      formikField="taskPicker"
                      inputLabel={
                        <>
                          Tasks <span style={{ color: '#6c757d', fontWeight: 400, marginLeft: 4 }}>(optional)</span>
                        </>
                      }
                      options={parentTaskOptions.filter((o) => !values.presetTaskIds.includes(o.value))}
                      placeholder="Search preset tasks to add…"
                      onChange={(option) => {
                        if (!option) return;
                        if (!values.presetTaskIds.includes(option.value)) {
                          setFieldValue('presetTaskIds', [...values.presetTaskIds, option.value], true);
                        }
                        // Clear the control so the next pick starts fresh.
                        setFieldValue('taskPicker', '', false);
                      }}
                      helpText={
                        <div className="text-muted mt-1" style={{ fontSize: '12px' }}>
                          Pick tasks from Project Tasks. They stay in the task tree — this only
                          records which of them belong to this stage.
                        </div>
                      }
                    />

                    {values.presetTaskIds.length > 0 && (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {values.presetTaskIds.map((taskId, index) => {
                          const path = getPresetPath(
                            presetTasks as { id: string; name: string; parentId?: string | null }[],
                            taskId
                          );
                          return (
                            <div
                              key={taskId}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                backgroundColor: '#f8f9fa',
                                border: '1px solid #e9ecef',
                                borderRadius: '8px',
                                padding: '8px 12px',
                              }}
                            >
                              <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12px', color: '#adb5bd', flexShrink: 0 }}>{index + 1}</span>
                                <span
                                  style={{
                                    fontSize: '13px',
                                    color: '#1a1a1a',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                  // The full path disambiguates two tasks of the same name in
                                  // different branches — the same rule the tree search follows.
                                  title={path.join(PATH_SEPARATOR)}
                                >
                                  {path.join(PATH_SEPARATOR) || taskId}
                                </span>
                              </div>
                              <button
                                type="button"
                                aria-label={`Remove ${path.join(PATH_SEPARATOR) || 'task'} from this stage`}
                                onClick={() =>
                                  setFieldValue(
                                    'presetTaskIds',
                                    values.presetTaskIds.filter((id) => id !== taskId),
                                    true
                                  )
                                }
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#c0392b',
                                  cursor: 'pointer',
                                  lineHeight: 1,
                                  padding: '2px 4px',
                                  flexShrink: 0,
                                }}
                              >
                                <AppIcon name="bi-x-lg" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <ErrorMessage name="presetTaskIds" component="div" className="text-danger mt-1" />
                  </div>
                )}

                {/* Color Picker — preset tasks don't store a colour, the tree derives one. */}
                {type !== 'presetTask' && (
                <div className="mb-4">
                  <label
                    className="form-label"
                    style={{
                      fontWeight: '500',
                      color: '#1a1a1a',
                      fontSize: '14px',
                      marginBottom: '8px'
                    }}
                  >
                    Choose Color
                  </label>
                  <div className="position-relative">
                    <div
                      className="d-flex align-items-center justify-content-between"
                      style={{
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #e9ecef',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#6c757d'
                      }}
                      onClick={() => document.getElementById("colorInput")?.click()}
                    >
                      <div className="d-flex align-items-center">
                        <div
                          className="rounded-circle me-3"
                          style={{
                            width: '20px',
                            height: '20px',
                            backgroundColor: values.color,
                            border: '2px solid #fff',
                            boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
                          }}
                        />
                        <span>Choose Color</span>
                      </div>
                      <span
                        className="text-uppercase fw-medium"
                        style={{ fontSize: '12px', color: '#6c757d' }}
                      >
                        {values.color}
                      </span>
                    </div>
                    <input
                      id="colorInput"
                      type="color"
                      name="color"
                      value={values.color || '#1E3A8A'}
                      onChange={(e) => {
                        setFieldValue("color", e.target.value, true);
                      }}
                      onBlur={() => {
                        if (!values.color) {
                          setFieldValue("color", "#1E3A8A", true);
                        }
                      }}
                      style={{
                        opacity: 0,
                        position: 'absolute',
                        width: '1px',
                        height: '1px',
                        overflow: 'hidden',
                        padding: 0,
                        border: 'none',
                        pointerEvents: 'none'
                      }}
                    />
                  </div>
                  <ErrorMessage name="color" component="div" className="text-danger mt-1" />
                </div>
                )}
              </Modal.Body>

              <Modal.Footer style={{ borderTop: 'none', paddingTop: '0' }}>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: '#1E3A8A',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 24px',
                    fontWeight: '500',
                    fontSize: '14px'
                  }}
                >
                  {isSubmitting ? "Saving..." : isEditing ? "Update" : "Save"}
                </Button>
              </Modal.Footer>
            </FormikForm>
          )}
        </Formik>
      </Modal>

      <style jsx>{`
        .form-control:focus,
        .form-select:focus {
          background-color: #fff !important;
          border-color: #1E3A8A !important;
          box-shadow: 0 0 0 0.2rem rgba(30, 58, 138, 0.1) !important;
          color: #495057 !important;
        }
        
        .form-control::placeholder {
          color: #adb5bd !important;
        }
        
        .modal-content {
          border-radius: 12px !important;
          border: none !important;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1) !important;
        }
        
        .btn-close {
          font-size: 12px !important;
          opacity: 0.6 !important;
        }
        
        .btn-primary:hover {
          background-color: #172554 !important;
        }
        
        .btn-secondary:hover {
          background-color: #5a6268 !important;
        }
        
        .btn-primary:disabled,
        .btn-secondary:disabled {
          background-color: #ccc !important;
          opacity: 0.6 !important;
        }
      `}</style>
    </>
  );
};

export default ProjectConfigForm;