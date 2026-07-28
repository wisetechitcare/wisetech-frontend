import { Divider, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HistoryToggleOffOutlinedIcon from '@mui/icons-material/HistoryToggleOffOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import type { Assignment } from '../types';

export interface AssignmentRowActions {
  onView: (a: Assignment) => void;
  onEdit: (a: Assignment) => void;
  onExpire: (a: Assignment) => void;
  onRemove: (a: Assignment) => void;
  onRestore: (a: Assignment) => void;
  onEffective: (a: Assignment) => void;
  onHistory: (a: Assignment) => void;
}

interface RowActionsMenuProps {
  anchorEl: HTMLElement | null;
  assignment: Assignment | null;
  actions: AssignmentRowActions;
  onClose: () => void;
}

/** The per-row action menu, opened from the ⋮ button. */
export const RowActionsMenu = ({ anchorEl, assignment, actions, onClose }: RowActionsMenuProps) => {
  const a = assignment;
  const isRevoked = a?.status === 'revoked';
  const isExpired = a?.status === 'expired';

  const run = (fn: (a: Assignment) => void) => () => {
    if (a) fn(a);
    onClose();
  };

  return (
    <Menu
      open={!!anchorEl && !!a}
      anchorEl={anchorEl}
      onClose={onClose}
      MenuListProps={{ dense: true, 'aria-label': a ? `Actions for ${a.person?.name ?? 'assignment'}` : 'Assignment actions' }}
    >
      <MenuItem onClick={run(actions.onView)}>
        <ListItemIcon><VisibilityOutlinedIcon fontSize="small" /></ListItemIcon>
        <ListItemText>View details</ListItemText>
      </MenuItem>
      <MenuItem onClick={run(actions.onEdit)} disabled={isRevoked}>
        <ListItemIcon><EditOutlinedIcon fontSize="small" /></ListItemIcon>
        <ListItemText>Edit</ListItemText>
      </MenuItem>
      <MenuItem onClick={run(actions.onEffective)}>
        <ListItemIcon><AccountTreeOutlinedIcon fontSize="small" /></ListItemIcon>
        <ListItemText>Effective access</ListItemText>
      </MenuItem>
      <MenuItem onClick={run(actions.onHistory)}>
        <ListItemIcon><HistoryToggleOffOutlinedIcon fontSize="small" /></ListItemIcon>
        <ListItemText>History</ListItemText>
      </MenuItem>
      <Divider />
      {!isRevoked && !isExpired && (
        <MenuItem onClick={run(actions.onExpire)}>
          <ListItemIcon><BlockOutlinedIcon fontSize="small" color="warning" /></ListItemIcon>
          <ListItemText>Expire now</ListItemText>
        </MenuItem>
      )}
      {isRevoked ? (
        <MenuItem onClick={run(actions.onRestore)}>
          <ListItemIcon><RestartAltIcon fontSize="small" color="success" /></ListItemIcon>
          <ListItemText>Restore</ListItemText>
        </MenuItem>
      ) : (
        <MenuItem onClick={run(actions.onRemove)}>
          <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Remove</ListItemText>
        </MenuItem>
      )}
    </Menu>
  );
};

export default RowActionsMenu;
