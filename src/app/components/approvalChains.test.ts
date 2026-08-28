import { describe, test, expect } from 'vitest';
import { approvalChainsFromConfigs, validateApprovalChain } from './ApprovalSettings';

// Shaped like the rows /api/approvals/config/:employeeId actually returns.
const row = (workflowType: string, level: number, approverId: string, isActive = true) =>
  ({ workflowType, level, approverId, isActive });

describe('approvalChainsFromConfigs', () => {
  test('lands each level in its slot, one-indexed', () => {
    const chains = approvalChainsFromConfigs([
      row('leave', 1, 'a'),
      row('leave', 2, 'b'),
      row('attendance', 1, 'a'),
    ]);
    expect(chains.leave).toEqual(['a', 'b', '', '', '']);
    expect(chains.attendance[0]).toBe('a');
    expect(chains.reimbursement[0]).toBe('');
  });

  test('skips inactive rows and workflow types this form does not edit', () => {
    const chains = approvalChainsFromConfigs([
      row('leave', 1, 'a', false),
      row('conveyance', 1, 'b'), // real type in the data, not one of the three here
    ]);
    expect(chains.leave[0]).toBe('');
  });

  // The wizard hands this whatever the endpoint returned; a non-list must not throw
  // mid-load, or the whole edit form fails to hydrate.
  test('survives null, undefined and a wrapped response object', () => {
    for (const input of [null, undefined, { data: [] } as any]) {
      expect(approvalChainsFromConfigs(input).leave).toEqual(['', '', '', '', '']);
    }
  });

  // What the wizard's save gate reads: chains loaded from the server must pass the
  // same rule the inline editor enforces, or a valid employee is refused.
  test('a loaded chain satisfies the save gate', () => {
    const chains = approvalChainsFromConfigs([row('leave', 1, 'a'), row('leave', 2, 'b')]);
    expect(validateApprovalChain(chains.leave)).toBeNull();
    expect(validateApprovalChain(chains.attendance)).toBe('Level 1 approver is required');
  });
});
