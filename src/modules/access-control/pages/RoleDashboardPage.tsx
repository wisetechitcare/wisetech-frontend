import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, Button, Typography } from '@mui/material';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import type { RootState } from '@redux/store';
import { AccessControlProvider, useAccessControlFilters } from '../context/AccessControlContext';
import { useAccessScope } from '../scope/AccessScopeContext';
import { useCapabilityCatalog, useRoles } from '../hooks/useAccessControl';
import { RoleToolbar } from '../components/RoleToolbar';
import { RoleGrid } from '../components/RoleGrid';
import { RoleGridSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { ManageAdminsDialog } from '../components/ManageAdminsDialog';

const DashboardContent = () => {
  const navigate = useNavigate();
  const { params, setPage, resetFilters, hasActiveFilters } = useAccessControlFilters();
  // Shared organizational scope (from the Global Scope Bar). Role DEFINITIONS are
  // organization-wide, so the scope contextualizes the catalog rather than filtering
  // it — surfaced honestly below; scoped member/assignment views arrive in Step 4.
  const { labels } = useAccessScope();
  const scopePath = [labels.organization, labels.subOrganization, labels.branch, labels.department].filter(Boolean).join(' › ');
  const { data: catalog } = useCapabilityCatalog();
  const { data, isLoading, isError, isFetching, refetch } = useRoles(params);
  // Super-Admin-only: manage which admins may administer across sub-orgs.
  const isSuperAdmin = useSelector((s: RootState) => s.authz.isSuperAdmin);
  const [adminsOpen, setAdminsOpen] = useState(false);

  const openRole = useCallback((id: string) => navigate(`/access-control/roles/${id}`), [navigate]);

  // Group Admin is an internal ELEVATION of Admin (managed via the Super-Admin
  // "Show all admins" toggle), not a separately browsable role — hide its card
  // from the catalog and adjust the count accordingly.
  const allRoles = data?.data ?? [];
  const roles = allRoles.filter((r) => r.code !== 'GROUP_ADMIN');
  const total = Math.max(0, (data?.total ?? 0) - (allRoles.length - roles.length));
  const categories = catalog?.categories ?? [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <RoleToolbar categories={categories} total={total} />

      {isSuperAdmin && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AdminPanelSettingsOutlinedIcon />}
            onClick={() => setAdminsOpen(true)}
            sx={{ textTransform: 'none' }}
          >
            Show all admins
          </Button>
        </Box>
      )}
      {isSuperAdmin && <ManageAdminsDialog open={adminsOpen} onClose={() => setAdminsOpen(false)} />}

      {scopePath && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Role definitions are shared organization-wide · current scope: {scopePath}
        </Typography>
      )}

      {isLoading ? (
        <RoleGridSkeleton count={params.pageSize ?? 12} />
      ) : isError ? (
        <ErrorState
          title="We couldn't load the roles"
          description="There was a problem reaching the server. Please try again."
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      ) : roles.length === 0 ? (
        <EmptyState
          variant={hasActiveFilters ? 'no-results' : 'no-data'}
          actionLabel={hasActiveFilters ? 'Reset filters' : undefined}
          onAction={hasActiveFilters ? resetFilters : undefined}
        />
      ) : (
        <RoleGrid
          roles={roles}
          page={data?.page ?? 1}
          totalPages={data?.totalPages ?? 1}
          total={total}
          onPageChange={setPage}
          onOpen={openRole}
        />
      )}
    </Box>
  );
};

/** Role Dashboard — browse, search and filter roles (read-only in this phase). */
export const RoleDashboardPage = () => (
  <AccessControlProvider>
    <DashboardContent />
  </AccessControlProvider>
);

export default RoleDashboardPage;
