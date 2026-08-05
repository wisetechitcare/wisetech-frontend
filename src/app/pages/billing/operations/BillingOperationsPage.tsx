import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Pagination, Stack, TextField, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { TRIO, WtButton, ToneChip } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate, formatDateTime } from "@utils/dateFormats";
import {
  listBillingOperations, getBillingOperationStatistics,
  type BillingOperation, type OperationListParams,
} from "@services/billingOperations";
import {
  BillingPageHeader, BillingTable, BillingStatsCard, BillingStatusBadge,
  type BillingColumn,
} from "../components";
import { DueChip, STAGE_LABEL, STAGE_TRIO } from "./operationUi";

/**
 * Billing Operations — the Accounts team's workspace.
 *
 * One row per approved billing request, carrying its whole financial journey.
 * The point of the page is that Accounts stops correlating four screens: current
 * stage, what is owed, and when it is due are all on one line.
 *
 * Filtering, sorting and pagination are all SERVER-side. A collections list that
 * pages in the browser silently lies about totals as soon as it outgrows one
 * page, and this is the screen where "how much is overdue" has to be right.
 */

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

const FILTERS = [
  { key: "status", label: "Status", options: STATUS_OPTIONS },
  {
    key: "stage",
    label: "Stage",
    options: [
      { value: "", label: "All stages" },
      { value: "PROFORMA", label: "Proforma" },
      { value: "PAYMENT", label: "Payment" },
      { value: "INVOICE", label: "Invoice" },
      { value: "CLOSED", label: "Closed" },
    ],
  },
  {
    key: "dueState",
    label: "Due",
    options: [
      { value: "", label: "Any" },
      { value: "OVERDUE", label: "Overdue" },
      { value: "DUE_TODAY", label: "Due today" },
      { value: "UPCOMING", label: "Upcoming" },
    ],
  },
  {
    key: "sortBy",
    label: "Sort by",
    options: [
      { value: "lastActivityAt", label: "Last updated" },
      { value: "dueDate", label: "Due date" },
      { value: "outstandingAmount", label: "Outstanding" },
      { value: "totalAmount", label: "Total amount" },
      { value: "approvedAt", label: "Approval date" },
      { value: "operationNumber", label: "Operation no" },
    ],
  },
];

const PAGE_SIZE = 25;

const BillingOperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Record<string, string>>({
    status: "", stage: "", dueState: "", sortBy: "lastActivityAt",
  });
  const [amounts, setAmounts] = useState({ minAmount: "", maxAmount: "" });
  const [page, setPage] = useState(1);

  const params: OperationListParams = {
    status: (filters.status || undefined) as OperationListParams["status"],
    stage: (filters.stage || undefined) as OperationListParams["stage"],
    dueState: (filters.dueState || undefined) as OperationListParams["dueState"],
    sortBy: filters.sortBy || "lastActivityAt",
    sortDir: filters.sortBy === "dueDate" ? "asc" : "desc",
    minAmount: amounts.minAmount ? Number(amounts.minAmount) : undefined,
    maxAmount: amounts.maxAmount ? Number(amounts.maxAmount) : undefined,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["billing-operations", params],
    queryFn: () => listBillingOperations(params),
  });

  const { data: stats } = useQuery({
    queryKey: ["billing-operations", "statistics"],
    queryFn: getBillingOperationStatistics,
  });

  const operations = data?.operations ?? [];
  const pagination = data?.pagination;

  /** Clicking a tile filters the table under it — the tile IS the query. */
  const applyTile = (next: Partial<Record<string, string>>) => {
    setFilters((prev) => ({ ...prev, status: "", stage: "", dueState: "", ...next }));
    setPage(1);
  };

  const columns: BillingColumn<BillingOperation>[] = [
    {
      key: "operationNumber",
      header: "Operation No",
      width: 150,
      render: (row) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{row.operationNumber}</Typography>
          <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{row.requestNumber}</Typography>
        </Box>
      ),
      searchValue: (row) => `${row.operationNumber} ${row.requestNumber}`,
      sortValue: (row) => row.operationNumber,
    },
    {
      key: "project",
      header: "Project / Client",
      render: (row) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} noWrap>{row.projectName ?? "—"}</Typography>
          <Typography sx={{ fontSize: 11, color: "text.secondary" }} noWrap>{row.clientName ?? "—"}</Typography>
        </Box>
      ),
      searchValue: (row) => `${row.projectName ?? ""} ${row.clientName ?? ""}`,
    },
    {
      key: "projectManager",
      header: "Project Manager",
      width: 150,
      render: (row) => row.projectManagerName ?? "—",
      searchValue: (row) => row.projectManagerName,
    },
    {
      key: "stage",
      header: "Stage",
      width: 110,
      render: (row) => (
        <ToneChip
          tone={row.stage === "CLOSED" ? "success" : row.stage === "PAYMENT" ? "warning" : "indigo"}
          label={STAGE_LABEL[row.stage]}
          dense
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      width: 165,
      render: (row) => <BillingStatusBadge status={row.status} />,
    },
    {
      key: "outstandingAmount",
      header: "Outstanding",
      width: 140,
      align: "right",
      render: (row) => (
        <Typography
          sx={{
            fontSize: 12.5,
            fontWeight: 700,
            color: row.due.state === "OVERDUE" ? "error.main" : "text.primary",
          }}
        >
          {formatCurrencyDecimal(Number(row.outstandingAmount))}
        </Typography>
      ),
      sortValue: (row) => Number(row.outstandingAmount),
    },
    {
      key: "dueDate",
      header: "Due Date",
      width: 130,
      render: (row) => (
        <Box>
          <Typography sx={{ fontSize: 12 }}>{row.dueDate ? formatDate(row.dueDate) : "—"}</Typography>
          <DueChip due={row.due} dueDate={row.dueDate} />
        </Box>
      ),
      sortValue: (row) => row.dueDate ?? "",
    },
    {
      key: "lastActivityAt",
      header: "Last Updated",
      width: 150,
      render: (row) => (
        <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
          {formatDateTime(row.lastActivityAt)}
        </Typography>
      ),
      sortValue: (row) => row.lastActivityAt,
    },
  ];

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="chart-simple"
        trio={TRIO.blue}
        title="Billing Operations"
        description="Every approved billing request and where it stands — proforma, payment, invoice."
        action={
          <WtButton
            ghost size="small"
            onClick={() => navigate("/billing/accounts")}
            startIcon={<KTIcon iconName="inbox" className="fs-6" />}
            sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
          >
            Accounts Queue
          </WtButton>
        }
      />

      {/* KPI tiles. Each one is a saved query — clicking filters the table below,
          so the number and the rows can never tell different stories. */}
      <Box
        sx={{
          display: "grid", gap: 1.25, mb: 2,
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        }}
      >
        <BillingStatsCard
          label="Ready for Proforma" icon="document" trio={TRIO.blue}
          value={stats?.readyForProforma ?? 0} hint="Awaiting a proforma"
          onClick={() => applyTile({ status: "READY_FOR_PROFORMA" })}
        />
        <BillingStatsCard
          label="Pending Client Response" icon="send" trio={TRIO.purple}
          value={stats?.pendingClientResponse ?? 0} hint="Sent, not yet acted on"
        />
        <BillingStatsCard
          label="Pending Payments" icon="dollar" trio={TRIO.amber}
          value={stats?.pendingPayments ?? 0} hint="Awaiting first receipt"
          onClick={() => applyTile({ status: "PAYMENT_PENDING" })}
        />
        <BillingStatsCard
          label="Partial Payments" icon="chart-pie-simple" trio={TRIO.amber}
          value={stats?.partialPayments ?? 0} hint="Part-paid"
          onClick={() => applyTile({ status: "PARTIALLY_PAID" })}
        />
        <BillingStatsCard
          label="Overdue" icon="information-5" trio={TRIO.rose}
          value={stats?.overduePayments ?? 0} hint="Past the due date"
          onClick={() => applyTile({ dueState: "OVERDUE" })}
        />
        <BillingStatsCard
          label="Ready for Invoice" icon="receipt-cutoff" trio={TRIO.cyan}
          value={stats?.readyForInvoice ?? 0} hint="Payment verified"
          onClick={() => applyTile({ status: "READY_FOR_INVOICE" })}
        />
        <BillingStatsCard
          label="Completed" icon="check-circle" trio={TRIO.green}
          value={stats?.completed ?? 0} hint="Closed out"
          onClick={() => applyTile({ status: "COMPLETED" })}
        />
        <BillingStatsCard
          label="Outstanding" icon="wallet" trio={TRIO.rose}
          value={formatCurrencyDecimal(stats?.outstandingAmount ?? 0)} hint="Still owed"
        />
        <BillingStatsCard
          label="Collected" icon="check-square" trio={TRIO.green}
          value={formatCurrencyDecimal(stats?.collectedAmount ?? 0)} hint="Received to date"
        />
      </Box>

      {/* Amount range sits outside BillingTable's dropdown filters because it is two
          numeric inputs, not a select. */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1.5 }}>
        <TextField
          size="small" label="Min amount" type="number" value={amounts.minAmount}
          onChange={(event) => { setAmounts((p) => ({ ...p, minAmount: event.target.value })); setPage(1); }}
          InputLabelProps={{ shrink: true }} sx={{ maxWidth: 160 }}
        />
        <TextField
          size="small" label="Max amount" type="number" value={amounts.maxAmount}
          onChange={(event) => { setAmounts((p) => ({ ...p, maxAmount: event.target.value })); setPage(1); }}
          InputLabelProps={{ shrink: true }} sx={{ maxWidth: 160 }}
        />
      </Stack>

      <BillingTable
        rows={operations}
        columns={columns}
        getRowId={(row) => row.id}
        loading={isLoading}
        onRowClick={(row) => navigate(`/billing/operations/${row.id}`)}
        searchPlaceholder="Search operation or request number…"
        filters={FILTERS}
        filterValues={filters}
        onFilterChange={(key, value) => { setFilters((prev) => ({ ...prev, [key]: value })); setPage(1); }}
        emptyTitle="No billing operations"
        emptyDescription="An operation opens automatically when a billing request is approved."
        minWidth={1200}
        pageSize={PAGE_SIZE}
      />

      {pagination && pagination.pageCount > 1 && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            {pagination.total} operations
          </Typography>
          <Pagination
            size="small"
            count={pagination.pageCount}
            page={pagination.page}
            onChange={(_event, next) => setPage(next)}
          />
        </Stack>
      )}
    </Box>
  );
};

export default BillingOperationsPage;
