import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@redux/store";
import { canViewModule, evaluateCapability } from "@utils/can";

interface SectionGuardProps {
  /** Section/sub-section key, e.g. "projects" or "reports.kpi". */
  module: string;
  children: React.ReactNode;
  redirectTo?: string;
  /**
   * OPTIONAL (Milestone 1, additive): require this exact capability key to view
   * the page, e.g. "users.view.all". When provided, it is the positive gate
   * (evaluated reactively against the capability set, scope-widening applied) and
   * takes precedence over `requireGrant`/`allowIf`. The block check on `module`
   * still applies. Call sites that DON'T pass this behave exactly as before —
   * this changes nothing for existing usage.
   */
  permission?: string;
  /**
   * When true, also requires a positive view grant for `module` (any scope) -
   * not just "not explicitly blocked". Opt-in per section as each one moves
   * off the legacy "visible unless blocked" default-allow model to a proper
   * default-deny-unless-granted one (e.g. Leads). Existing call sites that
   * don't pass this keep their current default-allow behavior unchanged.
   */
  requireGrant?: boolean;
  /**
   * Escape hatch alongside `requireGrant`: if true, access is allowed even
   * without a module-level grant. For sections where a narrower, record-level
   * reason can substitute for the general grant (e.g. Projects — an employee
   * staffed on a specific project should reach the section even without
   * crm.leads/projects access; the list itself narrows server-side to just
   * their own projects). Ignored when `requireGrant` is false.
   */
  allowIf?: boolean;
}

/**
 * Route guard for a sidebar section. Redirects away (instead of rendering a
 * page that can't load) when the section — or any of its parent sections — is
 * blocked for the current employee. Blocking a parent (e.g. "reports") also
 * guards its children (e.g. "reports.kpi").
 *
 * Subscribes to the authz slice so a live block change redirects immediately,
 * which is what stops a just-blocked page from sitting on an endless spinner.
 */
export const SectionGuard: React.FC<SectionGuardProps> = ({ module, children, redirectTo = "/error/403", requireGrant = false, allowIf = false, permission }) => {
  const blocked: string[] = useSelector((s: RootState) => (s as any).authz?.blockedSections || []);
  // Subscribe to capabilities so a live grant/revoke redirects immediately (same
  // reasoning as the blockedSections subscription). The value is now also used to
  // evaluate the optional `permission` prop reactively.
  const capabilities = useSelector((s: RootState) => (s as any).authz?.capabilities || []);

  const parts = module.split(".");
  const isBlocked = parts.some((_, i) => blocked.includes(parts.slice(0, parts.length - i).join(".")));
  // Optional explicit-permission gate wins over the legacy requireGrant path.
  // Evaluated reactively off the subscribed `capabilities` (no snapshot read).
  const missingGrant = permission != null
    ? !evaluateCapability(capabilities, permission)
    : (requireGrant && !canViewModule(module) && !allowIf);

  if (isBlocked || missingGrant) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
};

export default SectionGuard;
