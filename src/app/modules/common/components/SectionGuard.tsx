import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@redux/store";

interface SectionGuardProps {
  /** Section/sub-section key, e.g. "projects" or "reports.kpi". */
  module: string;
  children: React.ReactNode;
  redirectTo?: string;
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
export const SectionGuard: React.FC<SectionGuardProps> = ({ module, children, redirectTo = "/dashboard" }) => {
  const blocked: string[] = useSelector((s: RootState) => (s as any).authz?.blockedSections || []);

  const parts = module.split(".");
  const isBlocked = parts.some((_, i) => blocked.includes(parts.slice(0, parts.length - i).join(".")));

  if (isBlocked) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
};

export default SectionGuard;
