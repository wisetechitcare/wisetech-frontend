import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Stack, Typography, TextField, DialogContent, DialogActions, CircularProgress } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    GlassCard, GlassDialog, GlassHeader, WtButton, WtIconButton, WtSwitchField,
    IconBox, ToneChip, TRIO, toast, confirmDialog,
} from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import {
    getScorecardTemplates, createScorecardTemplate, updateScorecardTemplate, deleteScorecardTemplate,
    type ScorecardTemplate, type ScorecardTemplatePayload,
} from "@services/recruitment";

/** One editable criterion. `key` is local only — the API assigns real ids on save. */
interface FactorDraft {
    key: string;
    label: string;
    weight: number;
}

const newFactor = (): FactorDraft => ({ key: Math.random().toString(36).slice(2), label: "", weight: 1 });

const toDrafts = (t: ScorecardTemplate | null): FactorDraft[] =>
    t?.factors?.length
        ? t.factors.map((f) => ({ key: f.id, label: f.label, weight: Number(f.weight) || 1 }))
        : [newFactor()];

/**
 * Scorecard templates — the interview rubric.
 *
 * A template is a named set of weighted criteria, optionally tied to a designation. A
 * panelist scoring an interview sees the template for that requisition's designation, or
 * the default. Until this screen existed the rubric could only be created through the API,
 * so every interview recorded one overall number regardless of what HR actually assesses.
 *
 * Factors are sent whole on save — the API replaces the set rather than diffing it, because
 * a rubric is "these are the criteria now" and a diff would have to guess whether a renamed
 * label is the same criterion or a new one. Scores already submitted keep their own copy, so
 * editing a template never rewrites a scorecard someone already filled in.
 */
