import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Stack, Typography, CircularProgress, DialogContent, DialogActions, FormControlLabel } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    AutoGrid, ListHeader, GlassCard, GlassDialog, GlassHeader, WtButton, WtField, WtDateField, ToneChip,
    WtSwitch, WtSwitchField, ActionIconButton, toast, confirmDialog, WtEmptyState,
} from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import { apiErrorMessage } from "@utils/apiError";
import { COPY, TERMS } from "./terms";
import {
    getPostings, createPosting, updatePosting, deletePosting, getRequisitions,
    type JobPosting, type PostingPayload, type JobRequisition, type OrgScoped,
} from "@services/recruitment";

/**
 * Job adverts — the public face of an approved role.
 *
 * The link a recruiter copies comes from the SERVER (`posting.publicUrl`). It used to be a
 * literal `https://www.wisetech-mep.com/careers` in this file, which meant every tenant on the
 * platform handed candidates one company's domain. When no careers site is configured the
 * action is disabled and says so — a missing button gets asked about; a wrong link does not.
 */

const emptyForm = (): PostingPayload => ({
    requisitionId: "", title: "", location: "", isRemote: false, employmentType: "Full-time",
    descriptionHtml: "", isPublished: false, showSalary: false, expiresAt: null,
});

/** Past this many options a plain menu becomes a scroll hunt. */
const SEARCHABLE_FROM = 8;

/** Compact, muted meta chip — packs identity/metrics into the card without stretched gaps. */
const MetaPill = ({ text }: { text: string }) => (
    <Box sx={{
        px: 0.9, py: 0.3, borderRadius: "8px", bgcolor: "action.hover",
        fontSize: 11.5, fontWeight: 600, color: "text.secondary", whiteSpace: "nowrap", lineHeight: 1.5,
    }}>
        {text}
    </Box>
);

