import { memo } from 'react';
import { Chip } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import HistoryToggleOffOutlinedIcon from '@mui/icons-material/HistoryToggleOffOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import type { AssignmentStatus } from '../types';

type MuiColor = 'success' | 'info' | 'default' | 'error';

const CONFIG: Record<AssignmentStatus, { label: string; color: MuiColor; Icon: typeof CheckCircleOutlineIcon }> = {
  active: { label: 'Active', color: 'success', Icon: CheckCircleOutlineIcon },
  scheduled: { label: 'Scheduled', color: 'info', Icon: ScheduleOutlinedIcon },
  expired: { label: 'Expired', color: 'default', Icon: HistoryToggleOffOutlinedIcon },
  revoked: { label: 'Removed', color: 'error', Icon: BlockOutlinedIcon },
};

/**
 * Enterprise status pill. Never colour-only — always icon + text (WCAG 1.4.1).
 * Mirrors the access-control / organization StatusBadge for a shared visual
 * language across the settings modules.
 */
export const StatusBadge = memo(
  ({ status, size = 'small' }: { status: AssignmentStatus; size?: 'small' | 'medium' }) => {
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
  },
);
StatusBadge.displayName = 'StatusBadge';

export default StatusBadge;
