import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ACCESS_AREAS, AccessArea } from "@utils/accessAreas";
import Loader from "@app/modules/common/utils/Loader";
import AccessControlTree, { EffLevel } from "@app/pages/employee/components/AccessControlTree";
import { getRoleAccess, getRoleOverrides, setRoleSectionAccess, setRoleTabAccess, type RoleMemberOverride } from "@services/roles";
import { setSectionAccessLevel, setTabAccess } from "@services/employeeAccess";
import { SECTION_TABS } from "@utils/sectionTabs";
import { formatDate } from "@utils/dateFormats";
import { InlineNotice, SettingsSection, TRIO, WtButton, UnsavedChangesModal as Modal } from '@app/modules/common/components/ui';

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

const LEVEL_TEXT: Record<string, string> = {
  none: "Blocked", view: "Read", edit: "Read + Write", delete: "Read + Write + Delete", on: "Tab on", off: "Tab off",
};
const overrideKey = (o: RoleMemberOverride) => `${o.employeeId}|${o.section}`;

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
  // Members whose own setting on a changed section/tab beats the role: asked about on save.
  const [conflicts, setConflicts] = useState<RoleMemberOverride[] | null>(null);
  const [toReset, setToReset] = useState<Set<string>>(new Set());
  const labelOf = useMemo(() => {
    const names: Record<string, string> = {};
    const walk = (a: AccessArea) => { names[a.module] = a.label; a.children?.forEach(walk); };
    ACCESS_AREAS.forEach(walk);
    return (key: string) => {
      const [section, tab] = key.split("/");
      const tabLabel = tab && SECTION_TABS[section]?.find((t) => t.key === tab)?.label;
      return tab ? `${names[section] ?? section} → ${tabLabel ?? tab}` : names[section] ?? section;
    };
  }, []);

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

  // Before saving: anyone on this role with their own setting on what changed? Ask about them.
  const onSaveClick = async () => {
    try {
      setSaving(true);
      const changed = new Set([...changedModules, ...changedTabs]);
      const hits = (await getRoleOverrides(roleId)).filter((o) => changed.has(o.section));
      if (!hits.length) return await saveAll([]);
      setToReset(new Set());
      setConflicts(hits);
    } catch {
      // Couldn't check members: save the role anyway, as before.
      await saveAll([]);
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async (resets: RoleMemberOverride[]) => {
    setConflicts(null);
    try {
      setSaving(true);
      for (const m of changedModules) {
        await setRoleSectionAccess(roleId, m, (levels[m] || "none") as "none" | "view" | "edit" | "delete");
      }
      for (const key of changedTabs) {
        const [section, tab] = key.split("/");
        await setRoleTabAccess(roleId, section, tab, !deniedTabs.has(key));
      }
      // Send the chosen people back to the role; one failure doesn't stop the rest.
      let failed = 0;
      for (const o of resets) {
        const [section, tab] = o.section.split("/");
        try {
          if (tab) await setTabAccess(o.employeeId, section, tab, null);
          else await setSectionAccessLevel(o.employeeId, section, "default");
        } catch {
          failed += 1;
        }
      }
      if (failed) toast.warning(`Role saved, but ${failed} personal setting${failed > 1 ? "s" : ""} couldn't be reset.`);
      else toast.success(resets.length ? `Role access updated; ${resets.length} personal setting${resets.length > 1 ? "s" : ""} reset to the role` : "Role access updated");
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
          <WtButton size="small" flat disabled={!dirty || saving} onClick={onSaveClick}>
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
          <AccessControlTree variant="role" levels={levels} dirtyModules={dirtyModules} onSetLevel={onSetLevel} readOnly={!editable} tabs={tabs} pinSubject={{ kind: "role", roleId, roleName }} />
        </>
      )}
      <Modal show={!!conflicts} onHide={() => setConflicts(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">Some people have their own setting</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="fs-7 text-muted mb-3">
            These people hold the {roleName ? `"${roleName}"` : "this"} role but have a personal setting on a section you changed, so the
            role change won't reach them. Tick the ones to reset to the role; the rest keep their own setting.
          </p>
          <div className="d-flex justify-content-end gap-2 mb-2">
            <WtButton ghost size="small" onClick={() => setToReset(new Set((conflicts ?? []).map(overrideKey)))}>Select all</WtButton>
            <WtButton ghost size="small" onClick={() => setToReset(new Set())}>Clear</WtButton>
          </div>
          <table className="table table-sm align-middle fs-7 mb-0">
            <thead>
              <tr className="text-muted fw-bold">
                <th style={{ width: 36 }} />
                <th>Person</th>
                <th>Section</th>
                <th>Their setting</th>
                <th>Role will give</th>
              </tr>
            </thead>
            <tbody>
              {(conflicts ?? []).map((o) => {
                const key = overrideKey(o);
                const checked = toReset.has(key);
                const tab = o.section.includes("/");
                const roleGives = tab ? (deniedTabs.has(o.section) ? "off" : "on") : levels[o.section] || "none";
                return (
                  <tr key={key} style={{ cursor: "pointer" }} onClick={() => setToReset((prev) => {
                    const n = new Set(prev);
                    if (n.has(key)) n.delete(key); else n.add(key);
                    return n;
                  })}>
                    <td><input type="checkbox" readOnly checked={checked} aria-label={`Reset ${o.name}'s ${labelOf(o.section)} to the role`} /></td>
                    <td className="fw-semibold">{o.name || "—"}</td>
                    <td>{labelOf(o.section)}</td>
                    <td>
                      {LEVEL_TEXT[o.level] ?? o.level}
                      {o.expiresAt ? <span className="text-muted"> (until {formatDate(o.expiresAt)})</span> : null}
                    </td>
                    <td>{LEVEL_TEXT[roleGives] ?? roleGives}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Modal.Body>
        <Modal.Footer>
          <WtButton ghost onClick={() => setConflicts(null)}>Cancel</WtButton>
          <WtButton onClick={() => saveAll((conflicts ?? []).filter((o) => toReset.has(overrideKey(o))))}>
            {toReset.size ? `Save and reset ${toReset.size}` : "Save, keep their settings"}
          </WtButton>
        </Modal.Footer>
      </Modal>
    </SettingsSection>
  );
};

export default RoleAccessEditor;
