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
  const covers = (start?: Date | string | null, end?: Date | string | null): boolean =>
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
