import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Stack, Typography, TextField, MenuItem, CircularProgress } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassCard, WtButton, ToneChip, WtDateField, WtMoneyField, toast, confirmDialog, type SemanticTone } from "@app/modules/common/components/ui";
import { annualAmountError } from "@utils/ctc";
import { queryKeys } from "@/lib/queryKeys";
import { fetchDesignations, fetchDepartments } from "@services/options";
import {
    getApplicationOffer, createOffer, updateOffer, submitOfferApproval, respondToOffer,
    type Offer, type OfferPayload,
} from "@services/recruitment";

const STATUS: Record<number, { label: string; tone: SemanticTone }> = {
    0: { label: "Pending approval", tone: "warning" },
    1: { label: "Approved", tone: "success" },
    2: { label: "Rejected", tone: "danger" },
};
const ACCEPTANCE: Record<string, SemanticTone> = { PENDING: "warning", ACCEPTED: "success", DECLINED: "danger", EXPIRED: "warning" };

const toDateInput = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");

interface Props {
    applicationId: string;
    applicantName: string;
}

/**
 * Offer for one application: create/edit, submit for approval (manager chain),
 * view the generated offer letter, and record the candidate's response. Glass + KTIcon.
 */
const OfferPanel = ({ applicationId, applicantName }: Props) => {
    const qc = useQueryClient();
    const { data, isLoading } = useQuery({ queryKey: queryKeys.recruitment.offer(applicationId), queryFn: () => getApplicationOffer(applicationId) });
    const offer = data?.offer ?? null;
    // The currency the API resolved for this offer — present before the offer exists, so the
    // amount being typed into a NEW offer is shown in the right one too.
    const currency = offer?.currency ?? data?.currency;
    const { data: designations = [] } = useQuery({ queryKey: ["designations", "options"], queryFn: async () => (await fetchDesignations())?.data?.designations ?? [], staleTime: 5 * 60_000 });
    const { data: departments = [] } = useQuery({ queryKey: ["departments", "options"], queryFn: async () => (await fetchDepartments())?.data?.departments ?? [], staleTime: 5 * 60_000 });
    const [form, setForm] = useState<OfferPayload>({ applicationId });

    useEffect(() => {
        setForm({
            applicationId,
            offeredCtc: offer?.offeredCtc != null ? Number(offer.offeredCtc) : null,
            proposedJoiningDate: offer?.proposedJoiningDate ?? null,
            offeredDesignationId: offer?.offeredDesignationId ?? null,
            offeredDepartmentId: offer?.offeredDepartmentId ?? null,
            notes: offer?.notes ?? null,
            expectedRevisionCount: offer?.revisionCount,
        });
    }, [offer, applicationId]);

    const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.offer(applicationId) });

    const saveMut = useMutation({
        mutationFn: () => (offer ? updateOffer(offer.id, form) : createOffer(form)),
        onSuccess: () => { toast({ icon: "success", title: "Offer saved" }); invalidate(); },
        onError: () => toast({ icon: "error", title: "Could not save offer" }),
    });
    const submitMut = useMutation({
        mutationFn: () => submitOfferApproval((offer as Offer).id),
        onSuccess: () => { toast({ icon: "success", title: "Offer submitted for approval" }); invalidate(); },
        onError: () => toast({ icon: "error", title: "Could not submit — ensure you report to a manager" }),
    });
    const respondMut = useMutation({
        mutationFn: (status: "ACCEPTED" | "DECLINED") => respondToOffer((offer as Offer).id, status),
        onSuccess: () => { toast({ icon: "success", title: "Response recorded" }); invalidate(); },
        onError: () => toast({ icon: "error", title: "Could not record response" }),
    });

    const respond = async (status: "ACCEPTED" | "DECLINED") => {
        if (await confirmDialog({ icon: status === "ACCEPTED" ? "success" : "warning", title: `Mark offer ${status.toLowerCase()}?`, text: `For ${applicantName}.` })) respondMut.mutate(status);
    };

    if (isLoading) return <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={22} /></Stack>;

    const meta = offer ? STATUS[offer.status] ?? STATUS[0] : null;
    // The same rule the field shows, so the button cannot send what the API will refuse.
    const ctcError = annualAmountError("Offered CTC", form.offeredCtc);

    return (
        <Box>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5, flexWrap: "wrap" }}>
                <Typography sx={{ fontWeight: 700, fontSize: 16, flex: 1 }}>Offer — {applicantName}</Typography>
                {offer && meta && <ToneChip tone={meta.tone} label={`${offer.prefix ?? "Offer"} · ${meta.label}`} dense />}
                {offer && <ToneChip tone={ACCEPTANCE[offer.acceptanceStatus] ?? "warning"} label={offer.acceptanceStatus} dense />}
            </Stack>

            <GlassCard preset="section">
                <Stack spacing={2}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <WtMoneyField
                            label="Offered CTC" per="year" currency={currency} sx={{ flex: 1 }}
                            value={form.offeredCtc}
                            onChange={(v) => setForm({ ...form, offeredCtc: v })}
                            validate={(v) => annualAmountError("Offered CTC", v)}
                        />
                        <WtDateField
                            label="Proposed joining date" sx={{ flex: 1 }}
                            value={toDateInput(form.proposedJoiningDate)}
                            onChange={(v) => setForm({ ...form, proposedJoiningDate: v || null })}
                        />
                    </Stack>
                    {/* Department first: you pick the team, then the role within it. The reverse
                        order asks which job before saying which part of the company it sits in.

                        The designation list is NOT narrowed by the chosen department, and that is
                        not an oversight. `Designations` carries no departmentId — only a
                        self-hierarchy via parentId — so there is nothing to filter on, and the
                        live data says the two genuinely cross: 5 of the 17 designations actually
                        held by employees appear in more than one department. Narrowing the list
                        today would hide valid choices. Linking them is a schema change. */}
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField label="Department" select size="small" sx={{ flex: 1 }} value={form.offeredDepartmentId ?? ""} onChange={(e) => setForm({ ...form, offeredDepartmentId: e.target.value || null })}>
                            <MenuItem value="">— None —</MenuItem>
                            {departments.map((d: { id: string; name: string }) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                        </TextField>
                        <TextField label="Designation" select size="small" sx={{ flex: 1 }} value={form.offeredDesignationId ?? ""} onChange={(e) => setForm({ ...form, offeredDesignationId: e.target.value || null })}>
                            <MenuItem value="">— None —</MenuItem>
                            {designations.map((d: { id: string; role: string }) => <MenuItem key={d.id} value={d.id}>{d.role}</MenuItem>)}
                        </TextField>
                    </Stack>
                    <TextField label="Notes" size="small" fullWidth multiline minRows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} />

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <WtButton tone="primary" size="small" disabled={saveMut.isPending || !!ctcError} onClick={() => saveMut.mutate()}>
                            {offer ? "Save offer" : "Create offer"}
                        </WtButton>
                        {offer && offer.status === 0 && (
                            <WtButton size="small" tone="accent" disabled={submitMut.isPending} onClick={() => submitMut.mutate()} startIcon={<KTIcon iconName="wallet" className="fs-6" />}>
                                Submit for approval
                            </WtButton>
                        )}
                        {offer?.offerLetterUrl && (
                            <WtButton size="small" ghost onClick={() => window.open(offer.offerLetterUrl as string, "_blank", "noopener")} startIcon={<KTIcon iconName="cloud-download" className="fs-6" />}>
                                Offer letter
                            </WtButton>
                        )}
                        {offer && offer.status === 1 && offer.acceptanceStatus === "PENDING" && (
                            <>
                                <WtButton size="small" tone="success" disabled={respondMut.isPending} onClick={() => respond("ACCEPTED")}>Mark accepted</WtButton>
                                <WtButton size="small" tone="danger" ghost disabled={respondMut.isPending} onClick={() => respond("DECLINED")}>Mark declined</WtButton>
                            </>
                        )}
                    </Stack>
                    {offer && offer.status === 0 && (
                        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>On approval, an offer-letter PDF is generated and emailed to the candidate.</Typography>
                    )}
                </Stack>
            </GlassCard>
        </Box>
    );
};

export default OfferPanel;
