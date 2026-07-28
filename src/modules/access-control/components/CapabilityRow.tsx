import { memo } from 'react';
import { Box, Typography } from '@mui/material';
import { ScopeSelector } from './ScopeSelector';
import type { BusinessCapability, EditorCapability, Reach } from '../types';

interface CapabilityRowProps {
  moduleKey: string;
  moduleLabel: string;
  capability: EditorCapability;
  reachOptions: Reach[];
  disabled?: boolean;
  onChange: (moduleKey: string, action: BusinessCapability, reach: Reach) => void;
}

/**
 * One capability (View / Create / Edit / …) and how far it reaches.
 * Memoized — a module grid re-renders on every selection.
 */
export const CapabilityRow = memo(({
  moduleKey, moduleLabel, capability, reachOptions, disabled, onChange,
}: CapabilityRowProps) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      alignItems: { xs: 'flex-start', sm: 'center' },
      justifyContent: 'space-between',
      gap: 1.5,
      py: 1.25,
      borderBottom: '1px solid',
      borderColor: 'divider',
      '&:last-of-type': { borderBottom: 'none' },
    }}
  >
    <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 96 }}>
      {capability.label}
    </Typography>
    <ScopeSelector
      value={capability.reach}
      options={reachOptions}
      disabled={disabled}
      ariaLabel={`${moduleLabel} ${capability.label}`}
      onChange={(reach) => onChange(moduleKey, capability.action, reach)}
    />
  </Box>
), (prev, next) =>
  prev.capability.reach === next.capability.reach
  && prev.disabled === next.disabled
  && prev.reachOptions === next.reachOptions);
CapabilityRow.displayName = 'CapabilityRow';

export default CapabilityRow;
