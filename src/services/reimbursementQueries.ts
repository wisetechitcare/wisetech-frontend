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

/**
 * The one topic that is not in the master: always offered, always the default, and what a query
 * with no topic falls back to. It is also the only topic that makes the question text mandatory —
 * every other one already says what is being asked.
 */
export const OTHER_TOPIC = 'Something else';

export type TopicScope = QueryScope | 'BOTH';

/** A row of the admin-managed "What is this about?" master (Reimbursement Configuration). */
export interface QueryTopic {
    id: string;
    label: string;
    scope: TopicScope;
}

/**
 * `category` is the topic LABEL itself since the master landed — the old enum values were
 * converted in the migration, so nothing here has to map codes to text any more.
 */
export const queryCategoryLabel = (value?: string | null): string => value?.trim() || OTHER_TOPIC;

const unwrap = <T,>(data: any, key: string): T => data?.data?.[key] ?? data?.[key];

// ─── Topic master ─────────────────────────────────────────────────────────────

export const fetchQueryTopics = async (): Promise<QueryTopic[]> => {
    const { data } = await axios.get(`${BASE}/query-topics`);
    return unwrap<QueryTopic[]>(data, 'topics') ?? [];
};

export const createQueryTopic = async (label: string, scope: TopicScope): Promise<QueryTopic> => {
    const { data } = await axios.post(`${BASE}/query-topics`, { label, scope });
    return unwrap<QueryTopic>(data, 'topic');
};

export const updateQueryTopic = async (id: string, label: string, scope: TopicScope): Promise<QueryTopic> => {
    const { data } = await axios.put(`${BASE}/query-topics/${id}`, { label, scope });
    return unwrap<QueryTopic>(data, 'topic');
};

export const deleteQueryTopic = async (id: string): Promise<void> => {
    await axios.delete(`${BASE}/query-topics/${id}`);
};

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
    /** Optional unless the topic is OTHER_TOPIC — the topic itself becomes the opening message. */
    message?: string;
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

/**
 * Can this thread be closed right now?
 *
 * Mirrors `canResolve` in the backend's `reimbursementQueryState` — only an ANSWERED thread
 * closes, because the approver asked the question and cannot decide it is answered before the
 * employee has said anything. Every surface offering a Resolve control must ask this first:
 * BatchWorkflowPanel offered the button on an OPEN thread, directly beneath its own "Awaiting
 * employee response" chip, and the server rejected the click with a 400 every time.
 */
export const canResolveQuery = (status: QueryStatus): boolean => status === 'ANSWERED';

export const resolveQuery = async (queryId: string, note?: string): Promise<QueryThread> => {
    const { data } = await axios.patch(`${BASE}/queries/${queryId}/resolve`, { note });
    return unwrap<QueryThread>(data, 'query');
};

export const reopenQuery = async (queryId: string, message: string): Promise<QueryThread> => {
    const { data } = await axios.patch(`${BASE}/queries/${queryId}/reopen`, { message });
    return unwrap<QueryThread>(data, 'query');
};