const ScorecardTemplateSection = () => {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<ScorecardTemplate | null>(null);
    const [name, setName] = useState("");
    const [isDefault, setIsDefault] = useState(false);
    const [factors, setFactors] = useState<FactorDraft[]>([newFactor()]);

    const { data: templates = [], isLoading } = useQuery({
        queryKey: queryKeys.recruitment.scorecardTemplates(),
        queryFn: getScorecardTemplates,
    });

    const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.scorecardTemplates() });

    const payload = (): ScorecardTemplatePayload => ({
        name: name.trim(),
        isDefault,
        // Blank rows are the natural residue of an "add row" button; drop them rather than
        // saving criteria with no name.
        factors: factors
            .filter((f) => f.label.trim())
            .map((f, i) => ({ label: f.label.trim(), weight: f.weight || 1, sortOrder: i })),
    });

    const saveMut = useMutation({
        mutationFn: () => (editing ? updateScorecardTemplate(editing.id, payload()) : createScorecardTemplate(payload())),
        onSuccess: () => {
            toast({ icon: "success", title: editing ? "Template updated" : "Template created" });
            setOpen(false);
            invalidate();
        },
        onError: () => toast({ icon: "error", title: "Could not save the template" }),
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => deleteScorecardTemplate(id),
        onSuccess: () => { toast({ icon: "success", title: "Template removed" }); invalidate(); },
        onError: () => toast({ icon: "error", title: "Could not remove the template" }),
    });

    const openNew = () => {
        setEditing(null);
        setName("");
        setIsDefault(templates.length === 0); // the first template is the obvious default
        setFactors([newFactor()]);
        setOpen(true);
    };

    const openEdit = (t: ScorecardTemplate) => {
        setEditing(t);
        setName(t.name);
        setIsDefault(t.isDefault);
        setFactors(toDrafts(t));
        setOpen(true);
    };

    const remove = async (t: ScorecardTemplate) => {
        const ok = await confirmDialog({
            icon: "warning",
            title: `Remove "${t.name}"?`,
            text: "Scorecards already submitted keep the scores they recorded against it.",
        });
        if (ok) deleteMut.mutate(t.id);
    };

    const setFactorAt = (key: string, patch: Partial<FactorDraft>) =>
        setFactors((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

    const canSave = Boolean(name.trim()) && factors.some((f) => f.label.trim()) && !saveMut.isPending;

    return (
        <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
                <IconBox icon="questionnaire-tablet" trio={TRIO.amber} size={36} fs="fs-3" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: { xs: 14.5, sm: 15.5 }, lineHeight: 1.3 }}>
                        Interview Scorecards
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, lineHeight: 1.45, color: "text.secondary", mt: 0.25 }}>
                        The criteria a panelist rates. Weights are relative — the panel score normalises by their total.
                    </Typography>
                </Box>
                <WtButton
                    tone="primary" size="small" onClick={openNew}
                    sx={{ flexShrink: 0, minHeight: 36, px: { xs: 1.5, sm: 2 }, fontSize: 13, borderRadius: "10px", alignSelf: "flex-start" }}
                >
                    New
                </WtButton>
            </Stack>

            {isLoading ? (
                <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={22} /></Stack>
            ) : templates.length === 0 ? (
                <Typography sx={{ fontSize: 13, color: "text.secondary", py: 2 }}>
                    No scorecard yet — every interview records a single overall rating. Add one to capture the
                    criteria your panel actually assesses.
                </Typography>
            ) : (
                <Stack spacing={1}>
                    {templates.map((t) => (
                        <Stack
                            key={t.id}
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{ p: 1.25, borderRadius: "10px", bgcolor: "action.hover", minWidth: 0 }}
                        >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" useFlexGap>
                                    <Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>{t.name}</Typography>
                                    {t.isDefault && <ToneChip tone="success" label="Default" dense />}
                                </Stack>
                                <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.25 }}>
                                    {t.factors.length
                                        ? t.factors.map((f) => f.label).join(" · ")
                                        : "No criteria — records an overall rating only"}
                                </Typography>
                            </Box>
                            <WtIconButton title="Edit" onClick={() => openEdit(t)} sx={{ width: 32, height: 32, borderRadius: "9px" }}>
                                <KTIcon iconName="pencil" className="fs-5" />
                            </WtIconButton>
                            <WtIconButton title="Remove" color="#C0392B" onClick={() => remove(t)} sx={{ width: 32, height: 32, borderRadius: "9px" }}>
                                <KTIcon iconName="trash" className="fs-5" />
                            </WtIconButton>
                        </Stack>
                    ))}
                </Stack>
            )}

            <GlassDialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="sm"
                header={
                    <GlassHeader
                        title={editing ? `Edit ${editing.name}` : "New scorecard"}
                        subtitle="Criteria a panelist rates from 1 to 5"
                        icon={<KTIcon iconName="questionnaire-tablet" className="fs-2" />}
                        onClose={() => setOpen(false)}
                    />
                }
            >
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Name" size="small" fullWidth required
                            value={name} onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. MEP Design Engineer interview"
                        />
                        <WtSwitchField
                            title="Use as the default"
                            description="Applied to any interview with no scorecard of its own."
                            checked={isDefault}
                            onChange={(_e, checked) => setIsDefault(checked)}
                        />

                        <Box>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "text.secondary", mb: 1 }}>
                                Criteria
                            </Typography>
                            <Stack spacing={1}>
                                {factors.map((f) => (
                                    <Stack key={f.key} direction="row" alignItems="center" spacing={1}>
                                        <TextField
                                            size="small" sx={{ flex: 1 }} placeholder="e.g. Communication"
                                            value={f.label}
                                            onChange={(e) => setFactorAt(f.key, { label: e.target.value })}
                                        />
                                        <TextField
                                            size="small" type="number" sx={{ width: 96 }} label="Weight"
                                            inputProps={{ min: 0, step: 0.5 }}
                                            value={f.weight}
                                            onChange={(e) => setFactorAt(f.key, { weight: Number(e.target.value) || 0 })}
                                        />
                                        <WtIconButton
                                            title="Remove criterion"
                                            // Never remove the last row: an empty list gives the panelist
                                            // nothing to rate and reads as a broken form.
                                            disabled={factors.length === 1}
                                            onClick={() => setFactors((rows) => rows.filter((r) => r.key !== f.key))}
                                            sx={{ width: 32, height: 32, borderRadius: "9px" }}
                                        >
                                            <KTIcon iconName="cross" className="fs-5" />
                                        </WtIconButton>
                                    </Stack>
                                ))}
                            </Stack>
                            <WtButton
                                ghost size="small" sx={{ mt: 1 }}
                                onClick={() => setFactors((rows) => [...rows, newFactor()])}
                            >
                                Add criterion
                            </WtButton>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <WtButton ghost onClick={() => setOpen(false)}>Cancel</WtButton>
                    <WtButton tone="primary" disabled={!canSave} onClick={() => saveMut.mutate()}>
                        {saveMut.isPending ? "Saving…" : "Save"}
                    </WtButton>
                </DialogActions>
            </GlassDialog>
        </GlassCard>
    );
};

export default ScorecardTemplateSection;
