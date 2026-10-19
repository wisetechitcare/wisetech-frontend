import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Responsive card grid — the standard list/collection layout.
 *
 * Lives in its own module so a node test can import a screen that uses it
 * without loading KTIcon → metronic helpers → layout, which reads localStorage
 * at import time.
 *
 * Default: `auto-fill` + capped track (`max`, ~400px) + `justifyContent: start` so a sparse
 * list does not stretch one card full-bleed. Pass `stretch` only when tiles must absorb leftover
 * width (`auto-fit` + `1fr`).
 */
export function AutoGrid({
  children, min = 300, max = 400, gap = 12, stretch = false, sx,
}: {
  children: ReactNode;
  min?: number;
  /** Max track width when not stretching (default 400). Ignored when `stretch`. */
  max?: number;
  gap?: number | string;
  /** Absorb leftover width (`auto-fit` + `1fr`). Opt-in only — cards default to capped width. */
  stretch?: boolean;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      sx={[{
        display: 'grid',
        gap: typeof gap === 'number' ? `${gap}px` : gap,
        gridTemplateColumns: stretch
          ? `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`
          : `repeat(auto-fill, minmax(min(${min}px, 100%), ${max}px))`,
        justifyContent: stretch ? undefined : 'start',
        alignItems: 'stretch',
      }, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}
    >
      {children}
    </Box>
  );
}

export default AutoGrid;
