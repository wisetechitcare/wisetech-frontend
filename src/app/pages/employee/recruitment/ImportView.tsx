import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Stack, Typography, CircularProgress } from "@mui/material";
import type { MRT_ColumnDef } from "material-react-table";
import { KTIcon } from "@metronic/helpers";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import {
    GlassCard, ListHeader, WtButton, WtField, ToneChip, toast, confirmDialog,
} from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import { apiErrorMessage } from "@utils/apiError";
import {
    previewTrackerImport, executeTrackerImport, getApplicationStatuses, getRequisitions,
    type ImportPreview, type ImportAnswers, type TrackerSheet, type ApplicationStatus,
} from "@services/recruitment";

/**
 * Bring the HR tracker into the system.
 *
 * Order matters: a candidate is joined to a requisition by POSITION NAME, so importing people
 * into an organization with no requisitions leaves every one of them attached to nothing. The
 * candidates step is therefore locked only while the organization has NO requisitions at all —
 * not "until requisitions were imported in this sitting", which locked out anyone who imported
 * them yesterday, created them by hand, or simply switched tabs.
 *
 * Nothing is written until Import is pressed. Preview re-runs on every answer, so the operator
 * sees the effect of a decision before committing to it.
 */

const SHEETS: { key: TrackerSheet; label: string; hint: string }[] = [
    { key: "requisitions", label: "1 · Requisitions", hint: "The openings candidates attach to. Import these first." },
    { key: "candidates", label: "2 · Candidates", hint: "People, their interviews and their outcomes." },
];

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const rowName = (row: ImportPreview["preview"]["rows"][number]): string => {
    const a = row.mapped.applicant;
    if (a) return [a.firstName, a.lastName].filter(Boolean).join(" ") || "(unnamed)";
    return row.mapped.positionName || "(no position)";
};

/**
 * What a preview row looks like in the table. Defined once here rather than inline so the
 * candidate sheet and the requisition sheet are read the same way — they share this screen
 * and differ only in which fields are populated.
 */
type PreviewRow = ImportPreview["preview"]["rows"][number];

const previewColumns: MRT_ColumnDef<PreviewRow>[] = [
    {
        // Sorts on the BOOLEAN, so one click brings every blocked row together — which is
        // the question a preview exists to answer.
        accessorFn: (r) => (r.importable ? "Will import" : "Blocked"),
        id: "state",
        header: "State",
        size: 130,
        Cell: ({ row }) => (
            <Stack direction="row" spacing={0.75} alignItems="center">
                <Box component="span" sx={{ display: "inline-flex", color: row.original.importable ? "success.main" : "error.main" }}>
                    <KTIcon iconName={row.original.importable ? "check-circle" : "cross-circle"} className="fs-4" />
                </Box>
                <Typography sx={{ fontSize: 12.5 }}>{row.original.importable ? "Will import" : "Blocked"}</Typography>
            </Stack>
        ),
    },
    {
        accessorFn: (r) => rowName(r),
        id: "row",
        header: "Row",
        size: 220,
        Cell: ({ row }) => (
            <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, fontSize: 13, overflowWrap: "anywhere" }}>{rowName(row.original)}</Typography>
                {row.original.mapped.sourceRef && (
                    <Typography sx={{ fontSize: 11.5, color: "text.disabled" }}>{row.original.mapped.sourceRef}</Typography>
                )}
            </Box>
        ),
    },
    {
        accessorFn: (r) => {
            const position = r.mapped.application?.positionName ?? r.mapped.positionName ?? "—";
            const status = r.mapped.application?.statusName;
            return status ? `${position} · ${status}` : position;
        },
        id: "detail",
        header: "Detail",
        size: 220,
    },
    {
        // Searchable as text, so "not an email" finds every row with that problem.
        accessorFn: (r) => r.issues.map((i) => `${i.field}: ${i.message}`).join(" · ") || "—",
        id: "issues",
        header: "Issues",
        size: 420,
        Cell: ({ row }) =>
            row.original.issues.length === 0 ? (
                <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>—</Typography>
            ) : (
                <Stack spacing={0.4}>
                    {row.original.issues.map((issue, j) => (
                        <Typography key={j} sx={{ fontSize: 12.5, color: issue.level === "error" ? "error.main" : "warning.main" }}>
                            {issue.field}: {issue.message}
                        </Typography>
                    ))}
                </Stack>
            ),
    },
];

