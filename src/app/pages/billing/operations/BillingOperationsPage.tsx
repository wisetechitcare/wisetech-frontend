import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { TRIO, WtButton, ToneChip } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import {
  listProjectOverview,
  type ProjectOverviewRow, type ProjectOverviewParams, type ProjectOverviewSort,
  type PaymentStatus,
} from "@services/billingOperations";
import { BillingPageHeader, BillingStatusBadge } from "../components";
import { STAGE_LABEL } from "./operationUi";

/**
 * Billing Operations — the Accounts team's workspace, at PROJECT grain.
 *
 * One row per project, not per billing request. That distinction is the point:
 * a project carrying a signed PO that nobody has raised a bill against has no
 * billing operation at all, so it is invisible on the operation-grain list —
 * and it is exactly the row Accounts needs to chase. Here it appears with its
 * full PO value sitting in Pending.
 *
 * Runs on `MaterialTable`, the same engine and layout as Leads & Projects, so
 * column show/hide, per-user column preferences, export and the search dropdown
 * all come for free rather than being rebuilt here.
 *
 * Search, sorting and pagination are all SERVER-side (`manualFiltering` /
 * `manualSorting` / `manualPagination`). The money columns are cross-table
 * aggregates: sorting them in the browser would reorder one page while implying
 * the whole list was ranked, on the one screen where "how much is still owed"
 * has to be right.
 */

