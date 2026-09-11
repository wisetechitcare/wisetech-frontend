import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Stack, Typography, Chip } from "@mui/material";
import type { MRT_ColumnDef } from "material-react-table";
import { KTIcon } from "@metronic/helpers";
import DrillDownDialog from "@app/modules/common/components/DrillDownDialog";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { ToneChip } from "@app/modules/common/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import { getApplications, SCORE_BAND_META, type Application } from "@services/recruitment";
import { formatDate } from "@utils/dateFormats";

/**
 * The people behind a number on the overview.
 *
 * Every bar on that page was a dead end: hovering repeated the count you could already
 * read, at exactly the moment someone wants to act. "Four in Interview" is only useful if
 * you can see WHICH four.
 *
 * BUILT ON THE SHARED TABLE ENGINE, not a hand-rolled table. `MaterialTable` brings column
 * show/hide, per-column search, sorting, export and per-user column preferences — none of
 * which a bespoke table would have, and all of which the Companies and Contacts drill-downs
 * already give their users. It also already knows about `DRILLDOWN_Z_INDEX`: its column menu
 * is a portal that would otherwise paint behind this very dialog. The engine and the dialog
 * are a designed pair.
 *
 * `MaterialTable` is a lazy boundary over the 2.5k-line impl, so importing it here does not
 * pull material-react-table into the entry chunk.
 *
 * ONE component for BOTH charts. Stage and source are two filters on the same list, so the
 * columns, the scoping and the empty state are defined once. A second component per chart is
 * how two views of the same records start disagreeing.
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
        // Nothing to fetch until the dialog is open — a closed drill-down must not cost a
        // request on every overview render.
        enabled: open,
    });

    const columns = useMemo<MRT_ColumnDef<Application>[]>(() => [
        {
            accessorFn: (a) => fullName(a),
            id: "candidate",
            header: "Candidate",
            size: 200,
            Cell: ({ row }) => (
                <Box>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{fullName(row.original)}</Typography>
                    {row.original.applicant?.phone && (
                        <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>{row.original.applicant.phone}</Typography>
                    )}
                </Box>
            ),
        },
        {
            accessorFn: (a) => a.requisition?.title ?? "—",
            id: "position",
            header: "Position",
            size: 180,
        },
        {
            accessorFn: (a) => a.status?.name ?? "—",
            id: "stage",
            header: "Stage",
            size: 140,
            Cell: ({ row }) => (
                <ToneChip tone="brand" color={row.original.status?.color ?? undefined} label={row.original.status?.name ?? "—"} dense />
            ),
        },
        {
            // Sorts on the NUMBER even though the cell renders a chip — sorting on the
            // rendered label would order "9d" after "40d".
            accessorFn: (a) => a.daysInStage ?? 0,
            id: "waiting",
            header: "Waiting",
            size: 110,
            Cell: ({ row }) => {
                const a = row.original;
                // A hired or rejected application carries no band: it is finished, not waiting.
                if (!a.stageAgeBand) return <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>—</Typography>;
                return (
                    <Chip
                        size="small"
                        variant="outlined"
                        color={a.stageAgeBand === "stalled" ? "error" : a.stageAgeBand === "ageing" ? "warning" : "default"}
                        label={`${a.daysInStage ?? 0}d`}
                    />
                );
            },
        },
        {
            accessorFn: (a) => Number(a.aiScore ?? a.ruleScore ?? 0),
            id: "score",
            header: "Score",
            size: 140,
            Cell: ({ row }) => {
                const a = row.original;
                const score = a.aiScore ?? a.ruleScore;
                if (score == null) return <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>—</Typography>;
                return (
                    <Chip
                        size="small"
                        variant="outlined"
                        color={a.scoreBand ? SCORE_BAND_META[a.scoreBand].color : "default"}
                        label={a.scoreBand ? `${SCORE_BAND_META[a.scoreBand].label} · ${Number(score).toFixed(0)}` : Number(score).toFixed(0)}
                    />
                );
            },
        },
        {
            accessorFn: (a) => a.applicant?.source?.name ?? "—",
            id: "source",
            header: "Source",
            size: 140,
        },
        {
            accessorFn: (a) => (a.appliedDate ? formatDate(a.appliedDate) : "—"),
            id: "applied",
            header: "Applied",
            size: 120,
        },
    ], []);

    return (
        <DrillDownDialog open={open} onClose={onClose} maxBodyHeight="70vh" bodyClassName="p-2">
            <Box sx={{ px: { xs: 0.5, sm: 1 }, pt: { xs: 1, sm: 1.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
                    <KTIcon iconName="people" className="fs-2" />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: { xs: 15, sm: 16.5 }, lineHeight: 1.3 }}>{title}</Typography>
                        <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                            {isLoading ? "Loading…" : `${rows.length} ${rows.length === 1 ? "candidate" : "candidates"}`}
                        </Typography>
                    </Box>
                </Stack>
            </Box>

            <MaterialTable
                columns={columns}
                data={rows}
                isLoading={isLoading}
                // Named per chart so a recruiter's column choices on the stage drill-down do
                // not silently rearrange the source one.
                tableName={statusId ? "RecruitmentByStage" : "RecruitmentBySource"}
                hideExportCenter={false}
                muiTableContainerProps={{ sx: { maxHeight: "52vh" } }}
            />
        </DrillDownDialog>
    );
};

export default ApplicationsDrillDown;
