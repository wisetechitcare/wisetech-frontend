import type { ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';

export interface TableSelectionBarProps {
  /** How many rows are currently selected. */
  count: number;
  /**
   * Bulk CTAs — prefer kit `WtButton` / `ActionIconButton`.
   * Rendered only while `count > 0` (MaterialTable already gates `renderSelectionActions`).
   */
  children: ReactNode;
  /** Override the "{n} selected" label. */
  label?: string;
}

/**
 * Toolbar strip for MaterialTable `renderSelectionActions`.
 *
 * One place for "N selected" + bulk CTAs so Approvals / Archive / Recruitment (and
 * every later bulk surface) do not reinvent a muted count + button row.
 *
 * Usage:
 * ```tsx
 * <MaterialTable
 *   enableRowSelection
 *   renderSelectionActions={(selected) => (
 *     <TableSelectionBar count={selected.length}>
 *       <WtButton size="small" onClick={() => bulk(selected)}>Archive selected</WtButton>
 *     </TableSelectionBar>
 *   )}
 * />
 * ```
 */
export function TableSelectionBar({ count, children, label }: TableSelectionBarProps) {
  if (count < 1) return null;
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      flexWrap="wrap"
      useFlexGap
      sx={{ mr: 1 }}
    >
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>
        {label ?? `${count} selected`}
      </Typography>
      {children}
    </Stack>
  );
}

export default TableSelectionBar;
