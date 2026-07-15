import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { ConfigSectionCard } from "@app/modules/configuration";
import { deleteConfirmation } from "@utils/modal";
import {
    getAllProjectPointMasters,
    deleteProjectPointMaster,
    updateProjectPointMaster,
    reorderProjectPointMasters,
    type ProjectPointMaster,
} from "@services/projectPoints";
import ProjectPointsConfigModal from "./ProjectPointsConfigModal";

/**
 * Configuration → Project Points. Self-contained card: list + add/edit/delete +
 * enable/disable + reorder (move up/down, persisted). Drop into the config page.
 */
const ProjectPointsConfigSection: React.FC = () => {
    const [points, setPoints] = useState<ProjectPointMaster[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<ProjectPointMaster | null>(null);

    const fetchPoints = async () => {
        try {
            setLoading(true);
            const res = await getAllProjectPointMasters();
            if (res?.points) setPoints(res.points);
        } catch (e) {
            console.error("Error fetching project points:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPoints(); }, []);

    const openAdd = () => { setEditing(null); setShowModal(true); };
    const openEdit = (p: ProjectPointMaster) => { setEditing(p); setShowModal(true); };

    const handleDelete = async (p: ProjectPointMaster) => {
        const confirmed = await deleteConfirmation("Project point deleted successfully");
        if (!confirmed) return;
        try {
            await deleteProjectPointMaster(p.id);
            fetchPoints();
        } catch (e) {
            console.error("Error deleting project point:", e);
            Swal.fire({ icon: "error", title: "Delete failed", confirmButtonColor: "#1E3A8A" });
        }
    };

    const toggleActive = async (p: ProjectPointMaster) => {
        try {
            await updateProjectPointMaster(p.id, { isActive: !p.isActive });
            fetchPoints();
        } catch (e) {
            console.error("Error toggling project point:", e);
        }
    };

    const move = async (idx: number, dir: -1 | 1) => {
        const target = idx + dir;
        if (target < 0 || target >= points.length) return;
        const next = [...points];
        [next[idx], next[target]] = [next[target], next[idx]];
        setPoints(next); // optimistic
        try {
            await reorderProjectPointMasters(next.map((p) => p.id));
        } catch (e) {
            console.error("Error reordering project points:", e);
            fetchPoints();
        }
    };

    return (
        <ConfigSectionCard
            title="Project Points"
            description="Reusable templates that auto-populate the Project Details section on new leads and projects."
            icon="bi-list-check"
            iconColor="teal"
            primaryAction={{ label: "New Project Point", icon: "bi-plus-lg", onClick: openAdd, variant: "primary" }}
            loading={loading}
        >
            {points.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 16px", color: "#94a3b8", fontSize: 13 }}>
                    <i className="bi bi-inbox" style={{ fontSize: 28, display: "block", marginBottom: 8, opacity: 0.4 }} />
                    No project points configured yet
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
                    {points.map((p, idx) => (
                        <div key={p.id} style={{
                            display: "grid", gridTemplateColumns: "24px 1fr auto", gap: 12, alignItems: "center",
                            padding: "10px 12px", borderBottom: "1px solid #f1f5f9",
                            background: p.isActive ? "#fff" : "#fafafa", opacity: p.isActive ? 1 : 0.7,
                        }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#cbd5e1", textAlign: "center" }}>{idx + 1}</span>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b" }}>{p.title}</span>
                                    <span style={{
                                        fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10,
                                        background: p.isActive ? "#ecfdf5" : "#f1f5f9", color: p.isActive ? "#059669" : "#94a3b8",
                                    }}>{p.isActive ? "ACTIVE" : "DISABLED"}</span>
                                </div>
                                <div style={{ fontSize: 11.5, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {(p.defaultHeading || p.title)}{p.defaultDescription ? ` — ${p.defaultDescription}` : ""}
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <button type="button" title="Move up" disabled={idx === 0} onClick={() => move(idx, -1)}
                                    style={iconBtn("#64748b", idx === 0)}><i className="bi bi-arrow-up" /></button>
                                <button type="button" title="Move down" disabled={idx === points.length - 1} onClick={() => move(idx, 1)}
                                    style={iconBtn("#64748b", idx === points.length - 1)}><i className="bi bi-arrow-down" /></button>
                                <button type="button" title={p.isActive ? "Disable" : "Enable"} onClick={() => toggleActive(p)}
                                    style={iconBtn(p.isActive ? "#059669" : "#94a3b8")}>
                                    <i className={p.isActive ? "bi bi-toggle-on" : "bi bi-toggle-off"} />
                                </button>
                                <button type="button" title="Edit" onClick={() => openEdit(p)} style={iconBtn("#4f82c4")}><i className="bi bi-pencil" /></button>
                                <button type="button" title="Delete" onClick={() => handleDelete(p)} style={iconBtn("#ef4444")}><i className="bi bi-trash" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ProjectPointsConfigModal
                show={showModal}
                onClose={() => { setShowModal(false); setEditing(null); }}
                onSuccess={fetchPoints}
                initialData={editing}
                isEditing={!!editing}
            />
        </ConfigSectionCard>
    );
};

const iconBtn = (color: string, dim = false): React.CSSProperties => ({
    background: "transparent", border: "none", cursor: dim ? "not-allowed" : "pointer",
    color, opacity: dim ? 0.3 : 0.8, padding: "5px 7px", borderRadius: 6, fontSize: 14,
});

export default ProjectPointsConfigSection;
