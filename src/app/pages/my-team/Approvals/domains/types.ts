/**
 * Approval-domain contract.
 *
 * The approval queue is generic: it renders rows and defers every domain-specific decision to the
 * domain registered for that `workflowType`. A domain declares its own CANONICAL detail component
 * — the same one the rest of the app already uses for that record (leave → ApplyLeave,
 * reimbursement → BatchDetailModal) — so the queue never grows a second, divergent viewer.
 *
 * Adding a new workflow type = add one entry to `registry.ts`. Nothing else changes.
 */
import type { ComponentType } from 'react';
import type { SemanticTone } from '@app/theme/tokens';

/** One leave segment within a multi-segment (sandwich) group request. */
export interface ApprovalLeaveSegment {
    id?: string;
    leaveType?: string | null;
    isPaid?: boolean;
    days?: number;
    dateFrom?: string | null;
    dateTo?: string | null;
    /** 0 = pending · 1 = approved · 2 = rejected (per-segment bifurcation). */
    status?: number;
}

/**
 * The flat, union-of-all-domains payload from `approvalService.fetchRequestDetails`. Every field is
 * optional because one backend function serves five request models; a domain reads only its own.
 */
export interface ApprovalRequestDetails {
    subType?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    reason?: string | null;
    description?: string | null;
    isHalfDay?: boolean | null;
    halfDaySession?: string | null;
    totalAmount?: number | string | null;
    totalRequests?: number | null;
    checkIn?: string | null;
    checkOut?: string | null;
    checkInLocation?: string | null;
    checkOutLocation?: string | null;
    submittedAt?: string | null;
    segments?: ApprovalLeaveSegment[] | null;
    totalDays?: number | null;
    paidDays?: number | null;
    unpaidDays?: number | null;
}

export interface ApprovalInstance {
    id: string;
    workflowType: string;
    requestId: string;
    requestModel: string;
    currentLevel: number;
    totalLevels: number;
    status: string;
    createdAt: string;
    employee: {
        id: string;
        branchId?: string;
        dateOfJoining?: string | Date | null;
        users: { firstName: string; lastName: string };
    };
}

export interface ApprovalStep {
    id: string;
    instanceId: string;
    level: number;
    status: string;
    delegatedFrom?: string | null;
    requestDetails?: ApprovalRequestDetails | null;
    instance: ApprovalInstance;
}

/** Row-splitting metadata the reimbursement flow adds (approved/rejected sub-rows). */
export type DisplayStep = ApprovalStep & {
    _uid: string;
    _splitStatus?: 1 | 2;
    _splitCount?: number;
    _splitAmount?: number;
};

export interface ApprovalDetailProps {
    step: DisplayStep;
    /** Close the detail view. */
    onClose: () => void;
    /** Re-load the queue — call after any mutation (edit/decision) so the row reflects reality. */
    onDone: () => void;
    /**
     * The viewer holds `approvals.approve.team`, so they may edit this request on behalf of the
     * requester. The backend is the real gate (isAdminOrHR bypasses requireSelf + the
     * hasApproverActed lifecycle gate); this only decides whether to OFFER the affordance.
     */
    canEdit: boolean;
    /**
     * True when the viewer can decide THIS step right now (pending tab + holds the permission).
     * When true the Detail should surface Approve/Reject in-modal so review + decision happen in
     * one place. `onApprove`/`onReject` reuse the queue's own handlers — no parallel decision path.
     */
    canDecide?: boolean;
    onApprove?: () => void;
    onReject?: () => void;
}

export interface ApprovalDomain {
    /** Matches `instance.workflowType`. */
    key: string;
    /** Human label for the Type chip / tab. */
    label: string;
    /** Semantic tone for the Type chip — resolved via `tonePair()`. */
    tone: SemanticTone;
    /** KTIcon name for the domain. */
    icon: string;
    /**
     * The domain's canonical detail view, opened on row click. Omit to fall back to the row's
     * expandable panel (approval progress + audit) with no modal.
     */
    Detail?: ComponentType<ApprovalDetailProps>;
    /** Domain-specific extra columns (e.g. reimbursement's Total Requests / Total Amount). */
    hasBatchColumns?: boolean;
}
