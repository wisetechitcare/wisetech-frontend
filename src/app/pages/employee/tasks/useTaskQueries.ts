/**
 * React Query hooks for the Task module (Phase 4 §21).
 *
 * The old module had **zero** React Query usage: bare `useEffect`s with no `AbortController`
 * and no `ignore` flag, so navigating quickly between two tasks rendered the first task's data
 * under the second task's id. Query keys fix that structurally — a response is filed against
 * the key it was requested for, so a late reply for task A can never paint task B.
 *
 * ONE invalidation helper. Every write goes through it, because the board and the table are two
 * projections of one dataset: refreshing one without the other leaves them disagreeing on
 * screen, which is worse than refreshing both.
 */
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
    getTaskBoard,
    getTaskList,
    getTaskById,
    getTaskSubtasks,
    getTimesheetByTaskId,
    getAllTasksStatus,
    getAllPriority,
    getAllPersetTasks,
    type PresetTaskScope,
    getAvailableProjects,
    getBoardProjects,
    getProjectAssignees,
    getProjectTeam,
    removeProjectTeamMember,
    promoteProjectTeamMember,
    getGeneralAssignees,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatusById,
    createTimeSheet,
    deleteTimeSheetById,
    reorderTaskStatuses,
    createTasksStatus,
    deleteTasksStatus,
    reorderBoardTasks,
} from '@services/tasks';

// ─────────────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────────────

export const useTaskBoard = (filters: Record<string, string>, enabled = true) =>
    useQuery({
        queryKey: queryKeys.tasks.board(filters),
        queryFn: () => getTaskBoard(filters),
        enabled,
        // The board flickers to empty on every filter keystroke without this; keeping the last
        // page visible while the next loads is what makes filtering feel instant.
        placeholderData: keepPreviousData,
    });

export const useTaskList = (params: Record<string, string>, enabled = true) =>
    useQuery({
        queryKey: queryKeys.tasks.list(params),
        queryFn: () => getTaskList(params),
        enabled,
        placeholderData: keepPreviousData,
    });

export const useTask = (id: string | undefined) =>
    useQuery({
        queryKey: queryKeys.tasks.detail(id ?? ''),
        queryFn: () => getTaskById(id as string),
        enabled: !!id,
    });

export const useSubtasks = (id: string | undefined) =>
    useQuery({
        queryKey: queryKeys.tasks.subtasks(id ?? ''),
        queryFn: () => getTaskSubtasks(id as string),
        enabled: !!id,
    });

/**
 * A task's timesheets — and, inside them, who is on the clock right now.
 *
 * Polled while the tab is open, because a running timer is somebody ELSE's action: the manager
 * who started it and the person whose task it is are looking at two different browsers, and
 * neither invalidates the other's cache. Thirty seconds is chosen against what the data is worth
 * — a stopwatch that is up to half a minute stale still answers "is anyone working on this", and
 * the elapsed figure itself ticks locally from the server's start time, so the display stays
 * smooth between refetches.
 *
 * `refetchIntervalInBackground` is left off deliberately: a hidden tab polling every 30s for the
 * rest of the day is somebody's battery.
 */
export const useTaskTimesheets = (id: string | undefined) =>
    useQuery({
        queryKey: queryKeys.tasks.timesheets(id ?? ''),
        queryFn: () => getTimesheetByTaskId(id as string),
        enabled: !!id,
        refetchInterval: 30_000,
        refetchOnWindowFocus: true,
    });

// Configuration — changes rarely, so a long stale time keeps the board from refetching stages
// on every mount. Invalidated explicitly when Configure writes.
const CONFIG_STALE = 5 * 60 * 1000;

/**
 * The stages a board may show. Pass the project and you get its OWN lanes alongside the
 * company-wide ones; omit it and you get the company-wide set alone — which is what every
 * caller used to do, and why a lane created on a project's board never appeared in the task
 * form's Stage list.
 */
export const useTaskStatuses = (projectId?: string) =>
    useQuery({
        queryKey: queryKeys.tasks.statuses(projectId),
        queryFn: () => getAllTasksStatus(projectId),
        staleTime: CONFIG_STALE,
    });

