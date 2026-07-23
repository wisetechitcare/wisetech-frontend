/**
 * Reimbursement detail — adapts the existing canonical `BatchDetailModal` to the domain contract.
 * No new UI: this is the same modal the reimbursement module already uses.
 */
import { BatchDetailModal } from '@pages/employee/reimbursement/shared/ReimbursementBatchShared';
import type { ApprovalDetailProps } from './types';

export default function ReimbursementDetail({ step, onClose, onDone }: ApprovalDetailProps) {
    return (
        <BatchDetailModal
            batchId={step.instance.requestId}
            approvalInstanceId={step.instance.id}
            filterStatus={step._splitStatus ?? null}
            onClose={onClose}
            onBatchActionDone={onDone}
        />
    );
}
