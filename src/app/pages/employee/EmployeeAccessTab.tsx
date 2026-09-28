import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "react-bootstrap";
import { toast } from "react-toastify";
import {
  getEmployeeAccessSummary,
  setSectionAccessLevel,
  setRecordAccess,
  setTabAccess,
  RecordAccess,
  RecordSection,
  getRbacAuditLogs,
  EmployeeAccessSummary,
  AccessLevel,
} from "@services/employeeAccess";
import { ACCESS_AREAS, AccessArea } from "@utils/accessAreas";
import Loader from "@app/modules/common/utils/Loader";
import AccessControlTree, { EffLevel, RecordCells } from "./components/AccessControlTree";
import AccessActivity from "./components/AccessActivity";
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import { InlineNotice, TRIO } from '@app/modules/common/components/ui';
import { useSelector } from "react-redux";
import type { RootState } from "@redux/store";

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

const RECORD_SECTIONS: RecordSection[] = ["crm.leads", "projects"];
const RECORD_LABEL: Record<RecordSection, string> = { "crm.leads": "Leads", projects: "Projects" };
const sameRecord = (a?: RecordAccess, b?: RecordAccess) => a?.readAll === b?.readAll && a?.commercial === b?.commercial;

const levelText = (eff: EffLevel) => (eff === "edit" ? "Read + Write" : eff === "view" ? "Read only" : "Blocked");

