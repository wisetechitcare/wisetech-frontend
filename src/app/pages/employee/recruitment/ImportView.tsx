import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Box, Stack, Typography, TextField, MenuItem, CircularProgress, Table, TableBody,
    TableCell, TableHead, TableRow,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    GlassCard, ListHeader, WtButton, ToneChip, toast, confirmDialog,
} from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import {
    previewTrackerImport, executeTrackerImport, getApplicationStatuses,
    type ImportPreview, type ImportAnswers, type TrackerSheet, type ApplicationStatus,
} from "@services/recruitment";

/**
 * Bring the HR tracker into the system.
 *
 * Order is enforced rather than documented: a candidate is joined to a requisition by
 * POSITION NAME, so importing people first leaves every one of them attached to nothing.
 * The candidates step stays locked until requisitions have been imported in this session.
 *
 * Nothing is written until Import is pressed. Preview re-runs on every answer, so the
 * operator sees the effect of a decision before committing to it — which is the whole point
 * of having a preview at all.
 */

const SHEETS: { key: TrackerSheet; label: string; hint: string }[] = [
    { key: "requisitions", label: "1 · Requisitions", hint: "The openings candidates attach to. Import these first." },
    { key: "candidates", label: "2 · Candidates", hint: "People, their interviews and their outcomes." },
];

const rowName = (row: ImportPreview["preview"]["rows"][number]): string => {
    const a = row.mapped.applicant;
    if (a) return [a.firstName, a.lastName].filter(Boolean).join(" ") || "(unnamed)";
    return row.mapped.positionName || "(no position)";
};

