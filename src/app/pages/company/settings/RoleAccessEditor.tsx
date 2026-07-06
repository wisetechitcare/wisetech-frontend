import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ACCESS_AREAS, AccessArea } from "@utils/accessAreas";
import Loader from "@app/modules/common/utils/Loader";
import AccessControlTree, { EffLevel } from "@app/pages/employee/components/AccessControlTree";
import { getRoleAccess, setRoleSectionAccess } from "@services/roles";

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
  const [loadError, setLoadError] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [levels, setLevels] = useState<Record<string, EffLevel>>({});
  const [origLevels, setOrigLevels] = useState<Record<string, EffLevel>>({});

  const allLeaves = useMemo(() => ACCESS_AREAS.flatMap(getLeaves), []);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getRoleAccess(roleId);
      setLoadError(false);
      setIsSuperAdmin(!!data?.isSuperAdmin);
      const sectionLevels = data?.sectionLevels || {};
      const lv: Record<string, EffLevel> = {};
      for (const m of allLeaves) lv[m] = (sectionLevels[m] as EffLevel) || "none";
      setLevels(lv);
      setOrigLevels(lv);
    } catch {
      // Distinguish "failed to load" from "role genuinely has no access granted" -
      // without this, a transient network/server hiccup renders identically to an
      // all-unchecked tree, which reads as real (and possibly incorrect) data.
      setLoadError(true);
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
  const dirty = changedModules.length > 0;

  const onSetLevel = (module: string, level: EffLevel) => setLevels((prev) => ({ ...prev, [module]: level }));

  const saveAll = async () => {
    try {
      setSaving(true);
      for (const m of changedModules) {
        await setRoleSectionAccess(roleId, m, (levels[m] || "none") as "none" | "view" | "edit");
      }
      toast.success("Role access updated");
      await load();
      setRefetch?.(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't save role access");
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  if (loadError) {
    return (
      <div className="text-center py-10">
        <i className="bi bi-exclamation-triangle-fill fs-3x text-danger mb-3 d-block" />
        <div className="fw-bold fs-5">Couldn't load this role's access</div>
        <div className="text-muted fs-7 mt-2 mb-4">
          This is a connection/server issue, not a change to the role's actual permissions — nothing was reset.
        </div>
        <button className="btn btn-sm btn-outline-primary" type="button" onClick={load}>
          <i className="bi bi-arrow-clockwise me-2" />
          Retry
        </button>
      </div>
    );
  }

  if (isSuperAdmin) {
    return (
      <div className="text-center py-10">
        <i className="bi bi-shield-lock-fill fs-3x text-primary mb-3 d-block" />
        <div className="fw-bold fs-5">Super Admin has full access</div>
        <div className="text-muted fs-7 mt-2">This role always has every permission and can't be changed.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div>
          <h2 className="mb-1">Access</h2>
          <div className="text-muted fs-7">
            Controls what <strong>everyone with the {roleName ? `"${roleName}"` : "this"} role</strong> can see and do.
            Per-person exceptions are set in People → employee → Access.
          </div>
        </div>
      </div>
      <hr style={{ backgroundColor: "#E1E7EF", height: "2px" }} />

      <AccessControlTree
        variant="role"
        levels={levels}
        dirtyModules={dirtyModules}
        onSetLevel={onSetLevel}
      />

      <button className="btn btn-primary mt-8" type="button" disabled={!dirty || saving} onClick={saveAll}>
        <i className="bi bi-save me-2" />
        {saving ? "Saving…" : "Save Access"}
      </button>
    </div>
  );
};

export default RoleAccessEditor;
