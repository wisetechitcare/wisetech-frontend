import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Stack, Typography, CircularProgress, DialogContent, DialogActions, Slider } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import ReorderableGroup, { DragHandle, type DragHandleProps } from "@app/modules/common/components/ReorderableGroup";
import {
    GlassCard, GlassDialog, GlassHeader, WtButton, WtField, WtSwitchField, WtColorPicker, KIT_HEX_SWATCHES,
    ActionIconButton, IconBox, ToneChip, TRIO, WtEmptyState, WtTooltip, toast, confirmDialog, type Trio, type SemanticTone,
} from "@app/modules/common/components/ui";
import { EmployeePickerField } from "@app/modules/common/components/EmployeePickerField";
import { queryKeys } from "@/lib/queryKeys";
import { toPercentages, rebalance } from "@utils/weightBalancer";
import { apiErrorMessage } from "@utils/apiError";
import { TERMS } from "./terms";
import ScorecardTemplateSection from "./ScorecardTemplateSection";
import {
    getApplicationStatuses, createApplicationStatus, updateApplicationStatus, deleteApplicationStatus,
    getRequisitionStages, createRequisitionStage, updateRequisitionStage, deleteRequisitionStage,
    getRejectionReasons, createRejectionReason, updateRejectionReason, deleteRejectionReason,
    getApplicantSources, createApplicantSource, updateApplicantSource, deleteApplicantSource,
    getRecruitmentSettings, saveRecruitmentSettings, reorderConfig,
    type RecruitmentSettings, type ScoringWeights,
} from "@services/recruitment";

// A configurable list-master row (generic base shared by every recruitment master).
type MasterRow = { id: string; color?: string | null; sortOrder?: number };
/** Read a dynamic field off a master row without widening the row's type. */
const field = (row: MasterRow, key: string): unknown => (row as Record<string, unknown>)[key];
interface FlagDef { key: string; label: string; tone?: SemanticTone }

interface MasterSectionProps {
    title: string;
    description: string;
    icon: string; // KTIcon (duotone) name
    trio: Trio;
    configType: string; // for reorder endpoint
    queryKey: readonly unknown[];
    labelField: "name" | "reason";
    fetchFn: () => Promise<MasterRow[]>;
    createFn: (payload: Record<string, unknown>) => Promise<unknown>;
    updateFn: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
    deleteFn: (id: string) => Promise<unknown>;
    flags?: FlagDef[];
    /** Pipeline stages only: expose the stage-entry auto-email + auto-advance fields. */
    emailConfig?: boolean;
}

const DEFAULT_COLOR = "#4B5563";

/**
 * Reusable, glassmorphic CRUD master card: list + create/edit (GlassDialog) +
 * delete + drag-to-reorder, driven entirely by injected service fns. Responsive and
 * KTIcon-based; one instance per recruitment config list.
 */
