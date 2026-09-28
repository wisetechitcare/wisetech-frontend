/**
 * InlineNotice / InlineHint — a line of explanation that sits INSIDE a form or panel.
 *
 * The kit had toasts (`toast`) and blocking dialogs (`alertDialog`) but nothing for
 * the most common case: a sentence beside the controls saying why something is
 * closed, what will happen, or what to fix first. So screens wrote their own —
 * the attendance calendar had a private `Notice` and `Hint`, and the legacy
 * correction modals used Bootstrap `.alert` divs with hard-coded hex
 * (`#FCEDDF` / `#DD700C`) that ignored dark mode entirely.
 *
 *   InlineNotice  a tinted, toned block. Something the reader must take in before
 *                 acting: a closed window, a blocking earlier day, a late mark.
 *   InlineHint    quiet guidance with an info glyph. Never an error, so it never
 *                 borrows the error colour.
 *
 * Tone comes from `TRIO`, dark mode from the app-wide `useIsDark`, so both follow
 * the theme without the caller handling either.
 */
import type { ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { TRIO, type Trio } from './tw/tokens';
import { useIsDark, toneSurface } from './tw/useIsDark';

export interface InlineNoticeProps {
  children: ReactNode;
  /** Defaults to amber — the colour of "stop and read this", not of failure. */
  trio?: Trio;
  /** KTIcon name shown before the text. Omit for none. */
  icon?: string;
  /**
   * `alert` interrupts a screen reader; `status` waits its turn. Use `alert` only for
   * something that blocks the action the reader is attempting.
   */
  role?: 'status' | 'alert';
}

export function InlineNotice({ children, trio = TRIO.amber, icon, role = 'status' }: InlineNoticeProps) {
  const dark = useIsDark();
  const tone = toneSurface(trio, dark);
  return (
    <Stack
      role={role}
      direction="row"
      spacing={1}
      alignItems="flex-start"
      sx={{
        px: 1.25,
        py: 1,
        borderRadius: 1.5,
        border: `1px solid ${tone.bd}`,
        bgcolor: tone.bg,
        color: tone.fg,
      }}
    >
      {icon && <KTIcon iconName={icon} className="fs-6" />}
      <Typography component="div" sx={{ m: 0, fontSize: 12, fontWeight: 600, lineHeight: 1.45, color: 'inherit' }}>
        {children}
      </Typography>
    </Stack>
  );
}

export function InlineHint({ children }: { children: ReactNode }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="flex-start">
      <KTIcon iconName="information-2" className="fs-7" />
      <Typography component="div" sx={{ fontSize: 11.5, lineHeight: 1.45, color: 'text.secondary' }}>
        {children}
      </Typography>
    </Stack>
  );
}
