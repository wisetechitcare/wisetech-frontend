import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;
const BASE = `${API_BASE_URL}/api/reimbursements`;

/**
 * Reimbursement query threads.
 *
 * No permission gate on any of these — both sides of a conversation use them, and the employee
 * replying holds no approval permission at all. The server resolves the caller's role per thread
 * and signs each message from the SESSION, so a client cannot post as the other party.
 */

export type QueryScope = 'REQUEST' | 'BATCH';
export type QueryStatus = 'OPEN' | 'ANSWERED' | 'RESOLVED' | 'REOPENED';
export type QueryRole = 'APPROVER' | 'EMPLOYEE';

export interface QueryMessage {
    id: string;
    queryId: string;
    authorId: string;
    authorRole: QueryRole;
    body: string;
    attachments: string[] | null;
    createdAt: string;
}

export interface QueryThread {
    id: string;
    scope: QueryScope;
    status: QueryStatus;
    category: string;
    level: number | null;
    batchId: string;
    reimbursementId: string | null;
    versionId: string | null;
    raisedById: string;
    raisedAt: string;
    resolvedById: string | null;
    resolvedAt: string | null;
    messages: QueryMessage[];
}

/** The fixed vocabulary the backend enum carries, with labels for the picker. */
export const QUERY_CATEGORIES: Array<{ value: string; label: string; scope: QueryScope | 'BOTH' }> = [
    { value: 'INCORRECT_LOCATION', label: 'Incorrect location', scope: 'REQUEST' },
    { value: 'INCORRECT_AMOUNT', label: 'Incorrect amount', scope: 'REQUEST' },
    { value: 'MISSING_RECEIPT', label: 'Missing receipt', scope: 'REQUEST' },
    { value: 'INCORRECT_DATE', label: 'Incorrect date', scope: 'REQUEST' },
    { value: 'WRONG_CATEGORY', label: 'Wrong category', scope: 'REQUEST' },
    { value: 'DUPLICATE_EXPENSE', label: 'Duplicate expense', scope: 'REQUEST' },
    { value: 'POLICY_CLARIFICATION', label: 'Policy clarification', scope: 'BOTH' },
    { value: 'MISSING_AUTHORIZATION', label: 'Missing travel authorization', scope: 'BATCH' },
    { value: 'MISSING_DECLARATION', label: 'Missing declaration', scope: 'BATCH' },
    { value: 'BATCH_CLARIFICATION', label: 'Batch clarification', scope: 'BATCH' },
    { value: 'OTHER', label: 'Something else', scope: 'BOTH' },
];

export const queryCategoryLabel = (value?: string | null): string =>
    QUERY_CATEGORIES.find((c) => c.value === value)?.label ?? 'Query';

const unwrap = <T,>(data: any, key: string): T => data?.data?.[key] ?? data?.[key];

export const fetchQuery = async (queryId: string): Promise<QueryThread> => {
    const { data } = await axios.get(`${BASE}/queries/${queryId}`);
    return unwrap<QueryThread>(data, 'query');
};

export const fetchRequestQueries = async (reimbursementId: string): Promise<QueryThread[]> => {
    const { data } = await axios.get(`${BASE}/requests/${reimbursementId}/queries`);
    return unwrap<QueryThread[]>(data, 'queries') ?? [];
};

export const fetchBatchQueries = async (batchId: string): Promise<QueryThread[]> => {
    const { data } = await axios.get(`${BASE}/batches/${batchId}/queries`);
    return unwrap<QueryThread[]>(data, 'queries') ?? [];
};

/**
 * Which side of the conversation the viewer is on — so the UI offers only what will succeed.
 *
 * Returns null when the caller is not a participant at all, which disables the composer rather
 * than showing a Send button that would 403.
 */
export const fetchParticipantRole = async (reimbursementId: string): Promise<QueryRole | null> => {
    try {
        const { data } = await axios.get(`${BASE}/requests/${reimbursementId}/participant-role`);
        return unwrap<QueryRole>(data, 'role') ?? null;
    } catch {
        return null;
    }
};

/** The same, for a BATCH-scope thread, which has no single request to resolve a chain from. */
export const fetchBatchParticipantRole = async (batchId: string): Promise<QueryRole | null> => {
    try {
        const { data } = await axios.get(`${BASE}/batches/${batchId}/participant-role`);
        return unwrap<QueryRole>(data, 'role') ?? null;
    } catch {
        return null;
    }
};

export const raiseQuery = async (payload: {
    scope: QueryScope;
    batchId: string;
    reimbursementId?: string | null;
    category?: string;
    message: string;
    attachments?: string[];
}): Promise<QueryThread> => {
    const { data } = await axios.post(`${BASE}/queries`, payload);
    return unwrap<QueryThread>(data, 'query');
};

export const postQueryMessage = async (
    queryId: string, body: string, attachments?: string[],
): Promise<QueryThread> => {
    const { data } = await axios.post(`${BASE}/queries/${queryId}/messages`, { body, attachments });
    return unwrap<QueryThread>(data, 'query');
};

export const resolveQuery = async (queryId: string, note?: string): Promise<QueryThread> => {
    const { data } = await axios.patch(`${BASE}/queries/${queryId}/resolve`, { note });
    return unwrap<QueryThread>(data, 'query');
};

export const reopenQuery = async (queryId: string, message: string): Promise<QueryThread> => {
    const { data } = await axios.patch(`${BASE}/queries/${queryId}/reopen`, { message });
    return unwrap<QueryThread>(data, 'query');
};
