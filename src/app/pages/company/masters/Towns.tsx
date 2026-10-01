import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, CircularProgress, InputBase, Stack, Typography, alpha, keyframes } from '@mui/material';
import { AppIcon, AutoGrid, WtButton, WtTooltip, toast } from '@app/modules/common/components/ui';
import { createNewTowns, fetchAllTowns, updateTownById } from '@services/options';
import { canSection } from '@utils/can';
import { ConfigPageLayout, ConfigSectionCard } from '@app/modules/configuration';

interface ITown {
  id: string;
  name: string;
}

const TONE = '#0D9488';
const REDUCED = '@media (prefers-reduced-motion: reduce)';
const rise = keyframes`from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; }`;
const flash = keyframes`0% { box-shadow: 0 0 0 0 ${alpha(TONE, 0.45)}; background-color: ${alpha(TONE, 0.14)}; } 100% { box-shadow: 0 0 0 10px transparent; }`;

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Towns — the list a branch's required Town field picks from.
 *
 * A town is one name, so it is a tile, not a table row: the table left a full-width Actions
 * column beside a one-word name. One field does both jobs — type to filter, and when nothing
 * matches exactly, Enter (or the Add button) creates it. Renaming happens in place.
 */
function Towns() {
  const canWrite = canSection('settings', 'write');
  const [towns, setTowns] = useState<ITown[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  // The tile just added or renamed pulses once, so the eye finds where it landed.
  const [justChanged, setJustChanged] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Enter saves AND unmounts the input, whose blur would save again — one rename at a time.
  const renaming = useRef(false);

  const load = async () => {
    try {
      const res = await fetchAllTowns();
      setTowns(res?.data?.towns || []);
    } catch (e) {
      console.error('Error fetching towns:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sorted = useMemo(() => [...towns].sort((a, b) => a.name.localeCompare(b.name)), [towns]);
  const visible = useMemo(() => (query.trim() ? sorted.filter((t) => norm(t.name).includes(norm(query))) : sorted), [sorted, query]);
  const exact = towns.find((t) => norm(t.name) === norm(query));
  const canAdd = canWrite && !!query.trim() && !exact;

  const pulse = (key: string) => {
    setJustChanged(key);
    window.setTimeout(() => setJustChanged((k) => (k === key ? null : k)), 1200);
  };

  const handleAdd = async () => {
    const name = query.trim().replace(/\s+/g, ' ');
    if (!canAdd || saving) return;
    setSaving(true);
    try {
      await createNewTowns({ companyId: '', towns: [name] });
      setQuery('');
      await load();
      pulse(norm(name));
      toast({ icon: 'success', title: `Added ${name}` });
    } catch (e) {
      console.error('Error creating town:', e);
      toast({ icon: 'error', title: `Couldn't add ${name}. Try again.` });
    } finally {
      setSaving(false);
      inputRef.current?.focus();
    }
  };

  const handleRename = async () => {
    if (!editing || renaming.current) return;
    const name = editing.name.trim().replace(/\s+/g, ' ');
    const current = towns.find((t) => t.id === editing.id);
    if (!name || !current || name === current.name) return setEditing(null);
    if (towns.some((t) => t.id !== editing.id && norm(t.name) === norm(name))) {
      toast({ icon: 'warning', title: `${name} is already in the list` });
      return;
    }
    renaming.current = true;
    setSaving(true);
    try {
      await updateTownById(editing.id, { name });
      setTowns((list) => list.map((t) => (t.id === editing.id ? { ...t, name } : t)));
      pulse(norm(name));
      setEditing(null);
    } catch (e) {
      console.error('Error renaming town:', e);
      toast({ icon: 'error', title: `Couldn't rename ${current.name}. Try again.` });
    } finally {
      renaming.current = false;
      setSaving(false);
    }
  };

  return (
    <ConfigPageLayout>
      <ConfigSectionCard
        title="Towns"
        description="Branches pick their town from this list."
        icon="bi-pin-map"
        iconColor="teal"
        badge={{ label: `${towns.length}`, color: TONE, bg: alpha(TONE, 0.1) }}
        loading={loading}
      >
        {/* The add panel — the one place a town is created, set apart so it reads as an
            action, not a filter. Typing also narrows the tiles below to towns that already
            match, which is what stops the same town being added twice. */}
        <Box
          component="form"
          onSubmit={(e: React.FormEvent) => { e.preventDefault(); handleAdd(); }}
          sx={{
            mt: 1, mb: 2.5, p: { xs: 1.75, md: 2 }, borderRadius: '14px',
            border: 1, borderColor: alpha(TONE, 0.3), bgcolor: alpha(TONE, 0.05),
            boxShadow: `inset 4px 0 0 ${TONE}`,
          }}
        >
          <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.25 }}>
            <Box sx={{ width: 26, height: 26, borderRadius: '8px', display: 'grid', placeItems: 'center', color: '#fff', bgcolor: TONE }}>
              <AppIcon name={canWrite ? 'plus' : 'bi-search'} className="fs-6" />
            </Box>
            <Typography component="label" htmlFor="town-name" sx={{ fontSize: 14, fontWeight: 700 }}>
              {canWrite ? 'Add a new town' : 'Find a town'}
            </Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} alignItems={{ sm: 'center' }}>
            <Stack
              direction="row"
              alignItems="center"
              gap={1}
              sx={{
                flex: 1, maxWidth: { sm: 480 }, px: 1.5, height: 44, borderRadius: '11px', border: 1, borderColor: 'divider',
                bgcolor: 'background.paper', transition: 'border-color .15s ease, box-shadow .15s ease',
                '&:focus-within': { borderColor: TONE, boxShadow: `0 0 0 3px ${alpha(TONE, 0.18)}` },
              }}
            >
              <InputBase
                id="town-name"
                inputRef={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') setQuery(''); }}
                placeholder={canWrite ? 'Town name, e.g. Andheri' : 'Town name'}
                inputProps={{ maxLength: 80 }}
                sx={{ flex: 1, fontSize: 14 }}
              />
              {saving && <CircularProgress size={16} sx={{ color: TONE }} />}
            </Stack>
            {canWrite && (
              <WtButton
                type="submit"
                disabled={!canAdd || saving}
                startIcon={<AppIcon name="plus" className="fs-5" />}
                sx={{ whiteSpace: 'nowrap', alignSelf: { xs: 'flex-start', sm: 'auto' } }}
              >
                Add town
              </WtButton>
            )}
          </Stack>
          <Typography sx={{ mt: 1, fontSize: 12.5, color: exact && query.trim() ? 'warning.main' : 'text.secondary', fontWeight: exact && query.trim() ? 600 : 400 }}>
            {exact && query.trim()
              ? `${exact.name} is already in the list — no need to add it again.`
              : canWrite
                ? 'Type the name and press Enter or Add town. Towns you already have that match are shown below.'
                : 'Type to narrow the list below.'}
          </Typography>
        </Box>

        {!loading && !towns.length ? (
          <Stack alignItems="center" gap={1} sx={{ py: 6, textAlign: 'center' }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '14px', display: 'grid', placeItems: 'center', color: TONE, bgcolor: alpha(TONE, 0.1) }}>
              <AppIcon name="bi-pin-map" className="fs-2" />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 15 }}>No towns yet</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              {canWrite ? 'Add the first one in the box above.' : 'An admin can add towns here.'}
            </Typography>
          </Stack>
        ) : !visible.length ? (
          <Typography sx={{ py: 4, textAlign: 'center', fontSize: 13, color: 'text.secondary' }}>
            No town called “{query.trim()}” yet.{canWrite ? ' Click Add town to create it.' : ''}
          </Typography>
        ) : (
          <AutoGrid min={210} gap={10}>
            {visible.map((t, i) => {
              const isEditing = editing?.id === t.id;
              return (
                <Stack
                  key={t.id}
                  direction="row"
                  alignItems="center"
                  gap={1.25}
                  sx={{
                    position: 'relative', minHeight: 54, px: 1.5, borderRadius: '12px', border: 1,
                    borderColor: isEditing ? TONE : 'divider', bgcolor: 'background.paper',
                    transition: 'border-color .15s ease, box-shadow .15s ease, transform .15s ease',
                    animation: justChanged === norm(t.name)
                      ? `${flash} 1.1s ease-out`
                      : `${rise} 320ms cubic-bezier(.22,1,.36,1) both`,
                    animationDelay: justChanged === norm(t.name) ? '0ms' : `${Math.min(i, 16) * 25}ms`,
                    '&:hover': { borderColor: alpha(TONE, 0.45), boxShadow: `0 4px 14px ${alpha(TONE, 0.12)}` },
                    '&:hover .town-edit, &:focus-within .town-edit': { opacity: 1 },
                    [REDUCED]: { animation: 'none', transition: 'none' },
                  }}
                >
                  <Box sx={{ width: 30, height: 30, borderRadius: '9px', flexShrink: 0, display: 'grid', placeItems: 'center', color: TONE, bgcolor: alpha(TONE, 0.1) }}>
                    <AppIcon name="bi-geo-alt" className="fs-6" />
                  </Box>
                  {isEditing ? (
                    <InputBase
                      autoFocus
                      value={editing.name}
                      onChange={(e) => setEditing({ id: t.id, name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleRename(); }
                        if (e.key === 'Escape') setEditing(null);
                      }}
                      onBlur={handleRename}
                      inputProps={{ 'aria-label': `Rename ${t.name}`, maxLength: 80 }}
                      sx={{ flex: 1, fontSize: 14, fontWeight: 600 }}
                    />
                  ) : (
                    <Typography noWrap sx={{ flex: 1, fontSize: 14, fontWeight: 600 }} title={t.name}>{t.name}</Typography>
                  )}
                  {canWrite && !isEditing && (
                    <WtTooltip title="Rename">
                      <Box
                        component="button"
                        type="button"
                        className="town-edit"
                        aria-label={`Rename ${t.name}`}
                        onClick={() => setEditing({ id: t.id, name: t.name })}
                        sx={{
                          width: 28, height: 28, borderRadius: '8px', border: 0, display: 'grid', placeItems: 'center', cursor: 'pointer',
                          color: 'text.secondary', bgcolor: 'transparent', opacity: { xs: 1, md: 0 }, transition: 'opacity .15s ease, color .15s ease',
                          '&:hover': { color: TONE, bgcolor: alpha(TONE, 0.1) },
                          '&:focus-visible': { outline: 2, outlineColor: TONE, opacity: 1 },
                        }}
                      >
                        <AppIcon name="pencil" className="fs-6" />
                      </Box>
                    </WtTooltip>
                  )}
                </Stack>
              );
            })}
          </AutoGrid>
        )}
      </ConfigSectionCard>
    </ConfigPageLayout>
  );
}

export default Towns;
