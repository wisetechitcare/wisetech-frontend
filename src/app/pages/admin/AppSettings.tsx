/**
 * Settings — the hub.
 *
 * Everything that configures the app for the person using it lives here, one
 * area per tile. The tiles are rendered from `SETTINGS_AREAS` rather than
 * written out, because a hub is the shape that grows: adding an area should be
 * one entry in that list, not a new column of hand-placed cards that slowly
 * drift apart on padding and hit target.
 *
 * Hub and detail are one route, switched by `?area=`. A settings area is
 * therefore linkable — someone can send "the appearance settings" rather than
 * "Settings, then the second card" — and Back behaves the way the browser's own
 * Back does, because it IS the browser's Back.
 *
 * Detail view uses {@link EntityPageHeader} — the same title block Billing
 * entity pages open with — so Settings and Billing read as one product.
 */
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, Stack, Typography } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import {
  AutoGrid,
  EntityPageHeader,
  NavCard,
  WtButton,
  TRIO,
} from '@app/modules/common/components/ui';
import { countEnabledOptionalPacks, normalizePackFlags } from '@constants/entitlements';
import type { RootState } from '@redux/store';
import { SETTINGS_AREAS, findArea } from './settings/registry';

export function AppSettings() {
  const [params, setParams] = useSearchParams();
  const tier = useSelector((state: RootState) => state.authz.tier);
  const packs = useSelector((state: RootState) => state.authz.packs);
  const visibleAreas = useMemo(
    () =>
      SETTINGS_AREAS.filter((a) => {
        if (a.superAdminOnly) return tier === 'SUPER_ADMIN';
        if (a.adminTierOnly) return tier != null;
        return true;
      }),
    [tier],
  );
  const active = findArea(params.get('area'));
  const activeAllowed = active && visibleAreas.some((a) => a.id === active.id);

  const open = useCallback(
    (id: string) => {
      // A push, not a replace: opening an area is a step, so Back should undo it.
      const next = new URLSearchParams(params);
      next.set('area', id);
      setParams(next);
    },
    [params, setParams],
  );

  const close = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete('area');
    setParams(next);
  }, [params, setParams]);

  const backBtn = (
    <WtButton
      ghost
      size="small"
      onClick={close}
      startIcon={<KTIcon iconName="arrow-left" className="fs-6" />}
      sx={{ minHeight: 36, borderRadius: '10px', fontSize: 13 }}
    >
      All Settings
    </WtButton>
  );

  const detailActions = (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      {backBtn}
      {activeAllowed && active?.HeaderActions ? <active.HeaderActions /> : null}
    </Stack>
  );

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
      {active && activeAllowed ? (
        <Stack spacing={2}>
          <EntityPageHeader
            icon={active.icon}
            trio={active.tone}
            title={active.title}
            description={active.description}
            action={detailActions}
            mb={0}
          />
          <active.Panel />
        </Stack>
      ) : active && !activeAllowed ? (
        <Stack spacing={2}>
          <EntityPageHeader
            icon="setting-2"
            trio={TRIO.slate}
            title="Settings"
            description="Configure how the app works and looks for you."
            action={backBtn}
            mb={0}
          />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            That settings area is only available to platform operators (Super Admin).
          </Typography>
        </Stack>
      ) : (
        <Stack spacing={2}>
          <EntityPageHeader
            icon="setting-2"
            trio={TRIO.blue}
            title="Settings"
            description="Configure how the app works and looks for you."
            mb={0}
          />
          <AutoGrid min={320}>
            {visibleAreas.map((area) => {
              const meta =
                area.id === 'tenant-modules'
                  ? (() => {
                      const n = countEnabledOptionalPacks(normalizePackFlags(packs));
                      return n === 4 ? 'All optional modules on' : `${n} of 4 optional modules on`;
                    })()
                  : area.useMeta?.();
              return (
                <NavCard
                  key={area.id}
                  icon={area.icon}
                  tone={area.tone}
                  title={area.title}
                  description={area.description}
                  meta={meta}
                  disabled={area.comingSoon}
                  onClick={() => open(area.id)}
                />
              );
            })}
          </AutoGrid>
        </Stack>
      )}
    </Box>
  );
}

export default AppSettings;
