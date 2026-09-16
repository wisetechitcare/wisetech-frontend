import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Stack, Typography, CircularProgress, DialogContent, DialogActions } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    AutoGrid, ListHeader, GlassCard, GlassDialog, GlassHeader, WtButton, WtField, ToneChip, ActionIconButton,
    WtDateField, WtMoneyField, toast, confirmDialog, type SemanticTone,
    WtEmptyState,
} from "@app/modules/common/components/ui";
import { EmployeePickerField } from "@app/modules/common/components/EmployeePickerField";
import { useSelector } from "react-redux";
import type { RootState } from "@redux/store";
import { queryKeys } from "@/lib/queryKeys";
import { COPY, TERMS } from "./terms";
import { useEmployeeLevels } from "@/hooks/useEmployeeLevels";
import { useRecruitmentBranches } from "@/hooks/useRecruitmentBranches";
import { RecruitmentBranchField } from "./RecruitmentBranchField";
import { DepartmentDesignationFields } from "@app/modules/common/components/DepartmentDesignationFields";
import { useDepartmentDesignations } from "@/hooks/useDepartmentDesignations";
import {
    getRequisitions, createRequisition, updateRequisition, archiveRequisition, submitRequisitionApproval,
    getRequisitionStages,
    type JobRequisition, type RequisitionPayload, type OrgScoped,
    getRecruitmentSettings,
} from "@services/recruitment";
import { formatCurrencyCompact } from '@utils/currency';
import { annualAmountError } from '@utils/ctc';
import { formatDate } from '@utils/dateFormats';
import { apiErrorMessage } from '@utils/apiError';

/**
 * Where a requisition stands. Status 0 is BOTH a draft and a submitted requisition, so
 * `approvalPending` (from the server) separates them. Labelling both "Pending" left Submit and
 * Edit on a requisition already with its approver, and a second Submit failed with a message
 * about the hiring manager that had nothing to do with it.
 */
const stageOf = (r: JobRequisition): { label: string; tone: SemanticTone } =>
    r.approvalPending ? { label: "Awaiting approval", tone: "warning" }
        : r.status === 1 ? { label: "Approved", tone: "success" }
            : r.status === 2 ? { label: "Rejected", tone: "danger" }
                : { label: "Draft", tone: "neutral" };

/**
 * Editable while it is a draft, and again once REJECTED — changing a rejected requisition is how it
 * gets resubmitted. Locked while out for sign-off and once approved; the server enforces the same.
 */
const isEditable = (r: JobRequisition) => !r.approvalPending && r.status !== 1;

/**
 * A blank requisition, with the two people pre-filled where we can honestly guess.
 *
 * `hiringManagerId` is whoever is filling the form: a requisition is normally raised BY the
 * manager whose team the hire joins. `recruiterId` is the tenant's configured default; unset
 * leaves it empty, since guessing somebody is worse than asking. Defaults only, and only on a
 * NEW requisition. Editing an existing one loads what was saved.
 */
const emptyForm = (defaults: { hiringManagerId?: string; recruiterId?: string; branchId?: string } = {}): RequisitionPayload => ({
    title: "",
    jobDescription: "",
    headcount: 1,
    employeeLevelId: null,
    hiringManagerId: defaults.hiringManagerId ?? "",
    recruiterId: defaults.recruiterId ?? "",
    branchId: defaults.branchId ?? "",
    departmentId: null,
    designationId: null,
    minCtc: null,
    maxCtc: null,
    targetStartDate: null,
    requisitionStageId: "",
});

/**
 * The band as a reader takes it in at a glance — "₹12 L – ₹18 L", "AED 180K – 240K" — in the
 * requisition's OWN currency, which the API resolved. Compact because it sits in a meta pill;
 * the form shows the exact figures.
 */
const ctcLabel = (min?: number | string | null, max?: number | string | null, currency?: string) => {
    const lo = min == null || min === "" ? null : Number(min);
    const hi = max == null || max === "" ? null : Number(max);
    const money = (n: number) => formatCurrencyCompact(n, currency);
    if (lo != null && hi != null) return `${money(lo)} – ${money(hi)}`;
    if (lo != null) return `From ${money(lo)}`;
    if (hi != null) return `Up to ${money(hi)}`;
    return null;
};

