import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Box, Stack, Typography, TextField, MenuItem, Chip, CircularProgress, DialogContent, DialogActions,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassDialog, GlassHeader, GlassCard, WtButton, WtIconButton, ToneChip, WtDateTimeField, WtField, toast } from "@app/modules/common/components/ui";
import { EmployeePickerField } from "@app/modules/common/components/EmployeePickerField";
import { queryKeys } from "@/lib/queryKeys";
import {
    getApplicationInterviews, createInterview, updateInterview, submitScorecard, getApplicationEvaluation,
    type Interview, type InterviewPayload, type ScorecardPayload,
    getScorecardTemplateForInterview,
    type DecisionOutcome, type RatingScale,
} from "@services/recruitment";

const TYPES = ["PHONE", "VIDEO", "ONSITE", "TECHNICAL", "HR"];
const MODES = ["ONLINE", "OFFLINE"];
const STATUSES = ["SCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED", "RESCHEDULED"];
// The rating scale and the decision wording are NOT declared here. They are
// properties of the scorecard template and arrive with it, because the company
// scores interviews three different ways depending on which of its own forms you
// read — Good/Average/Poor on the printed Master Form, out of 10 in the tracker
// workbook, out of 5 in this app. A list in this file would be a fourth.

/** Tone for a decision, from its MEANING rather than its label. */
const outcomeTone = (outcome?: DecisionOutcome) =>
    outcome === "ADVANCE" ? "success" : outcome === "REJECT" ? "danger" : "warning";

/**
 * A neutral opening rating: the middle of whatever scale applies. The dialog used
 * to open on 4 out of 5, which quietly starts every candidate above the midpoint.
 */
const midpointOf = (scale: RatingScale) => Math.round((scale.min + scale.max) / 2);

/**
 * One rating input, rendered in whatever vocabulary the rubric carries: a worded
 * scale becomes a select of those exact words, a numeric scale a bounded number
 * field. Used for the criteria AND the overall rating, so the two cannot disagree
 * about what counts as a valid score.
 */
const RatingControl = ({
    scale, value, onChange, ariaLabel, fullWidth,
}: {
    scale: RatingScale;
    value: number | "";
    onChange: (value: number) => void;
    ariaLabel: string;
    fullWidth?: boolean;
}) => {
    if (scale.levels?.length) {
        return (
            <TextField
                select size="small" fullWidth={fullWidth} sx={fullWidth ? undefined : { width: 140 }}
                value={value === "" ? "" : String(value)}
                onChange={(e) => onChange(Number(e.target.value))}
                inputProps={{ "aria-label": ariaLabel }}
            >
                {scale.levels.map((level) => (
                    <MenuItem key={level.value} value={String(level.value)}>{level.label}</MenuItem>
                ))}
            </TextField>
        );
    }
    return (
        <TextField
            type="number" size="small" fullWidth={fullWidth} sx={fullWidth ? undefined : { width: 92 }}
            inputProps={{ min: scale.min, max: scale.max, "aria-label": ariaLabel }}
            value={value}
            // Clamped on the way in as well as on the server: typing 9 on a scale that
            // stops at 5 should correct itself, not fail on save.
            onChange={(e) => onChange(Math.min(scale.max, Math.max(scale.min, Number(e.target.value) || scale.min)))}
        />
    );
};

const toLocalInput = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");

interface Props {
    applicationId: string;
    applicantName: string;
}

const emptySchedule = (): InterviewPayload => ({
    applicationId: "",
    round: 1,
    type: "VIDEO",
    mode: "ONLINE",
    scheduledStart: "",
    scheduledEnd: "",
    meetingLink: "",
    location: "",
    panelistIds: [],
});

/**
 * Interviews + scorecards for one application: schedule (glass dialog, emails the
 * candidate + panel), list with status control, per-panelist scorecard capture,
 * and a weighted evaluation summary. Glass kit + KTIcon + responsive.
 */
