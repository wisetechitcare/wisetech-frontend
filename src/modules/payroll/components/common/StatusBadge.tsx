/**
 * Payroll payment status — thin wrapper over kit `ToneChip`.
 * Prefer importing `ToneChip` directly in new code.
 */
import React from 'react';
import { ToneChip } from '@app/modules/common/components/ui';

interface StatusBadgeProps {
  status: 'Paid' | 'Partial' | 'No Payment';
}

const toneFor = (status: StatusBadgeProps['status']) => {
  switch (status) {
    case 'Paid':
      return 'success' as const;
    case 'Partial':
      return 'cyan' as const;
    default:
      return 'neutral' as const;
  }
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => (
  <ToneChip dense tone={toneFor(status)} label={status} />
);

export default React.memo(StatusBadge);