const EmployeeAccessTab: React.FC<Props> = ({ employeeId }) => {
  const currentEmployeeId = useSelector((state: RootState) => state.employee.currentEmployee?.id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<EmployeeAccessSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Staged (unsaved) edits.
  const [levels, setLevels] = useState<Record<string, EffLevel>>({});
  const [expiries, setExpiries] = useState<Record<string, string | null>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  // Server-truth baselines, to detect "dirty".
  const [origLevels, setOrigLevels] = useState<Record<string, EffLevel>>({});
  const [origExpiries, setOrigExpiries] = useState<Record<string, string | null>>({});
  const [records, setRecords] = useState<Partial<Record<RecordSection, RecordAccess>>>({});
  const [origRecords, setOrigRecords] = useState<Partial<Record<RecordSection, RecordAccess>>>({});
  // Tabs (Access -> Advanced): off, and whether set for this person rather than by their roles.
  type TabState = { denied: boolean; custom: boolean };
  const [tabStates, setTabStates] = useState<Record<string, TabState>>({});
  const [origTabStates, setOrigTabStates] = useState<Record<string, TabState>>({});

  const allLeaves = useMemo(() => ACCESS_AREAS.flatMap(getLeaves), []);

  // Role-only level (ignoring per-employee overrides), used to decide whether a
  // staged change can simply inherit ("default") instead of writing an override.
  const roleLevelOf = (module: string): EffLevel => summary?.roleLevels?.[module] || "none";

  const applySummary = (s: EmployeeAccessSummary) => {
    setSummary(s);

    // Checkboxes reflect the employee's *effective* access (role + overrides).
    const lv: Record<string, EffLevel> = {};
    for (const leaf of allLeaves) lv[leaf.module] = s.effectiveLevels?.[leaf.module] || "none";
    setLevels(lv);
    setOrigLevels(lv);

    // Surface existing expiries from the override rows so timers show on load.
    const exp: Record<string, string | null> = {};
    for (const leaf of allLeaves) exp[leaf.module] = s.overrides?.[leaf.module]?.expiresAt ?? null;
    setExpiries(exp);
    setOrigExpiries(exp);

    const rec: Partial<Record<RecordSection, RecordAccess>> = {};
    for (const section of RECORD_SECTIONS) {
      const r = s.records?.[section];
      if (r) rec[section] = { readAll: r.readAll, commercial: r.commercial };
    }
    setRecords(rec);
    setOrigRecords(rec);

    setTabStates(s.tabs || {});
    setOrigTabStates(s.tabs || {});
  };

  const load = async () => {
    try {
      setLoading(true);
      const [summaryData, logs] = await Promise.all([
        getEmployeeAccessSummary(employeeId),
        getRbacAuditLogs({ targetType: "employee", targetId: employeeId, limit: 25 }),
      ]);
      applySummary(summaryData);
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

  const customModules = useMemo(() => new Set(Object.keys(summary?.overrides || {})), [summary]);

  const changedModules = useMemo(
    () =>
      allLeaves
        .map((l) => l.module)
        .filter((m) => (levels[m] || "none") !== (origLevels[m] || "none") || (expiries[m] ?? null) !== (origExpiries[m] ?? null)),
    [levels, origLevels, expiries, origExpiries, allLeaves]
  );

  const changedRecords = useMemo(
    () => RECORD_SECTIONS.filter((s) => !sameRecord(records[s], origRecords[s])),
    [records, origRecords]
  );

  const changedTabs = useMemo(
    () => Object.keys(tabStates).filter((k) => tabStates[k]?.denied !== origTabStates[k]?.denied || tabStates[k]?.custom !== origTabStates[k]?.custom),
    [tabStates, origTabStates]
  );
  const tabs = useMemo(() => ({
    denied: new Set(Object.keys(tabStates).filter((k) => tabStates[k].denied)),
    custom: new Set(Object.keys(tabStates).filter((k) => tabStates[k].custom)),
    // `null` = follow their roles again; shown as on until the save reloads what the roles say.
    onSet: (key: string, allowed: boolean | null) =>
      setTabStates((prev) => ({ ...prev, [key]: allowed === null ? { denied: origTabStates[key]?.custom ? false : !!origTabStates[key]?.denied, custom: false } : { denied: !allowed, custom: true } })),
  }), [tabStates, origTabStates]);

  const dirty = changedModules.length > 0 || changedRecords.length > 0 || changedTabs.length > 0;
  const dirtyModules = useMemo(() => new Set(changedModules), [changedModules]);

  const onSetLevel = (module: string, level: EffLevel) => {
    setLevels((prev) => ({ ...prev, [module]: level }));
    if (level === "none") setExpiries((prev) => ({ ...prev, [module]: null })); // blocked carries no timer
  };
  const onResetToRole = (module: string) => {
    setLevels((prev) => ({ ...prev, [module]: roleLevelOf(module) }));
    setExpiries((prev) => ({ ...prev, [module]: null }));
  };

  // "Read all" / "Commercials" sit beside Read and Write on the Leads and Projects rows — per
  // employee only, never per role. Hidden while the section itself is blocked.
  // "Read all" / "Commercials" columns on the Leads and Projects rows — per employee only, never
  // per role. Greyed out while the section itself has no Read.
  const recordCells = useMemo(() => {
    const out: Record<string, RecordCells> = {};
    for (const section of RECORD_SECTIONS) {
      const r = records[section];
      if (!r) continue;
      const blocked = (levels[section] || "none") === "none";
      const set = (patch: Partial<RecordAccess>) => setRecords((prev) => ({ ...prev, [section]: { ...r, ...patch } }));
      out[section] = {
        readAll: {
          checked: r.readAll, disabled: blocked, onChange: () => set({ readAll: !r.readAll }),
          title: blocked ? "Give Read first" : section === "crm.leads" ? "See every assigned lead, not only their own" : "See every project, not only those whose team they are on",
        },
        commercial: {
          checked: r.commercial, disabled: blocked, onChange: () => set({ commercial: !r.commercial }),
          title: blocked ? "Give Read first" : "See values, budgets and costs",
        },
      };
    }
    return out;
  }, [records, levels]);

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
      for (const section of changedRecords) await setRecordAccess(employeeId, section, records[section]!);
      for (const key of changedTabs) {
        const [section, tab] = key.split("/");
        await setTabAccess(employeeId, section, tab, tabStates[key].custom ? !tabStates[key].denied : null);
      }
      for (const m of changedModules) {
        const send = sendLevelFor(m);
        const exp = send === "view" || send === "edit" ? expiries[m] ?? null : null;
        await setSectionAccessLevel(employeeId, m, send, exp);
      }
      toast.success("Access updated");
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Couldn't save changes");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const onSaveClick = () => {
    if (dirty) setShowConfirm(true);
  };

  if (loading) return <Loader />;
  if (!summary) return <div className="text-muted p-5">No access data.</div>;

  return (
    <div style={{ width: "100%" }} className="pb-20">
      {/* The roles this person holds — shown, not edited here (Settings -> Roles & Permissions). */}
      <div className="d-flex align-items-center flex-wrap gap-2 mb-6 mt-2">
        <span className="text-muted fw-bold fs-7 me-2" style={{ letterSpacing: 1 }}>ROLE</span>
        {(summary.roles || []).length === 0 ? (
          <span className="text-muted fs-7">No role assigned</span>
        ) : (
          (summary.roles || []).map((role) => (
            <span
              key={role.id}
              className="d-inline-flex align-items-center gap-1 rounded-pill px-3 py-1 fs-7 fw-semibold"
              style={{ color: "#1E3A8A", background: "rgba(30,58,138,0.08)", border: "1px solid rgba(30,58,138,0.2)" }}
            >
              <AppIcon name="bi-person-badge" className="fs-7" />
              {role.name}
            </span>
          ))
        )}
      </div>

      <div className="row g-5">
        {/* LEFT: Module specific access — most of the width, so a row holds 4–5 cards */}
        <div className="col-12 col-xl-9">
          <div className="text-muted fw-bold fs-7 mb-3" style={{ letterSpacing: 1 }}>MODULE SPECIFIC ACCESS</div>
          <div className="card border shadow-sm mb-8" style={{ borderRadius: 14 }}>
            <div className="card-body">
              {summary.fullAccess ? (
                <div className="text-center py-10">
                  <AppIcon name="bi-shield-lock-fill" className="fs-3x text-primary mb-3 d-block" />
                  <div className="fw-bold fs-5">Full access as Super Admin</div>
                  <div className="text-muted fs-7 mt-2">A Super Admin can see and edit every section in every organization, so per-section settings don't apply.</div>
                </div>
              ) : (
                <>
                {summary.editable === false && (
                  <div className="mb-4">
                    <InlineNotice trio={TRIO.slate} icon="lock">
                      {employeeId === currentEmployeeId
                        ? "You can't change your own access. A Super Admin sets it."
                        : "Only a Super Admin can change an Admin's access."}
                    </InlineNotice>
                  </div>
                )}
                <AccessControlTree
                  readOnly={summary.editable === false}
                  levels={levels}
                  customModules={customModules}
                  dirtyModules={dirtyModules}
                  onSetLevel={onSetLevel}
                  onResetToRole={onResetToRole}
                  recordCells={recordCells}
                  tabs={tabs}
                />
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Recent access changes — a slim, dense column */}
        <div className="col-12 col-xl-3">
          <div>
            <AccessActivity logs={auditLogs} />
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
          <AppIcon name="bi-save" className="me-2" />
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* Save confirmation */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">Save access changes?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {changedTabs.map((key) => (
            <div key={key} className="alert alert-light-primary py-2 px-3 fs-7 mb-3">
              {key.replace("/", " → ")} tab: {tabStates[key].custom ? (tabStates[key].denied ? "off" : "on") : "follow role"}.
            </div>
          ))}
          {changedRecords.map((section) => (
            <div key={section} className="alert alert-light-primary py-2 px-3 fs-7 mb-3">
              {RECORD_LABEL[section]}: read all {records[section]?.readAll ? "on" : "off"}, commercials {records[section]?.commercial ? "on" : "off"}.
            </div>
          ))}
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
            !changedRecords.length && !changedTabs.length && <p className="mb-0">No changes to save.</p>
          )}
          <div className="alert alert-warning py-2 px-3 fs-7 mb-0">
            These apply only to this employee. Sections you didn't change keep inheriting from their role.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-light" onClick={() => setShowConfirm(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveAll}>Yes, Save</button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EmployeeAccessTab;
