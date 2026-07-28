import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Box, Stack, Typography, TextField, MenuItem, Chip, CircularProgress, DialogContent, DialogActions,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassDialog, GlassHeader, GlassCard, WtButton, WtIconButton, ToneChip, toast } from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import {
    getApplicationInterviews, createInterview, updateInterview, submitScorecard, getApplicationEvaluation,
    type Interview, type InterviewPayload, type ScorecardPayload,
} from "@services/recruitment";

const TYPES = ["PHONE", "VIDEO", "ONSITE", "TECHNICAL", "HR"];
const MODES = ["ONLINE", "OFFLINE"];
const STATUSES = ["SCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED", "RESCHEDULED"];
const RECOMMENDATIONS = [
    { value: "STRONG_YES", label: "Strong yes", tone: "success" as const },
    { value: "YES", label: "Yes", tone: "success" as const },
    { value: "NO", label: "No", tone: "danger" as const },
    { value: "STRONG_NO", label: "Strong no", tone: "danger" as const },
];

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
    const [panelText, setPanelText] = useState("");
    const [scoreFor, setScoreFor] = useState<Interview | null>(null);
    const [score, setScore] = useState<ScorecardPayload>({ overallRating: 4, recommendation: "YES", comments: "" });

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
            panelistIds: panelText.split(",").map((s) => s.trim()).filter(Boolean),
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
        setPanelText("");
        setScheduleOpen(true);
    };
    const canSchedule = !!form.scheduledStart && !!form.scheduledEnd && panelText.trim().length > 0;

    return (
        <Box>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 16, flex: 1 }}>Interviews — {applicantName}</Typography>
                {evaluation && evaluation.scorecardCount > 0 && (
                    <ToneChip tone={evaluation.recommendation?.includes("YES") ? "success" : "danger"} label={`${evaluation.averageOverall ?? "—"}/5 · ${evaluation.scorecardCount} scorecard(s)`} dense />
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
                                <WtIconButton title="Add scorecard" onClick={() => { setScoreFor(iv); setScore({ overallRating: 4, recommendation: "YES", comments: "" }); }}>
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
                            <TextField label="Start" type="datetime-local" size="small" sx={{ flex: 1 }} InputLabelProps={{ shrink: true }} value={form.scheduledStart} onChange={(e) => setForm({ ...form, scheduledStart: e.target.value })} />
                            <TextField label="End" type="datetime-local" size="small" sx={{ flex: 1 }} InputLabelProps={{ shrink: true }} value={form.scheduledEnd} onChange={(e) => setForm({ ...form, scheduledEnd: e.target.value })} />
                        </Stack>
                        <TextField label={form.mode === "ONLINE" ? "Meeting link" : "Location"} size="small" fullWidth value={(form.mode === "ONLINE" ? form.meetingLink : form.location) ?? ""} onChange={(e) => setForm(form.mode === "ONLINE" ? { ...form, meetingLink: e.target.value } : { ...form, location: e.target.value })} />
                        <TextField label="Panelists (employee IDs, comma-separated)" size="small" fullWidth helperText="Interviewers to invite and who can score." value={panelText} onChange={(e) => setPanelText(e.target.value)} />
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
                        <TextField label="Overall rating (1–5)" type="number" size="small" inputProps={{ min: 1, max: 5 }} value={score.overallRating} onChange={(e) => setScore({ ...score, overallRating: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })} />
                        <TextField label="Recommendation" select size="small" fullWidth value={score.recommendation} onChange={(e) => setScore({ ...score, recommendation: e.target.value })}>
                            {RECOMMENDATIONS.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
                        </TextField>
                        <TextField label="Comments" size="small" fullWidth multiline minRows={3} value={score.comments ?? ""} onChange={(e) => setScore({ ...score, comments: e.target.value })} />
                        {scoreFor && (scoreFor.scorecards?.length ?? 0) > 0 && (
                            <Box>
                                <Typography sx={{ fontSize: 12.5, color: "text.secondary", mb: 0.5 }}>Existing scorecards</Typography>
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                    {scoreFor.scorecards!.map((sc) => (
                                        <Chip key={sc.id} size="small" label={`${sc.overallRating}/5 · ${sc.recommendation.replace("_", " ")}`} />
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