const InterviewsPanel = ({ applicationId, applicantName }: Props) => {
    const qc = useQueryClient();
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [form, setForm] = useState<InterviewPayload>({ ...emptySchedule(), applicationId });
    const [scoreFor, setScoreFor] = useState<Interview | null>(null);
    const [score, setScore] = useState<ScorecardPayload>({ overallRating: 4, recommendation: "YES", comments: "" });

    // The rubric for the interview being scored. Resolved server-side from the
    // requisition’s designation, falling back to the tenant default; null is an ordinary
    // answer, and the dialog then behaves exactly as it did before rubrics existed.
    const { data: rubric } = useQuery({
        queryKey: queryKeys.recruitment.scorecardTemplateFor(scoreFor?.id ?? ""),
        queryFn: () => getScorecardTemplateForInterview(scoreFor!.id),
        enabled: !!scoreFor,
    });

    const factors = rubric?.template?.factors ?? [];
    const scale = rubric?.scale;
    const decisions = rubric?.decisions;
    const setFactor = (factorId: string, value: number) =>
        setScore((prev) => ({ ...prev, factorScores: { ...(prev.factorScores ?? {}), [factorId]: value } }));

    // The dialog opens before its rubric has loaded, so the draft starts on the
    // app default and is corrected once the server says which vocabulary applies.
    // Only values the resolved rubric would REJECT are replaced — a rating the
    // interviewer already entered inside the valid range is left alone.
    useEffect(() => {
        if (!scale || !decisions) return;
        setScore((prev) => {
            const decisionOk = decisions.options.some((o) => o.value === prev.recommendation);
            const ratingOk = prev.overallRating >= scale.min && prev.overallRating <= scale.max;
            if (decisionOk && ratingOk) return prev;
            return {
                ...prev,
                recommendation: decisionOk ? prev.recommendation : (decisions.options[0]?.value ?? ""),
                overallRating: ratingOk ? prev.overallRating : midpointOf(scale),
            };
        });
    }, [scale, decisions]);

    const { data: interviews = [], isLoading } = useQuery({ queryKey: queryKeys.recruitment.interviews(applicationId), queryFn: () => getApplicationInterviews(applicationId) });
    const { data: evaluation } = useQuery({ queryKey: queryKeys.recruitment.evaluation(applicationId), queryFn: () => getApplicationEvaluation(applicationId) });

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: queryKeys.recruitment.interviews(applicationId) });
        qc.invalidateQueries({ queryKey: queryKeys.recruitment.evaluation(applicationId) });
    };

    const scheduleMut = useMutation({
        mutationFn: () => createInterview({
            ...form,
            applicationId,
            scheduledStart: form.scheduledStart ? new Date(form.scheduledStart).toISOString() : "",
            scheduledEnd: form.scheduledEnd ? new Date(form.scheduledEnd).toISOString() : "",
        }),
        onSuccess: () => { toast({ icon: "success", title: "Interview scheduled — invites sent" }); setScheduleOpen(false); invalidate(); },
        onError: () => toast({ icon: "error", title: "Could not schedule interview" }),
    });

    const statusMut = useMutation({
        mutationFn: (vars: { id: string; status: string }) => updateInterview(vars.id, { status: vars.status }),
        onSuccess: () => { toast({ icon: "success", title: "Interview updated" }); invalidate(); },
        onError: () => toast({ icon: "error", title: "Could not update" }),
    });

    const scoreMut = useMutation({
        mutationFn: () => submitScorecard(scoreFor!.id, score),
        onSuccess: () => { toast({ icon: "success", title: "Scorecard saved" }); setScoreFor(null); invalidate(); },
        onError: () => toast({ icon: "error", title: "Could not save scorecard" }),
    });

    const openSchedule = () => {
        const start = new Date(Date.now() + 86_400_000);
        const end = new Date(start.getTime() + 45 * 60_000);
        setForm({ ...emptySchedule(), applicationId, scheduledStart: toLocalInput(start.toISOString()), scheduledEnd: toLocalInput(end.toISOString()) });
        setScheduleOpen(true);
    };
    const canSchedule = !!form.scheduledStart && !!form.scheduledEnd && (form.panelistIds?.length ?? 0) > 0;

    return (
        <Box>
            <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 16, flex: 1 }}>Interviews — {applicantName}</Typography>
                {evaluation && evaluation.scorecardCount > 0 && (
                    <ToneChip
                        tone={evaluation.verdict === "MIXED" ? "warning" : outcomeTone(evaluation.verdict ?? undefined)}
                        // Falls back to the comparable percentage when the panel spans two
                        // scales, where a single mean would describe neither of them.
                        label={`${
                            evaluation.averageOverall !== null
                                ? evaluation.averageOverall
                                : evaluation.averagePercent !== null
                                    ? `${Math.round(evaluation.averagePercent * 100)}%`
                                    : "—"
                        } · ${evaluation.scorecardCount} scorecard(s)`}
                        dense
                    />
                )}
                <WtButton tone="primary" size="small" startIcon={<KTIcon iconName="plus" className="fs-6" />} onClick={openSchedule}>Schedule</WtButton>
            </Stack>

            {isLoading ? (
                <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={22} /></Stack>
            ) : interviews.length === 0 ? (
                <Typography sx={{ color: "text.secondary", fontSize: 13 }}>No interviews scheduled yet.</Typography>
            ) : (
                <Stack spacing={1}>
                    {interviews.map((iv) => (
                        <GlassCard key={iv.id} preset="row">
                            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexWrap: "wrap" }}>
                                <Box sx={{ flex: 1, minWidth: 160 }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Round {iv.round} · {iv.type} · {iv.mode}</Typography>
                                    <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                                        {new Date(iv.scheduledStart).toLocaleString()} · {iv.panelistIds?.length ?? 0} panelist(s) · {iv.scorecards?.length ?? 0} scorecard(s)
                                    </Typography>
                                </Box>
                                <TextField
                                    select size="small" value={iv.status} sx={{ minWidth: 140 }}
                                    onChange={(e) => statusMut.mutate({ id: iv.id, status: e.target.value })}
                                >
                                    {STATUSES.map((s) => <MenuItem key={s} value={s}>{s.replace("_", " ")}</MenuItem>)}
                                </TextField>
                                <WtIconButton title="Add scorecard" onClick={() => { setScoreFor(iv); setScore({ overallRating: 4, recommendation: "YES", comments: "", factorScores: null }); }}>
                                    <KTIcon iconName="questionnaire-tablet" className="fs-5" />
                                </WtIconButton>
                            </Stack>
                        </GlassCard>
                    ))}
                </Stack>
            )}

            {/* Schedule interview */}
            <GlassDialog
                open={scheduleOpen}
                onClose={() => setScheduleOpen(false)}
                maxWidth="sm"
                header={<GlassHeader title="Schedule interview" subtitle="Candidate + panel are emailed an invite" icon={<KTIcon iconName="message-text-2" className="fs-2" />} onClose={() => setScheduleOpen(false)} />}
            >
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField label="Round" type="number" size="small" sx={{ flex: 1 }} value={form.round} onChange={(e) => setForm({ ...form, round: Number(e.target.value) || 1 })} />
                            <TextField label="Type" select size="small" sx={{ flex: 1 }} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                {TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                            </TextField>
                            <TextField label="Mode" select size="small" sx={{ flex: 1 }} value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                                {MODES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                            </TextField>
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <WtDateTimeField label="Start" sx={{ flex: 1 }} value={form.scheduledStart} onChange={(v) => setForm({ ...form, scheduledStart: v })} />
                            {/* An interview cannot end before it starts — the native input allowed it. */}
                            <WtDateTimeField label="End" sx={{ flex: 1 }} minDateTime={form.scheduledStart || undefined} value={form.scheduledEnd} onChange={(v) => setForm({ ...form, scheduledEnd: v })} />
                        </Stack>
                        <TextField label={form.mode === "ONLINE" ? "Meeting link" : "Location"} size="small" fullWidth value={(form.mode === "ONLINE" ? form.meetingLink : form.location) ?? ""} onChange={(e) => setForm(form.mode === "ONLINE" ? { ...form, meetingLink: e.target.value } : { ...form, location: e.target.value })} />
                        <EmployeePickerField
                            label="Panelists" multiple
                            placeholder="Add interviewers…"
                            helperText="Interviewers to invite and who can score this round."
                            dialogTitle="Select panelists"
                            value={form.panelistIds ?? []}
                            onChange={(ids) => setForm({ ...form, panelistIds: ids })}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <WtButton ghost onClick={() => setScheduleOpen(false)}>Cancel</WtButton>
                    <WtButton tone="primary" disabled={!canSchedule || scheduleMut.isPending} onClick={() => scheduleMut.mutate()}>{scheduleMut.isPending ? "Scheduling…" : "Schedule & invite"}</WtButton>
                </DialogActions>
            </GlassDialog>

            {/* Scorecard capture */}
            <GlassDialog
                open={!!scoreFor}
                onClose={() => setScoreFor(null)}
                maxWidth="xs"
                header={<GlassHeader title="Interview scorecard" subtitle={`Round ${scoreFor?.round ?? ""}`} icon={<KTIcon iconName="questionnaire-tablet" className="fs-2" />} onClose={() => setScoreFor(null)} />}
            >
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        {/* The rubric, when one is configured. Each criterion is scored 1–5 and
                            stored against its factor id, so a later rename of the label cannot
                            silently re-point a score that was already given. */}
                        {factors.length > 0 && scale && (
                            <Box>
                                <Typography sx={{ fontSize: 12.5, color: "text.secondary", mb: 1 }}>
                                    {rubric?.template?.name ?? "Criteria"}
                                </Typography>
                                <Stack spacing={1.25}>
                                    {factors.map((factor) => (
                                        <Stack key={factor.id} direction="row" alignItems="center" spacing={1.5}>
                                            <Typography sx={{ flex: 1, fontSize: 13.5, minWidth: 0 }}>
                                                {factor.label}
                                                {Number(factor.weight) !== 1 && (
                                                    <Typography component="span" sx={{ ml: 0.75, fontSize: 11.5, color: "text.disabled" }}>
                                                        ×{Number(factor.weight)}
                                                    </Typography>
                                                )}
                                            </Typography>
                                            <RatingControl
                                                scale={scale!}
                                                value={score.factorScores?.[factor.id] ?? ""}
                                                onChange={(v) => setFactor(factor.id, v)}
                                                ariaLabel={`${factor.label} — ${scale!.label}`}
                                            />
                                        </Stack>
                                    ))}
                                </Stack>
                            </Box>
                        )}
                        {/* Both controls wait for the server to say which vocabulary applies,
                            rather than guessing one and correcting it a moment later. */}
                        {!scale || !decisions ? (
                            <Stack alignItems="center" sx={{ py: 1.5 }}><CircularProgress size={18} /></Stack>
                        ) : (
                            <>
                                <Box>
                                    <Typography sx={{ fontSize: 12.5, color: "text.secondary", mb: 0.75 }}>
                                        Overall rating · {scale.label}
                                    </Typography>
                                    <RatingControl
                                        scale={scale}
                                        value={score.overallRating}
                                        onChange={(v) => setScore({ ...score, overallRating: v })}
                                        ariaLabel={`Overall rating — ${scale.label}`}
                                        fullWidth
                                    />
                                </Box>
                                <WtField
                                    // The set's own name is the label when it is short enough to read
                                    // as one ("Hire / Hold / Reject"); otherwise it would wrap and the
                                    // generic word is clearer.
                                    label={decisions.label.length > 40 ? "Decision" : decisions.label}
                                    value={score.recommendation}
                                    onChange={(v) => setScore({ ...score, recommendation: v })}
                                    options={decisions.options.map((o) => ({ value: o.value, label: o.label }))}
                                />
                            </>
                        )}
                        <WtField
                            label="Comments"
                            multiline minRows={3}
                            value={score.comments ?? ""}
                            onChange={(v) => setScore({ ...score, comments: v })}
                            placeholder="What did you see? Evidence beats adjectives."
                        />
                        {scoreFor && (scoreFor.scorecards?.length ?? 0) > 0 && (
                            <Box>
                                <Typography sx={{ fontSize: 12.5, color: "text.secondary", mb: 0.5 }}>Existing scorecards</Typography>
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                    {scoreFor.scorecards!.map((sc) => (
                                        // The denominator is shown only when this card NAMES the scale now on
                                        // screen. A card with no scale recorded predates the column and means the
                                        // app default, which is not necessarily this rubric — borrowing this
                                        // maximum would restate a 4 out of 5 as 4 out of 3.
                                        <Chip
                                            key={sc.id}
                                            size="small"
                                            label={`${sc.overallRating}${
                                                sc.ratingScale && scale && sc.ratingScale === scale.id ? `/${scale.max}` : ""
                                            } · ${
                                                decisions?.options.find((o) => o.value === sc.recommendation)?.label
                                                    ?? sc.recommendation.replace(/_/g, " ").toLowerCase()
                                            }`}
                                        />
                                    ))}
                                </Stack>
                            </Box>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <WtButton ghost onClick={() => setScoreFor(null)}>Cancel</WtButton>
                    <WtButton tone="primary" disabled={scoreMut.isPending} onClick={() => scoreMut.mutate()}>{scoreMut.isPending ? "Saving…" : "Save scorecard"}</WtButton>
                </DialogActions>
            </GlassDialog>
        </Box>
    );
};

export default InterviewsPanel;
