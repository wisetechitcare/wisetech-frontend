/**
 * Employee Access › Permission Overrides.
 *
 * Per-employee override editor built on the shared AccessControlTree. Section-level
 * overrides go through `setSectionAccessLevel`; the finance subsections additionally
 * expand into their TABS (Read/Write per tab) written via `setModuleTabGrants`. Both
 * are STAGED and persisted together by the single "Save" button — one Read/Write
 * vocabulary, one save flow, no separate section.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import AccessControlTree, { EffLevel } from '@app/pages/employee/components/AccessControlTree';
import {
  getEmployeeAccessSummary, setSectionAccessLevel, setModuleTabGrants, resetAllEmployeeOverrides,
  EmployeeAccessSummary,
} from '@services/employeeAccess';
import { FINANCE_TAB_CATALOG, FinanceTabDef } from '@utils/financeTabs';
import { ALL_LEAVES, levelFromKeys, toApiLevel } from './overrideLevels';

type TabState = Record<string, { read: boolean; write: boolean }>;

/** The `action.scope` portion of a key (what a UserPermission row stores). */
const actionOf = (key: string, module: string): string => key.slice(module.length + 1);

/** Read/Write per tab, derived from the employee's effective keys. */
const tabStateFromEffective = (effective: string[]): TabState => {
  const st: TabState = {};
  for (const s of FINANCE_TAB_CATALOG) {
    for (const t of s.tabs) {
      const hasEdit = !!(t.editKey && effective.includes(t.editKey));
      st[t.id] = { read: effective.includes(t.viewKey) || hasEdit, write: hasEdit };
    }
  }
  return st;
};

/** Override rows for one finance module from its tabs' Read/Write state. */
const buildModuleRows = (tabs: FinanceTabDef[], state: TabState, roleBaseline: string[]) => {
  const rows: Array<{ action: string; allow: boolean }> = [];
  const seen = new Set<string>();
  const add = (action: string, allow: boolean) => { if (!seen.has(action)) { rows.push({ action, allow }); seen.add(action); } };
  for (const t of tabs) {
    const st = state[t.id] ?? { read: false, write: false };
    if (st.read || st.write) {
      add(actionOf(t.viewKey, t.module), true);
      if (st.write && t.editKey) add(actionOf(t.editKey, t.module), true);
    } else if (roleBaseline.includes(t.viewKey)) {
      add(actionOf(t.viewKey, t.module), false); // deny to hide a role-granted tab
    }
  }
  return rows;
};

