/**
 * App Settings — the appearance choices that belong to a PERSON, plus a door to
 * the ones that belong to the company.
 *
 * The distinction is the whole organising idea here, and it is why this screen
 * is short. Theme mode is yours: it lives in your browser and changes nothing
 * for anyone else. The status palette is the company's: an admin sets it once
 * and every employee sees it. Mixing the two on one screen without saying so is
 * how people end up surprised that "their" colour changed for the whole office.
 *
 * What this screen deliberately does NOT offer is a choice of visual style.
 * Screens differ today because the migration onto the shared kit is unfinished,
 * not because there are two languages worth choosing between — and a switch
 * would only reach the screens already on tokens, repainting the compliant half
 * and skipping the rest.
 */
import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import {
  GlassCard,
  ListHeader,
  SegmentedControl,
  SettingsSection,
  WtButton,
} from '@app/modules/common/components/ui';
import { TRIO } from '@app/modules/common/components/ui/tw/tokens';
import { useColorMode, type ColorPreference } from '@app/theme/ColorMode';
import { AppearanceModal } from '@pages/employee/attendance/AttendanceConfig/component/AppearanceModal';

const MODE_OPTIONS = [
  { value: 'light' as const, label: 'Light' },
  { value: 'dark' as const, label: 'Dark' },
  { value: 'system' as const, label: 'System' },
];

export function AppSettings() {
  const { mode, preference, setPreference } = useColorMode();
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
      <ListHeader
        title="app settings"
        subtitle="How the app looks for you, and where to change what it looks like for everyone."
      />

      <Stack spacing={2} sx={{ mt: 2 }}>
        <SettingsSection
          tone={TRIO.purple}
          icon="moon"
          title="theme"
          description="Applies to this browser only. Nobody else is affected."
          action={
            <SegmentedControl<ColorPreference>
              options={MODE_OPTIONS}
              value={preference}
              onChange={setPreference}
              ariaLabel="Theme mode"
            />
          }
        >
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {preference === 'system'
              ? `Following your device, which is currently ${mode}. It will change with your system settings.`
              : `Pinned to ${preference}, whatever your device is set to.`}
          </Typography>
        </SettingsSection>

        <SettingsSection
          tone={TRIO.blue}
          icon="colors-square"
          title="status colors"
          description="Company-wide. Changing these updates the calendar, charts and boards for every employee."
          action={
            <WtButton
              tone="primary"
              onClick={() => setAppearanceOpen(true)}
              startIcon={<KTIcon iconName="setting-2" className="fs-4" />}
            >
              open appearance
            </WtButton>
          }
        >
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Attendance day statuses and marks, leave types, working patterns and work locations.
            Each entry carries its own name and colour, and the attendance calendar is generated
            from that same list — so a colour set here cannot disagree with the grid.
          </Typography>
        </SettingsSection>

        {/*
          Density is the obvious third setting and is deliberately absent. It
          only means something once the shared kit reads a spacing token, and
          shipping the control first would put a switch on this page that
          changes nothing — the exact dead control this screen exists to replace.
        */}
        <GlassCard preset="section">
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <KTIcon iconName="information-2" className="fs-2 text-muted" />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Dark mode is still rolling out
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                Screens built on the shared design kit are fully dark-capable. Older screens still
                carry hardcoded colours and will look light until they are migrated, so expect a few
                bright patches for now.
              </Typography>
            </Box>
          </Stack>
        </GlassCard>
      </Stack>

      <AppearanceModal open={appearanceOpen} onClose={() => setAppearanceOpen(false)} />
    </Box>
  );
}

export default AppSettings;
