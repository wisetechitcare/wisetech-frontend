import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, Typography, CircularProgress } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    WtButton, WtField, ToneChip, WtDateField, WtMoneyField, SettingsSection, TRIO,
    toast, confirmDialog, type SemanticTone,
} from "@app/modules/common/components/ui";
import { annualAmountError } from "@utils/ctc";
import { apiErrorMessage } from "@utils/apiError";
import { useRecruitmentBranches } from "@/hooks/useRecruitmentBranches";
import { RecruitmentBranchField } from "./RecruitmentBranchField";
import { queryKeys } from "@/lib/queryKeys";
import { fetchDesignations, fetchDepartments } from "@services/options";
import {
    getApplicationOffer, createOffer, updateOffer, submitOfferApproval, respondToOffer,
    type Offer, type OfferPayload,
} from "@services/recruitment";

/**
 * Where the offer stands. Status 0 is BOTH a draft and a submitted offer, so `approvalPending`
 * (from the server) is what separates them — labelling both "Pending approval" told recruiters a
 * draft was already with the approver, and left Submit offered on one that was.
 */
const stageOf = (offer: Offer): { label: string; tone: SemanticTone } =>
    offer.status === 1 ? { label: "Approved", tone: "success" }
        : offer.status === 2 ? { label: "Rejected", tone: "danger" }
            : offer.approvalPending ? { label: "Awaiting approval", tone: "warning" }
                : { label: "Draft", tone: "neutral" };

/**
 * What the candidate said. Only meaningful once the offer is approved and sent — before that
 * every offer is "PENDING" by default, and showing it next to "Pending approval" read as two
 * separate things waiting.
 */
const ACCEPTANCE: Record<string, { label: string; tone: SemanticTone }> = {
    PENDING: { label: "Awaiting candidate", tone: "warning" },
    ACCEPTED: { label: "Accepted", tone: "success" },
    DECLINED: { label: "Declined", tone: "danger" },
    EXPIRED: { label: "Expired", tone: "warning" },
};

/** Past this many options a plain menu becomes a scroll hunt. */
const SEARCHABLE_FROM = 8;

const toDateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");

/** What an offer letter cannot be generated without. The server refuses a submit that lacks any of it. */
const termsComplete = (o: Pick<Offer, "offeredBranchId" | "offeredCtc" | "proposedJoiningDate">) =>
    !!o.offeredBranchId && o.offeredCtc != null && o.offeredCtc !== "" && !!o.proposedJoiningDate;

/** The saved terms as the form holds them, so "has anything changed" compares like with like. */
const termsOf = (o: Offer | null) => ({
    offeredBranchId: o?.offeredBranchId ?? null,
    offeredCtc: o?.offeredCtc != null ? Number(o.offeredCtc) : null,
    proposedJoiningDate: toDateInput(o?.proposedJoiningDate) || null,
    offeredDesignationId: o?.offeredDesignationId ?? null,
    offeredDepartmentId: o?.offeredDepartmentId ?? null,
    notes: o?.notes ?? null,
});

interface Props {
    applicationId: string;
    applicantName: string;
}

/**
 * Offer for one application: create/edit, submit for approval (manager chain), open the
 * generated offer letter, and record the candidate's response. Framed as a kit SettingsSection,
 * so it reads the same inside the candidate modal and in its own dialog.
 */
