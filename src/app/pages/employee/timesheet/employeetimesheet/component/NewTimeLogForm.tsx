import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import RadioInput from "@app/modules/common/inputs/RadioInput";
import TextInput from "@app/modules/common/inputs/TextInput";
import TimePickerInput from "@app/modules/common/inputs/TimeInput";
import Loader from "@app/modules/common/utils/Loader";
import { Box, Typography, DialogContent } from "@mui/material";
import { RootState } from "@redux/store";
import { getAllProjects } from "@services/projects";
import { createTimeSheet, getAllTasks } from "@services/tasks";
import { successConfirmation } from "@utils/modal";
import { Form, Row, Col, Button, Modal } from "react-bootstrap";
import { Formik, Form as FormikForm, Field, FieldArray } from "formik";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import * as Yup from "yup";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { CloseButton } from "react-bootstrap";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";
import { getTimesheetById } from "@services/tasks";
import { updateTimeSheetById } from "@services/tasks";
dayjs.extend(duration);

interface NewTimeLogForm {
  projectId: string;
  taskId?: string;
  employeeId: string;
  startTime: Date | string;
  endTime?: Date | string;
  description?: string;
  billable: boolean | string;
  logTime?: string;
  logTimeHours?: number;
  logTimeMinutes?: number;
  logTimeSeconds?: number;
}

const validationSchema = Yup.object().shape({
  projectId: Yup.string().required("Project is required"),
  taskId: Yup.string().required("Task is required"),
  startTime: Yup.mixed().required("Start time is required"),
  endTime: Yup.mixed().optional(),
  description: Yup.string().optional(),
  billable: Yup.string()
    .oneOf(["true", "false"])
    .required("Billable is required"),
  logTimeHours: Yup.number().required("Log time hours is required"),
  logTimeMinutes: Yup.number().required("Log time minutes is required"),
  logTimeSeconds: Yup.number().required("Log time seconds is required"),
});

