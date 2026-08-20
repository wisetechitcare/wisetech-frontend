import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Stack, Typography, Divider, TextField, CircularProgress, Link as MuiLink } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassDialog, GlassHeader, WtButton, ToneChip, toast, confirmDialog } from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import {
    getApplicationById, getApplicationNotes, createApplicationNote, deleteApplicationNote,
    type Application, type ApplicationDetail, type ApplicationStatus, type StageHistoryEntry,
} from "@services/recruitment";
import InterviewsPanel from "./InterviewsPanel";
import OfferPanel from "./OfferPanel";

interface Props {
    application: Application;
    statuses: ApplicationStatus[];
    onClose: () => void;
}

const fullName = (a: Application) =>
    `${a.applicant?.firstName ?? ""} ${a.applicant?.lastName ?? ""}`.trim() || "Candidate";

const when = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const experience = (months?: number | null) => {
    if (months == null) return null;
    const y = Math.floor(months / 12);
    const m = months % 12;
    return [y ? `${y}y` : null, m ? `${m}m` : null].filter(Boolean).join(" ") || "0m";
};

/** One labelled fact. Renders nothing when there is no value, so the grid stays dense. */
const Fact = ({ label, value }: { label: string; value?: string | number | null }) =>
    value === null || value === undefined || value === "" ? null : (
        <Box sx={{ minWidth: { xs: 130, sm: 150 } }}>
            <Typography variant="caption" sx={{ opacity: 0.65, display: "block" }}>{label}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{value}</Typography>
        </Box>
    );

