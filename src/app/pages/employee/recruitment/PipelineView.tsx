import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Box, Stack, Typography, ToggleButton, ToggleButtonGroup, CircularProgress, DialogContent, DialogActions,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { ListHeader, GlassDialog, GlassHeader, WtButton, WtField, ToneChip, toast, AppIcon, WtEmptyState } from "@app/modules/common/components/ui";
import { apiErrorMessage } from "@utils/apiError";
import { COPY } from "./terms";
import { queryKeys } from "@/lib/queryKeys";
import { getRequisitions, type JobRequisition, type OrgScoped,
} from "@services/recruitment";
import {
    getApplications, createApplication, moveApplicationStage, getApplicationStatuses, getRejectionReasons, getApplicationOffer,
    stashConversion,
    type Application, type ApplicationStatus, type ApplicationCreatePayload,
} from "@services/recruitment";
import InterviewsPanel from "./InterviewsPanel";
import OfferPanel from "./OfferPanel";
import CandidateDrawer from "./CandidateDrawer";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { applicationColumns, applicantName, ScoreChip, WaitingChip } from "./applicationColumns";

interface PendingMove {
    application: Application;
    status: ApplicationStatus;
}

const emptyCreate = (): ApplicationCreatePayload & { firstName: string; lastName: string; email: string; phone: string } => ({
    firstName: "", lastName: "", email: "", phone: "", requisitionId: "", statusId: null,
});

