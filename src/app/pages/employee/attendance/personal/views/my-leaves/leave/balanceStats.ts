import dayjs from 'dayjs';
import { LeaveApprovedStatus } from '@constants/statistics';
import { LeaveStatus } from '@constants/attendance';
import { getWorkingDays } from '@utils/leaves';

export interface TypeBalanceStats {
  leaveTypeLabel: string;
  total: number;
  used: number;
  pending: number;
  available: number;
}

const isPendingStatus = (leave: any): boolean => {
  if (leave.statusNumber === 0 || leave.status === LeaveApprovedStatus.Pending) return true;
  if (typeof leave.status === 'string' && leave.status.toLowerCase().includes('pending')) return true;
  if (leave.status === LeaveStatus.PendingHR) return true;
  return false;
};

const isApprovedStatus = (leave: any): boolean => {
  if (leave.statusNumber === 1 || leave.status === LeaveApprovedStatus.Approved) return true;
  if (typeof leave.status === 'string' && leave.status.toLowerCase() === 'approved') return true;
  return false;
};

/**
 * Per-type balance for SmartBalanceCard (matches LeaveRequestForm fiscal scoping).
 */
export function computeTypeBalanceStats(
  leaveTypeId: string,
  leaveTypeLabel: string,
  totalAllocated: number,
  employeeLeaves: any[],
  startDateNew?: string,
  endDateNew?: string,
): TypeBalanceStats {
  const inFiscalYear = (leave: any) => {
    const leaveDate = leave.dateFrom || leave.date;
    if (!leaveDate) return false;
    if (startDateNew && leaveDate < startDateNew) return false;
    if (endDateNew && leaveDate > endDateNew) return false;
    return true;
  };

  const forType = (employeeLeaves || []).filter(
    (l) => l.leaveTypeId === leaveTypeId && inFiscalYear(l),
  );

  const used = forType
    .filter(isApprovedStatus)
    .reduce((sum, l) => sum + getWorkingDays(l), 0);

  const pending = forType
    .filter(isPendingStatus)
    .reduce((sum, l) => sum + getWorkingDays(l), 0);

  const available = Math.max(0, totalAllocated - used);

  return {
    leaveTypeLabel,
    total: totalAllocated,
    used,
    pending,
    available,
  };
}

export function formatFiscalResetLabel(endDateNew?: string): string | null {
  if (!endDateNew) return null;
  return dayjs(endDateNew).format('DD MMM YYYY');
}
