import { lazy, Suspense, useState, ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Breadcrumbs, Button, Card, CardContent, Divider, Link as MuiLink, Skeleton, Stack, Tab, Tabs, Tooltip, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useRole, useRoleSummary } from '../hooks/useAccessControl';
import { StatusBadge } from '../components/StatusBadge';
import { StatisticsCard } from '../components/StatisticsCard';
import { RoleMembersDialog } from '../components/RoleMembersDialog';
import { RoleSummary } from '../components/RoleSummary';
import { RoleDetailsSkeleton } from '../components/LoadingSkeleton';
import { ErrorState } from '../components/ErrorState';
import { formatDate } from '../utils/format';

// The editor is the heaviest part of this module — load it only when the
// administrator opens the Access tab.
const PermissionEditor = lazy(() =>
  import('../components/PermissionEditor').then((m) => ({ default: m.PermissionEditor })),
);

const MetaRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 1 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{value}</Typography>
  </Box>
);

const TabPanel = ({ children, value, index }: { children: ReactNode; value: number; index: number }) => (
  <Box role="tabpanel" hidden={value !== index} id={`role-tabpanel-${index}`} aria-labelledby={`role-tab-${index}`}>
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </Box>
);


export const RoleDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [membersOpen, setMembersOpen] = useState(false);
  const { data: role, isLoading, isError, isFetching, refetch } = useRole(id);
  const { data: summary, isLoading: summaryLoading } = useRoleSummary(id);

  if (isLoading) {
    return <Box sx={{ p: { xs: 2, md: 3 } }}><RoleDetailsSkeleton /></Box>;
  }

  if (isError || !role) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <ErrorState
          title="We couldn't load this role"
          description="The role may have been removed, or the server is unreachable."
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Breadcrumbs sx={{ mb: 1.5 }} aria-label="Breadcrumb">
        <MuiLink component="button" underline="hover" color="inherit" onClick={() => navigate('/access-control/roles')}>
          Roles
        </MuiLink>
        <Typography color="text.primary">{role.name}</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 2, mb: 2 }}>
        <Button
          onClick={() => navigate('/access-control/roles')}
          startIcon={<ArrowBackIcon />}
          size="small"
          sx={{ textTransform: 'none' }}
          aria-label="Back to roles"
        >
          Back
        </Button>
        <Box sx={{ flexGrow: 1, minWidth: 240 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>{role.name}</Typography>
            <StatusBadge kind={role.status === 'archived' ? 'archived' : 'published'} />
            {role.isSystem && <StatusBadge kind="system" />}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{role.description}</Typography>
        </Box>
        {/* Role lifecycle actions. Disabled with clear UX — the backend clone/archive
            flow is not wired yet, and behaviour is never fabricated. */}
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Tooltip title="Available in a later release">
            <span>
              <Button variant="outlined" size="small" startIcon={<ContentCopyOutlinedIcon />} disabled sx={{ textTransform: 'none' }}>
                Clone
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Available in a later release">
            <span>
              <Button variant="outlined" color="warning" size="small" startIcon={<Inventory2OutlinedIcon />} disabled sx={{ textTransform: 'none' }}>
                Archive
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Role sections"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {['Overview', 'Summary', 'Access', 'History'].map((label, i) => (
          <Tab
            key={label}
            label={label}
            id={`role-tab-${i}`}
            aria-controls={`role-tabpanel-${i}`}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          />
        ))}
      </Tabs>

      {/* Overview — key statistics + role details (Statistics folded in here) */}
      <TabPanel value={tab} index={0}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 2, maxWidth: 560 }}>
          <StatisticsCard
            label="Assigned users"
            value={role.statistics.assignedUsers}
            hint="Click to view the people holding this role"
            icon={<PeopleAltOutlinedIcon />}
            onClick={() => setMembersOpen(true)}
          />
          <StatisticsCard
            label="Granted areas"
            value={role.statistics.grantedAreas}
            hint="Areas this role has access to"
            icon={<LayersOutlinedIcon />}
          />
        </Box>
        <Card variant="outlined" sx={{ borderRadius: 3, maxWidth: 560 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Role details</Typography>
            <Divider sx={{ mb: 1 }} />
            <MetaRow label="Type" value={role.type === 'system' ? 'System role' : 'Custom role'} />
            <MetaRow label="Status" value={role.status === 'archived' ? 'Archived' : 'Published'} />
            <MetaRow label="Created" value={formatDate(role.createdAt)} />
            <MetaRow label="Last updated" value={formatDate(role.updatedAt)} />
            {role.statistics.topCategories.length > 0 && (
              <MetaRow label="Main areas" value={role.statistics.topCategories.join(', ')} />
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Summary */}
      <TabPanel value={tab} index={1}>
        {summaryLoading || !summary ? <RoleDetailsSkeleton /> : <RoleSummary summary={summary} />}
      </TabPanel>

      {/* Access — the ONE Permission Editor for the whole platform */}
      <TabPanel value={tab} index={2}>
        <Suspense fallback={<Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />}>
          {id && <PermissionEditor roleId={id} />}
        </Suspense>
      </TabPanel>

      {/* History — shell. The full change timeline is delivered with the centralized
          Audit Logs; no audit UI is built here. */}
      <TabPanel value={tab} index={3}>
        <Card variant="outlined" sx={{ borderRadius: 3, maxWidth: 560 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Change history</Typography>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="body2" color="text.secondary">
              Permission and metadata changes for this role will appear here. The full audit
              timeline is delivered with the centralized Audit Logs.
            </Typography>
          </CardContent>
        </Card>
      </TabPanel>

      {id && (
        <RoleMembersDialog
          roleId={id}
          roleName={role.name}
          open={membersOpen}
          onClose={() => setMembersOpen(false)}
        />
      )}
    </Box>
  );
};

export default RoleDetailsPage;
