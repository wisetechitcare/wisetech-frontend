import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Stack, Typography, DialogContent, DialogActions, CircularProgress } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    GlassDialog, GlassHeader, WtButton, WtSwitchField, ActionIconButton,
    TRIO, WtEmptyState, toast, confirmDialog, WtField,
    ConfigColorChip, ConfigChipGrid, WeightSliderList,
} from "@app/modules/common/components/ui";
import { ConfigSectionCard } from "@app/modules/configuration";
import { queryKeys } from "@/lib/queryKeys";
import { apiErrorMessage } from "@utils/apiError";
import { canSection } from "@utils/can";
import { toPercentages } from "@utils/weightBalancer";
import { useDepartmentDesignations } from "@/hooks/useDepartmentDesignations";
import {
    getScorecardTemplates, createScorecardTemplate, updateScorecardTemplate, deleteScorecardTemplate,
    type ScorecardTemplate, type ScorecardTemplatePayload,
} from "@services/recruitment";
import { SEARCHABLE_FROM } from "@utils/requisitions";

/**
 * One editable criterion. `key` is local only — the API assigns real ids on save.
 * `weight` is stored as a percentage string (sum 100 across named criteria) via WeightSliderList.
 */
interface FactorDraft {
    key: string;
    label: string;
    weight: string;
}

const newFactor = (): FactorDraft => ({ key: Math.random().toString(36).slice(2), label: "", weight: "0" });

const toDrafts = (t: ScorecardTemplate | null): FactorDraft[] => {
    if (!t?.factors?.length) return [newFactor()];
    const raw = Object.fromEntries(t.factors.map((f) => [f.id, Number(f.weight) || 0]));
    const pct = toPercentages(raw);
    return t.factors.map((f) => ({
        key: f.id,
        label: f.label,
        weight: String(pct[f.id] ?? 0),
    }));
};

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
    const canWrite = canSection("recruitment", "write");
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
        <ConfigSectionCard
            title="Interview Scorecards"
            description="The criteria a panelist rates. One per designation, plus a default for everything else."
            icon="bi-clipboard-check"
            iconColor="amber"
            badge={templates.length > 0 ? { label: String(templates.length) } : undefined}
            loading={isLoading}
            primaryAction={canWrite ? {
                label: "New",
                icon: "bi-plus-lg",
                onClick: openNew,
                variant: "primary",
            } : undefined}
        >
            {isError ? (
                <WtEmptyState
                    variant="error" dense
                    title="Could not load the scorecards"
                    hint={apiErrorMessage(error, "Check your connection and try again.")}
                    actionLabel="Retry"
                    onAction={() => refetch()}
                />
            ) : templates.length === 0 && !isLoading ? (
                <WtEmptyState
                    dense
                    icon="questionnaire-tablet"
                    tone={TRIO.amber}
                    title="No Scorecard Yet"
                    hint="Every interview records a single overall rating until there is one. Add a scorecard to capture the criteria your panel actually assesses."
                    actionLabel={canWrite ? "Add a Scorecard" : undefined}
                    onAction={openNew}
                />
            ) : (
                <ConfigChipGrid>
                    {templates.map((t) => {
                        const busy = deleteMut.isPending && deleteMut.variables === t.id;
                        const target = t.designationId ? designationName(t.designationId) : null;
                        const badge = t.isDefault
                            ? "Default"
                            : target
                                ? target
                                : !t.designationId
                                    ? "Never Used"
                                    : undefined;
                        const caption = [
                            t.factors.length
                                ? t.factors.map((f) => f.label).join(" · ")
                                : "Overall rating only",
                            scales.find((sc) => sc.id === t.ratingScale)?.label ?? "Default scale",
                        ].join(" · ");
                        return (
                            <ConfigColorChip
                                key={t.id}
                                name={t.name}
                                color={TRIO.amber.c}
                                badge={badge}
                                caption={caption}
                                captionStrong
                                disabled={busy}
                                onEdit={canWrite ? () => openEdit(t) : undefined}
                                action={canWrite ? {
                                    icon: "bi-trash",
                                    title: `Delete ${t.name}`,
                                    danger: true,
                                    onClick: () => void remove(t),
                                } : undefined}
                            />
                        );
                    })}
                </ConfigChipGrid>
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
                                <Typography sx={{ fontSize: 11.5, color: "text.disabled" }}>
                                    Weights total 100%. Shown to the panel as importance; the average is still of overall ratings.
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
                                        <ActionIconButton
                                            iconName="cross" title="Remove Criterion" size="sm"
                                            disabled={factors.length === 1 || saveMut.isPending}
                                            onClick={() => setFactors((rows) => {
                                                const next = rows.filter((r) => r.key !== f.key);
                                                const named = next.filter((r) => r.label.trim());
                                                if (named.length < 1) return next;
                                                const pct = toPercentages(
                                                    Object.fromEntries(named.map((r) => [r.key, Number(r.weight) || 0])),
                                                );
                                                return next.map((r) => (
                                                    pct[r.key] != null ? { ...r, weight: String(pct[r.key]) } : r
                                                ));
                                            })}
                                        />
                                    </Stack>
                                ))}
                            </Stack>
                            <WtButton
                                ghost size="small" sx={{ mt: 1, mb: 1.5 }}
                                startIcon={<KTIcon iconName="plus" className="fs-6" />}
                                onClick={() => setFactors((rows) => [...rows, newFactor()])}
                                disabled={saveMut.isPending}
                            >
                                Add Criterion
                            </WtButton>
                            {factors.some((f) => f.label.trim()) && (
                                <WeightSliderList
                                    fields={factors
                                        .filter((f) => f.label.trim())
                                        .map((f) => ({ key: f.key, label: f.label.trim() }))}
                                    weights={Object.fromEntries(factors.map((f) => [f.key, Number(f.weight) || 0]))}
                                    onChange={(next) => setFactors((rows) => rows.map((r) => (
                                        next[r.key] != null ? { ...r, weight: String(next[r.key]) } : r
                                    )))}
                                    disabled={saveMut.isPending}
                                />
                            )}
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
        </ConfigSectionCard>
    );
};

export default ScorecardTemplateSection;
