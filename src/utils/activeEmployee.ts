/**
 * activeEmployee — the ONE definition of "show this person in an operational list".
 *
 * The rule is deliberately `isActive !== false`, not `isActive === true`: the column is
 * nullable (`Boolean? @default(false)` in Prisma), and a row that has never had the flag
 * written carries `null`/`undefined`. Treating those as inactive would silently drop
 * real staff from every table.
 *
 * This mirrors the Overview stat cards exactly, which is the behaviour that was
 * validated against live data — every other surface on that page now derives from this
 * function instead of re-typing the expression, so a table can never disagree with the
 * card above it about who counts.
 *
 * NOT the same as the backend's `activeEmployeeWhere` (`isActive: true` AND inside the
 * employment window), which is the stricter payroll-facing predicate. Don't swap one for
 * the other without deciding which behaviour a screen should have — the strict one hides
 * anyone whose flag is null.
 */

/** Minimum shape needed. Any employee-ish row satisfies it. */
export interface MaybeActiveEmployee {
    isActive?: boolean | null;
}

/** True unless the employee is EXPLICITLY flagged inactive. */
export function isActiveEmployee(employee: MaybeActiveEmployee | null | undefined): boolean {
    return !!employee && employee.isActive !== false;
}

/** Filter helper — returns the same array reference when nothing is excluded. */
export function filterActiveEmployees<T extends MaybeActiveEmployee>(employees: readonly T[]): T[] {
    const active = employees.filter(isActiveEmployee);
    return active.length === employees.length ? (employees as T[]) : active;
}

/**
 * Set of active employee ids, for filtering rows that carry an `employeeId` but no
 * `isActive` of their own — attendance rows, leave rows, request rows.
 *
 * @param employees Roster entries. `_id` is checked before `id` because the Overview's
 *                  transformed employee shape uses `_id` while raw API rows use `id`.
 */
export function activeEmployeeIdSet<T extends MaybeActiveEmployee & { _id?: string; id?: string }>(
    employees: readonly T[],
): Set<string> {
    const ids = new Set<string>();
    for (const employee of employees) {
        if (!isActiveEmployee(employee)) continue;
        const id = employee._id || employee.id;
        if (id) ids.add(id);
    }
    return ids;
}
