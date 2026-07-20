/**
 * Leave detail for the approval queue — the CANONICAL ApplyLeave modal, nothing bespoke.
 *
 * Previously a leave row click opened the reimbursement `BatchDetailModal` (its `requestId` is a
 * LeaveTracker id, not a batch id), which rendered an empty "Submission Details —" with
 * company/project/amount columns and TOTAL ₹0. Leave now resolves to the same modal the employee
 * and the admin screens already use — one leave calendar in the whole app.
 *
 * Approver edit: an approver holding `approvals.approve.team` may edit on the requester's behalf
 * via `target`. The backend enforces the real policy — `isAdminOrHR` bypasses `requireSelf`, while
 * the requester themselves is locked out by `hasApproverActed` once any approver has acted — and
 * `updateLeaveRequest` broadcasts `leaveRequests:updated`, so the employee's My-Leaves list and
 * balance card refresh live off the same edit.
 */
import { useState } from 'react';
import { KTIcon } from '@metronic/helpers';
import { WtButton } from '@app/modules/common/components/ui/buttons';
import ApplyLeave from '@pages/employee/attendance/personal/views/my-leaves/ApplyLeave';
import { fromApprovalRequest } from '@pages/employee/attendance/personal/views/my-leaves/toExistingLeaveView';
import type { ApprovalDetailProps } from './types';

export default function LeaveDetail({ step, onClose, onDone, canEdit, canDecide, onApprove, onReject }: ApprovalDetailProps) {
    const [mode, setMode] = useState<'view' | 'edit'>('view');
    const { instance, requestDetails } = step;

    // A queue row is only ever shown for a live request; a split sub-row carries its own status.
    const existing = fromApprovalRequest(requestDetails, instance.requestId, step._splitStatus ?? 0);

    // Approve/Reject rendered inside ApplyLeave's view footer — the approver reviews and decides in
    // one place. These reuse the queue's own handlers (same API call + toast + row refresh).
    const reviewActions = canDecide && (onApprove || onReject) ? (
        <div style={{ display: 'flex', gap: 8 }}>
            {onReject && (
                <WtButton tone='danger' onClick={onReject} sx={{ flex: 1 }}
                    startIcon={<KTIcon iconName='cross' className='fs-5' />}>
                    Reject
                </WtButton>
            )}
            {onApprove && (
                <WtButton tone='success' onClick={onApprove} sx={{ flex: 1 }}
                    startIcon={<KTIcon iconName='check' className='fs-5' />}>
                    Approve
                </WtButton>
            )}
        </div>
    ) : undefined;

    return (
        <div
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 1060, background: 'rgba(15,23,42,.45)',
                display: 'flex',
                alignItems: (typeof window !== 'undefined' && window.innerWidth < 768) ? 'flex-end' : 'center',
                justifyContent: 'center',
                padding: (typeof window !== 'undefined' && window.innerWidth < 768) ? 0 : 24,
                overflowY: 'auto',
            }}
        >
            <ApplyLeave
                mode={mode}
                existing={existing}
                reviewActions={reviewActions}
                // Real, persisted approval chain for THIS request — not ApplyLeave's self-resolved
                // preview (which would show the approver's own chain).
                approvalInstanceId={instance.id}
                // View → Edit flips in place (same modal), matching My-Leaves. Only offered when the
                // viewer can approve; the backend still has final say.
                onEdit={canEdit ? () => setMode('edit') : undefined}
                onClose={() => { if (mode === 'edit') onDone(); onClose(); }}
                target={{
                    employeeId: instance.employee.id,
                    branchId: instance.employee.branchId,
                    dateOfJoining: instance.employee.dateOfJoining ?? null,
                }}
            />
        </div>
    );
}
