import React from 'react'
import { IconButton, Box, Typography, Grid } from '@mui/material';
import { Close, Add, Label } from '@mui/icons-material';
import { useCallback, useEffect, useState, useRef } from 'react';
import { Formik, Form as FormikForm } from "formik";
import * as Yup from "yup";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import TextInput from "@app/modules/common/inputs/TextInput";
import { Modal, Form, Row, Col, Button } from "react-bootstrap";
import DateInput from '@app/modules/common/inputs/DateInput';
import RadioInput from '@app/modules/common/inputs/RadioInput';
import { getAllPersetTasks, getAllPriority, getAllTasks, getAllTasksStatus, getAvailableProjects, getProjectAssignees, getGeneralAssignees } from '@services/tasks';
import { getAllProjects } from '@services/projects';
import { fetchAllEmployees } from '@services/employee';
import { useSelector } from 'react-redux';
import { createTask, updateTask } from '@services/tasks';
import TimePickerInput from '@app/modules/common/inputs/TimeInput';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import TaskConfigForm from '@app/pages/employee/tasks/configure/components/TaskConfigForm';
import { Root } from 'react-dom/client';
import { RootState } from '@redux/store';

interface TaskFormModalProps {
  projectType?: string;
  taskType?: string;
  headerName?: string;
  title?: string;
  open: boolean;
  onClose?: () => void;
  onSubmit?: (data: any) => void;
  isEdit?: boolean;
  setIsEdit?: (value: boolean) => void;
  taskName?: Array<{ id: string; name: string }> | string;
  taskDescription?: string;
  chooseProject?: Array<{ id: string; name: string }> | string;
  assignTo?: Array<{ id: string; name: string }> | string;
  status?: Array<{ id: string; name: string }> | string
  priority?: Array<{ id: string; name: string }> | string
  startDate?: Date | string | null;
  startTime?: Date | string | null;
  dueDate?: Date | string | null;
  dueTime?: Date | string | null;
  logTime?: Date | string | null
  billable?: string
  selectedTask?: {
    id: string;
    completionDate?: string;
    [key: string]: any;
  } | null;
}

// Phase 3 — the project is required for PROJECT tasks and FORBIDDEN for GENERAL ones. This
// mirrors the server's `checkTaskScopeConsistency`; the server is still the authority, this
// just stops the user submitting something it will reject.
const validationSchema = Yup.object().shape({
  taskName: Yup.string().required('Task name is required'),
  taskDescription: Yup.string(),
  taskScope: Yup.string().oneOf(['PROJECT', 'GENERAL']).required(),
  chooseProject: Yup.string().when('taskScope', {
    is: 'PROJECT',
    then: (schema) => schema.required('Project is required'),
    otherwise: (schema) => schema.strip(),
  }),
  assignTo: Yup.string().required('Assignee is required'),
  status: Yup.string().required('Status is required'),
  priority: Yup.string(),
});

/**
 * Keeps the server-resolved assignee list in step with the form.
 *
 * A child component rather than an effect in the parent because scope and project live in
 * Formik state, which is only readable inside the render prop. It renders nothing.
 *
 * It also CLEARS a stale assignee: switching project or scope must not leave a previously
 * chosen employee selected, because that employee is very likely not on the new project's team
 * — and the API would reject the submit with a 403 the user could not explain.
 */
