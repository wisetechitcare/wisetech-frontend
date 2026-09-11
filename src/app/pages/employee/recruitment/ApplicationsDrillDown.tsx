import { useQuery } from "@tanstack/react-query";
import {
    Box, Stack, Typography, Table, TableHead, TableBody, TableRow, TableCell, Chip, CircularProgress,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import DrillDownDialog from "@app/modules/common/components/DrillDownDialog";
import { ToneChip } from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import { getApplications, SCORE_BAND_META, type Application } from "@services/recruitment";
import { formatDate } from "@utils/dateFormats";

/**
 * The people behind a number on the overview.
 *
 * Every bar on that page was a count with a tooltip repeating the same count — a dead end
 * at exactly the moment someone wants to act. "Four in Interview" is only useful if you can
 * see WHICH four.
 *
 * REUSES `DrillDownDialog`, the same shell the Companies and Contacts charts open, so a
 * drill-down looks and stacks identically wherever it is launched from. That component
 * already solves the z-index problem of opening a dialog from a chart that may itself be a
 * fullscreen overlay.
 *
 * ONE component for BOTH charts. Stage and source are two filters on the same list, so the
 * columns, the scoping and the empty state are defined once. A second component per chart
 * is how two views of the same records start disagreeing.
 */
export interface ApplicationsDrillDownProps {
    open: boolean;
    onClose: () => void;
    /** What the user clicked, shown as the dialog's heading. */
    title: string;
    /** Exactly one of these is set by the caller. */
    statusId?: string;
    sourceId?: string;
    companyId?: string;
}

const fullName = (a: Application) =>
    `${a.applicant?.firstName ?? ""} ${a.applicant?.lastName ?? ""}`.trim() || "—";

const ApplicationsDrillDown = ({ open, onClose, title, statusId, sourceId, companyId }: ApplicationsDrillDownProps) => {
    const filters = { ...(statusId ? { statusId } : {}), ...(sourceId ? { sourceId } : {}) };

    const { data: rows = [], isLoading } = useQuery({
        queryKey: queryKeys.recruitment.applications({ companyId, ...filters }),
        queryFn: () => getApplications(filters, companyId),
        // Nothing to fetch until the dialog is actually open — a closed drill-down must not
        // cost a request on every overview render.
        enabled: open,
    });

    return (
        <DrillDownDialog open={open} onClose={onClose} maxBodyHeight="70vh">
            <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
                    <KTIcon iconName="people" className="fs-2" />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: { xs: 15, sm: 16.5 }, lineHeight: 1.3 }}>{title}</Typography>
                        <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                            {isLoading ? "Loading…" : `${rows.length} ${rows.length === 1 ? "candidate" : "candidates"}`}
                        </Typography>
                    </Box>
                </Stack>

                {isLoading ? (
                    <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} /></Stack>
                ) : rows.length === 0 ? (
                    <Typography sx={{ fontSize: 13, color: "text.secondary", py: 3, textAlign: "center" }}>
                        Nobody here yet.
                    </Typography>
                ) : (
                    // Wide tables scroll inside their own container so the page never does.
                    <Box sx={{ overflowX: "auto" }}>
                        <Table size="small" sx={{ minWidth: 720 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>Candidate</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Position</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Stage</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Waiting</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Score</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Source</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Applied</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((a) => {
                                    const score = a.aiScore ?? a.ruleScore;
                                    return (
                                        <TableRow key={a.id} hover>
                                            <TableCell sx={{ fontWeight: 600 }}>
                                                {fullName(a)}
                                                {a.applicant?.phone && (
                                                    <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>{a.applicant.phone}</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: 13 }}>{a.requisition?.title ?? "—"}</TableCell>
                                            <TableCell>
                                                <ToneChip tone="brand" color={a.status?.color ?? undefined} label={a.status?.name ?? "—"} dense />
                                            </TableCell>
                                            <TableCell>
                                                {/* Terminal applications carry no band — they are finished, not waiting. */}
                                                {a.stageAgeBand ? (
                                                    <Chip
                                                        size="small"
                                                        variant="outlined"
                                                        color={a.stageAgeBand === "stalled" ? "error" : a.stageAgeBand === "ageing" ? "warning" : "default"}
                                                        label={`${a.daysInStage ?? 0}d`}
                                                    />
                                                ) : (
                                                    <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>—</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {score == null ? (
                                                    <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>—</Typography>
                                                ) : (
                                                    <Chip
                                                        size="small"
                                                        variant="outlined"
                                                        color={a.scoreBand ? SCORE_BAND_META[a.scoreBand].color : "default"}
                                                        label={a.scoreBand ? `${SCORE_BAND_META[a.scoreBand].label} · ${Number(score).toFixed(0)}` : Number(score).toFixed(0)}
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: 13 }}>{a.applicant?.source?.name ?? "—"}</TableCell>
                                            <TableCell sx={{ fontSize: 13 }}>{a.appliedDate ? formatDate(a.appliedDate) : "—"}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </Box>
        </DrillDownDialog>
    );
};

export default ApplicationsDrillDown;