const MasterSection = ({
    title, description, icon, trio, configType, queryKey, labelField, fetchFn, createFn, updateFn, deleteFn, flags = [], emailConfig = false,
}: MasterSectionProps) => {
    const qc = useQueryClient();
    const { data: rows = [], isLoading, isError, error, refetch } = useQuery({ queryKey, queryFn: fetchFn });
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<MasterRow | null>(null);
    const [label, setLabel] = useState("");
    const [color, setColor] = useState(DEFAULT_COLOR);
    const [flagVals, setFlagVals] = useState<Record<string, boolean>>({});
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");
    const [threshold, setThreshold] = useState("");

    const invalidate = () => qc.invalidateQueries({ queryKey });
    /** "Pipeline Stages" → "Pipeline Stage". Declared here because every message below reads it. */
    const singular = title.replace(/s$/, "");

    const buildPayload = (): Record<string, unknown> => ({
        [labelField]: label.trim(),
        color,
        ...flagVals,
        ...(emailConfig
            ? {
                  autoEmailSubject: emailSubject || null,
                  autoEmailBody: emailBody || null,
                  autoAdvanceThreshold: threshold === "" ? null : Number(threshold),
              }
            : {}),
    });

    // Every failure reports the SERVER's reason. "Could not save (admin permission required)"
    // was a guess printed for a duplicate name, a validation error and a dropped connection alike.
    const createMut = useMutation({
        mutationFn: () => createFn(buildPayload()),
        onSuccess: () => { toast({ icon: "success", title: `${singular} added` }); close(); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, `Could not add the ${singular.toLowerCase()}`) }),
    });
    const updateMut = useMutation({
        mutationFn: () => updateFn(editing!.id, buildPayload()),
        onSuccess: () => { toast({ icon: "success", title: `${singular} updated` }); close(); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, `Could not update the ${singular.toLowerCase()}`) }),
    });
    const deleteMut = useMutation({
        mutationFn: (id: string) => deleteFn(id),
        onSuccess: () => { toast({ icon: "success", title: `${singular} removed` }); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, `Could not remove the ${singular.toLowerCase()}`) }),
    });
    const reorderMut = useMutation({
        mutationFn: (orderedIds: string[]) => reorderConfig(configType, orderedIds),
        onSuccess: invalidate,
        // The optimistic paint has to be undone, or the list keeps an order the server rejected.
        onError: (err) => { toast({ icon: "error", title: apiErrorMessage(err, "Could not save the new order") }); invalidate(); },
    });

    const openNew = () => {
        setEditing(null); setLabel(""); setColor(DEFAULT_COLOR); setFlagVals({});
        setEmailSubject(""); setEmailBody(""); setThreshold("");
        setOpen(true);
    };
    const openEdit = (row: MasterRow) => {
        setEditing(row);
        setLabel(String(field(row, labelField) ?? ""));
        setColor(row.color ?? DEFAULT_COLOR);
        setFlagVals(flags.reduce((acc, f) => ({ ...acc, [f.key]: Boolean(field(row, f.key)) }), {}));
        setEmailSubject(String(field(row, "autoEmailSubject") ?? ""));
        setEmailBody(String(field(row, "autoEmailBody") ?? ""));
        const t = field(row, "autoAdvanceThreshold");
        setThreshold(t == null ? "" : String(t));
        setOpen(true);
    };
    const close = () => { setOpen(false); setEditing(null); };

    const remove = async (row: MasterRow) => {
        const name = String(field(row, labelField) ?? "");
        if (await confirmDialog({ icon: "warning", title: `Remove "${name}"?`, text: "It will be deactivated." })) deleteMut.mutate(row.id);
    };

    /** Commit a new order: paint it immediately (the query cache IS the list), then persist.
     *  Without the optimistic write the row would snap back until the refetch lands. */
    const applyOrder = (next: MasterRow[]) => {
        qc.setQueryData(queryKey, next);
        reorderMut.mutate(next.map((r) => r.id));
    };
    const nudge = (index: number, dir: -1 | 1) => {
        const to = index + dir;
        if (to < 0 || to >= rows.length) return;
        const next = rows.slice();
        [next[index], next[to]] = [next[to], next[index]];
        applyOrder(next);
    };

    const saving = createMut.isPending || updateMut.isPending;

    const renderRow = (row: MasterRow, handleProps?: DragHandleProps) => {
        const index = rows.findIndex((r) => r.id === row.id);
        const activeFlags = flags.filter((f) => field(row, f.key));
        const busy = deleteMut.isPending && deleteMut.variables === row.id;
        return (
            <Stack
                direction="row"
                alignItems="center"
                spacing={0.75}
                sx={{
                    px: { xs: 0.75, sm: 1 }, py: 0.75, borderRadius: "12px",
                    border: "1px solid", borderColor: "divider", bgcolor: "action.hover",
                    transition: "border-color .15s, background-color .15s",
                    "&:hover": { borderColor: "text.disabled" },
                }}
            >
                <DragHandle handleProps={handleProps} disabled={rows.length < 2} onNudge={(dir) => nudge(index, dir)} />

                {/* Identity + flags kept together on the left — no stretched gap in the middle. */}
                <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.75 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: row.color || "action.disabled", flexShrink: 0 }} />
                    <Typography sx={{ fontWeight: 600, fontSize: 14, lineHeight: 1.35, wordBreak: "break-word", mr: 0.25 }}>
                        {String(field(row, labelField) ?? "")}
                    </Typography>
                    {activeFlags.map((f) => (
                        <ToneChip key={f.key} tone={f.tone ?? "brand"} label={f.label} dense />
                    ))}
                </Box>

                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
                    <ActionIconButton iconName="pencil" title="Edit" size="sm" tone="indigo" disabled={busy} onClick={() => openEdit(row)} />
                    <ActionIconButton iconName="trash" title="Remove" size="sm" tone="danger" disabled={busy} onClick={() => remove(row)} />
                </Stack>
            </Stack>
        );
    };

    return (
        <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
                <IconBox icon={icon} trio={trio} size={36} fs="fs-3" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" useFlexGap>
                        <Typography sx={{ fontWeight: 700, fontSize: { xs: 14.5, sm: 15.5 }, lineHeight: 1.3 }}>{title}</Typography>
                        {!isLoading && !isError && rows.length > 0 && (
                            <Box sx={{
                                px: 0.75, minWidth: 20, textAlign: "center", borderRadius: 999,
                                bgcolor: "action.selected", color: "text.secondary",
                                fontSize: 11, fontWeight: 700, lineHeight: "18px",
                            }}>
                                {rows.length}
                            </Box>
                        )}
                    </Stack>
                    <Typography sx={{ fontSize: 12.5, lineHeight: 1.45, color: "text.secondary", mt: 0.25 }}>{description}</Typography>
                </Box>
                <WtButton
                    tone="primary" size="small" onClick={openNew}
                    startIcon={<KTIcon iconName="plus" className="fs-6" />}
                    sx={{ flexShrink: 0, minHeight: 36, px: { xs: 1.25, sm: 1.75 }, fontSize: 13, borderRadius: "10px", alignSelf: "flex-start" }}
                >
                    New
                </WtButton>
            </Stack>

            {isLoading ? (
                <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={22} /></Stack>
            ) : isError ? (
                // A failed load used to render as "No pipeline stage yet" — which reads as
                // "nothing is configured" and invites someone to recreate what already exists.
                <WtEmptyState
                    variant="error" dense
                    title={`Could not load ${title.toLowerCase()}`}
                    hint={apiErrorMessage(error, "Check your connection and try again.")}
                    actionLabel="Retry"
                    onAction={() => refetch()}
                />
            ) : rows.length === 0 ? (
                <WtEmptyState
                    dense
                    icon={icon}
                    tone={trio}
                    title={`No ${singular} Yet`}
                    hint={description}
                    actionLabel={`New ${singular}`}
                    onAction={openNew}
                />
            ) : (
                <ReorderableGroup
                    items={rows}
                    getItemId={(r) => r.id}
                    axis="y"
                    withHandle
                    disabled={rows.length < 2}
                    // ReorderableGroup takes a className (not sx) — Tailwind utilities cover the
                    // stack layout, so no per-feature stylesheet is needed.
                    className="flex flex-col gap-2"
                    onReorder={applyOrder}
                    renderItem={renderRow}
                />
            )}

            <GlassDialog
                open={open}
                onClose={saving ? undefined : close}
                maxWidth="xs"
                header={<GlassHeader title={editing ? `Edit ${singular}` : `New ${singular}`} icon={<KTIcon iconName={icon} className="fs-2" />} onClose={saving ? undefined : close} />}
            >
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <WtField
                            label={labelField === "reason" ? "Reason" : "Name"} required fullWidth
                            value={label} onChange={setLabel} disabled={saving}
                        />
                        {/* The kit palette, stored as the hex this row's dot paints directly. The
                            raw <input type="color"> it replaces was unthemed and offered no palette,
                            so two stages picked by two admins never matched. */}
                        <WtColorPicker label="Colour" palette={KIT_HEX_SWATCHES} value={color} onChange={setColor} disabled={saving} />
                        {flags.map((f) => (
                            <WtSwitchField
                                key={f.key}
                                title={f.label}
                                checked={!!flagVals[f.key]}
                                onChange={(e) => setFlagVals((v) => ({ ...v, [f.key]: e.target.checked }))}
                            />
                        ))}
                        {emailConfig && (
                            <>
                                <Typography sx={{ fontWeight: 600, fontSize: 13, color: "text.secondary", mt: 1 }}>Stage-Entry Email (Optional)</Typography>
                                <WtField label="Email Subject" fullWidth value={emailSubject} onChange={setEmailSubject} disabled={saving} />
                                <WtField
                                    label="Email Body" fullWidth multiline minRows={4}
                                    hint="Tokens: {first_name} {candidate_name} {job_title} {stage_name} {application_ref}. Leave empty to disable."
                                    value={emailBody} onChange={setEmailBody} disabled={saving}
                                />
                                <WtField
                                    label="Auto-Advance Threshold" type="number" inputMode="numeric" min={0} max={100} step={1}
                                    minWidth={240} value={threshold} onChange={setThreshold} disabled={saving}
                                    hint="Kept with the stage for when auto-advance is wired; nothing moves a candidate on its own today."
                                />
                            </>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <WtButton ghost onClick={close} disabled={saving}>Cancel</WtButton>
                    <WtButton tone="primary" disabled={!label.trim() || saving} onClick={() => (editing ? updateMut.mutate() : createMut.mutate())}>
                        {saving ? "Saving…" : "Save"}
                    </WtButton>
                </DialogActions>
            </GlassDialog>
        </GlassCard>
    );
};

// ─── Scoring & automation settings ────────────────────────────────────────────
const WEIGHT_FIELDS: { key: keyof ScoringWeights; label: string; hint: string }[] = [
    { key: "ctcFit", label: "Salary fit", hint: "Expected CTC against the role's band" },
    { key: "experience", label: "Experience", hint: "Years, ramping to full marks around five" },
    { key: "noticePeriod", label: "Availability", hint: "Notice period — immediate scores highest" },
    { key: "keywordMatch", label: "Title match", hint: "The role's wording against current title and employer" },
];

const SettingsSection = () => {
    const qc = useQueryClient();
    const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: queryKeys.recruitment.settings(), queryFn: getRecruitmentSettings });
    const [draft, setDraft] = useState<RecruitmentSettings | null>(null);
    const settings = draft ?? data ?? null;

    const saveMut = useMutation({
        mutationFn: (payload: Partial<RecruitmentSettings>) => saveRecruitmentSettings(payload),
        onSuccess: (s) => { toast({ icon: "success", title: "Settings saved" }); setDraft(null); qc.setQueryData(queryKeys.recruitment.settings(), s); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not save the settings") }),
    });

    /**
     * Weights are edited as percentages of 100, never as free decimals.
     *
     * They were four independent numbers (0.3, 0.3, 0.15, 0.25) with no visible
     * relationship, yet the scorer only ever used their RATIO — it divides by their sum.
     * So "0.3" answered neither "how much does this matter" nor "how much compared to
     * that". Percentages that visibly total 100 answer both, and the scorer needs no
     * change: 30/30/15/25 and 0.3/0.3/0.15/0.25 produce identical scores.
     *
     * rebalance() is shared with the scorecard template's weighted criteria. Two copies of
     * a 100% invariant is two places for it to drift.
     */
    const weightPercents = settings ? toPercentages(settings.weights as unknown as Record<string, number>) : null;

    const setWeight = (key: keyof ScoringWeights, value: number) => {
        if (!settings || !weightPercents) return;
        const next = rebalance(weightPercents, key as string, value);
        setDraft({ ...settings, weights: next as unknown as ScoringWeights });
    };
    const setRule = (key: keyof RecruitmentSettings["autoRules"], value: boolean) => {
        if (!settings) return;
        setDraft({ ...settings, autoRules: { ...settings.autoRules, [key]: value } });
    };

    return (
        <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
                <IconBox icon="chart-simple" trio={TRIO.purple} size={36} fs="fs-3" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: { xs: 14.5, sm: 15.5 }, lineHeight: 1.3 }}>Hiring Defaults &amp; Scoring</Typography>
                    <Typography sx={{ fontSize: 12.5, lineHeight: 1.45, color: "text.secondary", mt: 0.25 }}>Who a new role starts with, how candidates are scored, and which automations run.</Typography>
                </Box>
                <WtButton
                    tone="primary" size="small" disabled={!draft || saveMut.isPending} onClick={() => draft && saveMut.mutate(draft)}
                    sx={{ flexShrink: 0, minHeight: 36, px: { xs: 1.5, sm: 2 }, fontSize: 13, borderRadius: "10px", alignSelf: "flex-start" }}
                >
                    {saveMut.isPending ? "Saving…" : "Save"}
                </WtButton>
            </Stack>

            {isError ? (
                <WtEmptyState
                    variant="error" dense
                    title="Could not load the settings"
                    hint={apiErrorMessage(error, "Check your connection and try again.")}
                    actionLabel="Retry"
                    onAction={() => refetch()}
                />
            ) : isLoading || !settings ? (
                <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={22} /></Stack>
            ) : (
                <Stack spacing={1.5}>
                    {/*
                      * The default recruiter has been stored and read since the requisition form
                      * existed — a new role pre-fills its Recruiter from it — with NO screen to set
                      * it, so it was permanently null and the field always opened empty.
                      *
                      * Unset is a legitimate answer, and the only honest default: which person runs
                      * hiring differs per customer, so guessing one puts a real name on every role
                      * raised by anybody.
                      */}
                    <Typography sx={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "text.secondary" }}>
                        New {TERMS.Requisition} Defaults
                    </Typography>
                    <EmployeePickerField
                        label="Default Recruiter"
                        value={settings.defaultRecruiterId ?? null}
                        onChange={(ids) => setDraft({ ...settings, defaultRecruiterId: ids[0] ?? null })}
                        disabled={saveMut.isPending}
                        placeholder="Nobody — leave it for whoever raises the role"
                        helperText="Pre-filled as the recruiter on a new role. Whoever raises it can change it, and it is only a default — leaving this empty is fine."
                    />

                    <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ flexWrap: "wrap", gap: 1, pt: 0.5 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "text.secondary" }}>
                            Scoring Weights
                        </Typography>
                        {/* Always 100 by construction. Shown anyway, because the invariant is
                            the reassurance: you can drag anything and the total stays honest. */}
                        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                            Totals <strong>100%</strong> — moving one adjusts the others
                        </Typography>
                    </Stack>
                    <Stack spacing={1.75}>
                        {weightPercents && WEIGHT_FIELDS.map((w) => (
                            <Box key={w.key}>
                                <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.25 }}>
                                    <WtTooltip title={w.hint}>
                                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{w.label}</Typography>
                                    </WtTooltip>
                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary" }}>
                                        {weightPercents[w.key]}%
                                    </Typography>
                                </Stack>
                                <Slider
                                    value={weightPercents[w.key]}
                                    onChange={(_, v) => setWeight(w.key, Array.isArray(v) ? v[0] : v)}
                                    min={0}
                                    max={100}
                                    step={1}
                                    size="small"
                                    aria-label={`${w.label} weight, ${weightPercents[w.key]} percent`}
                                    valueLabelDisplay="auto"
                                    valueLabelFormat={(v) => `${v}%`}
                                />
                                <Typography sx={{ fontSize: 11.5, color: "text.secondary", mt: -0.5 }}>{w.hint}</Typography>
                            </Box>
                        ))}
                    </Stack>
                    <Typography sx={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "text.secondary", pt: 0.5 }}>
                        Automation Rules
                    </Typography>
                    {/*
                      * DISABLED ON PURPOSE. All three flags are stored, validated and read
                      * back, and NO code acts on any of them — `autoRules` is written by the
                      * settings handler and the only consumer of these settings destructures
                      * `{ weights }`. They were rendering as ON beside live candidate data,
                      * which reads as "this system is auto-rejecting people" when it is not.
                      *
                      * A control that lies is worse than a missing feature, so they stay
                      * disabled until something acts on them. Re-enable in the same commit
                      * that wires them, never before.
                      */}
                    <WtSwitchField
                        title="Auto-Advance on Threshold"
                        description="Not wired yet. Would move a candidate to the next stage when their score clears the stage threshold."
                        checked={settings.autoRules.autoAdvanceEnabled}
                        onChange={(e) => setRule("autoAdvanceEnabled", e.target.checked)}
                        disabled
                    />
                    <WtSwitchField
                        title="Auto-Reject Below Floor"
                        description="Not wired yet. Would reject a candidate scoring under the floor without a human looking."
                        checked={settings.autoRules.autoRejectEnabled}
                        onChange={(e) => setRule("autoRejectEnabled", e.target.checked)}
                        disabled
                    />
                    <WtSwitchField
                        title="AI Screening (Claude)"
                        description="Not wired yet. The scoring you see is the deterministic four-factor rule score, not a model."
                        checked={settings.autoRules.aiScreeningEnabled}
                        onChange={(e) => setRule("aiScreeningEnabled", e.target.checked)}
                        disabled
                    />
                </Stack>
            )}
        </GlassCard>
    );
};

