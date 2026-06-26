import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "react-bootstrap";
import { toast } from "react-toastify";
import { fetchRoles } from "@services/roles";
import {
  getEmployeeAccessSummary,
  updateEmployeeRoles,
  setSectionAccessLevel,
  getRbacAuditLogs,
  EmployeeAccessSummary,
  AccessLevel,
} from "@services/employeeAccess";
import { ACCESS_AREAS, AccessArea } from "@utils/accessAreas";
import Loader from "@app/modules/common/utils/Loader";
import { getAvatar } from "@utils/avatar";
import AccessControlTree, { EffLevel } from "./components/AccessControlTree";

interface Props {
  employeeId: string;
}

// Flatten an area to its controllable leaf modules.
const getLeaves = (area: AccessArea): Array<{ module: string; label: string }> => {
  if (!area.children?.length) return [{ module: area.module, label: area.label }];
  const out: Array<{ module: string; label: string }> = [];
  const walk = (n: AccessArea) => {
    if (!n.children?.length) out.push({ module: n.module, label: n.label });
    else n.children.forEach(walk);
  };
  area.children.forEach(walk);
  return out;
};

// Derive a section's access level (view/edit/none) from a flat permission-key list.
const levelFromKeys = (keys: string[], leaf: string): EffLevel => {
  if (keys.includes("*.*.global") || keys.includes("*.*.all")) return "edit";
  const prefixes = [leaf, leaf.split(".").slice(0, -1).join(".")].filter(Boolean);
  let level: EffLevel = "none";
  for (const key of keys) {
    const parts = key.split(".");
    const action = parts[parts.length - 2];
    const mod = parts.slice(0, -2).join(".");
    if (prefixes.includes(mod)) {
      if (["create", "update", "delete", "manage"].includes(action)) return "edit";
      if (action === "view") level = level === "none" ? "view" : level;
    }
  }
  return level;
};

const levelText = (eff: EffLevel) => (eff === "edit" ? "Read + Write" : eff === "view" ? "Read only" : "Blocked");

