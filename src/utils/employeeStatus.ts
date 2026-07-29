import dayjs from "dayjs";

// Only the fields these helpers actually read. Deliberately structural and permissive
// so both the Redux `Employee` interface (whose dates are `Date | string`) and looser
// API-shaped objects satisfy it — an index signature would exclude the former, since
// TypeScript does not give interfaces an implicit one.
interface EmployeeRejoinHistory {
  dateOfReJoining?: Date | string | null;
  dateOfReExit?: Date | string | null;
}

interface Employee {
  dateOfJoining?: Date | string | null;
  dateOfExit?: Date | string | null;
  isActive?: boolean;
  EmployeeRejoinHistory?: EmployeeRejoinHistory[] | null;
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

  // If dateOfExit exists, check rejoin history.
  //
  // Rows without a dateOfReJoining describe no employment period at all — the wizard
  // used to persist a row when only "Reason" was filled — so they must NOT count as a
  // re-join. Including them made the check below see a null dateOfReExit and report the
  // employee as still employed, silently overriding a real exit date.
  const rejoinHistory = (employee.EmployeeRejoinHistory ?? []).filter(
    (r) => r.dateOfReJoining,
  );

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
 * Whether the employee was employed for any part of the given period.
 *
 * Mirrors `resolveEmploymentSegmentsForMonth` on the backend: the timeline is
 * [dateOfJoining → dateOfExit] plus one interval per rejoin entry, and the period
 * counts as employed if ANY of those overlap it. Used to tell "this employee had
 * left the company" apart from "payroll data failed to load" — the two look
 * identical otherwise, since both render an empty salary report.
 *
 * @param employee - Employee object with dateOfJoining, dateOfExit, and rejoin history
 * @param periodStart - Start of the period being viewed
 * @param periodEnd - End of the period being viewed
 */
export const wasEmployedDuring = (
  employee: Employee,
  periodStart: string | Date,
  periodEnd: string | Date,
): boolean => {
  if (!employee?.dateOfJoining) return false;

  const today = dayjs();
  const start = dayjs(periodStart);
  const end = dayjs(periodEnd);

  type Interval = { start: dayjs.Dayjs; end: dayjs.Dayjs | null };
  const intervals: Interval[] = [
    {
      start: dayjs(employee.dateOfJoining),
      // An exit date is the last day WORKED, so the interval runs to end-of-day.
      end: employee.dateOfExit ? dayjs(employee.dateOfExit).endOf('day') : null,
    },
  ];

  for (const r of employee.EmployeeRejoinHistory ?? []) {
    if (!r.dateOfReJoining) continue;
    intervals.push({
      start: dayjs(r.dateOfReJoining),
      end: r.dateOfReExit ? dayjs(r.dateOfReExit).endOf('day') : null,
    });
  }

  return intervals.some((iv) => {
    const ivEnd = iv.end ?? today;
    return !iv.start.isAfter(end) && !ivEnd.isBefore(start);
  });
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