import { memo } from 'react';
import { Chip } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditNoteIcon from '@mui/icons-material/EditNote';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

export type BadgeKind = 'published' | 'draft' | 'archived' | 'system';

const CONFIG: Record<BadgeKind, { label: string; color: 'success' | 'warning' | 'default' | 'info'; Icon: typeof CheckCircleOutlineIcon }> = {
  published: { label: 'Published', color: 'success', Icon: CheckCircleOutlineIcon },
  draft: { label: 'Draft', color: 'warning', Icon: EditNoteIcon },
  archived: { label: 'Archived', color: 'default', Icon: Inventory2OutlinedIcon },
  system: { label: 'System', color: 'info', Icon: LockOutlinedIcon },
};

/**
 * Enterprise status pill. Never colour-only — always icon + text (WCAG 1.4.1).
 */
export const StatusBadge = memo(({ kind, size = 'small' }: { kind: BadgeKind; size?: 'small' | 'medium' }) => {
  const { label, color, Icon } = CONFIG[kind];
  return (
    <Chip
      size={size}
      color={color}
      variant="outlined"
      icon={<Icon fontSize="small" aria-hidden="true" />}
      label={label}
      aria-label={`Status: ${label}`}
      sx={{ fontWeight: 600, borderRadius: 1.5, '& .MuiChip-icon': { ml: 0.75 } }}
    />
  );
});
StatusBadge.displayName = 'StatusBadge';

export default StatusBadge;
