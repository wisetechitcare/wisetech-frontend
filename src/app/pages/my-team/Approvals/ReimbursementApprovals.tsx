import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import NeedsYourAttention from '@pages/employee/reimbursement/components/NeedsYourAttention';
import DomainApprovalQueue from './DomainApprovalQueue';

/**
 * The Inbox's Reimbursements tab.
 *
 * Two different things, stacked, because they answer two different questions:
 *
 *   · what is waiting on ME as the person who filed the expense — a question an approver asked,
 *     an expense that came back rejected. `NeedsYourAttention` reads the same `inbox_task` rows
 *     the rest of the module does, so there is one definition of "needs action".
 *   · what is waiting on me as an APPROVER — the queue below.
 *
 * Both render empty when they have nothing, so someone who is only ever one of the two sees only
 * their half.
 */
function ReimbursementApprovals() {
  const employeeId = useSelector((state: RootState) => (state as any)?.auth?.currentUser?.employeeId);

  return (
    <>
      <NeedsYourAttention employeeId={employeeId} isSelf />
      <DomainApprovalQueue domainTypes={['reimbursement']} />
    </>
  );
}

export default ReimbursementApprovals;
