/**
 * Employee Access › Assigned Roles.
 *
 * The ONE place an employee's roles are managed. Shows a single unified list via the
 * Step-0 Compatibility Layer — the UI never reveals whether a role came from the
 * legacy direct link or a RoleAssignment. Assign / Remove route through the compat
 * layer; Temporary assignment (RoleAssignment-only) is disabled until tenancy is
 * provisioned, rather than fabricating a broken flow.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Autocomplete, Box, Button, Chip, CircularProgress, IconButton, List, ListItem,
  ListItemText, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import { useRolesForPicker, assignmentKeys } from '@modules/assignments/hooks/useAssignments';
import { accessKeys } from '../hooks/useAccessControl';
import { getUnifiedEmployeeAccess, assignRole, removeRoleGrant } from '../compat/accessCompat';
import type { UnifiedRoleGrant } from '../compat/types';

export const UnifiedRolesPanel = ({ personId, onChanged }: { personId: string; onChanged?: () => void }) => {
  const [roles, setRoles] = useState<UnifiedRoleGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toAdd, setToAdd] = useState<{ id: string; name: string } | null>(null);
  const { data: roleOptions = [] } = useRolesForPicker();
  const queryClient = useQueryClient();

  // A role change here changes this employee's effective access AND the role's
  // member count, which are shown by other panels/pages backed by their own
  // caches. Invalidate those and let the parent refresh its overview counts, so
  // the change reflects everywhere without a manual reload.
  const propagateChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: accessKeys.all });        // Roles dashboard + role details/member counts
    queryClient.invalidateQueries({ queryKey: assignmentKeys.all });    // effective access + assignment history
    onChanged?.();                                                      // parent Overview counts
  }, [queryClient, onChanged]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const access = await getUnifiedEmployeeAccess(personId);
      setRoles(access.roles);
    } catch {
      toast.error('Could not load assigned roles');
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => { load(); }, [load]);

  const heldIds = useMemo(() => new Set(roles.map((r) => r.roleId)), [roles]);
  const assignable = useMemo(() => roleOptions.filter((r) => !heldIds.has(r.id)), [roleOptions, heldIds]);

  const handleAssign = async () => {
    if (!toAdd) return;
    setBusy(true);
    try {
      await assignRole(personId, toAdd.id);
      setToAdd(null);
      await load();
      propagateChange();
      toast.success('Role assigned');
    } catch (err: any) {
      // Surface the real reason (e.g. "role at or above your own level") instead
      // of a generic message — same honesty as the Access tab.
      toast.error(err?.response?.data?.message || 'Could not assign role');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (grant: UnifiedRoleGrant) => {
    setBusy(true);
    try {
      await removeRoleGrant(personId, grant);
      await load();
      propagateChange();
      toast.success('Role removed');
    } catch {
      toast.error('Could not remove role');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      {/* Assign */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
        <Autocomplete
          size="small"
          sx={{ minWidth: 280 }}
          options={assignable}
          getOptionLabel={(o) => o.name}
          value={toAdd}
          onChange={(_, v) => setToAdd(v ? { id: v.id, name: v.name } : null)}
          renderInput={(params) => <TextField {...params} label="Assign a role" placeholder="Search roles…" />}
        />
        <Button variant="contained" size="small" disabled={!toAdd || busy} onClick={handleAssign} sx={{ textTransform: 'none' }}>
          Assign
        </Button>
        <Tooltip title="Time-boxed assignment requires tenant provisioning (multi-tenant activation).">
          <span>
            <Button variant="outlined" size="small" startIcon={<ScheduleOutlinedIcon />} disabled sx={{ textTransform: 'none' }}>
              Temporary
            </Button>
          </span>
        </Tooltip>
      </Stack>

      {/* Unified role list */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
      ) : roles.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>No roles assigned yet.</Typography>
      ) : (
        <List sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
          {roles.map((grant, i) => (
            <ListItem
              key={grant.key}
              divider={i < roles.length - 1}
              secondaryAction={
                <Tooltip title="Remove role">
                  <span>
                    <IconButton edge="end" aria-label="Remove role" disabled={busy} onClick={() => handleRemove(grant)}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              }
            >
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ fontWeight: 600 }}>{grant.roleName}</Typography>
                    {grant.isSystem && <Chip size="small" label="System" variant="outlined" />}
                    {grant.effectiveUntil && (
                      <Chip size="small" color="warning" variant="outlined" label={`Until ${new Date(grant.effectiveUntil).toLocaleDateString()}`} />
                    )}
                  </Stack>
                }
                secondary={grant.scope ? `Scope: ${grant.scope}` : undefined}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default UnifiedRolesPanel;
