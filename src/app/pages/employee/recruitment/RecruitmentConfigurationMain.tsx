import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Stack, Typography, CircularProgress } from "@mui/material";
import {
    WtField, WtSwitchField, TRIO, WtEmptyState, toast,
    MasterListSection, WeightSliderList, type MasterListRow,
} from "@app/modules/common/components/ui";
import { ConfigPageLayout, ConfigSectionCard } from "@app/modules/configuration";
import { queryKeys } from "@/lib/queryKeys";
import { apiErrorMessage } from "@utils/apiError";
import { TERMS } from "./terms";
import ScorecardTemplateSection from "./ScorecardTemplateSection";
import RubricComparisonSection from "./RubricComparisonSection";
import {
    getApplicationStatuses, createApplicationStatus, updateApplicationStatus, deleteApplicationStatus,
    getRequisitionStages, createRequisitionStage, updateRequisitionStage, deleteRequisitionStage,
    getRejectionReasons, createRejectionReason, updateRejectionReason, deleteRejectionReason,
    getApplicantSources, createApplicantSource, updateApplicantSource, deleteApplicantSource,
    getRecruitmentSettings, saveRecruitmentSettings,
    type RecruitmentSettings, type ScoringWeights, type ScoreBandThresholds, type StageAgeingThresholds,
} from "@services/recruitment";

const DEFAULT_SCORE_BANDS: ScoreBandThresholds = { excellent: 90, good: 75, fair: 60 };
const DEFAULT_STAGE_AGEING: StageAgeingThresholds = { amberDays: 7, redDays: 14 };

const field = (row: MasterListRow, key: string): unknown => (row as Record<string, unknown>)[key];

/** Pipeline stages: stage-entry auto-email + auto-advance threshold (domain-only dialog extras). */
const pipelineExtraFromRow = (row: MasterListRow): Record<string, string> => {
    const t = field(row, "autoAdvanceThreshold");
    return {
        emailSubject: String(field(row, "autoEmailSubject") ?? ""),
        emailBody: String(field(row, "autoEmailBody") ?? ""),
        threshold: t == null ? "" : String(t),
    };
};

const pipelineExtraToPayload = (extra: Record<string, string>): Record<string, unknown> => ({
    autoEmailSubject: extra.emailSubject || null,
    autoEmailBody: extra.emailBody || null,
    autoAdvanceThreshold: extra.threshold === "" ? null : Number(extra.threshold),
});

const WEIGHT_FIELDS: { key: keyof ScoringWeights; label: string; hint: string }[] = [
    { key: "ctcFit", label: "Salary fit", hint: "Expected CTC against the role's band" },
    { key: "experience", label: "Experience", hint: "Years, ramping to full marks around five" },
    { key: "noticePeriod", label: "Availability", hint: "Notice period — immediate scores highest" },
    { key: "keywordMatch", label: "Title match", hint: "The role's wording against current title and employer" },
];

