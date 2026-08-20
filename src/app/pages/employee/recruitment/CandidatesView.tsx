import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Box, Stack, Typography, TextField, MenuItem, CircularProgress, DialogContent, DialogActions, InputAdornment,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    AutoGrid, ListHeader, GlassCard, GlassDialog, GlassHeader, WtButton, WtIconButton, ToneChip,
    WtSwitchField, toast, confirmDialog,
} from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import { formatDate } from "@utils/dateFormats";
import {
    getApplicants, createApplicant, updateApplicant, getApplicantSources,
    type Applicant, type ApplicantPayload, type ApplicantSource,
} from "@services/recruitment";

/** Blank create form. Only firstName + email are required by the API. */
const emptyForm = (): ApplicantPayload => ({
    firstName: "", lastName: "", email: "", phone: "",
    currentEmployer: "", currentTitle: "", totalExperienceMonths: null,
    expectedCtcInLpa: null, noticePeriodDays: null, sourceId: null,
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

/** Months → "3y 4m" / "7m". Raw month counts are unreadable on a card. */
const experienceLabel = (months?: number | null): string | null => {
    if (months == null || months <= 0) return null;
    const y = Math.floor(months / 12);
    const m = months % 12;
    return y ? `${y}y${m ? ` ${m}m` : ""} exp` : `${m}m exp`;
};

const fullName = (a: Applicant) => [a.firstName, a.lastName].filter(Boolean).join(" ").trim() || a.email;

/**
 * Candidates — the applicant directory (Recruitment › Candidates).
 *
 * Full CRUD over `/api/recruitment/applicants`, which is audited server-side (every create /
 * edit / blacklist lands in the Change Intelligence trail). Candidates are never hard-deleted:
 * data-retention and the audit trail both require the row to survive, so the destructive action
 * is "blacklist" (an update), not a delete.
 */
const CandidatesView = () => {
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Applicant | null>(null);
    const [form, setForm] = useState<ApplicantPayload>(emptyForm());
    const [blacklisted, setBlacklisted] = useState(false);

    // The server does the searching, so the key includes the term — each term caches separately.
    const { data: applicants = [], isLoading } = useQuery({
        queryKey: queryKeys.recruitment.applicants(search),
        queryFn: () => getApplicants(search || undefined),
    });
    const { data: sources = [] } = useQuery({
        queryKey: queryKeys.recruitment.applicantSources(),
        queryFn: getApplicantSources,
    });

    // Invalidate the whole applicants branch: a rename changes which search terms match.
    const invalidate = () => qc.invalidateQueries({ queryKey: [...queryKeys.recruitment.all, "applicants"] });

    const createMut = useMutation({
        mutationFn: () => createApplicant(form),
        onSuccess: () => { toast({ icon: "success", title: "Candidate added" }); close(); invalidate(); },
        onError: () => toast({ icon: "error", title: "Could not add candidate (a candidate with this email may already exist)" }),
    });
    const updateMut = useMutation({
        mutationFn: () => updateApplicant(editing!.id, { ...form, isBlacklisted: blacklisted }),
        onSuccess: () => { toast({ icon: "success", title: "Candidate updated" }); close(); invalidate(); },
        onError: () => toast({ icon: "error", title: "Could not update candidate" }),
    });
    const blacklistMut = useMutation({
        mutationFn: (vars: { id: string; isBlacklisted: boolean }) => updateApplicant(vars.id, { isBlacklisted: vars.isBlacklisted }),
        onSuccess: (_d, vars) => { toast({ icon: "success", title: vars.isBlacklisted ? "Candidate blacklisted" : "Candidate restored" }); invalidate(); },
        onError: () => toast({ icon: "error", title: "Could not update candidate" }),
    });

    const openNew = () => { setEditing(null); setForm(emptyForm()); setBlacklisted(false); setOpen(true); };
    const openEdit = (a: Applicant) => {
        setEditing(a);
        setForm({
            firstName: a.firstName ?? "", lastName: a.lastName ?? "", email: a.email ?? "", phone: a.phone ?? "",
            currentEmployer: a.currentEmployer ?? "", currentTitle: a.currentTitle ?? "",
            totalExperienceMonths: a.totalExperienceMonths ?? null,
            expectedCtcInLpa: a.expectedCtcInLpa == null ? null : Number(a.expectedCtcInLpa),
            noticePeriodDays: a.noticePeriodDays ?? null,
            sourceId: a.sourceId ?? null,
        });
        setBlacklisted(a.isBlacklisted);
        setOpen(true);
    };
    const close = () => { setOpen(false); setEditing(null); };

    const toggleBlacklist = async (a: Applicant) => {
        if (a.isBlacklisted) { blacklistMut.mutate({ id: a.id, isBlacklisted: false }); return; }
        const ok = await confirmDialog({
            icon: "warning",
            title: `Blacklist ${fullName(a)}?`,
            text: "They stay on record (and in the audit trail) but are flagged for future applications.",
        });
        if (ok) blacklistMut.mutate({ id: a.id, isBlacklisted: true });
    };

    const saving = createMut.isPending || updateMut.isPending;
    const canSave = Boolean(form.firstName.trim() && form.email.trim()) && !saving;

    const set = <K extends keyof ApplicantPayload>(key: K, value: ApplicantPayload[K]) =>
        setForm((f) => ({ ...f, [key]: value }));
    /** Numeric fields: "" must become null, not 0 — 0 years' experience is a real value. */
    const setNum = (key: "totalExperienceMonths" | "expectedCtcInLpa" | "noticePeriodDays", raw: string) =>
        set(key, raw === "" ? null : Number(raw));

    const sourceName = useMemo(
        () => (id?: string | null) => sources.find((s: ApplicantSource) => s.id === id)?.name ?? null,
        [sources],
    );

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1600, mx: "auto" }}>
            <ListHeader
                title="Candidates"
                subtitle="Every applicant on record — searchable across name, email and employer."
                actions={
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
                        <TextField
                            size="small"
                            placeholder="Search candidates…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            sx={{ minWidth: { xs: "100%", sm: 260 } }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <KTIcon iconName="magnifier" className="fs-5" />
                                    </InputAdornment>
                                ),
                                endAdornment: search ? (
                                    <InputAdornment position="end">
                                        <WtIconButton title="Clear" onClick={() => setSearch("")} sx={{ width: 26, height: 26, borderRadius: "8px" }}>
                                            <KTIcon iconName="cross" className="fs-7" />
                                        </WtIconButton>
                                    </InputAdornment>
                                ) : undefined,
                            }}
                        />
                        <WtButton tone="primary" size="small" startIcon={<KTIcon iconName="plus" className="fs-6" />} onClick={openNew}>
                            New candidate
                        </WtButton>
                    </Stack>
                }
            />

            {isLoading ? (
                <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>
            ) : applicants.length === 0 ? (
                <Box sx={{ py: 5, px: 2, borderRadius: "14px", textAlign: "center", border: "1px dashed", borderColor: "divider" }}>
                    <Typography sx={{ color: "text.secondary", fontSize: 14, fontWeight: 600 }}>
                        {search ? `No candidates match “${search}”` : "No candidates yet"}
                    </Typography>
                    <Typography sx={{ color: "text.disabled", fontSize: 12.5, mt: 0.25 }}>
                        {search ? "Try a different name, email or employer." : "Add one manually, or they'll appear as applications arrive."}
                    </Typography>
                </Box>
            ) : (
                <AutoGrid min={320}>
                    {applicants.map((a: Applicant) => {
                        const exp = experienceLabel(a.totalExperienceMonths);
                        const src = sourceName(a.sourceId);
                        return (
                            <GlassCard key={a.id} preset="row" interactive sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", p: 1.75 }}>
                                <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ minWidth: 0 }}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3, wordBreak: "break-word" }}>
                                            {fullName(a)}
                                        </Typography>
                                        <Typography sx={{ fontSize: 12, color: "text.secondary", wordBreak: "break-all", mt: 0.15 }}>
                                            {a.email}
                                        </Typography>
                                    </Box>
                                    {a.isBlacklisted && <ToneChip tone="danger" label="Blacklisted" dense />}
                                </Stack>

                                {(a.currentTitle || a.currentEmployer) && (
                                    <Typography sx={{ fontSize: 12.5, color: "text.secondary", lineHeight: 1.45 }}>
                                        {[a.currentTitle, a.currentEmployer].filter(Boolean).join(" · ")}
                                    </Typography>
                                )}

                                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.25 }}>
                                    {exp && <MetaPill text={exp} />}
                                    {a.expectedCtcInLpa != null && <MetaPill text={`${a.expectedCtcInLpa} LPA expected`} />}
                                    {a.noticePeriodDays != null && <MetaPill text={`${a.noticePeriodDays}d notice`} />}
                                    {src && <MetaPill text={src} />}
                                </Stack>

                                {/* Spacer keeps the action row pinned to the bottom so tiles align in the grid. */}
                                <Box sx={{ flex: 1 }} />

                                <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                                    <Typography sx={{ fontSize: 11.5, color: "text.disabled", fontWeight: 600 }}>
                                        Added {formatDate(a.createdAt)}
                                    </Typography>
                                    <Box sx={{ flex: 1 }} />
                                    {a.resumeS3Url && (
                                        <WtIconButton
                                            title={a.resumeFileName ? `Resume — ${a.resumeFileName}` : "Resume"}
                                            onClick={() => window.open(a.resumeS3Url as string, "_blank", "noopener")}
                                            sx={{ width: 34, height: 34, borderRadius: "10px" }}
                                        >
                                            <KTIcon iconName="document" className="fs-5" />
                                        </WtIconButton>
                                    )}
                                    <WtIconButton title="Edit" onClick={() => openEdit(a)} sx={{ width: 34, height: 34, borderRadius: "10px" }}>
                                        <KTIcon iconName="pencil" className="fs-5" />
                                    </WtIconButton>
                                    <WtIconButton
                                        title={a.isBlacklisted ? "Remove from blacklist" : "Blacklist"}
                                        color={a.isBlacklisted ? "#16a34a" : "#C0392B"}
                                        onClick={() => toggleBlacklist(a)}
                                        sx={{ width: 34, height: 34, borderRadius: "10px" }}
                                    >
                                        <KTIcon iconName={a.isBlacklisted ? "check" : "shield-cross"} className="fs-5" />
                                    </WtIconButton>
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
                        title={editing ? `Edit ${fullName(editing)}` : "New candidate"}
                        icon={<KTIcon iconName="user-tick" className="fs-2" />}
                        onClose={close}
                    />
                }
            >
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField label="First name" required size="small" sx={{ flex: 1 }} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
                            <TextField label="Last name" size="small" sx={{ flex: 1 }} value={form.lastName ?? ""} onChange={(e) => set("lastName", e.target.value)} />
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                label="Email" required type="email" size="small" sx={{ flex: 1 }}
                                value={form.email} onChange={(e) => set("email", e.target.value)}
                                helperText={editing ? undefined : "Used to de-duplicate — re-applying updates the same candidate."}
                            />
                            <TextField label="Phone" size="small" sx={{ flex: 1 }} value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField label="Current title" size="small" sx={{ flex: 1 }} value={form.currentTitle ?? ""} onChange={(e) => set("currentTitle", e.target.value)} />
                            <TextField label="Current employer" size="small" sx={{ flex: 1 }} value={form.currentEmployer ?? ""} onChange={(e) => set("currentEmployer", e.target.value)} />
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                label="Experience (months)" type="number" size="small" sx={{ flex: 1 }}
                                inputProps={{ min: 0 }}
                                value={form.totalExperienceMonths ?? ""} onChange={(e) => setNum("totalExperienceMonths", e.target.value)}
                            />
                            <TextField
                                label="Expected CTC (LPA)" type="number" size="small" sx={{ flex: 1 }}
                                inputProps={{ min: 0, step: 0.5 }}
                                value={form.expectedCtcInLpa ?? ""} onChange={(e) => setNum("expectedCtcInLpa", e.target.value)}
                            />
                            <TextField
                                label="Notice (days)" type="number" size="small" sx={{ flex: 1 }}
                                inputProps={{ min: 0 }}
                                value={form.noticePeriodDays ?? ""} onChange={(e) => setNum("noticePeriodDays", e.target.value)}
                            />
                        </Stack>
                        <TextField
                            select label="Source" size="small" fullWidth
                            value={form.sourceId ?? ""} onChange={(e) => set("sourceId", e.target.value || null)}
                        >
                            <MenuItem value="">— None —</MenuItem>
                            {sources.map((s: ApplicantSource) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                        </TextField>
                        {editing && (
                            <WtSwitchField
                                title="Blacklisted"
                                description="Keeps the record (and its audit trail) but flags them on future applications."
                                checked={blacklisted}
                                onChange={(e) => setBlacklisted(e.target.checked)}
                            />
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <WtButton ghost onClick={close}>Cancel</WtButton>
                    <WtButton tone="primary" disabled={!canSave} onClick={() => (editing ? updateMut.mutate() : createMut.mutate())}>
                        {saving ? "Saving…" : "Save"}
                    </WtButton>
                </DialogActions>
            </GlassDialog>
        </Box>
    );
};

export default CandidatesView;
