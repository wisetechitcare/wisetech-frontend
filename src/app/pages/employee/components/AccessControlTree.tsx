import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@redux/store";
import { SegmentedControl } from "@app/modules/common/components/ui";
import { getUserTablePreferences, upsertUserTablePreferences } from "@services/users";
import AccessControlTable from "./AccessControlTable";
import AccessControlCards from "./AccessControlCards";
import type { AccessControlProps } from "./accessControlTypes";

export type { EffLevel, RecordCells } from "./accessControlTypes";

type View = "table" | "cards";
const VIEWS = [
  { value: "table", label: "Table" },
  { value: "cards", label: "Cards" },
] as const;

// Stored with the person's other view preferences on the server, so it follows them to any device;
// mirrored locally only so the first paint is already their view.
const PREF_KEY = "AccessControlView";
const localKey = (employeeId: string) => `wt:${PREF_KEY}:${employeeId}`;
const readLocal = (employeeId?: string): View | null => {
  try { return employeeId ? (localStorage.getItem(localKey(employeeId)) as View | null) : null; } catch { return null; }
};

/**
 * The access editor: the same sections and controls as a table or as cards — whichever the
 * signed-in person picked last. Used by the employee Access tab and Roles & Permissions alike.
 */
const AccessControlTree: React.FC<AccessControlProps> = (props) => {
  const employeeId = useSelector((s: RootState) => s.employee.currentEmployee?.id) as string | undefined;
  const [view, setView] = useState<View>(() => readLocal(employeeId) ?? "table");

  useEffect(() => {
    if (!employeeId) return;
    let live = true;
    getUserTablePreferences(employeeId, PREF_KEY)
      .then((r) => {
        const saved = r?.data?.preferences?.view;
        if (live && (saved === "table" || saved === "cards")) setView(saved);
      })
      .catch(() => { /* no saved choice yet: keep the default */ });
    return () => { live = false; };
  }, [employeeId]);

  const choose = (next: View) => {
    setView(next);
    if (!employeeId) return;
    try { localStorage.setItem(localKey(employeeId), next); } catch { /* storage blocked: the server copy still holds */ }
    upsertUserTablePreferences(employeeId, PREF_KEY, { view: next }).catch(() => { /* kept for this session */ });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <SegmentedControl options={VIEWS} value={view} onChange={choose} ariaLabel="Access view" />
      </div>
      {view === "cards" ? <AccessControlCards {...props} /> : <AccessControlTable {...props} />}
    </div>
  );
};

export default AccessControlTree;
