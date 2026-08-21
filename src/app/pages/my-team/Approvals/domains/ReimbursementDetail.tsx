/**
 * Reimbursement detail — adapts the canonical `BatchDetailModal` to the domain contract.
 *
 * No `filterStatus`: the batch view shows every request now, including the rejected ones. Hiding
 * part of a batch was how the old screens avoided having to describe a mixed one.
 */
import { BatchDetailModal } from '@pages/employee/reimbursement/shared/ReimbursementBatchShared';
import type { ApprovalDetailProps } from './types';

export default function ReimbursementDetail({ step, onClose, onDone }: ApprovalDetailProps) {
    return (
        <BatchDetailModal
            batchId={step.instance.requestId}
            approvalInstanceId={step.instance.id}
            onClose={onClose}
            onBatchActionDone={onDone}
        />
    );
}
