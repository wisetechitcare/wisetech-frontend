import { memo } from 'react';
import { Chip, Tooltip } from '@mui/material';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import type { AssignmentScope } from '../types';
import { SCOPE_CAPTIONS, SCOPE_LABELS } from '../utils/labels';

const ICONS: Record<AssignmentScope, typeof PublicOutlinedIcon> = {
  platform: PublicOutlinedIcon,
  tenant: ApartmentOutlinedIcon,
  unit_subtree: AccountTreeOutlinedIcon,
  unit: PlaceOutlinedIcon,
};

/** Scope pill — icon + business label, with the plain-language reach in a tooltip. */
export const ScopeChip = memo(({ scope, size = 'small' }: { scope: AssignmentScope; size?: 'small' | 'medium' }) => {
  const Icon = ICONS[scope] ?? ApartmentOutlinedIcon;
  const label = SCOPE_LABELS[scope] ?? scope;
  return (
    <Tooltip title={SCOPE_CAPTIONS[scope] ?? ''} arrow>
      <Chip
        size={size}
        variant="outlined"
        icon={<Icon fontSize="small" aria-hidden="true" />}
        label={label}
        aria-label={`Scope: ${label}`}
        sx={{ borderRadius: 1.5, fontWeight: 600, '& .MuiChip-icon': { ml: 0.75 } }}
      />
    </Tooltip>
  );
});
ScopeChip.displayName = 'ScopeChip';

export default ScopeChip;
