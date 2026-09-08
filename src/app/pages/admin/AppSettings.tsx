/**
 * App-wide Appearance — the three axes that decide how the PRODUCT looks.
 *
 * Deliberately separate from the status-colour engine reached through
 * "Open Appearance". The two answer different questions and must not share a
 * screen or a store:
 *
 *   here            →  how the product looks  (mode, brand, surface)
 *   status colours  →  what a datum means     (present is green, absent is red)
 *
 * Keeping them apart is what stops a brand refresh from repainting "absent".
 *
 * The three are orthogonal, so every combination is valid and each can be
 * reasoned about on its own — twelve named themes would be the same thing with
 * eleven more names to maintain.
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
import { useAppearance } from '@app/theme/ColorMode';
import {
  BRAND_PRESETS,
  DEFAULT_BRAND,
  isHex6,
  readableOn,
  type BrandPalette,
  type ColorPreference,
  type SurfaceStyle,
} from '@app/theme/appearance';
import { AppearanceModal } from '@pages/employee/attendance/AttendanceConfig/component/AppearanceModal';

const MODE_OPTIONS = [
  { value: 'light' as const, label: 'Light' },
  { value: 'dark' as const, label: 'Dark' },
  { value: 'system' as const, label: 'System' },
];

const SURFACE_OPTIONS = [
  { value: 'glass' as const, label: 'Glass' },
  { value: 'material' as const, label: 'Material' },
];

/** The four roles, named for what they DO rather than for where they sit in the logo. */
const BRAND_ROLES: ReadonlyArray<{ key: keyof BrandPalette; label: string; hint: string }> = [
  { key: 'primary', label: 'Primary', hint: 'Buttons, active navigation, focus rings' },
  { key: 'secondary', label: 'Secondary', hint: 'Supporting actions and accents' },
  { key: 'accent', label: 'Accent', hint: 'Highlights that must catch the eye' },
  { key: 'ink', label: 'Ink', hint: 'Headings and high-emphasis text' },
];

