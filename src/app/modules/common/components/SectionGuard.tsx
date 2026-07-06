import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@redux/store";
import { canViewModule } from "@utils/can";

interface SectionGuardProps {
  /** Section/sub-section key, e.g. "projects" or "reports.kpi". */
  module: string;
  children: React.ReactNode;
  redirectTo?: string;
  /**
   * When true, also requires a positive view grant for `module` (any scope) -
   * not just "not explicitly blocked". Opt-in per section as each one moves
   * off the legacy "visible unless blocked" default-allow model to a proper
   * default-deny-unless-granted one (e.g. Leads). Existing call sites that
   * don't pass this keep their current default-allow behavior unchanged.
   */
  requireGrant?: boolean;
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
export const SectionGuard: React.FC<SectionGuardProps> = ({ module, children, redirectTo = "/dashboard", requireGrant = false }) => {
  const blocked: string[] = useSelector((s: RootState) => (s as any).authz?.blockedSections || []);
  // Subscribe to capabilities too so a live grant/revoke redirects immediately,
  // same reasoning as the blockedSections subscription above.
  useSelector((s: RootState) => (s as any).authz?.capabilities);

  const parts = module.split(".");
  const isBlocked = parts.some((_, i) => blocked.includes(parts.slice(0, parts.length - i).join(".")));
  const missingGrant = requireGrant && !canViewModule(module);

  if (isBlocked || missingGrant) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
};

export default SectionGuard;
