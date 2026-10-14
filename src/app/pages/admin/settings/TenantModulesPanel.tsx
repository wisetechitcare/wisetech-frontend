/**
 * Tenant module packs — which product areas this org family is entitled to.
 *
 * **Platform ops only (Super Admin).** Packs follow purchase / CS — tenant Admins
 * manage roles inside entitled packs; they must not unlock modules themselves.
 * Effective access remains `pack ∩ role`. After save, capabilities are refetched
 * only when the edited tenant is the Super Admin’s own home family.
 *
 * Super Admin picks which **root** tenant to edit (WISETECH, CrafTech, …) —
 * default is their own home org’s root.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Stack, Typography } from '@mui/material';
import {
  AutoGrid,
  GlassCard,
  SettingsSection,
  toast,
  WtButton,
  WtField,
  WtSwitchField,
} from '@app/modules/common/components/ui';
import { TRIO } from '@app/modules/common/components/ui/tw/tokens';
import {
  countEnabledOptionalPacks,
  normalizePackFlags,
  TENANT_PACK_KEYS,
  TENANT_PACK_META,
  type TenantPackFlags,
  type TenantPackKey,
} from '@constants/entitlements';
import { fetchAuthzCapabilities } from '@redux/slices/authz';
import type { RootState } from '@redux/store';
import {
  fetchOrganizationTree,
  fetchTenantEntitlements,
  updateTenantEntitlements,
} from '@services/company';
import { SettingsNowTile } from './SettingsNowTile';

type TenantOption = { id: string; name: string };

function packsFromApiResponse(res: unknown): TenantPackFlags | null {
  if (!res || typeof res !== 'object') return null;
  const envelope = res as { hasError?: boolean; data?: { packs?: unknown } };
  if (envelope.hasError) return null;
  if (envelope.data?.packs != null) return normalizePackFlags(envelope.data.packs);
  return normalizePackFlags((envelope as { packs?: unknown }).packs);
}

function readRootMeta(res: unknown): { id: string | null; name: string | null } {
  const data = (res as { data?: { rootOrgId?: string; rootOrgName?: string | null } })?.data;
  const id = data?.rootOrgId ?? null;
  const raw = data?.rootOrgName;
  const name = typeof raw === 'string' && raw.trim() ? raw.trim() : null;
  return { id, name };
}

export function TenantModulesPanel() {
  const dispatch = useDispatch();
  const tier = useSelector((state: RootState) => state.authz.tier);
  const homeCompanyId = useSelector(
    (state: RootState) => (state as any)?.employee?.currentEmployee?.companyId as string | undefined,
  );
  const canEdit = tier === 'SUPER_ADMIN';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  /** Selected root org — Super Admin switches this to edit Customer B, etc. */
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const [rootOrgId, setRootOrgId] = useState<string | null>(null);
  const [rootOrgName, setRootOrgName] = useState<string | null>(null);
  const [homeRootId, setHomeRootId] = useState<string | null>(null);
  const [packs, setPacks] = useState<TenantPackFlags>(() => normalizePackFlags(null));
  const [savedPacks, setSavedPacks] = useState<TenantPackFlags>(() => normalizePackFlags(null));

  const dirty = useMemo(
    () => TENANT_PACK_KEYS.some((k) => packs[k] !== savedPacks[k]),
    [packs, savedPacks],
  );

  const loadEntitlements = useCallback(async (targetCompanyId?: string | null) => {
    setLoading(true);
    try {
      const res = await fetchTenantEntitlements(targetCompanyId || undefined);
      const next = packsFromApiResponse(res);
      if (!next) throw new Error('Could not read entitlements');
      const meta = readRootMeta(res);
      setRootOrgId(meta.id);
      setRootOrgName(meta.name);
      if (meta.id) setSelectedRootId(meta.id);
      setPacks(next);
      setSavedPacks(next);
      return meta.id;
    } catch {
      toast({ icon: 'error', title: 'Could not load tenant modules' });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const [treeRes, homeMetaId] = await Promise.all([
        fetchOrganizationTree().catch(() => null),
        loadEntitlements(null),
      ]);
      if (homeMetaId) setHomeRootId(homeMetaId);

      const orgs = (treeRes as { data?: { organizations?: Array<{ id: string; name?: string }> } })
        ?.data?.organizations;
      if (Array.isArray(orgs) && orgs.length) {
        const options = orgs
          .map((o) => ({ id: o.id, name: (o.name || o.id).trim() }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setTenants(options);
      } else if (homeMetaId) {
        setTenants([{ id: homeMetaId, name: 'Home organisation' }]);
      }
    } finally {
      setLoading(false);
    }
  }, [loadEntitlements]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const onSelectTenant = useCallback(
    async (rootId: string) => {
      if (rootId === selectedRootId) return;
      if (dirty) {
        toast({
          icon: 'warning',
          title: 'Unsaved changes',
          text: 'Save or reload before switching tenant.',
        });
        return;
      }
      setSelectedRootId(rootId);
      await loadEntitlements(rootId);
    },
    [dirty, loadEntitlements, selectedRootId],
  );

  const setPack = useCallback((key: TenantPackKey, enabled: boolean) => {
    if (TENANT_PACK_META[key].locked) return;
    setPacks((prev) => ({ ...prev, [key]: enabled }));
  }, []);

  const save = useCallback(async () => {
    if (!canEdit || !dirty || !selectedRootId) return;
    setSaving(true);
    try {
      const res = await updateTenantEntitlements({ ...packs }, selectedRootId);
      const next = packsFromApiResponse(res);
      if (!next) throw new Error('Update rejected');
      const meta = readRootMeta(res);
      setRootOrgId(meta.id);
      setRootOrgName(meta.name);
      setPacks(next);
      setSavedPacks(next);
      // Only refresh *this* session’s capabilities when editing the home tenant.
      const editingHome =
        (homeRootId && selectedRootId === homeRootId) ||
        (homeCompanyId && selectedRootId === homeCompanyId);
      if (editingHome) {
        await dispatch(fetchAuthzCapabilities() as any);
      }
      toast({
        icon: 'success',
        title: meta.name
          ? `Modules updated for ${meta.name}`
          : 'Tenant modules updated',
      });
    } catch {
      toast({ icon: 'error', title: 'Could not save tenant modules' });
    } finally {
      setSaving(false);
    }
  }, [canEdit, dirty, dispatch, homeCompanyId, homeRootId, packs, selectedRootId]);

  if (!canEdit) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Subscription modules are managed by WiseTech (platform Super Admin) based on what the
        organisation purchased. Ask your account contact to add or remove a module.
      </Typography>
    );
  }

  const enabledOptional = countEnabledOptionalPacks(packs);
  const tenantOptions = tenants.map((t) => ({ value: t.id, label: t.name }));

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        <SettingsNowTile
          icon="element-11"
          trio={TRIO.cyan}
          label="Optional packs"
          value={loading ? '…' : enabledOptional === 4 ? 'All on' : `${enabledOptional} of 4 on`}
          hint={dirty ? 'Unsaved changes' : 'Saved on this tenant'}
        />
        <SettingsNowTile
          icon="office-bag"
          trio={TRIO.blue}
          label="Editing tenant"
          value={loading ? 'Loading…' : rootOrgName || rootOrgId || '—'}
          hint={rootOrgId ? 'Branches inherit these packs' : undefined}
        />
      </Box>

      <SettingsSection
        tone={TRIO.cyan}
        icon="element-11"
        title="subscription modules"
        description="Pick the customer root, then enable packs they purchased. Role permissions still apply inside each pack (allow = pack ∩ role)."
        action={
          tenantOptions.length > 1 ? (
            <WtField
              label="Tenant"
              ariaLabel="Tenant to edit"
              value={selectedRootId ?? ''}
              onChange={(v) => void onSelectTenant(v)}
              options={tenantOptions}
              disabled={loading || saving}
              size="sm"
              minWidth={220}
            />
          ) : undefined
        }
      >
        <Stack spacing={2}>
          {(rootOrgName || rootOrgId) && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Applied on root organisation{' '}
              <Box component="span" sx={{ fontWeight: 600 }}>
                {rootOrgName || rootOrgId}
              </Box>
              {rootOrgName && rootOrgId ? (
                <>
                  {' '}
                  <Box component="span" sx={{ fontFamily: 'monospace', color: 'text.disabled' }}>
                    ({rootOrgId})
                  </Box>
                </>
              ) : null}
              ; branches inherit the same packs.
            </Typography>
          )}
          <Box sx={{ opacity: loading || saving ? 0.55 : 1, pointerEvents: loading ? 'none' : 'auto' }}>
            <AutoGrid min={280} gap={10}>
              {TENANT_PACK_KEYS.map((key) => {
                const meta = TENANT_PACK_META[key];
                return (
                  <GlassCard
                    key={key}
                    preset="section"
                    sx={{
                      px: 2,
                      py: 1.25,
                      borderTop: `3.5px solid ${meta.locked ? TRIO.slate.c : packs[key] ? TRIO.cyan.c : TRIO.slate.c}`,
                    }}
                  >
                    <WtSwitchField
                      title={meta.title}
                      description={meta.description}
                      checked={packs[key]}
                      disabled={Boolean(meta.locked) || saving}
                      onChange={(_, checked) => setPack(key, checked)}
                      inputProps={{ 'aria-label': meta.title }}
                    />
                  </GlassCard>
                );
              })}
            </AutoGrid>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 1 }}>
            <WtButton
              ghost
              onClick={() => void loadEntitlements(selectedRootId)}
              disabled={loading || saving}
            >
              Reload
            </WtButton>
            <WtButton onClick={() => void save()} disabled={!dirty || loading || saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </WtButton>
          </Box>
        </Stack>
      </SettingsSection>
    </Stack>
  );
}

export default TenantModulesPanel;
