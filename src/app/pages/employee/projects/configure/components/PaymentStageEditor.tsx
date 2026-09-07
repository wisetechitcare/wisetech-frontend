import React, { useEffect, useRef, useState } from "react";
import { Tooltip } from "@mui/material";
import {
  getAllPaymentStageGroups,
  createPaymentStageGroup,
  updatePaymentStageGroup,
  deletePaymentStageGroup,
} from "@services/paymentStage";
import type { PaymentStageGroup } from "@models/leads";
import { apiErrorMessage } from "@utils/apiError";
import { AppIcon } from "@app/modules/common/components/ui/AppIcon";
import { C, FONT, RADIUS } from "@app/modules/configuration";

/**
 * Payment stage NUMBERING GROUPS — "1, 2, 3", "a, b, c", "Stage I, Stage II".
 *
 * A group is one complete vocabulary. A plan picks ONE and every stage in it takes its Sr
 * No from the group by position, so a plan can never be half-numbered in one vocabulary
 * and half in another.
 *
 * Edited INLINE rather than through a modal: a group is a name and a list of very short
 * strings, and a dialog per label would be three clicks to type one character. Every change
 * saves immediately, which is also why there is no Save button.
 *
 * Styled with this page's own tokens (C / FONT / RADIUS) rather than the MUI kit, because
 * the screen it sits on is built from them.
 */