const RecruitmentConfigurationMain = () => (
    // Masters sit 2-up from lg so the page fills the width instead of leaving big empty gutters
    // (and is half as tall); Scoring & Automation spans the full row — it's a wide form.
    <Box
        sx={{
            p: { xs: 1, sm: 1.5, md: 2 },
            maxWidth: 1400, mx: "auto",
            display: "grid", alignItems: "start",
            gap: { xs: 1.5, md: 2 },
            gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
        }}
    >
        <MasterSection
            title="Pipeline Stages" description="Stages candidates move through. Drag a row by its grip to reorder." icon="chart-simple" trio={TRIO.blue}
            configType="application-statuses" queryKey={queryKeys.recruitment.applicationStatuses()} labelField="name"
            fetchFn={getApplicationStatuses} createFn={(p) => createApplicationStatus(p as never)} updateFn={(id, p) => updateApplicationStatus(id, p as never)} deleteFn={deleteApplicationStatus}
            flags={[
                { key: "isDefault", label: "Default" },
                { key: "isHiredOutcome", label: "Hired", tone: "success" },
                { key: "isRejectedOutcome", label: "Rejected", tone: "danger" },
                { key: "requiresReason", label: "Needs reason", tone: "warning" },
            ]}
            emailConfig
        />
        <ScorecardTemplateSection />
        {/* Titles follow TERMS: this module says "role" everywhere else, and the config card
            saying "Requisition" / "Applicant" is the exact mismatch terms.ts was written for. */}
        <MasterSection
            title={`${TERMS.Requisition} Stages`} description="Lifecycle of a role (open / on-hold / filled)." icon="questionnaire-tablet" trio={TRIO.cyan}
            configType="requisition-stages" queryKey={queryKeys.recruitment.requisitionStages()} labelField="name"
            fetchFn={getRequisitionStages} createFn={(p) => createRequisitionStage(p as never)} updateFn={(id, p) => updateRequisitionStage(id, p as never)} deleteFn={deleteRequisitionStage}
            flags={[
                { key: "isDefault", label: "Default" },
                { key: "isOpenTrigger", label: "Opens headcount", tone: "success" },
                { key: "isTerminal", label: "Terminal" },
            ]}
        />
        <MasterSection
            title="Rejection Reasons" description="Reasons captured when a candidate is rejected." icon="cross" trio={TRIO.rose}
            configType="rejection-reasons" queryKey={queryKeys.recruitment.rejectionReasons()} labelField="reason"
            fetchFn={getRejectionReasons} createFn={(p) => createRejectionReason(p as never)} updateFn={(id, p) => updateRejectionReason(id, p as never)} deleteFn={deleteRejectionReason}
        />
        <MasterSection
            title={`${TERMS.Candidate} Sources`} description="Where candidates come from (referral, careers page, agency…)." icon="user-tick" trio={TRIO.amber}
            configType="applicant-sources" queryKey={queryKeys.recruitment.applicantSources()} labelField="name"
            fetchFn={getApplicantSources} createFn={(p) => createApplicantSource(p as never)} updateFn={(id, p) => updateApplicantSource(id, p as never)} deleteFn={deleteApplicantSource}
            flags={[{ key: "isReferral", label: "Referral", tone: "brand" }]}
        />

        <Box sx={{ gridColumn: "1 / -1" }}>
            <SettingsSection />
        </Box>
    </Box>
);

export default RecruitmentConfigurationMain;
