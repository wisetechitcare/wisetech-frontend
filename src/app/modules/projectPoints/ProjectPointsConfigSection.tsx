import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { IconButton, Tooltip } from "@mui/material";
import { ConfigSectionCard, ConfigSettingsRow, C, ICON_COLORS } from "@app/modules/configuration";
import { deleteConfirmation } from "@utils/modal";
import {
    getAllProjectPointMasters,
    deleteProjectPointMaster,
    updateProjectPointMaster,
    reorderProjectPointMasters,
    type ProjectPointMaster,
} from "@services/projectPoints";
import ProjectPointsConfigModal from "./ProjectPointsConfigModal";
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';

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
                <div style={{ textAlign: "center", padding: "40px 16px", color: C.textMuted, fontSize: 13 }}>
                    <AppIcon name="bi-inbox" className="fs-2qx" style={{ display: "block", marginBottom: 12, opacity: 0.4 }} />
                    No project points configured yet
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {points.map((p, idx) => (
                        <ConfigSettingsRow
                            key={p.id}
                            label={p.title}
                            description={p.defaultHeading || p.defaultDescription ? `${p.defaultHeading || p.title}${p.defaultDescription ? ` — ${p.defaultDescription}` : ""}` : undefined}
                            icon="bi-diagram-3"
                            iconColor="teal"
                            value={`#${idx + 1}`}
                            active={p.isActive}
                            disabled={!p.isActive}
                            rightContent={
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <Tooltip title="Move up">
                                        <button
                                            disabled={idx === 0}
                                            onClick={() => move(idx, -1)}
                                            style={coloredActionBtn("#0891b2", idx === 0)}
                                        >
                                            <AppIcon name="bi-arrow-up" className="fs-6" />
                                        </button>
                                    </Tooltip>
                                    <Tooltip title="Move down">
                                        <button
                                            disabled={idx === points.length - 1}
                                            onClick={() => move(idx, 1)}
                                            style={coloredActionBtn("#0891b2", idx === points.length - 1)}
                                        >
                                            <AppIcon name="bi-arrow-down" className="fs-6" />
                                        </button>
                                    </Tooltip>
                                    <Tooltip title={p.isActive ? "Click to disable" : "Click to enable"}>
                                        <button
                                            onClick={() => toggleActive(p)}
                                            style={coloredActionBtn(p.isActive ? "#059669" : "#ef4444")}
                                        >
                                            <AppIcon name={p.isActive ? "bi-eye" : "bi-eye-slash"} className="fs-6" />
                                        </button>
                                    </Tooltip>
                                    <Tooltip title="Edit">
                                        <button
                                            onClick={() => openEdit(p)}
                                            style={coloredActionBtn("#2563eb")}
                                        >
                                            <AppIcon name="bi-pencil" className="fs-6" />
                                        </button>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                        <button
                                            onClick={() => handleDelete(p)}
                                            style={coloredActionBtn("#ef4444")}
                                        >
                                            <AppIcon name="bi-trash" className="fs-6" />
                                        </button>
                                    </Tooltip>
                                </div>
                            }
                        />
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

const coloredActionBtn = (color: string, disabled = false): React.CSSProperties => ({
    background: disabled ? "#f1f5f9" : `${color}14`,
    border: `1px solid ${disabled ? "#e2e8f0" : `${color}2a`}`,
    color: disabled ? "#cbd5e1" : color,
    cursor: disabled ? "not-allowed" : "pointer",
    padding: "8px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
    opacity: disabled ? 0.5 : 1,
});

export default ProjectPointsConfigSection;
