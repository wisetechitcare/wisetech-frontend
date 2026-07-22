/**
 * Mappers → `ExistingLeaveView`, the shape ApplyLeave's view/edit modes consume.
 *
 * ApplyLeave is the ONE canonical leave modal (apply/view/edit, self + admin/approver target).
 * Every screen that wants to show or edit an existing leave maps its own row shape to
 * `ExistingLeaveView` here rather than re-implementing the modal — keep new sources as a new
 * mapper in this file, never as a new modal.
 */
import dayjs from 'dayjs';
import type { ExistingLeaveView } from './ApplyLeave';

const iso = (d: unknown): string => (d ? dayjs(d as any).format('YYYY-MM-DD') : '');

/** A grouped row from the employee's My-Leaves list (buildLeaveGroupSummary shape). */
export interface GroupedLeaveLike {
    groupId?: string;
    dateFrom?: string | Date | null;
    dateTo?: string | Date | null;
    reason?: string | null;
    isHalfDay?: boolean;
    halfDaySession?: string | null;
    status?: number;
    canDelete?: boolean;
    segments: Array<{
        id?: string;
        leaveType?: string | null;
        days?: number | null;
        isPaid?: boolean;
        dateFrom?: string | Date | null;
        dateTo?: string | Date | null;
        status?: number;
    }>;
}

/** The approval queue's per-row `requestDetails` (approvalService.fetchRequestDetails shape). */
export interface ApprovalLeaveDetailsLike {
    dateFrom?: string | null;
    dateTo?: string | null;
    reason?: string | null;
    isHalfDay?: boolean | null;
    halfDaySession?: string | null;
    segments?: Array<{
        id?: string;
        leaveType?: string | null;
        isPaid?: boolean;
        days?: number | null;
        dateFrom?: string | null;
        dateTo?: string | null;
        status?: number;
    }> | null;
}

const mapSegments = (
    segs: GroupedLeaveLike['segments'] | ApprovalLeaveDetailsLike['segments'],
): ExistingLeaveView['segments'] =>
    (segs ?? []).map((s) => ({
        id: s.id,
        leaveType: s.leaveType ?? '',
        days: s.days ?? 0,
        isPaid: s.isPaid ?? true,
        dateFrom: s.dateFrom ? iso(s.dateFrom) : null,
        dateTo: s.dateTo ? iso(s.dateTo) : null,
        isHalfDay: (s as any).isHalfDay ?? false,
        halfDaySession: ((s as any).halfDaySession as any) ?? null,
        status: s.status,
    }));

/** My-Leaves grouped row → ApplyLeave view/edit. */
export const fromGroupedLeave = (g: GroupedLeaveLike): ExistingLeaveView => ({
    id: g.segments?.[0]?.id,
    requestGroupId: g.groupId,
    dateFrom: iso(g.dateFrom),
    dateTo: g.dateTo ? iso(g.dateTo) : iso(g.dateFrom),
    reason: g.reason ?? '',
    isHalfDay: g.isHalfDay,
    halfDaySession: (g.halfDaySession as any) ?? null,
    status: g.status,
    canDelete: g.canDelete,
    segments: mapSegments(g.segments),
});

/**
 * Approval-queue row → ApplyLeave view/edit.
 *
 * `requestId` is the LeaveTracker id (requestModel='LeaveTracker') or the group id
 * (requestModel='LeaveRequestGroup') — ApplyLeave's edit PUT is group-aware either way, so both
 * map onto `id`. A single (non-group) leave arrives with no `segments`; ApplyLeave renders it from
 * dateFrom/dateTo, so an empty list is correct rather than a defect.
 */
export const fromApprovalRequest = (
    details: ApprovalLeaveDetailsLike | null | undefined,
    requestId: string,
    status?: number,
): ExistingLeaveView => ({
    id: requestId,
    dateFrom: iso(details?.dateFrom),
    dateTo: details?.dateTo ? iso(details.dateTo) : iso(details?.dateFrom),
    reason: details?.reason ?? '',
    isHalfDay: !!details?.isHalfDay,
    halfDaySession: (details?.halfDaySession as any) ?? null,
    status,
    segments: mapSegments(details?.segments),
});