const TaskFormSelectorSync = ({
  scope,
  projectId,
  assignTo,
  assignees,
  onLoad,
  onClearAssignee,
}: {
  scope: string;
  projectId: string;
  assignTo: string;
  assignees: any[];
  onLoad: (scope: string, projectId: string) => void;
  onClearAssignee: () => void;
}) => {
  useEffect(() => {
    onLoad(scope, projectId);
  }, [scope, projectId, onLoad]);

  useEffect(() => {
    if (!assignTo) return;
    if (assignees.length === 0) return;      // still loading, or genuinely empty — leave it
    if (!assignees.some((e: any) => e.id === assignTo)) onClearAssignee();
    // `onClearAssignee` is recreated each render; depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignees, assignTo]);

  return null;
};

const TaskForm = ({
  headerName,
  open,
  title = 'Task',
  onClose = () => { },
  onSubmit = () => { },
  isEdit = false,
  setIsEdit = () => { },
  projectType = 'preset',
  taskType,
  taskName = '',
  taskDescription = '',
  chooseProject = '',
  assignTo = '',
  status = [],
  priority = [],
  startDate = new Date(),
  startTime = new Date(),
  dueDate = new Date(),
  dueTime = new Date(),
  logTime = null,
  billable = 'BILLABLE',
  selectedTask = null,
}: TaskFormModalProps) => {



  // Determine the correct projectType based on taskType from backend when editing
  const getProjectType = () => {
    if (isEdit && taskType) {
      return taskType === 'CUSTOM' ? 'custom' : 'preset';
    }
    return projectType || 'preset';
  };

  const determinedProjectType = getProjectType();

  const initialValue = {
    projectType: determinedProjectType,
    taskType: determinedProjectType === 'custom' ? 'CUSTOM' : 'PRESETS',
    // Phase 3 — scope is explicit. When editing, it comes from the stored column; the server
    // refuses to change it after creation (DEC-019), so the control is disabled in edit mode.
    taskScope: (selectedTask?.taskScope as string) || (chooseProject ? 'PROJECT' : 'PROJECT'),
    taskName: taskName || '',
    taskDescription: taskDescription || '',
    chooseProject: chooseProject || '',
    assignTo: assignTo || '',
    status: status || '',
    priority: priority || '',
    startDate: startDate || '',
    startTime: startTime || '00:00',
    dueDate: dueDate || '',
    dueTime: dueTime || '00:00',
    logTime: logTime || '',
    billable: billable ?? 'BILLABLE',
  }

  const [formData, setFormData] = useState(initialValue);
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  // Phase 3 — the assignee list is SERVER-RESOLVED and depends on scope + selected project.
  // It is never the global employee list filtered in React.
  const [assignees, setAssignees] = useState<any[]>([]);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [taskStatus, setTaskStatus] = useState<any[]>([]);
  const [taskPriority, setTaskPriority] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);

  const currentEmployeeId = useSelector((state:RootState) => state.employee?.currentEmployee?.id);

  const employeesData = useSelector((state: any) => state.allEmployees);


  const formatTaskPayload = (values: any) => {
    // Parse log time into hours, minutes, seconds
    let hours = 0, minutes = 0, seconds = 0;
    if (values.logTime) {
      const timeParts = values.logTime.split(':');
      hours = parseInt(timeParts[0], 10) || 0;
      minutes = parseInt(timeParts[1], 10) || 0;
      seconds = timeParts[2] ? parseInt(timeParts[2], 10) : 0;
    }

    const totalTimeInSeconds = (hours * 3600) + (minutes * 60) + seconds;

    // Completion is derived SERVER-SIDE from TaskStatus.isFinal (Phase 2). The old
    // name-matching on "completed" broke the moment a stage was renamed in Configure.

    const isGeneral = values.taskScope === 'GENERAL';

    return {
      taskName: values.taskName,
      taskDescription: values.taskDescription,
      taskType: values.projectType === 'custom' ? 'CUSTOM' : 'PRESETS',
      // Phase 3 — scope is explicit, and a GENERAL task carries NO project. Sending an empty
      // string here would be read as a project reference and rejected.
      taskScope: isGeneral ? 'GENERAL' : 'PROJECT',
      ...(isGeneral ? {} : { projectId: values.chooseProject }),
      assignedToId: values.assignTo,
      statusId: values.status,
      priorityId: values.priority,
      // `createdById` / `lastEditedById` are deliberately NOT sent. They are derived from the
      // session server-side (Phase 1A); `createdById` is in fact a protected field, so sending
      // it made every task UPDATE fail with 400.
      startDate: values.startDate ? new Date(values.startDate).toISOString() : null,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
      startTime: values.startTime ? new Date(`1970-01-01T${values.startTime}`).toISOString() : null,
      dueTime: values.dueTime ? new Date(`1970-01-01T${values.dueTime}`).toISOString() : null,
      // completionDate: completionDate,
      totalTimeLog: totalTimeInSeconds,
      cost: values.cost || "0.00",
      billingType: values.billable || "BILLABLE",
      logTimeHours: hours,
      logTimeMinutes: minutes,
      logTimeSeconds: seconds,
      visibility: "TEAM",
    };
  };

  
  const handleCreateTask = async (values: any) => {
    const taskData = formatTaskPayload(values);
    const response = await createTask(taskData);

    if (!response?.data) throw new Error("Failed to create task");

    successConfirmation("Task created successfully!");
    onSubmit?.(response.data);
    handleClose();
  };


  const handleUpdateTask = async (values: any, taskId: string) => {
    const taskData = formatTaskPayload(values);
    const response = await updateTask(taskId, taskData);

    if (!response?.data) throw new Error("Failed to update task");

    successConfirmation("Task updated successfully!");
    onSubmit?.(response.data);
    handleClose();
  };

 
  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      if (isEdit && selectedTask?.id) {
        await handleUpdateTask(values, selectedTask.id);
      } else {
        await handleCreateTask(values);
      }
    } catch (error: any) {
      // Phase 3 — these failures are now MEANINGFUL: a 403 says the project or assignee was
      // not permitted, a 400 says the payload broke a domain rule. Swallowing them into
      // console.error left the modal sitting there looking like nothing had happened.
      console.error("Error saving task:", error);
      const res = error?.response?.data;
      errorConfirmation(res?.detail || res?.message || error?.message || 'Unable to save task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
    if (setIsEdit) setIsEdit(false);
  };

  const handleStatusSuccess = async () => {
    try {
      const taskStatusRes = await getAllTasksStatus();
      setTaskStatus(taskStatusRes?.taskStatuses);
      setShowStatusModal(false);
    } catch (error) {
      console.error("Error refreshing status list: ", error);
    }
  };

  const handlePrioritySuccess = async () => {
    try {
      const taskPriorityRes = await getAllPriority();
      setTaskPriority(taskPriorityRes?.taskPriorities);
      setShowPriorityModal(false);
    } catch (error) {
      console.error("Error refreshing priority list: ", error);
    }
  };

  useEffect(() => {
    const getTaskName = async () => {
      try {
        setProjectsLoading(true);
        const { presetTaskStatuses } = await getAllPersetTasks();

        // Phase 3 — ONLY the projects this user may create a PROJECT task on. The server
        // decides; this list is not filtered further here.
        const projectres = await getAvailableProjects();

        const taskStatusRes = await getAllTasksStatus();
        const taskPriorityRes = await getAllPriority();
        const getAllTasksres = await getAllTasks();
        setProjects(projectres?.projects || []);
        setTasks(presetTaskStatuses);
        setTaskStatus(taskStatusRes?.taskStatuses);
        setTaskPriority(taskPriorityRes?.taskPriorities);
        setAllTasks(getAllTasksres?.data?.tasks);
      } catch (error) {
        console.error("error: ", error);
      } finally {
        setProjectsLoading(false);
      }
    };

    getTaskName();
  }, []);

  /**
   * Phase 3 — resolve the assignee list from the SERVER, keyed on scope and project.
   *
   *   PROJECT + project selected → that project's internal team, filtered to whom this caller
   *                                may actually assign (same rule the API enforces on write)
   *   PROJECT + no project yet   → empty; the project is what defines the team
   *   GENERAL                    → management scope, never project scope
   *
   * The previous form offered every employee in Redux for every task. That was never a
   * security boundary — it just meant the user picked someone the API would refuse.
   */
  const loadAssignees = useCallback(async (scope: string, projectId: string) => {
    if (scope === 'PROJECT' && !projectId) {
      setAssignees([]);
      return;
    }
    setAssigneesLoading(true);
    try {
      const res = scope === 'GENERAL'
        ? await getGeneralAssignees()
        : await getProjectAssignees(projectId);
      setAssignees(res?.assignees || []);
    } catch (error) {
      // An empty selector is the honest outcome of a failed lookup: better than falling back
      // to "every employee", which is exactly the behaviour this phase removes.
      setAssignees([]);
      console.error("error loading assignees: ", error);
    } finally {
      setAssigneesLoading(false);
    }
  }, []);

  const assigneeOptions = assignees.map((emp: any) => {
    const first = emp?.users?.firstName || '';
    const last = emp?.users?.lastName || '';
    const name = `${first} ${last}`.trim();
    return { value: emp.id, label: name || `Employee ${emp.id}`, avatar: emp.avatar };
  });


  return (
    <div>
      <Modal
        show={open}
        onHide={handleClose}
        size="lg"
        aria-labelledby="contained-modal-title-vcenter"
        centered
        className="no-header-border"
      >
        <Modal.Header closeButton >
          <Modal.Title id="contained-modal-title-vcenter">
            {title}
          </Modal.Title>
          {/* <p>{headerName}</p> */}
        </Modal.Header>

        <Modal.Body>
          <p style={{
            fontFamily: "Inter",
            fontWeight: 500,
            fontSize: "14px",
            lineHeight: "100%",
            letterSpacing: "0"
          }}>{headerName}</p>
          <Formik
            initialValues={{
              ...formData,
              // Phase 3 — no longer defaulted to "the first employee in the Redux list". That
              // default was almost never someone the caller was authorised to assign, and it
              // pre-filled a value the API would reject.
              assignTo: formData.assignTo || '',
              billable: isEdit ? (formData.billable ?? 'BILLABLE') : 'BILLABLE'
            }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize

          >
            {(formikProps) => {
              const { values, setFieldValue, errors, touched, handleSubmit, isSubmitting, validateForm } = formikProps;
              const isGeneral = values.taskScope === 'GENERAL';

              return (
                <FormikForm>
                  {/* Keeps the server-resolved assignee list in step with the scope and the
                      selected project, and clears a stale selection when either changes. */}
                  <TaskFormSelectorSync
                    scope={values.taskScope}
                    projectId={values.chooseProject as string}
                    assignTo={values.assignTo as string}
                    assignees={assignees}
                    onLoad={loadAssignees}
                    onClearAssignee={() => setFieldValue('assignTo', '')}
                  />
                  {/* Project Details Section */}
                  <Box>
                    <Grid container spacing={1} className='card-body  p-md-10' sx={{ backgroundColor: { xs: 'transparent', md: 'white', borderRadius: '8px' } }}>
                      <Grid item xs={12} md={12}>
                        <RadioInput
                          isRequired={true}
                          inputLabel="Task Scope"
                          radioBtns={[
                            { label: "Project Task", value: "PROJECT" },
                            { label: "General Task", value: "GENERAL" },
                          ]}
                          formikField="taskScope"
                          // DEC-019 — scope cannot change after creation, so don't offer it.
                          disabled={isEdit}
                        />
                      </Grid>
                      <Grid item xs={12} md={12}>
                        <RadioInput
                          isRequired={false}
                          inputLabel="Project Type"
                          radioBtns={[
                            { label: "Presets", value: "preset" },
                            { label: "Custom", value: "custom" },
                          ]}
                          formikField="projectType"

                        />
                      </Grid>
                      <Grid item xs={12} md={12}>
                        {
                          /* Reads Formik's LIVE value. It used to read `formData`, a state
                             snapshot whose setter was never called — so choosing Custom
                             submitted taskType CUSTOM while still showing the preset picker. */
                          values.projectType === 'preset' ? (
                            <DropDownInput
                              formikField="taskName"
                              isRequired={true}
                              inputLabel="Task Name"
                              options={tasks.map((task: any) => ({ value: task?.name, label: task?.name }))}
                              placeholder="Select Task"
                            />
                          ) : (
                            <TextInput formikField='taskName' label='Task Name' isRequired={true} />
                          )
                        }

                      </Grid>
                      <Grid item xs={12} md={12}>
                        <TextInput formikField='taskDescription' label='Task Description' isRequired={false} />
                      </Grid>

                      {/* PROJECT only. A GENERAL task carries no project by definition, and
                          the server rejects one outright (checkTaskScopeConsistency). */}
                      {!isGeneral && (
                        <Grid item xs={12} md={12}>
                          <DropDownInput
                            formikField="chooseProject"
                            isRequired={true}
                            inputLabel="Choose Project"
                            options={projects.map((project: any) => ({
                              value: project.id,
                              label: project.projectNumber
                                ? `${project.projectNumber} — ${project.title}`
                                : project.title,
                            }))}
                            disabled={isEdit}
                            placeholder={
                              projectsLoading
                                ? 'Loading projects…'
                                : projects.length === 0
                                  ? 'No projects available — you are not a manager of any project'
                                  : 'Select Project'
                            }
                          />
                          {!projectsLoading && projects.length === 0 && (
                            <Typography variant="caption" color="text.secondary">
                              Only projects you manage can receive project tasks. Create a General Task instead.
                            </Typography>
                          )}
                        </Grid>
                      )}

                      <Grid item xs={12} md={12}>
                        <DropDownInput
                          formikField="assignTo"
                          isRequired={true}
                          inputLabel="Assign To"
                          // Server-resolved. Never the global employee list.
                          options={assigneeOptions}
                          showColor={true}
                          placeholder={
                            assigneesLoading
                              ? 'Loading…'
                              : !isGeneral && !values.chooseProject
                                ? 'Select a project first'
                                : assigneeOptions.length === 0
                                  ? 'No assignable employees'
                                  : 'Select Assign To'
                          }
                        />
                        {!assigneesLoading && assigneeOptions.length === 0 && (isGeneral || values.chooseProject) && (
                          <Typography variant="caption" color="text.secondary">
                            {isGeneral
                              ? 'You are not permitted to assign general tasks to anyone.'
                              : "This project's internal team has no members you can assign."}
                          </Typography>
                        )}
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <DropDownInput
                          formikField="status"
                          isRequired={true}
                          inputLabel="Status"
                          options={taskStatus.map((task: any) => ({ value: task.id, label: task.name, color: task.color }))}
                          showColor={true}
                          placeholder="Select Status"
                        />
                        <div
                          onClick={() => setShowStatusModal(true)}
                          style={{
                            marginTop: '8px',
                            fontSize: '12px',
                            padding: '4px 12px',
                            borderColor: '#1E3A8A',
                            color: '#1E3A8A',
                            cursor: 'pointer',
                          }}
                        >
                          + New Status
                        </div>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <DropDownInput
                          formikField="priority"
                          isRequired={false}
                          inputLabel="Priority"
                          options={taskPriority.map((task: any) => ({ value: task.id, label: task.name, color: task.color }))}
                          showColor={true}
                          placeholder="Select Priority"
                        />
                        <div
                          onClick={() => setShowPriorityModal(true)}
                          style={{
                            marginTop: '8px',
                            fontSize: '12px',
                            padding: '4px 12px',
                            borderColor: '#1E3A8A',
                            color: '#1E3A8A',
                            cursor: 'pointer',
                          }}
                        >
                          + New Priority
                        </div>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <DateInput formikProps={formikProps} formikField='startDate' placeHolder='Start Date' inputLabel='Start Date'  isRequired={false} />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TimePickerInput formikField='startTime' label='Start Time' isRequired={false} />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <DateInput formikProps={formikProps} formikField='dueDate' placeHolder='Due Date' inputLabel='Due Date' isRequired={false} minDateField='startDate' />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TimePickerInput formikField='dueTime' label='Due Time' isRequired={false} />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TimePickerInput formikField='logTime' label='Log Time' isRequired={false} />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <DropDownInput
                          formikField="billable"
                          inputLabel="Billing Type"
                          isRequired={false}
                          // options={leadStatuses.map((s: any) => ({ value: s.id, label: s.name }))}
                          options={[
                            // {Label:"None",value:"none"},
                            { label: "Billable", value: "BILLABLE" },
                            { label: "Non Billable", value: "NON_BILLABLE" }
                          ]}
                          placeholder="Select Billable"
                        />
                      </Grid>
                    </Grid>


                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 2, mt: 3, mb: 2 }}>
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={isSubmitting}

                      >
                        {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Submit'}
                      </Button>
                    </Box>
                  </Box>
                </FormikForm>
              )
            }}
          </Formik>
        </Modal.Body>
      </Modal>

      <TaskConfigForm
        show={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onSuccess={handleStatusSuccess}
        type="taskStatus"
        title="Task Status"
        isEditing={false}
        initialData={null}
      />

      <TaskConfigForm
        show={showPriorityModal}
        onClose={() => setShowPriorityModal(false)}
        onSuccess={handlePrioritySuccess}
        type="taskPriority"
        title="Task Priority"
        isEditing={false}
        initialData={null}
      />
    </div>
  )
}

export default TaskForm