import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@redux/store";
import { canSection } from "@utils/can";

interface SectionGuardProps {
  /** Section/sub-section key, e.g. "projects" or "reports.kpi". */
  module: string;
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Route guard for a sidebar section: redirects away when the signed-in employee has no Read on it,
 * instead of rendering a page whose requests would all be refused. Subscribes to the authz slice so
 * a live access change applies immediately.
 */
export const SectionGuard: React.FC<SectionGuardProps> = ({ module, children, redirectTo = "/dashboard" }) => {
  useSelector((s: RootState) => (s as any).authz?.access);
  if (!canSection(module, "read")) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
};

export default SectionGuard;