export const OverridesPanel = ({ employeeId }: { employeeId: string }) => {
  const [summary, setSummary] = useState<EmployeeAccessSummary | null>(null);
  const [levels, setLevels] = useState<Record<string, EffLevel>>({});
  const [orig, setOrig] = useState<Record<string, EffLevel>>({});
  const [tabState, setTabState] = useState<TabState>({});
  const [origTabState, setOrigTabState] = useState<TabState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const apply = useCallback((s: EmployeeAccessSummary) => {
    const lv: Record<string, EffLevel> = {};
    for (const leaf of ALL_LEAVES) {
      const override = s.sectionLevels?.[leaf.module];
      lv[leaf.module] = override
        ? (override === 'blocked' ? 'none' : override)
        : levelFromKeys(s.effective ?? [], leaf.module);
    }
    const ts = tabStateFromEffective(s.effective ?? []);
    setSummary(s);
    setLevels(lv);
    setOrig(lv);
    setTabState(ts);
    setOrigTabState(ts);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apply(await getEmployeeAccessSummary(employeeId));
    } catch {
      toast.error('Could not load permission overrides');
    } finally {
      setLoading(false);
    }
  }, [employeeId, apply]);

  useEffect(() => { load(); }, [load]);

  const dirtyModules = useMemo(
    () => new Set(Object.keys(levels).filter((m) => levels[m] !== orig[m])),
    [levels, orig],
  );
  // Finance modules (for saving) + individual tab ids (for row highlight) whose
  // staged Read/Write differs from the saved baseline.
  const { dirtyTabModules, dirtyTabIds } = useMemo(() => {
    const mods = new Set<string>();
    const ids = new Set<string>();
    for (const sec of FINANCE_TAB_CATALOG) {
      for (const t of sec.tabs) {
        const a = tabState[t.id], b = origTabState[t.id];
        if (a && b && (a.read !== b.read || a.write !== b.write)) { mods.add(sec.module); ids.add(t.id); }
      }
    }
    return { dirtyTabModules: mods, dirtyTabIds: ids };
  }, [tabState, origTabState]);

  const dirtyCount = dirtyModules.size + dirtyTabModules.size;
  // Highlight set for the tree (coarse dirty modules + changed tab rows).
  const treeDirty = useMemo(() => new Set<string>([...dirtyModules, ...dirtyTabIds]), [dirtyModules, dirtyTabIds]);

  const customModules = useMemo(
    () => new Set(Object.keys(summary?.sectionLevels ?? {})),
    [summary],
  );

  const tabsByModule = useMemo(
    () => Object.fromEntries(FINANCE_TAB_CATALOG.map((s) => [s.module, s.tabs])),
    [],
  );

  const roleLevelOf = useCallback(
    (module: string): EffLevel => levelFromKeys(summary?.roleBaseline ?? [], module),
    [summary],
  );

  const onSetLevel = (module: string, level: EffLevel) => setLevels((p) => ({ ...p, [module]: level }));
  const onResetToRole = (module: string) => setLevels((p) => ({ ...p, [module]: roleLevelOf(module) }));

  // Stage a finance tab's Read/Write (Write implies Read; clearing Read clears
  // Write). Persisted by the Save button along with the section overrides.
  const onToggleTab = (tab: FinanceTabDef, field: 'read' | 'write') => {
    setTabState((prev) => {
      const cur = prev[tab.id] ?? { read: false, write: false };
      const next = field === 'read'
        ? { read: !cur.read, write: !cur.read ? cur.write : false }
        : { write: !cur.write, read: !cur.write ? true : cur.read };
      return { ...prev, [tab.id]: next };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      let latest: EmployeeAccessSummary | null = null;
      for (const module of dirtyModules) {
        latest = await setSectionAccessLevel(employeeId, module, toApiLevel(levels[module], roleLevelOf(module)));
      }
      for (const module of dirtyTabModules) {
        const tabs = FINANCE_TAB_CATALOG.find((s) => s.module === module)?.tabs ?? [];
        latest = await setModuleTabGrants(employeeId, module, buildModuleRows(tabs, tabState, summary?.roleBaseline ?? []));
      }
      if (latest) apply(latest);
      toast.success('Overrides saved');
    } catch {
      toast.error('Could not save overrides');
    } finally {
      setSaving(false);
    }
  };

  const resetAll = async () => {
    setSaving(true);
    try {
      apply(await resetAllEmployeeOverrides(employeeId));
      toast.success('All overrides cleared');
    } catch {
      toast.error('Could not clear overrides');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>;
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} justifyContent="flex-end">
        <Button variant="text" color="inherit" size="small" disabled={saving} onClick={resetAll} sx={{ textTransform: 'none' }}>
          Reset all to roles
        </Button>
        <Button variant="contained" size="small" disabled={saving || dirtyCount === 0} onClick={save} sx={{ textTransform: 'none' }}>
          {saving ? 'Saving…' : `Save${dirtyCount ? ` (${dirtyCount})` : ''}`}
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Overrides adjust this employee's access on top of their roles. Expand a finance section to grant
        individual tabs — Read shows the tab, Write also reveals its action buttons. Click Save to apply.
      </Typography>
      <AccessControlTree
        levels={levels}
        dirtyModules={treeDirty}
        customModules={customModules}
        onSetLevel={onSetLevel}
        onResetToRole={onResetToRole}
        variant="employee"
        tabsByModule={tabsByModule}
        tabState={tabState}
        onToggleTab={onToggleTab}
      />
    </Box>
  );
};

export default OverridesPanel;