const NewTimeLogForm = ({
  show,
  onClose,
  timeSheetId,
  prefilledProjectId,
  prefilledTaskId,
}: {
  show: boolean;
  onClose: () => void;
  timeSheetId?: string;
  prefilledProjectId?: string;
  prefilledTaskId?: string;
}) => {
  const employeeId = useSelector(
    (state: RootState) => state?.employee?.currentEmployee?.id
  );

  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [editTimeSheetData, setEditTimeSheetData] = useState<any>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    const fetchProjectsAndTasks = async () => {
      setLoading(true);
      setIsDataLoaded(false);
      const [projectsData, tasksData] = await Promise.all([
        getAllProjects(),
        getAllTasks(),
      ]);
      setProjects(projectsData?.data?.projects);
      setTasks(tasksData?.data?.tasks);
      setLoading(false);

      // If not in edit mode, we can show the form now
      if (!timeSheetId) {
        setIsDataLoaded(true);
      }
    };
    fetchProjectsAndTasks();
  }, [open, timeSheetId]);

  useEffect(() => {
    const fetchEditTimeSheetData = async () => {
      if (!timeSheetId) return;
      setLoading(true);
      setIsDataLoaded(false);
      try {
        const editTimeSheetData = await getTimesheetById(timeSheetId!);
        setEditTimeSheetData(editTimeSheetData?.timeSheet);
        // Only set data as loaded when we have the timesheet data in edit mode
        setIsDataLoaded(true);
      } catch (error) {
        console.error("Error fetching timesheet data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEditTimeSheetData();
  }, [timeSheetId]);

  const pad = (n: number) => String(n ?? 0).padStart(2, "0");

  const logTime = editTimeSheetData
    ? `${pad(editTimeSheetData.logTimeHours)}:${pad(
        editTimeSheetData.logTimeMinutes
      )}:${pad(editTimeSheetData.logTimeSeconds)}`
    : "00:00:00";

  const formatTime = (time: string | Date): string => {
    let dateObj: Date;

    if (typeof time === "string") {
      dateObj = new Date(time);
    } else {
      dateObj = time;
    }

    const hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    const seconds = dateObj.getSeconds();

    return [hours, minutes, seconds]
      .map((v) => String(v).padStart(2, "0"))
      .join(":");
  };

  const initialValues: NewTimeLogForm = {
    projectId: editTimeSheetData?.projectId || prefilledProjectId || "",
    taskId: editTimeSheetData?.taskId || prefilledTaskId || "",
    employeeId: editTimeSheetData?.employeeId || "",
    startTime: editTimeSheetData?.startTime
      ? formatTime(editTimeSheetData?.startTime)
      : new Date(),
    endTime: editTimeSheetData?.endTime
      ? formatTime(editTimeSheetData?.endTime)
      : new Date(),
    description: editTimeSheetData?.description || "",
    billable: editTimeSheetData?.billable !== undefined ? (editTimeSheetData.billable ? "true" : "false") : "true",
    logTime: logTime,
    logTimeHours: editTimeSheetData?.logTimeHours || 0,
    logTimeMinutes: editTimeSheetData?.logTimeMinutes || 0,
    logTimeSeconds: editTimeSheetData?.logTimeSeconds || 0,
  };

  const handleSubmit = async (
    values: NewTimeLogForm & { logTime?: string }
  ) => {
    setLoading(true);
    try {
      const [hours, minutes, seconds] = values.logTime
        ? values.logTime.split(":").map((v) => parseInt(v, 10))
        : [0, 0, 0];

      const formatDateForBackend = (timeValue: Date | string) => {
        if (!timeValue) return null;

        if (typeof timeValue === "string") {
          if (/^\d{1,2}:\d{1,2}(:\d{1,2})?$/.test(timeValue)) {
            let dateToUse = new Date();

            if (editTimeSheetData) {
              const isStartTime = timeValue === values.startTime;
              const originalDate = isStartTime
                ? new Date(editTimeSheetData.startTime)
                : new Date(editTimeSheetData.endTime);

              if (originalDate && !isNaN(originalDate.getTime())) {
                dateToUse = originalDate;
              }
            }

            const [hours, minutes, seconds = "00"] = timeValue.split(":");

            dateToUse.setHours(parseInt(hours, 10));
            dateToUse.setMinutes(parseInt(minutes, 10));
            dateToUse.setSeconds(parseInt(seconds, 10));

            return dateToUse.toISOString();
          } else {
            return new Date(timeValue).toISOString();
          }
        } else {
          return timeValue.toISOString();
        }
      };

      const formData = {
        ...values,
        employeeId: employeeId || "",
        startTime: formatDateForBackend(values.startTime),
        endTime: values.endTime ? formatDateForBackend(values.endTime) : null,
        logTimeHours: hours,
        logTimeMinutes: minutes,
        logTimeSeconds: seconds,
        billable: values.billable === "true" ? true : false,
      };
      delete formData.logTime;
      if (timeSheetId) {
        await updateTimeSheetById(timeSheetId, formData);
      } else {
        await createTimeSheet(formData);
      }
      eventBus.emit(EVENT_KEYS.NewTimeLogFromCreated, {});
      if (timeSheetId) {
        successConfirmation("Time log updated successfully");
      } else {
        successConfirmation("Time log created successfully");
      }
      onClose();
      setEditTimeSheetData(null);
    } catch (error) {
      console.error("Error creating time log", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={() => onClose()}
      PaperProps={{
        style: {
          backgroundColor: "white",
          boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.1)",
          borderRadius: "8px",
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <CloseButton onClick={() => onClose()} className="float-end" />
        <Typography
          variant="h6"
          sx={{ mb: 0, fontWeight: 600 }}
          fontFamily="Barlow"
          fontSize="24px"
          fontWeight="600"
        >
          {timeSheetId ? "Edit Time Log" : "Add Time Log"}
        </Typography>
      </Box>

      <DialogContent>
        {loading && <Loader />}

        {!loading && !isDataLoaded && timeSheetId && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "500px",
            }}
          >
            {/* <Typography variant="body1">Loading time log data...</Typography> */}
          </Box>
        )}

        {!loading && isDataLoaded && (
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize={true}
            validateOnMount={false}
            validateOnChange={true}
            validateOnBlur={true}
          >
            {({ values, setFieldValue, isSubmitting, errors }) => {
              useEffect(() => {
                if (values.startTime && values.endTime) {
                  let start, end;
                  let isEndTimeDefault = false;

                  if (!editTimeSheetData?.endTime) {
                    const now = new Date();
                    if (typeof values.endTime === "string") {
                      const endTimeHours = parseInt(
                        values.endTime.split(":")[0],
                        10
                      );
                      const endTimeMinutes = parseInt(
                        values.endTime.split(":")[1],
                        10
                      );
                      isEndTimeDefault =
                        endTimeHours === now.getHours() &&
                        Math.abs(endTimeMinutes - now.getMinutes()) <= 1;
                    } else if (values.endTime instanceof Date) {
                      isEndTimeDefault =
                        values.endTime.getHours() === now.getHours() &&
                        Math.abs(
                          values.endTime.getMinutes() - now.getMinutes()
                        ) <= 1;
                    }
                  }

                  if (isEndTimeDefault) {
                    return;
                  }

                  if (typeof values.startTime === "string") {
                    start =
                      dayjs().format("YYYY-MM-DD") + " " + values.startTime;
                    start = dayjs(start);
                  } else {
                    start = dayjs(values.startTime);
                  }

                  if (typeof values.endTime === "string") {
                    end = dayjs().format("YYYY-MM-DD") + " " + values.endTime;
                    end = dayjs(end);
                  } else {
                    end = dayjs(values.endTime);
                  }

                  if (start.isValid() && end.isValid()) {
                    if (end.isBefore(start)) {
                      end = end.add(1, "day");
                    }

                    if (end.isAfter(start)) {
                      const diff = dayjs.duration(end.diff(start));
                      const hh = String(diff.hours()).padStart(2, "0");
                      const mm = String(diff.minutes()).padStart(2, "0");
                      const ss = String(diff.seconds()).padStart(2, "0");

                      setFieldValue("logTime", `${hh}:${mm}:${ss}`, false);
                    }
                  }
                }
              }, [
                values.startTime,
                values.endTime,
                setFieldValue,
                editTimeSheetData?.endTime,
              ]);

              return (
                <FormikForm placeholder={undefined}>
                  <Box sx={{ mb: 2 }}>
                    <DropDownInput
                      options={projects?.map((project: any) => ({
                        label: project?.title,
                        value: project?.id,
                      }))}
                      placeholder="Choose Project"
                      formikField="projectId"
                      inputLabel="Choose Project"
                      isRequired={true}
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <DropDownInput
                      options={tasks?.map((task: any) => ({
                        label: task?.taskName,
                        value: task?.id,
                      }))}
                      placeholder="Choose Task"
                      formikField="taskId"
                      inputLabel="Choose Task"
                      isRequired={true}
                    />
                  </Box>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <TimePickerInput
                        formikField="startTime"
                        label="Start time"
                        isRequired={true}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <TimePickerInput
                        formikField="endTime"
                        label="End time"
                        isRequired={true}
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-12 mb-3">
                      <TextInput
                        formikField="logTime"
                        label="Log time"
                        isRequired={true}
                        placeholder="hh:mm:ss"
                        readonly={true}
                      />
                    </div>
                  </div>

                  <Box sx={{ mb: 2 }}>
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      className="form-control employee__form_wizard__input"
                      as="textarea"
                      rows={4}
                      name="description"
                      value={values.description}
                      onChange={(e) =>
                        setFieldValue("description", e.target.value)
                      }
                      // style={{
                      //   fontFamily: "Barlow",
                      //   fontSize: "14px",
                      //   fontWeight: "400",
                      //   color: "#2B2B2B",
                      //   borderRadius: "8px",
                      //   padding: "1px",
                      // }}
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <RadioInput
                      radioBtns={[
                        { label: "Yes", value: "true" },
                        { label: "No", value: "false" },
                      ]}
                      formikField="billable"
                      inputLabel="Billable"
                      isRequired={true}
                    />
                  </Box>

                  <button
                    className="btn btn-primary text-end"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {timeSheetId ? "Update" : "Add"}
                  </button>
                </FormikForm>
              );
            }}
          </Formik>
        )}
      </DialogContent>
    </Modal>
  );
};

export default NewTimeLogForm;
