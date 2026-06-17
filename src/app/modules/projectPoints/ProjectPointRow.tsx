import React from "react";
import type { ProjectPointValue } from "@services/projectPoints";

interface ProjectPointRowProps {
    row: ProjectPointValue;
    index: number;
    total: number;
    onChange: (patch: Partial<ProjectPointValue>) => void;
    onRemove: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    disabled?: boolean;
}

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 13,
    fontFamily: "Inter, sans-serif",
    color: "#1e293b",
    outline: "none",
    background: "#fff",
};

const iconBtn = (color: string, dim = false): React.CSSProperties => ({
    background: "transparent",
    border: "none",
    cursor: dim ? "not-allowed" : "pointer",
    color,
    opacity: dim ? 0.3 : 0.75,
    padding: "4px 6px",
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    fontSize: 13,
});

/**
 * A single editable Project Point row (heading + description) with reorder/remove controls.
 * Custom (non-master) rows are tagged so users can tell them apart from template rows.
 */
const ProjectPointRow: React.FC<ProjectPointRowProps> = ({
    row, index, total, onChange, onRemove, onMoveUp, onMoveDown, disabled,
}) => {
    const isCustom = !row.pointMasterId;
    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "28px 1fr 1.4fr 64px",
                gap: 10,
                alignItems: "start",
                padding: "10px 0",
                borderBottom: "1px dashed #eef1f5",
            }}
        >
            {/* Order / drag affordance */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>{index + 1}</span>
                <i className="bi bi-grip-vertical" style={{ color: "#cbd5e1", fontSize: 14 }} />
            </div>

            {/* Heading */}
            <div>
                <input
                    style={inputStyle}
                    placeholder="Heading"
                    value={row.heading ?? ""}
                    disabled={disabled}
                    onChange={(e) => onChange({ heading: e.target.value })}
                />
                {isCustom && (
                    <span style={{ fontSize: 10.5, color: "#a855f7", fontWeight: 600, marginLeft: 2 }}>
                        Custom point
                    </span>
                )}
            </div>

            {/* Description */}
            <div>
                <input
                    style={inputStyle}
                    placeholder="Description"
                    value={row.description ?? ""}
                    disabled={disabled}
                    onChange={(e) => onChange({ description: e.target.value })}
                />
            </div>

            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2, paddingTop: 4 }}>
                <button type="button" title="Move up" style={iconBtn("#64748b", index === 0)}
                    disabled={disabled || index === 0} onClick={onMoveUp}>
                    <i className="bi bi-arrow-up" />
                </button>
                <button type="button" title="Move down" style={iconBtn("#64748b", index === total - 1)}
                    disabled={disabled || index === total - 1} onClick={onMoveDown}>
                    <i className="bi bi-arrow-down" />
                </button>
                <button type="button" title="Remove" style={iconBtn("#ef4444")}
                    disabled={disabled} onClick={onRemove}>
                    <i className="bi bi-trash" />
                </button>
            </div>
        </div>
    );
};

export default ProjectPointRow;
