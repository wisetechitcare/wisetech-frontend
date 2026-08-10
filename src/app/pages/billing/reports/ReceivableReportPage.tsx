import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Pagination, Stack, Typography } from "@mui/material";
import { TRIO } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { getReceivableReport, type ReceivableTableRow } from "@services/billingReports";
import { BillingPageHeader, BillingStatsCard, BillingStatusBadge, BillingTable, type BillingColumn } from "../components";
import ReportChart from "./shared/ReportChart";
import ReportFilterBar, { EMPTY_REPORT_FILTERS, type ReportFilterValues } from "./shared/ReportFilterBar";
import ReportExportToolbar from "./shared/ReportExportToolbar";
import SavedFiltersMenu from "./shared/SavedFiltersMenu";
import { useSavedFilters } from "./shared/useSavedFilters";

const PAGE_SIZE = 25;

/**
 * Receivable Report — approved work that has not yet become revenue.
 */
const ReceivableReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ReportFilterValues>(EMPTY_REPORT_FILTERS);
  const [page, setPage] = useState(1);
  const { saved, save, remove } = useSavedFilters<ReportFilterValues>("receivables");

  const params = useMemo(() => ({
    search: filters.search || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    minAmount: filters.minAmount ? Number(filters.minAmount) : undefined,
    maxAmount: filters.maxAmount ? Number(filters.maxAmount) : undefined,
    page, pageSize: PAGE_SIZE,
  }), [filters, page]);

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "receivables", params],
    queryFn: () => getReceivableReport(params),
  });

  const stats = data?.stats;
  const rows = data?.table.rows ?? [];
  const pageCount = data ? Math.max(1, Math.ceil(data.table.total / data.table.pageSize)) : 1;

  const columns: BillingColumn<ReceivableTableRow>[] = [
    {
      key: "operation", header: "Operation", width: 150,
      render: (row) => (
        <Box>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{row.operationNumber}</Typography>
          <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{row.requestNumber}</Typography>
        </Box>
      ),
      searchValue: (row) => `${row.operationNumber} ${row.requestNumber}`,
    },
    {
      key: "project", header: "Project / Client",
      render: (row) => (
        <Box>
          <Typography
            sx={{ fontSize: 12.5, fontWeight: 600, cursor: row.leadId ? "pointer" : "default", "&:hover": row.leadId ? { textDecoration: "underline" } : {} }}
            onClick={(e) => { if (row.leadId) { e.stopPropagation(); navigate(`/billing/reports/project?projectId=${row.leadId}`); } }}
          >
            {row.projectName ?? "—"}
          </Typography>
          <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{row.clientName ?? "—"}</Typography>
        </Box>
      ),
      searchValue: (row) => `${row.projectName ?? ""} ${row.clientName ?? ""}`,
    },
    { key: "stage", header: "Stage", width: 110, render: (row) => row.stage },
    { key: "status", header: "Status", width: 170, render: (row) => <BillingStatusBadge status={row.status} /> },
    {
      key: "amount", header: "Receivable Amount", width: 160, align: "right",
      render: (row) => <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{formatCurrencyDecimal(row.amount)}</Typography>,
      sortValue: (row) => row.amount,
    },
  ];

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="delivery" trio={TRIO.amber} title="Receivable Report"
        description="Approved and proforma'd work not yet invoiced."
      />

      <Box sx={{ display: "grid", gap: 1.25, mb: 2, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <BillingStatsCard label="Receivable Amount" icon="dollar" trio={TRIO.amber} value={formatCurrencyDecimal(stats?.receivableAmount ?? 0)} />
        <BillingStatsCard label="Pending Billing" icon="document" trio={TRIO.blue} value={stats?.pendingBillingCount ?? 0} />
        <BillingStatsCard label="Pending Proformas" icon="send" trio={TRIO.purple} value={stats?.pendingProformaCount ?? 0} />
        <BillingStatsCard label="Pending Payments" icon="wallet" trio={TRIO.rose} value={stats?.pendingPaymentCount ?? 0} />
        <BillingStatsCard label="Ready for Invoice" icon="receipt-cutoff" trio={TRIO.cyan} value={stats?.readyForInvoiceCount ?? 0} />
      </Box>

      <Box sx={{ display: "grid", gap: 1.25, mb: 2, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>
        <ReportChart title="Receivable Pipeline" subtitle="By workflow stage" type="bar" data={data?.charts.pipeline ?? []} height={280} />
        <ReportChart title="Billing Funnel" type="bar" data={data?.charts.funnel ?? []} height={280} />
      </Box>

      <ReportFilterBar
        values={filters} onChange={(next) => { setFilters(next); setPage(1); }}
        searchPlaceholder="Search operation or request number…"
        onReset={() => { setFilters(EMPTY_REPORT_FILTERS); setPage(1); }}
        extra={
          <Stack direction="row" spacing={0.75}>
            <SavedFiltersMenu saved={saved} onApply={setFilters} onSave={(name) => save(name, filters)} onRemove={remove} />
            <ReportExportToolbar
              data={rows} filename="receivable-report" title="Receivable Report" showTotals
              fetchAll={async () => (await getReceivableReport({ ...params, page: 1, pageSize: 1000 })).table.rows}
              columns={[
                { key: "operationNumber", header: "Operation No" },
                { key: "requestNumber", header: "Request No" },
                { key: "projectName", header: "Project" },
                { key: "clientName", header: "Client" },
                { key: "stage", header: "Stage" },
                { key: "statusLabel", header: "Status" },
                { key: "amount", header: "Receivable Amount", type: "currency", showTotal: true },
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
        onRowClick={(row) => navigate(`/billing/operations/${row.id}`)}
        emptyTitle="Nothing receivable"
        emptyDescription="Approved work that hasn't yet become revenue will appear here."
        minWidth={900}
        pageSize={PAGE_SIZE}
      />

      {data && pageCount > 1 && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{data.table.total} receivables</Typography>
          <Pagination size="small" count={pageCount} page={page} onChange={(_e, next) => setPage(next)} />
        </Stack>
      )}
    </Box>
  );
};

export default ReceivableReportPage;
