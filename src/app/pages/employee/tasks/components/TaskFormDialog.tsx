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
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert, Autocomplete, Avatar, Box, Button, Chip, CircularProgress, Divider, Grid, MenuItem,
    Slider, Stack, TextField, Typography, alpha, useTheme,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import {
    TaskFormValues, TaskScope, buildTaskPayload, fieldsForScope, validateScopeShape,
    apiErrorMessage, employeeName, initialsOf, clampProgress, PresetTask,
} from '../taskDomain';
import { PATH_SEPARATOR, getPresetPath } from '@utils/presetTaskHierarchy';
import { toWireDate } from '@utils/dateFormats';
import { HierarchicalTaskPicker, buildTaskOptions } from './HierarchicalTaskSelect';
import {
    useAvailableProjects, useProjectAssignees, useGeneralAssignees,
    useTaskStatuses, useTaskPriorities, usePresetTasks, useCreateTask, useUpdateTask,
} from '../useTaskQueries';
import { TaskScopeBadge } from './primitives';
import { GlassDialog, GlassHeader, WtButton, WtDateField, toast } from '@app/modules/common/components/ui';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { NotifyOnWhatsAppDialog, NotifiablePerson, notifiableFromTask } from './NotifyOnWhatsAppDialog';

export interface TaskFormDialogProps {
    open: boolean;
    onClose: () => void;
    onSaved?: () => void;
    /** Present when editing. Scope and project are immutable server-side (DEC-019). */
    task?: {
        id: string; taskName: string; taskScope: TaskScope; taskType?: 'PRESETS' | 'CUSTOM';
        /** The configuration node the name came from. Null on CUSTOM and on pre-link rows. */
        presetTaskId?: string | null;
        taskDescription?: string | null; leadId?: string | null; assignedToId?: string | null;
        /** The roster, owner included — what the multi-select opens with. */
        assignees?: Array<{ employeeId: string; isOwner: boolean }>;
        /**
         * The task's OWN project and assignee objects. Load-bearing: the pickers below are fed by
         * authorization-scoped selectors, and a reader who is not authorised on the project gets
         * an empty list from both — so the fields rendered blank and the person a task was
         * assigned to could not see that it was assigned to them.
         */
        lead?: { id: string; title?: string | null; prefix?: string | null } | null;
        assignedTo?: { id: string; avatar?: string | null; users?: { firstName?: string | null; lastName?: string | null } | null } | null;
        statusId?: string | null; priorityId?: string | null; startDate?: string | null;
        dueDate?: string | null; progress?: number | null; billingType?: 'BILLABLE' | 'NON_BILLABLE';
    } | null;
    /** Creating a subtask: locks scope + project to the parent's, which the server also enforces. */
    parentTask?: { id: string; taskName: string; taskScope: TaskScope; leadId?: string | null } | null;
    /**
     * The caller may report progress but not change the task. Answered by the server (`canEdit`
     * on the task payload), never by a permission read in the browser — only the server knows
     * which projects this person manages.
     */
    progressOnly?: boolean;
    /** Prefills from the workspace context — the selected project, the column the "+" was on. */
    defaultProjectId?: string;
    defaultStatusId?: string;
    defaultScope?: TaskScope;
}

const toDateInput = (v?: string | null) => (v ? String(v).slice(0, 10) : '');

interface ProjectOption { id: string; title?: string; projectNumber?: string }
interface AssigneeOption {
    id: string;
    avatar?: string | null;
    users?: { firstName?: string | null; lastName?: string | null } | null;
}

/**
 * What a project is called in a picker: number first, because that is what people search by and
 * what tells two similarly-named buildings apart.
 */
/**
 * A group heading. One component so every section is set the same way — the form previously had
 * exactly one hand-styled caption and then twelve fields in an undifferentiated column.
 */
const SectionLabel = ({ text }: { text: string }) => (
    <Typography
        variant="caption"
        sx={{
            display: 'block', mb: 0.75,
            fontWeight: 700, fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase',
            color: 'text.secondary',
        }}
    >
        {text}
    </Typography>
);

const projectLabel = (p: ProjectOption) =>
    `${p.projectNumber ? `${p.projectNumber} — ` : ''}${p.title || 'Untitled project'}`;

