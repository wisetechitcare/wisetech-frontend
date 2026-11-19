import { useMemo } from 'react';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission } from '@constants/statistics';

export interface RowPermissionOptions {
  /** The ABAC resource the rows belong to (e.g. `reimbursement`). No resource = every row is shown. */
  resource?: string;
  /** Show rows the user may read as someone else's (`readOthers`). */
  viewOthers?: boolean;
  /** Show the user's own rows (`readOwn`). Ignored when `viewOthers` is set. */
  viewOwn?: boolean;
  /** Also add the user's own rows on top of `viewOthers`. */
  checkOwnWithOthers?: boolean;
}

/**
 * The rows a table may show this user, by the ABAC rules of `resource`.
 *
 * Pure so it is testable without React. Rows with no `employeeId` are not anyone's record (a group total,
 * an unbatched bucket) and always pass. A row that passes two checks appears once (deduped by reference).
 * This is defence in depth on top of the server's own scoping, never instead of it.
 */
export function filterPermittedRows<T extends { employeeId?: unknown }>(data: T[], opts: RowPermissionOptions): T[] {
  const { resource, viewOthers = false, viewOwn = false, checkOwnWithOthers = false } = opts;
  if (!resource) return data;
  const owned = data.filter((v) => v.employeeId != null);
  const unowned = data.filter((v) => v.employeeId == null);
  const out: T[] = [];
  if (viewOthers) {
    out.push(...owned.filter((v) => hasPermission(resource, permissionConstToUseWithHasPermission.readOthers, v)));
  } else if (viewOwn) {
    out.push(...owned.filter((v) => hasPermission(resource, permissionConstToUseWithHasPermission.readOwn, v)));
  }
  if (checkOwnWithOthers) {
    out.push(...owned.filter((v) => hasPermission(resource, permissionConstToUseWithHasPermission.readOwn, v)));
  }
  out.push(...unowned);
  return Array.from(new Set(out));
}

/**
 * React binding of {@link filterPermittedRows}. Shared by the live MaterialTable and every screen that moved
 * to the design system's DataTable, so the permission rule exists once.
 */
export function usePermittedRows<T extends { employeeId?: unknown }>(data: T[], opts: RowPermissionOptions): T[] {
  const { resource, viewOthers, viewOwn, checkOwnWithOthers } = opts;
  return useMemo(
    () => filterPermittedRows(data, { resource, viewOthers, viewOwn, checkOwnWithOthers }),
    [data, resource, viewOthers, viewOwn, checkOwnWithOthers],
  );
}
