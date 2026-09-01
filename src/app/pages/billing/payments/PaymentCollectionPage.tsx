import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, MenuItem, Pagination, Stack, TextField, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { TRIO, WtButton } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate, formatDateTime } from "@utils/dateFormats";
import { listPayments, getPaymentStatistics, type PaymentListItem, type PaymentListParams } from "@services/payments";
import {
  BillingPageHeader, BillingTable, BillingStatsCard, BillingStatusBadge, ProjectFilterBanner,
  type BillingColumn,
} from "../components";
import { DueChip } from "../operations/operationUi";
import RecordPaymentDialog from "./RecordPaymentDialog";

/**
 * Payment Collection — the finance team's workspace.
 *
 * One row per billing operation that has reached the proforma stage. There is
 * no separate "payment" entity to list: a collection IS its billing operation,
 * viewed here through the payment lens instead of the workflow lens Billing
 * Operations uses.
 */

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "FULLY_PAID", label: "Fully Paid" },
  { value: "OVERPAID", label: "Overpaid" },
  { value: "CANCELLED", label: "Cancelled" },
];

const VERIFICATION_OPTIONS = [
  { value: "", label: "Any verification" },
  { value: "NOT_VERIFIED", label: "Not Verified" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
];

const DUE_OPTIONS = [
  { value: "", label: "Any due state" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "DUE_TODAY", label: "Due Today" },
  { value: "UPCOMING", label: "Upcoming" },
];

const FILTERS = [
  { key: "paymentStatus", label: "Payment Status", options: STATUS_OPTIONS },
  { key: "verificationStatus", label: "Verification", options: VERIFICATION_OPTIONS },
  { key: "dueState", label: "Due", options: DUE_OPTIONS },
];

const PAGE_SIZE = 25;

const PaymentCollectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Record<string, string>>({
    paymentStatus: "", verificationStatus: "", dueState: "",
  });
  const [amounts, setAmounts] = useState({ minAmount: "", maxAmount: "" });
  const [page, setPage] = useState(1);
  const [recordTarget, setRecordTarget] = useState<PaymentListItem | null>(null);
  // Drill-down from a project's Financial Workspace arrives pre-filtered. Read it
  // from the URL so the link is shareable and Back/Forward behave.
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get("projectId") || undefined;
  const clearProjectFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("projectId");
    setSearchParams(next, { replace: true });
  };

  const params: PaymentListParams = {
    projectId,
    paymentStatus: (filters.paymentStatus || undefined) as PaymentListParams["paymentStatus"],
    verificationStatus: (filters.verificationStatus || undefined) as PaymentListParams["verificationStatus"],
    dueState: (filters.dueState || undefined) as PaymentListParams["dueState"],
    sortBy: "lastPaymentAt",
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["payments", params],
    queryFn: () => listPayments(params),
  });

  const { data: stats } = useQuery({
    queryKey: ["payments", "statistics"],
    queryFn: getPaymentStatistics,
  });

  const applyTile = (next: Partial<Record<string, string>>) => {
    setFilters({ paymentStatus: "", verificationStatus: "", dueState: "", ...next });
    setPage(1);
  };

  const payments = data?.payments ?? [];
  const pagination = data?.pagination;

  const columns: BillingColumn<PaymentListItem>[] = [
    {
      key: "operationNumber",
      header: "Payment No",
      width: 200,
      render: (row) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{row.operationNumber}</Typography>
          <Typography sx={{ fontSize: 11, color: "text.secondary" }} noWrap>
            {row.requestNumber}{row.proformaNumber ? ` · ${row.proformaNumber}` : ""}
          </Typography>
        </Box>
      ),
      searchValue: (row) => `${row.operationNumber} ${row.requestNumber} ${row.proformaNumber ?? ""}`,
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
      key: "paymentStatus",
      header: "Payment Status",
      width: 140,
      render: (row) => <BillingStatusBadge status={row.paymentStatus} />,
    },
    {
      key: "verificationStatus",
      header: "Verification",
      width: 130,
      render: (row) => <BillingStatusBadge status={row.verificationStatus} />,
    },
    {
      key: "outstandingAmount",
      header: "Outstanding",
      width: 130,
      align: "right",
      render: (row) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: row.due.state === "OVERDUE" ? "error.main" : "text.primary" }}>
          {formatCurrencyDecimal(Number(row.outstandingAmount))}
        </Typography>
      ),
      sortValue: (row) => Number(row.outstandingAmount),
    },
    {
      key: "collectedAmount",
      header: "Collected",
      width: 130,
      align: "right",
      render: (row) => formatCurrencyDecimal(Number(row.collectedAmount)),
      sortValue: (row) => Number(row.collectedAmount),
    },
    {
      key: "collectionPercentage",
      header: "Progress",
      width: 90,
      align: "right",
      render: (row) => `${Math.round(row.collectionPercentage)}%`,
      sortValue: (row) => row.collectionPercentage,
    },
    {
      key: "dueDate",
      header: "Due Date",
      width: 130,
      render: (row) => (
        <Box>
          <Typography sx={{ fontSize: 12 }}>{row.dueDate ? formatDate(row.dueDate) : "—"}</Typography>
          <DueChip due={row.due} />
        </Box>
      ),
      sortValue: (row) => row.dueDate ?? "",
    },
    {
      key: "lastPaymentAt",
      header: "Last Payment",
      width: 140,
      render: (row) => (
        <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
          {row.lastPaymentAt ? formatDateTime(row.lastPaymentAt) : "—"}
        </Typography>
      ),
      sortValue: (row) => row.lastPaymentAt ?? "",
    },
  ];

  return (
    <Box sx={{ maxWidth: 1700, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="dollar"
        trio={TRIO.green}
        title="Payment Collection"
        description="Record, verify and track client payments against every issued proforma."
        action={
          <WtButton
            ghost size="small"
            onClick={() => navigate("/billing/operations")}
            startIcon={<KTIcon iconName="chart-simple" className="fs-6" />}
            sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
          >
            Billing Operations
          </WtButton>
        }
      />

      {projectId && (
        <ProjectFilterBanner
          projectName={payments[0]?.projectName}
          onClear={clearProjectFilter}
          onBackToProject={() => navigate(`/employee/lead/${projectId}?tab=billing`)}
        />
      )}

      <Box sx={{ display: "grid", gap: 1.25, mb: 2, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <BillingStatsCard label="Pending" icon="time" trio={TRIO.slate} value={stats?.pendingPayments ?? 0}
          hint="No receipt yet" onClick={() => applyTile({ paymentStatus: "PENDING" })} />
        <BillingStatsCard label="Partial" icon="chart-pie-simple" trio={TRIO.amber} value={stats?.partialPayments ?? 0}
          hint="Part-paid" onClick={() => applyTile({ paymentStatus: "PARTIALLY_PAID" })} />
        <BillingStatsCard label="Fully Paid" icon="check-circle" trio={TRIO.green} value={stats?.fullyPaid ?? 0}
          hint="Collected in full" onClick={() => applyTile({ paymentStatus: "FULLY_PAID" })} />
        <BillingStatsCard label="Awaiting Verification" icon="shield-tick" trio={TRIO.purple}
          value={stats?.awaitingVerification ?? 0} hint="Receipts to check"
          onClick={() => applyTile({ verificationStatus: "UNDER_REVIEW" })} />
        <BillingStatsCard label="Overdue" icon="information-5" trio={TRIO.rose} value={stats?.overduePayments ?? 0}
          hint="Past the due date" onClick={() => applyTile({ dueState: "OVERDUE" })} />
        <BillingStatsCard label="Ready for Invoice" icon="receipt-cutoff" trio={TRIO.cyan}
          value={stats?.readyForInvoice ?? 0} hint="Fully paid & verified" />
        <BillingStatsCard label="Collected Today" icon="calendar-tick" trio={TRIO.green}
          value={formatCurrencyDecimal(stats?.collectedToday ?? 0)} />
        <BillingStatsCard label="Collected This Month" icon="calendar-8" trio={TRIO.green}
          value={formatCurrencyDecimal(stats?.collectedThisMonth ?? 0)} />
        <BillingStatsCard label="Outstanding" icon="wallet" trio={TRIO.rose}
          value={formatCurrencyDecimal(stats?.outstandingAmount ?? 0)} />
        <BillingStatsCard label="Total Collections" icon="chart-simple-2" trio={TRIO.blue}
          value={formatCurrencyDecimal(stats?.totalCollections ?? 0)} />
        <BillingStatsCard label="Avg. Collection Time" icon="timer" trio={TRIO.slate}
          value={stats?.averageCollectionDays !== null && stats?.averageCollectionDays !== undefined
            ? `${stats.averageCollectionDays}d` : "—"}
          hint="Issue to full payment" />
      </Box>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1.5 }}>
        <TextField
          size="small" label="Min amount" type="number" value={amounts.minAmount}
          onChange={(event) => setAmounts((p) => ({ ...p, minAmount: event.target.value }))}
          InputLabelProps={{ shrink: true }} sx={{ maxWidth: 160 }}
        />
        <TextField
          size="small" label="Max amount" type="number" value={amounts.maxAmount}
          onChange={(event) => setAmounts((p) => ({ ...p, maxAmount: event.target.value }))}
          InputLabelProps={{ shrink: true }} sx={{ maxWidth: 160 }}
        />
      </Stack>

      <BillingTable
        rows={payments}
        columns={columns}
        getRowId={(row) => row.id}
        loading={isLoading}
        onRowClick={(row) => navigate(`/billing/payments/${row.id}`)}
        searchPlaceholder="Search payment, request, proforma, UTR…"
        filters={FILTERS}
        filterValues={filters}
        onFilterChange={(key, value) => { setFilters((prev) => ({ ...prev, [key]: value })); setPage(1); }}
        actions={(row) => (
          <WtButton
            ghost size="small"
            disabled={Number(row.outstandingAmount) <= 0 && row.paymentStatus !== "PENDING"}
            onClick={(event) => { event.stopPropagation(); setRecordTarget(row); }}
            sx={{ minHeight: 28, fontSize: 11.5 }}
          >
            Record Payment
          </WtButton>
        )}
        emptyTitle="No payment collections yet"
        emptyDescription="A collection opens automatically once a proforma is issued for a billing request."
        minWidth={1300}
        pageSize={PAGE_SIZE}
      />

      {pagination && pagination.pageCount > 1 && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{pagination.total} collections</Typography>
          <Pagination
            size="small" count={pagination.pageCount} page={pagination.page}
            onChange={(_event, next) => setPage(next)}
          />
        </Stack>
      )}

      <RecordPaymentDialog
        open={!!recordTarget}
        onClose={() => setRecordTarget(null)}
        operationId={recordTarget?.id ?? ""}
        operationNumber={recordTarget?.operationNumber ?? ""}
        outstandingAmount={Number(recordTarget?.outstandingAmount ?? 0)}
      />
    </Box>
  );
};

export default PaymentCollectionPage;
