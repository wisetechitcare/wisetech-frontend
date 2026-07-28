import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Box, Stack, Typography, Button, TextField, Chip, IconButton, CircularProgress,
    FormControlLabel, Checkbox, DialogContent, DialogActions,
} from "@mui/material";
import { toast, confirmDialog, GlassDialog, GlassHeader } from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import {
    getApplicationStatuses, createApplicationStatus, updateApplicationStatus, deleteApplicationStatus,
    getRejectionReasons, createRejectionReason, deleteRejectionReason,
    getApplicantSources, createApplicantSource, deleteApplicantSource,
    type ApplicationStatus,
} from "@services/recruitment";

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <Typography sx={{ fontWeight: 700, fontSize: 16, mt: 3, mb: 1.5 }}>{children}</Typography>
);

// ── Application statuses (pipeline stages, outcome flags + auto-email) ─────────
interface EmailForm { autoEmailSubject: string; autoEmailBody: string; autoAdvanceThreshold: string }

const StatusesSection = () => {
    const qc = useQueryClient();
    const [f, setF] = useState<Partial<ApplicationStatus> & { name: string }>({ name: "", color: "#4B5563" });
    const [editing, setEditing] = useState<ApplicationStatus | null>(null);
    const [email, setEmail] = useState<EmailForm>({ autoEmailSubject: "", autoEmailBody: "", autoAdvanceThreshold: "" });
    const { data: rows = [], isLoading } = useQuery({ queryKey: queryKeys.recruitment.applicationStatuses(), queryFn: getApplicationStatuses });
    const inv = () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.applicationStatuses() });
    const add = useMutation({
        mutationFn: () => createApplicationStatus(f),
        onSuccess: () => { toast({ icon: "success", title: "Stage added" }); setF({ name: "", color: "#4B5563" }); inv(); },
        onError: () => toast({ icon: "error", title: "Could not add stage (admin permission required)" }),
    });
    const del = useMutation({
        mutationFn: (id: string) => deleteApplicationStatus(id),
        onSuccess: () => { toast({ icon: "success", title: "Stage removed" }); inv(); },
        onError: () => toast({ icon: "error", title: "Could not remove stage" }),
    });
    const saveEmail = useMutation({
        mutationFn: () => updateApplicationStatus(editing!.id, {
            autoEmailSubject: email.autoEmailSubject || null,
            autoEmailBody: email.autoEmailBody || null,
            autoAdvanceThreshold: email.autoAdvanceThreshold === "" ? null : Number(email.autoAdvanceThreshold),
        }),
        onSuccess: () => { toast({ icon: "success", title: "Automation saved" }); setEditing(null); inv(); },
        onError: () => toast({ icon: "error", title: "Could not save (admin permission required)" }),
    });
    const remove = async (id: string, name: string) => { if (await confirmDialog({ icon: "warning", title: "Remove stage?", text: `"${name}" will be deactivated.` })) del.mutate(id); };
    const openEmail = (s: ApplicationStatus) => {
        setEditing(s);
        setEmail({
            autoEmailSubject: s.autoEmailSubject ?? "",
            autoEmailBody: s.autoEmailBody ?? "",
            autoAdvanceThreshold: s.autoAdvanceThreshold == null ? "" : String(s.autoAdvanceThreshold),
        });
    };

    return (
        <>
            <SectionTitle>Pipeline Stages</SectionTitle>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                <TextField label="Stage" size="small" sx={{ minWidth: 160 }} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
                <TextField label="Color" type="color" size="small" sx={{ width: 80 }} value={f.color ?? "#4B5563"} onChange={(e) => setF({ ...f, color: e.target.value })} />
                <FormControlLabel control={<Checkbox checked={!!f.isDefault} onChange={(e) => setF({ ...f, isDefault: e.target.checked })} />} label="Default" />
                <FormControlLabel control={<Checkbox checked={!!f.isHiredOutcome} onChange={(e) => setF({ ...f, isHiredOutcome: e.target.checked })} />} label="Hired" />
                <FormControlLabel control={<Checkbox checked={!!f.isRejectedOutcome} onChange={(e) => setF({ ...f, isRejectedOutcome: e.target.checked })} />} label="Rejected" />
                <FormControlLabel control={<Checkbox checked={!!f.requiresReason} onChange={(e) => setF({ ...f, requiresReason: e.target.checked })} />} label="Needs reason" />
                <Button variant="contained" disabled={!f.name.trim() || add.isPending} onClick={() => add.mutate()}>Add</Button>
            </Stack>
            {isLoading ? <CircularProgress size={20} /> : (
                <Stack spacing={1}>
                    {rows.map((s) => (
                        <Stack key={s.id} direction="row" alignItems="center" spacing={1.5} sx={{ p: 1, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: s.color ?? "#888" }} />
                            <Typography sx={{ fontWeight: 600, flex: 1 }}>{s.name}</Typography>
                            {s.isDefault && <Chip size="small" label="Default" variant="outlined" />}
                            {s.isHiredOutcome && <Chip size="small" color="success" label="Hired" variant="outlined" />}
                            {s.isRejectedOutcome && <Chip size="small" color="error" label="Rejected" variant="outlined" />}
                            {s.autoEmailBody && <Chip size="small" color="info" label="Auto-email" variant="outlined" />}
                            <IconButton size="small" title="Auto-email on entry" onClick={() => openEmail(s)}><i className="bi bi-envelope-paper" /></IconButton>
                            <IconButton size="small" onClick={() => remove(s.id, s.name)}><i className="bi bi-trash" /></IconButton>
                        </Stack>
                    ))}
                    {rows.length === 0 && <Typography sx={{ color: "text.secondary" }}>No stages yet.</Typography>}
                </Stack>
            )}

            <GlassDialog
                open={!!editing}
                onClose={() => setEditing(null)}
                maxWidth="sm"
                header={<GlassHeader title={`Stage automation — ${editing?.name ?? ""}`} subtitle="Email the candidate when they enter this stage" icon={<i className="bi bi-envelope-paper" />} onClose={() => setEditing(null)} />}
            >
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField label="Email subject" size="small" fullWidth value={email.autoEmailSubject} onChange={(e) => setEmail({ ...email, autoEmailSubject: e.target.value })} />
                        <TextField
                            label="Email body" size="small" fullWidth multiline minRows={5}
                            helperText="Tokens: {first_name} {last_name} {candidate_name} {job_title} {stage_name} {application_ref}. Leave body empty to disable."
                            value={email.autoEmailBody}
                            onChange={(e) => setEmail({ ...email, autoEmailBody: e.target.value })}
                        />
                        <TextField
                            label="Auto-advance threshold (score, optional)" type="number" size="small" sx={{ maxWidth: 280 }}
                            value={email.autoAdvanceThreshold}
                            onChange={(e) => setEmail({ ...email, autoAdvanceThreshold: e.target.value })}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setEditing(null)}>Cancel</Button>
                    <Button variant="contained" disabled={saveEmail.isPending} onClick={() => saveEmail.mutate()}>Save</Button>
                </DialogActions>
            </GlassDialog>
        </>
    );
};

