import { memo } from 'react';
import { Box } from '@mui/material';
import { CapabilityRow } from './CapabilityRow';
import type { BusinessCapability, EditorModule, Reach } from '../types';

interface CapabilityGridProps {
  module: EditorModule;
  reachOptions: Reach[];
  disabled?: boolean;
  onChange: (moduleKey: string, action: BusinessCapability, reach: Reach) => void;
}

/** The expanded capability × reach grid for one module. */
export const CapabilityGrid = memo(({ module, reachOptions, disabled, onChange }: CapabilityGridProps) => (
  <Box
    role="group"
    aria-label={`${module.label} capabilities`}
    sx={{ px: 2.5, pb: 2, pt: 0.5, bgcolor: 'action.hover', borderTop: '1px solid', borderColor: 'divider' }}
  >
    {module.capabilities.map((capability) => (
      <CapabilityRow
        key={capability.action}
        moduleKey={module.key}
        moduleLabel={module.label}
        capability={capability}
        reachOptions={reachOptions}
        disabled={disabled}
        onChange={onChange}
      />
    ))}
  </Box>
));
CapabilityGrid.displayName = 'CapabilityGrid';

export default CapabilityGrid;
