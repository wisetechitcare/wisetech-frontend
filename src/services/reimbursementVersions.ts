import axios from 'axios';
import type { QueryRole, QueryScope, QueryStatus } from './reimbursementQueries';

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;
const BASE = `${API_BASE_URL}/api/reimbursements`;

/**
 * Version history and the resubmission preview.
 *
 * The preview is the screen the spec requires BEFORE an employee commits an edit: the
 * Field | Previous | New rows, and the warning that approval will restart from level 1. It is
 * read-only — the server computes the diff and writes nothing.
 */

export interface FieldChange {
    field: string;
    label: string;
    previous: string | null;
    next: string | null;
}

export interface VersionApprovalStep {
    level: number;
    approverId: string;
    approverName: string | null;
    status: string;
    actedAt: string | null;
    comments: string | null;
}

export interface VersionQuery {
    id: string;
    scope: QueryScope;
    status: QueryStatus;
    category: string;
    level: number | null;
    raisedAt: string;
    resolvedAt: string | null;
    messages: Array<{ id: string; authorRole: QueryRole; body: string; createdAt: string }>;
}

export interface ReimbursementVersion {
    id: string;
    reimbursementId: string;
    versionNumber: number;
    reimbursementTypeId: string;
    expenseDate: string;
    description: string;
    document: string | null;
    amount: string;
    fromLocation: string | null;
    toLocation: string | null;
    clientCompanyId: string | null;
    clientTypeId: string | null;
    leadId: string | null;
    /** The Field | Previous | New rows that produced THIS version. Null on version 1. */
    changeSummary: FieldChange[] | null;
    reason: string | null;
    createdById: string | null;
    createdAt: string;
    supersededAt: string | null;
    isCurrent: boolean;
    approval: {
        instanceId: string;
        status: string;
        currentLevel: number;
        totalLevels: number;
        steps: VersionApprovalStep[];
    } | null;
    queries: VersionQuery[];
}

export interface ResubmissionPreview {
    reimbursementId: string;
    currentVersion: number;
    changes: FieldChange[];
    /** True when the claim changed and approval will therefore restart from level 1. */
    willRestart: boolean;
    currentLevel: number | null;
    totalLevels: number | null;
    /** Levels already cleared that the restart discards — what the employee is giving up. */
    levelsAlreadyApproved: number;
}

const unwrap = <T,>(data: any, key: string): T => data?.data?.[key] ?? data?.[key];

export const fetchVersionHistory = async (reimbursementId: string): Promise<ReimbursementVersion[]> => {
    const { data } = await axios.get(`${BASE}/requests/${reimbursementId}/versions`);
    return unwrap<ReimbursementVersion[]>(data, 'versions') ?? [];
};

/** What resubmitting this patch would do, without doing it. Safe to call as the form changes. */
export const previewResubmission = async (
    reimbursementId: string,
    patch: Record<string, unknown>,
): Promise<ResubmissionPreview> => {
    const { data } = await axios.post(`${BASE}/requests/${reimbursementId}/resubmission-preview`, patch);
    return (data?.data ?? data) as ResubmissionPreview;
};

/** Why a version exists, in words. */
export const VERSION_REASON_LABEL: Record<string, string> = {
    INITIAL: 'Original submission',
    EDIT_AFTER_QUERY: 'Edited after a query',
    EDIT_AFTER_REJECTION: 'Edited after rejection',
    EDIT: 'Edited',
};
