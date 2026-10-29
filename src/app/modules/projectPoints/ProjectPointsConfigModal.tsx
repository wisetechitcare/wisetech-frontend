import { Button } from '@/ds/ui/button';
import { WtCloseButton } from '@app/modules/common/components/ui/tw/WtCloseButton';
import React, { useEffect, useState } from "react";
import { alertDialog } from "@app/modules/common/components/ui/feedback";
import {
    createProjectPointMaster,
    updateProjectPointMaster,
    type ProjectPointMaster,
    type ProjectPointFieldType,
} from "@services/projectPoints";

interface ProjectPointsConfigModalProps {
    show: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: ProjectPointMaster | null;
    isEditing?: boolean;
}

const FIELD_TYPES: ProjectPointFieldType[] = ["TEXTAREA", "TEXT", "NUMBER", "DATE", "DROPDOWN", "BOOLEAN"];

const label: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" };
const input: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8,
    fontSize: 13, fontFamily: "Inter, sans-serif", color: "#1e293b", outline: "none", background: "#fff",
};

const emptyForm = {
    title: "", defaultHeading: "", defaultDescription: "",
    fieldType: "TEXTAREA" as ProjectPointFieldType,
    isRequired: false, placeholder: "", helpText: "", isActive: true,
};

/** Add / edit a Project Point master template (Configuration → Project Points). */
const ProjectPointsConfigModal: React.FC<ProjectPointsConfigModalProps> = ({
    show, onClose, onSuccess, initialData, isEditing,
}) => {
    const [form, setForm] = useState({ ...emptyForm });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (show) {
            setForm(initialData
                ? {
                    title: initialData.title ?? "",
                    defaultHeading: initialData.defaultHeading ?? "",
                    defaultDescription: initialData.defaultDescription ?? "",
                    fieldType: (initialData.fieldType as ProjectPointFieldType) ?? "TEXTAREA",
                    isRequired: !!initialData.isRequired,
                    placeholder: initialData.placeholder ?? "",
                    helpText: initialData.helpText ?? "",
                    isActive: initialData.isActive ?? true,
                }
                : { ...emptyForm });
        }
    }, [show, initialData]);

    if (!show) return null;

    const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

    const submit = async () => {
        if (!form.title.trim()) {
            alertDialog({ icon: "warning", title: "Name required", text: "Project Point Name is required." });
            return;
        }
        try {
            setSaving(true);
            const payload = { ...form, title: form.title.trim() };
            if (isEditing && initialData?.id) {
                await updateProjectPointMaster(initialData.id, payload);
            } else {
                await createProjectPointMaster(payload);
            }
            onSuccess();
            onClose();
        } catch (e) {
            console.error("Failed to save project point master:", e);
            alertDialog({ icon: "error", title: "Save failed", text: "Could not save the project point." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div data-wt-control="backdrop"
            onClick={onClose}
            style={{
                position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 1100,
                display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
            }}
        >
            <div data-wt-control="container"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#fff", borderRadius: 14, width: "100%", maxWidth: 520,
                    boxShadow: "0 20px 60px rgba(15,23,42,.25)", fontFamily: "Inter, sans-serif",
                    maxHeight: "92vh", overflowY: "auto",
                }}
            >
                <div style={{ padding: "18px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
                        {isEditing ? "Edit Project Point" : "New Project Point"}
                    </div>
                    <WtCloseButton variant="plain" onClick={onClose} />
                </div>

                <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                        <label style={label}>Project Point Name *</label>
                        <input style={input} placeholder="e.g. Number of Floors" value={form.title}
                            onChange={(e) => set({ title: e.target.value })} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                            <label style={label}>Default Heading</label>
                            <input style={input} placeholder="e.g. Number of Floors" value={form.defaultHeading}
                                onChange={(e) => set({ defaultHeading: e.target.value })} />
                        </div>
                        <div>
                            <label style={label}>Field Type</label>
                            <select style={input} value={form.fieldType}
                                onChange={(e) => set({ fieldType: e.target.value as ProjectPointFieldType })}>
                                {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={label}>Default Description</label>
                        <textarea style={{ ...input, minHeight: 64, resize: "vertical" }} placeholder="e.g. G+10 Building"
                            value={form.defaultDescription} onChange={(e) => set({ defaultDescription: e.target.value })} />
                    </div>
                    <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#475569", cursor: "pointer" }}>
                            <input type="checkbox" checked={form.isRequired} onChange={(e) => set({ isRequired: e.target.checked })} />
                            Required
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#475569", cursor: "pointer" }}>
                            <input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} />
                            Active (shown on new forms)
                        </label>
                    </div>
                    <div style={{ fontSize: 11.5, color: "#94a3b8" }}>
                        These act only as templates/default values. Editing a lead/project never changes this master.
                    </div>
                </div>

                <div style={{ padding: "16px 22px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={submit} disabled={saving}>
                        {saving ? "Saving…" : isEditing ? "Update" : "Create"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ProjectPointsConfigModal;
