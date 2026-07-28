import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, MenuItem, Pagination, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { TenantFilterProvider, useTenantFilters } from '../context/TenantFilterContext';
import { useTenants } from '../hooks/useOrganization';
import { TenantCard } from '../components/TenantCard';
import { SearchBar } from '../components/SearchBar';
import { CreateTenantDialog } from '../components/CreateTenantDialog';
import { TenantGridSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import type { TenantStatus } from '../types';

const GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' },
  gap: 2,
} as const;

const DashboardContent = () => {
  const navigate = useNavigate();
  const { params, search, setSearch, setStatus, setPage, resetFilters, hasActiveFilters } = useTenantFilters();
  const { data, isLoading, isError, isFetching, refetch } = useTenants(params);
  const [createOpen, setCreateOpen] = useState(false);

  const openTenant = useCallback((id: string) => navigate(`/organization/tenants/${id}`), [navigate]);

  const tenants = data?.data ?? [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>Organizations</Typography>
          <Typography variant="body2" color="text.secondary">
            {data?.total === 1 ? '1 tenant' : `${data?.total ?? 0} tenants`} · Manage tenants and their structure
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          Create tenant
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mb: 3 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search tenants…" ariaLabel="Search tenants" />
        <TextField
          select size="small" label="Status"
          sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          value={params.status ?? 'active'}
          onChange={(e) => setStatus(e.target.value as TenantStatus | 'all')}
          inputProps={{ 'aria-label': 'Filter tenants by status' }}
        >
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="archived">Archived</MenuItem>
          <MenuItem value="all">All statuses</MenuItem>
        </TextField>
      </Box>

      {isLoading ? (
        <TenantGridSkeleton count={params.pageSize ?? 12} />
      ) : isError ? (
        <ErrorState
          title="We couldn't load the tenants"
          description="There was a problem reaching the server. Please try again."
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      ) : tenants.length === 0 ? (
        <EmptyState
          variant={hasActiveFilters ? 'no-results' : 'no-data'}
          title={hasActiveFilters ? 'No tenants match your filters' : 'No tenants yet'}
          description={hasActiveFilters
            ? 'Try a different search term, or reset the filters to see every tenant.'
            : 'Create your first tenant to get started.'}
          actionLabel={hasActiveFilters ? 'Reset filters' : 'Create tenant'}
          onAction={hasActiveFilters ? resetFilters : () => setCreateOpen(true)}
        />
      ) : (
        <>
          <Box component="ul" aria-label="Tenants" sx={{ listStyle: 'none', p: 0, m: 0, ...GRID_SX }}>
            {tenants.map((tenant) => (
              <Box component="li" key={tenant.id} sx={{ display: 'flex' }}>
                <TenantCard tenant={tenant} onOpen={openTenant} />
              </Box>
            ))}
          </Box>

          {(data?.totalPages ?? 1) > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Page {data?.page ?? 1} of {data?.totalPages ?? 1} · {data?.total ?? 0} tenants
              </Typography>
              <Pagination
                page={data?.page ?? 1}
                count={data?.totalPages ?? 1}
                onChange={(_, p) => setPage(p)}
                shape="rounded"
                color="primary"
                getItemAriaLabel={(type, pageNum) => (type === 'page' ? `Go to page ${pageNum}` : `Go to ${type} page`)}
              />
            </Box>
          )}
        </>
      )}

      <CreateTenantDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={openTenant} />
    </Box>
  );
};

/** Tenant Dashboard — browse, search and create tenants. */
export const TenantDashboardPage = () => (
  <TenantFilterProvider>
    <DashboardContent />
  </TenantFilterProvider>
);

export default TenantDashboardPage;
