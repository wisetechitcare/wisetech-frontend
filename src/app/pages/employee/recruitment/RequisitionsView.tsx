import { useState } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Box, Stack, Typography, TextField, MenuItem, CircularProgress, DialogContent, DialogActions,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    AutoGrid, ListHeader, GlassCard, GlassDialog, GlassHeader, WtButton, WtIconButton, ToneChip,
    WtDateField, toast, confirmDialog, type SemanticTone,
} from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import {
    getRequisitions, createRequisition, updateRequisition, archiveRequisition, submitRequisitionApproval,
    getRequisitionStages,
    type JobRequisition, type RequisitionPayload,
} from "@services/recruitment";

const STATUS_META: Record<number, { label: string; tone: SemanticTone }> = {
    0: { label: "Pending", tone: "warning" },
    1: { label: "Approved", tone: "success" },
    2: { label: "Rejected", tone: "danger" },
};

const emptyForm = (): RequisitionPayload => ({
    title: "",
    jobDescription: "",
    headcount: 1,
    hiringManagerId: "",
    minCtcInLpa: null,
    maxCtcInLpa: null,
    targetStartDate: null,
    requisitionStageId: "",
});

// A requisition can be edited freely while it is still a draft; once it has been
// sent up the approval chain (status !== 0) the record is locked to keep the
// approver's snapshot honest — reopen it by resetting the approval, not by editing.
const isEditable = (r: JobRequisition) => r.status === 0;

const isConflict = (e: unknown) => axios.isAxiosError(e) && e.response?.status === 409;

const ctcLabel = (min?: number | string | null, max?: number | string | null) => {
    const lo = min == null || min === "" ? null : Number(min);
    const hi = max == null || max === "" ? null : Number(max);
    if (lo == null && hi == null) return null;
    if (lo != null && hi != null) return `₹${lo}–${hi} LPA`;
    return `₹${lo ?? hi} LPA`;
};

/** Compact, muted meta chip — packs identity/metrics into the card without stretched gaps. */
const MetaPill = ({ text }: { text: string }) => (
    <Box sx={{
        px: 0.9, py: 0.3, borderRadius: "8px", bgcolor: "action.hover",
        fontSize: 11.5, fontWeight: 600, color: "text.secondary", whiteSpace: "nowrap", lineHeight: 1.5,
    }}>
        {text}
    </Box>
);

