import DomainApprovalQueue from './DomainApprovalQueue';

function TaskApprovals() {
  return <DomainApprovalQueue domainTypes={['task', 'project']} />;
}

export default TaskApprovals;
