import dayjs from "dayjs";

interface EmployeeRejoinHistory {
  id: string;
  employeeId: string;
  dateOfReJoining: string | null;
  dateOfReExit: string | null;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Employee {
  id: string;
  dateOfJoining?: string | null;
  dateOfExit?: string | null;
  EmployeeRejoinHistory?: EmployeeRejoinHistory[];
  [key: string]: any;
}

/**
 * Calculate employee status dynamically based on dateOfExit and rejoin history
 * @param employee - Employee object with dateOfExit and EmployeeRejoinHistory
 * @returns 1 for Active, 0 for Inactive
 */
export const getEmployeeStatus = (employee: Employee): number => {
  if (!employee) {
    return 0;
  }

  const today = dayjs();
  
  // If no dateOfExit, employee is active
  if (!employee.dateOfExit) {
    return 1;
  }

  // If dateOfExit exists, check rejoin history
  const rejoinHistory = employee.EmployeeRejoinHistory;
  
  // If there's rejoin history, check the most recent entry
  if (rejoinHistory && rejoinHistory.length > 0) {
    // Sort by dateOfReJoining to get the most recent rejoin entry
    const sortedHistory = [...rejoinHistory].sort((a, b) => {
      // Handle null values - put them at the end
      if (!a.dateOfReJoining) return 1;
      if (!b.dateOfReJoining) return -1;
      return dayjs(b.dateOfReJoining).diff(dayjs(a.dateOfReJoining));
    });
    
    const mostRecentEntry = sortedHistory[0];
    
    // If most recent entry has no dateOfReExit, employee is active
    if (!mostRecentEntry.dateOfReExit) {
      return 1;
    }
    
    // If most recent entry has dateOfReExit, check if it's before today
    const reExitDate = dayjs(mostRecentEntry.dateOfReExit);
    if (reExitDate.isBefore(today, 'day') || reExitDate.isSame(today, 'day')) {
      return 0; // Inactive
    }
    
    return 1; // Active
  }
  
  // No rejoin history, check original dateOfExit
  const exitDate = dayjs(employee.dateOfExit);
  if (exitDate.isBefore(today, 'day') || exitDate.isSame(today, 'day')) {
    return 0; // Inactive
  }
  
  return 1; // Active
};

/**
 * Get employee status as string
 * @param employee - Employee object
 * @returns "Active" or "Inactive"
 */
export const getEmployeeStatusString = (employee: Employee): string => {
  const res = getEmployeeStatus(employee) === 0 && employee?.isActive==false
  return res==true ? "Inactive" : "Active";
};

/**
 * Calculate an employee's total experience from date of joining, summing all
 * active employment periods (original + every rejoin) and excluding gaps
 * between an exit and a later rejoin. Mirrors the "Total Experience" tile on
 * the My Salary page.
 * @param employee - Employee object with dateOfJoining, dateOfExit, and rejoin history
 * @returns Human-readable duration, e.g. "3 Months", "2 Years 4 Months", or "-"
 */
export const calculateTotalExperience = (employee: Employee): string => {
  if (!employee?.dateOfJoining) return '-';

  const today = dayjs();

  type Period = { start: ReturnType<typeof dayjs>; end: ReturnType<typeof dayjs> };
  const periods: Period[] = [];

  const joinDate = dayjs(employee.dateOfJoining);
  const exitDate = employee.dateOfExit ? dayjs(employee.dateOfExit) : today;
  const firstEnd = exitDate.isAfter(today) ? today : exitDate;
  if (!joinDate.isAfter(firstEnd)) {
    periods.push({ start: joinDate, end: firstEnd });
  }

  for (const r of employee.EmployeeRejoinHistory ?? []) {
    if (!r.dateOfReJoining) continue;
    const reJoin = dayjs(r.dateOfReJoining);
    if (reJoin.isAfter(today)) continue; // Not yet rejoined
    const reExit = r.dateOfReExit ? dayjs(r.dateOfReExit) : today;
    const periodEnd = reExit.isAfter(today) ? today : reExit;
    if (!reJoin.isAfter(periodEnd)) {
      periods.push({ start: reJoin, end: periodEnd });
    }
  }

  let totalMonths = 0;
  for (const p of periods) {
    totalMonths += p.end.diff(p.start, 'month');
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years === 0 && months === 0) return 'Less than 1 Month';
  if (years === 0) return `${months} Month${months !== 1 ? 's' : ''}`;
  if (months === 0) return `${years} Year${years !== 1 ? 's' : ''}`;
  return `${years} Year${years !== 1 ? 's' : ''} ${months} Month${months !== 1 ? 's' : ''}`;
};