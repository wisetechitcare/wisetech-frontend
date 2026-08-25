import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Box, Stack, Typography, TextField, CircularProgress, DialogContent, DialogActions,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import ReorderableGroup, { DragHandle, type DragHandleProps } from "@app/modules/common/components/ReorderableGroup";
import {
    GlassCard, GlassDialog, GlassHeader, WtButton, WtIconButton, WtSwitchField,
    IconBox, ToneChip, TRIO, toast, confirmDialog, type Trio, type SemanticTone,
} from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
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

/** Compact row action button — smaller than the default 44px so list rows stay dense.
 *  Glyph size stays on the `fs-*` class (duotone path spans are layered — never size them directly). */
const RowAction = ({ title, icon, color, onClick }: { title: string; icon: string; color?: string; onClick: () => void }) => (
    <WtIconButton
        title={title}
        color={color}
        onClick={onClick}
        sx={{ width: { xs: 34, sm: 36 }, height: { xs: 34, sm: 36 }, borderRadius: "10px" }}
    >
        <KTIcon iconName={icon} className="fs-5" />
    </WtIconButton>
);

/**
 * Reusable, glassmorphic CRUD master card: list + create/edit (GlassDialog) +
 * delete + drag-to-reorder, driven entirely by injected service fns. Responsive and
 * KTIcon-based; one instance per recruitment config list.
 */