/** Every problem with the band, by field. The form shows them and Save is held while any exist. */
const bandErrors = (min?: number | null, max?: number | null) => ({
    min: annualAmountError("Min CTC", min),
    max: annualAmountError("Max CTC", max)
        ?? (min != null && max != null && max < min ? "Max CTC cannot be less than min CTC" : undefined),
});

/** Compact, muted meta chip — packs identity/metrics into the card without stretched gaps. */
const MetaPill = ({ text }: { text: string }) => (
    <Box sx={{
        px: 0.9, py: 0.3, borderRadius: "8px", bgcolor: "action.hover",
        fontSize: 11.5, fontWeight: 600, color: "text.secondary", whiteSpace: "nowrap", lineHeight: 1.5,
    }}>
        {text}
    </Box>
);

const RequisitionsView = ({ companyId }: OrgScoped) => {
    const { levels, isEmpty: noLevels } = useEmployeeLevels();
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<JobRequisition | null>(null);
    const currentEmployeeId = useSelector((st: RootState) => st.employee?.currentEmployee?.id as string | undefined);
    const { data: settings } = useQuery({
        queryKey: queryKeys.recruitment.settings(),
        queryFn: getRecruitmentSettings,
        staleTime: 5 * 60_000,
    });
    // The branch decides the currency of the salary band, so the band's fields follow it.
    const { byId: branchById, defaultBranchId, isLoading: branchesLoading } = useRecruitmentBranches();
    const { isPairAllowed } = useDepartmentDesignations();

    const [form, setForm] = useState<RequisitionPayload>(emptyForm());
    // Headcount as typed. A number state snapped a cleared field back to 1, so replacing 1 with 5 gave 15.
    const [headcountText, setHeadcountText] = useState("1");

    const { data: requisitions = [], isLoading, isError, error, refetch } = useQuery({
        queryKey: queryKeys.recruitment.requisitions(companyId),
        queryFn: () => getRequisitions(companyId),
    });
    const { data: stages = [] } = useQuery({
        queryKey: queryKeys.recruitment.requisitionStages(),
        queryFn: getRequisitionStages,
    });

    // A NEW form opened before branches or settings arrived would keep those defaults empty for good.
    // Fill them in as they land — only into fields still blank, so nothing the user typed is replaced.
    useEffect(() => {
        if (!open || editing) return;
        setForm((f) => ({
            ...f,
            branchId: f.branchId || defaultBranchId || "",
            recruiterId: f.recruiterId || settings?.defaultRecruiterId || "",
            hiringManagerId: f.hiringManagerId || currentEmployeeId || "",
        }));
    }, [open, editing, defaultBranchId, settings?.defaultRecruiterId, currentEmployeeId]);

    const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.all });
    const close = () => { setOpen(false); setEditing(null); setForm(emptyForm()); setHeadcountText("1"); };

    const createMut = useMutation({
        mutationFn: (payload: RequisitionPayload) => createRequisition(payload),
        onSuccess: () => { toast({ icon: "success", title: "Requisition created" }); close(); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not create the requisition") }),
    });

    const updateMut = useMutation({
        mutationFn: (vars: { id: string; payload: RequisitionPayload }) => updateRequisition(vars.id, vars.payload),
        onSuccess: () => { toast({ icon: "success", title: "Requisition updated" }); close(); invalidate(); },
        // The server's sentence says what happened — a revision conflict, a locked requisition, a branch problem.
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not update the requisition") }),
    });

    const submitMut = useMutation({
        mutationFn: (r: JobRequisition) => submitRequisitionApproval(r.id, r.hiringManagerId ? [r.hiringManagerId] : undefined),
        onSuccess: () => { toast({ icon: "success", title: "Submitted for approval" }); invalidate(); },
        onError: (err) => { toast({ icon: "error", title: apiErrorMessage(err, "Could not submit for approval") }); invalidate(); },
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => archiveRequisition(id),
        // The server's message says how many adverts came down with it.
        onSuccess: (data: { message?: string } | undefined) => { toast({ icon: "success", title: data?.message ?? "Requisition archived" }); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not archive the requisition") }),
    });

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm({ hiringManagerId: currentEmployeeId, recruiterId: settings?.defaultRecruiterId ?? undefined, branchId: defaultBranchId || undefined }));
        setHeadcountText("1");
        setOpen(true);
    };
    const openEdit = (r: JobRequisition) => {
        setEditing(r);
        setForm({
            title: r.title,
            jobDescription: r.jobDescription ?? "",
            headcount: r.headcount ?? 1,
            employeeLevelId: r.employeeLevelId ?? null,
            hiringManagerId: r.hiringManagerId ?? "",
            recruiterId: r.recruiterId ?? "",
            // Older requisitions may have none; the field is required, so Save asks for one.
            branchId: r.branchId ?? "",
            departmentId: r.departmentId ?? null,
            designationId: r.designationId ?? null,
            minCtc: r.minCtc == null ? null : Number(r.minCtc),
            maxCtc: r.maxCtc == null ? null : Number(r.maxCtc),
            targetStartDate: r.targetStartDate ? r.targetStartDate.slice(0, 10) : null,
            requisitionStageId: r.requisitionStageId ?? "",
        });
        setHeadcountText(String(r.headcount ?? 1));
        setOpen(true);
    };

    const remove = async (r: JobRequisition) => {
        const ok = await confirmDialog({
            icon: "warning",
            title: "Archive this requisition?",
            text: `"${r.title}" will be hidden from the pipeline. Its job adverts come off the careers page, and a pending approval is withdrawn.`,
            confirmText: "Archive",
        });
        if (ok) deleteMut.mutate(r.id);
    };

    const band = bandErrors(form.minCtc, form.maxCtc);
    const headcount = Number.parseInt(headcountText, 10);
    const headcountValid = Number.isInteger(headcount) && headcount >= 1;
    // A branch that has since been deactivated is no longer in the list; the field says so and Save waits.
    const branchUsable = !!form.branchId && (branchesLoading || branchById.has(form.branchId));
    // An unchanged pair on an older requisition is not re-judged — the server only checks a pair that changes.
    const pairOk = isPairAllowed(form.departmentId, form.designationId)
        || (!!editing && (form.departmentId ?? null) === (editing.departmentId ?? null) && (form.designationId ?? null) === (editing.designationId ?? null));
    const canSave = !!form.title?.trim() && branchUsable && headcountValid && pairOk && !band.min && !band.max;
    // The currency the band is being typed in: the chosen branch's, else what the API resolved.
    const bandCurrency = (form.branchId && branchById.get(form.branchId)?.currency) || editing?.currency;
    const saving = createMut.isPending || updateMut.isPending;

    const save = () => {
        if (!canSave) return;
        const payload: RequisitionPayload = {
            ...form,
            headcount,
            jobDescription: form.jobDescription || null,
            hiringManagerId: form.hiringManagerId || null,
            recruiterId: form.recruiterId || null,
            departmentId: form.departmentId || null,
            designationId: form.designationId || null,
            requisitionStageId: form.requisitionStageId || null,
            minCtc: form.minCtc ?? null,
            maxCtc: form.maxCtc ?? null,
            targetStartDate: form.targetStartDate || null,
        };
        if (editing) updateMut.mutate({ id: editing.id, payload: { ...payload, expectedRevisionCount: editing.revisionCount } });
        else createMut.mutate(payload);
    };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1600, mx: "auto" }}>
            <ListHeader
                title={TERMS.Requisitions}
                subtitle="A role is an approved request to hire — HR's job requisition. Raise it, route it for approval, then publish it to the careers page."
                actions={
                    <WtButton tone="primary" size="small" startIcon={<KTIcon iconName="plus" className="fs-6" />} onClick={openCreate}>
                        New requisition
                    </WtButton>
                }
            />

            {isLoading ? (
                <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>
            ) : isError ? (
                <WtEmptyState variant="error" title="Could not load the roles" hint={apiErrorMessage(error, "Check your connection and try again.")} actionLabel="Retry" onAction={() => refetch()} />
            ) : requisitions.length === 0 ? (
                <WtEmptyState
                    icon="briefcase"
                    title={COPY.noRequisitions.title}
                    hint={COPY.noRequisitions.hint}
                    actionLabel="New requisition"
                    onAction={openCreate}
                />
            ) : (
                <AutoGrid min={320}>
                    {requisitions.map((r) => {
                        const meta = stageOf(r);
                        const ctc = ctcLabel(r.minCtc, r.maxCtc, r.currency);
                        const canSubmit = !r.approvalPending && r.status !== 1;
                        return (
                            <GlassCard key={r.id} preset="row" sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", p: 1.75 }}>
                                <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ minWidth: 0 }}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3, overflowWrap: "anywhere" }}>{r.title}</Typography>
                                        {r.prefix && (
                                            <Typography sx={{ fontSize: 11.5, color: "text.disabled", fontWeight: 700, letterSpacing: "0.02em", mt: 0.15 }}>{r.prefix}</Typography>
                                        )}
                                    </Box>
                                    <ToneChip tone={meta.tone} label={meta.label} dense />
                                </Stack>

                                {r.jobDescription && (
                                    <Typography sx={{
                                        fontSize: 12.5, color: "text.secondary", lineHeight: 1.5,
                                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                                    }}>
                                        {r.jobDescription}
                                    </Typography>
                                )}

                                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.25 }}>
                                    <MetaPill text={`${r.filledCount}/${r.headcount} filled`} />
                                    {r.branchId && branchById.get(r.branchId) && <MetaPill text={branchById.get(r.branchId)!.name} />}
                                    {r.requisitionStage?.name && <MetaPill text={r.requisitionStage.name} />}
                                    {ctc && <MetaPill text={ctc} />}
                                    {r.targetStartDate && <MetaPill text={`Starts ${formatDate(r.targetStartDate)}`} />}
                                </Stack>

                                {/* Spacer keeps the action row pinned to the bottom so tiles align in the grid. */}
                                <Box sx={{ flex: 1 }} />

                                <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                                    {canSubmit && (
                                        <WtButton
                                            ghost size="small"
                                            startIcon={<KTIcon iconName="send" className="fs-7" />}
                                            disabled={submitMut.isPending}
                                            onClick={() => submitMut.mutate(r)}
                                            sx={{ minHeight: 32, px: 1.25 }}
                                        >
                                            {r.status === 2 ? "Resubmit" : "Submit"}
                                        </WtButton>
                                    )}
                                    <Box sx={{ flex: 1 }} />
                                    <ActionIconButton
                                        iconName="pencil" size="sm" tone="indigo"
                                        title={isEditable(r) ? "Edit" : r.approvalPending ? "Locked while awaiting approval" : "Locked — this role is approved"}
                                        disabled={!isEditable(r)}
                                        onClick={() => openEdit(r)}
                                    />
                                    <ActionIconButton
                                        iconName="trash" size="sm" tone="danger" title="Archive"
                                        disabled={deleteMut.isPending}
                                        onClick={() => remove(r)}
                                    />
                                </Stack>
                            </GlassCard>
                        );
                    })}
                </AutoGrid>
            )}

            <GlassDialog
                open={open}
                onClose={close}
                maxWidth="sm"
                header={
                    <GlassHeader
                        title={editing ? "Edit Requisition" : "New Requisition"}
                        subtitle={editing ? (editing.prefix ?? "Update this headcount request") : "Raise a headcount request"}
                        icon={<KTIcon iconName="questionnaire-tablet" className="fs-2" />}
                        onClose={close}
                    />
                }
            >
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        {editing?.status === 2 && (
                            <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                                This requisition was rejected. Adjust it, save, then resubmit it for approval.
                            </Typography>
                        )}
                        <WtField
                            label="Title" required fullWidth
                            value={form.title}
                            onChange={(v) => setForm({ ...form, title: v })}
                        />
                        {/* The role's department and designation. The designation also chooses the
                            interview scorecard, and a new offer for this role starts with both. */}
                        <DepartmentDesignationFields
                            departmentId={form.departmentId ?? null}
                            designationId={form.designationId ?? null}
                            onChange={(next) => setForm({ ...form, departmentId: next.departmentId, designationId: next.designationId })}
                        />
                        <WtField
                            label="Job description" fullWidth multiline minRows={3}
                            value={form.jobDescription ?? ""}
                            onChange={(v) => setForm({ ...form, jobDescription: v })}
                        />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <WtField
                                label="Headcount" type="number" inputMode="numeric" min={1} step={1} required sx={{ flex: 1 }}
                                value={headcountText}
                                onChange={setHeadcountText}
                                error={headcountText !== "" && !headcountValid ? "At least 1" : undefined}
                            />
                            <WtDateField
                                label="Target start date"
                                sx={{ flex: 1 }}
                                value={form.targetStartDate}
                                onChange={(v) => setForm({ ...form, targetStartDate: v || null })}
                            />
                            {/* Same ladder the candidate form reads. A level comparison between
                                the two sides only means anything if both picked from one list. */}
                            {!noLevels && (
                                <WtField
                                    label="Seniority" sx={{ flex: 1 }} clearable
                                    value={form.employeeLevelId ?? ""}
                                    onChange={(v) => setForm({ ...form, employeeLevelId: v || null })}
                                    options={levels.map((l) => ({ value: l.id, label: l.name }))}
                                    placeholder="Not set"
                                />
                            )}
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            {/* Branch first: it decides the currency the band beside it is typed in. */}
                            <RecruitmentBranchField
                                required sx={{ flex: 1 }}
                                value={form.branchId}
                                onChange={(v) => setForm({ ...form, branchId: v })}
                                error={form.branchId && !branchUsable ? "This branch is no longer active. Choose another." : undefined}
                            />
                            <WtMoneyField
                                label="Min CTC" per="year" currency={bandCurrency} sx={{ flex: 1 }}
                                value={form.minCtc}
                                onChange={(v) => setForm({ ...form, minCtc: v })}
                                error={band.min}
                            />
                            <WtMoneyField
                                label="Max CTC" per="year" currency={bandCurrency} sx={{ flex: 1 }}
                                value={form.maxCtc}
                                onChange={(v) => setForm({ ...form, maxCtc: v })}
                                error={band.max}
                            />
                        </Stack>
                        {stages.length > 0 && (
                            <WtField
                                label="Stage" fullWidth clearable
                                value={form.requisitionStageId ?? ""}
                                onChange={(v) => setForm({ ...form, requisitionStageId: v || null })}
                                options={stages.map((s) => ({ value: s.id, label: s.name }))}
                                placeholder="Default"
                            />
                        )}
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <EmployeePickerField
                                label="Hiring manager" sx={{ flex: 1 }}
                                placeholder="Select a manager…"
                                // The server routes approval to the hiring manager — unless that is the
                                // person submitting, who cannot approve their own request; then it goes
                                // up their reporting line.
                                helperText="Approves this request. If that is you, it goes to your manager instead."
                                value={form.hiringManagerId ?? null}
                                onChange={(ids) => setForm({ ...form, hiringManagerId: ids[0] ?? null })}
                            />
                            <EmployeePickerField
                                label="Recruiter" sx={{ flex: 1 }}
                                placeholder="Select a recruiter…"
                                value={form.recruiterId ?? null}
                                onChange={(ids) => setForm({ ...form, recruiterId: ids[0] ?? null })}
                            />
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <WtButton ghost onClick={close}>Cancel</WtButton>
                    <WtButton tone="primary" disabled={!canSave || saving} onClick={save}>
                        {editing ? (updateMut.isPending ? "Saving…" : "Save changes") : (createMut.isPending ? "Creating…" : "Create")}
                    </WtButton>
                </DialogActions>
            </GlassDialog>
        </Box>
    );
};

export default RequisitionsView;