const RequisitionsView = () => {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<JobRequisition | null>(null);
    const [form, setForm] = useState<RequisitionPayload>(emptyForm());

    const { data: requisitions = [], isLoading } = useQuery({
        queryKey: queryKeys.recruitment.requisitions(),
        queryFn: getRequisitions,
    });
    const { data: stages = [] } = useQuery({
        queryKey: queryKeys.recruitment.requisitionStages(),
        queryFn: getRequisitionStages,
    });

    const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.all });
    const close = () => { setOpen(false); setEditing(null); setForm(emptyForm()); };

    const createMut = useMutation({
        mutationFn: (payload: RequisitionPayload) => createRequisition(payload),
        onSuccess: () => { toast({ icon: "success", title: "Requisition created" }); close(); invalidate(); },
        onError: () => toast({ icon: "error", title: "Could not create requisition" }),
    });

    const updateMut = useMutation({
        mutationFn: (vars: { id: string; payload: RequisitionPayload }) => updateRequisition(vars.id, vars.payload),
        onSuccess: () => { toast({ icon: "success", title: "Requisition updated" }); close(); invalidate(); },
        onError: (e: unknown) => toast({
            icon: "error",
            title: isConflict(e) ? "This requisition changed since you opened it — reload and retry." : "Could not update requisition",
        }),
    });

    const submitMut = useMutation({
        mutationFn: (r: JobRequisition) => submitRequisitionApproval(r.id, r.hiringManagerId ? [r.hiringManagerId] : undefined),
        onSuccess: () => { toast({ icon: "success", title: "Submitted for approval" }); invalidate(); },
        onError: () => toast({ icon: "error", title: "Set a hiring manager first, then submit" }),
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => archiveRequisition(id),
        onSuccess: () => { toast({ icon: "success", title: "Requisition archived" }); invalidate(); },
        onError: () => toast({ icon: "error", title: "Could not archive requisition" }),
    });

    const openCreate = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };
    const openEdit = (r: JobRequisition) => {
        setEditing(r);
        setForm({
            title: r.title,
            jobDescription: r.jobDescription ?? "",
            headcount: r.headcount ?? 1,
            hiringManagerId: r.hiringManagerId ?? "",
            minCtcInLpa: r.minCtcInLpa == null ? null : Number(r.minCtcInLpa),
            maxCtcInLpa: r.maxCtcInLpa == null ? null : Number(r.maxCtcInLpa),
            targetStartDate: r.targetStartDate ? r.targetStartDate.slice(0, 10) : null,
            requisitionStageId: r.requisitionStageId ?? "",
        });
        setOpen(true);
    };

    const remove = async (r: JobRequisition) => {
        const ok = await confirmDialog({
            icon: "warning",
            title: "Archive requisition?",
            text: `"${r.title}" will be archived and hidden from the pipeline.`,
        });
        if (ok) deleteMut.mutate(r.id);
    };

    const canSave = !!form.title?.trim();
    const saving = createMut.isPending || updateMut.isPending;

    const save = () => {
        if (!canSave) return;
        const payload: RequisitionPayload = {
            ...form,
            headcount: form.headcount && form.headcount > 0 ? form.headcount : 1,
            jobDescription: form.jobDescription || null,
            hiringManagerId: form.hiringManagerId || null,
            requisitionStageId: form.requisitionStageId || null,
            minCtcInLpa: form.minCtcInLpa ?? null,
            maxCtcInLpa: form.maxCtcInLpa ?? null,
            targetStartDate: form.targetStartDate || null,
        };
        if (editing) updateMut.mutate({ id: editing.id, payload: { ...payload, expectedRevisionCount: editing.revisionCount } });
        else createMut.mutate(payload);
    };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1600, mx: "auto" }}>
            <ListHeader
                title="Job Requisitions"
                subtitle="Raise headcount requests, route them for approval, then publish to the careers page."
                actions={
                    <WtButton tone="primary" size="small" startIcon={<KTIcon iconName="plus" className="fs-6" />} onClick={openCreate}>
                        New requisition
                    </WtButton>
                }
            />

            {isLoading ? (
                <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>
            ) : requisitions.length === 0 ? (
                <Box
                    onClick={openCreate}
                    sx={{
                        py: 5, px: 2, borderRadius: "14px", cursor: "pointer", textAlign: "center",
                        border: "1px dashed", borderColor: "divider",
                        transition: "border-color .15s, background-color .15s",
                        "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
                    }}
                >
                    <Typography sx={{ color: "text.secondary", fontSize: 14, fontWeight: 600 }}>No requisitions yet</Typography>
                    <Typography sx={{ color: "text.disabled", fontSize: 12.5, mt: 0.25 }}>Click to create one and start the hiring pipeline.</Typography>
                </Box>
            ) : (
                <AutoGrid min={320}>
                    {requisitions.map((r) => {
                        const meta = STATUS_META[r.status] ?? STATUS_META[0];
                        const ctc = ctcLabel(r.minCtcInLpa, r.maxCtcInLpa);
                        return (
                            <GlassCard key={r.id} preset="row" interactive sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", p: 1.75 }}>
                                <Stack direction="row" alignItems="flex-start" spacing={1}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3, wordBreak: "break-word" }}>{r.title}</Typography>
                                        {r.prefix && (
                                            <Typography sx={{ fontSize: 11.5, color: "text.disabled", fontWeight: 700, letterSpacing: "0.02em", mt: 0.15 }}>{r.prefix}</Typography>
                                        )}
                                    </Box>
                                    <ToneChip tone={meta.tone} label={meta.label} dense />
                                </Stack>

                                {r.jobDescription && (
                                    <Typography sx={{
                                        fontSize: 12.5, color: "text.secondary", lineHeight: 1.5,
                                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                                    }}>
                                        {r.jobDescription}
                                    </Typography>
                                )}

                                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.25 }}>
                                    <MetaPill text={`${r.filledCount}/${r.headcount} filled`} />
                                    {r.requisitionStage?.name && <MetaPill text={r.requisitionStage.name} />}
                                    {ctc && <MetaPill text={ctc} />}
                                    {r.targetStartDate && <MetaPill text={`Starts ${new Date(r.targetStartDate).toLocaleDateString()}`} />}
                                </Stack>

                                {/* Spacer keeps the action row pinned to the bottom so tiles align in the grid. */}
                                <Box sx={{ flex: 1 }} />

                                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                                    {r.status === 0 && (
                                        <WtButton
                                            ghost size="small"
                                            startIcon={<KTIcon iconName="arrow-up" className="fs-7" />}
                                            disabled={submitMut.isPending}
                                            onClick={() => submitMut.mutate(r)}
                                            sx={{ minHeight: 32, px: 1.25 }}
                                        >
                                            Submit
                                        </WtButton>
                                    )}
                                    <Box sx={{ flex: 1 }} />
                                    <WtIconButton
                                        title={isEditable(r) ? "Edit" : "Locked — only draft requisitions can be edited"}
                                        disabled={!isEditable(r)}
                                        onClick={() => openEdit(r)}
                                        sx={{ width: 34, height: 34, borderRadius: "10px" }}
                                    >
                                        <KTIcon iconName="pencil" className="fs-5" />
                                    </WtIconButton>
                                    <WtIconButton
                                        title="Archive" color="#C0392B" onClick={() => remove(r)}
                                        sx={{ width: 34, height: 34, borderRadius: "10px" }}
                                    >
                                        <KTIcon iconName="trash" className="fs-5" />
                                    </WtIconButton>
                                </Stack>
                            </GlassCard>
                        );
                    })}
                </AutoGrid>
            )}

            <GlassDialog
                open={open}
                onClose={close}
                maxWidth="sm"
                header={
                    <GlassHeader
                        title={editing ? "Edit Requisition" : "New Requisition"}
                        subtitle={editing ? (editing.prefix ?? "Update this headcount request") : "Raise a headcount request"}
                        icon={<KTIcon iconName="questionnaire-tablet" className="fs-2" />}
                        onClose={close}
                    />
                }
            >
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Title" required fullWidth size="small"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                        />
                        <TextField
                            label="Job description" fullWidth multiline minRows={3} size="small"
                            value={form.jobDescription ?? ""}
                            onChange={(e) => setForm({ ...form, jobDescription: e.target.value })}
                        />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                label="Headcount" type="number" size="small" sx={{ flex: 1 }}
                                inputProps={{ min: 1 }}
                                value={form.headcount ?? 1}
                                onChange={(e) => setForm({ ...form, headcount: Number(e.target.value) || 1 })}
                            />
                            <WtDateField
                                label="Target start date"
                                sx={{ flex: 1 }}
                                value={form.targetStartDate}
                                onChange={(v) => setForm({ ...form, targetStartDate: v || null })}
                            />
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                label="Min CTC (LPA)" type="number" size="small" sx={{ flex: 1 }}
                                value={form.minCtcInLpa ?? ""}
                                onChange={(e) => setForm({ ...form, minCtcInLpa: e.target.value === "" ? null : Number(e.target.value) })}
                            />
                            <TextField
                                label="Max CTC (LPA)" type="number" size="small" sx={{ flex: 1 }}
                                value={form.maxCtcInLpa ?? ""}
                                onChange={(e) => setForm({ ...form, maxCtcInLpa: e.target.value === "" ? null : Number(e.target.value) })}
                            />
                        </Stack>
                        {stages.length > 0 && (
                            <TextField
                                label="Stage" select size="small" fullWidth
                                value={form.requisitionStageId ?? ""}
                                onChange={(e) => setForm({ ...form, requisitionStageId: e.target.value || null })}
                            >
                                <MenuItem value="">— Default —</MenuItem>
                                {stages.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                            </TextField>
                        )}
                        <TextField
                            label="Hiring manager (employee ID)" fullWidth size="small"
                            helperText="Used as the approver when you submit for approval."
                            value={form.hiringManagerId ?? ""}
                            onChange={(e) => setForm({ ...form, hiringManagerId: e.target.value })}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <WtButton ghost onClick={close}>Cancel</WtButton>
                    <WtButton tone="primary" disabled={!canSave || saving} onClick={save}>
                        {editing ? (updateMut.isPending ? "Saving…" : "Save changes") : (createMut.isPending ? "Creating…" : "Create")}
                    </WtButton>
                </DialogActions>
            </GlassDialog>
        </Box>
    );
};

export default RequisitionsView;
