import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ACCESS_AREAS, AccessArea } from "@utils/accessAreas";
import Loader from "@app/modules/common/utils/Loader";
import AccessControlTree, { EffLevel } from "@app/pages/employee/components/AccessControlTree";
import { getRoleAccess, setRoleSectionAccess, setRoleTabAccess } from "@services/roles";
import { InlineNotice, SettingsSection, TRIO, WtButton } from '@app/modules/common/components/ui';

interface Props {
  roleId: string;
  roleName?: string;
  setRefetch?: (show: boolean) => void;
}

const getLeaves = (area: AccessArea): string[] => {
  if (!area.children?.length) return [area.module];
  const out: string[] = [];
  const walk = (n: AccessArea) => (n.children?.length ? n.children.forEach(walk) : out.push(n.module));
  area.children.forEach(walk);
  return out;
};

/**
 * Role-level access editor (Settings → Roles & Permissions). The same section
 * tree as the per-employee Access tab, but it grants/revokes for the WHOLE role
 * — i.e. every employee who has this role. Read = view, Write = edit, none = not
 * granted. (Per-person exceptions are still set from People → employee Access.)
 */
const RoleAccessEditor: React.FC<Props> = ({ roleId, roleName, setRefetch }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullAccess, setFullAccess] = useState(false);
  const [roleCode, setRoleCode] = useState<string | null>(null);
  const [editable, setEditable] = useState(true);
  const [levels, setLevels] = useState<Record<string, EffLevel>>({});
  const [origLevels, setOrigLevels] = useState<Record<string, EffLevel>>({});
  // Tabs this role turns off (Access -> Advanced), staged like the levels.
  const [deniedTabs, setDeniedTabs] = useState<Set<string>>(new Set());
  const [origDeniedTabs, setOrigDeniedTabs] = useState<Set<string>>(new Set());

  const allLeaves = useMemo(() => ACCESS_AREAS.flatMap(getLeaves), []);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getRoleAccess(roleId);
      setFullAccess(!!data?.fullAccess);
      setRoleCode(data?.code ?? null);
      setEditable(data?.editable !== false);
      const sectionLevels = data?.sectionLevels || {};
      const lv: Record<string, EffLevel> = {};
      for (const m of allLeaves) lv[m] = (sectionLevels[m] as EffLevel) || "none";
      setLevels(lv);
      setOrigLevels(lv);
      setDeniedTabs(new Set(data?.deniedTabs || []));
      setOrigDeniedTabs(new Set(data?.deniedTabs || []));
    } catch {
      toast.error("Couldn't load this role's access");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roleId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId]);

  const changedModules = useMemo(
    () => allLeaves.filter((m) => (levels[m] || "none") !== (origLevels[m] || "none")),
    [levels, origLevels, allLeaves]
  );
  const dirtyModules = useMemo(() => new Set(changedModules), [changedModules]);
  const changedTabs = useMemo(
    () => Array.from(new Set([...deniedTabs, ...origDeniedTabs])).filter((k) => deniedTabs.has(k) !== origDeniedTabs.has(k)),
    [deniedTabs, origDeniedTabs]
  );
  const dirty = changedModules.length > 0 || changedTabs.length > 0;
  const changeCount = changedModules.length + changedTabs.length;
  const tabs = useMemo(() => ({
    denied: deniedTabs,
    onSet: (key: string, allowed: boolean | null) => setDeniedTabs((prev) => {
      const next = new Set(prev);
      if (allowed === false) next.add(key); else next.delete(key);
      return next;
    }),
  }), [deniedTabs]);

  const onSetLevel = (module: string, level: EffLevel) => setLevels((prev) => ({ ...prev, [module]: level }));

  const saveAll = async () => {
    try {
      setSaving(true);
      for (const m of changedModules) {
        await setRoleSectionAccess(roleId, m, (levels[m] || "none") as "none" | "view" | "edit");
      }
      for (const key of changedTabs) {
        const [section, tab] = key.split("/");
        await setRoleTabAccess(roleId, section, tab, !deniedTabs.has(key));
      }
      toast.success("Role access updated");
      await load();
      setRefetch?.(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Couldn't save role access");
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  const isSuperAdminRole = roleCode === "SUPER_ADMIN";

  return (
    <SettingsSection
      tone={TRIO.blue}
      icon="shield-tick"
      title="Section access"
      description={
        fullAccess
          ? undefined
          : `What everyone with the ${roleName ? `"${roleName}"` : "this"} role can see (Read) and change (Write). Exceptions for one person are set in People → employee → Access.`
      }
      action={
        fullAccess || !editable ? undefined : (
          <WtButton size="small" flat disabled={!dirty || saving} onClick={saveAll}>
            {saving ? "Saving…" : dirty ? `Save ${changeCount} change${changeCount === 1 ? "" : "s"}` : "Saved"}
          </WtButton>
        )
      }
    >
      {fullAccess ? (
        <InlineNotice trio={TRIO.green} icon="shield-tick">
          {roleName || "This role"} can see and edit every section
          {isSuperAdminRole ? ", in every organization" : " of its organization"}, so there is nothing to set here.
        </InlineNotice>
      ) : (
        <>
          {!editable && (
            <InlineNotice trio={TRIO.slate} icon="lock">
              Only a Super Admin can change the {roleName || "Admin"} role's access.
            </InlineNotice>
          )}
          <AccessControlTree variant="role" levels={levels} dirtyModules={dirtyModules} onSetLevel={onSetLevel} readOnly={!editable} tabs={tabs} />
        </>
      )}
    </SettingsSection>
  );
};

export default RoleAccessEditor;
