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
import { getAllPersetTasks, getAllPriority, getAllProjectOnlySelectedFields, getAllTasks, getAllTasksStatus } from '@services/tasks';
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

const validationSchema = Yup.object().shape({
  taskName: Yup.string().required('Task name is required'),
  taskDescription: Yup.string(),
  chooseProject: Yup.string().required('Project is required'),
  assignTo: Yup.string().required('Assignee is required'),
  status: Yup.string().required('Status is required'),
  priority: Yup.string(),
});

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

    // Check if the selected status is "completed"
    const selectedStatus = taskStatus.find(status => status.id === values.status);
    const isCompletedStatus = selectedStatus?.name?.toLowerCase() === 'completed';

    // Set completion date if status is completed
    // let completionDate = selectedTask?.completionDate || null;
    // if (isCompletedStatus && !completionDate) {
    //   completionDate = new Date().toISOString();
    // }

    return {
      taskName: values.taskName,
      taskDescription: values.taskDescription,
      taskType: values.projectType === 'custom' ? 'CUSTOM' : 'PRESETS',
      projectId: values.chooseProject,
      assignedToId: values.assignTo,
      statusId: values.status,
      priorityId: values.priority,
      createdById: currentEmployeeId,
      lastEditedById: currentEmployeeId,
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
      console.error("Error saving task:", error);
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
        const { presetTaskStatuses } = await getAllPersetTasks();
        
        const projectres = await getAllProjectOnlySelectedFields();
        
        // const employeeRes = await fetchAllEmployees();
        const taskStatusRes = await getAllTasksStatus();
        const taskPriorityRes = await getAllPriority();
        const getAllTasksres = await getAllTasks();
        setProjects(projectres.projects);
        setTasks(presetTaskStatuses);
        // setEmployees(employeeRes.data?.employees);
        setTaskStatus(taskStatusRes?.taskStatuses);
        setTaskPriority(taskPriorityRes?.taskPriorities);
        setAllTasks(getAllTasksres?.data?.tasks);
      } catch (error) {
        console.error("error: ", error);
      }
    };

    getTaskName();
  }, []);


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
              assignTo: formData.assignTo || (employeesData.list?.[0]?.id || ''),
              billable: isEdit ? (formData.billable ?? 'BILLABLE') : 'BILLABLE'
            }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize

          >
            {(formikProps) => {
              const { values, setFieldValue, errors, touched, handleSubmit, isSubmitting, validateForm } = formikProps;

              useEffect(() => {
                setFormData(formikProps.values);
              }, [formikProps.values]);


              // Auto-calculate log time when start time and due time change
              useEffect(() => {
                const calculateLogTime = () => {
                  const { startTime, dueTime, logTime } = values;

                  // Skip if either time is missing
                  if (!startTime || !dueTime) return;

                  // Convert time value to string format
                  const convertToTimeString = (timeValue: string | Date): string => {
                    if (typeof timeValue === 'string') {
                      return timeValue;
                    } else if (timeValue instanceof Date) {
                      return timeValue.toTimeString().substring(0, 5);
                    }
                    return '';
                  };

                  // Parse time strings (assuming HH:mm format)
                  const parseTime = (timeStr: string) => {
                    const [hours, minutes] = timeStr.split(':').map(Number);
                    return { hours: hours || 0, minutes: minutes || 0 };
                  };

                  const startTimeStr = convertToTimeString(startTime);
                  const endTimeStr = convertToTimeString(dueTime);

                  if (!startTimeStr || !endTimeStr) return;

                  const start = parseTime(startTimeStr);
                  const end = parseTime(endTimeStr);

                  // Convert to minutes for calculation
                  const startMinutes = start.hours * 60 + start.minutes;
                  const endMinutes = end.hours * 60 + end.minutes;

                  // Handle case where end time is next day (past midnight)
                  let diffMinutes = endMinutes - startMinutes;
                  if (diffMinutes < 0) {
                    diffMinutes += 24 * 60; // Add 24 hours in minutes
                  }

                  // Convert back to hours and minutes
                  const logHours = Math.floor(diffMinutes / 60);
                  const logMinutes = diffMinutes % 60;

                  // Format as HH:mm
                  const formattedLogTime = `${logHours.toString().padStart(2, '0')}:${logMinutes.toString().padStart(2, '0')}`;

                  // Only update if the calculated time is different from current value
                  // and prevent updating if user manually changed logTime
                  if (logTime !== formattedLogTime) {
                    setFieldValue('logTime', formattedLogTime, false);
                  }
                };

                // Use timeout to prevent rapid updates
                const timeoutId = setTimeout(calculateLogTime, 100);
                return () => clearTimeout(timeoutId);
              }, [values.startTime, values.dueTime]);
              return (
                <FormikForm placeholder={""}>
                  {/* Project Details Section */}
                  <Box>
                    <Grid container spacing={1} className='card-body  p-md-10' sx={{ backgroundColor: { xs: 'transparent', md: 'white', borderRadius: '8px' } }}>
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
                          formData.projectType === 'preset' ? (
                            <DropDownInput
                              formikField="taskName"
                              isRequired={true}
                              inputLabel="Task Name"
                              options={tasks.map((task: any) => ({ value: task?.name, label: task?.name }))}
                              placeholder="Select Project"
                            />
                          ) : (
                            <TextInput formikField='taskName' label='Task Name' isRequired={true} />
                          )
                        }

                      </Grid>
                      <Grid item xs={12} md={12}>
                        <TextInput formikField='taskDescription' label='Task Description' isRequired={false} />
                      </Grid>

                      <Grid item xs={12} md={12}>
                        <DropDownInput
                          formikField="chooseProject"
                          isRequired={true}
                          inputLabel="Choose Project"
                          options={projects.map((project: any) => ({ value: project.id, label: project.title }))}
                          // options={[]}
                          placeholder="Select Project"
                        />

                      </Grid>

                      <Grid item xs={12} md={12}>
                        <DropDownInput
                          formikField="assignTo"
                          isRequired={true}
                          inputLabel="Assign To"
                          options={employeesData.list?.map((emp: any) => ({
                            value: emp.employeeId,
                            label: emp.employeeName || `Employee ${emp.employeeId}`,
                            avatar: emp.avatar,
                          })) || []}
                          showColor={true}
                          placeholder="Select Assign To"

                        />


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
                            borderColor: '#8B4444',
                            color: '#8B4444',
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
                            borderColor: '#8B4444',
                            color: '#8B4444',
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