/**
 * Access Control — module layout.
 *
 * Wraps every Access Control route in the shared AccessScopeProvider and mounts
 * the Global Scope Bar exactly once. Child pages render through <Outlet/> and
 * automatically consume the same organizational scope — no page owns its own
 * org filters, and there is never more than one scope bar.
 */
import { Outlet } from 'react-router-dom';
import { AccessScopeProvider } from './AccessScopeContext';
import { GlobalScopeBar } from './GlobalScopeBar';

export const AccessControlLayout = () => (
  <AccessScopeProvider>
    <GlobalScopeBar />
    <Outlet />
  </AccessScopeProvider>
);

export default AccessControlLayout;
