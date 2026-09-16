import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Stack, Typography, DialogContent, DialogActions, CircularProgress } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    GlassCard, GlassDialog, GlassHeader, WtButton, WtSwitchField, ActionIconButton,
    IconBox, ToneChip, TRIO, WtEmptyState, toast, confirmDialog, WtField,
} from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import { apiErrorMessage } from "@utils/apiError";
import { useDepartmentDesignations } from "@/hooks/useDepartmentDesignations";
import {
    getScorecardTemplates, createScorecardTemplate, updateScorecardTemplate, deleteScorecardTemplate,
    type ScorecardTemplate, type ScorecardTemplatePayload,
} from "@services/recruitment";

/**
 * One editable criterion. `key` is local only — the API assigns real ids on save.
 *
 * `weight` is held as TEXT, not a number. As a number, clearing the field parsed to 0 and the
 * cursor sat behind a 0 you had to delete again; and `weight || 1` on save turned a deliberate
 * 0 into 1. What you type is what is stored.
 */
interface FactorDraft {
    key: string;
    label: string;
    weight: string;
}

const newFactor = (): FactorDraft => ({ key: Math.random().toString(36).slice(2), label: "", weight: "1" });

const toDrafts = (t: ScorecardTemplate | null): FactorDraft[] =>
    t?.factors?.length
        ? t.factors.map((f) => ({ key: f.id, label: f.label, weight: String(f.weight ?? 1) }))
        : [newFactor()];