const DASH = "—";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "READY_FOR_PROFORMA", label: "Ready for Proforma" },
  { value: "PROFORMA_DRAFT", label: "Proforma Draft" },
  { value: "PROFORMA_GENERATED", label: "Proforma Generated" },
  { value: "PROFORMA_SENT", label: "Proforma Sent" },
  { value: "CLIENT_VIEWED", label: "Client Viewed" },
  { value: "PAYMENT_PENDING", label: "Payment Pending" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "FULLY_PAID", label: "Fully Paid" },
  { value: "PAYMENT_VERIFIED", label: "Payment Verified" },
  { value: "READY_FOR_INVOICE", label: "Ready for Invoice" },
  { value: "INVOICE_GENERATED", label: "Invoice Generated" },
  { value: "INVOICE_SENT", label: "Invoice Sent" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STAGE_OPTIONS = [
  { value: "", label: "All stages" },
  { value: "PROFORMA", label: "Proforma" },
  { value: "PAYMENT", label: "Payment" },
  { value: "INVOICE", label: "Invoice" },
  { value: "CLOSED", label: "Closed" },
];

const PO_OPTIONS = [
  { value: "", label: "Any PO status" },
  { value: "true", label: "PO approved only" },
];

/** Only these can be ordered in SQL; a header click on anything else is ignored. */
const SERVER_SORTABLE: ProjectOverviewSort[] = [
  "projectNumber", "projectName", "poValue", "receivedAmount",
  "pendingAmount", "lastPaymentAt", "nextFollowUpDate",
];

const BILL_STATUS_TONE: Record<PaymentStatus, "success" | "warning" | "indigo" | "cyan" | "neutral"> = {
  PENDING: "warning",
  PARTIALLY_PAID: "indigo",
  FULLY_PAID: "success",
  OVERPAID: "cyan",
  CANCELLED: "neutral",
};

const Money: React.FC<{ value: number | null | undefined; bold?: boolean; tone?: string }> = ({
  value, bold, tone,
}) => (
  <Typography sx={{ fontSize: "inherit", fontWeight: bold ? 700 : 500, color: tone ?? "inherit" }}>
    {value === null || value === undefined ? DASH : formatCurrencyDecimal(value)}
  </Typography>
);

const DateCell: React.FC<{ value: string | null | undefined }> = ({ value }) => (
  <span>{value ? formatDate(value) : DASH}</span>
);

const BillingOperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState({ status: "", stage: "", poApprovedOnly: "" });
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([
    { id: "projectNumber", desc: false },
  ]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

  useEffect(() => {
    const urlStatus = searchParams.get("status") || "";
    const urlStage = searchParams.get("stage") || "";
    if (urlStatus || urlStage) {
      setFilters((prev) => ({ ...prev, status: urlStatus, stage: urlStage }));
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  }, [searchParams]);

  const active = sorting[0];
  const sortBy = SERVER_SORTABLE.includes(active?.id as ProjectOverviewSort)
    ? (active.id as ProjectOverviewSort)
    : "projectNumber";

  const params: ProjectOverviewParams = {
    search: search || undefined,
    status: (filters.status || undefined) as ProjectOverviewParams["status"],
    stage: (filters.stage || undefined) as ProjectOverviewParams["stage"],
    poApprovedOnly: filters.poApprovedOnly === "true" ? true : undefined,
    sortBy,
    sortDir: active?.desc ? "desc" : "asc",
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  };

  // TEMPORARY: the Tracker shows an empty table on purpose while the sheet it is
  // meant to present is still being worked out. The query is disabled rather than
  // the rows being thrown away after fetching, so this costs no request either.
  // To restore: delete SHOW_DATA and the two lines that read it.
  const SHOW_DATA = false;

  const { data, isLoading } = useQuery({
    queryKey: ["billing-project-overview", params],
    queryFn: () => listProjectOverview(params),
    enabled: SHOW_DATA,
  });

  const projects = SHOW_DATA ? data?.projects ?? [] : [];
  const total = SHOW_DATA ? data?.pagination?.total ?? 0 : 0;

  const setFilter = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "projectNumber",
        header: "Project No",
        size: 165,
        Cell: ({ row }: any) => {
          const project: ProjectOverviewRow = row.original;
          return (
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: "inherit", fontWeight: 700 }}>
                {project.projectNumber ?? DASH}
              </Typography>
              <Typography
                sx={{ fontSize: 11, color: project.poApproved ? "success.main" : "text.secondary" }}
              >
                PO: {project.poStatus ?? DASH}
              </Typography>
            </Box>
          );
        },
      },
      {
        accessorKey: "projectName",
        header: "Project Name",
        size: 240,
        Cell: ({ cell }: any) => cell.getValue() || DASH,
      },
      {
        accessorKey: "handledByName",
        header: "Handled By",
        size: 160,
        enableSorting: false,
        Cell: ({ cell }: any) => cell.getValue() || DASH,
      },
      {
        accessorKey: "stage",
        header: "Stage",
        size: 120,
        enableSorting: false,
        Cell: ({ row }: any) => {
          const stage: ProjectOverviewRow["stage"] = row.original.stage;
          // No operation yet is a real, common state — not missing data.
          return stage ? (
            <ToneChip
              tone={stage === "CLOSED" ? "success" : stage === "PAYMENT" ? "warning" : "indigo"}
              label={STAGE_LABEL[stage]}
              dense
            />
          ) : (
            <ToneChip tone="neutral" label="Not billed" dense />
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 175,
        enableSorting: false,
        Cell: ({ row }: any) =>
          row.original.status ? <BillingStatusBadge status={row.original.status} /> : DASH,
      },
      {
        accessorKey: "followUpManagerName",
        header: "Follow-up Manager",
        size: 160,
        enableSorting: false,
        // ponytail: no follow-up owner in the schema yet. Wire it to the row's
        // `followUpManagerName` the moment the column exists — nothing else changes.
        Cell: ({ cell }: any) => cell.getValue() || DASH,
      },
      {
        accessorKey: "nextFollowUpDate",
        header: "Next Follow-up",
        size: 145,
        Cell: ({ cell }: any) => <DateCell value={cell.getValue()} />,
      },
      {
        accessorKey: "poValue",
        header: "PO Value",
        size: 150,
        Cell: ({ cell }: any) => <Money value={cell.getValue()} bold />,
      },
      {
        accessorKey: "receivedAmount",
        header: "Total Received",
        size: 150,
        Cell: ({ cell }: any) => <Money value={cell.getValue()} tone="success.main" />,
      },
      {
        accessorKey: "pendingAmount",
        header: "Total Pending",
        size: 165,
        Cell: ({ row }: any) => {
          const project: ProjectOverviewRow = row.original;
          return (
            <Box>
              <Money
                value={project.pendingAmount}
                bold
                tone={project.pendingAmount && project.pendingAmount > 0 ? "error.main" : undefined}
              />
              {project.pendingPercentage !== null && (
                <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                  {project.pendingPercentage}% of PO
                </Typography>
              )}
            </Box>
          );
        },
      },
      {
        accessorKey: "lastPaymentAt",
        header: "Last Payment Date",
        size: 145,
        Cell: ({ cell }: any) => <DateCell value={cell.getValue()} />,
      },
      {
        id: "billDate",
        accessorFn: (row: ProjectOverviewRow) => row.bill?.issueDate ?? null,
        header: "Bill Date",
        size: 130,
        enableSorting: false,
        Cell: ({ cell }: any) => <DateCell value={cell.getValue()} />,
      },
      {
        id: "billNo",
        accessorFn: (row: ProjectOverviewRow) => row.bill?.documentNumber ?? null,
        header: "Bill No",
        size: 175,
        enableSorting: false,
        Cell: ({ row }: any) => {
          const bill: ProjectOverviewRow["bill"] = row.original.bill;
          return bill ? (
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: "inherit", fontWeight: 600 }}>{bill.documentNumber}</Typography>
              <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>
                {bill.kind === "TAX_INVOICE" ? "Tax Invoice" : "Proforma"}
              </Typography>
            </Box>
          ) : (
            DASH
          );
        },
      },
      {
        id: "billAmount",
        accessorFn: (row: ProjectOverviewRow) => row.bill?.amount ?? null,
        header: "Bill Amount",
        size: 150,
        enableSorting: false,
        Cell: ({ cell }: any) => <Money value={cell.getValue()} />,
      },
      {
        id: "billStatus",
        accessorFn: (row: ProjectOverviewRow) => row.bill?.paymentStatus ?? null,
        header: "Bill Payment",
        size: 150,
        enableSorting: false,
        Cell: ({ row }: any) => {
          const status: PaymentStatus | null | undefined = row.original.bill?.paymentStatus;
          return status ? (
            <ToneChip
              tone={BILL_STATUS_TONE[status]}
              label={status.replace(/_/g, " ").toLowerCase()}
              dense
            />
          ) : (
            DASH
          );
        },
      },
    ],
    [],
  );

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="chart-simple"
        trio={TRIO.blue}
        title="Billing Tracker"
        description="Every project and where its money stands — PO value, collected, pending and the latest bill."
        action={
          <WtButton
            ghost size="small"
            onClick={() => navigate("/billing/operations?status=READY_FOR_PROFORMA")}
            startIcon={<KTIcon iconName="inbox" className="fs-6" />}
            sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
          >
            Accounts Queue
          </WtButton>
        }
      />

      <MaterialTable
        data={projects}
        columns={columns}
        tableName="BillingProjectOverview"
        isLoading={isLoading}
        searchPlaceholder="Search project number or name…"
        enableColumnSpecificSearch={true}
        enableColumnResizing={true}
        layoutMode="semantic"
        defaultSorting={[{ id: "projectNumber", desc: false }]}
        // The server owns all three. `data` is one page, so any local pass would
        // search, sort and count only the rows already on screen.
        manualFiltering={true}
        onSearchChange={setSearch}
        manualSorting={true}
        onSortingChange={setSorting}
        manualPagination={true}
        rowCount={total}
        paginationState={pagination}
        onPaginationChange={setPagination}
        renderTopToolbarRightActions={() => (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ py: 0.5 }}>
            <TextField
              select size="small" label="Status" value={filters.status}
              onChange={(e) => setFilter("status", e.target.value)}
              sx={{ minWidth: 170 }}
            >
              {STATUS_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value} sx={{ fontSize: 13 }}>{o.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              select size="small" label="Stage" value={filters.stage}
              onChange={(e) => setFilter("stage", e.target.value)}
              sx={{ minWidth: 140 }}
            >
              {STAGE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value} sx={{ fontSize: 13 }}>{o.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              select size="small" label="PO" value={filters.poApprovedOnly}
              onChange={(e) => setFilter("poApprovedOnly", e.target.value)}
              sx={{ minWidth: 160 }}
            >
              {PO_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value} sx={{ fontSize: 13 }}>{o.label}</MenuItem>
              ))}
            </TextField>
          </Stack>
        )}
        muiTableContainerProps={{ sx: { maxHeight: "700px", overflowX: "auto" } }}
        muiTableProps={{
          sx: {
            // Separated rows with a 4px gutter — the Leads & Projects geometry.
            borderCollapse: "separate",
            borderSpacing: "0 4px !important",
            minWidth: "2200px",
          },
          muiTableBodyRowProps: ({ row }: any) => {
            const project: ProjectOverviewRow = row.original;
            // The left accent carries PO state, the fact that gates every money
            // figure on the row — matching how the Leads table accents by status.
            const accent = project.poApproved
              ? "success.main"
              : project.poStatus
                ? "warning.main"
                : "transparent";
            return {
              onClick: () => navigate(`/employee/lead/${project.leadId}?tab=billing`),
              sx: {
                cursor: "pointer",
                // Tokens, not hex: this table has to survive the dark theme.
                backgroundColor: "background.paper",
                transition: "background-color 0.15s ease",
                "&:hover": { backgroundColor: "action.hover" },
                "& .MuiTableCell-root": {
                  fontSize: "13.5px",
                  fontFamily: "Inter",
                  fontWeight: 500,
                  padding: "6px 10px !important",
                  border: "none",
                  color: "text.primary",
                  whiteSpace: "nowrap",
                  backgroundColor: "transparent",
                },
                "& .MuiTableCell-root:first-of-type": {
                  borderTopLeftRadius: "12px",
                  borderBottomLeftRadius: "12px",
                  borderLeft: `3px solid`,
                  borderLeftColor: accent,
                },
                "& .MuiTableCell-root:last-of-type": {
                  borderTopRightRadius: "12px",
                  borderBottomRightRadius: "12px",
                },
              },
            };
          },
        }}
      />
    </Box>
  );
};

export default BillingOperationsPage;