const EmployeeAccessTab: React.FC<Props> = ({ employeeId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<EmployeeAccessSummary | null>(null);
  const [allRoles, setAllRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Staged (unsaved) edits.
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [levels, setLevels] = useState<Record<string, EffLevel>>({});
  const [expiries, setExpiries] = useState<Record<string, string | null>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  // Server-truth baselines, to detect "dirty".
  const [origRoleIds, setOrigRoleIds] = useState<string[]>([]);
  const [origLevels, setOrigLevels] = useState<Record<string, EffLevel>>({});
  const [origExpiries, setOrigExpiries] = useState<Record<string, string | null>>({});

  const allLeaves = useMemo(() => ACCESS_AREAS.flatMap(getLeaves), []);

  // Role-only level (ignoring per-employee overrides), used to decide whether a
  // staged change can simply inherit ("default") instead of writing an override.
  const roleLevelOf = (module: string): EffLevel => levelFromKeys(summary?.inherited || [], module);

  const applySummary = (s: EmployeeAccessSummary) => {
    setSummary(s);
    const roleIds = (s.roles || []).map((r) => r.id);
    setSelectedRoleIds(roleIds);
    setOrigRoleIds(roleIds);

    // Checkboxes reflect the employee's *effective* access (role + overrides).
    const lv: Record<string, EffLevel> = {};
    for (const leaf of allLeaves) lv[leaf.module] = levelFromKeys(s.effective || [], leaf.module);
    setLevels(lv);
    setOrigLevels(lv);

    // Surface existing expiries from the override rows so timers show on load.
    const exp: Record<string, string | null> = {};
    [...(s.overridesAllow || []), ...(s.overridesDeny || [])].forEach((o) => {
      if (o.expiresAt && exp[o.resource] == null) exp[o.resource] = o.expiresAt;
    });
    for (const leaf of allLeaves) if (!(leaf.module in exp)) exp[leaf.module] = null;
    setExpiries(exp);
    setOrigExpiries(exp);
  };

  const load = async () => {
    try {
      setLoading(true);
      const [summaryData, rolesResp, logs] = await Promise.all([
        getEmployeeAccessSummary(employeeId),
        fetchRoles(),
        getRbacAuditLogs({ targetType: "employee", targetId: employeeId, limit: 25 }),
      ]);
      applySummary(summaryData);
      setAllRoles(rolesResp?.data || []);
      setAuditLogs(logs || []);
    } catch (err) {
      toast.error("Couldn't load this employee's access");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const customModules = useMemo(() => new Set(Object.keys(summary?.sectionLevels || {})), [summary]);

  const changedModules = useMemo(
    () =>
      allLeaves
        .map((l) => l.module)
        .filter((m) => (levels[m] || "none") !== (origLevels[m] || "none") || (expiries[m] ?? null) !== (origExpiries[m] ?? null)),
    [levels, origLevels, expiries, origExpiries, allLeaves]
  );

  const rolesChanged = useMemo(
    () => selectedRoleIds.length !== origRoleIds.length || selectedRoleIds.some((id) => !origRoleIds.includes(id)),
    [selectedRoleIds, origRoleIds]
  );

  const dirty = changedModules.length > 0 || rolesChanged;
  const dirtyModules = useMemo(() => new Set(changedModules), [changedModules]);

  const toggleRole = (roleId: string) =>
    setSelectedRoleIds((prev) => (prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]));

  const onSetLevel = (module: string, level: EffLevel) => {
    setLevels((prev) => ({ ...prev, [module]: level }));
    if (level === "none") setExpiries((prev) => ({ ...prev, [module]: null })); // blocked carries no timer
  };
  const onSetExpiry = (module: string, iso: string | null) => setExpiries((prev) => ({ ...prev, [module]: iso }));
  const onResetToRole = (module: string) => {
    setLevels((prev) => ({ ...prev, [module]: roleLevelOf(module) }));
    setExpiries((prev) => ({ ...prev, [module]: null }));
  };

  const activeModuleCount = useMemo(
    () => ACCESS_AREAS.filter((a) => getLeaves(a).some((l) => (levels[l.module] || "none") !== "none")).length,
    [levels]
  );

  // Translate a staged effective level into the value the backend expects.
  const sendLevelFor = (m: string): AccessLevel => {
    const eff = levels[m] || "none";
    const exp = expiries[m] ?? null;
    if (exp && eff !== "none") return eff;       // explicit timed override
    if (eff === roleLevelOf(m)) return "default"; // matches role → inherit (drops override)
    if (eff === "none") return "blocked";         // explicit deny
    return eff;                                    // view / edit override
  };

  const saveAll = async () => {
    try {
      setSaving(true);
      setShowConfirm(false);
      if (rolesChanged) await updateEmployeeRoles(employeeId, selectedRoleIds);
      for (const m of changedModules) {
        const send = sendLevelFor(m);
        const exp = send === "view" || send === "edit" ? expiries[m] ?? null : null;
        await setSectionAccessLevel(employeeId, m, send, exp);
      }
      toast.success("Access updated");
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't save changes");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const onSaveClick = () => {
    if (dirty) setShowConfirm(true);
  };

  // ── Audit rendering ────────────────────────────────────────────────────────
  const formatWhen = (d?: string | null) => {
    if (!d) return "";
    return new Date(d).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };
  const parseAudit = (v: unknown): any => {
    if (!v) return null;
    if (typeof v === "string") { try { return JSON.parse(v); } catch { return null; } }
    return v;
  };
  const auditTitle = (log: any) => {
    const a: string = log.action || "";
    if (a.includes("ROLE")) return "Roles Updated";
    if (a === "OVERRIDE_DELETED") return "Access Reset";
    return "Access Changed";
  };
  const auditDescription = (log: any) => {
    const a: string = log.action || "";
    if (a.includes("ROLE")) {
      const roles = parseAudit(log.newValue);
      if (Array.isArray(roles)) return roles.length ? roles.map((r: any) => r.name).filter(Boolean).join(", ") : "All roles removed";
      return "Role assignment updated";
    }
    const v = parseAudit(log.newValue) || parseAudit(log.oldValue);
    const section = v?.section || log.permissionKey || "";
    const lvl = v?.level;
    const pretty = lvl === "blocked" ? "Blocked" : lvl === "edit" ? "Can edit" : lvl === "view" ? "View only" : "reset to role";
    return `${section} ${lvl === "default" || !lvl ? "reset to role" : `set to ${pretty}`}`;
  };
  const auditDot = (a: string) => (a.includes("ROLE") ? "#2F9E44" : a.includes("DELETED") ? "#ADB5BD" : "#3B5BDB");

  if (loading) return <Loader />;
  if (!summary) return <div className="text-muted p-5">No access data.</div>;

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto" }} className="pb-20">
      {/* Assigned job roles */}
      <div className="d-flex align-items-center justify-content-between mb-3 mt-2">
        <span className="text-muted fw-bold fs-7" style={{ letterSpacing: 1 }}>ASSIGNED JOB ROLES</span>
        <span className="text-muted fs-8">Multi-select enabled</span>
      </div>
      <div className="d-flex flex-wrap gap-3 mb-8">
        {allRoles.map((role) => {
          const active = selectedRoleIds.includes(role.id);
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => toggleRole(role.id)}
              className={`btn btn-sm rounded-pill px-4 ${active ? "btn-primary" : "btn-light border"}`}
              style={{ fontWeight: 600 }}
            >
              {active && <i className="bi bi-check-lg me-1" />}
              {role.name}
            </button>
          );
        })}
      </div>

      <div className="row g-6">
        {/* LEFT: Module specific access tree */}
        <div className="col-12 col-xl-8">
          <div className="text-muted fw-bold fs-7 mb-3" style={{ letterSpacing: 1 }}>MODULE SPECIFIC ACCESS</div>
          <div className="card border shadow-sm mb-8" style={{ borderRadius: 14 }}>
            <div className="card-body">
              <AccessControlTree
                levels={levels}
                expiries={expiries}
                customModules={customModules}
                dirtyModules={dirtyModules}
                onSetLevel={onSetLevel}
                onSetExpiry={onSetExpiry}
                onResetToRole={onResetToRole}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Recent access changes */}
        <div className="col-12 col-xl-4">
          <div style={{ position: "sticky", top: 16 }}>
            <div className="text-muted fw-bold fs-7 mb-3" style={{ letterSpacing: 1 }}>RECENT ACCESS CHANGES</div>
            <div className="card border shadow-sm" style={{ borderRadius: 14 }}>
              <div className="card-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                {auditLogs.length === 0 ? (
                  <p className="text-muted fs-7 mb-0">No changes recorded yet.</p>
                ) : (
                  auditLogs.slice(0, 12).map((log, i) => (
                    <div key={log.id} className={`d-flex ${i < Math.min(auditLogs.length, 12) - 1 ? "border-bottom" : ""} py-3`}>
                      <span className="mt-1 me-3 flex-shrink-0" style={{ width: 10, height: 10, borderRadius: "50%", background: auditDot(log.action) }} />
                      <div className="flex-grow-1 min-w-0">
                        <div className="d-flex justify-content-between">
                          <span className="fw-bold text-gray-900 fs-7">{auditTitle(log)}</span>
                          <span className="text-muted fs-8 text-nowrap ms-2">{formatWhen(log.createdAt)}</span>
                        </div>
                        <span className="text-muted fs-8 d-block">{auditDescription(log)}</span>
                        <span className="d-inline-flex align-items-center fs-8 mt-1" style={{ color: "#9D4141" }}>
                          {log.actorName && log.actorName !== "System" ? (
                            <img
                              src={getAvatar(log.actorAvatar, (log.actorGender ?? 0) as 0 | 1 | 2)}
                              alt={log.actorName}
                              className="me-1"
                              style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover", border: "1px solid #eee" }}
                            />
                          ) : (
                            <i className="bi bi-gear-fill me-1" />
                          )}
                          by {log.actorName || "System"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky save bar */}
      <div
        className="d-flex align-items-center justify-content-between bg-white border-top px-6 py-4"
        style={{ position: "sticky", bottom: 0, marginLeft: -12, marginRight: -12, boxShadow: "0 -4px 16px rgba(0,0,0,0.06)" }}
      >
        <div>
          <div className="text-muted fs-8 fw-bold" style={{ letterSpacing: 1 }}>CURRENT ACCESS WEIGHT</div>
          <div className="fs-5"><span className="fw-bolder">{activeModuleCount}</span> <span className="text-muted">Modules Active</span></div>
        </div>
        <button className="btn btn-primary px-6" disabled={!dirty || saving} onClick={onSaveClick}>
          <i className="bi bi-save me-2" />
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* Save confirmation */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">Save access changes?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {rolesChanged && (
            <div className="alert alert-light-primary py-2 px-3 fs-7 mb-3">Job roles will be updated.</div>
          )}
          {changedModules.length > 0 ? (
            <>
              <p className="mb-2">You're changing access for <strong>{changedModules.length}</strong> section{changedModules.length > 1 ? "s" : ""}:</p>
              <ul className="mb-3">
                {changedModules.map((m) => {
                  const label = allLeaves.find((l) => l.module === m)?.label || m;
                  const eff = levels[m] || "none";
                  const exp = expiries[m] ?? null;
                  return (
                    <li key={m} className="fs-7">
                      <strong>{label}</strong> → {levelText(eff)}
                      {exp && eff !== "none" ? <span className="text-muted"> (until {new Date(exp).toLocaleString()})</span> : null}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            !rolesChanged && <p className="mb-0">No changes to save.</p>
          )}
          <div className="alert alert-warning py-2 px-3 fs-7 mb-0">
            These apply only to this employee. Sections you didn't change keep inheriting from their role.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-light" onClick={() => setShowConfirm(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveAll}>Yes, save</button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EmployeeAccessTab;
