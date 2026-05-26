import DomainApprovalQueue from './DomainApprovalQueue';

function OtherApprovals() {
  return <DomainApprovalQueue mode='exclude' domainTypes={['attendance', 'leave', 'conveyance', 'reimbursement', 'task', 'project']} />;
}

export default OtherApprovals;
