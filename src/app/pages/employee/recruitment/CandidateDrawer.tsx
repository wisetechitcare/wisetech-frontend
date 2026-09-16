import { useState } from "react";
import { useSelector } from "react-redux";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Stack, Typography, CircularProgress, LinearProgress, DialogContent, Link as MuiLink } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    GlassDialog, GlassHeader, WtButton, WtField, ToneChip, ActionIconButton, SettingsSection, TRIO,
    toast, confirmDialog, WtEmptyState,
} from "@app/modules/common/components/ui";
import type { RootState } from "@redux/store";
import { queryKeys } from "@/lib/queryKeys";
import { COPY } from "./terms";
import { formatCurrency } from "@utils/currency";
import { formatDate, formatDateTime } from "@utils/dateFormats";
import { apiErrorMessage } from "@utils/apiError";
import {
    getApplicationById, getApplicationNotes, createApplicationNote, deleteApplicationNote,
    SCORE_FACTORS,
    type Application, type ApplicationDetail, type ApplicationStatus, type StageHistoryEntry,
} from "@services/recruitment";
import { ScoreChip } from "./applicationColumns";
import { AddToRoleDialog } from "./AddToRoleDialog";
import InterviewsPanel from "./InterviewsPanel";
import OfferPanel from "./OfferPanel";

/** The server's limit on a note body; the field says so before the API has to. */
const NOTE_MAX = 4000;

/**
 * A resume link is presigned for five minutes. Refreshing the record a minute inside that keeps
 * the Resume button working for as long as the modal stays open, instead of silently turning into
 * an expired link.
 */
const RESUME_LINK_REFRESH_MS = 4 * 60_000;

interface Props {
    application: Application;
    statuses: ApplicationStatus[];
    onClose: () => void;
    /** Move the candidate. The board owns the move, including the reason prompt a stage may need. */
    onMove?: (application: Application, status: ApplicationStatus) => void;
    /** A move is in flight — the stage control waits for it. */
    moving?: boolean;
    /** Hand a hired candidate to onboarding. */
    onConvert?: (application: Application) => void;
}

const fullName = (a: Application) =>
    `${a.applicant?.firstName ?? ""} ${a.applicant?.lastName ?? ""}`.trim() || "Candidate";

const experience = (months?: number | null) => {
    if (months == null) return null;
    const y = Math.floor(months / 12);
    const m = months % 12;
    return [y ? `${y} yr` : null, m ? `${m} mo` : null].filter(Boolean).join(" ") || "Fresher";
};

/** A stored link may have no scheme ("linkedin.com/in/…"); without one the browser treats it as a path inside this app. */
const externalUrl = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

/** One labelled fact. Renders nothing when there is no value, so the grid stays dense. */
const Fact = ({ label, value, href }: { label: string; value?: string | number | null; href?: string }) =>
    value === null || value === undefined || value === "" ? null : (
        <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 11.5, color: "text.secondary", lineHeight: 1.4 }}>{label}</Typography>
            <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "text.primary", overflowWrap: "anywhere" }}>
                {href ? <MuiLink href={href} underline="hover" color="inherit">{value}</MuiLink> : value}
            </Typography>
        </Box>
    );

/**
 * Everything known about one candidate, in one scroll: who they are, where they stand, what the
 * team thinks, and the two workflows that follow — interviews and the offer.
 *
 * Interviews and Offer stay as their own panels rather than being reimplemented; this screen
 * composes them. Every block is a kit `SettingsSection`, so each one has the same frame, heading
 * and action slot, and the panels no longer print a second heading under the modal's own.
 */