export const useTaskPriorities = () =>
    useQuery({
        queryKey: queryKeys.tasks.priorities(),
        queryFn: getAllPriority,
        staleTime: CONFIG_STALE,
    });

/**
 * One preset-task catalogue. Keyed per scope, so switching a task between Project and General
 * swaps the tree instead of showing the other catalogue's cached nodes.
 */
export const usePresetTasks = (scope: PresetTaskScope = 'PROJECT') =>
    useQuery({
        queryKey: queryKeys.tasks.presets(scope),
        queryFn: () => getAllPersetTasks(scope),
        staleTime: CONFIG_STALE,
    });

/**
 * The authorized selectors. These are NOT "all projects" / "all employees" — the server resolves
 * them through the same rules the write path enforces, so anything returned here is guaranteed
 * to be accepted on submit. Never filter these further in the component.
 */
export const useAvailableProjects = () =>
    useQuery({
        queryKey: queryKeys.tasks.availableProjects(),
        queryFn: getAvailableProjects,
        staleTime: CONFIG_STALE,
    });

/**
 * The rail's project list. Separate hook AND separate key from  because
 * they answer different questions — collapsing them would either empty the rail for a
 * non-manager or offer projects the create form must refuse.
 */
export const useBoardProjects = () =>
    useQuery({
        queryKey: queryKeys.tasks.boardProjects(),
        queryFn: getBoardProjects,
        staleTime: 60 * 1000,
    });

export const useProjectAssignees = (projectId: string | undefined) =>
    useQuery({
        queryKey: queryKeys.tasks.projectAssignees(projectId ?? ''),
        queryFn: () => getProjectAssignees(projectId as string),
        enabled: !!projectId,
    });

/**
 * One project's whole internal team. Fetched only while the dialog that shows it is open —
 * the board header itself already has the first faces from the rail payload, so nothing needs
 * this until somebody asks to see everyone.
 */
export const useProjectTeam = (projectId: string | undefined, enabled = true) =>
    useQuery({
        queryKey: queryKeys.tasks.projectTeam(projectId ?? ''),
        queryFn: () => getProjectTeam(projectId as string),
        enabled: !!projectId && enabled,
        staleTime: CONFIG_STALE,
    });

/**
 * Remove one person from a project's team.
 *
 * Invalidates the whole task dataset, not just the team: the removal unassigns their tasks on
 * that project, so the board, the table and the rail's avatar stack are all now stale. This is
 * the one mutation in the module whose effects reach outside its own query.
 */
export const useRemoveProjectTeamMember = () => {
    const qc = useQueryClient();
    const invalidate = useInvalidateTasks();
    return useMutation({
        mutationFn: ({ projectId, employeeId }: { projectId: string; employeeId: string }) =>
            removeProjectTeamMember(projectId, employeeId),
        onSuccess: (_data, { projectId }) => {
            invalidate();
            qc.invalidateQueries({ queryKey: queryKeys.tasks.projectTeam(projectId) });
            qc.invalidateQueries({ queryKey: queryKeys.tasks.projectAssignees(projectId) });
        },
    });
};

/**
 * Promote a team member to project manager.
 *
 * Invalidates as broadly as the removal does: project authority decides who may be ASSIGNED work
 * and who may create it, so the assignee selectors and the creatable-project list are both stale
 * the moment this succeeds.
 */
export const usePromoteProjectManager = () => {
    const qc = useQueryClient();
    const invalidate = useInvalidateTasks();
    return useMutation({
        mutationFn: ({ projectId, employeeId }: { projectId: string; employeeId: string }) =>
            promoteProjectTeamMember(projectId, employeeId),
        onSuccess: (_data, { projectId }) => {
            invalidate();
            qc.invalidateQueries({ queryKey: queryKeys.tasks.projectTeam(projectId) });
            qc.invalidateQueries({ queryKey: queryKeys.tasks.projectAssignees(projectId) });
            qc.invalidateQueries({ queryKey: queryKeys.tasks.availableProjects() });
        },
    });
};

export const useGeneralAssignees = (enabled = true) =>
    useQuery({
        queryKey: queryKeys.tasks.generalAssignees(),
        queryFn: getGeneralAssignees,
        enabled,
        staleTime: CONFIG_STALE,
    });