const Section = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
    <Box sx={{ mt: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <KTIcon iconName={icon} className="fs-4" />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{title}</Typography>
        </Stack>
        {children}
    </Box>
);

/**
 * Everything known about one candidate, in one scroll.
 *
 * The pipeline had no unit of work: the board card had no click target, the resume was only
 * reachable from a different tab, getApplicationById had zero callers, and there was nowhere
 * to record judgement. A recruiter was asked to decide from a name, a stage chip and a score.
 *
 * Interviews and Offer stay as their existing panels rather than being reimplemented — this
 * screen composes what already works and adds the two things that were missing: the full
 * record (including the stage timeline the server already returns) and notes.
 */
const CandidateDrawer = ({ application, statuses, onClose }: Props) => {
    const qc = useQueryClient();
    const [draft, setDraft] = useState("");

    // The list row is a summary; the detail endpoint carries stageHistory and the presigned
    // resume URL. Seed from the row so the panel paints instantly, then refine.
    const { data: detail } = useQuery({
        queryKey: queryKeys.recruitment.application(application.id),
        queryFn: () => getApplicationById(application.id),
        initialData: application,
    });
    const { data: notes = [], isLoading: notesLoading } = useQuery({
        queryKey: queryKeys.recruitment.notes(application.id),
        queryFn: () => getApplicationNotes(application.id),
    });

    const a: ApplicationDetail = detail ?? application;
    const statusName = statuses.find((s) => s.id === a.statusId)?.name ?? a.status?.name ?? "—";
    const score = a.aiScore ?? a.ruleScore;

    const invalidateNotes = () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.notes(application.id) });

    const addNote = useMutation({
        mutationFn: () => createApplicationNote(application.id, draft.trim()),
        onSuccess: () => { setDraft(""); invalidateNotes(); toast({ icon: "success", title: "Note added" }); },
        onError: () => toast({ icon: "error", title: "Could not add the note" }),
    });

    const removeNote = useMutation({
        mutationFn: (id: string) => deleteApplicationNote(id),
        onSuccess: () => { invalidateNotes(); toast({ icon: "success", title: "Note removed" }); },
        // The server allows only the author to remove a note, so a refusal is expected, not a bug.
        onError: () => toast({ icon: "error", title: "Only the author can remove their own note" }),
    });

    const confirmRemove = async (id: string) => {
        const ok = await confirmDialog({ title: "Remove this note?", text: "It will no longer appear on the candidate.", confirmText: "Remove" });
        if (ok) removeNote.mutate(id);
    };

    return (
        <GlassDialog
            open
            onClose={onClose}
            maxWidth="md"
            fullWidth
            header={
                <GlassHeader
                    title={fullName(a)}
                    subtitle={[a.applicant?.currentTitle, a.applicant?.currentEmployer].filter(Boolean).join(" · ") || a.requisition?.title || "Candidate"}
                    icon={<KTIcon iconName="profile-circle" className="fs-2" />}
                    onClose={onClose}
                />
            }
        >
            <Box sx={{ px: { xs: 0.5, sm: 1 }, pb: 2 }}>
                {/* ── Identity + the four factors the score is actually computed from ── */}
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                    <ToneChip tone="brand" color={a.status?.color ?? undefined} label={statusName} dense />
                    {score != null && <ToneChip tone="cyan" label={`Score ${Number(score).toFixed(0)}`} dense />}
                    {a.prefix && <ToneChip tone="neutral" label={a.prefix} dense />}
                    {a.convertedEmployeeId && <ToneChip tone="success" label="Converted to employee" dense />}
                </Stack>

                <Stack direction="row" spacing={{ xs: 1.5, sm: 3 }} flexWrap="wrap" useFlexGap>
                    <Fact label="Email" value={a.applicant?.email} />
                    <Fact label="Phone" value={a.applicant?.phone} />
                    <Fact label="Experience" value={experience(a.applicant?.totalExperienceMonths)} />
                    <Fact label="Notice period" value={a.applicant?.noticePeriodDays != null ? `${a.applicant.noticePeriodDays} days` : null} />
                    <Fact label="Expected CTC" value={a.applicant?.expectedCtcInLpa != null ? `${Number(a.applicant.expectedCtcInLpa)} LPA` : null} />
                    <Fact label="Source" value={a.applicant?.source?.name} />
                    <Fact label="Applied" value={when(a.appliedDate ?? a.createdAt)} />
                    <Fact label="Requisition" value={a.requisition?.title} />
                </Stack>

                <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                    {a.applicant?.resumeS3Url && (
                        <WtButton size="small" ghost startIcon={<KTIcon iconName="document" className="fs-6" />}
                            onClick={() => window.open(a.applicant!.resumeS3Url as string, "_blank", "noopener")}>
                            Resume
                        </WtButton>
                    )}
                    {a.applicant?.linkedInUrl && (
                        <MuiLink href={a.applicant.linkedInUrl} target="_blank" rel="noopener" underline="none">
                            <WtButton size="small" ghost startIcon={<KTIcon iconName="entity" className="fs-6" />}>LinkedIn</WtButton>
                        </MuiLink>
                    )}
                </Stack>

                {a.rejectionReason && (
                    <Box sx={{ mt: 2 }}>
                        <ToneChip tone="danger" label={`Rejected — ${a.rejectionReason.reason}`} dense />
                        {a.rejectionNote && <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>{a.rejectionNote}</Typography>}
                    </Box>
                )}

                <Divider sx={{ my: 3 }} />

                {/* ── Notes: the thing that did not exist ── */}
                <Section title="Notes" icon="notepad">
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "stretch", sm: "flex-start" }}
                    >
                        <TextField
                            fullWidth multiline minRows={2} size="small" placeholder="What did you learn about this candidate?"
                            value={draft} onChange={(e) => setDraft(e.target.value)}
                            inputProps={{ maxLength: 4000 }}
                        />
                        <WtButton tone="primary" size="small" disabled={!draft.trim() || addNote.isPending}
                            onClick={() => addNote.mutate()}>
                            Add
                        </WtButton>
                    </Stack>

                    {notesLoading ? (
                        <Box sx={{ py: 2, textAlign: "center" }}><CircularProgress size={20} /></Box>
                    ) : notes.length === 0 ? (
                        <Typography variant="body2" sx={{ mt: 2, opacity: 0.6 }}>No notes yet.</Typography>
                    ) : (
                        <Stack spacing={1.5} sx={{ mt: 2 }}>
                            {notes.map((n) => (
                                <Box key={n.id} sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{n.body}</Typography>
                                        <WtButton size="small" ghost tone="danger" onClick={() => confirmRemove(n.id)}
                                            startIcon={<KTIcon iconName="trash" className="fs-7" />}>
                                            {""}
                                        </WtButton>
                                    </Stack>
                                    <Typography variant="caption" sx={{ opacity: 0.6 }}>{when(n.createdAt)}</Typography>
                                </Box>
                            ))}
                        </Stack>
                    )}
                </Section>

                <Divider sx={{ my: 3 }} />

                {/* ── Stage timeline: already recorded server-side, never shown until now ── */}
                <Section title="Stage history" icon="time">
                    {!a.stageHistory?.length ? (
                        <Typography variant="body2" sx={{ opacity: 0.6 }}>No transitions recorded.</Typography>
                    ) : (
                        <Stack spacing={1}>
                            {a.stageHistory.map((h: StageHistoryEntry) => (
                                <Stack key={h.id} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                    <ToneChip tone="neutral" dense
                                        label={statuses.find((s) => s.id === h.toStatusId)?.name ?? "Stage change"} />
                                    {h.isAutomated && <ToneChip tone="indigo" dense label="automated" />}
                                    <Typography variant="caption" sx={{ opacity: 0.7 }}>{when(h.changedAt)}</Typography>
                                    {h.note && <Typography variant="caption" sx={{ opacity: 0.8 }}>— {h.note}</Typography>}
                                </Stack>
                            ))}
                        </Stack>
                    )}
                </Section>

                <Divider sx={{ my: 3 }} />

                <Section title="Interviews" icon="message-text-2">
                    <InterviewsPanel applicationId={a.id} applicantName={fullName(a)} />
                </Section>

                <Divider sx={{ my: 3 }} />

                <Section title="Offer" icon="dollar">
                    <OfferPanel applicationId={a.id} applicantName={fullName(a)} />
                </Section>
            </Box>
        </GlassDialog>
    );
};

export default CandidateDrawer;
