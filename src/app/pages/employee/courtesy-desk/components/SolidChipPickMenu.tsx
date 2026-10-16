import { useState, type SyntheticEvent } from 'react';
import { Box, Menu, MenuItem, Typography } from '@mui/material';
import { SolidChip } from '@app/pages/billing/operations/TrackerCells';
import type { ConfigOption } from '../types';

export default function SolidChipPickMenu({
  valueId,
  options,
  heading,
  onPick,
  disabled = false,
}: {
  valueId: string;
  options: ConfigOption[];
  heading: string;
  onPick: (id: string) => void;
  disabled?: boolean;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const current = options.find((o) => o.id === valueId);
  const stop = (e: SyntheticEvent) => e.stopPropagation();

  return (
    <>
      <Box
        onClick={(e) => {
          stop(e);
          if (disabled) return;
          setAnchor(e.currentTarget);
        }}
        sx={{
          cursor: disabled ? 'default' : 'pointer',
          width: 'fit-content',
          lineHeight: 0,
        }}
      >
        <SolidChip
          label={current?.name || valueId}
          color={current?.color}
          dropdown={!disabled}
        />
      </Box>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        onClick={stop}
        slotProps={{
          paper: {
            sx: { minWidth: 210, maxHeight: 380, borderRadius: '12px' },
          },
        }}
      >
        <Typography
          sx={{
            px: 1.75,
            py: 0.75,
            fontSize: 11,
            fontWeight: 700,
            color: 'text.secondary',
          }}
        >
          {heading}
        </Typography>
        {options.map((s) => (
          <MenuItem
            key={s.id}
            onClick={() => {
              setAnchor(null);
              onPick(s.id);
            }}
            selected={s.id === valueId}
            sx={{ py: 0.75 }}
          >
            <SolidChip label={s.name} color={s.color} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
