import React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@redux/store";
import { canSection } from "@utils/can";
import NoAccessPage from "./NoAccessPage";

interface SectionGuardProps {
  /** Section/sub-section key, e.g. "projects" or "reports.kpi". */
  module: string;
  children: React.ReactNode;
}

/**
 * Route guard for a sidebar section: without Read on it, the No access page — instead of a page
 * whose requests would all be refused. Subscribes to the authz slice, so access an admin revokes
 * while the person is on the page swaps it for No access at once (and back when it's given).
 */
export const SectionGuard: React.FC<SectionGuardProps> = ({ module, children }) => {
  useSelector((s: RootState) => (s as any).authz?.access);
  if (!canSection(module, "read")) return <NoAccessPage section={module} />;
  return <>{children}</>;
};

export default SectionGuard;
