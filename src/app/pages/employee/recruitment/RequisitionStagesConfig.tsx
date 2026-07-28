import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Box, Stack, Typography, Button, TextField, Chip, IconButton, CircularProgress,
    FormControlLabel, Checkbox,
} from "@mui/material";
import { toast, confirmDialog } from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import {
    getRequisitionStages, createRequisitionStage, deleteRequisitionStage,
    type RequisitionStagePayload,
} from "@services/recruitment";

const emptyStage: RequisitionStagePayload = {
    name: "",
    color: "#4B5563",
    isOpenTrigger: false,
    isTerminal: false,
};

/**
 * Requisition-stage master editor (Configure tab). Phase 1: list + add + delete.
 * Requires recruitment.manage.all on the backend, so non-admins simply see the
 * list read-only (mutations 403). Stage ordering / edit is a later refinement.
 */
const RequisitionStagesConfig = () => {
    const qc = useQueryClient();
    const [form, setForm] = useState<RequisitionStagePayload>(emptyStage);

    const { data: stages = [], isLoading } = useQuery({
        queryKey: queryKeys.recruitment.requisitionStages(),
        queryFn: getRequisitionStages,
    });

    const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.requisitionStages() });

    const createMut = useMutation({
        mutationFn: (payload: RequisitionStagePayload) => createRequisitionStage(payload),
        onSuccess: () => {
            toast({ icon: "success", title: "Stage added" });
            setForm(emptyStage);
            invalidate();
        },
        onError: () => toast({ icon: "error", title: "Could not add stage (admin permission required)" }),
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => deleteRequisitionStage(id),
        onSuccess: () => { toast({ icon: "success", title: "Stage removed" }); invalidate(); },
        onError: () => toast({ icon: "error", title: "Could not remove stage" }),
    });

    const remove = async (id: string, name: string) => {
        const confirmed = await confirmDialog({ icon: "warning", title: "Remove stage?", text: `"${name}" will be deactivated.` });
        if (confirmed) deleteMut.mutate(id);
    };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography sx={{ fontWeight: 700, fontSize: 18, mb: 2 }}>Requisition Stages</Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} sx={{ mb: 3, flexWrap: "wrap" }}>
                <TextField
                    label="Stage name" size="small" sx={{ minWidth: 200 }}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <TextField
                    label="Color" type="color" size="small" sx={{ width: 90 }}
                    value={form.color ?? "#4B5563"}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
                <FormControlLabel
                    control={<Checkbox checked={!!form.isOpenTrigger} onChange={(e) => setForm({ ...form, isOpenTrigger: e.target.checked })} />}
                    label="Opens headcount"
                />
                <FormControlLabel
                    control={<Checkbox checked={!!form.isTerminal} onChange={(e) => setForm({ ...form, isTerminal: e.target.checked })} />}
                    label="Terminal"
                />
                <Button
                    variant="contained"
                    disabled={!form.name.trim() || createMut.isPending}
                    onClick={() => createMut.mutate(form)}
                >
                    Add stage
                </Button>
            </Stack>

            {isLoading ? (
                <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} /></Stack>
            ) : stages.length === 0 ? (
                <Box sx={{ color: "text.secondary" }}>No stages configured yet.</Box>
            ) : (
                <Stack spacing={1}>
                    {stages.map((s) => (
                        <Stack key={s.id} direction="row" alignItems="center" spacing={1.5}
                            sx={{ p: 1.25, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: s.color ?? "#888" }} />
                            <Typography sx={{ fontWeight: 600, flex: 1 }}>{s.name}</Typography>
                            {s.isOpenTrigger && <Chip size="small" label="Opens headcount" color="success" variant="outlined" />}
                            {s.isTerminal && <Chip size="small" label="Terminal" color="default" variant="outlined" />}
                            <IconButton size="small" onClick={() => remove(s.id, s.name)} aria-label="Remove stage">
                                <i className="bi bi-trash" />
                            </IconButton>
                        </Stack>
                    ))}
                </Stack>
            )}
        </Box>
    );
};

export default RequisitionStagesConfig;