/** Hiring defaults, scoring weights, and automation toggles. */
const ScoringAutomationSection = () => {
    const qc = useQueryClient();
    const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: queryKeys.recruitment.settings(), queryFn: getRecruitmentSettings });
    const [draft, setDraft] = useState<RecruitmentSettings | null>(null);
    const settings = draft ?? data ?? null;

    const saveMut = useMutation({
        mutationFn: (payload: Partial<RecruitmentSettings>) => saveRecruitmentSettings(payload),
        onSuccess: (s) => { toast({ icon: "success", title: "Settings saved" }); setDraft(null); qc.setQueryData(queryKeys.recruitment.settings(), s); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not save the settings") }),
    });

    const setRule = (key: keyof RecruitmentSettings["autoRules"], value: boolean) => {
        if (!settings) return;
        setDraft({ ...settings, autoRules: { ...settings.autoRules, [key]: value } });
    };

    return (
        <ConfigSectionCard
            title="Scoring & pipeline ageing"
            description="How the rule score is weighted and banded, and when a candidate waiting in a stage turns amber then red."
            icon="bi-sliders"
            iconColor="purple"
            primaryAction={draft ? {
                label: saveMut.isPending ? "Saving…" : "Save",
                icon: "bi-check-lg",
                onClick: () => draft && saveMut.mutate(draft),
                variant: "primary",
                disabled: saveMut.isPending,
            } : undefined}
            loading={isLoading}
        >
            {isError ? (
                <WtEmptyState
                    variant="error"
                    dense
                    title="Could not load settings"
                    hint={apiErrorMessage(error, "Check your connection and try again.")}
                    actionLabel="Retry"
                    onAction={() => refetch()}
                />
            ) : !settings && !isLoading ? (
                <WtEmptyState dense title="No settings" hint="Recruitment settings could not be loaded." />
            ) : settings ? (
                <Stack spacing={2.5}>
                    <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: 13, mb: 1 }}>Scoring weights</Typography>
                        <WeightSliderList
                            fields={WEIGHT_FIELDS}
                            weights={settings.weights as unknown as Record<string, number>}
                            onChange={(next) => setDraft({ ...settings, weights: next as unknown as ScoringWeights })}
                            disabled={saveMut.isPending}
                        />
                    </Box>
                    <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: 13, mb: 0.5 }}>Score bands</Typography>
                        <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1.5 }}>
                            Minimum scores for Excellent, Good, and Fair. Below Fair shows as Weak on every card.
                        </Typography>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            {([
                                { key: "excellent" as const, label: "Excellent ≥" },
                                { key: "good" as const, label: "Good ≥" },
                                { key: "fair" as const, label: "Fair ≥" },
                            ]).map(({ key, label }) => {
                                const bands = settings.scoreBands ?? DEFAULT_SCORE_BANDS;
                                return (
                                    <WtField
                                        key={key}
                                        label={label}
                                        type="number"
                                        inputMode="numeric"
                                        min={0}
                                        max={100}
                                        step={1}
                                        sx={{ flex: 1 }}
                                        value={String(bands[key] ?? "")}
                                        onChange={(v) => {
                                            const n = v === "" ? bands[key] : Number(v);
                                            setDraft({
                                                ...settings,
                                                scoreBands: {
                                                    ...bands,
                                                    [key]: Number.isFinite(n) ? n : bands[key],
                                                },
                                            });
                                        }}
                                        disabled={saveMut.isPending}
                                    />
                                );
                            })}
                        </Stack>
                    </Box>
                    <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: 13, mb: 0.5 }}>Stage ageing</Typography>
                        <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1.5 }}>
                            Days sitting in one pipeline stage before the card ages, then stalls.
                        </Typography>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            {([
                                { key: "amberDays" as const, label: "Ageing (days)" },
                                { key: "redDays" as const, label: "Stalled (days)" },
                            ]).map(({ key, label }) => {
                                const ageing = settings.stageAgeing ?? DEFAULT_STAGE_AGEING;
                                return (
                                    <WtField
                                        key={key}
                                        label={label}
                                        type="number"
                                        inputMode="numeric"
                                        min={1}
                                        max={365}
                                        step={1}
                                        sx={{ flex: 1 }}
                                        value={String(ageing[key] ?? "")}
                                        onChange={(v) => {
                                            const n = v === "" ? ageing[key] : Number(v);
                                            setDraft({
                                                ...settings,
                                                stageAgeing: {
                                                    ...ageing,
                                                    [key]: Number.isFinite(n) ? n : ageing[key],
                                                },
                                            });
                                        }}
                                        disabled={saveMut.isPending}
                                    />
                                );
                            })}
                        </Stack>
                    </Box>
                    <Stack spacing={1}>
                        <Typography sx={{ fontWeight: 600, fontSize: 13 }}>Automations</Typography>
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
                </Stack>
            ) : (
                <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={22} /></Stack>
            )}
        </ConfigSectionCard>
    );
};

