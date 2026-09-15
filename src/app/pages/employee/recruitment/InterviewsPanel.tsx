import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Box, Stack, Typography, TextField, MenuItem, Chip, CircularProgress, DialogContent, DialogActions } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    GlassDialog, GlassHeader, GlassCard, WtButton, WtIconButton, ToneChip, WtDateTimeField, WtField, SettingsSection, TRIO,
    toast, WtEmptyState,
} from "@app/modules/common/components/ui";
import { EmployeePickerField } from "@app/modules/common/components/EmployeePickerField";
import { queryKeys } from "@/lib/queryKeys";
import { formatDateTime } from "@utils/dateFormats";
import { apiErrorMessage } from "@utils/apiError";
import { COPY } from "./terms";
import {
    getApplicationInterviews, createInterview, updateInterview, submitScorecard, getApplicationEvaluation,
    type Interview, type InterviewPayload, type ScorecardPayload,
    getScorecardTemplateForInterview,
    type DecisionOutcome, type RatingScale,
} from "@services/recruitment";

/** Stored codes → what a person reads. The codes stay on the wire; only the labels are for people. */
const TYPES = [
    { value: "PHONE", label: "Phone screen" },
    { value: "VIDEO", label: "Video" },
    { value: "ONSITE", label: "On-site" },
    { value: "TECHNICAL", label: "Technical" },
    { value: "HR", label: "HR" },
];
const MODES = [
    { value: "ONLINE", label: "Online" },
    { value: "OFFLINE", label: "In person" },
];
const STATUSES = [
    { value: "SCHEDULED", label: "Scheduled" },
    { value: "RESCHEDULED", label: "Rescheduled" },
    { value: "COMPLETED", label: "Completed" },
    { value: "NO_SHOW", label: "No-show" },
    { value: "CANCELLED", label: "Cancelled" },
];
const labelOf = (list: { value: string; label: string }[], code: string) => list.find((o) => o.value === code)?.label ?? code;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
// The rating scale and the decision wording are NOT declared here. They are
// properties of the scorecard template and arrive with it, because the company
// scores interviews three different ways depending on which of its own forms you
// read — Good/Average/Poor on the printed Master Form, out of 10 in the tracker
// workbook, out of 5 in this app. A list in this file would be a fourth.

/** Tone for a decision, from its MEANING rather than its label. */
const outcomeTone = (outcome?: DecisionOutcome) =>
    outcome === "ADVANCE" ? "success" : outcome === "REJECT" ? "danger" : "warning";

/** A neutral opening rating: the middle of whatever scale applies. */
const midpointOf = (scale: RatingScale) => Math.round((scale.min + scale.max) / 2);

/**
 * A scorecard draft before the rubric has said which vocabulary applies. The rating and the
 * decision are deliberately out of range, so the effect below always replaces them with the
 * rubric's own midpoint and first decision — never a hardcoded "4 / YES" that starts every
 * candidate above the middle.
 */
const blankScorecard = (): ScorecardPayload => ({ overallRating: -1, recommendation: "", comments: "", factorScores: null });

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

/** The date-time field speaks LOCAL wall-clock `YYYY-MM-DDTHH:mm`; toISOString would hand it UTC. */
const toLocalInput = (d: Date) => dayjs(d).format("YYYY-MM-DDTHH:mm");

interface Props {
    applicationId: string;
    applicantName: string;
}

const emptySchedule = (): InterviewPayload => ({
    applicationId: "",
    type: "VIDEO",
    mode: "ONLINE",
    scheduledStart: "",
    scheduledEnd: "",
    meetingLink: "",
    location: "",
    panelistIds: [],
});

/**
 * Interviews + scorecards for one application: schedule (emails the candidate + panel), list
 * with status control, per-panelist scorecard capture, and a weighted evaluation summary.
 * Framed as a kit SettingsSection, so it sits in the candidate modal and in its own dialog alike.
 */
