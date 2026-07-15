import React from "react";
import type { ProjectPointValue } from "@services/projectPoints";
import ProjectPointRow from "./ProjectPointRow";

interface ProjectPointsSectionProps {
    /** Current rows (controlled). */
    value: ProjectPointValue[];
    onChange: (rows: ProjectPointValue[]) => void;
    disabled?: boolean;
    /** Optional heading shown above the rows. */
    title?: string;
}

/**
 * Dynamic, reorderable list of Project Points used inside the Lead/Project form.
 * Replaces the legacy hardcoded "Other Point 1/2/3" fields. Pure controlled component —
 * the parent form owns the array and persists it on save. Editing here never touches masters.
 */
const ProjectPointsSection: React.FC<ProjectPointsSectionProps> = ({
    value, onChange, disabled, title = "Project Points",
}) => {
    const rows = value || [];

    const patchRow = (idx: number, patch: Partial<ProjectPointValue>) => {
        const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
        onChange(next);
    };

    const removeRow = (idx: number) => {
        const next = rows.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sortOrder: i }));
        onChange(next);
    };

    const move = (idx: number, dir: -1 | 1) => {
        const target = idx + dir;
        if (target < 0 || target >= rows.length) return;
        const next = [...rows];
        [next[idx], next[target]] = [next[target], next[idx]];
        onChange(next.map((r, i) => ({ ...r, sortOrder: i })));
    };

    const addCustom = () => {
        onChange([
            ...rows,
            { pointMasterId: null, heading: "", description: "", sortOrder: rows.length },
        ]);
    };

    return (
        <div>
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 4, flexWrap: "wrap", gap: 8,
            }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{title}</div>
                <button
                    type="button"
                    onClick={addCustom}
                    disabled={disabled}
                    style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: "#fff", border: "1px solid #d1d5e0", borderRadius: 8,
                        padding: "6px 12px", fontSize: 12.5, fontWeight: 600, color: "#1E3A8A",
                        cursor: disabled ? "not-allowed" : "pointer",
                    }}
                >
                    <i className="bi bi-plus-lg" /> Add Point
                </button>
            </div>

            {/* Column headers */}
            {rows.length > 0 && (
                <div style={{
                    display: "grid", gridTemplateColumns: "28px 1fr 1.4fr 64px", gap: 10,
                    padding: "2px 0", fontSize: 11.5, fontWeight: 600, color: "#94a3b8",
                }}>
                    <span />
                    <span>Heading</span>
                    <span>Description</span>
                    <span />
                </div>
            )}

            {rows.length === 0 ? (
                <div style={{
                    textAlign: "center", padding: "18px", color: "#94a3b8",
                    fontSize: 12.5, border: "1px dashed #e2e8f0", borderRadius: 8,
                }}>
                    No project points. Click “Add Point” to add one.
                </div>
            ) : (
                rows.map((row, idx) => (
                    <ProjectPointRow
                        key={row.id || row.pointMasterId || `row-${idx}`}
                        row={row}
                        index={idx}
                        total={rows.length}
                        disabled={disabled}
                        onChange={(patch) => patchRow(idx, patch)}
                        onRemove={() => removeRow(idx)}
                        onMoveUp={() => move(idx, -1)}
                        onMoveDown={() => move(idx, 1)}
                    />
                ))
            )}
        </div>
    );
};

export default ProjectPointsSection;
