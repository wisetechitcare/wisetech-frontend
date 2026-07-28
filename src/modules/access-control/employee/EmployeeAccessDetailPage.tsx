/**
 * Employee Access — one employee, one place.
 *
 * A single employee-centric shell. Everything about one person's access lives here
 * as tabs: Overview · Assigned Roles · Effective Permissions · Permission Overrides ·
 * Access Timeline. Composes existing production pieces — the Effective and Timeline
 * tabs reuse the assignment module's pages verbatim; roles use the Step-0 compat
 * layer; overrides reuse AccessControlTree + services. No permission-matrix editing
 * lives here (that stays in Roles).
 */
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Breadcrumbs, Button, Card, CardContent, Link as MuiLink, Stack, Tab, Tabs, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { usePeopleForPicker } from '@modules/assignments/hooks/useAssignments';
import { EffectiveAccessPage } from '@modules/assignments/pages/EffectiveAccessPage';
import { AssignmentHistoryPage } from '@modules/assignments/pages/AssignmentHistoryPage';
import { getUnifiedEmployeeAccess } from '../compat/accessCompat';
import { UnifiedRolesPanel } from './UnifiedRolesPanel';
import { OverridesPanel } from './OverridesPanel';

const TabPanel = ({ children, value, index }: { children: ReactNode; value: number; index: number }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ pt: 3 }}>
    {value === index && children}
  </Box>
);

const StatCard = ({ label, value }: { label: string; value: number | string }) => (
  <Card variant="outlined" sx={{ borderRadius: 3, minWidth: 160 }}>
    <CardContent>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>{value}</Typography>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
    </CardContent>
  </Card>
);

export const EmployeeAccessDetailPage = () => {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [counts, setCounts] = useState<{ roles: number; effective: number; overrides: number } | null>(null);

  const { data: people = [] } = usePeopleForPicker();
  const personName = useMemo(
    () => people.find((p) => p.id === personId)?.name ?? 'Employee',
    [people, personId],
  );

  // Load the Overview stat counts. Exposed as a callback so a role change in the
  // Assigned Roles tab can refresh them (otherwise Overview stays stale until a
  // full page reload).
  const loadCounts = useCallback(() => {
    if (!personId) return;
    getUnifiedEmployeeAccess(personId)
      .then((a) => setCounts({
        roles: a.roles.length,
        effective: a.effective.length,
        overrides: a.overridesAllow.length + a.overridesDeny.length,
      }))
      .catch(() => { /* non-fatal — overview counts stay null */ });
  }, [personId]);

  useEffect(() => { loadCounts(); }, [loadCounts]);

  if (!personId) return null;

  const TABS = ['Overview', 'Assigned Roles', 'Effective Permissions', 'Permission Overrides', 'Access Timeline'];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Breadcrumbs sx={{ mb: 1.5 }} aria-label="Breadcrumb">
        <MuiLink component="button" underline="hover" color="inherit" onClick={() => navigate('/access-control/employees')}>
          Employee Access
        </MuiLink>
        <Typography color="text.primary">{personName}</Typography>
      </Breadcrumbs>

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Button onClick={() => navigate('/access-control/employees')} startIcon={<ArrowBackIcon />} size="small" sx={{ textTransform: 'none' }}>
          Back
        </Button>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>{personName}</Typography>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Employee access sections"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {TABS.map((label, i) => (
          <Tab key={label} label={label} id={`emp-tab-${i}`} sx={{ textTransform: 'none', fontWeight: 600 }} />
        ))}
      </Tabs>

      {/* Overview */}
      <TabPanel value={tab} index={0}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <StatCard label="Assigned roles" value={counts?.roles ?? '—'} />
          <StatCard label="Effective permissions" value={counts?.effective ?? '—'} />
          <StatCard label="Permission overrides" value={counts?.overrides ?? '—'} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Manage this employee's roles, review their effective access, adjust per-module overrides,
          and view their access history from the tabs above.
        </Typography>
      </TabPanel>

      {/* Assigned Roles — unified via the compatibility layer */}
      <TabPanel value={tab} index={1}>
        <UnifiedRolesPanel personId={personId} onChanged={loadCounts} />
      </TabPanel>

      {/* Effective Permissions — reuses the existing viewer (no second viewer) */}
      <TabPanel value={tab} index={2}>
        <EffectiveAccessPage />
      </TabPanel>

      {/* Permission Overrides */}
      <TabPanel value={tab} index={3}>
        <OverridesPanel employeeId={personId} />
      </TabPanel>

      {/* Access Timeline — reuses the existing assignment history */}
      <TabPanel value={tab} index={4}>
        <AssignmentHistoryPage />
      </TabPanel>
    </Box>
  );
};

export default EmployeeAccessDetailPage;
