/**
 * Live “entity” summary tile — same scan pattern as Billing detail cards /
 * Appearance’s now strip. Shared so Date & Time and Tenant Modules cannot drift.
 */
import { Box, Stack, Typography } from '@mui/material';
import { GlassCard, IconBox } from '@app/modules/common/components/ui';
import type { Trio } from '@app/modules/common/components/ui/patterns';

export function SettingsNowTile({
  icon,
  trio,
  label,
  value,
  hint,
}: {
  icon: string;
  trio: Trio;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 1.75 }, height: '100%' }}>
      <Stack direction="row" alignItems="flex-start" spacing={1.25}>
        <IconBox icon={icon} trio={trio} size={38} fs="fs-3" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 11.5,
              fontWeight: 700,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: 16, sm: 18 },
              fontWeight: 700,
              lineHeight: 1.25,
              mt: 0.25,
              wordBreak: 'break-word',
            }}
          >
            {value}
          </Typography>
          {hint && (
            <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 0.25 }}>{hint}</Typography>
          )}
        </Box>
      </Stack>
    </GlassCard>
  );
}

export default SettingsNowTile;
