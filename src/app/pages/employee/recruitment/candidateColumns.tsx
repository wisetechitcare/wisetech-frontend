import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import type { MRT_ColumnDef } from "material-react-table";
import { ToneChip } from "@app/modules/common/components/ui";
import type { Applicant } from "@services/recruitment";
import { formatCurrencyCompact } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";

/** Months → "3 yr 4 mo" / "7 mo". Raw month counts are unreadable in a cell. */
export const experienceLabel = (months?: number | null): string | null => {
  if (months == null || months <= 0) return null;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} yr` : null, m ? `${m} mo` : null].filter(Boolean).join(" ") + " experience";
};

export const fullName = (a: Applicant) =>
  [a.firstName, a.lastName].filter(Boolean).join(" ").trim() || a.email || a.phone || "Candidate";

export interface CandidateColumnOptions {
  actions?: (a: Applicant) => ReactNode;
  /** Org label when viewing All organizations. */
  orgName?: (companyId?: string | null) => string | null;
  sourceName?: (sourceId?: string | null) => string | null;
  /** Hide org column when already filtered to one company. */
  omit?: ("org" | "contact" | "role" | "experience" | "ctc" | "notice" | "source" | "added")[];
}

export function candidateColumns(
  opts: CandidateColumnOptions = {},
): MRT_ColumnDef<Applicant>[] {
  const omit = new Set(opts.omit ?? []);

  const columns: MRT_ColumnDef<Applicant>[] = [
    {
      accessorFn: fullName,
      id: "name",
      header: "Candidate",
      size: 200,
      Cell: ({ row }) => {
        const a = row.original;
        return (
          <Box>
            <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{fullName(a)}</Typography>
            {a.isBlacklisted ? (
              <ToneChip dense tone="danger" label="Blacklisted" />
            ) : null}
          </Box>
        );
      },
    },
    {
      accessorFn: (a) => opts.orgName?.(a.companyId) ?? "—",
      id: "org",
      header: "Organization",
      size: 160,
    },
    {
      accessorFn: (a) => [a.email, a.phone].filter(Boolean).join(" · ") || "—",
      id: "contact",
      header: "Contact",
      size: 200,
    },
    {
      accessorFn: (a) => [a.currentTitle, a.currentEmployer].filter(Boolean).join(" · ") || "—",
      id: "role",
      header: "Current role",
      size: 180,
    },
    {
      accessorFn: (a) => a.totalExperienceMonths ?? 0,
      id: "experience",
      header: "Experience",
      size: 130,
      Cell: ({ row }) => {
        const label = experienceLabel(row.original.totalExperienceMonths);
        return label ? (
          <ToneChip dense tone="neutral" label={label} />
        ) : (
          <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>—</Typography>
        );
      },
    },
    {
      accessorFn: (a) => (a.expectedCtc != null ? Number(a.expectedCtc) : -1),
      id: "ctc",
      header: "Expected CTC",
      size: 130,
      Cell: ({ row }) =>
        row.original.expectedCtc != null ? (
          <ToneChip dense tone="brand" label={`${formatCurrencyCompact(Number(row.original.expectedCtc))} expected`} />
        ) : (
          <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>—</Typography>
        ),
    },
    {
      accessorFn: (a) => a.noticePeriodDays ?? -1,
      id: "notice",
      header: "Notice",
      size: 130,
      Cell: ({ row }) => {
        const d = row.original.noticePeriodDays;
        if (d == null) return <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>—</Typography>;
        return (
          <ToneChip
            dense
            tone={d === 0 ? "success" : "neutral"}
            label={d === 0 ? "Immediate joiner" : `${d} days notice`}
          />
        );
      },
    },
    {
      accessorFn: (a) => opts.sourceName?.(a.sourceId) ?? "—",
      id: "source",
      header: "Source",
      size: 130,
    },
    {
      accessorFn: (a) => (a.createdAt ? formatDate(a.createdAt) : "—"),
      id: "added",
      header: "Added",
      size: 120,
    },
  ];

  const kept = columns.filter((c) => !omit.has(c.id as never));

  if (opts.actions) {
    kept.push({
      id: "actions",
      header: "Actions",
      // One compact row of icon buttons — never wrap (wrapping doubles row height).
      size: 168,
      minSize: 168,
      maxSize: 200,
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      Cell: ({ row }) => opts.actions!(row.original),
    });
  }

  return kept;
}
