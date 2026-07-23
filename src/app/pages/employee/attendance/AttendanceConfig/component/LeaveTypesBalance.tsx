import React from 'react';
import LeaveTypesBalanceModal from './LeaveTypesBalanceModal';

export { LeaveTypesBalanceModal };

interface LeaveTypesBalanceProps {
  open?: boolean;
  onClose?: () => void;
}

const LeaveTypesBalance: React.FC<LeaveTypesBalanceProps> = ({ open = true, onClose = () => {} }) => {
  return <LeaveTypesBalanceModal open={open} onClose={onClose} />;
};

export default LeaveTypesBalance;
