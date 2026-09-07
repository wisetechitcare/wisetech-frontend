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

/**
 * Ids of an ALREADY-SCOPED roster — no flag filtering.
 *
 * ── Prefer this one ───────────────────────────────────────────────────────
 * `fetchAllEmployees(isActive, startDate, endDate)` now scopes server-side by
 * the employment TIMELINE (joining/exit dates plus rejoin history), which is
 * derived and needs no human step. When a roster came back from that call, it
 * is already correct — and re-filtering it through {@link activeEmployeeIdSet}
 * actively breaks it in both directions:
 *
 *  · it drops someone employed DURING a historical period who has since left,
 *    which is the entire point of a historical report; and
 *  · it drops anyone whose `isActive` is stale-off. Two people employed today
 *    were flagged inactive when this was measured, and were consequently
 *    missing from the attendance boards altogether.
 *
 * Use this to restrict rows that carry an `employeeId` but no flag of their
 * own — attendance rows, leave rows — to a roster you already trust.
 */
export function employeeIdSet<T extends { _id?: string; id?: string }>(
    employees: readonly T[],
): Set<string> {
    const ids = new Set<string>();
    for (const employee of employees) {
        const id = employee._id || employee.id;
        if (id) ids.add(id);
    }
    return ids;
}
