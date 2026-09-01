import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Pagination, Stack, Typography } from "@mui/material";
import { TRIO, ToneChip } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import { getOutstandingReport, type OutstandingTableRow } from "@services/billingReports";
import { BillingPageHeader, BillingStatsCard, BillingTable, type BillingColumn } from "../components";
import ReportChart from "./shared/ReportChart";
import ReportFilterBar, { EMPTY_REPORT_FILTERS, type ReportFilterValues } from "./shared/ReportFilterBar";
import ReportExportToolbar from "./shared/ReportExportToolbar";
import SavedFiltersMenu from "./shared/SavedFiltersMenu";
import { useSavedFilters } from "./shared/useSavedFilters";

const PAGE_SIZE = 25;

const DUE_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  OVERDUE: "danger", DUE_TODAY: "warning", UPCOMING: "neutral", SETTLED: "success", NONE: "neutral",
};

/**
 * Outstanding Report — unpaid and partially paid, aged into buckets.
 */
const OutstandingReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ReportFilterValues>(EMPTY_REPORT_FILTERS);
  const [page, setPage] = useState(1);
  const { saved, save, remove } = useSavedFilters<ReportFilterValues>("outstanding");

  const params = useMemo(() => ({
    search: filters.search || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    minAmount: filters.minAmount ? Number(filters.minAmount) : undefined,
    maxAmount: filters.maxAmount ? Number(filters.maxAmount) : undefined,
    page, pageSize: PAGE_SIZE,
  }), [filters, page]);

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "outstanding", params],
    queryFn: () => getOutstandingReport(params),
  });

  const stats = data?.stats;
  const rows = data?.table.rows ?? [];
  const pageCount = data ? Math.max(1, Math.ceil(data.table.total / data.table.pageSize)) : 1;

  const columns: BillingColumn<OutstandingTableRow>[] = [
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
      key: "client", header: "Client",
      render: (row) => (
        <Typography
          sx={{ fontSize: 12.5, fontWeight: 600, cursor: row.companyId ? "pointer" : "default", "&:hover": row.companyId ? { textDecoration: "underline" } : {} }}
          onClick={(e) => { if (row.companyId) { e.stopPropagation(); navigate(`/billing/reports/client?clientId=${row.companyId}`); } }}
        >
          {row.clientName ?? "—"}
        </Typography>
      ),
      searchValue: (row) => row.clientName,
    },
    {
      key: "project", header: "Project",
      render: (row) => (
        <Typography
          sx={{ fontSize: 12.5, cursor: row.leadId ? "pointer" : "default", "&:hover": row.leadId ? { textDecoration: "underline" } : {} }}
          onClick={(e) => { if (row.leadId) { e.stopPropagation(); navigate(`/billing/reports/project?projectId=${row.leadId}`); } }}
        >
          {row.projectName ?? "—"}
        </Typography>
      ),
      searchValue: (row) => row.projectName,
    },
    {
      key: "outstanding", header: "Outstanding", width: 140, align: "right",
      render: (row) => <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "error.main" }}>{formatCurrencyDecimal(row.outstanding)}</Typography>,
      sortValue: (row) => row.outstanding,
    },
    {
      key: "dueDate", header: "Due Date", width: 130,
      render: (row) => row.dueDate ? formatDate(row.dueDate) : "—",
      sortValue: (row) => row.dueDate ?? "",
    },
    {
      key: "daysOverdue", header: "Days Overdue", width: 120, align: "right",
      render: (row) => row.daysOverdue > 0 ? row.daysOverdue : "—",
      sortValue: (row) => row.daysOverdue,
    },
    {
      key: "dueState", header: "Payment Status", width: 140,
      render: (row) => <ToneChip tone={DUE_TONE[row.dueState] ?? "neutral"} label={row.dueState.replace("_", " ")} dense />,
    },
  ];

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="information-5" trio={TRIO.rose} title="Outstanding Report"
        description="Issued and unpaid, aged into buckets."
      />

      <Box sx={{ display: "grid", gap: 1.25, mb: 2, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <BillingStatsCard label="Outstanding Amount" icon="wallet" trio={TRIO.rose} value={formatCurrencyDecimal(stats?.outstandingAmount ?? 0)} />
        <BillingStatsCard label="Overdue Amount" icon="information-5" trio={TRIO.rose} value={formatCurrencyDecimal(stats?.overdueAmount ?? 0)} />
        <BillingStatsCard label="Avg Due Days" icon="calendar" trio={TRIO.amber} value={stats?.averageDueDays ?? 0} />
        <BillingStatsCard label="Overdue Clients" icon="profile-user" trio={TRIO.purple} value={stats?.overdueClientCount ?? 0} />
      </Box>

      <Box sx={{ display: "grid", gap: 1.25, mb: 2, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>
        <ReportChart title="Outstanding Aging" subtitle="Days overdue" type="bar" data={data?.charts.aging ?? []} height={280} />
        <ReportChart title="Outstanding by Client" type="bar" data={data?.charts.byClient ?? []} height={280} />
      </Box>
      <Box sx={{ mb: 2 }}>
        <ReportChart title="Outstanding by Project" type="bar" data={data?.charts.byProject ?? []} height={260} />
      </Box>

      <ReportFilterBar
        values={filters} onChange={(next) => { setFilters(next); setPage(1); }}
        searchPlaceholder="Search operation or request number…"
        onReset={() => { setFilters(EMPTY_REPORT_FILTERS); setPage(1); }}
        extra={
          <Stack direction="row" spacing={0.75}>
            <SavedFiltersMenu saved={saved} onApply={setFilters} onSave={(name) => save(name, filters)} onRemove={remove} />
            <ReportExportToolbar
              data={rows} filename="outstanding-report" title="Outstanding Report" showTotals
              fetchAll={async () => (await getOutstandingReport({ ...params, page: 1, pageSize: 1000 })).table.rows}
              columns={[
                { key: "operationNumber", header: "Operation No" },
                { key: "clientName", header: "Client" },
                { key: "projectName", header: "Project" },
                { key: "outstanding", header: "Outstanding", type: "currency", showTotal: true },
                { key: "dueDate", header: "Due Date", format: (v) => v ? formatDate(v) : "-" },
                { key: "daysOverdue", header: "Days Overdue", type: "number" },
                { key: "dueState", header: "Status" },
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
        emptyTitle="Nothing outstanding"
        emptyDescription="Every issued invoice has been collected in full."
        minWidth={1000}
        pageSize={PAGE_SIZE}
      />

      {data && pageCount > 1 && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{data.table.total} outstanding</Typography>
          <Pagination size="small" count={pageCount} page={page} onChange={(_e, next) => setPage(next)} />
        </Stack>
      )}
    </Box>
  );
};

export default OutstandingReportPage;
