import TextInput from "@app/modules/common/inputs/TextInput";
import TimePickerInput from "@app/modules/common/inputs/TimeInput";
import Loader from "@app/modules/common/utils/Loader";
import {
  Autocomplete, Box, CircularProgress, Grid, Slider, Stack, TextField, Typography,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
  GlassDialog, GlassHeader, WtButton, WtSwitchField,
} from "@app/modules/common/components/ui";
import { RootState } from "@redux/store";
import { createTimeSheet, getAllTasks, updateTask } from "@services/tasks";
import { successConfirmation } from "@utils/modal";
import { Formik, Form as FormikForm, Field, FieldArray, useFormikContext } from "formik";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import * as Yup from "yup";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";
import { getTimesheetById } from "@services/tasks";
import TimeLogAttachments, { TimeLogAttachment } from "@app/pages/employee/timesheet/components/TimeLogAttachments";
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
  /** What the work produced — stored against the entry, uploaded before the form is submitted. */
  attachments?: TimeLogAttachment[];
  /**
   * The TASK's progress, not the entry's.
   *
   * It rides along with the time log deliberately: logging hours is the moment somebody knows
   * how far the work has got, and it is the moment they are already in a form. Without it the
   * percentage is only ever touched from the task screen, which people stop visiting once the
   * work is underway — so it sits at whatever it was on day one while the hours pile up.
   */
  taskProgress?: number;
}

// Recomputes logTime whenever start/end change. A real component (not code
// inside Formik's render prop) so the hook obeys the Rules of Hooks.
function LogTimeAutoCalc({ editTimeSheetData }: { editTimeSheetData: any }) {
  const { values, setFieldValue } = useFormikContext<any>();
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
  return null;
}

