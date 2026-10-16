import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInfiniteQuery, useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Box, Stack, Typography, CircularProgress, LinearProgress } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    AutoGrid, ListHeader, GlassCard, WtButton, ActionIconButton, ToneChip,
    toast, confirmDialog, WtEmptyState, WtField, InlineNotice,
} from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import { COPY } from "./terms";
import { formatDate } from "@utils/dateFormats";
import { formatCurrencyCompact } from "@utils/currency";
import { apiErrorMessage } from "@utils/apiError";
import { canSection } from "@utils/can";
import { useOrgScope } from "@/hooks/useOrgScope";
import {
    getApplicants, getApplicantById, updateApplicant, getApplicantSources, uploadApplicantResume,
    type Applicant, type ApplicantSource, type OrgScoped,
} from "@services/recruitment";
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
 * Add / Edit always open the fullscreen Candidate wizard. Candidates are never hard-deleted:
 * data retention and the audit trail both require the row to survive, so the destructive
 * action is "blacklist" (an update), not a delete.
 */
const CandidatesView = ({ companyId }: OrgScoped) => {
    const canWrite = canSection("recruitment", "write");
    const navigate = useNavigate();
    const qc = useQueryClient();
    // Labels only — shell already owns the filter; we resolve write-company names for R3 badges.
    const { selectOptions: orgOptions } = useOrgScope({ allLabel: "All organizations" });
    const orgName = (id?: string | null) =>
        (id && orgOptions.find((o) => o.value === id)?.label) || null;

    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [searchInput]);

    const [addToRole, setAddToRole] = useState<Applicant | null>(null);

    // The server does the searching, so the key includes the term. Cursor pages append via Load more.
    const {
        data: pages,
        isLoading,
        isFetching,
        isError,
        error,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: queryKeys.recruitment.applicants(search, companyId ?? ""),
        queryFn: ({ pageParam }) => getApplicants(search || undefined, companyId, pageParam),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (last) => last.nextCursor ?? undefined,
        placeholderData: keepPreviousData,
    });
    const applicants = useMemo(() => pages?.pages.flatMap((p) => p.items) ?? [], [pages]);
    /**
     * Family-wide board + per-org unique keys → same email can appear twice under sister orgs.
     * Surface the count when viewing All so recruiters know (360 R3). Full merge is a later tool.
     */
    const duplicateIdentityCount = useMemo(() => {
        if (companyId) return 0;
        const emails = new Map<string, number>();
        const phones = new Map<string, number>();
        for (const a of applicants) {
            const em = a.email?.trim().toLowerCase();
            if (em) emails.set(em, (emails.get(em) ?? 0) + 1);
            const ph = a.phone?.replace(/\D/g, "");
            if (ph && ph.length >= 8) phones.set(ph, (phones.get(ph) ?? 0) + 1);
        }
        let n = 0;
        for (const c of emails.values()) if (c > 1) n += 1;
        for (const c of phones.values()) if (c > 1) n += 1;
        return n;
    }, [applicants, companyId]);
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

    const blacklistMut = useMutation({
        mutationFn: (vars: { id: string; isBlacklisted: boolean }) => updateApplicant(vars.id, { isBlacklisted: vars.isBlacklisted }),
        onSuccess: (_d, vars) => { toast({ icon: "success", title: vars.isBlacklisted ? "Candidate blacklisted" : "Candidate restored" }); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not update the candidate") }),
    });

    const withShellOrg = (path: string) => {
        if (!companyId) return path;
        const sep = path.includes("?") ? "&" : "?";
        return `${path}${sep}companyId=${encodeURIComponent(companyId)}`;
    };

    const openEdit = (a: Applicant) => {
        navigate(withShellOrg(`/recruitment/candidates/${a.id}/edit`));
    };

    const startAdd = () => {
        navigate(withShellOrg("/recruitment/candidates/new"));
    };

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
                            label="Search Candidates" icon="magnifier" clearable
                            value={searchInput} onChange={setSearchInput}
                            placeholder="Name, email, title or employer"
                            fullWidth={false}
                            sx={{ width: { xs: "100%", sm: 280 } }}
                        />
                        {canWrite && (
                            <WtButton tone="primary" size="small" startIcon={<KTIcon iconName="plus" className="fs-6" />} onClick={startAdd}>
                                Add Candidate
                            </WtButton>
                        )}
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
                    <WtEmptyState icon="people" title={COPY.noCandidates.title} hint={COPY.noCandidates.hint} actionLabel={canWrite ? "Add Candidate" : undefined} onAction={startAdd} />
                )
            ) : (
                <>
                {duplicateIdentityCount > 0 && (
                    <Box sx={{ mb: 1.5 }}>
                        <InlineNotice icon="information-5">
                            {duplicateIdentityCount === 1
                                ? "One email or phone appears on more than one candidate card — usually the same person entered under two organizations. Filter by organization to tell them apart."
                                : `${duplicateIdentityCount} emails or phones appear on more than one candidate card — usually the same people entered under two organizations. Filter by organization to tell them apart.`}
                        </InlineNotice>
                    </Box>
                )}
                {hasNextPage && (
                    <Box sx={{ mb: 1.5 }}>
                        <InlineNotice icon="information-5">
                            Showing {applicants.length} candidates. More remain — load the next page,
                            or search by name, email, job title or employer.
                        </InlineNotice>
                        <Box sx={{ mt: 1 }}>
                            <WtButton
                                size="small"
                                disabled={isFetchingNextPage}
                                onClick={() => fetchNextPage()}
                            >
                                {isFetchingNextPage ? "Loading…" : "Load more"}
                            </WtButton>
                        </Box>
                    </Box>
                )}
                <AutoGrid min={320}>
                    {applicants.map((a: Applicant) => {
                        const exp = experienceLabel(a.totalExperienceMonths);
                        const src = sourceName(a.sourceId);
                        const org = orgName(a.companyId);
                        // Phone-only candidates are the intake this form was built for; show whichever they have.
                        const contact = [a.email, a.phone].filter(Boolean).join(" · ");
                        return (
                            <GlassCard key={a.id} preset="row" sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", p: 1.75 }}>
                                <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ minWidth: 0 }}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3, overflowWrap: "anywhere" }}>
                                            {fullName(a)}
                                        </Typography>
                                        {org && !companyId && (
                                            <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.25 }}>
                                                {org}
                                            </Typography>
                                        )}
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
                                    {canWrite && <ActionIconButton iconName="briefcase" size="sm" tone="brand" title="Add to a Role" onClick={() => setAddToRole(a)} />}
                                    {canWrite && <ActionIconButton
                                        iconName={a.resumeS3Url ? "arrows-circle" : "cloud-add"}
                                        icon={uploadingId === a.id ? <CircularProgress size={14} color="inherit" /> : undefined}
                                        size="sm" tone="indigo"
                                        title={uploadingId === a.id ? "Uploading…" : a.resumeS3Url ? "Replace resume" : "Attach resume"}
                                        disabled={uploadingId === a.id}
                                        onClick={() => pickResume(a)}
                                    />}
                                    {a.resumeS3Url && (
                                        <ActionIconButton iconName="document" size="sm" tone="indigo"
                                            title={a.resumeFileName ? `Open resume — ${a.resumeFileName}` : "Open resume"}
                                            onClick={() => openResume(a)} />
                                    )}
                                    {canWrite && <ActionIconButton iconName="pencil" size="sm" tone="indigo" title="Edit" onClick={() => openEdit(a)} />}
                                    {canWrite && <ActionIconButton
                                        iconName={a.isBlacklisted ? "check" : "shield-cross"} size="sm"
                                        tone={a.isBlacklisted ? "success" : "danger"}
                                        title={a.isBlacklisted ? "Remove from blacklist" : "Blacklist"}
                                        disabled={blacklistMut.isPending}
                                        onClick={() => toggleBlacklist(a)}
                                    />}
                                </Stack>
                            </GlassCard>
                        );
                    })}
                </AutoGrid>
                </>
            )}

            {addToRole && (
                <AddToRoleDialog
                    open
                    onClose={() => setAddToRole(null)}
                    applicantId={addToRole.id}
                    applicantName={fullName(addToRole)}
                    companyId={companyId}
                />
            )}
        </Box>
    );
};

export default CandidatesView;
