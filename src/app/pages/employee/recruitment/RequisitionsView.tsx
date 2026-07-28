import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Box, Stack, Typography, Button, Table, TableHead, TableBody, TableRow, TableCell,
    TextField, Chip, CircularProgress, DialogContent, DialogActions,
} from "@mui/material";
import { GlassDialog, GlassHeader, toast } from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import {
    getRequisitions, createRequisition, submitRequisitionApproval,
    type JobRequisition, type RequisitionPayload,
} from "@services/recruitment";

const STATUS_META: Record<number, { label: string; color: "warning" | "success" | "error" }> = {
    0: { label: "Pending", color: "warning" },
    1: { label: "Approved", color: "success" },
    2: { label: "Rejected", color: "error" },
};

const emptyForm: RequisitionPayload = {
    title: "",
    jobDescription: "",
    headcount: 1,
    hiringManagerId: "",
    minCtcInLpa: null,
    maxCtcInLpa: null,
    targetStartDate: null,
};

const RequisitionsView = () => {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<RequisitionPayload>(emptyForm);

    const { data: requisitions = [], isLoading } = useQuery({
        queryKey: queryKeys.recruitment.requisitions(),
        queryFn: getRequisitions,
    });

    const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.all });

    const createMut = useMutation({
        mutationFn: (payload: RequisitionPayload) => createRequisition(payload),
        onSuccess: () => {
            toast({ icon: "success", title: "Requisition created" });
            setOpen(false);
            setForm(emptyForm);
            invalidate();
        },
        onError: () => toast({ icon: "error", title: "Could not create requisition" }),
    });

    const submitMut = useMutation({
        mutationFn: (r: JobRequisition) => submitRequisitionApproval(r.id, r.hiringManagerId ? [r.hiringManagerId] : undefined),
        onSuccess: () => {
            toast({ icon: "success", title: "Submitted for approval" });
            invalidate();
        },
        onError: () => toast({ icon: "error", title: "Set a hiring manager first, then submit" }),
    });

    const canSave = !!form.title?.trim();

    const save = () => {
        if (!canSave) return;
        createMut.mutate({
            ...form,
            jobDescription: form.jobDescription || null,
            hiringManagerId: form.hiringManagerId || null,
            minCtcInLpa: form.minCtcInLpa ?? null,
            maxCtcInLpa: form.maxCtcInLpa ?? null,
            targetStartDate: form.targetStartDate || null,
        });
    };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 18 }}>Job Requisitions</Typography>
                <Button variant="contained" startIcon={<i className="bi bi-plus-lg" />} onClick={() => setOpen(true)}>
                    New Requisition
                </Button>
            </Stack>

            {isLoading ? (
                <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>
            ) : requisitions.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
                    No requisitions yet. Create one to start the hiring pipeline.
                </Box>
            ) : (
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Ref</TableCell>
                            <TableCell>Title</TableCell>
                            <TableCell align="center">Headcount</TableCell>
                            <TableCell>Stage</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {requisitions.map((r) => {
                            const meta = STATUS_META[r.status] ?? STATUS_META[0];
                            return (
                                <TableRow key={r.id} hover>
                                    <TableCell>{r.prefix ?? "—"}</TableCell>
                                    <TableCell>{r.title}</TableCell>
                                    <TableCell align="center">{r.filledCount}/{r.headcount}</TableCell>
                                    <TableCell>{r.requisitionStage?.name ?? "—"}</TableCell>
                                    <TableCell><Chip size="small" label={meta.label} color={meta.color} /></TableCell>
                                    <TableCell align="right">
                                        {r.status === 0 && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                disabled={submitMut.isPending}
                                                onClick={() => submitMut.mutate(r)}
                                            >
                                                Submit for approval
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            )}

            <GlassDialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="sm"
                header={<GlassHeader title="New Requisition" subtitle="Raise a headcount request" icon={<i className="bi bi-briefcase" />} onClose={() => setOpen(false)} />}
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
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Headcount" type="number" size="small" sx={{ flex: 1 }}
                                value={form.headcount ?? 1}
                                onChange={(e) => setForm({ ...form, headcount: Number(e.target.value) || 1 })}
                            />
                            <TextField
                                label="Target start date" type="date" size="small" sx={{ flex: 1 }}
                                InputLabelProps={{ shrink: true }}
                                value={form.targetStartDate ?? ""}
                                onChange={(e) => setForm({ ...form, targetStartDate: e.target.value || null })}
                            />
                        </Stack>
                        <Stack direction="row" spacing={2}>
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
                        <TextField
                            label="Hiring manager (employee ID)" fullWidth size="small"
                            helperText="Used as the approver when you submit for approval."
                            value={form.hiringManagerId ?? ""}
                            onChange={(e) => setForm({ ...form, hiringManagerId: e.target.value })}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button variant="contained" disabled={!canSave || createMut.isPending} onClick={save}>
                        {createMut.isPending ? "Creating…" : "Create"}
                    </Button>
                </DialogActions>
            </GlassDialog>
        </Box>
    );
};

export default RequisitionsView;