/** Same shell as Gift / Billing Configure: ConfigPageLayout + column stack + chip sections. */
const RecruitmentConfigurationMain = () => (
    <ConfigPageLayout>
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                px: { xs: 2, sm: 3 },
                py: 2,
            }}
        >
            <MasterListSection
                title="Pipeline Stages"
                description="Stages candidates move through. Order follows sort order from the server."
                biIcon="bi-diagram-3"
                icon="chart-simple"
                tone={TRIO.blue}
                iconColor="blue"
                queryKey={queryKeys.recruitment.applicationStatuses()}
                labelField="name"
                fetchFn={getApplicationStatuses}
                createFn={(p) => createApplicationStatus(p as never)}
                updateFn={(id, p) => updateApplicationStatus(id, p as never)}
                deleteFn={deleteApplicationStatus}
                flags={[
                    { key: "isDefault", label: "Default" },
                    { key: "isHiredOutcome", label: "Hired", tone: "success" },
                    { key: "isRejectedOutcome", label: "Rejected", tone: "danger" },
                    { key: "requiresReason", label: "Needs reason", tone: "warning" },
                ]}
                extraFromRow={pipelineExtraFromRow}
                extraToPayload={pipelineExtraToPayload}
                renderExtraFields={({ disabled, extra, setExtra }) => (
                    <>
                        <Typography sx={{ fontWeight: 600, fontSize: 13, color: "text.secondary", mt: 1 }}>Stage-Entry Email (Optional)</Typography>
                        <WtField
                            label="Email Subject" fullWidth disabled={disabled}
                            value={extra.emailSubject ?? ""} onChange={(v) => setExtra((e) => ({ ...e, emailSubject: v }))}
                        />
                        <WtField
                            label="Email Body" fullWidth multiline minRows={4} disabled={disabled}
                            hint="Tokens: {first_name} {candidate_name} {job_title} {stage_name} {application_ref}. Leave empty to disable."
                            value={extra.emailBody ?? ""} onChange={(v) => setExtra((e) => ({ ...e, emailBody: v }))}
                        />
                        <WtField
                            label="Auto-Advance Threshold" type="number" inputMode="numeric" min={0} max={100} step={1}
                            minWidth={240} disabled={disabled}
                            value={extra.threshold ?? ""} onChange={(v) => setExtra((e) => ({ ...e, threshold: v }))}
                            hint="Kept with the stage for when auto-advance is wired; nothing moves a candidate on its own today."
                        />
                    </>
                )}
            />

            <ScorecardTemplateSection />
            <RubricComparisonSection />

            <MasterListSection
                title={`${TERMS.Requisition} Stages`}
                description="Lifecycle of a role (open / on-hold / filled)."
                biIcon="bi-file-earmark-text"
                icon="questionnaire-tablet"
                tone={TRIO.cyan}
                iconColor="teal"
                queryKey={queryKeys.recruitment.requisitionStages()}
                labelField="name"
                fetchFn={getRequisitionStages}
                createFn={(p) => createRequisitionStage(p as never)}
                updateFn={(id, p) => updateRequisitionStage(id, p as never)}
                deleteFn={deleteRequisitionStage}
                flags={[
                    { key: "isDefault", label: "Default" },
                    { key: "isOpenTrigger", label: "Opens headcount", tone: "success" },
                    { key: "isTerminal", label: "Terminal" },
                ]}
            />

            <MasterListSection
                title="Rejection Reasons"
                description="Reasons captured when a candidate is rejected."
                biIcon="bi-x-circle"
                icon="cross"
                tone={TRIO.rose}
                iconColor="danger"
                queryKey={queryKeys.recruitment.rejectionReasons()}
                labelField="reason"
                fetchFn={getRejectionReasons}
                createFn={(p) => createRejectionReason(p as never)}
                updateFn={(id, p) => updateRejectionReason(id, p as never)}
                deleteFn={deleteRejectionReason}
            />

            <MasterListSection
                title={`${TERMS.Candidate} Sources`}
                description="Where candidates come from (referral, careers page, agency…)."
                biIcon="bi-people"
                icon="user-tick"
                tone={TRIO.amber}
                iconColor="amber"
                queryKey={queryKeys.recruitment.applicantSources()}
                labelField="name"
                fetchFn={getApplicantSources}
                createFn={(p) => createApplicantSource(p as never)}
                updateFn={(id, p) => updateApplicantSource(id, p as never)}
                deleteFn={deleteApplicantSource}
                flags={[{ key: "isReferral", label: "Referral", tone: "brand" }]}
            />

            <ScoringAutomationSection />
        </Box>
    </ConfigPageLayout>
);

export default RecruitmentConfigurationMain;
