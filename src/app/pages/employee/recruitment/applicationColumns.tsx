import type { ReactNode } from "react";
import { Box, Typography, Chip } from "@mui/material";
import type { MRT_ColumnDef } from "material-react-table";
import { ToneChip } from "@app/modules/common/components/ui";
import { SCORE_BAND_META, type Application } from "@services/recruitment";
import { formatDate } from "@utils/dateFormats";

/**
 * How an application is shown in a table — defined ONCE.
 *
 * The pipeline's List view and the overview drill-downs are the same records seen from two
 * places. They were two hand-written tables with different columns, so "Score" meant a bare
 * number in one and a band in the other, and neither could sort on the value it displayed.
 * Anything added to one would have to be remembered for the other.
 *
 * Every consumer feeds these to the shared `MaterialTable`, which is what brings sorting,
 * per-column search, show/hide, export and per-user column preferences. A hand-rolled
 * `<Table>` has none of that.
 */

/** The full name, or a dash — never a stray space from a missing surname. */
export const applicantName = (a: Application): string =>
    `${a.applicant?.firstName ?? ""} ${a.applicant?.lastName ?? ""}`.trim() || "—";

/**
 * A number of days, said in full.
 *
 * "42d" saves four characters and costs the reader a translation. The column is wide enough
 * for the word, and the same wording is already used in the tooltips on this page — so the
 * abbreviation was the odd one out rather than the norm.
 */
export const daysLabel = (days: number): string => (days === 1 ? "1 day" : `${days} days`);

export interface ApplicationColumnOptions {
    /** Adds a trailing actions column. Omitted where the table is read-only. */
    actions?: (application: Application) => ReactNode;
    /** Drops columns a particular view already states elsewhere (e.g. a stage-filtered list). */
    omit?: ("ref" | "position" | "stage" | "waiting" | "score" | "source" | "applied")[];
}

export function applicationColumns(opts: ApplicationColumnOptions = {}): MRT_ColumnDef<Application>[] {
    const omit = new Set(opts.omit ?? []);

    const columns: MRT_ColumnDef<Application>[] = [
        {
            accessorFn: (a) => a.prefix ?? "—",
            id: "ref",
            header: "Ref",
            size: 110,
        },
        {
            accessorFn: applicantName,
            id: "candidate",
            header: "Candidate",
            size: 200,
            Cell: ({ row }) => (
                <Box>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{applicantName(row.original)}</Typography>
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
            // Sorts on the NUMBER while rendering a chip. Sorting the rendered label would
            // order "9d" after "40d", which is the kind of wrong that looks like a feature.
            accessorFn: (a) => a.daysInStage ?? 0,
            id: "waiting",
            header: "Waiting",
            size: 130,
            Cell: ({ row }) => {
                const a = row.original;
                // A hired or rejected application carries no band: it is finished, not waiting.
                if (!a.stageAgeBand) return <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>—</Typography>;
                return (
                    <Chip
                        size="small"
                        variant="outlined"
                        color={a.stageAgeBand === "stalled" ? "error" : a.stageAgeBand === "ageing" ? "warning" : "default"}
                        label={daysLabel(a.daysInStage ?? 0)}
                    />
                );
            },
        },
        {
            accessorFn: (a) => Number(a.aiScore ?? a.ruleScore ?? 0),
            id: "score",
            header: "Score",
            size: 150,
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
    ];

    const kept = columns.filter((c) => !omit.has(c.id as never));

    if (opts.actions) {
        kept.push({
            id: "actions",
            header: "Actions",
            size: 260,
            // Buttons are not data: sorting, filtering and exporting them is meaningless,
            // and leaving them enabled offers the user three controls that do nothing.
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            Cell: ({ row }) => opts.actions!(row.original),
        });
    }

    return kept;
}
