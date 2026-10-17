import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import type { MRT_ColumnDef } from "material-react-table";
import { ToneChip } from "@app/modules/common/components/ui";
import type { JobPosting } from "@services/recruitment";

/**
 * How a job advert is shown in a table — defined once for Cards/List parity.
 */

export interface PostingColumnOptions {
  actions?: (p: JobPosting) => ReactNode;
  omit?: ("ref" | "status" | "location" | "type" | "salary")[];
}

export function postingColumns(
  opts: PostingColumnOptions = {},
): MRT_ColumnDef<JobPosting>[] {
  const omit = new Set(opts.omit ?? []);

  const columns: MRT_ColumnDef<JobPosting>[] = [
    {
      accessorFn: (p) => p.title,
      id: "title",
      header: "Advert",
      size: 220,
      Cell: ({ row }) => (
        <Box>
          <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{row.original.title}</Typography>
          {row.original.requisition?.prefix ? (
            <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
              {row.original.requisition.prefix}
            </Typography>
          ) : null}
        </Box>
      ),
    },
    {
      accessorFn: (p) => p.requisition?.prefix ?? "—",
      id: "ref",
      header: "Ref",
      size: 120,
    },
    {
      accessorFn: (p) => (p.isPublished ? "Published" : "Draft"),
      id: "status",
      header: "Status",
      size: 120,
      Cell: ({ row }) => (
        <ToneChip
          tone={row.original.isPublished ? "success" : "warning"}
          label={row.original.isPublished ? "Published" : "Draft"}
          dense
        />
      ),
    },
    {
      accessorFn: (p) => p.location ?? (p.isRemote ? "Remote" : "—"),
      id: "location",
      header: "Location",
      size: 140,
      Cell: ({ row }) => {
        const p = row.original;
        if (!p.location && !p.isRemote) {
          return <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>—</Typography>;
        }
        return (
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
            {p.location ? <ToneChip dense tone="neutral" label={p.location} /> : null}
            {p.isRemote ? <ToneChip dense tone="cyan" label="Remote" /> : null}
          </Box>
        );
      },
    },
    {
      accessorFn: (p) => p.employmentType ?? "—",
      id: "type",
      header: "Type",
      size: 120,
    },
    {
      accessorFn: (p) => (p.showSalary ? "Shown" : "Hidden"),
      id: "salary",
      header: "Salary",
      size: 110,
      Cell: ({ row }) =>
        row.original.showSalary ? (
          <ToneChip dense tone="success" label="Salary shown" />
        ) : (
          <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>—</Typography>
        ),
    },
  ];

  const kept = columns.filter((c) => !omit.has(c.id as never));

  if (opts.actions) {
    kept.push({
      id: "actions",
      header: "Actions",
      // Publish switch + icon actions on one line.
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
