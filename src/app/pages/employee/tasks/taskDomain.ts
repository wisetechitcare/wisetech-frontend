/**
 * Task domain — the PURE decision logic behind the Task UI.
 *
 * No React, no network, no clock of its own. Everything a task screen has to *decide* — is this
 * overdue, is this stage terminal, which fields does this scope show, what does the filter state
 * translate into on the wire — lives here so it can be reasoned about and tested directly
 * instead of being buried in JSX.
 *
 * Mirrors the backend's `taskGuards.ts` contract. **This is UX, never security**: every rule
 * here is also enforced server-side, and nothing here may be treated as a boundary.
 */

export type TaskScope = 'PROJECT' | 'GENERAL';
export type TaskTypeMode = 'PRESETS' | 'CUSTOM';

export interface TaskStatusRef {
    id: string;
    name: string;
    color?: string | null;
    sortOrder?: number;
    isFinal?: boolean;
}

export interface TaskRow {
    id: string;
    taskName: string;
    taskDescription?: string | null;
    taskScope: TaskScope;
    taskType?: TaskTypeMode;
    createdBy?: { id: string; avatar?: string | null; users?: { firstName?: string; lastName?: string } | null } | null;
    progress?: number | null;
    dueDate?: string | null;
    startDate?: string | null;
    statusId?: string | null;
    status?: TaskStatusRef | null;
    priority?: { id: string; name: string; color?: string | null } | null;
    leadId?: string | null;
    lead?: { id: string; title?: string | null } | null;
    assignedToId?: string | null;
    assignedTo?: { id: string; avatar?: string | null; users?: { firstName?: string; lastName?: string } | null } | null;
    parentTaskId?: string | null;
    parentTask?: { id: string; taskName?: string | null } | null;
    deliverableId?: string | null;
    deliverable?: { id: string; name?: string | null; status?: string | null } | null;
    timesheets?: Array<{ logTimeHours?: number; logTimeMinutes?: number; logTimeSeconds?: number }>;
    billingType?: 'BILLABLE' | 'NON_BILLABLE';
    _count?: { subtasks?: number };
    createdAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage semantics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Is this task in a terminal stage?
 *
 * Reads `TaskStatus.isFinal` — **never** the stage NAME. The previous UI decided completion by
 * comparing the name to "completed", so renaming a stage in Configure silently broke it
 * (RSK-072). A task with no stage is not final; it has not started moving.
 */
export const isTaskFinal = (task: Pick<TaskRow, 'status'>): boolean => task.status?.isFinal === true;

/**
 * Is this task past its due date and still open?
 *
 * `now` is injected rather than read from the clock, so the rule is testable and a board cannot
 * disagree with a table about "today". A task in a terminal stage is never overdue — work that
 * has stopped cannot be late.
 */
export const isTaskOverdue = (task: Pick<TaskRow, 'dueDate' | 'status'>, now: Date): boolean => {
    if (!task.dueDate) return false;
    if (isTaskFinal(task)) return false;
    const due = new Date(task.dueDate);
    if (Number.isNaN(due.getTime())) return false;
    return due.getTime() < now.getTime();
};

/** Days until due. Negative means overdue. `null` when there is no due date. */
export const daysUntilDue = (dueDate: string | null | undefined, now: Date): number | null => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return null;
    const startOfDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return Math.round((startOfDay(due) - startOfDay(now)) / 86_400_000);
};

/** Short human label for a due date — what a card shows next to the clock icon. */
export const dueLabel = (dueDate: string | null | undefined, now: Date): string | null => {
    const days = daysUntilDue(dueDate, now);
    if (days === null) return null;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days === -1) return '1 day overdue';
    if (days < 0) return `${Math.abs(days)} days overdue`;
    return `Due in ${days} days`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Progress
// ─────────────────────────────────────────────────────────────────────────────

/** Clamp to the 0–100 the server enforces, so a bad value renders as a bar rather than garbage. */
export const clampProgress = (value: number | null | undefined): number => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.min(100, Math.max(0, Math.round(n)));
};

