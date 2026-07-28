import { memo, useState } from 'react';
import { Box, Button, ButtonGroup, Card, Chip, Collapse, IconButton, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { CapabilityGrid } from './CapabilityGrid';
import { REACH_LABEL } from './ScopeSelector';
import type { BusinessCapability, EditorModule, Reach, SimpleLevel } from '../types';

const LEVEL_LABEL: Record<SimpleLevel, string> = {
  none: 'No access',
  view: 'View',
  manage: 'Manage',
  custom: 'Custom',
};

const LEVEL_COLOR: Record<SimpleLevel, 'default' | 'info' | 'success' | 'warning'> = {
  none: 'default',
  view: 'info',
  manage: 'success',
  custom: 'warning',
};

/** A short business phrase describing current access, e.g. "Manage · Company". */
const accessPhrase = (module: EditorModule): string => {
  if (module.level === 'none') return 'No access';
  const widest = module.capabilities.find((c) => c.reach !== 'none')?.reach ?? 'none';
  return `${LEVEL_LABEL[module.level]} · ${REACH_LABEL[widest as Reach]}`;
};

interface ModuleCardProps {
  module: EditorModule;
  reachOptions: Reach[];
  dirty: boolean;
  disabled?: boolean;
  onCapabilityChange: (moduleKey: string, action: BusinessCapability, reach: Reach) => void;
  onLevelChange: (moduleKey: string, level: Exclude<SimpleLevel, 'custom'>) => void;
}

/**
 * A business module card: shows current access at a glance, offers the three
 * Simple-Mode shortcuts, and expands to the full capability grid.
 * Memoized — the editor renders ~17 of these.
 */
export const ModuleCard = memo(({
  module, reachOptions, dirty, disabled, onCapabilityChange, onLevelChange,
}: ModuleCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const panelId = `module-panel-${module.key}`;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        borderColor: dirty ? 'warning.main' : 'divider',
        transition: 'border-color .18s ease',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>{module.label}</Typography>
            {dirty && (
              <Chip
                size="small"
                color="warning"
                variant="outlined"
                icon={<FiberManualRecordIcon sx={{ fontSize: 10 }} />}
                label="Unsaved"
                sx={{ height: 22, fontWeight: 600 }}
              />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">{module.category}</Typography>
        </Box>

        <Chip
          size="small"
          color={LEVEL_COLOR[module.level]}
          variant={module.level === 'none' ? 'outlined' : 'filled'}
          label={accessPhrase(module)}
          sx={{ fontWeight: 600, borderRadius: 1.5 }}
        />

        {/* Simple-Mode shortcuts */}
        <ButtonGroup size="small" disabled={disabled} aria-label={`${module.label} access level`}>
          {(['none', 'view', 'manage'] as const).map((level) => (
            <Button
              key={level}
              onClick={() => onLevelChange(module.key, level)}
              variant={module.level === level ? 'contained' : 'outlined'}
              aria-pressed={module.level === level}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {LEVEL_LABEL[level]}
            </Button>
          ))}
        </ButtonGroup>

        <IconButton
          size="small"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${module.label} details`}
          sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
        >
          <ExpandMoreIcon />
        </IconButton>
      </Box>

      <Collapse in={expanded} unmountOnExit id={panelId}>
        <CapabilityGrid
          module={module}
          reachOptions={reachOptions}
          disabled={disabled}
          onChange={onCapabilityChange}
        />
      </Collapse>
    </Card>
  );
}, (prev, next) =>
  prev.module === next.module
  && prev.dirty === next.dirty
  && prev.disabled === next.disabled
  && prev.reachOptions === next.reachOptions);
ModuleCard.displayName = 'ModuleCard';

export default ModuleCard;
