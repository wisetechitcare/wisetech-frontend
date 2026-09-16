import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Box, Stack, Typography, CircularProgress, DialogContent, DialogActions, LinearProgress } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    AutoGrid, ListHeader, GlassCard, GlassDialog, GlassHeader, WtButton, ActionIconButton, ToneChip,
    WtSwitchField, toast, confirmDialog, WtEmptyState, WtField,
} from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import { COPY } from "./terms";
import { formatDate } from "@utils/dateFormats";
import { formatCurrencyCompact } from "@utils/currency";
import { apiErrorMessage } from "@utils/apiError";
import {
    getApplicants, getApplicantById, updateApplicant, getApplicantSources, uploadApplicantResume,
    type Applicant, type ApplicantPayload, type ApplicantSource, type OrgScoped,
} from "@services/recruitment";
import { CandidateFormFields, emptyCandidate, isCandidateFormValid } from "./CandidateFormFields";
import { cleanCandidatePayload } from "./candidatePayload";
import { AddCandidateDialog } from "./AddCandidateDialog";
import { AddToRoleDialog } from "./AddToRoleDialog";

/** Compact, muted meta chip — packs identity/metrics into the card without stretched gaps. */
const MetaPill = ({ text }: { text: string }) => (
    <Box sx={{
        px: 0.9, py: 0.3, borderRadius: "8px", bgcolor: "action.hover",
        fontSize: 11.5, fontWeight: 600, color: "text.secondary", whiteSpace: "nowrap", lineHeight: 1.5,
    }}>
        {text}
    </Box>
);

/** Months → "3 yr 4 mo" / "7 mo". Raw month counts are unreadable on a card. */
const experienceLabel = (months?: number | null): string | null => {
    if (months == null || months <= 0) return null;
    const y = Math.floor(months / 12);
    const m = months % 12;
    return [y ? `${y} yr` : null, m ? `${m} mo` : null].filter(Boolean).join(" ") + " experience";
};

const fullName = (a: Applicant) => [a.firstName, a.lastName].filter(Boolean).join(" ").trim() || a.email || a.phone || "Candidate";

/** Wait this long after the last keystroke before searching — one request per pause, not per letter. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Candidates — the applicant directory (Recruitment › Candidates).
 *
 * Adding uses the shared Add candidate window (also the Pipeline's); editing uses the same form body.
 * Candidates are never hard-deleted: data retention and the audit trail both require the row to
 * survive, so the destructive action is "blacklist" (an update), not a delete.
 */
