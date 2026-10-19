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
 * Layout follows the Billing entity pattern: a “now” summary strip of glass
 * cards, then accent-topped {@link SettingsSection}s for each axis.
 */
import type { ChangeEvent } from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import {
  GlassCard,
  IconBox,
  SegmentedControl,
  SettingsSection,
  WtButton,
} from '@app/modules/common/components/ui';
import { TRIO } from '@app/modules/common/components/ui/tw/tokens';
import { sheetSx, accentWash, onAccent as contrastOn } from '@app/theme/surfaces';
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
import { SettingsNowTile } from './SettingsNowTile';

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

/** Header action for App Settings — sits next to “All Settings”, matching the entity toolbar. */
export function AppearanceHeaderActions() {
  const { reset } = useAppearance();
  return (
    <WtButton
      ghost
      size="small"
      onClick={reset}
      startIcon={<KTIcon iconName="arrows-circle" className="fs-5" />}
      sx={{ minHeight: 36, borderRadius: '10px', fontSize: 13 }}
    >
      Reset to Defaults
    </WtButton>
  );
}

export function AppearancePanel() {
  const theme = useTheme();
  const { mode, preference, setPreference, brand, setBrand, surface, setSurface } = useAppearance();

  const isDefaultBrand = BRAND_ROLES.every(
    ({ key }) => brand[key].toLowerCase() === DEFAULT_BRAND[key].toLowerCase(),
  );

  const themeLabel =
    preference === 'system' ? `System → ${mode}` : preference === 'light' ? 'Light' : 'Dark';

  return (
    <Stack spacing={2}>
      {/* ── Live “entity” summary — same scan pattern as Billing detail cards ─ */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
        }}
      >
        <SettingsNowTile
          icon="moon"
          trio={TRIO.purple}
          label="Theme"
          value={themeLabel}
          hint={preference === 'system' ? 'Follows your device' : `Pinned to ${preference}`}
        />
        <SettingsNowTile
          icon="color-swatch"
          trio={TRIO.blue}
          label="Brand"
          value={isDefaultBrand ? 'WiseTech Navy' : 'Custom'}
          hint={brand.primary.toUpperCase()}
        />
        <SettingsNowTile
          icon="element-11"
          trio={TRIO.cyan}
          label="Surface"
          value={surface === 'glass' ? 'Glass' : 'Material'}
          hint={surface === 'glass' ? 'Frost + blur' : 'Opaque elevation'}
        />
      </Box>

      {/* Live brand strip — contrast-safe preview of primary on current sheet */}
      <GlassCard
        preset="section"
        sx={{
          p: 2,
          ...sheetSx(theme),
          borderTop: `3.5px solid ${brand.primary}`,
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Live preview
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 15, mt: 0.25, color: brand.ink }}>
              Your product, in this browser
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>
              Buttons and focus rings follow Primary. Toggle Light / Dark above to verify both modes.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Box
              sx={{
                px: 1.75,
                height: 36,
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 13,
                fontWeight: 700,
                bgcolor: brand.primary,
                color: contrastOn(theme, brand.primary),
                boxShadow: `0 0 0 3px ${accentWash(theme, brand.primary)}`,
              }}
            >
              Primary action
            </Box>
            <Box
              sx={{
                px: 1.75,
                height: 36,
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 13,
                fontWeight: 600,
                border: `1px solid ${brand.secondary}`,
                color: brand.secondary,
                bgcolor: 'transparent',
              }}
            >
              Secondary
            </Box>
            <Stack direction="row" sx={{ borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
              {(['primary', 'secondary', 'accent', 'ink'] as const).map((role) => (
                <Box key={role} sx={{ width: 22, height: 36, bgcolor: brand[role] }} title={role} />
              ))}
            </Stack>
          </Stack>
        </Stack>
      </GlassCard>

      {/* Theme + Surface side-by-side on wide screens (entity two-column feel) */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
          alignItems: 'start',
        }}
      >
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
      </Box>

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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    px: 1.25,
                    py: 0.75,
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <Box sx={{ display: 'flex' }}>
                    {(['primary', 'secondary', 'accent', 'ink'] as const).map((role) => (
                      <Box
                        key={role}
                        sx={{
                          width: 12,
                          height: 18,
                          bgcolor: p.brand[role],
                          '&:first-of-type': { borderRadius: '3px 0 0 3px' },
                          '&:last-of-type': { borderRadius: '0 3px 3px 0' },
                        }}
                      />
                    ))}
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {p.label}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          <Stack spacing={1.25}>
            {BRAND_ROLES.map(({ key, label, hint }) => (
              <Stack
                key={key}
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{
                  p: 1.25,
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: (t) => (t.palette.mode === 'dark' ? 'action.hover' : 'background.default'),
                }}
              >
                <Box
                  sx={{
                    width: 46,
                    height: 34,
                    borderRadius: 1.5,
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: brand[key],
                    color: readableOn(brand[key]),
                    border: '1px solid',
                    borderColor: 'divider',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Aa
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {hint}
                  </Typography>
                </Box>
                <Box
                  component="input"
                  type="color"
                  aria-label={`${label} colour`}
                  value={brand[key]}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setBrand({ ...brand, [key]: e.target.value })
                  }
                  sx={{
                    width: 44,
                    height: 34,
                    p: 0.5,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    bgcolor: 'background.paper',
                  }}
                />
                <Box
                  component="input"
                  type="text"
                  aria-label={`${label} hex`}
                  value={brand[key]}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const v = e.target.value;
                      if (isHex6(v)) setBrand({ ...brand, [key]: v });
                  }}
                  sx={{
                    width: 96,
                    height: 34,
                    px: 1,
                    borderRadius: 1.5,
                    fontSize: 13,
                    fontFamily: 'ui-monospace, monospace',
                    textTransform: 'uppercase',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    color: 'text.primary',
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

      <GlassCard preset="section">
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <IconBox icon="information-2" trio={TRIO.amber} size={34} fs="fs-4" />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Screens still being migrated
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
              These settings reach every screen built on the shared design kit (MUI theme, glass
              surfaces, pickers). Older screens with hardcoded colours will not follow theme, brand
              or surface style until they are migrated.
            </Typography>
          </Box>
        </Stack>
      </GlassCard>
    </Stack>
  );
}

export default AppearancePanel;
