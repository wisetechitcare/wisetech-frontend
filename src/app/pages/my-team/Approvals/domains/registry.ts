/**
 * Approval-domain registry — the single place that knows what each workflow type IS.
 *
 * To support a new workflow: add one entry. The queue reads `label`/`tone`/`icon` for the Type
 * chip and mounts `Detail` on row click. A domain with no `Detail` falls back to `GenericDetail`,
 * which renders the row summary and the decision buttons — so every row opens something.
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
        // Falls back to GenericDetail. When a canonical attendance view exists, register it here —
        // nothing else changes.
    },
    { key: 'task', label: 'Task', tone: 'cyan', icon: 'check-circle' },
    { key: 'project', label: 'Project', tone: 'brand', icon: 'briefcase' },
    // Recruitment: requisition sign-off. Detail falls back to the expandable
    // panel (approval progress + audit); a canonical requisition view can be
    // registered here later with no other changes.
    { key: 'requisition', label: 'Requisition', tone: 'indigo', icon: 'briefcase' },
    { key: 'offer', label: 'Offer', tone: 'success', icon: 'dollar' },
    // Billing: a team lead's request to bill completed deliverables. Detail falls back to
    // the expandable panel, which already renders the payload the backend supplies
    // (project / client / stage / deliverables / amount) — no billing-specific approval UI.
    { key: 'billing_request', label: 'Billing Request', tone: 'warning', icon: 'dollar' },
];

const BY_KEY = new Map(DOMAINS.map((d) => [d.key, d]));

/** Resolve a domain by `instance.workflowType`. Case-insensitive; undefined when unregistered. */
export const getApprovalDomain = (workflowType?: string | null): ApprovalDomain | undefined =>
    workflowType ? BY_KEY.get(workflowType.toLowerCase()) : undefined;

/**
 * Request models that must NOT open their workflow's canonical Detail.
 *
 * Leave CONVERSION (encash/transfer) runs on workflowType 'leave' deliberately — that is how it
 * reuses the employee's existing leave approval chain instead of needing one configured all over
 * again. But it is a LeaveManagement row, not a leave request, so handing it to LeaveDetail →
 * ApplyLeave would feed a leave-request viewer a shape it cannot read. It falls through to
 * GenericDetail, which renders the approval progress, the audit trail and the detail payload
 * approvalService.fetchRequestDetails builds for it.
 */
const NO_CANONICAL_DETAIL = new Set(['LeaveManagement']);

/**
 * The Detail component for a queue row. Resolves by workflowType, then lets the request MODEL veto
 * it — two different record types can legitimately share one workflow (and therefore one chain).
 */
export const getApprovalDetail = (
    workflowType?: string | null,
    requestModel?: string | null,
): ApprovalDomain['Detail'] | undefined =>
    requestModel && NO_CANONICAL_DETAIL.has(requestModel) ? undefined : getApprovalDomain(workflowType)?.Detail;

/** Every registered domain key — the source of truth for tab bucketing. */
export const APPROVAL_DOMAIN_KEYS = DOMAINS.map((d) => d.key);

export type { ApprovalDomain } from './types';
