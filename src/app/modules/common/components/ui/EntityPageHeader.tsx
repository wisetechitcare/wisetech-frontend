import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { IconBox, TRIO, type Trio } from './patterns';
import { toTitleCase, HEADING_CASE_SX } from './text';

/**
 * Entity / detail page title block — the shape Billing detail pages open with.
 *
 * Icon tile + title + one-line description + optional right action. Extracted so
 * Settings, Billing and any future hub/detail screen cannot drift on spacing
 * or type scale. Prefer this over a one-off `ListHeader` when the screen is an
 * “entity” the user opened from a hub tile.
 */
export interface EntityPageHeaderProps {
  title: string;
  description?: string;
  /** KTIcon name. */
  icon: string;
  trio?: Trio;
  action?: ReactNode;
  /** Extra bottom margin when the next block is not a card stack. Default 2. */
  mb?: number;
}

export function EntityPageHeader({
  title,
  description,
  icon,
  trio = TRIO.blue,
  action,
  mb = 2,
}: EntityPageHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      spacing={1.25}
      sx={{ mb }}
    >
      <IconBox icon={icon} trio={trio} size={40} fs="fs-3" />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: { xs: 16, sm: 17.5 },
            lineHeight: 1.3,
            color: 'text.primary',
            ...HEADING_CASE_SX,
          }}
        >
          {toTitleCase(title)}
        </Typography>
        {description && (
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>
            {description}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Stack>
  );
}

export default EntityPageHeader;
