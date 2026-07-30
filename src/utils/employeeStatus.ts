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
 * Frontend twin of the backend `isEmployedOn` predicate
 * (wisetech-backend/src/utils/employmentWindow.ts) — keep the two in step.
 *
 * An employee's record spans [dateOfJoining .. dateOfExit] plus one interval per
 * rejoin entry, BOTH ENDS INCLUSIVE: the joining day and the exit day are worked
 * days (payroll pays through the exit date, so the badge must not read "Inactive"
 * on someone's last day).
 *
 * @returns 1 when the given day falls inside any employment period, else 0.
 */
export const getEmployeeStatus = (employee: Employee, on: dayjs.Dayjs = dayjs()): number => {
  if (!employee) {
    return 0;
  }

  // `start` null = no lower bound (legacy rows with no DOJ stay visible).
  // `end` null = still open.
  const covers = (start?: string | null, end?: string | null): boolean =>
    (!start || !dayjs(start).isAfter(on, 'day')) && (!end || !dayjs(end).isBefore(on, 'day'));

  if (covers(employee.dateOfJoining, employee.dateOfExit)) {
    return 1;
  }

  // A rejoin re-opens the window; a row without a rejoin date is not a period.
  const rehired = (employee.EmployeeRejoinHistory ?? []).some(
    (r) => !!r.dateOfReJoining && covers(r.dateOfReJoining, r.dateOfReExit),
  );

  return rehired ? 1 : 0;
};

/**
 * Get employee status as string. Mirrors the backend's `activeEmployeeWhere`:
 * active means inside the employment window AND not manually suspended. The
 * `isActive` flag alone is not enough — it drifts whenever HR sets an exit date
 * without also unticking the Active toggle.
 */
export const getEmployeeStatusString = (employee: Employee): string =>
  getEmployeeStatus(employee) === 1 && employee?.isActive !== false ? "Active" : "Inactive";

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