const OfferPanel = ({ applicationId, applicantName }: Props) => {
    const qc = useQueryClient();
    const { data, isLoading, isError } = useQuery({ queryKey: queryKeys.recruitment.offer(applicationId), queryFn: () => getApplicationOffer(applicationId) });
    const offer = data?.offer ?? null;
    const { byId: branchById } = useRecruitmentBranches();
    const { data: designations = [] } = useQuery({ queryKey: ["designations", "options"], queryFn: async () => (await fetchDesignations())?.data?.designations ?? [], staleTime: 5 * 60_000 });
    const { data: departments = [] } = useQuery({ queryKey: ["departments", "options"], queryFn: async () => (await fetchDepartments())?.data?.departments ?? [], staleTime: 5 * 60_000 });
    const [form, setForm] = useState<OfferPayload>({ applicationId });

    useEffect(() => {
        setForm({
            applicationId,
            // A new offer starts at its requisition's branch — the same default the server applies.
            offeredBranchId: offer?.offeredBranchId ?? data?.requisitionBranchId ?? null,
            offeredCtc: offer?.offeredCtc != null ? Number(offer.offeredCtc) : null,
            proposedJoiningDate: offer?.proposedJoiningDate ?? null,
            offeredDesignationId: offer?.offeredDesignationId ?? null,
            offeredDepartmentId: offer?.offeredDepartmentId ?? null,
            notes: offer?.notes ?? null,
            expectedRevisionCount: offer?.revisionCount,
        });
    }, [offer, applicationId, data?.requisitionBranchId]);

    const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.offer(applicationId) });

    const saveMut = useMutation({
        mutationFn: () => (offer ? updateOffer(offer.id, form) : createOffer(form)),
        onSuccess: () => { toast({ icon: "success", title: offer ? "Offer saved" : "Offer created" }); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not save the offer") }),
    });
    const submitMut = useMutation({
        mutationFn: () => submitOfferApproval((offer as Offer).id),
        onSuccess: () => { toast({ icon: "success", title: "Offer submitted for approval" }); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not submit the offer for approval") }),
    });
    const respondMut = useMutation({
        mutationFn: (status: "ACCEPTED" | "DECLINED") => respondToOffer((offer as Offer).id, status),
        onSuccess: () => { toast({ icon: "success", title: "Response recorded" }); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not record the response") }),
    });

    const respond = async (status: "ACCEPTED" | "DECLINED") => {
        const ok = await confirmDialog({
            icon: status === "ACCEPTED" ? "success" : "warning",
            title: status === "ACCEPTED" ? "Mark the offer accepted?" : "Mark the offer declined?",
            text: `Records ${applicantName}'s answer on their behalf.`,
        });
        if (ok) respondMut.mutate(status);
    };

    const meta = offer ? stageOf(offer) : null;
    const acceptance = offer && offer.status === 1 ? ACCEPTANCE[offer.acceptanceStatus] ?? null : null;
    // Frozen while signed off or out for sign-off — the server refuses those edits too.
    const locked = !!offer && (offer.status === 1 || !!offer.approvalPending);
    // The same rule the field shows, so the button cannot send what the API will refuse.
    const ctcError = annualAmountError("Offered CTC", form.offeredCtc);
    const saved = termsOf(offer);
    const dirty = !!offer && (Object.keys(saved) as (keyof typeof saved)[]).some((k) =>
        k === "proposedJoiningDate" ? (toDateInput(form.proposedJoiningDate) || null) !== saved.proposedJoiningDate : (form[k] ?? null) !== saved[k]);
    // A draft may be saved with its terms still incomplete; only the branch is needed, as the server requires.
    const canSave = !ctcError && !!form.offeredBranchId && (!offer || dirty);
    // The currency the amount is typed in follows the branch chosen; before one is, the API's answer.
    const currency = (form.offeredBranchId && branchById.get(form.offeredBranchId)?.currency) || offer?.currency || data?.currency;

    const description = !offer
        ? "No offer yet. Fill in the terms and create one."
        : offer.status === 1
            ? "Approved. The offer letter was generated and emailed to the candidate."
            : offer.status === 2
                ? "Rejected in approval. Adjust the terms and submit again."
                : offer.approvalPending
                    ? "With the approver. The terms are locked until they decide."
                    : "Draft. Submit it for approval to generate and email the offer letter.";

    return (
        <SettingsSection
            tone={TRIO.rose}
            icon="wallet"
            title={offer?.prefix ? `Offer · ${offer.prefix}` : "Offer"}
            description={description}
            action={meta ? (
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap justifyContent="flex-end">
                    <ToneChip tone={meta.tone} label={meta.label} dense />
                    {acceptance && <ToneChip tone={acceptance.tone} label={acceptance.label} dense />}
                </Stack>
            ) : undefined}
        >
            {isLoading ? (
                <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={22} /></Stack>
            ) : isError ? (
                <Typography sx={{ fontSize: 13, color: "error.main" }}>Could not load the offer.</Typography>
            ) : (
                <Stack spacing={2}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <RecruitmentBranchField
                            required disabled={locked} sx={{ flex: 1 }}
                            value={form.offeredBranchId}
                            onChange={(v) => setForm({ ...form, offeredBranchId: v })}
                        />
                        <WtMoneyField
                            label="Offered CTC" per="year" currency={currency} required disabled={locked} sx={{ flex: 1 }}
                            value={form.offeredCtc}
                            onChange={(v) => setForm({ ...form, offeredCtc: v })}
                            validate={(v) => annualAmountError("Offered CTC", v)}
                        />
                        <WtDateField
                            label="Proposed joining date" required disabled={locked} sx={{ flex: 1 }}
                            value={toDateInput(form.proposedJoiningDate)}
                            onChange={(v) => setForm({ ...form, proposedJoiningDate: v || null })}
                        />
                    </Stack>
                    {/* Department first: you pick the team, then the role within it.

                        The designation list is NOT narrowed by the chosen department, and that is
                        not an oversight. `Designations` carries no departmentId — only a
                        self-hierarchy via parentId — so there is nothing to filter on, and the
                        live data says the two genuinely cross. Linking them is a schema change. */}
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <WtField
                            label="Department" sx={{ flex: 1 }} clearable disabled={locked}
                            value={form.offeredDepartmentId ?? ""}
                            onChange={(v) => setForm({ ...form, offeredDepartmentId: v || null })}
                            options={departments.map((d: { id: string; name: string }) => ({ value: d.id, label: d.name }))}
                            searchable={departments.length >= SEARCHABLE_FROM}
                            placeholder="Choose a department"
                        />
                        <WtField
                            label="Designation" sx={{ flex: 1 }} clearable disabled={locked}
                            value={form.offeredDesignationId ?? ""}
                            onChange={(v) => setForm({ ...form, offeredDesignationId: v || null })}
                            options={designations.map((d: { id: string; role: string }) => ({ value: d.id, label: d.role }))}
                            searchable={designations.length >= SEARCHABLE_FROM}
                            placeholder="Choose a designation"
                        />
                    </Stack>
                    <WtField
                        label="Notes" fullWidth multiline minRows={2} disabled={locked}
                        value={form.notes ?? ""}
                        onChange={(v) => setForm({ ...form, notes: v || null })}
                        placeholder="Anything the approvers should know about these terms"
                    />

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {!locked && (
                            <WtButton tone="primary" size="small" disabled={!canSave || saveMut.isPending} onClick={() => saveMut.mutate()}>
                                {saveMut.isPending ? "Saving…" : offer ? "Save offer" : "Create offer"}
                            </WtButton>
                        )}
                        {/* Submit what is SAVED: an unsaved edit would otherwise go to the approver as the old terms. */}
                        {offer && !locked && (
                            <WtButton size="small" tone="accent" disabled={submitMut.isPending || dirty || !termsComplete(offer)} onClick={() => submitMut.mutate()} startIcon={<KTIcon iconName="send" className="fs-6" />}>
                                {submitMut.isPending ? "Submitting…" : "Submit for approval"}
                            </WtButton>
                        )}
                        {offer?.offerLetterUrl && (
                            <WtButton size="small" ghost onClick={() => window.open(offer.offerLetterUrl as string, "_blank", "noopener,noreferrer")} startIcon={<KTIcon iconName="cloud-download" className="fs-6" />}>
                                Offer letter
                            </WtButton>
                        )}
                        {offer && offer.status === 1 && offer.acceptanceStatus === "PENDING" && (
                            <>
                                <WtButton size="small" tone="success" disabled={respondMut.isPending} onClick={() => respond("ACCEPTED")}>Mark accepted</WtButton>
                                {/* Solid, not ghost: a ghost WtButton ignores its tone and rendered this grey. */}
                                <WtButton size="small" tone="danger" disabled={respondMut.isPending} onClick={() => respond("DECLINED")}>Mark declined</WtButton>
                            </>
                        )}
                    </Stack>
                    {offer && !locked && dirty && (
                        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Save your changes before submitting them for approval.</Typography>
                    )}
                    {offer && !locked && !dirty && !termsComplete(offer) && (
                        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Add a branch, the offered CTC and a joining date before submitting.</Typography>
                    )}
                </Stack>
            )}
        </SettingsSection>
    );
};

export default OfferPanel;
