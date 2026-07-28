import { Divider, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import DriveFileMoveOutlinedIcon from '@mui/icons-material/DriveFileMoveOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import type { TreeNode } from '../types';
import type { TreeNodeActions } from './treeTypes';

export interface MenuAnchor {
  node: TreeNode;
  /** Element anchor (⋮ button) or a screen position (right-click). One of the two is set. */
  anchorEl?: HTMLElement | null;
  position?: { top: number; left: number };
}

interface UnitContextMenuProps {
  anchor: MenuAnchor | null;
  onClose: () => void;
  actions: TreeNodeActions;
}

/** The per-node action menu — opened from the ⋮ button or a right-click. */
export const UnitContextMenu = ({ anchor, onClose, actions }: UnitContextMenuProps) => {
  const node = anchor?.node;
  const isArchived = node?.status === 'archived';

  const run = (fn: (n: TreeNode) => void) => () => {
    if (node) fn(node);
    onClose();
  };

  return (
    <Menu
      open={!!anchor}
      onClose={onClose}
      anchorEl={anchor?.anchorEl ?? undefined}
      anchorReference={anchor?.position ? 'anchorPosition' : 'anchorEl'}
      anchorPosition={anchor?.position}
      MenuListProps={{ dense: true, 'aria-label': node ? `Actions for ${node.name}` : 'Unit actions' }}
    >
      <MenuItem onClick={run(actions.onViewDetails)}>
        <ListItemIcon><VisibilityOutlinedIcon fontSize="small" /></ListItemIcon>
        <ListItemText>View details</ListItemText>
      </MenuItem>
      <MenuItem onClick={run(actions.onAddChild)}>
        <ListItemIcon><AddIcon fontSize="small" /></ListItemIcon>
        <ListItemText>Add child unit</ListItemText>
      </MenuItem>
      <MenuItem onClick={run(actions.onRename)} disabled={isArchived}>
        <ListItemIcon><DriveFileRenameOutlineIcon fontSize="small" /></ListItemIcon>
        <ListItemText>Rename</ListItemText>
      </MenuItem>
      <MenuItem onClick={run(actions.onMove)} disabled={isArchived}>
        <ListItemIcon><DriveFileMoveOutlinedIcon fontSize="small" /></ListItemIcon>
        <ListItemText>Move…</ListItemText>
      </MenuItem>
      <Divider />
      {isArchived ? (
        <MenuItem onClick={run(actions.onRestore)}>
          <ListItemIcon><UnarchiveOutlinedIcon fontSize="small" color="success" /></ListItemIcon>
          <ListItemText>Restore</ListItemText>
        </MenuItem>
      ) : (
        <MenuItem onClick={run(actions.onArchive)}>
          <ListItemIcon><Inventory2OutlinedIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Archive</ListItemText>
        </MenuItem>
      )}
    </Menu>
  );
};

export default UnitContextMenu;
