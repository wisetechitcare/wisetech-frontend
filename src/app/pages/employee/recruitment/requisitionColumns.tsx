import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import type { MRT_ColumnDef } from "material-react-table";
import { ToneChip, type SemanticTone } from "@app/modules/common/components/ui";
import type { JobRequisition } from "@services/recruitment";
import { formatCurrencyCompact } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";

/**
 * How a role (requisition) is shown in a table — defined once for Cards/List parity.
 * Same MaterialTable engine as Pipeline list and overview drill-downs.
 */

export const stageOf = (r: JobRequisition): { label: string; tone: SemanticTone } =>
  r.approvalPending
    ? { label: "Awaiting approval", tone: "warning" }
    : r.status === 1
      ? { label: "Open", tone: "success" }
      : r.status === 2
        ? { label: "Closed", tone: "danger" }
        : { label: "Draft", tone: "neutral" };

/** Editable unless a legacy approval card is still in flight. */
export const isEditable = (r: JobRequisition) => !r.approvalPending;

/** Empty never-opened draft — FE heuristic; server re-checks apps/postings/pending. */
export const canPermanentDelete = (r: JobRequisition) => r.status === 0 && !r.approvalPending;

export const ctcLabel = (
  min?: number | string | null,
  max?: number | string | null,
  currency?: string,
) => {
  const lo = min == null || min === "" ? null : Number(min);
  const hi = max == null || max === "" ? null : Number(max);
  const money = (n: number) => formatCurrencyCompact(n, currency);
  if (lo != null && hi != null) return `${money(lo)} – ${money(hi)}`;
  if (lo != null) return `From ${money(lo)}`;
  if (hi != null) return `Up to ${money(hi)}`;
  return null;
};

export interface RequisitionColumnOptions {
  actions?: (r: JobRequisition) => ReactNode;
  /** Resolve branch id → display name for the Branch column. */
  branchName?: (branchId: string) => string | undefined;
  omit?: ("ref" | "status" | "filled" | "branch" | "lifecycle" | "ctc" | "starts")[];
}

export function requisitionColumns(
  opts: RequisitionColumnOptions = {},
): MRT_ColumnDef<JobRequisition>[] {
  const omit = new Set(opts.omit ?? []);

  const columns: MRT_ColumnDef<JobRequisition>[] = [
    {
      accessorFn: (r) => r.title,
      id: "title",
      header: "Role",
      size: 220,
      Cell: ({ row }) => (
        <Box>
          <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{row.original.title}</Typography>
          {row.original.prefix ? (
            <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>{row.original.prefix}</Typography>
          ) : null}
        </Box>
      ),
    },
    {
      accessorFn: (r) => r.prefix ?? "—",
      id: "ref",
      header: "Ref",
      size: 120,
    },
    {
      accessorFn: (r) => stageOf(r).label,
      id: "status",
      header: "Status",
      size: 150,
      Cell: ({ row }) => {
        const r = row.original;
        const meta = stageOf(r);
        return (
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
            {r.isActive === false ? <ToneChip tone="neutral" label="Archived" dense /> : null}
            <ToneChip tone={meta.tone} label={meta.label} dense />
          </Box>
        );
      },
    },
    {
      accessorFn: (r) => r.filledCount / Math.max(r.headcount, 1),
      id: "filled",
      header: "Filled",
      size: 110,
      Cell: ({ row }) => (
        <ToneChip
          dense
          tone="brand"
          label={`${row.original.filledCount}/${row.original.headcount} filled`}
        />
      ),
    },
    {
      accessorFn: (r) =>
        (r.branchId && opts.branchName?.(r.branchId)) || "—",
      id: "branch",
      header: "Branch",
      size: 140,
    },
    {
      accessorFn: (r) => r.requisitionStage?.name ?? "—",
      id: "lifecycle",
      header: "Lifecycle",
      size: 140,
      Cell: ({ row }) =>
        row.original.requisitionStage?.name ? (
          <ToneChip dense tone="indigo" label={row.original.requisitionStage.name} />
        ) : (
          <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>—</Typography>
        ),
    },
    {
      accessorFn: (r) => ctcLabel(r.minCtc, r.maxCtc, r.currency) ?? "",
      id: "ctc",
      header: "CTC",
      size: 160,
      Cell: ({ row }) => {
        const label = ctcLabel(row.original.minCtc, row.original.maxCtc, row.original.currency);
        return label ? (
          <Typography sx={{ fontSize: 13 }}>{label}</Typography>
        ) : (
          <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>—</Typography>
        );
      },
    },
    {
      accessorFn: (r) => (r.targetStartDate ? formatDate(r.targetStartDate) : "—"),
      id: "starts",
      header: "Starts",
      size: 120,
    },
  ];

  const kept = columns.filter((c) => !omit.has(c.id as never));

  if (opts.actions) {
    kept.push({
      id: "actions",
      header: "Actions",
      // Compact icon row — never wrap (wrapping doubles list row height).
      size: 148,
      minSize: 148,
      maxSize: 180,
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      Cell: ({ row }) => opts.actions!(row.original),
    });
  }

  return kept;
}
