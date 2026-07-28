import { memo } from 'react';
import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import type { Reach } from '../types';

const REACH_LABEL: Record<Reach, string> = {
  none: 'None',
  own: 'Own',
  team: 'Team',
  department: 'Department',
  company: 'Company',
  global: 'Global',
};

const REACH_CAPTION: Record<Reach, string> = {
  none: 'No access.',
  own: 'Only their own records.',
  team: "Their team's records.",
  department: "Their department's records.",
  company: 'Every record in the company.',
  global: 'Everything, everywhere.',
};

interface ScopeSelectorProps {
  value: Reach;
  options: Reach[];
  onChange: (reach: Reach) => void;
  disabled?: boolean;
  ariaLabel: string;
}

/**
 * Segmented single-select for "how far does this capability reach?".
 * Business words only — the caller never sees a scope name.
 */
export const ScopeSelector = memo(({ value, options, onChange, disabled, ariaLabel }: ScopeSelectorProps) => (
  <ToggleButtonGroup
    exclusive
    size="small"
    value={value}
    disabled={disabled}
    aria-label={ariaLabel}
    onChange={(_, next: Reach | null) => { if (next) onChange(next); }}
    sx={{
      flexWrap: 'wrap',
      '& .MuiToggleButton-root': {
        textTransform: 'none',
        px: 1.5,
        py: 0.5,
        fontSize: 13,
        fontWeight: 600,
        borderRadius: '8px !important',
        border: '1px solid',
        borderColor: 'divider',
        mr: 0.5,
        '&.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } },
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 1 },
      },
    }}
  >
    {options.map((option) => (
      <Tooltip key={option} title={REACH_CAPTION[option]} placement="top" disableInteractive>
        <ToggleButton value={option} aria-label={`${ariaLabel}: ${REACH_LABEL[option]}`}>
          {REACH_LABEL[option]}
        </ToggleButton>
      </Tooltip>
    ))}
  </ToggleButtonGroup>
));
ScopeSelector.displayName = 'ScopeSelector';

export { REACH_LABEL };
export default ScopeSelector;
