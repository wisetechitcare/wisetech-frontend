/**
 * Create / edit a task (Phase 4 §7, §8).
 *
 * Rebuilt rather than patched. The form now begins with the question everything else depends
 * on — **is this a project task or internal work** — and the rest of the form follows from that
 * answer, instead of showing project fields to a task that can never have a project.
 *
 * ### The rule this form exists to express
 *
 *     scope → project → internal team → assignee
 *
 * Each step is fed by the server's own authorization resolvers, so an option that appears here
 * is one `POST /task` will accept, and one that does not appear is one it would reject. The
 * form is UX; the API is the boundary, and it re-checks all of it.
 */
import { useEffect, useMemo, useState } from 'react';
import {
    Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
    Divider, Grid, IconButton, MenuItem, Slider, Stack, TextField, Typography, alpha, useTheme,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import {
    TaskFormValues, TaskScope, buildTaskPayload, fieldsForScope, validateScopeShape,
    apiErrorMessage, employeeName, clampProgress,
    mainPresets, subPresets, presetTaskName, presetPairForName, PresetTask,
} from '../taskDomain';
import {
    useAvailableProjects, useProjectAssignees, useGeneralAssignees,
    useTaskStatuses, useTaskPriorities, usePresetTasks, useCreateTask, useUpdateTask,
} from '../useTaskQueries';
import { TaskScopeBadge } from './primitives';

export interface TaskFormDialogProps {
    open: boolean;
    onClose: () => void;
    onSaved?: () => void;
    /** Present when editing. Scope and project are immutable server-side (DEC-019). */
    task?: {
        id: string; taskName: string; taskScope: TaskScope; taskType?: 'PRESETS' | 'CUSTOM';
        taskDescription?: string | null; leadId?: string | null; assignedToId?: string | null;
        statusId?: string | null; priorityId?: string | null; startDate?: string | null;
        dueDate?: string | null; progress?: number | null; billingType?: 'BILLABLE' | 'NON_BILLABLE';
    } | null;
    /** Creating a subtask: locks scope + project to the parent's, which the server also enforces. */
    parentTask?: { id: string; taskName: string; taskScope: TaskScope; leadId?: string | null } | null;
    /** Prefills from the workspace context — the selected project, the column the "+" was on. */
    defaultProjectId?: string;
    defaultStatusId?: string;
    defaultScope?: TaskScope;
}

const toDateInput = (v?: string | null) => (v ? String(v).slice(0, 10) : '');

export const TaskFormDialog = ({
    open, onClose, onSaved, task, parentTask, defaultProjectId, defaultStatusId, defaultScope,
}: TaskFormDialogProps) => {
    const theme = useTheme();
    const isEdit = !!task;

    const [values, setValues] = useState<TaskFormValues>({
        taskScope: 'PROJECT', taskTypeMode: 'PRESETS', taskName: '',
    });
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [touched, setTouched] = useState(false);

    const createMutation = useCreateTask();
    const updateMutation = useUpdateTask();
    const saving = createMutation.isPending || updateMutation.isPending;

    // Reset whenever the dialog opens, so a previous edit never bleeds into the next create.
    useEffect(() => {
        if (!open) return;
        setSubmitError(null);
        setTouched(false);
        if (task) {
            setValues({
                taskScope: task.taskScope,
                taskTypeMode: task.taskType === 'CUSTOM' ? 'CUSTOM' : 'PRESETS',
                taskName: task.taskName ?? '',
                taskDescription: task.taskDescription ?? '',
                projectId: task.leadId ?? '',
                assignedToId: task.assignedToId ?? '',
                statusId: task.statusId ?? '',
                priorityId: task.priorityId ?? '',
                startDate: toDateInput(task.startDate),
                dueDate: toDateInput(task.dueDate),
                progress: task.progress ?? 0,
                billingType: task.billingType ?? 'BILLABLE',
            });
        } else {
            setValues({
                taskScope: parentTask?.taskScope ?? defaultScope ?? 'PROJECT',
                taskTypeMode: 'PRESETS',
                taskName: '',
                taskDescription: '',
                projectId: parentTask?.leadId ?? defaultProjectId ?? '',
                parentTaskId: parentTask?.id,
                assignedToId: '', statusId: defaultStatusId ?? '', priorityId: '',
                startDate: '', dueDate: '', progress: 0, billingType: 'BILLABLE',
            });
        }
    }, [open, task, parentTask, defaultProjectId, defaultStatusId, defaultScope]);

    const scopeFields = fieldsForScope(values.taskScope);

    const projectsQuery = useAvailableProjects();
    const statusesQuery = useTaskStatuses();
    const prioritiesQuery = useTaskPriorities();
    const presetsQuery = usePresetTasks();
    const projectAssigneesQuery = useProjectAssignees(
        scopeFields.assigneeSource === 'project-team' ? (values.projectId || undefined) : undefined,
    );
    const generalAssigneesQuery = useGeneralAssignees(scopeFields.assigneeSource === 'general');

    const projects = projectsQuery.data?.projects ?? [];
    const statuses = statusesQuery.data?.taskStatuses ?? [];
    const priorities = prioritiesQuery.data?.taskPriorities ?? [];
    const presets = presetsQuery.data?.presetTaskStatuses ?? [];

    const subOptions = subPresets(presets as PresetTask[], values.mainTaskId);

    const assigneesQuery = scopeFields.assigneeSource === 'general' ? generalAssigneesQuery : projectAssigneesQuery;
    const assignees = assigneesQuery.data?.assignees ?? [];

    /**
     * Clear a stale assignee whenever the pool changes.
     *
     * Switching scope or project changes WHO is assignable. Leaving the old selection in place
     * would submit someone the API refuses, producing a 403 the user cannot explain.
     */
    useEffect(() => {
        if (!values.assignedToId) return;
        if (assigneesQuery.isLoading) return;
        if (!assignees.some((a: { id: string }) => a.id === values.assignedToId)) {
            setValues((v) => ({ ...v, assignedToId: '' }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assignees, assigneesQuery.isLoading, values.taskScope, values.projectId]);

    const set = (patch: Partial<TaskFormValues>) => setValues((v) => ({ ...v, ...patch }));

    /**
     * On edit a task carries only its NAME, so map it back onto the Main Task / Sub-task pair it
     * came from — otherwise reopening a preset task shows both pickers empty.
     */
    useEffect(() => {
        if (!open || values.taskTypeMode !== 'PRESETS') return;
        if (!presets.length || !values.taskName) return;
        if (values.mainTaskId) return;
        const pair = presetPairForName(presets as PresetTask[], values.taskName);
        if (pair.mainTaskId) setValues((v) => ({ ...v, ...pair }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, presets, values.taskName, values.taskTypeMode]);

    const scopeError = useMemo(
        () => validateScopeShape(values.taskScope, { projectId: values.projectId }),
        [values.taskScope, values.projectId],
    );
    const nameError = values.taskName.trim() ? null : 'Task name is required';
    const dateError = values.startDate && values.dueDate && values.dueDate < values.startDate
        ? 'Due date cannot be before the start date' : null;
    const firstError = nameError || scopeError || dateError;

    const handleSubmit = async () => {
        setTouched(true);
        setSubmitError(null);
        if (firstError) return;
        try {
            const payload = buildTaskPayload(values);
            if (isEdit && task) {
                // Scope and project are immutable after creation — never resend them.
                const { taskScope, projectId, parentTaskId, ...editable } = payload as Record<string, unknown>;
                await updateMutation.mutateAsync({ id: task.id, payload: editable });
            } else {
                await createMutation.mutateAsync(payload);
            }
            onSaved?.();
            onClose();
        } catch (error) {
            // The server's own reason is the useful one — it names the project or assignee.
            setSubmitError(apiErrorMessage(error, 'Could not save this task'));
        }
    };

    const ScopeChoice = ({ scope, label, hint, icon }: { scope: TaskScope; label: string; hint: string; icon: string }) => {
        const selected = values.taskScope === scope;
        const locked = isEdit || !!parentTask;
        return (
            <Box
                component="button"
                type="button"
                disabled={locked}
                onClick={() => set({ taskScope: scope, projectId: scope === 'GENERAL' ? '' : values.projectId, assignedToId: '' })}
                sx={{
                    flex: 1, textAlign: 'left', p: 1.5, borderRadius: 2, cursor: locked ? 'not-allowed' : 'pointer',
                    border: '2px solid',
                    borderColor: selected ? 'primary.main' : 'divider',
                    bgcolor: selected ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.07) : 'background.paper',
                    opacity: locked && !selected ? 0.45 : 1,
                    transition: 'border-color .15s, background-color .15s',
                }}
            >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                    <Box sx={{ color: selected ? 'primary.main' : 'text.disabled', lineHeight: 0 }}>
                        <KTIcon iconName={icon} className="fs-4" />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: selected ? 'primary.main' : 'text.primary' }}>
                        {label}
                    </Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{hint}</Typography>
            </Box>
        );
    };

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth
            PaperProps={{ sx: { borderRadius: 2, bgcolor: 'background.paper', backgroundImage: 'none' } }}>
            <DialogTitle sx={{ pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Box>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {isEdit ? 'Edit task' : parentTask ? 'New subtask' : 'New task'}
                        </Typography>
                        {parentTask && (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                under “{parentTask.taskName}”
                            </Typography>
                        )}
                    </Box>
                    <Box sx={{ flex: 1 }} />
                    {isEdit && <TaskScopeBadge scope={values.taskScope} size="medium" />}
                    <IconButton onClick={onClose} disabled={saving} size="small" aria-label="Close">
                        <KTIcon iconName="cross" className="fs-4" />
                    </IconButton>
                </Stack>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: 'divider' }}>
                <Stack spacing={2}>
                    {/* ── scope first: everything below depends on it ── */}
                    {!isEdit && !parentTask && (
                        <Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                                WHAT KIND OF TASK IS THIS?
                            </Typography>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                <ScopeChoice scope="PROJECT" label="Project task" icon="briefcase"
                                    hint="Belongs to a project you manage. Can carry a deliverable and reach billing." />
                                <ScopeChoice scope="GENERAL" label="General task" icon="home-2"
                                    hint="Internal work with no project. Never billable to a client." />
                            </Stack>
                        </Box>
                    )}

                    {submitError && <Alert severity="error" onClose={() => setSubmitError(null)}>{submitError}</Alert>}

                    <Grid container spacing={2}>
                        {/* ── project (PROJECT only) ── */}
                        {scopeFields.project && (
                            <Grid item xs={12}>
                                <TextField
                                    select fullWidth size="small" required
                                    label="Project"
                                    value={values.projectId ?? ''}
                                    onChange={(e) => set({ projectId: e.target.value, assignedToId: '' })}
                                    disabled={isEdit || !!parentTask || projectsQuery.isLoading}
                                    error={touched && !!scopeError}
                                    helperText={
                                        projectsQuery.isLoading ? 'Loading projects…'
                                        : projects.length === 0
                                            ? "You don't currently have permission to create project tasks. Only projects you manage can receive them — create a general task instead."
                                            : (touched && scopeError) || ' '
                                    }
                                >
                                    {projects.map((p: { id: string; title?: string; projectNumber?: string }) => (
                                        <MenuItem key={p.id} value={p.id}>
                                            {p.projectNumber ? `${p.projectNumber} — ` : ''}{p.title}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                        )}

                        {/* ── preset vs custom name ── */}
                        <Grid item xs={12}>
                            <Stack direction="row" spacing={0.75} sx={{ mb: 1 }}>
                                {(['PRESETS', 'CUSTOM'] as const).map((mode) => (
                                    <Button
                                        key={mode}
                                        size="small"
                                        variant={values.taskTypeMode === mode ? 'contained' : 'outlined'}
                                        // Clearing the name on switch is deliberate: a preset title carried
                                        // into custom mode makes the two modes indistinguishable, which is
                                        // the confusion the old form shipped.
                                        onClick={() => set({ taskTypeMode: mode, taskName: '', mainTaskId: '', subTaskId: '' })}
                                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, borderColor: 'divider' }}
                                    >
                                        {mode === 'PRESETS' ? 'From preset' : 'Custom name'}
                                    </Button>
                                ))}
                            </Stack>

                            {values.taskTypeMode === 'PRESETS' ? (
                                /* Preset tasks are a two-level Task → Sub-task tree (Tasks ▸
                                   Configure), so the name is picked in two steps. Whichever of
                                   the pair is chosen last is the name that gets saved — tasks
                                   are stored by name, not by preset id. */
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            select fullWidth size="small" required label="Main task"
                                            value={values.mainTaskId ?? ''}
                                            onChange={(e) => {
                                                // Switching the main task invalidates any sub-task under it.
                                                const mainTaskId = e.target.value;
                                                set({
                                                    mainTaskId,
                                                    subTaskId: '',
                                                    taskName: presetTaskName(presets, mainTaskId, ''),
                                                });
                                            }}
                                            error={touched && !!nameError}
                                            helperText={(touched && nameError) || 'Pick the main task'}
                                        >
                                            {mainPresets(presets).map((p) => (
                                                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                                            ))}
                                            {presets.length === 0 && <MenuItem disabled value="">No presets configured</MenuItem>}
                                        </TextField>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            select fullWidth size="small" label="Sub-task"
                                            value={values.subTaskId ?? ''}
                                            onChange={(e) => {
                                                const subTaskId = e.target.value;
                                                set({
                                                    subTaskId,
                                                    taskName: presetTaskName(presets, values.mainTaskId, subTaskId),
                                                });
                                            }}
                                            disabled={!values.mainTaskId || subOptions.length === 0}
                                            helperText={
                                                !values.mainTaskId ? 'Pick a main task first'
                                                : subOptions.length === 0 ? 'This main task has no sub-tasks'
                                                : 'Optional — narrows the task name'
                                            }
                                        >
                                            <MenuItem value="">None</MenuItem>
                                            {subOptions.map((p) => (
                                                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                                            ))}
                                        </TextField>
                                    </Grid>
                                </Grid>
                            ) : (
                                <TextField
                                    fullWidth size="small" required label="Task name"
                                    value={values.taskName}
                                    onChange={(e) => set({ taskName: e.target.value })}
                                    error={touched && !!nameError}
                                    helperText={(touched && nameError) || 'Type a name for this task'}
                                    inputProps={{ maxLength: 200 }}
                                />
                            )}
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth size="small" multiline minRows={2} label="Description"
                                value={values.taskDescription ?? ''}
                                onChange={(e) => set({ taskDescription: e.target.value })}
                            />
                        </Grid>

                        {/* ── assignee ── */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                select fullWidth size="small" label="Assignee"
                                value={values.assignedToId ?? ''}
                                onChange={(e) => set({ assignedToId: e.target.value })}
                                disabled={assigneesQuery.isLoading || (scopeFields.project && !values.projectId)}
                                helperText={
                                    scopeFields.project && !values.projectId ? 'Select a project first'
                                    : assigneesQuery.isLoading ? 'Loading…'
                                    : assignees.length === 0
                                        ? (scopeFields.assigneeSource === 'general'
                                            ? 'You are not permitted to assign general tasks to anyone.'
                                            : "No project team members are available to you on this project.")
                                        : ' '
                                }
                            >
                                <MenuItem value="">Unassigned</MenuItem>
                                {assignees.map((a: { id: string; users?: { firstName?: string; lastName?: string } }) => (
                                    <MenuItem key={a.id} value={a.id}>{employeeName(a)}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                select fullWidth size="small" label="Stage"
                                value={values.statusId ?? ''}
                                onChange={(e) => set({ statusId: e.target.value })}
                            >
                                <MenuItem value="">No stage</MenuItem>
                                {statuses.map((s: { id: string; name: string; isFinal?: boolean }) => (
                                    <MenuItem key={s.id} value={s.id}>
                                        {s.name}{s.isFinal ? ' (final)' : ''}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                select fullWidth size="small" label="Priority"
                                value={values.priorityId ?? ''}
                                onChange={(e) => set({ priorityId: e.target.value })}
                            >
                                <MenuItem value="">None</MenuItem>
                                {priorities.map((p: { id: string; name: string }) => (
                                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                select fullWidth size="small" label="Billing"
                                value={values.billingType ?? 'BILLABLE'}
                                onChange={(e) => set({ billingType: e.target.value as 'BILLABLE' | 'NON_BILLABLE' })}
                                helperText={values.taskScope === 'GENERAL' ? 'General task time is internal overhead, never client billing' : ' '}
                            >
                                <MenuItem value="BILLABLE">Billable</MenuItem>
                                <MenuItem value="NON_BILLABLE">Non-billable</MenuItem>
                            </TextField>
                        </Grid>

                        {/* Native date inputs are banned by the design system — but this module is
                            on plain MUI TextFields, and the kit's WtDateField is Formik-bound.
                            `type="date"` would also fail lint, so the fields use the kit below. */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth size="small" label="Start date"
                                value={values.startDate ?? ''}
                                onChange={(e) => set({ startDate: e.target.value })}
                                placeholder="YYYY-MM-DD"
                                helperText=" "
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth size="small" label="Due date"
                                value={values.dueDate ?? ''}
                                onChange={(e) => set({ dueDate: e.target.value })}
                                placeholder="YYYY-MM-DD"
                                error={touched && !!dateError}
                                helperText={(touched && dateError) || ' '}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                Progress — {clampProgress(Number(values.progress))}%
                            </Typography>
                            <Slider
                                value={clampProgress(Number(values.progress))}
                                onChange={(_, v) => set({ progress: v as number })}
                                step={5} marks min={0} max={100} valueLabelDisplay="auto"
                                sx={{ mt: 0.5 }}
                            />
                        </Grid>
                    </Grid>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
                    sx={{ textTransform: 'none', fontWeight: 600, minWidth: 120 }}
                >
                    {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create task'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TaskFormDialog;
