import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Box, Stack, Typography, TextField, MenuItem, CircularProgress, DialogContent, DialogActions, FormControlLabel, Switch,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassCard, GlassDialog, GlassHeader, WtButton, WtIconButton, ToneChip, WtSwitchField, toast, confirmDialog } from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import {
    getPostings, createPosting, updatePosting, deletePosting, getRequisitions,
    type JobPosting, type PostingPayload, type JobRequisition,
} from "@services/recruitment";

// The candidate-facing careers page lives on the marketing site; recruiters share this URL.
const CAREERS_PUBLIC_BASE = "https://www.wisetech-mep.com/careers";

const emptyForm = (): PostingPayload => ({ requisitionId: "", title: "", location: "", isRemote: false, employmentType: "Full-time", descriptionHtml: "", isPublished: false });

const PostingsView = () => {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<PostingPayload>(emptyForm());

    const { data: postings = [], isLoading } = useQuery({ queryKey: queryKeys.recruitment.postings(), queryFn: getPostings });
    const { data: requisitions = [] } = useQuery({ queryKey: queryKeys.recruitment.requisitions(), queryFn: getRequisitions });
    const approved = useMemo(() => requisitions.filter((r: JobRequisition) => r.status === 1), [requisitions]);

    const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.postings() });

    const createMut = useMutation({
        mutationFn: () => createPosting(form),
        onSuccess: () => { toast({ icon: "success", title: "Posting created" }); setOpen(false); setForm(emptyForm()); invalidate(); },
        onError: () => toast({ icon: "error", title: "Could not create posting (requisition must be approved)" }),
    });
    const publishMut = useMutation({
        mutationFn: (vars: { id: string; isPublished: boolean }) => updatePosting(vars.id, { isPublished: vars.isPublished }),
        onSuccess: () => { toast({ icon: "success", title: "Posting updated" }); invalidate(); },
        onError: () => toast({ icon: "error", title: "Could not update posting" }),
    });
    const deleteMut = useMutation({
        mutationFn: (id: string) => deletePosting(id),
        onSuccess: () => { toast({ icon: "success", title: "Posting removed" }); invalidate(); },
        onError: () => toast({ icon: "error", title: "Could not remove posting" }),
    });

    const publicUrl = (slug: string) => `${CAREERS_PUBLIC_BASE}/${slug}`;
    const copyLink = async (slug: string) => {
        try { await navigator.clipboard.writeText(publicUrl(slug)); toast({ icon: "success", title: "Public link copied" }); }
        catch { toast({ icon: "info", title: publicUrl(slug) }); }
    };
    const remove = async (p: JobPosting) => {
        if (await confirmDialog({ icon: "warning", title: "Remove posting?", text: `"${p.title}" will be unpublished and removed.` })) deleteMut.mutate(p.id);
    };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
                <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 18 }}>Job Postings</Typography>
                    <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>Public adverts for approved requisitions — shown on the careers page.</Typography>
                </Box>
                <WtButton tone="primary" size="small" startIcon={<KTIcon iconName="plus" className="fs-6" />} onClick={() => { setForm(emptyForm()); setOpen(true); }}>
                    New posting
                </WtButton>
            </Stack>

            {isLoading ? (
                <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>
            ) : postings.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>No postings yet. Publish an approved requisition to the careers page.</Box>
            ) : (
                <Stack spacing={1}>
                    {postings.map((p) => (
                        <GlassCard key={p.id} preset="row">
                            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexWrap: "wrap" }}>
                                <Box sx={{ flex: 1, minWidth: 200 }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: 14.5 }}>{p.title}</Typography>
                                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                                        {p.requisition?.prefix ? `${p.requisition.prefix} · ` : ""}{p.location ?? "—"}{p.isRemote ? " · Remote" : ""}
                                    </Typography>
                                </Box>
                                <ToneChip tone={p.isPublished ? "success" : "warning"} label={p.isPublished ? "Published" : "Draft"} dense />
                                <FormControlLabel
                                    control={<Switch size="small" checked={p.isPublished} onChange={(e) => publishMut.mutate({ id: p.id, isPublished: e.target.checked })} />}
                                    label={<Typography sx={{ fontSize: 12 }}>Publish</Typography>}
                                />
                                <WtIconButton title="Copy public link" onClick={() => copyLink(p.publicSlug)}>
                                    <KTIcon iconName="cloud-download" className="fs-5" />
                                </WtIconButton>
                                <WtIconButton title="Remove" color="#C0392B" onClick={() => remove(p)}>
                                    <KTIcon iconName="trash" className="fs-5" />
                                </WtIconButton>
                            </Stack>
                        </GlassCard>
                    ))}
                </Stack>
            )}

            <GlassDialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="sm"
                header={<GlassHeader title="New Job Posting" subtitle="From an approved requisition" icon={<KTIcon iconName="questionnaire-tablet" className="fs-2" />} onClose={() => setOpen(false)} />}
            >
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField label="Requisition (approved)" select required size="small" fullWidth value={form.requisitionId ?? ""} onChange={(e) => setForm({ ...form, requisitionId: e.target.value })}>
                            {approved.length === 0 && <MenuItem value="" disabled>No approved requisitions yet</MenuItem>}
                            {approved.map((r) => <MenuItem key={r.id} value={r.id}>{r.prefix ? `${r.prefix} · ` : ""}{r.title}</MenuItem>)}
                        </TextField>
                        <TextField label="Public title" size="small" fullWidth value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} helperText="Defaults to the requisition title if left blank." />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField label="Location" size="small" sx={{ flex: 1 }} value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                            <TextField label="Employment type" size="small" sx={{ flex: 1 }} value={form.employmentType ?? ""} onChange={(e) => setForm({ ...form, employmentType: e.target.value })} />
                        </Stack>
                        <TextField label="Public description" size="small" fullWidth multiline minRows={4} value={form.descriptionHtml ?? ""} onChange={(e) => setForm({ ...form, descriptionHtml: e.target.value })} />
                        <WtSwitchField title="Remote" checked={!!form.isRemote} onChange={(e) => setForm({ ...form, isRemote: e.target.checked })} />
                        <WtSwitchField title="Publish immediately" description="Make it live on the careers page now." checked={!!form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <WtButton ghost onClick={() => setOpen(false)}>Cancel</WtButton>
                    <WtButton tone="primary" disabled={!form.requisitionId || createMut.isPending} onClick={() => createMut.mutate()}>
                        {createMut.isPending ? "Creating…" : "Create posting"}
                    </WtButton>
                </DialogActions>
            </GlassDialog>
        </Box>
    );
};

export default PostingsView;