const PostingsView = ({ companyId }: OrgScoped) => {
    const qc = useQueryClient();
    /** null + open ⇒ creating; a posting ⇒ editing it. One dialog, so the two cannot drift apart. */
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<JobPosting | null>(null);
    const [form, setForm] = useState<PostingPayload>(emptyForm());
    const [attempted, setAttempted] = useState(false);

    const { data: postings = [], isLoading, isError, error, refetch } = useQuery({
        queryKey: queryKeys.recruitment.postings(companyId),
        queryFn: () => getPostings(companyId),
    });
    const { data: requisitions = [], isLoading: rolesLoading } = useQuery({
        queryKey: queryKeys.recruitment.requisitions(companyId),
        queryFn: () => getRequisitions(companyId),
    });
    // Approved AND still open: an archived role is not hiring, and the server takes its adverts
    // down — offering it here would only produce a posting nobody can see.
    const approved = useMemo(
        () => requisitions.filter((r: JobRequisition) => r.status === 1 && r.isActive !== false),
        [requisitions],
    );

    const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.postings(companyId) });

    const openCreate = () => { setEditing(null); setForm(emptyForm()); setAttempted(false); setOpen(true); };
    const openEdit = (p: JobPosting) => {
        setEditing(p);
        setForm({
            requisitionId: p.requisitionId, title: p.title ?? "", location: p.location ?? "",
            isRemote: !!p.isRemote, employmentType: p.employmentType ?? "", descriptionHtml: p.descriptionHtml ?? "",
            isPublished: !!p.isPublished, showSalary: !!p.showSalary,
            expiresAt: p.expiresAt ? p.expiresAt.slice(0, 10) : null,
        });
        setAttempted(false);
        setOpen(true);
    };

    const saveMut = useMutation({
        mutationFn: () => {
            // The server ignores requisitionId on update by design — an advert's role is fixed
            // once its public slug is minted — so it is not sent, and the field is locked below.
            if (editing) {
                const { requisitionId: _role, ...rest } = form;
                return updatePosting(editing.id, rest);
            }
            return createPosting(form);
        },
        onSuccess: () => {
            toast({ icon: "success", title: editing ? `"${form.title || editing.title}" updated` : "Advert created" });
            setOpen(false);
            invalidate();
        },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, editing ? "Could not update the advert" : "Could not create the advert") }),
    });

    const publishMut = useMutation({
        mutationFn: (vars: { id: string; isPublished: boolean }) => updatePosting(vars.id, { isPublished: vars.isPublished }),
        onSuccess: (_d, vars) => { toast({ icon: "success", title: vars.isPublished ? "Advert is live on the careers page" : "Advert taken down" }); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not update the advert") }),
    });
    const deleteMut = useMutation({
        mutationFn: (id: string) => deletePosting(id),
        onSuccess: () => { toast({ icon: "success", title: "Advert removed" }); invalidate(); },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "Could not remove the advert") }),
    });

    /** One row at a time: the switch and the bin stay disabled until that row's write lands. */
    const busy = (id: string) =>
        (publishMut.isPending && publishMut.variables?.id === id) || (deleteMut.isPending && deleteMut.variables === id);

    const copyLink = async (p: JobPosting) => {
        if (!p.publicUrl) return;
        try { await navigator.clipboard.writeText(p.publicUrl); toast({ icon: "success", title: "Public link copied" }); }
        catch { toast({ icon: "info", title: p.publicUrl }); }
    };
    const remove = async (p: JobPosting) => {
        if (await confirmDialog({ icon: "warning", title: "Remove advert?", text: `"${p.title}" will be taken off the careers page and removed.` })) deleteMut.mutate(p.id);
    };

    const roleValid = !!editing || !!form.requisitionId;
    const save = () => {
        setAttempted(true);
        if (roleValid && !saveMut.isPending) saveMut.mutate();
    };

    // Keep the form off-screen state clean: a cancelled draft never reappears behind the next open.
    useEffect(() => { if (!open) setAttempted(false); }, [open]);

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1600, mx: "auto" }}>
            <ListHeader
                title={TERMS.Postings}
                subtitle="Public adverts for approved roles — shown on the careers page."
                actions={
                    <WtButton tone="primary" size="small" startIcon={<KTIcon iconName="plus" className="fs-6" />} onClick={openCreate}>
                        New {TERMS.Posting}
                    </WtButton>
                }
            />

            {isLoading ? (
                <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>
            ) : isError ? (
                <WtEmptyState
                    variant="error"
                    title="Could not load the adverts"
                    hint={apiErrorMessage(error, "Check your connection and try again.")}
                    actionLabel="Retry"
                    onAction={() => refetch()}
                />
            ) : postings.length === 0 ? (
                <WtEmptyState
                    icon="share"
                    title={COPY.noPostings.title}
                    hint={COPY.noPostings.hint}
                    actionLabel={approved.length ? COPY.noPostings.action : undefined}
                    onAction={approved.length ? openCreate : undefined}
                />
            ) : (
                <AutoGrid min={320}>
                    {postings.map((p) => (
                        <GlassCard
                            key={p.id}
                            preset="row"
                            interactive
                            // The card lifts on hover, so it has to do something when clicked.
                            onClick={() => openEdit(p)}
                            sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", p: 1.75, cursor: "pointer" }}
                        >
                            <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ minWidth: 0 }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3, wordBreak: "break-word" }}>{p.title}</Typography>
                                    {p.requisition?.prefix && (
                                        <Typography sx={{ fontSize: 11.5, color: "text.disabled", fontWeight: 700, letterSpacing: "0.02em", mt: 0.15 }}>{p.requisition.prefix}</Typography>
                                    )}
                                </Box>
                                <ToneChip tone={p.isPublished ? "success" : "warning"} label={p.isPublished ? "Published" : "Draft"} dense />
                            </Stack>

                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.25 }}>
                                {p.location && <MetaPill text={p.location} />}
                                {p.isRemote && <MetaPill text="Remote" />}
                                {/* Visible on the card so nobody has to open an advert to find out
                                    whether it is advertising a pay band. */}
                                {p.showSalary && <MetaPill text="Salary shown" />}
                                {p.employmentType && <MetaPill text={p.employmentType} />}
                            </Stack>

                            {/* Spacer keeps the action row pinned to the bottom so tiles align in the grid. */}
                            <Box sx={{ flex: 1 }} />

                            {/* stopPropagation: these controls act on the row, they do not open it. */}
                            <Stack
                                direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" useFlexGap
                                onClick={(e) => e.stopPropagation()}
                                sx={{ pt: 1, borderTop: "1px solid", borderColor: "divider", cursor: "default" }}
                            >
                                <FormControlLabel
                                    sx={{ mr: 0, ml: 0, gap: 0.75 }}
                                    control={
                                        <WtSwitch
                                            size="sm"
                                            checked={p.isPublished}
                                            disabled={busy(p.id)}
                                            onChange={(e) => publishMut.mutate({ id: p.id, isPublished: e.target.checked })}
                                        />
                                    }
                                    label={<Typography sx={{ fontSize: 12, fontWeight: 600 }}>Publish</Typography>}
                                />
                                <Box sx={{ flex: 1 }} />
                                <ActionIconButton iconName="pencil" title="Edit Advert" size="sm" onClick={() => openEdit(p)} />
                                <ActionIconButton
                                    iconName="copy"
                                    title={p.publicUrl ? "Copy public link" : "No careers site is configured for this deployment yet"}
                                    size="sm"
                                    disabled={!p.publicUrl}
                                    onClick={() => copyLink(p)}
                                />
                                <ActionIconButton iconName="trash" title="Remove" tone="danger" size="sm" disabled={busy(p.id)} onClick={() => remove(p)} />
                            </Stack>
                        </GlassCard>
                    ))}
                </AutoGrid>
            )}

            <GlassDialog
                open={open}
                onClose={saveMut.isPending ? undefined : () => setOpen(false)}
                maxWidth="sm"
                header={
                    <GlassHeader
                        title={editing ? "Edit Job Advert" : "New Job Advert"}
                        subtitle={editing ? (editing.isPublished ? "Live on the careers page — changes show immediately" : "Draft — not visible to candidates yet") : "From an approved role"}
                        icon={<KTIcon iconName="questionnaire-tablet" className="fs-2" />}
                        onClose={saveMut.isPending ? undefined : () => setOpen(false)}
                    />
                }
            >
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <WtField
                            label="Role" required fullWidth
                            value={form.requisitionId ?? ""}
                            onChange={(v) => setForm({ ...form, requisitionId: v })}
                            options={approved.map((r) => ({ value: r.id, label: r.prefix ? `${r.prefix} · ${r.title}` : r.title }))}
                            searchable={approved.length >= SEARCHABLE_FROM}
                            placeholder={rolesLoading ? "Loading roles…" : approved.length ? "Choose an approved role" : "No approved roles yet"}
                            disabled={!!editing || rolesLoading || saveMut.isPending}
                            error={attempted && !roleValid ? "Choose the approved role this advert is for" : undefined}
                            hint={editing
                                ? "The role an advert points at cannot be changed — its public link was minted for this one. Remove the advert and post the role again."
                                : "Only approved, open roles can be advertised."}
                        />
                        <WtField
                            label="Public Title" fullWidth
                            value={form.title ?? ""} onChange={(v) => setForm({ ...form, title: v })}
                            disabled={saveMut.isPending}
                            hint="Defaults to the role's own title if left blank."
                        />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <WtField label="Location" sx={{ flex: 1 }} value={form.location ?? ""} onChange={(v) => setForm({ ...form, location: v })} disabled={saveMut.isPending} />
                            <WtField label="Employment Type" sx={{ flex: 1 }} value={form.employmentType ?? ""} onChange={(v) => setForm({ ...form, employmentType: v })} disabled={saveMut.isPending} />
                        </Stack>
                        <WtDateField
                            label="Closes On"
                            value={form.expiresAt ?? ""}
                            onChange={(v) => setForm({ ...form, expiresAt: v || null })}
                            helperText="After this date the advert comes off the careers page on its own. Leave blank to keep it up until you take it down."
                        />
                        <WtField
                            label="Public Description" fullWidth multiline minRows={4}
                            value={form.descriptionHtml ?? ""} onChange={(v) => setForm({ ...form, descriptionHtml: v })}
                            disabled={saveMut.isPending}
                            hint="What a candidate reads. The internal job description is not published."
                        />
                        <WtSwitchField title="Remote" checked={!!form.isRemote} onChange={(e) => setForm({ ...form, isRemote: e.target.checked })} />
                        {/* Deliberately worded as a warning rather than a feature: turning this on
                            publishes an internal pay band to the open internet, where it is read by
                            candidates negotiating against it and by staff looking up their own. */}
                        <WtSwitchField
                            title="Show Salary Range Publicly"
                            description="Puts this role's CTC band on the careers page and in its Google listing. Off by default — it is internal pay data, and once published it cannot be unseen."
                            checked={!!form.showSalary}
                            onChange={(e) => setForm({ ...form, showSalary: e.target.checked })}
                        />
                        <WtSwitchField
                            title={editing ? "Published" : "Publish immediately"}
                            description="Make it live on the careers page."
                            checked={!!form.isPublished}
                            onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <WtButton ghost onClick={() => setOpen(false)} disabled={saveMut.isPending}>Cancel</WtButton>
                    <WtButton tone="primary" onClick={save} disabled={saveMut.isPending || (attempted && !roleValid)}>
                        {saveMut.isPending ? "Saving…" : editing ? "Save Changes" : "Create Advert"}
                    </WtButton>
                </DialogActions>
            </GlassDialog>
        </Box>
    );
};

export default PostingsView;
