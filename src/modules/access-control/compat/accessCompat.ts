/**
 * Access Control — Compatibility Layer (migration Step 0).
 *
 * The backend grants a role two ways: the legacy direct employees↔roles link and
 * the newer RoleAssignment. The Effective Permission Engine reads BOTH additively,
 * so a role from either source grants access. This adapter presents ONE interface
 * to the UI so screens never care which mechanism a role came from.
 *
 * Reuses existing production services only — NO new endpoints, NO backend changes,
 * NO duplicated business logic.
 *
 * Write path today: creating a RoleAssignment requires a `tenantId` (FK to the
 * Tenant table, which is not yet provisioned), so `assignRole` uses the legacy
 * direct link — the functional mechanism now. That decision is isolated to this
 * one function so it can switch to `createAssignment` the day tenancy is
 * provisioned, with zero changes to any screen.
 */
import {
  getEmployeeAccessSummary,
  updateEmployeeRoles,
  setSectionAccessLevel,
  resetAllEmployeeOverrides,
} from '@services/employeeAccess';
import {
  fetchAssignments,
  createAssignment,
  removeAssignment,
  expireAssignment,
  fetchEffectiveAccess,
  fetchAssignmentHistory,
} from '@modules/assignments/api/assignments.api';
import type { Assignment } from '@modules/assignments/types';
import type { UnifiedEmployeeAccess, UnifiedRoleGrant } from './types';

/** READ — one merged view of an employee's roles from both grant sources. */
export const getUnifiedEmployeeAccess = async (personId: string): Promise<UnifiedEmployeeAccess> => {
  const [summary, assignments] = await Promise.all([
    getEmployeeAccessSummary(personId),
    fetchAssignments({ userId: personId })
      .then((r) => r.data)
      .catch(() => [] as Assignment[]),
  ]);

  const byRole = new Map<string, UnifiedRoleGrant>();
  for (const r of summary.roles) {
    byRole.set(r.id, {
      key: `direct:${r.id}`,
      roleId: r.id,
      roleName: r.name,
      source: 'direct',
      isSystem: r.isSystem,
    });
  }
  // Assignment metadata (scope / expiry) wins for display when a role exists in both.
  for (const a of assignments) {
    byRole.set(a.roleId, {
      key: `assignment:${a.id}`,
      roleId: a.roleId,
      roleName: a.role?.name ?? a.roleId,
      source: 'assignment',
      assignmentId: a.id,
      scope: a.scope,
      status: a.status,
      effectiveFrom: a.effectiveFrom,
      effectiveUntil: a.effectiveUntil,
    });
  }

  return {
    personId,
    roles: Array.from(byRole.values()),
    effective: summary.effective,
    overridesAllow: summary.overridesAllow,
    overridesDeny: summary.overridesDeny,
    sectionLevels: summary.sectionLevels,
  };
};

/** ASSIGN — idempotent. Uses the legacy direct link today (see file header). */
export const assignRole = async (personId: string, roleId: string): Promise<void> => {
  const summary = await getEmployeeAccessSummary(personId);
  const current = summary.roles.map((r) => r.id);
  if (current.length === 1 && current[0] === roleId) return; // already the only role — no-op
  // ONE ROLE PER EMPLOYEE: assigning REPLACES the current role (identical to the
  // Access tab's updateEmployeeRoles([roleId]) and the backend's PUT /employee/:id/
  // roles constraint). Appending to `current` would send >1 role and be rejected
  // with "An employee can only have one role at a time" — the silent failure that
  // made this page look broken versus the Access tab.
  await updateEmployeeRoles(personId, [roleId]);
};

/** REMOVE — routes to the correct mechanism by the grant's source. */
export const removeRoleGrant = async (personId: string, grant: UnifiedRoleGrant): Promise<void> => {
  if (grant.source === 'assignment' && grant.assignmentId) {
    await removeAssignment(grant.assignmentId);
    return;
  }
  const summary = await getEmployeeAccessSummary(personId);
  const next = summary.roles.map((r) => r.id).filter((id) => id !== grant.roleId);
  await updateEmployeeRoles(personId, next);
};

/**
 * TEMPORARY assignment — a time-boxed grant via RoleAssignment (the only mechanism
 * that supports expiry). Requires a provisioned `tenantId`; surfaces the backend
 * error clearly until tenancy is seeded, rather than silently degrading.
 */
export const assignTemporaryRole = (input: {
  personId: string;
  roleId: string;
  tenantId: string;
  effectiveUntil: string;
  organizationalUnitId?: string | null;
}): Promise<Assignment> =>
  createAssignment({
    userId: input.personId,
    roleId: input.roleId,
    tenantId: input.tenantId,
    organizationalUnitId: input.organizationalUnitId ?? null,
    effectiveUntil: input.effectiveUntil,
  });

/** Expire an active assignment early. */
export const expireRoleAssignment = (assignmentId: string) => expireAssignment(assignmentId);

/** EFFECTIVE — server-computed; already merges both grant sources + overrides. */
export const getEffectiveAccess = (personId: string) => fetchEffectiveAccess(personId);

/** HISTORY — assignment lifecycle for a person. */
export const getAccessHistory = (personId: string, limit?: number) => fetchAssignmentHistory(personId, limit);

/** OVERRIDES — per-employee; owned by Employee Access. Passed straight through. */
export { setSectionAccessLevel as setPermissionOverride, resetAllEmployeeOverrides as resetPermissionOverrides };