const MasterSection = ({
    title, description, icon, trio, configType, queryKey, labelField, fetchFn, createFn, updateFn, deleteFn, flags = [], emailConfig = false,
}: MasterSectionProps) => {
    const qc = useQueryClient();
    const { data: rows = [], isLoading } = useQuery({ queryKey, queryFn: fetchFn });
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<MasterRow | null>(null);
    const [label, setLabel] = useState("");
    const [color, setColor] = useState(DEFAULT_COLOR);
    const [flagVals, setFlagVals] = useState<Record<string, boolean>>({});
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");
    const [threshold, setThreshold] = useState("");

    const invalidate = () => qc.invalidateQueries({ queryKey });

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

    const createMut = useMutation({
        mutationFn: () => createFn(buildPayload()),
        onSuccess: () => { toast({ icon: "success", title: `${title} saved` }); close(); invalidate(); },
        onError: () => toast({ icon: "error", title: "Could not save (admin permission required)" }),
    });
    const updateMut = useMutation({
        mutationFn: () => updateFn(editing!.id, buildPayload()),
        onSuccess: () => { toast({ icon: "success", title: "Updated" }); close(); invalidate(); },
        onError: () => toast({ icon: "error", title: "Could not update" }),
    });
    const deleteMut = useMutation({
        mutationFn: (id: string) => deleteFn(id),
        onSuccess: () => { toast({ icon: "success", title: "Removed" }); invalidate(); },
        onError: () => toast({ icon: "error", title: "Could not remove" }),
    });
    const reorderMut = useMutation({
        mutationFn: (orderedIds: string[]) => reorderConfig(configType, orderedIds),
        onSuccess: invalidate,
        onError: () => { toast({ icon: "error", title: "Could not reorder" }); invalidate(); },
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
    const singular = title.replace(/s$/, "");

    const renderRow = (row: MasterRow, handleProps?: DragHandleProps) => {
        const index = rows.findIndex((r) => r.id === row.id);
        const activeFlags = flags.filter((f) => field(row, f.key));
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
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: row.color ?? "#888", flexShrink: 0 }} />
                    <Typography sx={{ fontWeight: 600, fontSize: 14, lineHeight: 1.35, wordBreak: "break-word", mr: 0.25 }}>
                        {String(field(row, labelField) ?? "")}
                    </Typography>
                    {activeFlags.map((f) => (
                        <ToneChip key={f.key} tone={f.tone ?? "brand"} label={f.label} dense />
                    ))}
                </Box>

                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
                    <RowAction title="Edit" icon="pencil" onClick={() => openEdit(row)} />
                    <RowAction title="Remove" icon="trash" color="#C0392B" onClick={() => remove(row)} />
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
                        {!isLoading && rows.length > 0 && (
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
            ) : rows.length === 0 ? (
                <Box
                    onClick={openNew}
                    sx={{
                        py: 2, px: 1.5, borderRadius: "12px", cursor: "pointer", textAlign: "center",
                        border: "1px dashed", borderColor: "divider",
                        transition: "border-color .15s, background-color .15s",
                        "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
                    }}
                >
                    <Typography sx={{ color: "text.secondary", fontSize: 13, fontWeight: 600 }}>No {singular.toLowerCase()} yet</Typography>
                    <Typography sx={{ color: "text.disabled", fontSize: 12, mt: 0.25 }}>Click to add the first one.</Typography>
                </Box>
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
                onClose={close}
                maxWidth="xs"
                header={<GlassHeader title={editing ? `Edit ${singular}` : `New ${singular}`} icon={<KTIcon iconName={icon} className="fs-2" />} onClose={close} />}
            >
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField label={labelField === "reason" ? "Reason" : "Name"} size="small" fullWidth value={label} onChange={(e) => setLabel(e.target.value)} />
                        <TextField label="Color" type="color" size="small" sx={{ width: 90 }} value={color} onChange={(e) => setColor(e.target.value)} />
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
                                <Typography sx={{ fontWeight: 600, fontSize: 13, color: "text.secondary", mt: 1 }}>Stage-entry email (optional)</Typography>
                                <TextField label="Email subject" size="small" fullWidth value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                                <TextField
                                    label="Email body" size="small" fullWidth multiline minRows={4}
                                    helperText="Tokens: {first_name} {candidate_name} {job_title} {stage_name} {application_ref}. Leave empty to disable."
                                    value={emailBody} onChange={(e) => setEmailBody(e.target.value)}
                                />
                                <TextField label="Auto-advance threshold (score)" type="number" size="small" sx={{ maxWidth: 240 }} value={threshold} onChange={(e) => setThreshold(e.target.value)} />
                            </>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <WtButton ghost onClick={close}>Cancel</WtButton>
                    <WtButton tone="primary" disabled={!label.trim() || saving} onClick={() => (editing ? updateMut.mutate() : createMut.mutate())}>
                        {saving ? "Saving…" : "Save"}
                    </WtButton>
                </DialogActions>
            </GlassDialog>
        </GlassCard>
    );
};

// ─── Scoring & automation settings ────────────────────────────────────────────
const WEIGHT_FIELDS: { key: keyof ScoringWeights; label: string }[] = [
    { key: "ctcFit", label: "CTC fit" },
    { key: "experience", label: "Experience" },
    { key: "noticePeriod", label: "Notice period" },
    { key: "keywordMatch", label: "Keyword match" },
];

const SettingsSection = () => {
    const qc = useQueryClient();
    const { data, isLoading } = useQuery({ queryKey: queryKeys.recruitment.settings(), queryFn: getRecruitmentSettings });
    const [draft, setDraft] = useState<RecruitmentSettings | null>(null);
    const settings = draft ?? data ?? null;

    const saveMut = useMutation({
        mutationFn: (payload: Partial<RecruitmentSettings>) => saveRecruitmentSettings(payload),
        onSuccess: (s) => { toast({ icon: "success", title: "Settings saved" }); setDraft(null); qc.setQueryData(queryKeys.recruitment.settings(), s); },
        onError: () => toast({ icon: "error", title: "Could not save (admin permission required)" }),
    });

    const setWeight = (key: keyof ScoringWeights, value: number) => {
        if (!settings) return;
        setDraft({ ...settings, weights: { ...settings.weights, [key]: value } });
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
                    <Typography sx={{ fontWeight: 700, fontSize: { xs: 14.5, sm: 15.5 }, lineHeight: 1.3 }}>Scoring &amp; Automation</Typography>
                    <Typography sx={{ fontSize: 12.5, lineHeight: 1.45, color: "text.secondary", mt: 0.25 }}>Tune how candidates are scored and which automations run.</Typography>
                </Box>
                <WtButton
                    tone="primary" size="small" disabled={!draft || saveMut.isPending} onClick={() => draft && saveMut.mutate(draft)}
                    sx={{ flexShrink: 0, minHeight: 36, px: { xs: 1.5, sm: 2 }, fontSize: 13, borderRadius: "10px", alignSelf: "flex-start" }}
                >
                    {saveMut.isPending ? "Saving…" : "Save"}
                </WtButton>
            </Stack>

            {isLoading || !settings ? (
                <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={22} /></Stack>
            ) : (
                <Stack spacing={1.5}>
                    <Typography sx={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "text.secondary" }}>
                        Scoring weights (relative)
                    </Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, minmax(0, 1fr))" }, gap: 1.5 }}>
                        {WEIGHT_FIELDS.map((w) => (
                            <TextField
                                key={w.key}
                                label={w.label}
                                type="number"
                                size="small"
                                value={settings.weights[w.key]}
                                onChange={(e) => setWeight(w.key, Math.max(0, Number(e.target.value) || 0))}
                                inputProps={{ min: 0, step: 0.05 }}
                            />
                        ))}
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "text.secondary", pt: 0.5 }}>
                        Automation rules
                    </Typography>
                    <WtSwitchField title="Auto-advance on threshold" description="Move a candidate to the next stage when their score clears the stage threshold." checked={settings.autoRules.autoAdvanceEnabled} onChange={(e) => setRule("autoAdvanceEnabled", e.target.checked)} />
                    <WtSwitchField title="Auto-reject below floor" description="Off by default — keeps a human in the loop." checked={settings.autoRules.autoRejectEnabled} onChange={(e) => setRule("autoRejectEnabled", e.target.checked)} />
                    <WtSwitchField title="AI screening (Claude)" description="Per-company opt-in. Also requires the server AI key to be configured." checked={settings.autoRules.aiScreeningEnabled} onChange={(e) => setRule("aiScreeningEnabled", e.target.checked)} />
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
        <MasterSection
            title="Requisition Stages" description="Lifecycle of a job requisition (open / on-hold / filled)." icon="questionnaire-tablet" trio={TRIO.cyan}
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
            title="Applicant Sources" description="Where candidates come from (referral, careers page, agency…)." icon="user-tick" trio={TRIO.amber}
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
