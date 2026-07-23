import React from 'react';
import LeavePolicyModal from '@pages/employee/attendance/AttendanceConfig/component/LeavePolicyModal';

export { LeavePolicyModal };

interface LeavePolicyProps {
  open?: boolean;
  onClose?: () => void;
}

const LeavePolicy: React.FC<LeavePolicyProps> = ({ open = true, onClose = () => {} }) => {
  return <LeavePolicyModal open={open} onClose={onClose} />;
};

export default LeavePolicy;