const PaymentStageEditor: React.FC = () => {
  const [groups, setGroups] = useState<PaymentStageGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [labelDrafts, setLabelDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  /** `${groupId}:${index}` of the label under the cursor — reorder/remove appear only there,
   *  so four labels show four controls instead of twelve. */
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  /** Everything here is renamed in place — click the text, type, Enter or blur to save,
   *  Escape to abandon. A group name and a label are each one short string; a dialog to
   *  change "b" to "c" is three clicks of ceremony around one keystroke. */
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  /** `${groupId}:${index}` — a label is identified by its position, not its text. */
  const [editingLabelKey, setEditingLabelKey] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState("");
  const labelRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = async () => {
    try {
      const res = await getAllPaymentStageGroups();
      setGroups(res?.paymentStageGroups ?? []);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not load the numbering groups."));
    } finally {
      setLoading(false);
    }
  };

  // Once, on mount. `load` only closes over setState; including it would refetch forever.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);

  /** Every label change is a whole-array replace — the array is one ordered value. */
  const saveLabels = async (group: PaymentStageGroup, labels: string[]) => {
    setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, labels } : g)));  // paint now
    try {
      await updatePaymentStageGroup(group.id, { labels });
      setError(null);
    } catch (err) {
      await load();                                  // server is the truth; put it back
      setError(apiErrorMessage(err, "Could not save that change."));
    }
  };

  /** Rename a group. No-ops on an unchanged or emptied name rather than writing it. */
  const commitGroupName = async (group: PaymentStageGroup) => {
    const name = editingGroupName.trim();
    setEditingGroupId(null);
    if (!name || name === group.name) return;
    setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, name } : g)));
    try {
      await updatePaymentStageGroup(group.id, { name });
      setError(null);
    } catch (err) {
      await load();
      setError(apiErrorMessage(err, "Could not rename that group."));
    }
  };

  /** Rename one label in place. Position is preserved — renaming is not reordering. */
  const commitLabel = async (group: PaymentStageGroup, index: number) => {
    const label = editingLabelValue.trim();
    setEditingLabelKey(null);
    const current = group.labels[index];
    if (!label || label === current) return;
    if (group.labels.some((l, i) => i !== index && l === label)) {
      setError(`"${label}" is already in ${group.name} — every label in a group must be different.`);
      return;
    }
    await saveLabels(group, group.labels.map((l, i) => (i === index ? label : l)));
  };

  const addGroup = async () => {
    const name = newGroupName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await createPaymentStageGroup({ name, labels: [] });
      setNewGroupName("");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not create that group."));
    } finally {
      setBusy(false);
    }
  };

  const addLabel = async (group: PaymentStageGroup) => {
    const label = (labelDrafts[group.id] ?? "").trim();
    if (!label) return;
    if (group.labels.includes(label)) {
      setError(`"${label}" is already in ${group.name} — every label in a group must be different.`);
      return;
    }
    setLabelDrafts((d) => ({ ...d, [group.id]: "" }));
    await saveLabels(group, [...group.labels, label]);
    labelRefs.current[group.id]?.focus();   // typing 1↵2↵3↵ is one motion, not three
  };

  const removeLabel = (group: PaymentStageGroup, index: number) =>
    saveLabels(group, group.labels.filter((_, i) => i !== index));

  const moveLabel = (group: PaymentStageGroup, index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= group.labels.length) return;
    const next = group.labels.slice();
    [next[index], next[to]] = [next[to], next[index]];
    return saveLabels(group, next);
  };

  const removeGroup = async (group: PaymentStageGroup) => {
    try {
      const res = await deletePaymentStageGroup(group.id);
      if (res?.affectedPlans > 0) {
        setError(
          `"${group.name}" removed — ${res.affectedPlans} plan${res.affectedPlans === 1 ? "" : "s"} now numbered by position.`,
        );
      }
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not remove that group."));
    }
  };

  const input: React.CSSProperties = {
    fontFamily: FONT.body, fontSize: 13, color: C.textPrimary,
    border: `1px solid ${C.borderDark}`, borderRadius: RADIUS.sm,
    padding: "7px 10px", outline: "none", minWidth: 0,
  };

  const iconBtn = (color: string): React.CSSProperties => ({
    background: "transparent", border: "none", borderRadius: RADIUS.sm,
    padding: "3px 6px", cursor: "pointer", color,
    display: "flex", alignItems: "center", flexShrink: 0,
  });

  return (
    <div>
      {error && (
        <div style={{
          fontFamily: FONT.body, fontSize: 12.5, color: C.danger,
          background: `${C.danger}14`, border: `1px solid ${C.danger}33`,
          borderRadius: RADIUS.sm, padding: "8px 11px", marginBottom: 12,
        }}>
          {error}
        </div>
      )}

      {/* New group. First, because an empty list is the normal starting state. Sits on the
          page ground rather than in a bordered box — it is an action, not a record. */}
      <div style={{
        display: "flex", gap: 8, alignItems: "center",
        marginBottom: groups.length ? 16 : 0,
      }}>
        <input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addGroup(); } }}
          placeholder="Group name — e.g. Numeric, Alphabetic"
          aria-label="New numbering group name"
          maxLength={80}
          style={{ ...input, flex: 1 }}
        />
        <button
          onClick={() => void addGroup()}
          disabled={!newGroupName.trim() || busy}
          style={{
            fontFamily: FONT.body, fontSize: 13, fontWeight: 600,
            background: newGroupName.trim() ? C.primary : "#e5e7ef",
            color: newGroupName.trim() ? C.textInverse : C.textSecondary,
            border: "none", borderRadius: RADIUS.sm, padding: "7px 16px",
            cursor: newGroupName.trim() && !busy ? "pointer" : "default", flexShrink: 0,
          }}
        >
          Add Group
        </button>
      </div>

      {loading ? null : groups.length === 0 ? (
        <div style={{ fontFamily: FONT.body, fontSize: 12.5, color: C.textSecondary, marginTop: 12, lineHeight: 1.5 }}>
          No numbering groups yet. Until you add one, every plan numbers its stages by
          position — 1, 2, 3 in the order they are listed.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {groups.map((group) => (
            <div
              key={group.id}
              style={{
                background: C.bgCard, border: `1px solid ${C.border}`,
                borderRadius: RADIUS.lg, padding: "11px 13px",
                // A quiet left rule, matching how the page's own section cards are marked.
                borderLeft: `3px solid ${group.labels.length ? C.primary : C.border}`,
                boxShadow: C.shadowSm,
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                paddingBottom: 8, marginBottom: 10,
                borderBottom: `1px solid ${C.border}`,
              }}>
                {editingGroupId === group.id ? (
                  <input
                    autoFocus
                    value={editingGroupName}
                    onChange={(e) => setEditingGroupName(e.target.value)}
                    onBlur={() => void commitGroupName(group)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); void commitGroupName(group); }
                      if (e.key === "Escape") setEditingGroupId(null);
                    }}
                    aria-label={`Rename ${group.name}`}
                    maxLength={80}
                    style={{ ...input, flex: 1, fontWeight: 700, padding: "5px 8px" }}
                  />
                ) : (
                  <Tooltip title="Click to rename">
                    <button
                      type="button"
                      onClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name); }}
                      aria-label={`Rename ${group.name}`}
                      style={{
                        flex: 1, minWidth: 0, textAlign: "left",
                        background: "none", border: "none", padding: 0, cursor: "text",
                        fontFamily: FONT.heading, fontWeight: 700, fontSize: 14, color: C.textPrimary,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      {group.name}
                    </button>
                  </Tooltip>
                )}
                {/* Reads as "what a plan gets", not a row count. */}
                <span style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: 0.2 }}>
                  {group.labels.length === 0
                    ? "EMPTY"
                    : `NUMBERS ${group.labels.length} STAGE${group.labels.length === 1 ? "" : "S"}`}
                </span>
                <button onClick={() => void removeGroup(group)} aria-label={`Remove ${group.name}`} style={iconBtn(C.danger)}>
                  <AppIcon name="bi-trash" className="fs-8" />
                </button>
              </div>

              {/* The labels in the order stages wear them.
                  No position badge in front of each one: for a numeric group that rendered
                  "1 1", "2 2", "3 3" — the badge repeating the label it sat next to. Reading
                  order already carries the sequence, the trailing slot names the next stage
                  outright ("+ label for stage 5"), and the exact position stays available on
                  hover. Showing it a fourth time was noise. */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                {group.labels.map((label, index) => {
                  const key = `${group.id}:${index}`;
                  // Controls stay out of the way while renaming — clicking one would blur the
                  // field and act on the row in the same gesture.
                  const hot = hoverKey === key && editingLabelKey !== key;
                  return (
                    <span
                      key={key}
                      onMouseEnter={() => setHoverKey(key)}
                      onMouseLeave={() => setHoverKey((k) => (k === key ? null : k))}
                      style={{
                        display: "inline-flex", alignItems: "center",
                        background: C.bgCard,
                        border: `1px solid ${hot ? C.borderDark : C.border}`,
                        borderRadius: RADIUS.sm, overflow: "hidden",
                        boxShadow: hot ? C.shadowSm : "none",
                        transition: "border-color .12s ease, box-shadow .12s ease",
                      }}
                    >
                      {editingLabelKey === key ? (
                        <input
                          autoFocus
                          value={editingLabelValue}
                          onChange={(e) => setEditingLabelValue(e.target.value)}
                          onBlur={() => void commitLabel(group, index)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); void commitLabel(group, index); }
                            if (e.key === "Escape") setEditingLabelKey(null);
                          }}
                          aria-label={`Rename ${label}`}
                          maxLength={50}
                          // Sized to the text so the chip does not jump to a wide field.
                          size={Math.max(3, editingLabelValue.length)}
                          style={{
                            fontFamily: FONT.body, fontSize: 12.5, fontWeight: 700,
                            color: C.textPrimary, padding: "5px 8px",
                            border: "none", outline: "none", background: "transparent",
                            minWidth: 0,
                          }}
                        />
                      ) : (
                        <Tooltip title={`Numbers stage ${index + 1} — click to rename`}>
                          <button
                            type="button"
                            onClick={() => { setEditingLabelKey(key); setEditingLabelValue(label); }}
                            aria-label={`Rename ${label}, numbering stage ${index + 1}`}
                            style={{
                              fontFamily: FONT.body, fontSize: 12.5, fontWeight: 700,
                              color: C.textPrimary, padding: "5px 10px", whiteSpace: "nowrap",
                              background: "none", border: "none", cursor: "text",
                            }}
                          >
                            {label}
                          </button>
                        </Tooltip>
                      )}

                      {/* Controls only under the cursor. Always-on, four labels meant twelve
                          micro-buttons competing with the labels themselves. */}
                      <span style={{
                        display: "flex", alignItems: "center",
                        width: hot ? "auto" : 0, overflow: "hidden",
                        opacity: hot ? 1 : 0, transition: "opacity .12s ease",
                      }}>
                        <button onClick={() => void moveLabel(group, index, -1)} disabled={index === 0}
                          aria-label={`Move ${label} earlier`} tabIndex={hot ? 0 : -1}
                          style={iconBtn(index === 0 ? "#d1d5e0" : C.textSecondary)}>
                          <AppIcon name="bi-chevron-left" className="fs-9" />
                        </button>
                        <button onClick={() => void moveLabel(group, index, 1)} disabled={index === group.labels.length - 1}
                          aria-label={`Move ${label} later`} tabIndex={hot ? 0 : -1}
                          style={iconBtn(index === group.labels.length - 1 ? "#d1d5e0" : C.textSecondary)}>
                          <AppIcon name="bi-chevron-right" className="fs-9" />
                        </button>
                        <button onClick={() => void removeLabel(group, index)}
                          aria-label={`Remove ${label}`} tabIndex={hot ? 0 : -1}
                          style={{ ...iconBtn(C.danger), paddingRight: 7 }}>
                          <AppIcon name="bi-x" className="fs-8" />
                        </button>
                      </span>
                    </span>
                  );
                })}

                <input
                  ref={(el) => { labelRefs.current[group.id] = el; }}
                  value={labelDrafts[group.id] ?? ""}
                  onChange={(e) => setLabelDrafts((d) => ({ ...d, [group.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addLabel(group); } }}
                  placeholder={group.labels.length ? `+ label for stage ${group.labels.length + 1}` : "+ first label, e.g. 1"}
                  aria-label={`Add a label to ${group.name}`}
                  maxLength={50}
                  style={{
                    ...input, width: group.labels.length ? 168 : 190,
                    padding: "5px 9px", fontSize: 12.5,
                    borderStyle: "dashed", background: "transparent",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentStageEditor;
