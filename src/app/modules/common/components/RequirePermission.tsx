import React from 'react';
import { Navigate } from 'react-router-dom';
import { canAny } from '@utils/can';

interface RequirePermissionProps {
  /** One or more capability keys; access is granted if ANY is held. */
  perm: string | string[];
  children: React.ReactNode;
  /** Where to send users who lack the permission. Defaults to /error/404. */
  redirectTo?: string;
  /** Render nothing instead of redirecting (useful for inline sections). */
  hideOnly?: boolean;
  /** Optional fallback element shown when access is denied and hideOnly is set. */
  fallback?: React.ReactNode;
}

/**
 * Route/section guard driven by the canonical capability list.
 *
 * Unlike the legacy pattern of hiding a <Route> with `{hasPermission() && ...}`
 * (which silently drops the route), this redirects to a 403 page so the user
 * gets clear feedback. The backend remains the source of truth — this is UX only.
 */
export const RequirePermission: React.FC<RequirePermissionProps> = ({
  perm,
  children,
  redirectTo = '/error/404',
  hideOnly = false,
  fallback = null,
}) => {
  const keys = Array.isArray(perm) ? perm : [perm];
  const allowed = canAny(keys);

  if (allowed) return <>{children}</>;
  if (hideOnly) return <>{fallback}</>;
  return <Navigate to={redirectTo} replace />;
};

export default RequirePermission;
