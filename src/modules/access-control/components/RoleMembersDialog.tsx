import {
  Avatar, Box, CircularProgress, Dialog, DialogContent, DialogTitle,
  IconButton, List, ListItem, ListItemAvatar, ListItemText, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useRoleMembers } from '../hooks/useAccessControl';
import { initials } from '../utils/format';

interface RoleMembersDialogProps {
  roleId: string;
  roleName: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Read-only list of the employees directly holding a role — the "Assigned users"
 * the role card counts. Data comes from GET /api/access/roles/:id/members; nothing
 * is fabricated. Fetches only while open.
 */
export const RoleMembersDialog = ({ roleId, roleName, open, onClose }: RoleMembersDialogProps) => {
  const { data: members = [], isLoading, isError } = useRoleMembers(roleId, open);

  // Show only ACTIVE assignees, alphabetically (A–Z). filter() returns a fresh
  // array, so the sort doesn't mutate the query cache.
  const visibleMembers = members
    .filter((m) => m.isActive)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pr: 6 }}>
        Assigned users
        <Typography variant="body2" color="text.secondary">{roleName}</Typography>
        <IconButton onClick={onClose} aria-label="Close" sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={26} /></Box>
        ) : isError ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>Could not load assigned users.</Typography>
        ) : visibleMembers.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
            No active employees are assigned this role.
          </Typography>
        ) : (
          <List disablePadding>
            {visibleMembers.map((m) => (
              <ListItem key={m.id} disableGutters>
                <ListItemAvatar>
                  <Avatar src={m.avatar ?? undefined} sx={{ width: 36, height: 36, fontSize: 14 }}>
                    {initials(m.name)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={m.name}
                  secondary={[m.designation, m.email].filter(Boolean).join(' · ') || undefined}
                  primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RoleMembersDialog;