// ── Simple name/color master (reasons & sources) ──────────────────────────────
const SimpleMaster = ({
    title, labelField, queryKey, fetchFn, createFn, deleteFn, extraToggle,
}: {
    title: string;
    labelField: string;
    queryKey: readonly unknown[];
    fetchFn: () => Promise<Array<{ id: string; color?: string | null; isReferral?: boolean } & Record<string, unknown>>>;
    createFn: (payload: Record<string, unknown>) => Promise<unknown>;
    deleteFn: (id: string) => Promise<unknown>;
    extraToggle?: string;
}) => {
    const qc = useQueryClient();
    const [name, setName] = useState("");
    const [color, setColor] = useState("#4B5563");
    const [flag, setFlag] = useState(false);
    const { data: rows = [], isLoading } = useQuery({ queryKey, queryFn: fetchFn });
    const inv = () => qc.invalidateQueries({ queryKey });
    const add = useMutation({
        mutationFn: () => createFn({ [labelField]: name, color, ...(extraToggle ? { [extraToggle]: flag } : {}) }),
        onSuccess: () => { toast({ icon: "success", title: `${title} added` }); setName(""); setFlag(false); inv(); },
        onError: () => toast({ icon: "error", title: "Could not add (admin permission required)" }),
    });
    const del = useMutation({ mutationFn: (id: string) => deleteFn(id), onSuccess: () => { toast({ icon: "success", title: "Removed" }); inv(); }, onError: () => toast({ icon: "error", title: "Could not remove" }) });

    return (
        <>
            <SectionTitle>{title}</SectionTitle>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                <TextField label={title.replace(/s$/, "")} size="small" sx={{ minWidth: 180 }} value={name} onChange={(e) => setName(e.target.value)} />
                <TextField label="Color" type="color" size="small" sx={{ width: 80 }} value={color} onChange={(e) => setColor(e.target.value)} />
                {extraToggle && <FormControlLabel control={<Checkbox checked={flag} onChange={(e) => setFlag(e.target.checked)} />} label="Referral" />}
                <Button variant="contained" disabled={!name.trim() || add.isPending} onClick={() => add.mutate()}>Add</Button>
            </Stack>
            {isLoading ? <CircularProgress size={20} /> : (
                <Stack spacing={1}>
                    {rows.map((r) => (
                        <Stack key={r.id} direction="row" alignItems="center" spacing={1.5} sx={{ p: 1, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: r.color ?? "#888" }} />
                            <Typography sx={{ fontWeight: 600, flex: 1 }}>{String(r[labelField] ?? "")}</Typography>
                            {r.isReferral && <Chip size="small" label="Referral" variant="outlined" />}
                            <IconButton size="small" onClick={() => del.mutate(r.id)}><i className="bi bi-trash" /></IconButton>
                        </Stack>
                    ))}
                    {rows.length === 0 && <Typography sx={{ color: "text.secondary" }}>None yet.</Typography>}
                </Stack>
            )}
        </>
    );
};

const PipelineConfig = () => (
    <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        <StatusesSection />
        <SimpleMaster
            title="Rejection Reasons"
            labelField="reason"
            queryKey={queryKeys.recruitment.rejectionReasons()}
            fetchFn={getRejectionReasons as never}
            createFn={createRejectionReason as never}
            deleteFn={deleteRejectionReason}
        />
        <SimpleMaster
            title="Applicant Sources"
            labelField="name"
            queryKey={queryKeys.recruitment.applicantSources()}
            fetchFn={getApplicantSources as never}
            createFn={createApplicantSource as never}
            deleteFn={deleteApplicantSource}
            extraToggle="isReferral"
        />
    </Box>
);

export default PipelineConfig;