const InterviewsPanel = ({ applicationId, applicantName }: Props) => {
    const qc = useQueryClient();
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [form, setForm] = useState<InterviewPayload>({ ...emptySchedule(), applicationId });
    // Text, not a number: a number state turns a cleared field back into "1" mid-typing, so
    // replacing 1 with 2 produced 12.
    const [roundText, setRoundText] = useState("1");
    const [scoreFor, setScoreFor] = useState<Interview | null>(null);
    const [score, setScore] = useState<ScorecardPayload>(blankScorecard());

    // The rubric for the interview being scored. Resolved server-side from the
    // requisition's designation, falling back to the tenant default; null is an ordinary
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

    // Once the server says which vocabulary applies, values the rubric would REJECT are
    // replaced; a rating the interviewer already entered inside the range is left alone.
    // Keyed on the interview too: reopening the same one reuses the cached rubric object, and
    // without it the fresh blank draft would never be filled.
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
    }, [scale, decisions, scoreFor?.id]);

    const { data: interviews = [], isLoading, isError } = useQuery({ queryKey: queryKeys.recruitment.interviews(applicationId), queryFn: () => getApplicationInterviews(applicationId) });
    const { data: evaluation } = useQuery({ queryKey: queryKeys.recruitment.evaluation(applicationId), queryFn: () => getApplicationEvaluation(applicationId) });

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: queryKeys.recruitment.interviews(applicationId) });
        qc.invalidateQueries({ queryKey: queryKeys.recruitment.evaluation(applicationId) });
    };

    const round = Number.parseInt(roundText, 10);
    const roundValid = Number.isInteger(round) && round >= 1;

    const scheduleMut = useMutation({
        mutationFn: () => createInterview({
            ...form,
            applicationId,
            round,
            scheduledStart: form.scheduledStart ? new Date(form.scheduledStart).toISOString() : "",
            scheduledEnd: form.scheduledEnd ? new Date(form.scheduledEnd).toISOString() : "",
        }),
        onSuccess: () => { toast({ icon: "success", title: "Interview scheduled — invites sent" }); setScheduleOpen(false); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not schedule the interview") }),
    });

    const statusMut = useMutation({
        mutationFn: (vars: { id: string; status: string }) => updateInterview(vars.id, { status: vars.status }),
        onSuccess: () => { toast({ icon: "success", title: "Interview updated" }); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not update the interview") }),
    });

    const scoreMut = useMutation({
        mutationFn: () => submitScorecard(scoreFor!.id, score),
        onSuccess: () => { toast({ icon: "success", title: "Scorecard saved" }); setScoreFor(null); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not save the scorecard") }),
    });

    const openSchedule = () => {
        // Tomorrow, on the hour — a clean slot rather than "this exact minute plus a day".
        const start = dayjs().add(1, "day").startOf("hour").toDate();
        const end = dayjs(start).add(45, "minute").toDate();
        setForm({ ...emptySchedule(), applicationId, scheduledStart: toLocalInput(start), scheduledEnd: toLocalInput(end) });
        setRoundText(String(interviews.length + 1));
        setScheduleOpen(true);
    };
    const openScorecard = (iv: Interview) => { setScore(blankScorecard()); setScoreFor(iv); };

    const endAfterStart = !!form.scheduledStart && !!form.scheduledEnd && dayjs(form.scheduledEnd).isAfter(dayjs(form.scheduledStart));
    const canSchedule = roundValid && endAfterStart && (form.panelistIds?.length ?? 0) > 0;

    const summary = evaluation && evaluation.scorecardCount > 0
        ? `${evaluation.averageOverall !== null
            ? `Average ${evaluation.averageOverall}`
            // Falls back to the comparable percentage when the panel spans two scales,
            // where a single mean would describe neither of them.
            : evaluation.averagePercent !== null ? `Average ${Math.round(evaluation.averagePercent * 100)}%` : "No average"
        } · ${plural(evaluation.scorecardCount, "scorecard")}`
        : interviews.length ? plural(interviews.length, "round") : undefined;

    return (
        <SettingsSection
            tone={TRIO.green}
            icon="message-text-2"
            title="Interviews"
            description={summary}
            action={
                <WtButton tone="primary" size="small" startIcon={<KTIcon iconName="plus" className="fs-6" />} onClick={openSchedule} aria-label={`Schedule an interview with ${applicantName}`}>
                    Schedule
                </WtButton>
            }
        >
            {evaluation && evaluation.scorecardCount > 0 && evaluation.verdict && (
                <Box sx={{ mb: 1.5 }}>
                    <ToneChip tone={evaluation.verdict === "MIXED" ? "warning" : outcomeTone(evaluation.verdict)} label={`Panel verdict: ${evaluation.verdict === "MIXED" ? "Mixed" : evaluation.verdict.charAt(0) + evaluation.verdict.slice(1).toLowerCase()}`} dense />
                </Box>
            )}

            {isLoading ? (
                <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={22} /></Stack>
            ) : isError ? (
                <Typography sx={{ fontSize: 13, color: "error.main" }}>Could not load interviews.</Typography>
            ) : interviews.length === 0 ? (
                <WtEmptyState icon="calendar-add" title={COPY.noInterviews.title} hint={COPY.noInterviews.hint} dense />
            ) : (
                <Stack spacing={1}>
                    {interviews.map((iv) => (
                        <GlassCard key={iv.id} preset="row">
                            <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} spacing={1.5}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                                        Round {iv.round} · {labelOf(TYPES, iv.type)} · {labelOf(MODES, iv.mode)}
                                    </Typography>
                                    <Typography sx={{ fontSize: 12.5, color: "text.secondary", overflowWrap: "anywhere" }}>
                                        {formatDateTime(iv.scheduledStart)} · {plural(iv.panelistIds?.length ?? 0, "panelist")} · {plural(iv.scorecards?.length ?? 0, "scorecard")}
                                    </Typography>
                                </Box>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <WtField
                                        label="Status"
                                        value={iv.status}
                                        onChange={(v) => statusMut.mutate({ id: iv.id, status: v })}
                                        options={STATUSES.some((s) => s.value === iv.status) ? STATUSES : [...STATUSES, { value: iv.status, label: iv.status }]}
                                        disabled={statusMut.isPending}
                                        sx={{ flex: 1, minWidth: 150 }}
                                    />
                                    <WtIconButton title="Add scorecard" onClick={() => openScorecard(iv)}>
                                        <KTIcon iconName="questionnaire-tablet" className="fs-5" />
                                    </WtIconButton>
                                </Stack>
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
                header={<GlassHeader title="Schedule interview" subtitle={`${applicantName} and the panel are emailed an invite`} icon={<KTIcon iconName="message-text-2" className="fs-2" />} onClose={() => setScheduleOpen(false)} />}
            >
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <WtField label="Round" type="number" min={1} step={1} inputMode="numeric" required sx={{ flex: 1 }}
                                value={roundText} onChange={setRoundText} error={roundText !== "" && !roundValid ? "Round starts at 1" : undefined} />
                            <WtField label="Type" sx={{ flex: 1 }} value={form.type ?? ""} options={TYPES} onChange={(v) => setForm({ ...form, type: v })} />
                            <WtField label="Mode" sx={{ flex: 1 }} value={form.mode ?? ""} options={MODES} onChange={(v) => setForm({ ...form, mode: v })} />
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <WtDateTimeField label="Start" sx={{ flex: 1 }} value={form.scheduledStart} onChange={(v) => setForm({ ...form, scheduledStart: v })} />
                            {/* An interview cannot end before it starts. */}
                            <WtDateTimeField label="End" sx={{ flex: 1 }} minDateTime={form.scheduledStart || undefined} value={form.scheduledEnd} onChange={(v) => setForm({ ...form, scheduledEnd: v })} />
                        </Stack>
                        {form.scheduledStart && form.scheduledEnd && !endAfterStart && (
                            <Typography sx={{ fontSize: 12.5, color: "error.main", mt: -1 }}>The end has to be after the start.</Typography>
                        )}
                        <WtField
                            label={form.mode === "ONLINE" ? "Meeting link" : "Location"}
                            fullWidth
                            placeholder={form.mode === "ONLINE" ? "https://…" : "Office, room or address"}
                            value={(form.mode === "ONLINE" ? form.meetingLink : form.location) ?? ""}
                            onChange={(v) => setForm(form.mode === "ONLINE" ? { ...form, meetingLink: v } : { ...form, location: v })}
                        />
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
                header={<GlassHeader title="Interview scorecard" subtitle={scoreFor ? `${applicantName} · Round ${scoreFor.round}` : undefined} icon={<KTIcon iconName="questionnaire-tablet" className="fs-2" />} onClose={() => setScoreFor(null)} />}
            >
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        {/* The rubric, when one is configured. Each criterion is stored against its
                            factor id, so a later rename of the label cannot silently re-point a score
                            that was already given. */}
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
                                                scale={scale}
                                                value={score.factorScores?.[factor.id] ?? ""}
                                                onChange={(v) => setFactor(factor.id, v)}
                                                ariaLabel={`${factor.label} — ${scale.label}`}
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
                                        value={score.overallRating >= scale.min ? score.overallRating : ""}
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
                    {/* Held until the rubric is in: before that the draft has no valid rating to send. */}
                    <WtButton tone="primary" disabled={scoreMut.isPending || !scale || !decisions || !score.recommendation} onClick={() => scoreMut.mutate()}>
                        {scoreMut.isPending ? "Saving…" : "Save scorecard"}
                    </WtButton>
                </DialogActions>
            </GlassDialog>
        </SettingsSection>
    );
};

export default InterviewsPanel;