/** A preview request: the file travels WITH the request, never read back from state. */
interface PreviewVars { file: File; sheet: TrackerSheet; answers: ImportAnswers }

/** One question the importer cannot answer alone: a label on the left, a choice on the right. Stacks on a phone. */
const QuestionRow = ({ label, meta, children }: { label: string; meta?: string; children: React.ReactNode }) => (
    <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} spacing={{ xs: 0.75, sm: 1.5 }}>
        <Typography sx={{ flex: 1, fontSize: 13.5, minWidth: 0, overflowWrap: "anywhere" }}>
            {label}
            {meta && <Typography component="span" sx={{ ml: 0.75, fontSize: 12, color: "text.disabled" }}>{meta}</Typography>}
        </Typography>
        <Box sx={{ width: { xs: "100%", sm: 260 }, flexShrink: 0 }}>{children}</Box>
    </Stack>
);

const ImportView = () => {
    const qc = useQueryClient();
    const fileRef = useRef<HTMLInputElement | null>(null);

    const [sheet, setSheet] = useState<TrackerSheet>("requisitions");
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [answers, setAnswers] = useState<ImportAnswers>({});

    // Stages, so an unrecognised sheet word can be pointed at one.
    const { data: statuses = [] } = useQuery({
        queryKey: queryKeys.recruitment.applicationStatuses(),
        queryFn: getApplicationStatuses,
    });
    // Whether the organization has any requisition to attach candidates to — however it got there.
    const { data: requisitions = [], isLoading: requisitionsLoading } = useQuery({
        queryKey: queryKeys.recruitment.requisitions(""),
        queryFn: () => getRequisitions(),
    });

    // The file, sheet and answers are passed INTO the mutation. Reading them from component state
    // inside `mutationFn` sent the PREVIOUS render's file: React Query refreshes a mutation's options
    // only after the next commit, so the first pick uploaded nothing ("A CSV file is required") and
    // every later pick previewed the file chosen before it.
    const previewMut = useMutation({
        mutationFn: (vars: PreviewVars) => previewTrackerImport(vars.sheet, vars.file, vars.answers),
        onSuccess: (data) => setPreview(data),
        onError: (err) => {
            setPreview(null);
            toast({ icon: "error", title: apiErrorMessage(err, "Could not read that file") });
        },
    });

    const importMut = useMutation({
        mutationFn: (vars: PreviewVars) => executeTrackerImport(vars.sheet, vars.file, vars.answers),
        onSuccess: (result: { created?: number; updated?: number; applicantsCreated?: number; applicantsUpdated?: number } | undefined, vars) => {
            toast({
                icon: "success",
                title: vars.sheet === "requisitions"
                    ? `${plural(result?.created ?? 0, "requisition")} created, ${result?.updated ?? 0} updated`
                    : `${plural(result?.applicantsCreated ?? 0, "candidate")} created, ${result?.applicantsUpdated ?? 0} updated`,
            });
            // Everything downstream reads these — the board, the directory, the dashboard, and
            // the requisition count that unlocks the candidates step.
            qc.invalidateQueries({ queryKey: queryKeys.recruitment.all });
            setPreview(null);
            setFile(null);
        },
        onError: (err) => toast({ icon: "error", title: apiErrorMessage(err, "The import failed") }),
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
        previewMut.mutate({ file: picked, sheet, answers: {} });
    };

    /** Re-preview immediately, so an answer's effect is visible before committing. */
    const answer = (next: ImportAnswers) => {
        setAnswers(next);
        if (file) previewMut.mutate({ file, sheet, answers: next });
    };

    const changeSheet = (next: string) => {
        setSheet(next as TrackerSheet);
        setFile(null);
        setPreview(null);
        setAnswers({});
    };

    const commit = async () => {
        const p = preview?.preview;
        if (!p || !file) return;
        const ok = await confirmDialog({
            icon: "warning",
            title: `Import ${plural(p.importable, "row")}?`,
            text: p.blocked
                ? `${plural(p.blocked, "row")} will be skipped. You can fix them in the sheet and run this again — re-importing updates rather than duplicating.`
                : "Re-running later updates these records rather than duplicating them.",
        });
        if (ok) importMut.mutate({ file, sheet, answers });
    };

    const p = preview?.preview;
    const questions = p?.questions;
    const blockedByOrder = sheet === "candidates" && !requisitionsLoading && requisitions.length === 0;
    const busy = previewMut.isPending || importMut.isPending;

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 1400, mx: "auto" }}>
            <ListHeader
                title="Import from the HR tracker"
                subtitle="Upload one sheet at a time. Nothing is written until you press Import."
            />

            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />

            <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
                    <WtField
                        label="Sheet"
                        value={sheet}
                        onChange={changeSheet}
                        options={SHEETS.map((s) => ({ value: s.key, label: s.label }))}
                        disabled={busy}
                        sx={{ minWidth: { sm: 220 } }}
                    />
                    <Typography sx={{ flex: 1, fontSize: 13, color: "text.secondary" }}>
                        {SHEETS.find((s) => s.key === sheet)?.hint}
                    </Typography>
                    <WtButton tone="primary" size="small" onClick={chooseFile} disabled={blockedByOrder || busy}>
                        {file ? "Choose a different file" : "Choose CSV"}
                    </WtButton>
                </Stack>

                {blockedByOrder && (
                    <Typography sx={{ mt: 1.5, fontSize: 13, color: "warning.main" }}>
                        Add or import requisitions first. A candidate is matched to an opening by position name,
                        so importing people with no requisitions leaves every one of them attached to nothing.
                    </Typography>
                )}

                {file && (
                    <Typography sx={{ mt: 1.5, fontSize: 12.5, color: "text.secondary", overflowWrap: "anywhere" }}>
                        {file.name}
                        {preview && ` · header found on line ${preview.headerLine} · ${plural(preview.headers.length, "column")}`}
                    </Typography>
                )}
            </GlassCard>

            {previewMut.isPending && (
                <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={26} /></Stack>
            )}

            {p && !previewMut.isPending && (
                <>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }} alignItems={{ xs: "stretch", sm: "center" }}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flex: 1 }}>
                            <ToneChip tone="success" label={`${p.importable} will import`} />
                            {p.blocked > 0 && <ToneChip tone="danger" label={`${p.blocked} blocked`} />}
                            {!!p.withWarnings && <ToneChip tone="warning" label={`${p.withWarnings} with warnings`} />}
                        </Stack>
                        <WtButton
                            tone="primary"
                            disabled={p.importable === 0 || importMut.isPending}
                            onClick={commit}
                        >
                            {importMut.isPending ? "Importing…" : `Import ${plural(p.importable, "row")}`}
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
                            <Stack spacing={1.25}>
                                {questions.unmappedStatuses.map((q) => (
                                    <QuestionRow key={q.value} label={q.value} meta={plural(q.rowCount, "row")}>
                                        <WtField
                                            label="Maps to" fullWidth
                                            value={answers.statusAliases?.[q.value.toLowerCase()] ?? ""}
                                            onChange={(v) => answer({
                                                ...answers,
                                                statusAliases: { ...(answers.statusAliases ?? {}), [q.value.toLowerCase()]: v },
                                            })}
                                            options={statuses.map((s: ApplicationStatus) => ({ value: s.id, label: s.name }))}
                                            placeholder="Choose a stage"
                                        />
                                    </QuestionRow>
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
                            <Stack spacing={1.25}>
                                {questions.ambiguousNames.map((q) => (
                                    <QuestionRow key={q.name} label={q.name}>
                                        <WtField
                                            label="Is" fullWidth
                                            value={answers.nameOverrides?.[q.name.toLowerCase()] ?? ""}
                                            onChange={(v) => answer({
                                                ...answers,
                                                nameOverrides: { ...(answers.nameOverrides ?? {}), [q.name.toLowerCase()]: v },
                                            })}
                                            options={q.employees.map((e) => ({ value: e.id, label: e.label }))}
                                            placeholder="Choose the person"
                                        />
                                    </QuestionRow>
                                ))}
                            </Stack>
                        </GlassCard>
                    )}

                    <GlassCard preset="section" sx={{ p: 0, overflow: "hidden" }}>
                        <Box sx={{ overflowX: "auto" }}>
                            {/* The shared engine, so HR can search sixty rows and filter to just the
                                blocked ones instead of scrolling. A preview is exactly where
                                that matters: the point of it is finding what will fail. */}
                            <MaterialTable
                                columns={previewColumns}
                                data={p.rows}
                                tableName={`RecruitmentImportPreview-${sheet}`}
                                muiTableContainerProps={{ sx: { maxHeight: 420 } }}
                            />
                        </Box>
                    </GlassCard>
                </>
            )}
        </Box>
    );
};

export default ImportView;
