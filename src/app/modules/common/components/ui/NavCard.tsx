import { Box, Stack, Typography } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import type { Trio } from './patterns';
import { IconBox } from './patterns';
import { glassSx } from './glass';
import { toTitleCase } from './text';

/**
 * One entry on a hub screen — icon, name, one line of what it is, and a chevron.
 *
 * Hub pages are a recurring shape (Settings, and anywhere else a section opens
 * into sub-sections), and hand-rolling the tile each time is how two hubs end
 * up with different padding, different icon sizes and different hit targets.
 * This is that tile, once.
 *
 * It is a real `<button>`, not a clickable div: it has to be reachable by Tab,
 * activate on Enter and Space, and be announced as a control. A div with an
 * onClick is none of those things.
 *
 * `meta` carries a short live value — the current theme, a count, a status —
 * so the hub can answer the obvious question without being opened.
 */
export interface NavCardProps {
  icon: string;
  tone: Trio;
  title: string;
  description?: string;
  /** Short current value, shown beneath the description. */
  meta?: React.ReactNode;
  onClick: () => void;
  /** Dim and disable an area that exists but is not available yet. */
  disabled?: boolean;
}

export function NavCard({ icon, tone, title, description, meta, onClick, disabled }: NavCardProps) {
  return (
    <Box
      component="button"
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={toTitleCase(title)}
      sx={{
        ...(glassSx('thin') as object),
        p: 2,
        width: '100%',
        textAlign: 'left',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'transform .15s, box-shadow .15s, border-color .15s',
        '&:hover': disabled ? undefined : { borderColor: 'primary.main', transform: 'translateY(-1px)' },
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ width: '100%' }}>
        <IconBox icon={icon} trio={tone} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {toTitleCase(title)}
          </Typography>
          {description && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
              {description}
            </Typography>
          )}
          {meta && (
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 0.75, color: 'text.secondary', fontWeight: 600 }}
            >
              {meta}
            </Typography>
          )}
        </Box>
        {!disabled && (
          <Box sx={{ color: 'text.secondary', mt: 0.5 }} aria-hidden>
            <KTIcon iconName="arrow-right" className="fs-4" />
          </Box>
        )}
      </Stack>
    </Box>
  );
}

export default NavCard;