const ImportView = () => {
    const qc = useQueryClient();
    const fileRef = useRef<HTMLInputElement | null>(null);

    const [sheet, setSheet] = useState<TrackerSheet>("requisitions");
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [answers, setAnswers] = useState<ImportAnswers>({});
    const [requisitionsDone, setRequisitionsDone] = useState(false);

    // Stages, so an unrecognised sheet word can be pointed at one.
    const { data: statuses = [] } = useQuery({
        queryKey: queryKeys.recruitment.applicationStatuses(),
        queryFn: getApplicationStatuses,
    });

    const previewMut = useMutation({
        mutationFn: (next: ImportAnswers) => previewTrackerImport(sheet, file!, next),
        onSuccess: (data) => setPreview(data),
        onError: (err: any) => {
            setPreview(null);
            toast({ icon: "error", title: err?.response?.data?.message ?? "Could not read that file" });
        },
    });

    const importMut = useMutation({
        mutationFn: () => executeTrackerImport(sheet, file!, answers),
        onSuccess: (result: any) => {
            toast({
                icon: "success",
                title: sheet === "requisitions"
                    ? `${result?.created ?? 0} requisition(s) created, ${result?.updated ?? 0} updated`
                    : `${result?.applicantsCreated ?? 0} candidate(s) created, ${result?.applicantsUpdated ?? 0} updated`,
            });
            if (sheet === "requisitions") setRequisitionsDone(true);
            // Everything downstream reads these — the board, the directory, the dashboard.
            qc.invalidateQueries({ queryKey: queryKeys.recruitment.all });
            setPreview(null);
            setFile(null);
        },
        onError: (err: any) => toast({ icon: "error", title: err?.response?.data?.message ?? "The import failed" }),
    });

    const chooseFile = () => {
        if (fileRef.current) fileRef.current.value = "";
        fileRef.current?.click();
    };

    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = e.target.files?.[0];
        if (!picked) return;
        setFile(picked);
        setAnswers({});
        setPreview(null);
        previewMut.mutate({});
    };

    /** Re-preview immediately, so an answer's effect is visible before committing. */
    const answer = (next: ImportAnswers) => {
        setAnswers(next);
        if (file) previewMut.mutate(next);
    };

    const commit = async () => {
        const p = preview?.preview;
        if (!p) return;
        const ok = await confirmDialog({
            icon: "warning",
            title: `Import ${p.importable} row(s)?`,
            text: p.blocked
                ? `${p.blocked} row(s) will be skipped. You can fix them in the sheet and run this again — re-importing updates rather than duplicating.`
                : "Re-running later updates these records rather than duplicating them.",
        });
        if (ok) importMut.mutate();
    };

    const p = preview?.preview;
    const questions = p?.questions;
    const blockedByOrder = sheet === "candidates" && !requisitionsDone;

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1400, mx: "auto" }}>
            <ListHeader
                title="Import from the HR tracker"
                subtitle="Upload one sheet at a time. Nothing is written until you press Import."
            />

            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />

            <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                    <TextField
                        select label="Sheet" size="small" sx={{ minWidth: 220 }}
                        value={sheet}
                        onChange={(e) => { setSheet(e.target.value as TrackerSheet); setFile(null); setPreview(null); setAnswers({}); }}
                    >
                        {SHEETS.map((s) => <MenuItem key={s.key} value={s.key}>{s.label}</MenuItem>)}
                    </TextField>
                    <Typography sx={{ flex: 1, fontSize: 13, color: "text.secondary" }}>
                        {SHEETS.find((s) => s.key === sheet)?.hint}
                    </Typography>
                    <WtButton tone="primary" size="small" onClick={chooseFile} disabled={blockedByOrder}>
                        {file ? "Choose a different file" : "Choose CSV"}
                    </WtButton>
                </Stack>

                {blockedByOrder && (
                    <Typography sx={{ mt: 1.5, fontSize: 13, color: "warning.main" }}>
                        Import the requisitions first. A candidate is matched to an opening by position name,
                        so importing people first leaves every one of them attached to nothing.
                    </Typography>
                )}

                {file && (
                    <Typography sx={{ mt: 1.5, fontSize: 12.5, color: "text.secondary" }}>
                        {file.name}
                        {preview && ` · header found on line ${preview.headerLine} · ${preview.headers.length} columns`}
                    </Typography>
                )}
            </GlassCard>

            {previewMut.isPending && (
                <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={26} /></Stack>
            )}

            {p && !previewMut.isPending && (
                <>
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                        <ToneChip tone="success" label={`${p.importable} will import`} />
                        {p.blocked > 0 && <ToneChip tone="danger" label={`${p.blocked} blocked`} />}
                        {!!p.withWarnings && <ToneChip tone="warning" label={`${p.withWarnings} with warnings`} />}
                        <Box sx={{ flex: 1 }} />
                        <WtButton
                            tone="primary"
                            disabled={p.importable === 0 || importMut.isPending}
                            onClick={commit}
                        >
                            {importMut.isPending ? "Importing…" : `Import ${p.importable} row(s)`}
                        </WtButton>
                    </Stack>

                    {/* Questions first: answering one can unblock many rows at once. */}
                    {!!questions?.unmappedStatuses?.length && (
                        <GlassCard preset="section" sx={{ p: 2, mb: 2 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 0.5 }}>
                                Some statuses do not match a stage
                            </Typography>
                            <Typography sx={{ fontSize: 12.5, color: "text.secondary", mb: 1.5 }}>
                                Point each at one of your stages. Your pipeline is not renamed — the sheet is mapped onto it.
                            </Typography>
                            <Stack spacing={1}>
                                {questions.unmappedStatuses.map((q) => (
                                    <Stack key={q.value} direction="row" alignItems="center" spacing={1.5}>
                                        <Typography sx={{ flex: 1, fontSize: 13.5, minWidth: 0 }}>
                                            {q.value}
                                            <Typography component="span" sx={{ ml: 0.75, fontSize: 12, color: "text.disabled" }}>
                                                {q.rowCount} row{q.rowCount === 1 ? "" : "s"}
                                            </Typography>
                                        </Typography>
                                        <TextField
                                            select size="small" sx={{ minWidth: 220 }} label="Maps to"
                                            value={answers.statusAliases?.[q.value.toLowerCase()] ?? ""}
                                            onChange={(e) => answer({
                                                ...answers,
                                                statusAliases: { ...(answers.statusAliases ?? {}), [q.value.toLowerCase()]: e.target.value },
                                            })}
                                        >
                                            {statuses.map((s: ApplicationStatus) => (
                                                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                                            ))}
                                        </TextField>
                                    </Stack>
                                ))}
                            </Stack>
                        </GlassCard>
                    )}

                    {!!questions?.ambiguousNames?.length && (
                        <GlassCard preset="section" sx={{ p: 2, mb: 2 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 0.5 }}>
                                Some names match more than one person
                            </Typography>
                            <Typography sx={{ fontSize: 12.5, color: "text.secondary", mb: 1.5 }}>
                                Left unanswered these import unassigned — the record is kept, the attribution is not.
                            </Typography>
                            <Stack spacing={1}>
                                {questions.ambiguousNames.map((q) => (
                                    <Stack key={q.name} direction="row" alignItems="center" spacing={1.5}>
                                        <Typography sx={{ flex: 1, fontSize: 13.5 }}>{q.name}</Typography>
                                        <TextField
                                            select size="small" sx={{ minWidth: 260 }} label="Is"
                                            value={answers.nameOverrides?.[q.name.toLowerCase()] ?? ""}
                                            onChange={(e) => answer({
                                                ...answers,
                                                nameOverrides: { ...(answers.nameOverrides ?? {}), [q.name.toLowerCase()]: e.target.value },
                                            })}
                                        >
                                            {q.employees.map((e) => (
                                                <MenuItem key={e.id} value={e.id}>{e.label}</MenuItem>
                                            ))}
                                        </TextField>
                                    </Stack>
                                ))}
                            </Stack>
                        </GlassCard>
                    )}

                    <GlassCard preset="section" sx={{ p: 0, overflow: "hidden" }}>
                        <Box sx={{ overflowX: "auto" }}>
                            <Table size="small" sx={{ minWidth: 720 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ width: 44 }} />
                                        <TableCell>Row</TableCell>
                                        <TableCell>Detail</TableCell>
                                        <TableCell>Issues</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {p.rows.map((row, i) => (
                                        <TableRow key={i} sx={{ opacity: row.importable ? 1 : 0.65 }}>
                                            <TableCell>
                                                <KTIcon
                                                    iconName={row.importable ? "check-circle" : "cross-circle"}
                                                    className={`fs-4 ${row.importable ? "text-success" : "text-danger"}`}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>
                                                {rowName(row)}
                                                {row.mapped.sourceRef && (
                                                    <Typography component="span" sx={{ ml: 0.75, fontSize: 11.5, color: "text.disabled" }}>
                                                        {row.mapped.sourceRef}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: 12.5, color: "text.secondary" }}>
                                                {row.mapped.application?.positionName ?? row.mapped.positionName ?? "—"}
                                                {row.mapped.application?.statusName ? ` · ${row.mapped.application.statusName}` : ""}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: 12.5 }}>
                                                {row.issues.length === 0 ? (
                                                    <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>—</Typography>
                                                ) : (
                                                    <Stack spacing={0.4}>
                                                        {row.issues.map((issue, j) => (
                                                            <Typography
                                                                key={j}
                                                                sx={{ fontSize: 12.5, color: issue.level === "error" ? "error.main" : "warning.main" }}
                                                            >
                                                                {issue.field}: {issue.message}
                                                            </Typography>
                                                        ))}
                                                    </Stack>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    </GlassCard>
                </>
            )}
        </Box>
    );
};

export default ImportView;