// ─────────────────────────────────────────────────────────────────────────────
// Writes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Invalidate everything task-shaped.
 *
 * Deliberately coarse. A stage move changes the board, the table, the task itself and its
 * parent's subtask counts; enumerating those precisely is how caches drift. The task dataset is
 * small enough that one broad invalidation is correct and cheap.
 */
export const useInvalidateTasks = () => {
    const qc = useQueryClient();
    return () => qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
};

export const useCreateTask = () => {
    const invalidate = useInvalidateTasks();
    return useMutation({
        mutationFn: (payload: Record<string, unknown>) => createTask(payload),
        onSuccess: invalidate,
    });
};

export const useUpdateTask = () => {
    const invalidate = useInvalidateTasks();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => updateTask(id, payload),
        onSuccess: invalidate,
    });
};

export const useDeleteTask = () => {
    const invalidate = useInvalidateTasks();
    return useMutation({
        mutationFn: (id: string) => deleteTask(id),
        onSuccess: invalidate,
    });
};

/**
 * The Kanban stage move.
 *
 * Optimism is handled by the BOARD, not here: it owns the column arrays and can put a card back
 * where it came from. This hook's job is the request and the invalidation that reconciles with
 * the server afterwards. `onSettled` rather than `onSuccess` — a failed move still needs the
 * cache refreshed, or the rolled-back card can disagree with what the server actually holds.
 */
export const useMoveTaskStage = () => {
    const invalidate = useInvalidateTasks();
    return useMutation({
        mutationFn: ({ taskId, statusId }: { taskId: string; statusId: string }) =>
            updateTaskStatusById(taskId, statusId),
        onSettled: invalidate,
    });
};

/**
 * The within-lane arrangement.
 *
 * `onSettled`, like the stage move: a refused reorder still needs the cache refreshed, or the
 * board keeps showing an order the server does not hold.
 */
export const useReorderBoardTasks = () => {
    const invalidate = useInvalidateTasks();
    return useMutation({
        mutationFn: ({ statusId, taskIds }: { statusId: string; taskIds: string[] }) =>
            reorderBoardTasks(statusId, taskIds),
        onSettled: invalidate,
    });
};

export const useCreateTimesheet = () => {
    const invalidate = useInvalidateTasks();
    return useMutation({
        mutationFn: (payload: Record<string, unknown>) => createTimeSheet(payload),
        onSuccess: invalidate,
    });
};

export const useDeleteTimesheet = () => {
    const invalidate = useInvalidateTasks();
    return useMutation({
        mutationFn: (id: string) => deleteTimeSheetById(id),
        onSuccess: invalidate,
    });
};

/**
 * "Add another list" on the board.
 *
 * The SAME endpoint Configure posts to, with a `projectId` — a lane is a task stage, not a second
 * kind of thing. Sending the project is what confines it to this board; the server also checks the
 * caller's authority over that project, so the button cannot create a lane on somebody else's.
 */
export const useCreateBoardList = () => {
    const invalidate = useInvalidateTasks();
    return useMutation({
        // No `projectId` = a company-wide stage. Omitted from the payload entirely rather than
        // sent as null: the handler reads its presence to decide which authorization branch
        // applies, and a stray key is not a decision anyone made.
        mutationFn: ({ name, projectId }: { name: string; projectId?: string }) =>
            createTasksStatus(projectId ? { name, projectId } : { name }),
        onSuccess: invalidate,
    });
};

/**
 * Remove a board list. Only ever offered for a project lane — the API refuses a company-wide
 * stage, and refuses a lane that still holds tasks rather than silently un-staging them.
 */
export const useDeleteBoardList = () => {
    const invalidate = useInvalidateTasks();
    return useMutation({
        mutationFn: (statusId: string) => deleteTasksStatus(statusId),
        onSuccess: invalidate,
    });
};

export const useReorderStatuses = () => {
    const invalidate = useInvalidateTasks();
    return useMutation({
        mutationFn: (order: { id: string; sortOrder: number }[]) => reorderTaskStatuses(order),
        onSuccess: invalidate,
    });
};
