import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Box, Stack, Typography, CircularProgress, DialogContent, DialogActions } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    GlassDialog, GlassHeader, GlassCard, WtButton, WtIconButton, ToneChip, WtDateTimeField, WtField, SettingsSection, TRIO,
    toast, WtEmptyState,
} from "@app/modules/common/components/ui";
import { EmployeePickerField } from "@app/modules/common/components/EmployeePickerField";
import { queryKeys } from "@/lib/queryKeys";
import { formatDateTime } from "@utils/dateFormats";
import { apiErrorMessage } from "@utils/apiError";
import { canSection } from "@utils/can";
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
/**
 * Statuses past which an interview cannot be edited.
 *
 * Nothing is gained by moving an interview that has already happened, and everything is lost by
 * mailing a panel "this has moved" about it. Cancelling then booking a fresh round is the right
 * shape for "it is happening after all".
 */
const CLOSED_STATUSES = new Set(["COMPLETED", "CANCELLED", "NO_SHOW"]);

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
    // What the box shows, so clearing it leaves it cleared. `Number("") || scale.min` used to
    // refill the field with the minimum the moment it was emptied — the same snap-back the
    // Headcount field had — and the cursor then sat behind a digit nobody typed.
    const [text, setText] = useState(value === "" ? "" : String(value));
    useEffect(() => { setText(value === "" ? "" : String(value)); }, [value]);

    if (scale.levels?.length) {
        return (
            <WtField
                ariaLabel={ariaLabel}
                fullWidth={fullWidth} minWidth={fullWidth ? undefined : 140}
                value={value === "" ? "" : String(value)}
                onChange={(v) => onChange(Number(v))}
                options={scale.levels.map((level) => ({ value: String(level.value), label: level.label }))}
            />
        );
    }
    return (
        <WtField
            ariaLabel={ariaLabel}
            type="number" inputMode="numeric" min={scale.min} max={scale.max}
            fullWidth={fullWidth} minWidth={fullWidth ? undefined : 92}
            value={text}
            onChange={(v) => {
                setText(v);
                if (v.trim() === "") return; // an empty box is a value not yet given, not a zero
                const n = Number(v);
                // Clamped on the way in as well as on the server: typing 9 on a scale that
                // stops at 5 should correct itself, not fail on save.
                if (!Number.isNaN(n)) onChange(Math.min(scale.max, Math.max(scale.min, n)));
            }}
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
    const canWrite = canSection("recruitment", "write");
    const qc = useQueryClient();
    const [scheduleOpen, setScheduleOpen] = useState(false);
    /**
     * The interview being edited, or null when the dialog is booking a new one.
     *
     * ONE dialog for both. A booked interview could not be changed at all before this: the only
     * control on a row was Status, so moving one meant cancelling it and booking a second, which
     * left the candidate holding an invitation to a slot nobody was attending. A separate
     * "reschedule" form would have been a second copy of every field and every validation rule.
     */
    const [editingId, setEditingId] = useState<string | null>(null);
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
    /** A rating the server would accept. Its absence is why Save was failing on press. */
    const ratingGiven = !!scale && score.overallRating >= scale.min && score.overallRating <= scale.max;
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
        mutationFn: () => {
            const payload = {
                ...form,
                applicationId,
                round,
                scheduledStart: form.scheduledStart ? new Date(form.scheduledStart).toISOString() : "",
                scheduledEnd: form.scheduledEnd ? new Date(form.scheduledEnd).toISOString() : "",
            };
            return editingId ? updateInterview(editingId, payload) : createInterview(payload);
        },
        onSuccess: () => {
            // The server decides whether this was a reschedule or an ordinary edit and words the
            // mail accordingly, so the toast says who was told rather than guessing which.
            toast({
                icon: "success",
                title: editingId ? "Interview updated — the panel and the candidate were told" : "Interview scheduled — invites sent",
            });
            closeSchedule();
            invalidate();
        },
        onError: (err) => toast({
            icon: "error",
            title: apiErrorMessage(err, editingId ? "Could not update the interview" : "Could not schedule the interview"),
        }),
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
        // The mode is part of the form, and this is where the form is defined. Clearing it on
        // CLOSE instead would work today only because the dialog cannot go from edit to new
        // without closing — a dependency on teardown order that nothing states.
        setEditingId(null);
        setForm({ ...emptySchedule(), applicationId, scheduledStart: toLocalInput(start), scheduledEnd: toLocalInput(end) });
        setRoundText(String(interviews.length + 1));
        setScheduleOpen(true);
    };

    const openEdit = (iv: Interview) => {
        setEditingId(iv.id);
        setForm({
            applicationId,
            type: iv.type,
            mode: iv.mode,
            scheduledStart: toLocalInput(new Date(iv.scheduledStart)),
            scheduledEnd: toLocalInput(new Date(iv.scheduledEnd)),
            meetingLink: iv.meetingLink ?? "",
            location: iv.location ?? "",
            panelistIds: iv.panelistIds ?? [],
        });
        setRoundText(String(iv.round));
        setScheduleOpen(true);
    };

    const closeSchedule = () => setScheduleOpen(false);
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
            action={canWrite && (
                <WtButton tone="primary" size="small" startIcon={<KTIcon iconName="plus" className="fs-6" />} onClick={openSchedule} aria-label={`Schedule an interview with ${applicantName}`}>
                    Schedule
                </WtButton>
            )}
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
                                {!canWrite ? (
                                    <ToneChip tone="neutral" label={labelOf(STATUSES, iv.status)} dense />
                                ) : (
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <WtField
                                        label="Status"
                                        value={iv.status}
                                        onChange={(v) => statusMut.mutate({ id: iv.id, status: v })}
                                        options={STATUSES.some((s) => s.value === iv.status) ? STATUSES : [...STATUSES, { value: iv.status, label: iv.status }]}
                                        disabled={statusMut.isPending}
                                        sx={{ flex: 1, minWidth: 150 }}
                                    />
                                    {/* Hidden once the interview is over or off: there is nothing
                                        left to move, and an edit would mail a panel about a slot
                                        that has already been and gone. */}
                                    {!CLOSED_STATUSES.has(iv.status) && (
                                        <WtIconButton title="Reschedule or Edit" onClick={() => openEdit(iv)}>
                                            <KTIcon iconName="pencil" className="fs-5" />
                                        </WtIconButton>
                                    )}
                                    <WtIconButton title="Add Scorecard" onClick={() => openScorecard(iv)}>
                                        <KTIcon iconName="questionnaire-tablet" className="fs-5" />
                                    </WtIconButton>
                                </Stack>
                                )}
                            </Stack>
                        </GlassCard>
                    ))}
                </Stack>
            )}

            {/* Schedule interview */}
            <GlassDialog
                open={scheduleOpen}
                onClose={closeSchedule}
                maxWidth="sm"
                header={(
                    <GlassHeader
                        title={editingId ? "Reschedule Interview" : "Schedule Interview"}
                        subtitle={editingId
                            ? `${applicantName} and the panel are emailed the change`
                            : `${applicantName} and the panel are emailed an invite`}
                        icon={<KTIcon iconName="message-text-2" className="fs-2" />}
                        onClose={closeSchedule}
                    />
                )}
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
                    <WtButton ghost onClick={closeSchedule}>Cancel</WtButton>
                    <WtButton tone="primary" disabled={!canSchedule || scheduleMut.isPending} onClick={() => scheduleMut.mutate()}>
                        {scheduleMut.isPending
                            ? (editingId ? "Saving…" : "Scheduling…")
                            : (editingId ? "Save & Notify" : "Schedule & Invite")}
                    </WtButton>
                </DialogActions>
            </GlassDialog>

            {/* Scorecard capture */}
            <GlassDialog
                open={!!scoreFor}
                onClose={() => setScoreFor(null)}
                maxWidth="xs"
                header={<GlassHeader title="Interview Scorecard" subtitle={scoreFor ? `${applicantName} · Round ${scoreFor.round}` : undefined} icon={<KTIcon iconName="questionnaire-tablet" className="fs-2" />} onClose={() => setScoreFor(null)} />}
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
                                        Overall Rating · {scale.label}
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
                        {scale && !ratingGiven && (
                            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                                Give an overall rating to save this scorecard.
                            </Typography>
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
                                <Typography sx={{ fontSize: 12.5, color: "text.secondary", mb: 0.5 }}>Existing Scorecards</Typography>
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                    {scoreFor.scorecards!.map((sc) => (
                                        // The denominator is shown only when this card NAMES the scale now on
                                        // screen. A card with no scale recorded predates the column and means the
                                        // app default, which is not necessarily this rubric — borrowing this
                                        // maximum would restate a 4 out of 5 as 4 out of 3.
                                        <ToneChip
                                            key={sc.id}
                                            tone="neutral"
                                            dense
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
                    {/* Held until the rubric is in AND a rating has actually been given: the server
                        validates the rating against the scale, so an unset one was an enabled button
                        that failed on press. */}
                    <WtButton tone="primary" disabled={scoreMut.isPending || !ratingGiven || !decisions || !score.recommendation} onClick={() => scoreMut.mutate()}>
                        {scoreMut.isPending ? "Saving…" : "Save Scorecard"}
                    </WtButton>
                </DialogActions>
            </GlassDialog>
        </SettingsSection>
    );
};

export default InterviewsPanel;
