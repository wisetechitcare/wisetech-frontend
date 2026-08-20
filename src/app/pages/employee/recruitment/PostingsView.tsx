import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Box, Stack, Typography, TextField, MenuItem, CircularProgress, DialogContent, DialogActions, FormControlLabel,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    AutoGrid, ListHeader, GlassCard, GlassDialog, GlassHeader, WtButton, WtIconButton, ToneChip, WtSwitch, WtSwitchField,
    toast, confirmDialog,
} from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import {
    getPostings, createPosting, updatePosting, deletePosting, getRequisitions,
    type JobPosting, type PostingPayload, type JobRequisition,
} from "@services/recruitment";

// The candidate-facing careers page lives on the marketing site; recruiters share this URL.
const CAREERS_PUBLIC_BASE = "https://www.wisetech-mep.com/careers";

const emptyForm = (): PostingPayload => ({ requisitionId: "", title: "", location: "", isRemote: false, employmentType: "Full-time", descriptionHtml: "", isPublished: false });

/** Compact, muted meta chip — packs identity/metrics into the card without stretched gaps. */
const MetaPill = ({ text }: { text: string }) => (
    <Box sx={{
        px: 0.9, py: 0.3, borderRadius: "8px", bgcolor: "action.hover",
        fontSize: 11.5, fontWeight: 600, color: "text.secondary", whiteSpace: "nowrap", lineHeight: 1.5,
    }}>
        {text}
    </Box>
);

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
        <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1600, mx: "auto" }}>
            <ListHeader
                title="Job Postings"
                subtitle="Public adverts for approved requisitions — shown on the careers page."
                actions={
                    <WtButton tone="primary" size="small" startIcon={<KTIcon iconName="plus" className="fs-6" />} onClick={() => { setForm(emptyForm()); setOpen(true); }}>
                        New posting
                    </WtButton>
                }
            />

            {isLoading ? (
                <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>
            ) : postings.length === 0 ? (
                <Box sx={{
                    py: 5, px: 2, borderRadius: "14px", textAlign: "center",
                    border: "1px dashed", borderColor: "divider",
                }}>
                    <Typography sx={{ color: "text.secondary", fontSize: 14, fontWeight: 600 }}>No postings yet</Typography>
                    <Typography sx={{ color: "text.disabled", fontSize: 12.5, mt: 0.25 }}>Publish an approved requisition to the careers page.</Typography>
                </Box>
            ) : (
                <AutoGrid min={320}>
                    {postings.map((p) => (
                        <GlassCard key={p.id} preset="row" interactive sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", p: 1.75 }}>
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
                                {p.employmentType && <MetaPill text={p.employmentType} />}
                            </Stack>

                            {/* Spacer keeps the action row pinned to the bottom so tiles align in the grid. */}
                            <Box sx={{ flex: 1 }} />

                            <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                                <FormControlLabel
                                    sx={{ mr: 0, ml: 0, gap: 0.75 }}
                                    control={<WtSwitch size="sm" checked={p.isPublished} onChange={(e) => publishMut.mutate({ id: p.id, isPublished: e.target.checked })} />}
                                    label={<Typography sx={{ fontSize: 12, fontWeight: 600 }}>Publish</Typography>}
                                />
                                <Box sx={{ flex: 1 }} />
                                <WtIconButton title="Copy public link" onClick={() => copyLink(p.publicSlug)} sx={{ width: 34, height: 34, borderRadius: "10px" }}>
                                    <KTIcon iconName="cloud-download" className="fs-5" />
                                </WtIconButton>
                                <WtIconButton title="Remove" color="#C0392B" onClick={() => remove(p)} sx={{ width: 34, height: 34, borderRadius: "10px" }}>
                                    <KTIcon iconName="trash" className="fs-5" />
                                </WtIconButton>
                            </Stack>
                        </GlassCard>
                    ))}
                </AutoGrid>
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
