/**
 * Which designations a department offers — the rules the pickers apply. No React, no network.
 *
 * TWIN of `wisetech-backend/src/utils/departmentDesignations.ts`, which enforces the same rules on
 * every save. The repos share no code: if one changes and the other does not, a picker offers a
 * pairing the server refuses.
 *
 * THE ONE RULE: a department with NO links has not been configured and allows every designation.
 * Once it has at least one link, only its linked designations are allowed.
 */

export interface DepartmentDesignationLink {
    departmentId: string;
    designationId: string;
}

export interface LinkIndex {
    readonly byDepartment: ReadonlyMap<string, ReadonlySet<string>>;
    readonly byDesignation: ReadonlyMap<string, ReadonlySet<string>>;
}

export function buildLinkIndex(links: readonly DepartmentDesignationLink[]): LinkIndex {
    const byDepartment = new Map<string, Set<string>>();
    const byDesignation = new Map<string, Set<string>>();
    for (const { departmentId, designationId } of links) {
        if (!byDepartment.has(departmentId)) byDepartment.set(departmentId, new Set());
        byDepartment.get(departmentId)!.add(designationId);
        if (!byDesignation.has(designationId)) byDesignation.set(designationId, new Set());
        byDesignation.get(designationId)!.add(departmentId);
    }
    return { byDepartment, byDesignation };
}

export const isDepartmentConfigured = (index: LinkIndex, departmentId: string | null | undefined): boolean =>
    !!departmentId && (index.byDepartment.get(departmentId)?.size ?? 0) > 0;

/** Its links, or `null` for "every designation" when the department is not configured. */
export const allowedDesignationIds = (index: LinkIndex, departmentId: string | null | undefined): ReadonlySet<string> | null =>
    departmentId && isDepartmentConfigured(index, departmentId) ? index.byDepartment.get(departmentId)! : null;

/** May these two be saved together? Either side missing is allowed. */
export const isPairAllowed = (index: LinkIndex, departmentId: string | null | undefined, designationId: string | null | undefined): boolean => {
    if (!departmentId || !designationId) return true;
    const allowed = allowedDesignationIds(index, departmentId);
    return allowed === null || allowed.has(designationId);
};

/**
 * The designations a picker should offer for a department.
 *
 * `keepId` is the value the record already holds: it stays in the list even when it is not linked,
 * so opening an older record never shows its designation as blank — the mismatch is reported
 * instead (see `isPairAllowed`), and changing it is the user's decision.
 */
export function designationsForDepartment<T extends { id: string }>(
    designations: readonly T[], index: LinkIndex, departmentId: string | null | undefined, keepId?: string | null,
): T[] {
    const allowed = allowedDesignationIds(index, departmentId);
    if (!allowed) return [...designations];
    return designations.filter((d) => allowed.has(d.id) || d.id === keepId);
}

/**
 * The department to fill in when a designation is chosen first: the only CONFIGURED department it
 * belongs to. More than one, or none, and the choice stays with the user — a guess between several
 * would file someone under the wrong team without anyone noticing.
 */
export function onlyDepartmentOf(index: LinkIndex, designationId: string | null | undefined): string | null {
    if (!designationId) return null;
    const departments = index.byDesignation.get(designationId);
    return departments && departments.size === 1 ? [...departments][0] : null;
}

/**
 * A designation TREE narrowed to a department, still a valid tree.
 *
 * Job profiles nest ("Associate" › "Associate (D) (L1)"), and a department may offer a child
 * without its parent. Dropping the parent would orphan the child in a drill-down picker, so each
 * kept node is re-attached to its nearest KEPT ancestor (or becomes top-level). The picker then
 * shows exactly the department's designations, in their family order, with nothing to click into
 * that cannot be chosen.
 */
export function designationTreeForDepartment<T extends { id: string; parentId?: string | null }>(
    designations: readonly T[], index: LinkIndex, departmentId: string | null | undefined, keepId?: string | null,
): (T & { parentId: string | null })[] {
    const allowed = allowedDesignationIds(index, departmentId);
    if (!allowed) return designations.map((d) => ({ ...d, parentId: d.parentId ?? null }));
    const byId = new Map(designations.map((d) => [d.id, d]));
    const kept = new Set(designations.filter((d) => allowed.has(d.id) || d.id === keepId).map((d) => d.id));
    return designations
        .filter((d) => kept.has(d.id))
        .map((d) => {
            let parent = d.parentId ? byId.get(d.parentId) : undefined;
            const seen = new Set<string>([d.id]);
            while (parent && !kept.has(parent.id) && !seen.has(parent.id)) {
                seen.add(parent.id);
                parent = parent.parentId ? byId.get(parent.parentId) : undefined;
            }
            return { ...d, parentId: parent && kept.has(parent.id) ? parent.id : null };
        });
}
