import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInfiniteQuery, useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Box, Stack, Typography, CircularProgress, LinearProgress } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    AutoGrid, ListHeader, GlassCard, WtButton, ActionIconButton, ToneChip,
    toast, confirmDialog, TableSelectionBar, WtEmptyState, WtField, InlineNotice,
    CardsListViewSwitch, type CardsListView,
} from "@app/modules/common/components/ui";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { queryKeys } from "@/lib/queryKeys";
import { useRememberedChoice } from "@/hooks/useRememberedChoice";
import { COPY } from "./terms";
import { formatDate } from "@utils/dateFormats";
import { formatCurrencyCompact } from "@utils/currency";
import { apiErrorMessage } from "@utils/apiError";
import { canSection } from "@utils/can";
import { useOrgScope } from "@/hooks/useOrgScope";
import {
    getApplicants, getApplicantById, updateApplicant, archiveApplicant, getApplicantSources, uploadApplicantResume,
    type Applicant, type ApplicantSource, type OrgScoped,
} from "@services/recruitment";
import { AddToRoleDialog } from "./AddToRoleDialog";
import { candidateColumns, experienceLabel, fullName } from "./candidateColumns";

/** Wait this long after the last keystroke before searching — one request per pause, not per letter. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Candidates — the applicant directory (Recruitment › Candidates).
 *
 * Soft archive moves them to the Archive tab (restore / hard delete there). Blacklist stays a
 * separate flag for future applications. DPDP erase remains manage-only on the API.
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
    /** Cards or list — remembered like Pipeline / Roles / Adverts. */
    const [mode, setMode] = useRememberedChoice<CardsListView>(
        "recruitment:candidates-view", ["cards", "list"], "cards",
    );

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
        onSuccess: (_d, vars) => { toast({ icon: "success", title: vars.isBlacklisted ? "Candidate blacklisted" : "Removed from blacklist" }); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not update the candidate") }),
    });

    const archiveMut = useMutation({
        mutationFn: (id: string) => archiveApplicant(id),
        onSuccess: () => { toast({ icon: "success", title: "Candidate archived" }); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not archive the candidate") }),
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

    const archive = async (a: Applicant) => {
        const ok = await confirmDialog({
            icon: "warning",
            title: `Archive ${fullName(a)}?`,
            text: "They move to Archive with their active applications. Restore or permanently delete from the Archive tab.",
            confirmText: "Archive",
        });
        if (ok) archiveMut.mutate(a.id);
    };

    const sourceName = useMemo(
        () => (id?: string | null) => sources.find((s: ApplicantSource) => s.id === id)?.name ?? null,
        [sources],
    );

    /**
     * List actions stay a single non-wrapping icon row. "Added" lives in its own column;
     * Edit is the row click (same as Pipeline list) so it is not repeated here.
     */
    const listActions = (a: Applicant) => (
        <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            flexWrap="nowrap"
            onClick={(e) => e.stopPropagation()}
            sx={{ whiteSpace: "nowrap" }}
        >
            {canWrite && (
                <ActionIconButton iconName="briefcase" size="sm" tone="brand" title="Add to a Role" onClick={() => setAddToRole(a)} />
            )}
            {canWrite && (
                <ActionIconButton
                    iconName={a.resumeS3Url ? "arrows-circle" : "cloud-add"}
                    icon={uploadingId === a.id ? <CircularProgress size={14} color="inherit" /> : undefined}
                    size="sm"
                    tone="indigo"
                    title={uploadingId === a.id ? "Uploading…" : a.resumeS3Url ? "Replace resume" : "Attach resume"}
                    disabled={uploadingId === a.id}
                    onClick={() => pickResume(a)}
                />
            )}
            {a.resumeS3Url ? (
                <ActionIconButton
                    iconName="document"
                    size="sm"
                    tone="indigo"
                    title={a.resumeFileName ? `Open resume — ${a.resumeFileName}` : "Open resume"}
                    onClick={() => openResume(a)}
                />
            ) : null}
            {canWrite && (
                <ActionIconButton
                    iconName={a.isBlacklisted ? "check" : "shield-cross"}
                    size="sm"
                    tone={a.isBlacklisted ? "success" : "danger"}
                    title={a.isBlacklisted ? "Remove from blacklist" : "Blacklist"}
                    disabled={blacklistMut.isPending}
                    onClick={() => toggleBlacklist(a)}
                />
            )}
            {canWrite && (
                <ActionIconButton
                    iconName="trash"
                    size="sm"
                    tone="danger"
                    title="Archive"
                    disabled={archiveMut.isPending}
                    onClick={() => archive(a)}
                />
            )}
        </Stack>
    );

    /** Card footer: date + full action set (Edit stays visible — cards have no row-click). */
    const cardActions = (a: Applicant) => (
        <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            flexWrap="wrap"
            useFlexGap
            sx={{ width: "100%" }}
        >
            <Typography sx={{ fontSize: 11.5, color: "text.disabled", fontWeight: 600 }}>
                Added {formatDate(a.createdAt)}
            </Typography>
            <Box sx={{ flex: 1 }} />
            {canWrite && (
                <ActionIconButton iconName="briefcase" size="sm" tone="brand" title="Add to a Role" onClick={() => setAddToRole(a)} />
            )}
            {canWrite && (
                <ActionIconButton
                    iconName={a.resumeS3Url ? "arrows-circle" : "cloud-add"}
                    icon={uploadingId === a.id ? <CircularProgress size={14} color="inherit" /> : undefined}
                    size="sm"
                    tone="indigo"
                    title={uploadingId === a.id ? "Uploading…" : a.resumeS3Url ? "Replace resume" : "Attach resume"}
                    disabled={uploadingId === a.id}
                    onClick={() => pickResume(a)}
                />
            )}
            {a.resumeS3Url ? (
                <ActionIconButton
                    iconName="document"
                    size="sm"
                    tone="indigo"
                    title={a.resumeFileName ? `Open resume — ${a.resumeFileName}` : "Open resume"}
                    onClick={() => openResume(a)}
                />
            ) : null}
            {canWrite && (
                <ActionIconButton iconName="pencil" size="sm" tone="indigo" title="Edit" onClick={() => openEdit(a)} />
            )}
            {canWrite && (
                <ActionIconButton
                    iconName={a.isBlacklisted ? "check" : "shield-cross"}
                    size="sm"
                    tone={a.isBlacklisted ? "success" : "danger"}
                    title={a.isBlacklisted ? "Remove from blacklist" : "Blacklist"}
                    disabled={blacklistMut.isPending}
                    onClick={() => toggleBlacklist(a)}
                />
            )}
            {canWrite && (
                <ActionIconButton
                    iconName="trash"
                    size="sm"
                    tone="danger"
                    title="Archive"
                    disabled={archiveMut.isPending}
                    onClick={() => archive(a)}
                />
            )}
        </Stack>
    );

    const listColumns = useMemo(
        () => candidateColumns({
            orgName,
            sourceName,
            actions: listActions,
            omit: companyId ? ["org"] : undefined,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- actions use live mutators / upload state
        [companyId, sources, orgOptions, canWrite, uploadingId, blacklistMut.isPending, archiveMut.isPending],
    );

    const listChrome = (
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
        </>
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
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }} alignItems={{ sm: "center" }}>
                        <WtField
                            label="Search Candidates" icon="magnifier" clearable
                            value={searchInput} onChange={setSearchInput}
                            placeholder="Name, email, title or employer"
                            fullWidth={false}
                            sx={{ width: { xs: "100%", sm: 280 } }}
                        />
                        <CardsListViewSwitch
                            ariaLabel="Candidates view"
                            value={mode}
                            onChange={setMode}
                        />
                        {canWrite && (
                            <WtButton size="small" startIcon={<KTIcon iconName="plus" className="fs-6" />} onClick={startAdd}>
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
                {listChrome}
                {mode === "list" ? (
                    <MaterialTable
                        columns={listColumns}
                        data={applicants}
                        isLoading={isLoading}
                        tableName="RecruitmentCandidatesList"
                        enableRowSelection={canWrite}
                        renderSelectionActions={(selected: Applicant[]) => (
                            <TableSelectionBar count={selected.length}>
                                <WtButton
                                    size="small"
                                    tone="danger"
                                    disabled={archiveMut.isPending}
                                    onClick={async () => {
                                        const ok = await confirmDialog({
                                            icon: "warning",
                                            title: `Archive ${selected.length} candidates?`,
                                            text: "They move to Archive with their active applications. Restore or permanently delete from the Archive tab.",
                                            confirmText: "Archive",
                                        });
                                        if (!ok) return;
                                        await Promise.allSettled(selected.map((a) => archiveMut.mutateAsync(a.id)));
                                    }}
                                >
                                    Archive selected
                                </WtButton>
                            </TableSelectionBar>
                        )}
                        muiTableProps={canWrite ? {
                            muiTableBodyRowProps: ({ row }: { row: { original: Applicant } }) => ({
                                onClick: () => openEdit(row.original),
                                sx: { cursor: "pointer" },
                            }),
                        } : undefined}
                    />
                ) : (
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
                                    {exp && <ToneChip dense tone="neutral" label={exp} />}
                                    {a.expectedCtc != null && (
                                        <ToneChip dense tone="brand" label={`${formatCurrencyCompact(Number(a.expectedCtc))} expected`} />
                                    )}
                                    {a.noticePeriodDays != null && (
                                        <ToneChip
                                            dense
                                            tone={a.noticePeriodDays === 0 ? "success" : "neutral"}
                                            label={a.noticePeriodDays === 0 ? "Immediate joiner" : `${a.noticePeriodDays} days notice`}
                                        />
                                    )}
                                    {src && <ToneChip dense tone="indigo" label={src} />}
                                </Stack>

                                <Box sx={{ flex: 1 }} />

                                <Box sx={{ pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                                    {cardActions(a)}
                                </Box>
                            </GlassCard>
                        );
                    })}
                </AutoGrid>
                )}
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