export const TaskFormDialog = ({
    open, onClose, onSaved, task, parentTask, progressOnly = false,
    defaultProjectId, defaultStatusId, defaultScope,
}: TaskFormDialogProps) => {
    const theme = useTheme();
    const isEdit = !!task;

    const [values, setValues] = useState<TaskFormValues>({
        taskScope: 'PROJECT', taskTypeMode: 'PRESETS', taskName: '',
    });
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [touched, setTouched] = useState(false);

    const currentEmployeeId = useSelector((state: RootState) => state.employee?.currentEmployee?.id);

    // Who to offer a WhatsApp note to once the task is saved. Held here rather than derived from
    // the form, because the answer is about the SAVED task — including the id a new task only
    // gets on the way back from the server.
    const [notify, setNotify] = useState<{ taskId: string; taskName: string; people: NotifiablePerson[] } | null>(null);

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
                // Owner first, then the rest — the order the picker shows and the order the
                // server returns, so reopening an edit never reshuffles the chips.
                assigneeIds: (task.assignees ?? [])
                    .slice()
                    .sort((a, b) => Number(b.isOwner) - Number(a.isOwner))
                    .map((a) => a.employeeId),
                presetTaskId: task.presetTaskId ?? '',
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
                // Work starts when it is created unless somebody says otherwise, and a blank
                // start date is the reason so many tasks carry none at all. Today is the honest
                // default and it stays editable — including clearable, for work planned later.
                startDate: toWireDate(new Date()),
                // No `progress`: buildTaskPayload omits the key when it was never set, which is
                // the honest shape for a task that has not been started.
                dueDate: '', billingType: 'BILLABLE',
            });
        }
    }, [open, task, parentTask, defaultProjectId, defaultStatusId, defaultScope]);

    const scopeFields = fieldsForScope(values.taskScope);

    const projectsQuery = useAvailableProjects();
    // Scoped to the project in the form: a stage list that ignored it offered the company-wide
    // set only, so the lanes someone had just added to this project's board were missing from
    // the one place a task's stage is chosen.
    const statusesQuery = useTaskStatuses(scopeFields.project ? (values.projectId || undefined) : undefined);
    const prioritiesQuery = useTaskPriorities();
    const presetsQuery = usePresetTasks();
    // Not fetched when nothing can be reassigned: the selector answers "whom may I assign to",
    // which is a question a progress-only editor is never allowed to act on — and one the server
    // refuses for them, producing an error under a disabled field.
    const projectAssigneesQuery = useProjectAssignees(
        !progressOnly && scopeFields.assigneeSource === 'project-team' ? (values.projectId || undefined) : undefined,
    );
    const generalAssigneesQuery = useGeneralAssignees(!progressOnly && scopeFields.assigneeSource === 'general');

    const projects = projectsQuery.data?.projects ?? [];
    const statuses = statusesQuery.data?.taskStatuses ?? [];
    const priorities = prioritiesQuery.data?.taskPriorities ?? [];
    // Memoised on the query data, not re-defaulted per render: `?? []` is a fresh array every
    // time, which would rebuild the whole option tree below on every keystroke in the form.
    const presets = useMemo(() => presetsQuery.data?.presetTaskStatuses ?? [], [presetsQuery.data]);

    // Presets come back FLAT; `parentId` is what makes them a tree. One picker lists every node
    // at every depth — a dropdown per level could never describe a tree whose depth is not known
    // in advance, which is what the old Main task + Sub-task pair got wrong.
    const presetOptions = useMemo(() => buildTaskOptions(presets as PresetTask[]), [presets]);

    /** Ancestors + own name for the selected node. Derived for display; never stored. */
    const selectedPath = useMemo(
        () => (values.presetTaskId ? getPresetPath(presets as PresetTask[], values.presetTaskId) : []),
        [presets, values.presetTaskId],
    );

    const assigneesQuery = scopeFields.assigneeSource === 'general' ? generalAssigneesQuery : projectAssigneesQuery;
    const assignees: AssigneeOption[] = assigneesQuery.data?.assignees ?? [];

    /**
     * The dialog's scroll port, used as the boundary for both dropdowns below.
     *
     * MUI renders an Autocomplete's list in a PORTAL at document.body, so nothing about the
     * dialog constrains it: with the field near the bottom of the sheet the list opened downward
     * and ran straight past the footer and off the dialog. Popper's default boundary is the
     * viewport, which the list was still inside — so it never flipped.
     *
     * Handing it this element instead means "stay inside the form": the list flips above the
     * field when there is not room below it, and is capped to what remains either way.
     */
    const scrollPortRef = useRef<HTMLDivElement | null>(null);

    // Rebuilt every render ON PURPOSE, not memoised: the boundary is read off a ref, which is
    // still null on the first render. A memo would capture that null and the constraint would
    // silently never apply — the exact bug this code exists to fix.
    const dropdownSlotProps = {
        popper: {
            modifiers: [
                { name: 'flip', options: { boundary: scrollPortRef.current ?? 'clippingParents', padding: 8 } },
                { name: 'preventOverflow', options: { boundary: scrollPortRef.current ?? 'clippingParents', padding: 8 } },
            ],
        },
    };

    /**
     * The options a picker offers, PLUS whatever the task already holds.
     *
     * Both lists are authorization-scoped answers to "what may I choose": available-projects is
     * where you may create, project-assignees is whom you may assign. Neither is a list of what
     * this task IS — so an editor without authority on the project got two empty lists, and the
     * form showed a blank Project and a blank Assign-to for a task that plainly had both.
     *
     * Merging the stored value in fixes that, and one real case beyond it: an assignee who has
     * since left the project's team is no longer offered, and the field would otherwise blank
     * itself and quietly unassign them on the next save.
     */
    const withCurrent = <T extends { id: string }>(options: T[], current?: T | null): T[] => (
        current && !options.some((o) => o.id === current.id) ? [current, ...options] : options
    );

    const projectOptions = withCurrent(
        projects as ProjectOption[],
        task?.lead ? { id: task.lead.id, title: task.lead.title ?? undefined, projectNumber: task.lead.prefix ?? undefined } : null,
    );
    const assigneeOptions = withCurrent(assignees, task?.assignedTo ?? null);

    // Autocomplete is controlled by the OPTION, not by the id, so both pickers resolve their
    // current value out of the list they were handed. `?? null` matters: `undefined` would make
    // the field uncontrolled and React would warn the first time something is chosen.
    const selectedProject = projectOptions.find((p) => p.id === values.projectId) ?? null;
    const selectedAssignee = assigneeOptions.find((a) => a.id === values.assignedToId) ?? null;
    /**
     * The roster as OPTIONS, in the order it was chosen — owner first.
     *
     * Falls back to the single `assignedToId` for a task saved before rosters existed, so an old
     * task opens showing its assignee rather than an empty field.
     */
    const selectedAssignees: AssigneeOption[] = (
        values.assigneeIds?.length
            ? values.assigneeIds
            : (values.assignedToId ? [values.assignedToId] : [])
    )
        .map((id) => assigneeOptions.find((a) => a.id === id))
        .filter((a): a is AssigneeOption => !!a);

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
     * Locked: everything except Progress. A person who is not managing the project can report how
     * far their work has got — that is the field they are the authority on — and nothing else.
     * The API enforces the same split; this only makes it visible before the save button.
     */
    const progressLock = progressOnly;

    /**
     * Legacy backfill on edit.
     *
     * Tasks created since the configuration link exists carry `presetTaskId`, which is
     * unambiguous and is seeded straight from the task above. Rows created BEFORE it have only
     * the name, so fall back to a name match — and ONLY when it is unique, since the same name
     * can legitimately appear in more than one branch (Building under Mechanical and Electrical).
     * Guessing between them would silently file the task under the wrong parent.
     */
    useEffect(() => {
        if (!open || values.taskTypeMode !== 'PRESETS') return;
        if (!presets.length || !values.taskName) return;
        if (values.presetTaskId) return;
        const byName = (presets as PresetTask[]).filter((p) => p.name === values.taskName);
        if (byName.length === 1) setValues((v) => ({ ...v, presetTaskId: byName[0].id }));
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
            let saved: any;
            if (isEdit && task) {
                // Scope and project are immutable after creation — never resend them.
                const { taskScope, projectId, parentTaskId, ...editable } = payload as Record<string, unknown>;
                saved = await updateMutation.mutateAsync({ id: task.id, payload: editable });
            } else {
                saved = await createMutation.mutateAsync(payload);
            }
            void toast({
                icon: 'success',
                title: isEdit ? 'Changes saved' : 'Task created',
                text: values.taskName.trim() ? `“${values.taskName.trim()}” has been saved.` : undefined,
                timer: 2600,
            });

            // The saved task, as the server returned it — the roster it actually persisted, not
            // the one the form hoped for, and with the id a brand-new task only has now.
            const savedTask = saved?.data?.task ?? saved?.task ?? null;
            const people = savedTask
                ? notifiableFromTask(savedTask, currentEmployeeId)
                : [];

            onSaved?.();
            onClose();

            // Offered, never automatic: the message goes from the assigner's own WhatsApp, so it
            // cannot happen without them. In-app and email have already gone out by this point.
            if (people.length && savedTask?.id) {
                setNotify({ taskId: savedTask.id, taskName: savedTask.taskName || values.taskName, people });
            }
        } catch (error) {
            // The server's own reason is the useful one — it names the project or assignee.
            setSubmitError(apiErrorMessage(error, 'Could not save this task'));
        }
    };

    const ScopeChoice = ({ scope, label, hint, icon }: { scope: TaskScope; label: string; hint: string; icon: string }) => {
        const selected = values.taskScope === scope;
        const locked = isEdit || !!parentTask || progressLock;
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
        <>
        {/* The kit's dialog, not a bare MUI one: the glass paper, the blurred scrim and the
            transition are the app's modal language, and every other dialog in this module
            already speaks it (board background, project team). */}
        <GlassDialog
            open={open}
            onClose={saving ? undefined : onClose}
            maxWidth="md"
            fullWidth
            header={
                <GlassHeader
                    title={progressLock ? 'Update progress' : isEdit ? 'Edit task' : parentTask ? 'New subtask' : 'New task'}
                    subtitle={progressLock
                        ? 'You can report how far this has got — the rest is set by whoever manages the project'
                        : parentTask
                        ? `Under “${parentTask.taskName}”`
                        : isEdit ? 'Scope and project are fixed once a task exists'
                        : 'Name it, place it, and give it an owner'}
                    icon={<KTIcon iconName={parentTask ? 'abstract-26' : 'element-plus'} className="fs-1" />}
                    onClose={saving ? undefined : onClose}
                    closeIcon={<KTIcon iconName="cross" className="fs-3" />}
                    action={isEdit ? <TaskScopeBadge scope={values.taskScope} size="medium" /> : undefined}
                />
            }
        >
            {/* Two boxes: the outer one is the scroll port bounded by what the Paper has left,
                the inner one grows to its natural height. Same shape as BoardBackgroundDialog. */}
            <Box
                ref={scrollPortRef}
                className="min-h-0 flex-1 overflow-y-auto"
                sx={{
                    maxHeight: { xs: 'none', sm: '68vh' },
                    px: { xs: 2, sm: 2.75 },
                    py: 2,
                    scrollbarWidth: 'thin',
                }}
            >
                <Stack spacing={2.5}>
                    {/* ── scope first: everything below depends on it ── */}
                    {!isEdit && !parentTask && (
                        <Box>
                            <SectionLabel text="What kind of task is this?" />
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                <ScopeChoice scope="PROJECT" label="Project task" icon="briefcase"
                                    hint="Belongs to a project you manage. Can carry a deliverable and reach billing." />
                                <ScopeChoice scope="GENERAL" label="General task" icon="home-2"
                                    hint="Internal work with no project. Never billable to a client." />
                            </Stack>
                        </Box>
                    )}

                    {progressLock && (
                        // Said once, plainly. Fields that are grey with no explanation read as a
                        // bug; fields that are grey with a reason read as a rule.
                        <Alert severity="info" icon={<KTIcon iconName="information-5" className="fs-4" />}>
                            Only the progress can be changed here. Everything else on this task is
                            managed by its project manager.
                        </Alert>
                    )}

                    {submitError && <Alert severity="error" onClose={() => setSubmitError(null)}>{submitError}</Alert>}

                    <Grid container spacing={2}>
                        <Grid item xs={12} sx={{ pb: 0.5 }}>
                            <SectionLabel text="The work" />
                        </Grid>

                        {/* ── project (PROJECT only) ── */}
                        {scopeFields.project && (
                            <Grid item xs={12}>
                                {/* Searchable, not a plain <select>. A native MUI select renders
                                    one MenuItem per project, and a hundred of them open as a
                                    sheet over the whole form with nothing to do but scroll. An
                                    Autocomplete filters as you type, caps its own popup, and
                                    matches on the project NUMBER as well as the name — which is
                                    how people actually refer to a project here. */}
                                <Autocomplete
                                    options={projectOptions}
                                    value={selectedProject}
                                    onChange={(_, option) => set({
                                        projectId: option?.id ?? '',
                                        // The assignable pool belongs to the project, so carrying
                                        // the old choice across would submit someone this project
                                        // may refuse.
                                        assignedToId: '',
                                    })}
                                    getOptionLabel={projectLabel}
                                    isOptionEqualToValue={(o, v) => o.id === v.id}
                                    disabled={isEdit || !!parentTask || progressLock || projectsQuery.isLoading}
                                    size="small"
                                    fullWidth
                                    autoHighlight
                                    // Capped, and kept inside the dialog — see dropdownSlotProps.
                                    ListboxProps={{ style: { maxHeight: 240 } }}
                                    slotProps={dropdownSlotProps}
                                    noOptionsText="No matching project"
                                    renderOption={(props, option) => (
                                        <Box component="li" {...props} key={option.id} sx={{ display: 'block !important', py: 0.75 }}>
                                            <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: 'text.primary' }}>
                                                {option.title || 'Untitled project'}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                {option.projectNumber || '—'}
                                            </Typography>
                                        </Box>
                                    )}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            required
                                            label="Project"
                                            error={touched && !!scopeError}
                                            // A permission notice under a field nobody is being
                                            // asked to fill is noise at best and an accusation at
                                            // worst: it told a progress-only editor they lacked a
                                            // permission they were never using.
                                            helperText={
                                                progressLock ? ' '
                                                : projectsQuery.isLoading ? 'Loading projects…'
                                                : projects.length === 0
                                                    ? "You don't currently have permission to create project tasks. Only projects you manage can receive them — create a general task instead."
                                                    : (touched && scopeError) || 'Type to search by name or number'
                                            }
                                        />
                                    )}
                                />
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
                                        disabled={progressLock}
                                        onClick={() => set({ taskTypeMode: mode, taskName: '', presetTaskId: '' })}
                                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, borderColor: 'divider' }}
                                    >
                                        {mode === 'PRESETS' ? 'From preset' : 'Custom name'}
                                    </Button>
                                ))}
                            </Stack>

                            {values.taskTypeMode === 'PRESETS' ? (
                                /* Preset tasks form a tree of ANY depth (Tasks ▸ Configure), so
                                   the name is picked from ONE searchable hierarchical list — the
                                   same control the rest of the product uses. The task takes the
                                   selected node's own name; its ancestors are shown beneath as
                                   context and are never written into the name. `presetTaskId` is
                                   what the server derives the hierarchy from on read. */
                                <HierarchicalTaskPicker
                                    value={values.presetTaskId ?? ''}
                                    options={presetOptions}
                                    isRequired
                                    disabled={progressLock || presetsQuery.isLoading}
                                    hasError={touched && !!nameError}
                                    placeholder={presets.length ? 'Search and select a task…' : 'No tasks configured yet'}
                                    onChange={(option) => set({
                                        presetTaskId: option?.value || '',
                                        // The leaf, not the path: the hierarchy is derived, never
                                        // baked into the stored name.
                                        taskName: option?.label || '',
                                    })}
                                    helpText={
                                        <Typography
                                            variant="caption"
                                            sx={{ display: 'block', mt: 0.5, ml: 0.25, color: touched && nameError ? 'error.main' : 'text.secondary' }}
                                        >
                                            {(touched && nameError)
                                                // Only worth showing once there is a path to show — a
                                                // root node's "hierarchy" is just its own name again.
                                                || (selectedPath.length > 1
                                                    ? `Hierarchy: ${selectedPath.join(PATH_SEPARATOR)}`
                                                    : 'Search any level, or drill in with the arrows')}
                                        </Typography>
                                    }
                                />
                            ) : (
                                <TextField
                                    fullWidth size="small" required label="Task name" disabled={progressLock}
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
                                fullWidth size="small" multiline minRows={2} label="Description" disabled={progressLock}
                                value={values.taskDescription ?? ''}
                                onChange={(e) => set({ taskDescription: e.target.value })}
                            />
                        </Grid>

                        {/* Everything below is about who carries the work and when — a
                            different question from what the work IS, so it is separated rather
                            than continuing one twelve-field column. */}
                        <Grid item xs={12} sx={{ pt: 1.5, pb: 0.5 }}>
                            <Divider sx={{ mb: 1.5 }} />
                            <SectionLabel text="Ownership & schedule" />
                        </Grid>

                        {/* ── assignee ── */}
                        <Grid item xs={12} md={6}>
            {/* MANY people, not one. A task is handed to a group — the manager plus whoever
                                they are sharing it with — and the work is then divided into subtasks,
                                each with its own group. The FIRST person chosen is the owner: the one
                                accountable name the rest of the system still reads (`assignedToId`),
                                and the reason this is an ordered list rather than a set.

                                The project's internal team, plus YOU — the server includes the
                                caller in this list precisely so a person creating a task can
                                take it on themselves. */}
                            <Autocomplete
                                multiple
                                disableCloseOnSelect
                                options={assigneeOptions}
                                value={selectedAssignees}
                                onChange={(_, options) => {
                                    const ids = options.map((o) => o.id);
                                    set({
                                        assigneeIds: ids,
                                        // The owner is whoever is first in the list; emptying it
                                        // leaves the task unassigned, which is a real state.
                                        assignedToId: ids[0] ?? '',
                                    });
                                }}
                                getOptionLabel={(a) => employeeName(a)}
                                isOptionEqualToValue={(o, v) => o.id === v.id}
                                disabled={progressLock || assigneesQuery.isLoading || (scopeFields.project && !values.projectId)}
                                size="small"
                                fullWidth
                                autoHighlight
                                ListboxProps={{ style: { maxHeight: 240 } }}
                                slotProps={dropdownSlotProps}
                                // Clearing IS "Unassigned": a task with no owner is the absence of
                                // a choice, not a person called Unassigned sitting in the list.
                                noOptionsText="No one matches"
                                renderTags={(selected, getTagProps) => selected.map((option, index) => (
                                    <Chip
                                        {...getTagProps({ index })}
                                        key={option.id}
                                        size="small"
                                        avatar={
                                            <Avatar src={option.avatar || undefined}>
                                                {initialsOf(employeeName(option))}
                                            </Avatar>
                                        }
                                        label={employeeName(option)}
                                        // The owner is stated, not implied by position — a chip
                                        // list wraps, and "first" stops meaning anything once it
                                        // does.
                                        color={index === 0 ? 'primary' : 'default'}
                                        variant={index === 0 ? 'filled' : 'outlined'}
                                        sx={{ fontWeight: index === 0 ? 700 : 500 }}
                                    />
                                ))}
                                renderOption={(props, option) => (
                                    <Box component="li" {...props} key={option.id} sx={{ gap: 1 }}>
                                        <Avatar
                                            src={option.avatar || undefined}
                                            sx={{
                                                width: 24, height: 24, fontSize: 10, fontWeight: 700,
                                                bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.3 : 0.16),
                                                color: 'primary.main',
                                            }}
                                        >
                                            {initialsOf(employeeName(option))}
                                        </Avatar>
                                        <Typography variant="body2" noWrap>{employeeName(option)}</Typography>
                                    </Box>
                                )}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        // "Assign to", not "Assignee": the form is doing
                                        // something, and the verb says what. The noun reads as a
                                        // property of the task and left people wondering whether
                                        // it meant who assigned it.
                                        label="Assign to"
                                        placeholder={selectedAssignees.length ? undefined : 'Unassigned'}
                                        error={!progressLock && assigneesQuery.isError}
                                        helperText={
                                            // In progress-only mode this field is showing WHO the
                                            // task is assigned to — which is exactly what the
                                            // person doing the work opened it to check.
                                            progressLock
                                                ? (selectedAssignees.length
                                                    ? `Assigned to ${selectedAssignees.map((a) => employeeName(a)).join(', ')}`
                                                    : 'Nobody is assigned yet')
                                            : scopeFields.project && !values.projectId ? 'Select a project first'
                                            : assigneesQuery.isLoading ? 'Loading…'
                                            // An error must never read as "nobody is available":
                                            // one means the team is empty, the other means we
                                            // could not find out, and they need different actions.
                                            : assigneesQuery.isError
                                                ? apiErrorMessage(assigneesQuery.error, 'The team could not be loaded — retry in a moment.')
                                            : assignees.length === 0
                                                ? (scopeFields.assigneeSource === 'general'
                                                    ? 'You are not permitted to assign general tasks to anyone.'
                                                    : "No project team members are available to you on this project.")
                                                : selectedAssignees.length > 1
                                                    ? `${employeeName(selectedAssignees[0])} owns it · ${selectedAssignees.length - 1} more sharing`
                                                    : 'Pick one or more — the first is the owner'
                                        }
                                    />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                select fullWidth size="small" label="Stage" disabled={progressLock}
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
                                select fullWidth size="small" label="Priority" disabled={progressLock}
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
                                select fullWidth size="small" label="Billing" disabled={progressLock}
                                value={values.billingType ?? 'BILLABLE'}
                                onChange={(e) => set({ billingType: e.target.value as 'BILLABLE' | 'NON_BILLABLE' })}
                                helperText={values.taskScope === 'GENERAL' ? 'General task time is internal overhead, never client billing' : ' '}
                            >
                                <MenuItem value="BILLABLE">Billable</MenuItem>
                                <MenuItem value="NON_BILLABLE">Non-billable</MenuItem>
                            </TextField>
                        </Grid>

                        {/* The kit's date field, not a text box with a format hint in the
                            placeholder. That asked people to type a format correctly and had no
                            way to answer them when they did not: it took any string, showed it
                            back verbatim and sent it to an API expecting `YYYY-MM-DD`.

                            WtDateField masks and formats as you type, opens a calendar, and
                            speaks the company display format (`YYYY.MM.DD`) while its value stays
                            wire ISO — so the form still submits exactly what it did before. It is
                            NOT Formik-bound, despite what the note here used to claim; it is a
                            plain value/onChange field, which is why it drops straight in. */}
                        <Grid item xs={12} md={6}>
                            <WtDateField
                                label="Start date"
                                disabled={progressLock}
                                value={values.startDate ?? ''}
                                onChange={(next) => set({ startDate: next })}
                                helperText=" "
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <WtDateField
                                label="Due date"
                                disabled={progressLock}
                                value={values.dueDate ?? ''}
                                onChange={(next) => set({ dueDate: next })}
                                // The calendar cannot offer a date before the start; the error
                                // below still guards the case where the start moves afterwards.
                                minDate={values.startDate || undefined}
                                error={touched && !!dateError}
                                helperText={(touched && dateError) || ' '}
                            />
                        </Grid>

                        {/* Progress is reported BY the person doing the work, not set by whoever
                            hands it out — and a task being created has not been started, so the
                            slider could only ever say 0%. It belongs to editing, where the owner
                            moves it as the work advances (and the board's drag does the same job
                            for stage). Omitted entirely on create, so the payload carries no
                            progress at all and the server's own default stands. */}
                        {(isEdit || progressLock) && (
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
                        )}
                    </Grid>
                </Stack>
            </Box>

            <Stack
                direction={{ xs: 'column-reverse', sm: 'row' }}
                spacing={1}
                justifyContent="flex-end"
                className="shrink-0"
                sx={{ px: { xs: 2, sm: 2.75 }, py: 1.75, borderTop: '1px solid', borderColor: 'divider' }}
            >
                <WtButton ghost onClick={onClose} disabled={saving} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    cancel
                </WtButton>
                <WtButton
                    onClick={handleSubmit}
                    disabled={saving}
                    startIcon={saving
                        ? <CircularProgress size={14} color="inherit" />
                        : <KTIcon iconName={isEdit ? 'check' : 'plus'} className="fs-6" />}
                    sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: 150 }}
                >
                    {saving ? 'saving…' : progressLock ? 'save progress' : isEdit ? 'save changes' : 'create task'}
                </WtButton>
            </Stack>
        </GlassDialog>

        {/* Rendered as a sibling, so it survives the form closing: the offer belongs to the
            task that was just saved, not to the form that saved it. */}
        {notify && (
            <NotifyOnWhatsAppDialog
                open
                onClose={() => setNotify(null)}
                taskId={notify.taskId}
                taskName={notify.taskName}
                people={notify.people}
            />
        )}
        </>
    );
};

export default TaskFormDialog;