/**
 * Subtask completion, counted from the subtasks actually loaded.
 *
 * Deliberately NOT a progress rollup onto the parent — that was explicitly deferred, because an
 * automatic rollup would silently overwrite a manager's own assessment. This only reports what
 * the children say about themselves.
 */
export const subtaskProgress = (subtasks: Array<Pick<TaskRow, 'status'>>): { done: number; total: number } => ({
    done: subtasks.filter(isTaskFinal).length,
    total: subtasks.length,
});

// ─────────────────────────────────────────────────────────────────────────────
// Time
// ─────────────────────────────────────────────────────────────────────────────

/** Total logged seconds across a task's timesheet entries. */
export const loggedSeconds = (
    timesheets: Array<{ logTimeHours?: number; logTimeMinutes?: number; logTimeSeconds?: number }> | undefined,
): number =>
    (timesheets ?? []).reduce(
        (sum, t) => sum + (t.logTimeHours || 0) * 3600 + (t.logTimeMinutes || 0) * 60 + (t.logTimeSeconds || 0),
        0,
    );

/** `0` renders as an em dash, not "0h" — a task with no time logged has no time, not zero time. */
export const formatDuration = (totalSeconds: number): string => {
    if (!totalSeconds || totalSeconds < 0) return '—';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    if (m) return `${m}m`;
    return `${totalSeconds}s`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Scope — which fields a form shows
// ─────────────────────────────────────────────────────────────────────────────

export interface ScopeFieldVisibility {
    project: boolean;
    deliverable: boolean;
    /** PROJECT assignees come from the project's internal team; GENERAL from management scope. */
    assigneeSource: 'project-team' | 'general';
}

/**
 * What does a form for this scope show?
 *
 * A GENERAL task must never display a project or deliverable field: those two columns are what
 * the Deliverable → Billing chain follows, and the server refuses them outright. Hiding them is
 * how the user is stopped from asking for something that cannot exist — the refusal is the
 * server's job either way.
 */
export const fieldsForScope = (scope: TaskScope): ScopeFieldVisibility =>
    scope === 'GENERAL'
        ? { project: false, deliverable: false, assigneeSource: 'general' }
        : { project: true, deliverable: true, assigneeSource: 'project-team' };

/** Client-side mirror of the server's `checkTaskScopeConsistency`. UX only. */
export const validateScopeShape = (
    scope: TaskScope,
    values: { projectId?: string | null; deliverableId?: string | null },
): string | null => {
    if (scope === 'GENERAL') {
        if (values.projectId) return 'A general task cannot belong to a project';
        if (values.deliverableId) return 'A general task cannot be linked to a deliverable';
        return null;
    }
    if (!values.projectId) return 'Project is required for a project task';
    return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Create/update payload
// ─────────────────────────────────────────────────────────────────────────────

export interface TaskFormValues {
    taskScope: TaskScope;
    taskTypeMode: TaskTypeMode;
    taskName: string;
    taskDescription?: string;
    projectId?: string;
    assignedToId?: string;
    statusId?: string;
    priorityId?: string;
    parentTaskId?: string;
    startDate?: string | null;
    dueDate?: string | null;
    progress?: number | string;
    billingType?: 'BILLABLE' | 'NON_BILLABLE';
}

/**
 * Build the API payload from form values.
 *
 * Three rules this encodes, all of which the old form got wrong:
 *
 *  1. **`createdById` / `lastEditedById` are never sent.** They are derived from the session;
 *     `createdById` is in fact a protected field, so sending it made every UPDATE fail with 400.
 *  2. **A GENERAL task omits `projectId` entirely** — sending `''` reads as a project reference.
 *  3. **`taskType` reflects the mode the user is actually in.** The old form branched on a
 *     state snapshot whose setter was never called, so it could show "Presets" while submitting
 *     CUSTOM. `taskType` and `taskScope` are separate questions and stay separate here.
 */
export const buildTaskPayload = (values: TaskFormValues): Record<string, unknown> => {
    const isGeneral = values.taskScope === 'GENERAL';
    const payload: Record<string, unknown> = {
        taskScope: values.taskScope,
        taskType: values.taskTypeMode,
        taskName: (values.taskName || '').trim(),
        taskDescription: values.taskDescription || null,
        statusId: values.statusId || null,
        priorityId: values.priorityId || null,
        assignedToId: values.assignedToId || null,
        startDate: values.startDate || null,
        dueDate: values.dueDate || null,
        billingType: values.billingType || 'BILLABLE',
    };
    if (!isGeneral && values.projectId) payload.projectId = values.projectId;
    if (values.parentTaskId) payload.parentTaskId = values.parentTaskId;
    if (values.progress !== undefined && values.progress !== '') {
        payload.progress = clampProgress(Number(values.progress));
    }
    return payload;
};

// ─────────────────────────────────────────────────────────────────────────────
// Filters → query string
// ─────────────────────────────────────────────────────────────────────────────

export interface TaskFilterState {
    search?: string;
    taskScope?: TaskScope | '';
    statusId?: string;
    priorityId?: string;
    assignedToId?: string;
    projectId?: string;
    billingType?: 'BILLABLE' | 'NON_BILLABLE' | '';
    overdue?: boolean;
    mine?: boolean;
    topLevelOnly?: boolean;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
}

/**
 * Translate filter state into query parameters.
 *
 * Empty values are DROPPED rather than sent as `''`, so "no filter" and "filter on nothing" can
 * never be confused on the wire. Every key here has a matching branch in the server's
 * `buildTaskFilters`; there is no parameter the UI can invent, and the server ANDs whatever it
 * accepts with the caller's visibility predicate — so no filter can widen access.
 */
export const filtersToQuery = (filters: TaskFilterState): Record<string, string> => {
    const q: Record<string, string> = {};
    const put = (key: string, value: unknown) => {
        if (value === undefined || value === null || value === '' || value === false) return;
        q[key] = String(value);
    };
    put('search', filters.search?.trim());
    put('taskScope', filters.taskScope);
    put('statusId', filters.statusId);
    put('priorityId', filters.priorityId);
    put('assignedToId', filters.assignedToId);
    put('projectId', filters.projectId);
    put('billingType', filters.billingType);
    put('overdue', filters.overdue);
    put('mine', filters.mine);
    put('topLevelOnly', filters.topLevelOnly);
    put('sortBy', filters.sortBy);
    put('sortDir', filters.sortDir);
    return q;
};

/** How many filters are actually narrowing the list — drives the "N active" badge. */
export const activeFilterCount = (filters: TaskFilterState): number =>
    Object.keys(filtersToQuery({ ...filters, sortBy: undefined, sortDir: undefined, search: undefined })).length;

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pull the server's own message out of an axios error.
 *
 * The API returns its reason in `detail` (`{statusCode, hasError, detail}`), and those reasons
 * are the useful ones — "Assignee must belong to this project's internal team" tells the user
 * exactly what to change. A generic "Request failed" would throw that away.
 */
export const apiErrorMessage = (error: unknown, fallback = 'Something went wrong'): string => {
    const e = error as { response?: { data?: { detail?: string; message?: string }; status?: number }; message?: string };
    const data = e?.response?.data;
    if (data?.detail) return data.detail;
    if (data?.message && data.message !== 'Bad request') return data.message;
    if (e?.response?.status === 403) return 'You are not permitted to do that';
    if (e?.response?.status === 404) return 'Not found';
    return e?.message || fallback;
};

// ─────────────────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────────────────

export const employeeName = (
    employee: { users?: { firstName?: string | null; lastName?: string | null } | null } | null | undefined,
): string => {
    const first = employee?.users?.firstName?.trim() || '';
    const last = employee?.users?.lastName?.trim() || '';
    const full = `${first} ${last}`.trim();
    return full || 'Unassigned';
};

export const initialsOf = (name: string): string =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';

/** Short display id — the full UUID is unusable on a card. */
export const shortTaskId = (id: string): string => `#${String(id).slice(0, 8)}`;