const CandidatesView = ({ companyId }: OrgScoped) => {
    const qc = useQueryClient();
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [searchInput]);

    const [adding, setAdding] = useState(false);
    const [addToRole, setAddToRole] = useState<Applicant | null>(null);
    const [editing, setEditing] = useState<Applicant | null>(null);
    const [form, setForm] = useState<ApplicantPayload>(emptyCandidate());
    const [formFile, setFormFile] = useState<File | null>(null);
    const [blacklisted, setBlacklisted] = useState(false);
    const [attempted, setAttempted] = useState(false);

    // The server does the searching, so the key includes the term. The previous results stay on screen
    // while the next load — the grid used to blank to a spinner on every keystroke.
    const { data: applicants = [], isLoading, isFetching, isError, error, refetch } = useQuery({
        queryKey: queryKeys.recruitment.applicants(search, companyId),
        queryFn: () => getApplicants(search || undefined, companyId),
        placeholderData: keepPreviousData,
    });
    const { data: sources = [] } = useQuery({
        queryKey: queryKeys.recruitment.applicantSources(),
        queryFn: getApplicantSources,
    });

    // Every recruitment list reads candidates — the board, the drill-downs, the candidate modal.
    const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.all });

    // Resume upload from a card. One hidden input for the whole grid rather than one per tile.
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [uploadFor, setUploadFor] = useState<Applicant | null>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    const pickResume = (a: Applicant) => {
        setUploadFor(a);
        // Clearing the value first means picking the SAME file twice still fires onChange.
        if (fileInputRef.current) fileInputRef.current.value = "";
        fileInputRef.current?.click();
    };

    const onResumeChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const target = uploadFor;
        if (!file || !target) return;
        setUploadingId(target.id);
        try {
            await uploadApplicantResume(target.id, file);
            invalidate();
            toast({ icon: "success", title: `Resume attached to ${target.firstName}` });
        } catch (err) {
            // The server validates type, size and magic bytes; its reason tells HR what to do differently.
            toast({ icon: "error", title: apiErrorMessage(err, "Could not upload the resume") });
        } finally {
            setUploadingId(null);
            setUploadFor(null);
        }
    };

    /**
     * Open a resume through a FRESH signed link. The links in the list expire after five minutes, so a
     * page left open handed out dead links. The tab is opened on the click itself (before the request)
     * so a popup blocker does not treat it as unprompted.
     */
    const openResume = async (a: Applicant) => {
        const tab = window.open("about:blank", "_blank");
        try {
            const fresh = await getApplicantById(a.id);
            if (tab && fresh?.resumeS3Url) {
                tab.opener = null;
                tab.location.href = fresh.resumeS3Url;
            } else {
                tab?.close();
                toast({ icon: "error", title: "This resume could not be opened." });
            }
        } catch (err) {
            tab?.close();
            toast({ icon: "error", title: apiErrorMessage(err, "This resume could not be opened.") });
        }
    };

    const updateMut = useMutation({
        mutationFn: async () => {
            // expectedRevisionCount: two people editing the same candidate no longer overwrite each other silently.
            await updateApplicant(editing!.id, { ...cleanCandidatePayload(form), isBlacklisted: blacklisted, expectedRevisionCount: editing!.revisionCount });
            // The resume goes up after the save; its failure joins the SAME toast rather than a second one
            // that a success toast would immediately replace.
            if (!formFile) return null;
            try { await uploadApplicantResume(editing!.id, formFile); return null; } catch (err) { return apiErrorMessage(err, "the file was refused"); }
        },
        onSuccess: (resumeError) => {
            toast(resumeError
                ? { icon: "warning", title: `Candidate updated, but the resume did not upload: ${resumeError}` }
                : { icon: "success", title: "Candidate updated" });
            closeEdit();
            invalidate();
        },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not update the candidate") }),
    });
    const blacklistMut = useMutation({
        mutationFn: (vars: { id: string; isBlacklisted: boolean }) => updateApplicant(vars.id, { isBlacklisted: vars.isBlacklisted }),
        onSuccess: (_d, vars) => { toast({ icon: "success", title: vars.isBlacklisted ? "Candidate blacklisted" : "Candidate restored" }); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not update the candidate") }),
    });

    const openEdit = (a: Applicant) => {
        setEditing(a);
        setForm({
            firstName: a.firstName ?? "", lastName: a.lastName ?? "", email: a.email ?? "", phone: a.phone ?? "",
            currentEmployer: a.currentEmployer ?? "", currentTitle: a.currentTitle ?? "",
            // Every field the form edits must be repopulated here. A field left out renders blank on
            // edit even though the record holds a value, which reads as data loss.
            currentLocation: a.currentLocation ?? "", qualification: a.qualification ?? "",
            employeeLevelId: a.employeeLevelId ?? null,
            totalExperienceMonths: a.totalExperienceMonths ?? null,
            currentCtc: a.currentCtc == null ? null : Number(a.currentCtc),
            expectedCtc: a.expectedCtc == null ? null : Number(a.expectedCtc),
            noticePeriodDays: a.noticePeriodDays ?? null,
            sourceId: a.sourceId ?? null,
        });
        setBlacklisted(a.isBlacklisted);
        setFormFile(null);
        setAttempted(false);
    };
    const closeEdit = () => { setEditing(null); setFormFile(null); setAttempted(false); };

    const toggleBlacklist = async (a: Applicant) => {
        if (a.isBlacklisted) { blacklistMut.mutate({ id: a.id, isBlacklisted: false }); return; }
        const ok = await confirmDialog({
            icon: "warning",
            title: `Blacklist ${fullName(a)}?`,
            text: "They stay on record (and in the audit trail) but are flagged for future applications.",
            confirmText: "Blacklist",
        });
        if (ok) blacklistMut.mutate({ id: a.id, isBlacklisted: true });
    };

    const saveEdit = () => {
        setAttempted(true);
        if (isCandidateFormValid(form) && !updateMut.isPending) updateMut.mutate();
    };

    const sourceName = useMemo(
        () => (id?: string | null) => sources.find((s: ApplicantSource) => s.id === id)?.name ?? null,
        [sources],
    );

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1600, mx: "auto" }}>
            {/* One hidden picker for the whole grid — see pickResume. accept is a hint only;
                the server re-validates type, extension and magic bytes before storing. */}
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,application/pdf" hidden onChange={onResumeChosen} />
            <ListHeader
                title="Candidates"
                subtitle="Everyone on record — search by name, email, job title or employer."
                actions={
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
                        <WtField
                            label="Search candidates" icon="magnifier" clearable
                            value={searchInput} onChange={setSearchInput}
                            placeholder="Name, email, title or employer"
                            fullWidth={false}
                            sx={{ width: { xs: "100%", sm: 280 } }}
                        />
                        <WtButton tone="primary" size="small" startIcon={<KTIcon iconName="plus" className="fs-6" />} onClick={() => setAdding(true)}>
                            Add candidate
                        </WtButton>
                    </Stack>
                }
            />

            {/* Refreshing a search keeps the last results readable; this line says it is updating. */}
            <Box sx={{ height: 3, mb: 1 }}>{isFetching && !isLoading && <LinearProgress sx={{ height: 3, borderRadius: 2 }} aria-label="Updating" />}</Box>

            {isLoading ? (
                <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>
            ) : isError ? (
                <WtEmptyState variant="error" title="Could not load candidates" hint={apiErrorMessage(error, "Check your connection and try again.")} actionLabel="Retry" onAction={() => refetch()} />
            ) : applicants.length === 0 ? (
                // A failed search and an empty list are different problems with different remedies.
                search ? (
                    <WtEmptyState variant="no-match" {...COPY.noSearchMatch(search)} />
                ) : (
                    <WtEmptyState icon="people" title={COPY.noCandidates.title} hint={COPY.noCandidates.hint} actionLabel="Add candidate" onAction={() => setAdding(true)} />
                )
            ) : (
                <AutoGrid min={320}>
                    {applicants.map((a: Applicant) => {
                        const exp = experienceLabel(a.totalExperienceMonths);
                        const src = sourceName(a.sourceId);
                        // Phone-only candidates are the intake this form was built for; show whichever they have.
                        const contact = [a.email, a.phone].filter(Boolean).join(" · ");
                        return (
                            <GlassCard key={a.id} preset="row" sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", p: 1.75 }}>
                                <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ minWidth: 0 }}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3, overflowWrap: "anywhere" }}>
                                            {fullName(a)}
                                        </Typography>
                                        {contact && (
                                            <Typography sx={{ fontSize: 12, color: "text.secondary", overflowWrap: "anywhere", mt: 0.15 }}>
                                                {contact}
                                            </Typography>
                                        )}
                                    </Box>
                                    {a.isBlacklisted && <ToneChip tone="danger" label="Blacklisted" dense />}
                                </Stack>

                                {(a.currentTitle || a.currentEmployer) && (
                                    <Typography sx={{ fontSize: 12.5, color: "text.secondary", lineHeight: 1.45, overflowWrap: "anywhere" }}>
                                        {[a.currentTitle, a.currentEmployer].filter(Boolean).join(" · ")}
                                    </Typography>
                                )}

                                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.25 }}>
                                    {exp && <MetaPill text={exp} />}
                                    {a.expectedCtc != null && <MetaPill text={`${formatCurrencyCompact(Number(a.expectedCtc))} expected`} />}
                                    {a.noticePeriodDays != null && <MetaPill text={a.noticePeriodDays === 0 ? "Immediate joiner" : `${a.noticePeriodDays} days notice`} />}
                                    {src && <MetaPill text={src} />}
                                </Stack>

                                {/* Spacer keeps the action row pinned to the bottom so tiles align in the grid. */}
                                <Box sx={{ flex: 1 }} />

                                <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                                    <Typography sx={{ fontSize: 11.5, color: "text.disabled", fontWeight: 600 }}>
                                        Added {formatDate(a.createdAt)}
                                    </Typography>
                                    <Box sx={{ flex: 1 }} />
                                    <ActionIconButton iconName="briefcase" size="sm" tone="brand" title="Add to a role" onClick={() => setAddToRole(a)} />
                                    <ActionIconButton
                                        iconName={a.resumeS3Url ? "arrows-circle" : "cloud-add"}
                                        icon={uploadingId === a.id ? <CircularProgress size={14} color="inherit" /> : undefined}
                                        size="sm" tone="indigo"
                                        title={uploadingId === a.id ? "Uploading…" : a.resumeS3Url ? "Replace resume" : "Attach resume"}
                                        disabled={uploadingId === a.id}
                                        onClick={() => pickResume(a)}
                                    />
                                    {a.resumeS3Url && (
                                        <ActionIconButton iconName="document" size="sm" tone="indigo"
                                            title={a.resumeFileName ? `Open resume — ${a.resumeFileName}` : "Open resume"}
                                            onClick={() => openResume(a)} />
                                    )}
                                    <ActionIconButton iconName="pencil" size="sm" tone="indigo" title="Edit" onClick={() => openEdit(a)} />
                                    <ActionIconButton
                                        iconName={a.isBlacklisted ? "check" : "shield-cross"} size="sm"
                                        tone={a.isBlacklisted ? "success" : "danger"}
                                        title={a.isBlacklisted ? "Remove from blacklist" : "Blacklist"}
                                        disabled={blacklistMut.isPending}
                                        onClick={() => toggleBlacklist(a)}
                                    />
                                </Stack>
                            </GlassCard>
                        );
                    })}
                </AutoGrid>
            )}

            <AddCandidateDialog open={adding} onClose={() => setAdding(false)} companyId={companyId} />
            {addToRole && (
                <AddToRoleDialog
                    open
                    onClose={() => setAddToRole(null)}
                    applicantId={addToRole.id}
                    applicantName={fullName(addToRole)}
                    companyId={companyId}
                />
            )}

            <GlassDialog
                open={!!editing}
                onClose={updateMut.isPending ? undefined : closeEdit}
                maxWidth="sm"
                header={
                    <GlassHeader
                        title={editing ? `Edit ${fullName(editing)}` : "Edit candidate"}
                        icon={<KTIcon iconName="user-tick" className="fs-2" />}
                        onClose={updateMut.isPending ? undefined : closeEdit}
                    />
                }
            >
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <CandidateFormFields
                            form={form}
                            onChange={setForm}
                            showErrors={attempted}
                            resumeFile={formFile}
                            onResumeFile={setFormFile}
                            existingResumeName={editing?.resumeFileName ?? (editing?.resumeS3Url ? "Resume on file" : null)}
                            disabled={updateMut.isPending}
                        />
                        <WtSwitchField
                            title="Blacklisted"
                            description="Keeps the record (and its audit trail) but flags them on future applications."
                            checked={blacklisted}
                            onChange={(e) => setBlacklisted(e.target.checked)}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <WtButton ghost onClick={closeEdit} disabled={updateMut.isPending}>Cancel</WtButton>
                    <WtButton tone="primary" disabled={updateMut.isPending || (attempted && !isCandidateFormValid(form))} onClick={saveEdit}>
                        {updateMut.isPending ? "Saving…" : "Save changes"}
                    </WtButton>
                </DialogActions>
            </GlassDialog>
        </Box>
    );
};

export default CandidatesView;
