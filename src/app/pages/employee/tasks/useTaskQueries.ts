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
    getAvailableProjects,
    getBoardProjects,
    getProjectAssignees,
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

export const useTaskTimesheets = (id: string | undefined) =>
    useQuery({
        queryKey: queryKeys.tasks.timesheets(id ?? ''),
        queryFn: () => getTimesheetByTaskId(id as string),
        enabled: !!id,
    });

// Configuration — changes rarely, so a long stale time keeps the board from refetching stages
// on every mount. Invalidated explicitly when Configure writes.
const CONFIG_STALE = 5 * 60 * 1000;

export const useTaskStatuses = () =>
    useQuery({
        queryKey: queryKeys.tasks.statuses(),
        queryFn: getAllTasksStatus,
        staleTime: CONFIG_STALE,
    });

export const useTaskPriorities = () =>
    useQuery({
        queryKey: queryKeys.tasks.priorities(),
        queryFn: getAllPriority,
        staleTime: CONFIG_STALE,
    });

export const usePresetTasks = () =>
    useQuery({
        queryKey: queryKeys.tasks.presets(),
        queryFn: getAllPersetTasks,
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
        mutationFn: ({ name, projectId }: { name: string; projectId: string }) =>
            createTasksStatus({ name, projectId }),
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