const validationSchema = Yup.object()
  .shape({
    projectId: Yup.string().required("Project is required"),
    taskId: Yup.string().required("Task is required"),
    startTime: Yup.string().trim().required("Start time is required"),
    // Required, because the field is labelled required and an entry is a BLOCK of work. An
    // entry with no end is a RUNNING timer, and those are only ever created by the timer.
    endTime: Yup.string()
      .trim()
      .required("End time is required")
      .test(
        "after-start",
        "End time must be after the start time",
        // Both values are "HH:mm" from the same picker, so a string compare is a time
        // compare. An overnight span would need a date, which this form does not collect.
        function (value) {
          const start = this.parent?.startTime;
          if (!value || !start) return true;   // the required rules report a blank one
          return String(value) > String(start);
        },
      ),
    description: Yup.string().optional(),
    billable: Yup.string()
      .oneOf(["true", "false"])
      .required("Billable is required"),
    logTimeHours: Yup.number().required("Log time hours is required"),
    logTimeMinutes: Yup.number().required("Log time minutes is required"),
    logTimeSeconds: Yup.number().required("Log time seconds is required"),
  })
  .test(
    "non-zero-duration",
    "Start and end time cannot be the same",
    (values: any) => {
      if (!values?.startTime || !values?.endTime) return true;
      const total =
        (values.logTimeHours ?? 0) + (values.logTimeMinutes ?? 0) + (values.logTimeSeconds ?? 0);
      // A zero-length entry is somebody saving twice, not a block of work.
      return total > 0;
    },
  );

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
  /** Whose folder an attachment is filed under — the same id every other upload in the app uses. */
  const currentUserId = useSelector(
    (state: RootState) => (state as any)?.auth?.currentUser?.id || (state as any)?.employee?.currentEmployee?.userId || ""
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
      const tasksData = await getAllTasks();
      // ONLY tasks this person is on — owner or shared with. Time is logged by the people doing
      // the work, so a task they are not on is one the API will refuse anyway; offering it would
      // just move the refusal to after they had filled the form in.
      const all = tasksData?.data?.tasks || [];
      const mine = employeeId
        ? all.filter((t: any) =>
            t?.assignedToId === employeeId ||
            (t?.assignees || []).some((a: any) => a?.employeeId === employeeId))
        : all;
      setTasks(mine);

      // ...and the projects are the projects THOSE tasks belong to. It used to be
      // `getAllProjects()` — every project in the company, including ones the person has no
      // part in — so the picker offered work they could not possibly be logging against. The
      // list a person may log to is exactly the list they are on, and their own tasks already
      // say what that is: no second endpoint, and nothing to keep in step with the first.
      const byProject = new Map<string, { id: string; title: string }>();
      for (const t of mine) {
        const lead = t?.lead;
        if (lead?.id && !byProject.has(lead.id)) {
          byProject.set(lead.id, { id: lead.id, title: lead.title || 'Untitled project' });
        }
      }
      setProjects([...byProject.values()] as any);
      setLoading(false);

      // If not in edit mode, we can show the form now
      if (!timeSheetId) {
        setIsDataLoaded(true);
      }
    };
    fetchProjectsAndTasks();
    // `show`, not `open` — the dependency used to be the GLOBAL `window.open`, which never
    // changes, so reopening the dialog re-used whatever projects and tasks were loaded the
    // first time it was ever opened.
  }, [show, timeSheetId, employeeId]);

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

  /** The task a form value points at, from the list already loaded. */
  const taskById = (id?: string) => (tasks || []).find((t: any) => t?.id === id) as any;

  const seededTaskId = editTimeSheetData?.taskId || prefilledTaskId || "";

  /**
   * This entry is already attached to a task, so the task and its project are facts, not choices.
   *
   * True for anything the timer recorded and for any entry opened from a task. The person can
   * still correct the hours, say what they did and attach what it produced — everything this
   * form exists for — but not move the hours onto different work.
   */
  const lockedToTask = !!(editTimeSheetData?.taskId || prefilledTaskId);
  /** What the task currently says, so the form can show what a change would actually change. */
  const seededProgressFor = (id?: string) => {
    const value = Number(taskById(id)?.progress ?? 0);
    return Number.isFinite(value) ? Math.round(value) : 0;
  };
  const seededProgress = seededProgressFor(seededTaskId);

  const initialValues: NewTimeLogForm = {
    projectId: editTimeSheetData?.projectId || prefilledProjectId || "",
    taskId: editTimeSheetData?.taskId || prefilledTaskId || "",
    employeeId: editTimeSheetData?.employeeId || "",
    // EMPTY, not `new Date()`. Seeding "now" made both fields permanently truthy, so
    // `required()` could never fail: the form showed an empty hh:mm, refused nothing, and
    // saved the moment you pressed Add Log — silently stamping whatever time it happened to
    // be. A required field has to be able to be empty for the rule to mean anything.
    startTime: editTimeSheetData?.startTime
      ? formatTime(editTimeSheetData?.startTime)
      : "",
    endTime: editTimeSheetData?.endTime
      ? formatTime(editTimeSheetData?.endTime)
      : "",
    description: editTimeSheetData?.description || "",
    billable: editTimeSheetData?.billable !== undefined ? (editTimeSheetData.billable ? "true" : "false") : "true",
    logTime: logTime,
    logTimeHours: editTimeSheetData?.logTimeHours || 0,
    logTimeMinutes: editTimeSheetData?.logTimeMinutes || 0,
    logTimeSeconds: editTimeSheetData?.logTimeSeconds || 0,
    // The entry's existing files, so opening an edit does not silently drop them on save —
    // the API replaces the set with whatever is submitted.
    attachments: editTimeSheetData?.attachments || [],
    taskProgress: Number.isFinite(seededProgress) ? seededProgress : 0,
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
      // The task's progress is not part of the timesheet — strip it before the entry is written,
      // then apply it to the task itself.
      const nextProgress = Number(values.taskProgress ?? 0);
      delete (formData as any).taskProgress;

      if (timeSheetId) {
        await updateTimeSheetById(timeSheetId, formData);
      } else {
        await createTimeSheet(formData);
      }

      // Only when it actually moved. Sending it unchanged would stamp `lastEditedBy` on a task
      // nobody edited, and make every time log look like a task edit in the activity trail.
      if (values.taskId && nextProgress !== seededProgressFor(values.taskId)) {
        try {
          await updateTask(values.taskId, { progress: Math.round(nextProgress) });
        } catch (error) {
          // The time is already saved and is the thing that must not be lost. A refused
          // progress update is worth saying out loud, not worth discarding the entry over.
          console.error("Time log saved, but the task progress was not updated", error);
        }
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

  /** The project a chosen task belongs to — a task is never on two projects. */
  const projectOfTask = (taskId?: string) => {
    const task: any = (tasks || []).find((t: any) => t?.id === taskId);
    return task?.leadId || task?.lead?.id || task?.projectId || "";
  };

  return (
    <GlassDialog
      open={show}
      onClose={() => onClose()}
      maxWidth="sm"
      fullWidth
      header={
        <GlassHeader
          title={timeSheetId ? "Edit time log" : "Add time log"}
          subtitle={
            timeSheetId
              ? "Correct the hours, say what was done, and attach what it produced"
              : "Log time against a task — the project follows from it"
          }
          icon={<KTIcon iconName="time" className="fs-1" />}
          onClose={() => onClose()}
          closeIcon={<KTIcon iconName="cross" className="fs-3" />}
        />
      }
    >
      <Box
        className="min-h-0 flex-1 overflow-y-auto"
        sx={{ maxHeight: { xs: "none", sm: "68vh" }, px: { xs: 2, sm: 2.75 }, py: 2 }}
      >
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
              return (
                <FormikForm>
                  <LogTimeAutoCalc editTimeSheetData={editTimeSheetData} />
                  {/* TASK FIRST, and the project follows from it.
                      A task belongs to exactly one project, so asking for both independently
                      invited them to disagree — and left Choose Project empty on an entry that
                      plainly had one. Picking a task now fills the project; picking a project
                      narrows the tasks to that project's own. */}
                  <Box sx={{ mb: 2 }}>
                    <Autocomplete
                      options={(tasks || []).filter((t: any) =>
                        !values.projectId || projectOfTask(t?.id) === values.projectId
                      )}
                      value={(tasks || []).find((t: any) => t?.id === values.taskId) || null}
                      onChange={(_, task: any) => {
                        setFieldValue("taskId", task?.id || "");
                        // Derived, not typed: the project is a property of the task.
                        if (task) setFieldValue("projectId", projectOfTask(task.id));
                        // ...and so is its progress. The slider must open where the TASK is,
                        // never at whatever the previously selected task happened to be.
                        setFieldValue("taskProgress", seededProgressFor(task?.id));
                      }}
                      getOptionLabel={(t: any) => t?.taskName || ""}
                      isOptionEqualToValue={(o: any, v: any) => o?.id === v?.id}
                      size="small"
                      fullWidth
                      autoHighlight
                      // An entry the timer created already knows its task, and re-pointing it at
                      // a different one would move hours between pieces of work after the fact.
                      // Correcting the hours is what this form is for; re-filing them is not.
                      disabled={lockedToTask}
                      ListboxProps={{ style: { maxHeight: 240 } }}
                      noOptionsText="No task assigned to you matches"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          required
                          label="Task"
                          placeholder="Search a task…"
                          helperText={lockedToTask
                            ? "Set when this entry was recorded"
                            : "Only tasks you are assigned to"}
                        />
                      )}
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Autocomplete
                      options={projects || []}
                      value={(projects || []).find((p: any) => p?.id === values.projectId) || null}
                      onChange={(_, project: any) => {
                        setFieldValue("projectId", project?.id || "");
                        // The task no longer belongs to the chosen project, so it cannot stay.
                        if (values.taskId && projectOfTask(values.taskId) !== project?.id) {
                          setFieldValue("taskId", "");
                        }
                      }}
                      getOptionLabel={(p: any) => p?.title || ""}
                      isOptionEqualToValue={(o: any, v: any) => o?.id === v?.id}
                      size="small"
                      fullWidth
                      autoHighlight
                      // The project is a PROPERTY of the task, so whenever a task is chosen this
                      // field only reports it. It said "Set by the task above" while still
                      // letting itself be changed, which is how an entry could end up filed
                      // under a project its own task does not belong to.
                      disabled={lockedToTask || !!values.taskId}
                      ListboxProps={{ style: { maxHeight: 240 } }}
                      noOptionsText="No matching project"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          required
                          label="Project"
                          helperText={values.taskId
                            ? "Set by the task above"
                            : "Only projects you are on"}
                        />
                      )}
                    />
                  </Box>

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={6}>
                      <TimePickerInput formikField="startTime" label="Start time" isRequired={true} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TimePickerInput formikField="endTime" label="End time" isRequired={true} />
                    </Grid>
                    <Grid item xs={12}>
                      {/* Read-only on purpose: it is start-to-end, computed by LogTimeAutoCalc
                          above. A typeable total is a total that can disagree with the clock. */}
                      <TextInput
                        formikField="logTime"
                        label="Log time"
                        isRequired={true}
                        placeholder="hh:mm:ss"
                        readonly={true}
                      />
                    </Grid>
                  </Grid>

                  <Box sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      minRows={3}
                      label="Description"
                      placeholder="What was done in this block of time?"
                      value={values.description || ""}
                      onChange={(e) => setFieldValue("description", e.target.value)}
                    />
                  </Box>

                  {/* Attachments belong with the description: together they are the account of
                      what the logged hours produced. Same validation module the onboarding
                      documents use, and the upload pipeline re-encodes images to WebP. */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ display: "block", mb: 0.75, fontWeight: 700, fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "text.secondary" }}>
                      Attachments
                    </Typography>
                    <TimeLogAttachments
                      value={values.attachments || []}
                      onChange={(next) => setFieldValue("attachments", next)}
                      userId={currentUserId}
                    />
                  </Box>

                  {/* ── the task's progress, updated where the work is reported ──────
                      A timesheet says how long; this says how far. Asking for both in the same
                      breath is the only reliable way to keep the second one true — the task
                      screen is where progress lives, and nobody opens it once the work is
                      running, so the bar stayed at whatever it was on day one while the hours
                      accumulated underneath it.

                      Saved to the TASK, not to the entry: it is the task's state, and the entry
                      is merely the moment somebody happened to know it. */}
                  {values.taskId && (
                    <Box sx={{ mb: 2, px: 1.5, py: 1.25, borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                          TASK PROGRESS
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: "primary.main" }}>
                          {Math.round(Number(values.taskProgress ?? 0))}%
                        </Typography>
                      </Stack>
                      <Slider
                        value={Number(values.taskProgress ?? 0)}
                        onChange={(_, v) => setFieldValue("taskProgress", v as number)}
                        step={5}
                        marks
                        min={0}
                        max={100}
                        valueLabelDisplay="auto"
                        sx={{ mt: 0.5 }}
                      />
                      <Typography variant="caption" sx={{ color: "text.disabled" }}>
                        {Number(values.taskProgress ?? 0) === seededProgressFor(values.taskId)
                          ? "Move it if this block of work advanced the task"
                          : `Updates the task from ${seededProgressFor(values.taskId)}% to ${Math.round(Number(values.taskProgress ?? 0))}%`}
                      </Typography>
                    </Box>
                  )}

                  {/* One switch, not a Yes/No pair: billable is a boolean, and the kit's toggle
                      is what every other boolean in the app uses. */}
                  <Box sx={{ mb: 1 }}>
                    <WtSwitchField
                      title="Billable"
                      description="Counts towards what the client is charged for this project"
                      checked={values.billable === "true" || values.billable === true}
                      onChange={(_e, next) => { void setFieldValue("billable", next ? "true" : "false"); }}
                    />
                  </Box>

                  <Stack
                    direction={{ xs: "column-reverse", sm: "row" }}
                    spacing={1}
                    justifyContent="flex-end"
                    sx={{ pt: 2, mt: 1, borderTop: "1px solid", borderColor: "divider" }}
                  >
                    <WtButton ghost onClick={() => onClose()} disabled={isSubmitting} sx={{ width: { xs: "100%", sm: "auto" } }}>
                      cancel
                    </WtButton>
                    <WtButton
                      type="submit"
                      disabled={isSubmitting}
                      startIcon={
                        isSubmitting
                          ? <CircularProgress size={14} color="inherit" />
                          : <KTIcon iconName={timeSheetId ? "check" : "plus"} className="fs-6" />
                      }
                      sx={{ width: { xs: "100%", sm: "auto" }, minWidth: 150 }}
                    >
                      {isSubmitting ? "saving…" : timeSheetId ? "update log" : "add log"}
                    </WtButton>
                  </Stack>
                </FormikForm>
              );
            }}
          </Formik>
        )}
      </Box>
    </GlassDialog>
  );
};

export default NewTimeLogForm;