export function AppSettings() {
  const { mode, preference, setPreference, brand, setBrand, surface, setSurface, reset } = useAppearance();
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  const isDefaultBrand = BRAND_ROLES.every(({ key }) => brand[key].toLowerCase() === DEFAULT_BRAND[key].toLowerCase());

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
      <ListHeader
        title="appearance"
        subtitle="How the app looks. These are yours — they live in this browser and change nothing for anyone else."
        actions={
          <WtButton ghost onClick={reset} startIcon={<KTIcon iconName="arrows-circle" className="fs-4" />}>
            reset to defaults
          </WtButton>
        }
      />

      <Stack spacing={2} sx={{ mt: 2 }}>
        {/* ── 1. Theme ──────────────────────────────────────────────────── */}
        <SettingsSection
          tone={TRIO.purple}
          icon="moon"
          title="theme"
          description="Light, dark, or follow your device."
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
              ? `Following your device, which is currently ${mode}. It will change when your system does.`
              : `Pinned to ${preference}, whatever your device is set to.`}
          </Typography>
        </SettingsSection>

        {/* ── 2. Brand colours ──────────────────────────────────────────── */}
        <SettingsSection
          tone={TRIO.blue}
          icon="color-swatch"
          title="brand colours"
          description="Four roles, taken from the logo. Buttons, navigation and accents follow them."
        >
          <Stack spacing={2}>
            <Box>
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'text.secondary' }}
              >
                Start from
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.75, flexWrap: 'wrap', gap: 1 }}>
                {BRAND_PRESETS.map((p) => (
                  <Box
                    key={p.id}
                    component="button"
                    type="button"
                    onClick={() => setBrand(p.brand)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
                      border: '1px solid', borderColor: 'divider', borderRadius: 2,
                      bgcolor: 'background.paper', px: 1.25, py: 0.75,
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                  >
                    <Box sx={{ display: 'flex' }}>
                      {(['primary', 'secondary', 'accent', 'ink'] as const).map((role) => (
                        <Box
                          key={role}
                          sx={{ width: 12, height: 18, bgcolor: p.brand[role], '&:first-of-type': { borderRadius: '3px 0 0 3px' }, '&:last-of-type': { borderRadius: '0 3px 3px 0' } }}
                        />
                      ))}
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{p.label}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>

            {/* Each role gets a native colour input plus a hex field. The swatch
                shows the text colour the app will actually put on it, derived by
                luminance — so a pale pick reveals itself here rather than as
                unreadable white-on-pale somewhere else. */}
            <Stack spacing={1.25}>
              {BRAND_ROLES.map(({ key, label, hint }) => (
                <Stack key={key} direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      width: 46, height: 34, borderRadius: 1.5, flexShrink: 0,
                      display: 'grid', placeItems: 'center',
                      bgcolor: brand[key], color: readableOn(brand[key]),
                      border: '1px solid', borderColor: 'divider',
                      fontSize: 11, fontWeight: 700,
                    }}
                  >
                    Aa
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{label}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{hint}</Typography>
                  </Box>
                  <Box
                    component="input"
                    type="color"
                    aria-label={`${label} colour`}
                    value={brand[key]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBrand({ ...brand, [key]: e.target.value })}
                    sx={{ width: 44, height: 34, p: 0.5, cursor: 'pointer', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.paper' }}
                  />
                  <Box
                    component="input"
                    type="text"
                    aria-label={`${label} hex`}
                    value={brand[key]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const v = e.target.value;
                      // Typed hex only applies once it is complete — otherwise the
                      // whole app repaints on every keystroke of a half-written value.
                      if (isHex6(v)) setBrand({ ...brand, [key]: v });
                    }}
                    sx={{
                      width: 96, height: 34, px: 1, borderRadius: 1.5, fontSize: 13,
                      fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase',
                      border: '1px solid', borderColor: 'divider',
                      bgcolor: 'background.paper', color: 'text.primary',
                      '&:focus': { outline: 'none', borderColor: 'primary.main' },
                    }}
                  />
                </Stack>
              ))}
            </Stack>

            {!isDefaultBrand && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Customised. Hover, pressed and tinted variants are derived from these four, so there
                is nothing else to match by hand.
              </Typography>
            )}
          </Stack>
        </SettingsSection>

        {/* ── 3. Interface style ────────────────────────────────────────── */}
        <SettingsSection
          tone={TRIO.cyan}
          icon="element-11"
          title="interface style"
          description="Frosted translucent surfaces, or opaque ones with flat elevation."
          action={
            <SegmentedControl<SurfaceStyle>
              options={SURFACE_OPTIONS}
              value={surface}
              onChange={setSurface}
              ariaLabel="Interface style"
            />
          }
        >
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {surface === 'glass'
              ? 'Glass: surfaces are translucent and blur what is behind them, the way macOS and iOS panels do.'
              : 'Material: surfaces are opaque and separated by elevation instead of blur — steadier on low-powered devices and easier to read over busy backgrounds.'}
          </Typography>
        </SettingsSection>

        {/* ── The other engine, clearly labelled as such ─────────────────── */}
        <SettingsSection
          tone={TRIO.amber}
          icon="colors-square"
          title="status colours"
          description="A separate engine, and company-wide: these change what every employee sees."
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
            Attendance day statuses and marks, leave types, working patterns and work locations —
            what a colour <em>means</em>, rather than how the product looks. Kept apart from the
            settings above so a brand change can never repaint “absent”.
          </Typography>
        </SettingsSection>

        <GlassCard preset="section">
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <KTIcon iconName="information-2" className="fs-2 text-muted" />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Screens still being migrated
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                These settings reach every screen built on the shared design kit. Older screens carry
                their own hardcoded colours and will not follow the theme, the brand or the surface
                style until they are migrated, so expect a few that stay light and navy for now.
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