const CandidateDrawer = ({ application, statuses, onClose, onMove, moving, onConvert }: Props) => {
    const qc = useQueryClient();
    const [draft, setDraft] = useState("");
    const [addingToRole, setAddingToRole] = useState(false);
    const viewerId = useSelector((st: RootState) => st.employee?.currentEmployee?.id as string | undefined);

    // The board row paints the modal instantly as a placeholder — never as cached data, because
    // it has no stage history, no currency and an unsigned resume key. Until the record arrives
    // those parts show that they are loading instead of an empty history and a dead Resume link.
    const detailQuery = useQuery({
        queryKey: queryKeys.recruitment.application(application.id),
        queryFn: () => getApplicationById(application.id),
        placeholderData: application,
        refetchInterval: RESUME_LINK_REFRESH_MS,
    });
    const { data: notes = [], isLoading: notesLoading, isError: notesError } = useQuery({
        queryKey: queryKeys.recruitment.notes(application.id),
        queryFn: () => getApplicationNotes(application.id),
    });

    const a: ApplicationDetail = detailQuery.data ?? application;
    const loaded = !detailQuery.isPlaceholderData && !!detailQuery.data;
    const statusName = (id?: string | null) => statuses.find((s) => s.id === id)?.name;
    const currentStatus = statuses.find((s) => s.id === a.statusId) ?? a.status ?? null;

    const invalidateNotes = () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.notes(application.id) });

    const noteTooLong = draft.length > NOTE_MAX;
    const canAddNote = !!draft.trim() && !noteTooLong;

    const addNote = useMutation({
        mutationFn: () => createApplicationNote(application.id, draft.trim()),
        onSuccess: () => { setDraft(""); invalidateNotes(); toast({ icon: "success", title: "Note added" }); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not add the note") }),
    });

    const removeNote = useMutation({
        mutationFn: (id: string) => deleteApplicationNote(id),
        onSuccess: () => { invalidateNotes(); toast({ icon: "success", title: "Note removed" }); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not remove the note") }),
    });

    const submitNote = () => { if (canAddNote && !addNote.isPending) addNote.mutate(); };

    const confirmRemove = async (id: string) => {
        const ok = await confirmDialog({ title: "Remove this note?", text: "It will no longer appear on the candidate.", confirmText: "Remove" });
        if (ok) removeNote.mutate(id);
    };

    const moveTo = (statusId: string) => {
        const next = statuses.find((s) => s.id === statusId);
        if (next && onMove && next.id !== a.statusId) onMove(a, next);
    };

    const subtitle = [a.applicant?.currentTitle, a.applicant?.currentEmployer].filter(Boolean).join(" · ") || a.requisition?.title || "Candidate";
    const salary = (v?: number | string | null) => (v != null && v !== "" ? `${formatCurrency(Number(v), a.currency)} per year` : null);

    return (
        <GlassDialog
            open
            onClose={onClose}
            maxWidth="md"
            header={
                <GlassHeader
                    title={fullName(a)}
                    subtitle={subtitle}
                    icon={<KTIcon iconName="profile-circle" className="fs-2" />}
                    onClose={onClose}
                />
            }
        >
            <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 2.5 } }}>
                <Stack spacing={2}>
                    {/* ── Where they stand, and the two actions that change it ── */}
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
                        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ flex: 1, minWidth: 0 }}>
                            <ScoreChip application={a} />
                            {a.prefix && <ToneChip tone="neutral" label={a.prefix} dense />}
                            {a.requisition?.title && <ToneChip tone="neutral" label={a.requisition.title} dense />}
                            {a.convertedEmployeeId && <ToneChip tone="success" label="Converted to Employee" dense />}
                        </Stack>
                        {/* The same person can be considered for more than one role. */}
                        <ActionIconButton iconName="briefcase" tone="brand" title="Add to Another Role" onClick={() => setAddingToRole(true)} />
                        {onConvert && currentStatus?.isHiredOutcome && !a.convertedEmployeeId && (
                            <WtButton size="small" tone="success" startIcon={<KTIcon iconName="user-tick" className="fs-6" />} onClick={() => onConvert(a)}
                                sx={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                                Convert to Employee
                            </WtButton>
                        )}
                        {onMove && statuses.length > 0 ? (
                            <WtField
                                label="Stage"
                                value={a.statusId ?? ""}
                                onChange={moveTo}
                                options={statuses.map((s) => ({ value: s.id, label: s.name }))}
                                disabled={moving || !loaded}
                                icon="abstract-26"
                                // A fixed width beside the chips. Full width, it took the whole row and crushed
                                // the chips to a sliver.
                                fullWidth={false}
                                sx={{ width: { xs: "100%", sm: 240 }, flexShrink: 0 }}
                            />
                        ) : (
                            currentStatus && <ToneChip tone="brand" color={currentStatus.color ?? undefined} label={currentStatus.name} dense />
                        )}
                    </Stack>

                    {detailQuery.isError && (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1.25, borderRadius: 1.5, bgcolor: "action.hover" }}>
                            <Typography sx={{ flex: 1, fontSize: 13, color: "error.main" }}>
                                {apiErrorMessage(detailQuery.error, "Could not load the full record.")}
                            </Typography>
                            <WtButton size="small" ghost onClick={() => detailQuery.refetch()}>Retry</WtButton>
                        </Stack>
                    )}

                    {/* ── Profile ── */}
                    <SettingsSection tone={TRIO.blue} icon="profile-user" title="Profile">
                        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" } }}>
                            <Fact label="Email" value={a.applicant?.email} href={a.applicant?.email ? `mailto:${a.applicant.email}` : undefined} />
                            <Fact label="Phone" value={a.applicant?.phone} href={a.applicant?.phone ? `tel:${a.applicant.phone.replace(/\s+/g, "")}` : undefined} />
                            <Fact label="Location" value={a.applicant?.currentLocation} />
                            <Fact label="Experience" value={experience(a.applicant?.totalExperienceMonths)} />
                            <Fact label="Notice Period" value={a.applicant?.noticePeriodDays != null ? (a.applicant.noticePeriodDays === 0 ? "Immediate" : `${a.applicant.noticePeriodDays} days`) : null} />
                            {/* Only once the record is in: the row does not know the requisition's currency. */}
                            {loaded && <Fact label="Current CTC" value={salary(a.applicant?.currentCtc)} />}
                            {loaded && <Fact label="Expected CTC" value={salary(a.applicant?.expectedCtc)} />}
                            <Fact label="Source" value={a.applicant?.source?.name} />
                            {/* A date, not a time: applied dates are stored at midnight, which a time-of-day turned into "5:30 AM". */}
                            <Fact label="Applied" value={formatDate(a.appliedDate ?? a.createdAt)} />
                        </Box>

                        {(a.applicant?.resumeS3Url || a.applicant?.linkedInUrl) && (
                            <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                                {a.applicant?.resumeS3Url && (
                                    <WtButton size="small" ghost disabled={!loaded} startIcon={<KTIcon iconName="document" className="fs-6" />}
                                        onClick={() => window.open(a.applicant!.resumeS3Url as string, "_blank", "noopener,noreferrer")}>
                                        Resume
                                    </WtButton>
                                )}
                                {a.applicant?.linkedInUrl && (
                                    // One control, not a button nested inside a link (two tab stops, invalid markup).
                                    <WtButton size="small" ghost startIcon={<KTIcon iconName="entity" className="fs-6" />}
                                        onClick={() => window.open(externalUrl(a.applicant!.linkedInUrl as string), "_blank", "noopener,noreferrer")}>
                                        LinkedIn
                                    </WtButton>
                                )}
                            </Stack>
                        )}

                        {/* Only while they are actually rejected: the reason stays on the record after a candidate is moved back. */}
                        {a.rejectionReason && currentStatus?.isRejectedOutcome && (
                            <Box sx={{ mt: 2 }}>
                                <ToneChip tone="danger" label={`Rejected — ${a.rejectionReason.reason}`} dense />
                                {a.rejectionNote && <Typography sx={{ mt: 0.75, fontSize: 13, color: "text.secondary", overflowWrap: "anywhere" }}>{a.rejectionNote}</Typography>}
                            </Box>
                        )}
                    </SettingsSection>

                    {/*
                      * The score has to be defensible to the person it rejected, so the four
                      * factors are shown with the number each contributed rather than hidden
                      * behind a total. Recomputed server-side from the weights in force, so
                      * this can never explain a score with weights that have since changed.
                      */}
                    {a.scoreBreakdown && (
                        <SettingsSection tone={TRIO.cyan} icon="chart-simple" title="How This Score Was Reached"
                            description="Each factor is scored out of 100 and weighted by your scoring settings.">
                            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" } }}>
                                {SCORE_FACTORS.map((f) => {
                                    const v = Math.round(a.scoreBreakdown![f.key]);
                                    return (
                                        <Box key={f.key} title={f.hint}>
                                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                                <Typography sx={{ fontSize: 12.5 }}>{f.label}</Typography>
                                                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "text.secondary" }}>{v}</Typography>
                                            </Stack>
                                            <LinearProgress variant="determinate" value={v} sx={{ height: 6, borderRadius: 3 }} aria-label={`${f.label}: ${v} out of 100`} />
                                        </Box>
                                    );
                                })}
                            </Box>
                        </SettingsSection>
                    )}

                    {/* ── Notes ── */}
                    <SettingsSection tone={TRIO.amber} icon="notepad" title="Notes"
                        description={notes.length ? `${notes.length} ${notes.length === 1 ? "note" : "notes"}` : undefined}>
                        {/* Ctrl/Cmd+Enter adds the note: typing one and reaching for the mouse is the slow path. */}
                        <Box onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submitNote(); } }}>
                            <WtField
                                label="Add a Note"
                                multiline minRows={2}
                                placeholder="What did you learn about this candidate?"
                                value={draft}
                                onChange={setDraft}
                                error={noteTooLong ? `Keep it under ${NOTE_MAX.toLocaleString()} characters (${draft.length.toLocaleString()} now)` : undefined}
                                hint="Ctrl + Enter to add"
                                fullWidth
                            />
                            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
                                <WtButton tone="primary" size="small" disabled={!canAddNote || addNote.isPending} onClick={submitNote}>
                                    {addNote.isPending ? "Adding…" : "Add note"}
                                </WtButton>
                            </Stack>
                        </Box>

                        {notesLoading ? (
                            <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={20} /></Stack>
                        ) : notesError ? (
                            <Typography sx={{ mt: 2, fontSize: 13, color: "error.main" }}>Could not load notes.</Typography>
                        ) : notes.length === 0 ? (
                            <Box sx={{ mt: 1 }}>
                                <WtEmptyState icon="notepad" title={COPY.noNotes.title} hint={COPY.noNotes.hint} dense />
                            </Box>
                        ) : (
                            <Stack spacing={1} sx={{ mt: 2 }}>
                                {notes.map((n) => {
                                    // Only the author may remove a note (the server enforces it); offering
                                    // Remove to everyone else would only lead to a refusal.
                                    const mine = !n.authorId || n.authorId === viewerId;
                                    return (
                                        <Box key={n.id} sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
                                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 0.5 }}>
                                                        <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>{n.authorName ?? "Former user"}</Box>
                                                        {" · "}{formatDateTime(n.createdAt)}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: 13.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{n.body}</Typography>
                                                </Box>
                                                {mine && (
                                                    <ActionIconButton iconName="trash" title="Remove Note" tone="danger" size="sm"
                                                        disabled={removeNote.isPending} onClick={() => confirmRemove(n.id)} />
                                                )}
                                            </Stack>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        )}
                    </SettingsSection>

                    {/* ── Stage history ── */}
                    <SettingsSection tone={TRIO.purple} icon="time" title="Stage History">
                        {!loaded ? (
                            detailQuery.isError
                                ? <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Unavailable until the record loads.</Typography>
                                : <Stack alignItems="center" sx={{ py: 1.5 }}><CircularProgress size={20} /></Stack>
                        ) : !a.stageHistory?.length ? (
                            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>No stage changes recorded yet.</Typography>
                        ) : (
                            <Stack spacing={1.25}>
                                {a.stageHistory.map((h: StageHistoryEntry) => {
                                    const from = statusName(h.fromStatusId);
                                    const to = statusName(h.toStatusId) ?? "A removed stage";
                                    return (
                                        <Box key={h.id} sx={{ minWidth: 0 }}>
                                            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                                                {from && <ToneChip tone="neutral" dense label={from} />}
                                                {from && <KTIcon iconName="arrow-right" className="fs-7" />}
                                                <ToneChip tone="brand" dense label={to} />
                                                {h.isAutomated && <ToneChip tone="indigo" dense label="Automated" />}
                                            </Stack>
                                            <Typography sx={{ mt: 0.5, fontSize: 12, color: "text.secondary", overflowWrap: "anywhere" }}>
                                                {formatDateTime(h.changedAt)}
                                                {!h.isAutomated && h.changedByName ? ` · by ${h.changedByName}` : ""}
                                                {h.note ? ` — ${h.note}` : ""}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        )}
                    </SettingsSection>

                    <InterviewsPanel applicationId={a.id} applicantName={fullName(a)} />
                    <OfferPanel applicationId={a.id} applicantName={fullName(a)} />
                </Stack>
                {addingToRole && (
                    <AddToRoleDialog open onClose={() => setAddingToRole(false)} applicantId={a.applicantId} applicantName={fullName(a)} />
                )}
            </DialogContent>
        </GlassDialog>
    );
};

export default CandidateDrawer;