/** Past this many options a plain menu becomes a scroll hunt. */
const SEARCHABLE_FROM = 8;

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
    const [designationId, setDesignationId] = useState("");
    const [factors, setFactors] = useState<FactorDraft[]>([newFactor()]);
    // Empty string means "use the app default", which is what a null column means
    // server-side. Kept as "" rather than null so the select stays controlled.
    const [ratingScale, setRatingScale] = useState("");
    const [decisionSet, setDecisionSet] = useState("");

    // The endpoint answers with the templates AND the vocabularies the API will
    // accept, so this editor cannot offer a scale the server would reject. The lists
    // are deliberately not declared in this file — see utils/scorecardRubric.ts.
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: queryKeys.recruitment.scorecardTemplates(),
        queryFn: getScorecardTemplates,
    });
    const templates = data?.templates ?? [];
    const scales = data?.scales ?? [];
    const decisionSets = data?.decisionSets ?? [];

    // The same list every other form picks a designation from — one source, so a scorecard
    // cannot be tied to a designation a requisition could never have.
    const { designations } = useDepartmentDesignations();
    const designationName = (id?: string | null) => designations.find((d) => d.id === id)?.role;

    const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.scorecardTemplates() });

    const payload = (): ScorecardTemplatePayload => ({
        name: name.trim(),
        isDefault,
        designationId: designationId || null,
        ratingScale: ratingScale || null,
        decisionSet: decisionSet || null,
        // Blank rows are the natural residue of an "add row" button; drop them rather than
        // saving criteria with no name. A weight of 0 is kept as 0 — it used to become 1.
        factors: factors
            .filter((f) => f.label.trim())
            .map((f, i) => ({ label: f.label.trim(), weight: f.weight.trim() === "" ? 1 : Number(f.weight), sortOrder: i })),
    });

    const saveMut = useMutation({
        mutationFn: () => (editing ? updateScorecardTemplate(editing.id, payload()) : createScorecardTemplate(payload())),
        onSuccess: () => {
            toast({ icon: "success", title: editing ? `"${name.trim()}" updated` : `"${name.trim()}" added` });
            setOpen(false);
            invalidate();
        },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not save the scorecard") }),
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => deleteScorecardTemplate(id),
        onSuccess: () => { toast({ icon: "success", title: "Scorecard removed" }); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not remove the scorecard") }),
    });

    const openNew = () => {
        setEditing(null);
        setName("");
        setIsDefault(templates.length === 0); // the first template is the obvious default
        setDesignationId("");
        setFactors([newFactor()]);
        setRatingScale("");
        setDecisionSet("");
        setOpen(true);
    };

    const openEdit = (t: ScorecardTemplate) => {
        setEditing(t);
        setName(t.name);
        setIsDefault(t.isDefault);
        setDesignationId(t.designationId ?? "");
        setFactors(toDrafts(t));
        setRatingScale(t.ratingScale ?? "");
        setDecisionSet(t.decisionSet ?? "");
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

    /**
     * A template reachable by nobody is the one real trap here: the server picks a scorecard by
     * the role's designation, falling back to the default. So a template that is neither the
     * default nor tied to a designation is never used by anything — say so instead of saving it
     * and letting someone wonder why their criteria never appear.
     */
    const unreachable = !isDefault && !designationId;
    /**
     * One scorecard per designation — the server refuses a second one, because it resolves a
     * template by designation and two would make "which criteria did we use?" unanswerable.
     * Checked here as well so the clash is visible before Save, naming the one that has it.
     */
    const clash = designationId
        ? templates.find((t) => t.id !== editing?.id && t.designationId === designationId && t.isActive !== false)
        : undefined;
    const named = Boolean(name.trim());
    const hasCriterion = factors.some((f) => f.label.trim());
    const canSave = named && hasCriterion && !unreachable && !clash && !saveMut.isPending;

    return (
        <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
                <IconBox icon="questionnaire-tablet" trio={TRIO.amber} size={36} fs="fs-3" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: { xs: 14.5, sm: 15.5 }, lineHeight: 1.3 }}>
                        Interview Scorecards
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, lineHeight: 1.45, color: "text.secondary", mt: 0.25 }}>
                        The criteria a panelist rates. One per designation, plus a default for everything else.
                    </Typography>
                </Box>
                <WtButton
                    tone="primary" size="small" onClick={openNew}
                    startIcon={<KTIcon iconName="plus" className="fs-6" />}
                    sx={{ flexShrink: 0, minHeight: 36, px: { xs: 1.5, sm: 2 }, fontSize: 13, borderRadius: "10px", alignSelf: "flex-start" }}
                >
                    New
                </WtButton>
            </Stack>

            {isLoading ? (
                <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={22} /></Stack>
            ) : isError ? (
                <WtEmptyState
                    variant="error" dense
                    title="Could not load the scorecards"
                    hint={apiErrorMessage(error, "Check your connection and try again.")}
                    actionLabel="Retry"
                    onAction={() => refetch()}
                />
            ) : templates.length === 0 ? (
                <WtEmptyState
                    dense
                    icon="questionnaire-tablet"
                    tone={TRIO.amber}
                    title="No Scorecard Yet"
                    hint="Every interview records a single overall rating until there is one. Add a scorecard to capture the criteria your panel actually assesses."
                    actionLabel="Add a Scorecard"
                    onAction={openNew}
                />
            ) : (
                <Stack spacing={1}>
                    {templates.map((t) => {
                        const busy = deleteMut.isPending && deleteMut.variables === t.id;
                        const target = t.designationId ? designationName(t.designationId) : null;
                        return (
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
                                        {target && <ToneChip tone="brand" label={target} dense />}
                                        {/* Neither the default nor tied to a designation ⇒ the server
                                            can never pick it. Older templates predate the field. */}
                                        {!t.isDefault && !t.designationId && <ToneChip tone="warning" label="Never Used" dense />}
                                    </Stack>
                                    <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.25 }}>
                                        {t.factors.length
                                            ? t.factors.map((f) => f.label).join(" · ")
                                            : "No criteria — records an overall rating only"}
                                    </Typography>
                                    {/* Two templates with the same criteria can still score differently. */}
                                    <Typography sx={{ fontSize: 11.5, color: "text.disabled", mt: 0.25 }}>
                                        {scales.find((sc) => sc.id === t.ratingScale)?.label ?? "Default scale"}
                                        {" · "}
                                        {decisionSets.find((ds) => ds.id === t.decisionSet)?.label ?? "Default decisions"}
                                    </Typography>
                                </Box>
                                <ActionIconButton iconName="pencil" title="Edit" size="sm" tone="indigo" disabled={busy} onClick={() => openEdit(t)} />
                                <ActionIconButton iconName="trash" title="Remove" size="sm" tone="danger" disabled={busy} onClick={() => remove(t)} />
                            </Stack>
                        );
                    })}
                </Stack>
            )}

            <GlassDialog
                open={open}
                onClose={saveMut.isPending ? undefined : () => setOpen(false)}
                maxWidth="sm"
                header={
                    <GlassHeader
                        title={editing ? `Edit ${editing.name}` : "New Scorecard"}
                        subtitle="The criteria a panel rates, and the words they rate them in"
                        icon={<KTIcon iconName="questionnaire-tablet" className="fs-2" />}
                        onClose={saveMut.isPending ? undefined : () => setOpen(false)}
                    />
                }
            >
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <WtField
                            label="Name" required fullWidth
                            value={name} onChange={setName}
                            placeholder="e.g. MEP Design Engineer interview"
                            disabled={saveMut.isPending}
                        />
                        {/* WHO GETS THIS SCORECARD. The server resolves a template by the role's
                            designation and falls back to the default, so without one of the two a
                            template is dead weight — which every template was, because this field
                            did not exist on the screen. */}
                        <WtField
                            label="Use for Designation" fullWidth clearable
                            value={designationId} onChange={setDesignationId}
                            options={designations.map((d) => ({ value: d.id, label: d.role }))}
                            searchable={designations.length >= SEARCHABLE_FROM}
                            placeholder={designations.length ? "Any designation (use the default instead)" : "No designations set up yet"}
                            disabled={saveMut.isPending}
                            error={
                                clash
                                    ? `"${clash.name}" already covers this designation. Change that one first, or pick another designation.`
                                    : unreachable
                                        ? "Choose a designation, or make this the default — otherwise nothing would ever use it"
                                        : undefined
                            }
                            hint="An interview for a role with this designation uses this scorecard."
                        />
                        <WtSwitchField
                            title="Use as the Default"
                            description="Applied to any interview whose designation has no scorecard of its own."
                            checked={isDefault}
                            onChange={(_e, checked) => setIsDefault(checked)}
                        />

                        {/* Match these to the form the panel actually holds. The printed Master
                            Form rates Good / Average / Poor and closes on Hire / Hold / Reject;
                            the tracker workbook scores out of 10. An interviewer translating
                            their own paperwork mid-interview is not listening to the candidate.
                            Options come from the API, never from a list in this file. */}
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <WtField
                                label="Rating Scale"
                                sx={{ flex: 1 }}
                                value={ratingScale}
                                onChange={setRatingScale}
                                // "App default" is a real choice here, not a placeholder —
                                // it stores null, meaning "follow the module default".
                                options={[{ value: "", label: "App default" }, ...scales.map((sc) => ({ value: sc.id, label: sc.label }))]}
                                hint="How each criterion is rated"
                                disabled={saveMut.isPending}
                            />
                            <WtField
                                label="Final Decision"
                                sx={{ flex: 1 }}
                                value={decisionSet}
                                onChange={setDecisionSet}
                                options={[{ value: "", label: "App default" }, ...decisionSets.map((ds) => ({ value: ds.id, label: ds.label }))]}
                                hint="How the panel closes"
                                disabled={saveMut.isPending}
                            />
                        </Stack>

                        <Box>
                            <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 1, gap: 1, flexWrap: "wrap" }}>
                                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "text.secondary" }}>
                                    Criteria
                                </Typography>
                                {/* Honest about what the number does today: it is shown to the panel
                                    beside each criterion, and nothing computes with it yet — the panel
                                    average is the mean of the overall ratings people give. */}
                                <Typography sx={{ fontSize: 11.5, color: "text.disabled" }}>
                                    Weight is shown to the panel as importance; the average is still of their overall ratings
                                </Typography>
                            </Stack>
                            <Stack spacing={1}>
                                {factors.map((f) => (
                                    <Stack key={f.key} direction="row" alignItems="flex-start" spacing={1}>
                                        <WtField
                                            sx={{ flex: 1 }} placeholder="e.g. Communication"
                                            value={f.label}
                                            onChange={(v) => setFactorAt(f.key, { label: v })}
                                            disabled={saveMut.isPending}
                                        />
                                        <WtField
                                            label="Weight" type="number" inputMode="decimal" min={0} step={0.5}
                                            minWidth={104} fullWidth={false}
                                            value={f.weight}
                                            onChange={(v) => setFactorAt(f.key, { weight: v })}
                                            disabled={saveMut.isPending}
                                        />
                                        <ActionIconButton
                                            iconName="cross" title="Remove Criterion" size="sm"
                                            // Never remove the last row: an empty list gives the panelist
                                            // nothing to rate and reads as a broken form.
                                            disabled={factors.length === 1 || saveMut.isPending}
                                            onClick={() => setFactors((rows) => rows.filter((r) => r.key !== f.key))}
                                        />
                                    </Stack>
                                ))}
                            </Stack>
                            <WtButton
                                ghost size="small" sx={{ mt: 1 }}
                                startIcon={<KTIcon iconName="plus" className="fs-6" />}
                                onClick={() => setFactors((rows) => [...rows, newFactor()])}
                                disabled={saveMut.isPending}
                            >
                                Add Criterion
                            </WtButton>
                            {named && !hasCriterion && (
                                <Typography sx={{ fontSize: 12, color: "error.main", mt: 1 }}>
                                    Name at least one criterion — a scorecard with none records only an overall rating.
                                </Typography>
                            )}
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <WtButton ghost onClick={() => setOpen(false)} disabled={saveMut.isPending}>Cancel</WtButton>
                    <WtButton tone="primary" disabled={!canSave} onClick={() => saveMut.mutate()}>
                        {saveMut.isPending ? "Saving…" : "Save"}
                    </WtButton>
                </DialogActions>
            </GlassDialog>
        </GlassCard>
    );
};

export default ScorecardTemplateSection;
