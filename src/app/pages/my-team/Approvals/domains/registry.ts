/**
 * Approval-domain registry — the single place that knows what each workflow type IS.
 *
 * To support a new workflow: add one entry. The queue reads `label`/`tone`/`icon` for the Type
 * chip and mounts `Detail` on row click. A domain with no `Detail` degrades gracefully to the
 * row's expandable panel (approval progress + audit), which every domain gets for free.
 *
 * Rule: `Detail` must point at the domain's EXISTING canonical component — never a viewer built
 * for the queue. Leave → ApplyLeave; reimbursement → BatchDetailModal.
 */
import LeaveDetail from './LeaveDetail';
import ReimbursementDetail from './ReimbursementDetail';
import type { ApprovalDomain } from './types';

const DOMAINS: ApprovalDomain[] = [
    {
        key: 'leave',
        label: 'Leave',
        tone: 'indigo',
        icon: 'calendar',
        Detail: LeaveDetail,
    },
    {
        key: 'reimbursement',
        label: 'Reimbursement',
        tone: 'success',
        icon: 'dollar',
        Detail: ReimbursementDetail,
        hasBatchColumns: true,
    },
    {
        key: 'attendance',
        label: 'Attendance',
        tone: 'warning',
        icon: 'time',
        // No modal: attendance's detail is the AttendanceDetailCard inside the expandable panel.
        // When a canonical attendance view exists, register it here — nothing else changes.
    },
    { key: 'task', label: 'Task', tone: 'cyan', icon: 'check-circle' },
    { key: 'project', label: 'Project', tone: 'brand', icon: 'briefcase' },
];

const BY_KEY = new Map(DOMAINS.map((d) => [d.key, d]));

/** Resolve a domain by `instance.workflowType`. Case-insensitive; undefined when unregistered. */
export const getApprovalDomain = (workflowType?: string | null): ApprovalDomain | undefined =>
    workflowType ? BY_KEY.get(workflowType.toLowerCase()) : undefined;

/** Every registered domain key — the source of truth for tab bucketing. */
export const APPROVAL_DOMAIN_KEYS = DOMAINS.map((d) => d.key);

export type { ApprovalDomain } from './types';
