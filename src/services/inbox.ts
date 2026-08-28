import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * The Inbox — every employee's own task list.
 *
 * No permission is required to call any of these: the backend scopes every response to the
 * caller's own employee id, read from the session. That is the point of the layer — an employee
 * whose expense has been queried has something to do just as much as the manager approving it.
 */

export type InboxTaskType =
    | 'APPROVAL_REQUIRED'
    | 'QUERY_RESPONSE_RECEIVED'
    | 'RESUBMISSION_RECEIVED'
    | 'QUERY_RECEIVED'
    | 'REJECTION_RECEIVED'
    | 'ACTION_REQUIRED';

export type InboxTaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface InboxTask {
    id: string;
    employeeId: string;
    type: InboxTaskType;
    status: InboxTaskStatus;
    entityType: string;
    entityId: string;
    batchId: string | null;
    title: string;
    message: string | null;
    path: string | null;
    payload: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
}

export const fetchInboxTasks = async (includeCompleted = false): Promise<InboxTask[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/api/inbox`, { params: { includeCompleted } });
    return data?.data?.tasks ?? data?.tasks ?? [];
};

export const fetchInboxCount = async (): Promise<number> => {
    const { data } = await axios.get(`${API_BASE_URL}/api/inbox/count`);
    return data?.data?.count ?? data?.count ?? 0;
};

export const markInboxTaskInProgress = async (taskId: string): Promise<void> => {
    await axios.patch(`${API_BASE_URL}/api/inbox/${taskId}/in-progress`);
};

/** "I've seen this" — closes a task with no further action (e.g. a final rejection) to Completed. */
export const acknowledgeInboxTask = async (taskId: string): Promise<void> => {
    await axios.patch(`${API_BASE_URL}/api/inbox/${taskId}/acknowledge`);
};