/** Loose on purpose — the server validates properly; this only stops an obvious typo reaching it. */
const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const PipelineView = ({ companyId }: OrgScoped) => {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const [mode, setMode] = useState<"board" | "list">("board");
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState(emptyCreate());
    const [pending, setPending] = useState<PendingMove | null>(null);
    const [rejectReasonId, setRejectReasonId] = useState("");
    const [rejectNote, setRejectNote] = useState("");
    const [dragId, setDragId] = useState<string | null>(null);
    // The candidate record the recruiter is looking at. The board card had no click
    // target at all before this, so the pipeline had no unit of work.
    const [openCandidate, setOpenCandidate] = useState<Application | null>(null);
    const [interviewsFor, setInterviewsFor] = useState<Application | null>(null);
    const [offerFor, setOfferFor] = useState<Application | null>(null);

    const { data: applications = [], isLoading, isError, error, refetch } = useQuery({ queryKey: queryKeys.recruitment.applications({ companyId }), queryFn: () => getApplications({}, companyId) });
    const { data: statuses = [], isLoading: statusesLoading, isError: statusesError } = useQuery({ queryKey: queryKeys.recruitment.applicationStatuses(), queryFn: getApplicationStatuses });
    const { data: reasons = [] } = useQuery({ queryKey: queryKeys.recruitment.rejectionReasons(), queryFn: getRejectionReasons });
    const { data: requisitions = [] } = useQuery({ queryKey: queryKeys.recruitment.requisitions(companyId), queryFn: () => getRequisitions(companyId) });

    const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.all });

    const createMut = useMutation({
        mutationFn: (payload: ApplicationCreatePayload) => createApplication(payload),
        onSuccess: () => { toast({ icon: "success", title: "Application added" }); closeCreate(); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not add the application") }),
    });

    const moveMut = useMutation({
        mutationFn: (vars: { id: string; statusId: string; revisionCount: number; rejectionReasonId?: string; rejectionNote?: string }) =>
            moveApplicationStage(vars.id, {
                statusId: vars.statusId,
                expectedRevisionCount: vars.revisionCount,
                rejectionReasonId: vars.rejectionReasonId ?? null,
                rejectionNote: vars.rejectionNote ?? null,
            }),
        onSuccess: () => { toast({ icon: "success", title: "Moved" }); invalidate(); },
        onError: (err) => { toast({ icon: "error", title: apiErrorMessage(err, "Could not move the candidate") }); invalidate(); },
    });

    /**
     * The list view is the SAME records the overview drill-downs show, so it uses the same
     * column definition and adds only what is unique to this screen: the row actions.
     * Two hand-written tables were how "Score" came to mean a bare number here and a band
     * there, with neither able to sort on what it displayed.
     */
    const listColumns = useMemo(
        () => applicationColumns({
            actions: (a) => (
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    <WtButton size="small" ghost startIcon={<KTIcon iconName="profile-circle" className="fs-6" />} onClick={() => setOpenCandidate(a)}>
                        Open
                    </WtButton>
                    <WtButton size="small" ghost startIcon={<KTIcon iconName="message-text-2" className="fs-6" />} onClick={() => setInterviewsFor(a)}>
                        Interviews
                    </WtButton>
                    <WtButton size="small" ghost startIcon={<KTIcon iconName="wallet" className="fs-6" />} onClick={() => setOfferFor(a)}>
                        Offer
                    </WtButton>
                    {a.status?.isHiredOutcome && (
                        a.convertedEmployeeId
                            ? <ToneChip tone="success" label="Converted" dense />
                            : (
                                <WtButton size="small" tone="success" startIcon={<KTIcon iconName="user-tick" className="fs-6" />} onClick={() => convertToEmployee(a)}>
                                    Convert
                                </WtButton>
                            )
                    )}
                </Stack>
            ),
        }),
        // convertToEmployee is stable for the life of the component; the setters are
        // React state setters, which never change identity.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const byStatus = useMemo(() => {
        const map = new Map<string, Application[]>();
        for (const s of statuses) map.set(s.id, []);
        const unassigned: Application[] = [];
        for (const a of applications) {
            if (a.statusId && map.has(a.statusId)) map.get(a.statusId)!.push(a);
            else unassigned.push(a);
        }
        return { map, unassigned };
    }, [applications, statuses]);

    const attemptMove = (application: Application, status: ApplicationStatus) => {
        if (application.statusId === status.id) return;
        if (status.isRejectedOutcome || status.requiresReason) {
            setPending({ application, status });
            setRejectReasonId("");
            setRejectNote("");
            return;
        }
        moveMut.mutate({ id: application.id, statusId: status.id, revisionCount: application.revisionCount });
    };

    const confirmReject = () => {
        if (!pending || !rejectReasonId) return;
        moveMut.mutate({
            id: pending.application.id,
            statusId: pending.status.id,
            revisionCount: pending.application.revisionCount,
            rejectionReasonId: rejectReasonId,
            rejectionNote: rejectNote || undefined,
        });
        setPending(null);
    };

    // Reset on every close, not only on success, so a cancelled draft never reappears.
    const closeCreate = () => { setCreateOpen(false); setForm(emptyCreate()); };
    const emailTyped = form.email.trim();
    const emailInvalid = !!emailTyped && !looksLikeEmail(emailTyped);
    const hasIdentity = !!emailTyped || !!form.phone.trim();
    const canCreate = !!form.firstName.trim() && hasIdentity && !emailInvalid;
    // New applications go to roles that are approved and still open; a draft or rejected role has no pipeline.
    const openRoles = requisitions.filter((r: JobRequisition) => r.status === 1 && r.isActive !== false);

    const submitCreate = () => {
        if (!canCreate) return;
        createMut.mutate({
            applicant: {
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim() || null,
                email: emailTyped || null,
                phone: form.phone.trim() || null,
            },
            requisitionId: form.requisitionId || null,
        });
    };

    // Convert a hired candidate into an employee: prefill the New Employee wizard
    // via its onboarding-draft seam, then open it — no re-keying of known details.
    const convertToEmployee = async (a: Application) => {
        const draft: Record<string, unknown> = {
            firstName: a.applicant?.firstName ?? "",
            lastName: a.applicant?.lastName ?? "",
            personalEmailId: a.applicant?.email ?? "",
            personalPhoneNumber: a.applicant?.phone ?? "",
            linkedInProfileUrl: a.applicant?.linkedInUrl ?? "",
        };
        // Pull the approved offer (if any) so placement details prefill too.
        try {
            const { offer } = await getApplicationOffer(a.id);
            if (offer) {
                if (offer.offeredDesignationId) draft.designationId = offer.offeredDesignationId;
                if (offer.offeredDepartmentId) draft.departmentId = offer.offeredDepartmentId;
                // The wizard works out the organization and sub-org from the branch on its own.
                if (offer.offeredBranchId) draft.branchId = offer.offeredBranchId;
                if (offer.offeredEmployeeTypeConfigId) draft.employeeTypeConfigId = offer.offeredEmployeeTypeConfigId;
                // Annual to annual. The employee column is still NAMED ctcInLpa but has always held the
                // full yearly amount; now that the offer does too, the figure copies across unchanged.
                if (offer.offeredCtc != null) draft.ctcInLpa = String(offer.offeredCtc);
                if (offer.proposedJoiningDate) draft.dateOfJoining = new Date(offer.proposedJoiningDate).toISOString().slice(0, 10);
            }
        } catch {
            /* offer is optional — proceed with what we have */
        }
        try {
            sessionStorage.setItem("employee-onboarding-draft", JSON.stringify(draft));
        } catch {
            /* storage quota — proceed with a blank wizard */
        }
        // Remember WHICH application this is, so the wizard can write convertedEmployeeId
        // back on a successful create — otherwise the hire is never linked to its candidate.
        stashConversion(a.id);
        toast({ icon: "info", title: "Opening onboarding with the candidate's details prefilled" });
        navigate("/employees/create-new");
    };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1600, mx: "auto" }}>
            <ListHeader
                title="Candidate Pipeline"
                subtitle="Track candidates across stages. Drag cards between columns, or open a candidate to change their stage."
                actions={
                    <>
                        <ToggleButtonGroup
                            size="small" exclusive value={mode} onChange={(_e, v) => v && setMode(v)}
                            sx={{ "& .MuiToggleButton-root": { textTransform: "none", px: 1.25 } }}
                        >
                            <ToggleButton value="board"><AppIcon name="bi-kanban" />&nbsp;Board</ToggleButton>
                            <ToggleButton value="list"><AppIcon name="bi-list-ul" />&nbsp;List</ToggleButton>
                        </ToggleButtonGroup>
                        <WtButton tone="primary" size="small" startIcon={<KTIcon iconName="plus" className="fs-6" />} onClick={() => setCreateOpen(true)}>
                            New application
                        </WtButton>
                    </>
                }
            />

            {/* Loading and a failed load are not "no stages": the notice waits until the list is known to be empty. */}
            {!statusesLoading && !statusesError && statuses.length === 0 && (
                <WtEmptyState icon="setting-2" title={COPY.noStagesConfigured.title} hint={COPY.noStagesConfigured.hint} dense />
            )}

            {isLoading ? (
                <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>
            ) : isError ? (
                <WtEmptyState
                    variant="error"
                    title="Could not load the pipeline"
                    hint={apiErrorMessage(error, "Check your connection and try again.")}
                    actionLabel="Retry"
                    onAction={() => refetch()}
                />
            ) : mode === "board" ? (
                <Box sx={{ display: "flex", gap: 1.5, overflowX: "auto", pb: 1 }}>
                    {/* Candidates whose stage is missing or was removed are listed first rather than
                        silently left off the board — otherwise the column counts never add up to the list. */}
                    {[...(byStatus.unassigned.length ? [null] : []), ...statuses].map((s) => {
                        const cards = s ? byStatus.map.get(s.id) ?? [] : byStatus.unassigned;
                        return (
                            <Box
                                key={s?.id ?? "unassigned"}
                                onDragOver={s ? (e) => e.preventDefault() : undefined}
                                onDrop={s ? () => { const app = applications.find((a) => a.id === dragId); if (app) attemptMove(app, s); setDragId(null); } : undefined}
                                sx={{ minWidth: { xs: 210, sm: 250 }, maxWidth: { xs: 240, sm: 280 }, flex: "0 0 auto", bgcolor: "action.hover", borderRadius: 2, p: 1 }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, px: 0.5 }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, bgcolor: s?.color ?? "text.disabled" }} />
                                    <Typography sx={{ fontWeight: 600, fontSize: 13, flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{s ? s.name : "No stage"}</Typography>
                                    <ToneChip tone="neutral" dense label={String(cards.length)} />
                                </Stack>
                                <Stack spacing={1}>
                                    {/* Drag moves a candidate between stages; a plain click opens
                                        them. onClick is guarded on dragId so releasing a drag is
                                        never treated as a click. */}
                                    {cards.map((a) => (
                                        <Box
                                            key={a.id}
                                            draggable
                                            onDragStart={() => setDragId(a.id)}
                                            onDragEnd={() => setDragId(null)}
                                            onClick={() => { if (!dragId) setOpenCandidate(a); }}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenCandidate(a); } }}
                                            sx={{ p: 1.25, borderRadius: 1.5, bgcolor: "background.paper", boxShadow: 1, cursor: "grab", opacity: dragId === a.id ? 0.5 : 1, "&:hover": { boxShadow: 3 } }}
                                        >
                                            <Typography sx={{ fontWeight: 600, fontSize: 13.5, overflowWrap: "anywhere" }}>
                                                {applicantName(a)}
                                            </Typography>
                                            <Typography sx={{ fontSize: 12, color: "text.secondary", overflowWrap: "anywhere" }}>
                                                {a.requisition?.title ?? "No role"}
                                            </Typography>
                                            <Stack direction="row" useFlexGap sx={{ mt: 0.75, flexWrap: "wrap", gap: 0.5 }}>
                                                <ScoreChip application={a} />
                                                <WaitingChip application={a} />
                                            </Stack>
                                        </Box>
                                    ))}
                                    {cards.length === 0 && <Typography sx={{ fontSize: 12, color: "text.disabled", px: 0.5, py: 1 }}>No candidates. Drag one here.</Typography>}
                                </Stack>
                            </Box>
                        );
                    })}
                </Box>
            ) : (
                /* The shared table engine, not a hand-written table. It brings sorting,
                       per-column search, column show/hide, export and per-user column
                       preferences — none of which the previous markup had — and the columns
                       are the SAME definition the overview drill-downs use, so two views of
                       the same records cannot drift apart. */
                <MaterialTable
                    columns={listColumns}
                    data={applications}
                    isLoading={isLoading}
                    tableName="RecruitmentPipelineList"
                />
            )}

            {/* Create application */}
            <GlassDialog
                open={createOpen}
                onClose={closeCreate}
                maxWidth="sm"
                header={<GlassHeader title="New application" subtitle="Add a candidate to the pipeline" icon={<KTIcon iconName="user-tick" className="fs-2" />} onClose={closeCreate} />}
            >
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <WtField label="First name" required sx={{ flex: 1 }} value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
                            <WtField label="Last name" sx={{ flex: 1 }} value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
                        </Stack>
                        {/* Email OR phone, the rule every other intake uses: walk-in and referral candidates often have only a number. */}
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <WtField label="Email" type="email" inputMode="email" sx={{ flex: 1 }} value={form.email} onChange={(v) => setForm({ ...form, email: v })}
                                error={emailInvalid ? "That does not look like an email address" : undefined} />
                            <WtField label="Phone" type="tel" inputMode="tel" sx={{ flex: 1 }} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                        </Stack>
                        {!hasIdentity && form.firstName.trim() && (
                            <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: -1 }}>Add an email or a phone number so the candidate can be told apart from others.</Typography>
                        )}
                        <WtField
                            label="Role" fullWidth clearable
                            value={form.requisitionId ?? ""}
                            onChange={(v) => setForm({ ...form, requisitionId: v })}
                            options={openRoles.map((r: JobRequisition) => ({ value: r.id, label: r.prefix ? `${r.prefix} · ${r.title}` : r.title }))}
                            searchable={openRoles.length >= 8}
                            placeholder={openRoles.length ? "Choose an approved role" : "No approved roles yet"}
                            hint="Only approved, open roles are listed. Leave empty to add them to the pool."
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <WtButton ghost onClick={closeCreate}>Cancel</WtButton>
                    <WtButton tone="primary" disabled={!canCreate || createMut.isPending} onClick={submitCreate}>
                        {createMut.isPending ? "Adding…" : "Add"}
                    </WtButton>
                </DialogActions>
            </GlassDialog>

            {/* Rejection reason capture on move to a terminal/requires-reason stage */}
            <GlassDialog
                open={!!pending}
                onClose={() => setPending(null)}
                maxWidth="xs"
                header={<GlassHeader title={`Move to "${pending?.status.name ?? ""}"`} subtitle="A reason is required for this stage" icon={<KTIcon iconName="cross" className="fs-2" />} onClose={() => setPending(null)} />}
            >
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <WtField
                            label="Reason" required fullWidth
                            value={rejectReasonId} onChange={setRejectReasonId}
                            options={reasons.map((r) => ({ value: r.id, label: r.reason }))}
                            disabled={reasons.length === 0}
                            placeholder={reasons.length ? "Choose a reason" : "No reasons set up yet"}
                            hint={reasons.length ? undefined : "Add rejection reasons in Configure first."}
                        />
                        <WtField label="Note" fullWidth multiline minRows={2} value={rejectNote} onChange={setRejectNote} placeholder="Optional — anything the next reviewer should know" />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <WtButton ghost onClick={() => setPending(null)}>Cancel</WtButton>
                    <WtButton tone="danger" disabled={!rejectReasonId || moveMut.isPending} onClick={confirmReject}>Confirm</WtButton>
                </DialogActions>
            </GlassDialog>

            {/* Interviews + scorecards for one application */}
            <GlassDialog
                open={!!interviewsFor}
                onClose={() => setInterviewsFor(null)}
                maxWidth="md"
                header={<GlassHeader title={interviewsFor ? applicantName(interviewsFor) : "Interviews"} subtitle="Interviews and scorecards" icon={<KTIcon iconName="message-text-2" className="fs-2" />} onClose={() => setInterviewsFor(null)} />}
            >
                <DialogContent>
                    {interviewsFor && (
                        <InterviewsPanel applicationId={interviewsFor.id} applicantName={applicantName(interviewsFor)} />
                    )}
                </DialogContent>
            </GlassDialog>

            {/* Offer for one application */}
            <GlassDialog
                open={!!offerFor}
                onClose={() => setOfferFor(null)}
                maxWidth="sm"
                header={<GlassHeader title={offerFor ? applicantName(offerFor) : "Offer"} subtitle="Offer and approval" icon={<KTIcon iconName="wallet" className="fs-2" />} onClose={() => setOfferFor(null)} />}
            >
                <DialogContent>
                    {offerFor && (
                        <OfferPanel applicationId={offerFor.id} applicantName={applicantName(offerFor)} />
                    )}
                </DialogContent>
            </GlassDialog>

            {/* Full candidate record. Mounted only while open so its queries do not run for
                every row in the pipeline. */}
            {openCandidate && (
                <CandidateDrawer
                    application={openCandidate}
                    statuses={statuses}
                    onClose={() => setOpenCandidate(null)}
                    // The same move the board makes, including the reason prompt — and the only
                    // way to move someone on a phone, where drag-and-drop does not work.
                    onMove={attemptMove}
                    moving={moveMut.isPending}
                    onConvert={convertToEmployee}
                />
            )}
        </Box>
    );
};

export default PipelineView;
