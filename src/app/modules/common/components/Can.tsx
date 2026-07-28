import React from 'react';
import { usePermission } from '@hooks/usePermission';

interface CanProps {
  /**
   * A single capability key, e.g. "employees.view" or "attendance.team.view".
   * The backend is the source of truth — this only reflects whether the current
   * user's resolved capability set contains it (scope-widening applied).
   */
  permission: string;
  /** Rendered when the permission IS held. */
  children: React.ReactNode;
  /**
   * How to render when the permission is NOT held:
   *   'hide'     → render nothing (default)
   *   'collapse' → render an empty, zero-footprint node (keeps the slot present)
   * A `fallback`, when provided, always wins over `mode`.
   */
  mode?: 'hide' | 'collapse';
  /** Explicit content to render when denied (overrides `mode`). */
  fallback?: React.ReactNode;
}

/**
 * `<Can>` — declarative capability gate for sections and one-off elements.
 *
 * The single reusable way to show/hide UI by permission. It consumes ONLY
 * `usePermission()` (the reactive Redux-subscribed hook), so it re-renders live
 * when capabilities change — no snapshot reads, no second evaluator.
 *
 *   <Can permission="attendance.employees.view"> …team section… </Can>
 *   <Can permission="finance.salary.view" mode="collapse" />
 *   <Can permission="crm.leads.view" fallback={<Locked/>}>…</Can>
 *
 * Frontend visibility is UX only; the backend still enforces access on the API.
 */
export const Can: React.FC<CanProps> = ({ permission, children, mode = 'hide', fallback }) => {
  const allowed = usePermission(permission);
  if (allowed) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;
  return mode === 'collapse' ? <span aria-hidden="true" style={{ display: 'none' }} /> : null;
};

export default Can;
