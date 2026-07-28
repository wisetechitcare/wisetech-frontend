import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Box, Stack, Typography, Button, ToggleButton, ToggleButtonGroup, Chip, CircularProgress,
    Table, TableHead, TableBody, TableRow, TableCell, TextField, MenuItem, DialogContent, DialogActions,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassDialog, GlassHeader, WtButton, toast } from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import { getRequisitions, type JobRequisition } from "@services/recruitment";
import {
    getApplications, createApplication, moveApplicationStage, getApplicationStatuses, getRejectionReasons,
    type Application, type ApplicationStatus, type ApplicationCreatePayload,
} from "@services/recruitment";

interface PendingMove {
    application: Application;
    status: ApplicationStatus;
}

const emptyCreate = (): ApplicationCreatePayload & { firstName: string; lastName: string; email: string } => ({
    firstName: "", lastName: "", email: "", requisitionId: "", statusId: null,
});

const scoreLabel = (a: Application): string | null => {
    const s = a.aiScore ?? a.ruleScore;
    return s === null || s === undefined ? null : `${Number(s).toFixed(0)}`;
};

const PipelineView = () => {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const [mode, setMode] = useState<"board" | "list">("board");
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState(emptyCreate());
    const [pending, setPending] = useState<PendingMove | null>(null);
    const [rejectReasonId, setRejectReasonId] = useState("");
    const [rejectNote, setRejectNote] = useState("");
    const [dragId, setDragId] = useState<string | null>(null);

    const { data: applications = [], isLoading } = useQuery({ queryKey: queryKeys.recruitment.applications(), queryFn: () => getApplications() });
    const { data: statuses = [] } = useQuery({ queryKey: queryKeys.recruitment.applicationStatuses(), queryFn: getApplicationStatuses });
    const { data: reasons = [] } = useQuery({ queryKey: queryKeys.recruitment.rejectionReasons(), queryFn: getRejectionReasons });
    const { data: requisitions = [] } = useQuery({ queryKey: queryKeys.recruitment.requisitions(), queryFn: getRequisitions });

    const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.recruitment.all });

    const createMut = useMutation({
        mutationFn: (payload: ApplicationCreatePayload) => createApplication(payload),
        onSuccess: () => { toast({ icon: "success", title: "Application added" }); setCreateOpen(false); setForm(emptyCreate()); invalidate(); },
        onError: () => toast({ icon: "error", title: "Could not add application" }),
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
        onError: () => { toast({ icon: "error", title: "Could not move — refresh and retry" }); invalidate(); },
    });

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

    const submitCreate = () => {
        if (!form.firstName.trim() || !form.email.trim()) return;
        createMut.mutate({
            applicant: { firstName: form.firstName.trim(), lastName: form.lastName || null, email: form.email.trim() },
            requisitionId: form.requisitionId || null,
        });
    };

    // Convert a hired candidate into an employee: prefill the New Employee wizard
    // via its onboarding-draft seam, then open it — no re-keying of known details.
    const convertToEmployee = (a: Application) => {
        const draft = {
            firstName: a.applicant?.firstName ?? "",
            lastName: a.applicant?.lastName ?? "",
            personalEmailId: a.applicant?.email ?? "",
            personalPhoneNumber: a.applicant?.phone ?? "",
            linkedInProfileUrl: a.applicant?.linkedInUrl ?? "",
        };
        try {
            sessionStorage.setItem("employee-onboarding-draft", JSON.stringify(draft));
        } catch {
            /* storage quota — proceed with a blank wizard */
        }
        toast({ icon: "info", title: "Opening onboarding with the candidate's details prefilled" });
        navigate("/employees/create-new");
    };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 18 }}>Candidate Pipeline</Typography>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_e, v) => v && setMode(v)}>
                        <ToggleButton value="board"><i className="bi bi-kanban" />&nbsp;Board</ToggleButton>
                        <ToggleButton value="list"><i className="bi bi-list-ul" />&nbsp;List</ToggleButton>
                    </ToggleButtonGroup>
                    <Button variant="contained" startIcon={<i className="bi bi-plus-lg" />} onClick={() => setCreateOpen(true)}>
                        New Application
                    </Button>
                </Stack>
            </Stack>

            {statuses.length === 0 && (
                <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: "warning.light", color: "warning.contrastText", fontSize: 14 }}>
                    No pipeline stages configured yet — add them in the <b>Configure</b> tab so candidates can flow through the board.
                </Box>
            )}

            {isLoading ? (
                <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>
            ) : mode === "board" ? (
                <Box sx={{ display: "flex", gap: 1.5, overflowX: "auto", pb: 1 }}>
                    {statuses.map((s) => {
                        const cards = byStatus.map.get(s.id) ?? [];
                        return (
                            <Box
                                key={s.id}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => { const app = applications.find((a) => a.id === dragId); if (app) attemptMove(app, s); setDragId(null); }}
                                sx={{ minWidth: 250, maxWidth: 280, flex: "0 0 auto", bgcolor: "action.hover", borderRadius: 2, p: 1 }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, px: 0.5 }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: s.color ?? "#888" }} />
                                    <Typography sx={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{s.name}</Typography>
                                    <Chip size="small" label={cards.length} />
                                </Stack>
                                <Stack spacing={1}>
                                    {cards.map((a) => (
                                        <Box
                                            key={a.id}
                                            draggable
                                            onDragStart={() => setDragId(a.id)}
                                            onDragEnd={() => setDragId(null)}
                                            sx={{ p: 1.25, borderRadius: 1.5, bgcolor: "background.paper", boxShadow: 1, cursor: "grab", opacity: dragId === a.id ? 0.5 : 1 }}
                                        >
                                            <Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>
                                                {a.applicant?.firstName} {a.applicant?.lastName ?? ""}
                                            </Typography>
                                            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                                                {a.requisition?.title ?? "No requisition"}
                                            </Typography>
                                            {scoreLabel(a) && <Chip size="small" sx={{ mt: 0.5 }} label={`Score ${scoreLabel(a)}`} color="info" variant="outlined" />}
                                        </Box>
                                    ))}
                                    {cards.length === 0 && <Typography sx={{ fontSize: 12, color: "text.disabled", px: 0.5, py: 1 }}>Drop here</Typography>}
                                </Stack>
                            </Box>
                        );
                    })}
                </Box>
            ) : (
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Ref</TableCell><TableCell>Candidate</TableCell><TableCell>Requisition</TableCell>
                            <TableCell>Stage</TableCell><TableCell align="center">Score</TableCell><TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {applications.map((a) => (
                            <TableRow key={a.id} hover>
                                <TableCell>{a.prefix ?? "—"}</TableCell>
                                <TableCell>{a.applicant?.firstName} {a.applicant?.lastName ?? ""}</TableCell>
                                <TableCell>{a.requisition?.title ?? "—"}</TableCell>
                                <TableCell>
                                    <Chip size="small" label={a.status?.name ?? "—"} sx={{ bgcolor: a.status?.color ?? undefined, color: a.status?.color ? "#fff" : undefined }} />
                                </TableCell>
                                <TableCell align="center">{scoreLabel(a) ?? "—"}</TableCell>
                                <TableCell align="right">
                                    {a.status?.isHiredOutcome && (
                                        <WtButton size="small" tone="success" startIcon={<KTIcon iconName="user-tick" className="fs-6" />} onClick={() => convertToEmployee(a)}>
                                            Convert
                                        </WtButton>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {applications.length === 0 && (
                            <TableRow><TableCell colSpan={6} align="center" sx={{ color: "text.secondary", py: 4 }}>No applications yet.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            )}

            {/* Create application */}
            <GlassDialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                maxWidth="sm"
                header={<GlassHeader title="New Application" subtitle="Add a candidate to the pipeline" icon={<i className="bi bi-person-plus" />} onClose={() => setCreateOpen(false)} />}
            >
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Stack direction="row" spacing={2}>
                            <TextField label="First name" required size="small" sx={{ flex: 1 }} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                            <TextField label="Last name" size="small" sx={{ flex: 1 }} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                        </Stack>
                        <TextField label="Email" required type="email" size="small" fullWidth value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        <TextField label="Requisition" select size="small" fullWidth value={form.requisitionId ?? ""} onChange={(e) => setForm({ ...form, requisitionId: e.target.value })}>
                            <MenuItem value="">— None —</MenuItem>
                            {requisitions.map((r: JobRequisition) => (
                                <MenuItem key={r.id} value={r.id}>{r.prefix ? `${r.prefix} · ` : ""}{r.title}</MenuItem>
                            ))}
                        </TextField>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button variant="contained" disabled={!form.firstName.trim() || !form.email.trim() || createMut.isPending} onClick={submitCreate}>
                        {createMut.isPending ? "Adding…" : "Add"}
                    </Button>
                </DialogActions>
            </GlassDialog>

            {/* Rejection reason capture on move to a terminal/requires-reason stage */}
            <GlassDialog
                open={!!pending}
                onClose={() => setPending(null)}
                maxWidth="xs"
                header={<GlassHeader title={`Move to "${pending?.status.name ?? ""}"`} subtitle="A reason is required for this stage" icon={<i className="bi bi-x-octagon" />} onClose={() => setPending(null)} />}
            >
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField label="Reason" select required size="small" fullWidth value={rejectReasonId} onChange={(e) => setRejectReasonId(e.target.value)}>
                            {reasons.map((r) => <MenuItem key={r.id} value={r.id}>{r.reason}</MenuItem>)}
                            {reasons.length === 0 && <MenuItem value="" disabled>No reasons configured — add them in Configure</MenuItem>}
                        </TextField>
                        <TextField label="Note (optional)" size="small" fullWidth multiline minRows={2} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setPending(null)}>Cancel</Button>
                    <Button variant="contained" color="error" disabled={!rejectReasonId || moveMut.isPending} onClick={confirmReject}>Confirm</Button>
                </DialogActions>
            </GlassDialog>
        </Box>
    );
};

export default PipelineView;
