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
 */
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Stack } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { AutoGrid, ListHeader, NavCard, WtButton } from '@app/modules/common/components/ui';
import { SETTINGS_AREAS, findArea } from './settings/registry';

export function AppSettings() {
  const [params, setParams] = useSearchParams();
  const active = findArea(params.get('area'));

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

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
      {active ? (
        <Stack spacing={2}>
          <ListHeader
            title={active.title}
            subtitle={active.description}
            actions={
              <WtButton ghost onClick={close} startIcon={<KTIcon iconName="arrow-left" className="fs-4" />}>
                all settings
              </WtButton>
            }
          />
          <active.Panel />
        </Stack>
      ) : (
        <Stack spacing={2}>
          <ListHeader title="settings" subtitle="Configure how the app works and looks for you." />
          <AutoGrid min={320}>
            {SETTINGS_AREAS.map((area) => (
              <NavCard
                key={area.id}
                icon={area.icon}
                tone={area.tone}
                title={area.title}
                description={area.description}
                disabled={area.comingSoon}
                onClick={() => open(area.id)}
              />
            ))}
          </AutoGrid>
        </Stack>
      )}
    </Box>
  );
}

export default AppSettings;
