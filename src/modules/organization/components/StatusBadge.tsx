import { memo } from 'react';
import { Chip } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';

export type BadgeKind = 'active' | 'archived';

const CONFIG: Record<BadgeKind, { label: string; color: 'success' | 'default'; Icon: typeof CheckCircleOutlineIcon }> = {
  active: { label: 'Active', color: 'success', Icon: CheckCircleOutlineIcon },
  archived: { label: 'Archived', color: 'default', Icon: Inventory2OutlinedIcon },
};

/**
 * Enterprise status pill. Never colour-only — always icon + text (WCAG 1.4.1).
 * Mirrors the access-control StatusBadge for a shared visual language.
 */
export const StatusBadge = memo(({ status, size = 'small' }: { status: BadgeKind; size?: 'small' | 'medium' }) => {
  const { label, color, Icon } = CONFIG[status] ?? CONFIG.active;
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
