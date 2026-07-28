/**
 * Access Control — "Show all admins" (Super Admin only).
 *
 * Lists everyone holding the Admin or Group Admin role and lets a Super Admin
 * toggle each one's cross-sub-org reach. The toggle is a role swap under the hood:
 *   OFF → Admin        (`.all`  = own sub-org only)
 *   ON  → Group Admin  (`.global` = the whole group / all sub-orgs)
 * Both roles carry identical permissions; only the scope differs. The swap goes
 * through the existing role-assignment path (Super-Admin-gated by canManageRoleLevel).
 */
import { useMemo, useState } from 'react';
import {
  Box, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton,
  List, ListItem, Stack, Switch, Tooltip, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { usePeopleForPicker, useRolesForPicker, assignmentKeys } from '@modules/assignments/hooks/useAssignments';
import { PersonCell } from '@modules/assignments/components/PersonCell';
import { assignRole } from '../compat/accessCompat';
import { accessKeys } from '../hooks/useAccessControl';

const ADMIN_ROLE = 'Admin';
const GROUP_ADMIN_ROLE = 'Group Admin';

export const ManageAdminsDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { data: people = [], isLoading } = usePeopleForPicker();
  const { data: roles = [] } = useRolesForPicker();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const adminRoleId = useMemo(() => roles.find((r) => r.name === ADMIN_ROLE)?.id ?? null, [roles]);
  const groupAdminRoleId = useMemo(() => roles.find((r) => r.name === GROUP_ADMIN_ROLE)?.id ?? null, [roles]);

  const admins = useMemo(
    () => people
      .filter((p) => p.role === ADMIN_ROLE || p.role === GROUP_ADMIN_ROLE)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [people],
  );

  const toggle = async (personId: string, toGroupWide: boolean) => {
    const targetRoleId = toGroupWide ? groupAdminRoleId : adminRoleId;
    if (!targetRoleId) {
      toast.error('The Admin / Group Admin roles are not seeded yet — run "npm run rbac:seed".');
      return;
    }
    setBusyId(personId);
    try {
      await assignRole(personId, targetRoleId); // replaces the current role (one role per employee)
      queryClient.invalidateQueries({ queryKey: assignmentKeys.people }); // refresh this list
      queryClient.invalidateQueries({ queryKey: accessKeys.all });        // role member counts
      toast.success(toGroupWide ? 'Granted cross-sub-org access' : 'Restricted to own sub-org');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not update admin access');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6, fontWeight: 700 }}>
        Admins · cross-sub-org access
        <IconButton aria-label="Close" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Admins are confined to their own sub-organization. Turn on cross-sub-org access to let an admin
          administer across every sub-org (group-wide). Only a Super Admin can change this.
        </Typography>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={26} /></Box>
        ) : admins.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>No admins found.</Typography>
        ) : (
          <List disablePadding>
            {admins.map((p) => {
              const groupWide = p.role === GROUP_ADMIN_ROLE;
              return (
                <ListItem
                  key={p.id}
                  divider
                  secondaryAction={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        size="small"
                        variant="outlined"
                        color={groupWide ? 'primary' : 'default'}
                        label={groupWide ? 'Group-wide' : 'Sub-org'}
                        sx={{ borderRadius: 1.5, fontWeight: 600 }}
                      />
                      <Tooltip title={groupWide ? 'Restrict to own sub-org' : 'Allow cross-sub-org administration'}>
                        <Switch
                          checked={groupWide}
                          disabled={busyId === p.id}
                          onChange={(e) => toggle(p.id, e.target.checked)}
                          inputProps={{ 'aria-label': `Cross-sub-org access for ${p.name}` }}
                        />
                      </Tooltip>
                    </Stack>
                  }
                >
                  <PersonCell name={p.name} email={p.caption ?? undefined} />
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ManageAdminsDialog;
