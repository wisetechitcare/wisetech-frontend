import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Pagination, Stack, Typography } from "@mui/material";
import { TRIO, ToneChip } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import { getCollectionReport, type CollectionTableRow } from "@services/billingReports";
import { BillingPageHeader, BillingStatsCard, BillingTable, type BillingColumn } from "../components";
import ReportChart from "./shared/ReportChart";
import ReportFilterBar, { EMPTY_REPORT_FILTERS, type ReportFilterValues } from "./shared/ReportFilterBar";
import ReportExportToolbar from "./shared/ReportExportToolbar";
import SavedFiltersMenu from "./shared/SavedFiltersMenu";
import { useSavedFilters } from "./shared/useSavedFilters";

const PAGE_SIZE = 25;

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  FULLY_PAID: "success", PARTIALLY_PAID: "warning", PENDING: "neutral", OVERPAID: "success", CANCELLED: "danger",
};

/**
 * Collection Report — invoiced vs actually received, by operation.
 */
const CollectionReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ReportFilterValues>(EMPTY_REPORT_FILTERS);
  const [page, setPage] = useState(1);
  const { saved, save, remove } = useSavedFilters<ReportFilterValues>("collections");

  const params = useMemo(() => ({
    search: filters.search || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    minAmount: filters.minAmount ? Number(filters.minAmount) : undefined,
    maxAmount: filters.maxAmount ? Number(filters.maxAmount) : undefined,
    page, pageSize: PAGE_SIZE,
  }), [filters, page]);

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "collections", params],
    queryFn: () => getCollectionReport(params),
  });

  const stats = data?.stats;
  const rows = data?.table.rows ?? [];
  const pageCount = data ? Math.max(1, Math.ceil(data.table.total / data.table.pageSize)) : 1;

  const columns: BillingColumn<CollectionTableRow>[] = [
    {
      key: "invoice", header: "Invoice", width: 150,
      render: (row) => (
        <Box>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{row.operationNumber}</Typography>
          <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{row.requestNumber}</Typography>
        </Box>
      ),
      searchValue: (row) => `${row.operationNumber} ${row.requestNumber}`,
    },
    {
      key: "project", header: "Project",
      render: (row) => (
        <Typography
          sx={{ fontSize: 12.5, fontWeight: 600, cursor: row.leadId ? "pointer" : "default", "&:hover": row.leadId ? { textDecoration: "underline" } : {} }}
          onClick={(e) => { if (row.leadId) { e.stopPropagation(); navigate(`/billing/reports/project?projectId=${row.leadId}`); } }}
        >
          {row.projectName ?? "—"}
        </Typography>
      ),
      searchValue: (row) => row.projectName,
    },
    {
      key: "client", header: "Client",
      render: (row) => (
        <Typography
          sx={{ fontSize: 12.5, cursor: row.companyId ? "pointer" : "default", "&:hover": row.companyId ? { textDecoration: "underline" } : {} }}
          onClick={(e) => { if (row.companyId) { e.stopPropagation(); navigate(`/billing/reports/client?clientId=${row.companyId}`); } }}
        >
          {row.clientName ?? "—"}
        </Typography>
      ),
      searchValue: (row) => row.clientName,
    },
    {
      key: "invoiceAmount", header: "Invoice Amount", width: 140, align: "right",
      render: (row) => formatCurrencyDecimal(row.invoiceAmount), sortValue: (row) => row.invoiceAmount,
    },
    {
      key: "collected", header: "Collected", width: 130, align: "right",
      render: (row) => <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "success.main" }}>{formatCurrencyDecimal(row.collected)}</Typography>,
      sortValue: (row) => row.collected,
    },
    {
      key: "outstanding", header: "Outstanding", width: 130, align: "right",
      render: (row) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: row.outstanding > 0 ? "error.main" : "text.secondary" }}>
          {formatCurrencyDecimal(row.outstanding)}
        </Typography>
      ),
      sortValue: (row) => row.outstanding,
    },
    {
      key: "paymentStatus", header: "Payment Status", width: 150,
      render: (row) => <ToneChip tone={STATUS_TONE[row.paymentStatus] ?? "neutral"} label={row.paymentStatusLabel} dense />,
    },
    {
      key: "paymentDate", header: "Payment Date", width: 130,
      render: (row) => row.lastPaymentAt ? formatDate(row.lastPaymentAt) : "—",
      sortValue: (row) => row.lastPaymentAt ?? "",
    },
  ];

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="wallet" trio={TRIO.blue} title="Collection Report"
        description="What was invoiced against what was actually received."
      />

      <Box sx={{ display: "grid", gap: 1.25, mb: 2, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <BillingStatsCard label="Collected" icon="check-square" trio={TRIO.green} value={formatCurrencyDecimal(stats?.collectedAmount ?? 0)} />
        <BillingStatsCard label="Outstanding" icon="wallet" trio={TRIO.rose} value={formatCurrencyDecimal(stats?.outstandingAmount ?? 0)} />
        <BillingStatsCard label="Collection %" icon="chart-pie-simple" trio={TRIO.blue} value={`${(stats?.collectionPercentage ?? 0).toFixed(1)}%`} />
        <BillingStatsCard label="Avg Collection Days" icon="calendar" trio={TRIO.purple} value={stats?.averageCollectionDays ?? "—"} />
        <BillingStatsCard label="Pending Collections" icon="information-5" trio={TRIO.amber} value={stats?.pendingCollectionCount ?? 0} />
      </Box>

      <Box sx={{ display: "grid", gap: 1.25, mb: 2, gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" } }}>
        <ReportChart title="Collection Trend" subtitle="Last 12 months" type="line" data={data?.charts.trend ?? []} height={280} />
        <ReportChart title="Payment Method Distribution" type="donut" data={data?.charts.methodDistribution ?? []} height={280} />
      </Box>
      <Box sx={{ mb: 2 }}>
        <ReportChart
          title="Collection vs Outstanding" type="bar" height={240}
          data={[
            { label: "Collected", value: stats?.collectedAmount ?? 0 },
            { label: "Outstanding", value: stats?.outstandingAmount ?? 0 },
          ]}
        />
      </Box>

      <ReportFilterBar
        values={filters} onChange={(next) => { setFilters(next); setPage(1); }}
        searchPlaceholder="Search operation or request number…"
        onReset={() => { setFilters(EMPTY_REPORT_FILTERS); setPage(1); }}
        extra={
          <Stack direction="row" spacing={0.75}>
            <SavedFiltersMenu saved={saved} onApply={setFilters} onSave={(name) => save(name, filters)} onRemove={remove} />
            <ReportExportToolbar
              data={rows} filename="collection-report" title="Collection Report" showTotals
              fetchAll={async () => (await getCollectionReport({ ...params, page: 1, pageSize: 1000 })).table.rows}
              columns={[
                { key: "operationNumber", header: "Operation No" },
                { key: "requestNumber", header: "Request No" },
                { key: "projectName", header: "Project" },
                { key: "clientName", header: "Client" },
                { key: "invoiceAmount", header: "Invoice Amount", type: "currency", showTotal: true },
                { key: "collected", header: "Collected", type: "currency", showTotal: true },
                { key: "outstanding", header: "Outstanding", type: "currency", showTotal: true },
                { key: "paymentStatusLabel", header: "Payment Status" },
                { key: "lastPaymentAt", header: "Payment Date", format: (v) => v ? formatDate(v) : "-" },
              ]}
            />
          </Stack>
        }
      />

      <BillingTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        loading={isLoading}
        onRowClick={(row) => navigate(`/billing/payments/${row.id}`)}
        emptyTitle="No payment collections yet"
        emptyDescription="Collections appear here once a proforma has been issued."
        minWidth={1100}
        pageSize={PAGE_SIZE}
      />

      {data && pageCount > 1 && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{data.table.total} collections</Typography>
          <Pagination size="small" count={pageCount} page={page} onChange={(_e, next) => setPage(next)} />
        </Stack>
      )}
    </Box>
  );
};

export default CollectionReportPage;
