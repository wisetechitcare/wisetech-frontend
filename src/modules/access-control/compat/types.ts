/**
 * Access Control — Compatibility Layer types (migration Step 0).
 *
 * A single, source-agnostic shape for an employee's access. The UI consumes these
 * types and never needs to know whether a role came from the legacy direct
 * employees↔roles link or a RoleAssignment.
 */
import type { AccessOverride } from '@services/employeeAccess';

/** Where a role grant originates. Internal only — never surfaced to end users. */
export type RoleGrantSource = 'direct' | 'assignment';

/** One role held by an employee, normalized across both backend grant mechanisms. */
export interface UnifiedRoleGrant {
  /** Stable React key (unique across sources). */
  key: string;
  roleId: string;
  roleName: string;
  source: RoleGrantSource;
  /** Present when source === 'assignment' — needed to route a removal correctly. */
  assignmentId?: string;
  scope?: string;
  status?: string;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  isSystem?: boolean;
}

/** One employee's complete access, merged from legacy roles + RoleAssignments. */
export interface UnifiedEmployeeAccess {
  personId: string;
  /** Deduped by roleId; a role granted by both sources appears once. */
  roles: UnifiedRoleGrant[];
  /** Server-computed effective permission keys (already merges both sources + overrides). */
  effective: string[];
  overridesAllow: AccessOverride[];
  overridesDeny: AccessOverride[];
  sectionLevels: Record<string, 'view' | 'edit' | 'blocked'>;
}
