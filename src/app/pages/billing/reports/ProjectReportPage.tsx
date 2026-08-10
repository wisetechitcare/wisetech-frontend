import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Stack, Typography, LinearProgress } from "@mui/material";
import { TRIO, ToneChip } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import { getProjectReport, type ProjectReportRow } from "@services/billingReports";
import { BillingPageHeader, BillingStatsCard, BillingStatusBadge, BillingTable, BillingEmptyState, type BillingColumn } from "../components";
import ReportChart from "./shared/ReportChart";
import ReportExportToolbar from "./shared/ReportExportToolbar";

/**
 * Project Billing Report — one project's complete billing history, entered
 * via `?projectId=`. Same drill-down-only shape as the Client report.
 */
const ProjectReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId");

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "project", projectId],
    queryFn: () => getProjectReport(projectId!),
    enabled: !!projectId,
  });

  if (!projectId) {
    return (
      <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
        <BillingPageHeader icon="abstract-26" trio={TRIO.slate} title="Project Billing Report" description="Stage-wise billed vs remaining for a single project." />
        <BillingEmptyState title="No project selected" description="Open this report from a project name in Revenue, Collection or Outstanding." />
      </Box>
    );
  }

  const summary = data?.summary;
  const rows = data?.rows ?? [];

  const columns: BillingColumn<ProjectReportRow>[] = [
    { key: "stage", header: "Stage", width: 110, render: (row) => <ToneChip tone={row.stage === "CLOSED" ? "success" : "indigo"} label={row.stage} dense /> },
    {
      key: "operation", header: "Billing Request", width: 160,
      render: (row) => (
        <Box>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{row.operationNumber}</Typography>
          <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{row.requestNumber}</Typography>
        </Box>
      ),
      searchValue: (row) => `${row.operationNumber} ${row.requestNumber}`,
    },
    { key: "proforma", header: "Proforma", width: 130, render: (row) => row.proformaNumber ?? "—" },
    { key: "invoice", header: "Invoice", width: 130, render: (row) => row.invoiceNumber ?? "—" },
    { key: "status", header: "Status", width: 170, render: (row) => <BillingStatusBadge status={row.status} /> },
    {
      key: "collected", header: "Payment", width: 130, align: "right",
      render: (row) => formatCurrencyDecimal(row.collectedAmount), sortValue: (row) => row.collectedAmount,
    },
    {
      key: "outstanding", header: "Outstanding", width: 130, align: "right",
      render: (row) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: row.outstandingAmount > 0 ? "error.main" : "text.secondary" }}>
          {formatCurrencyDecimal(row.outstandingAmount)}
        </Typography>
      ),
      sortValue: (row) => row.outstandingAmount,
    },
    {
      key: "approvedAt", header: "Approved", width: 120,
      render: (row) => row.approvedAt ? formatDate(row.approvedAt) : "—",
      sortValue: (row) => row.approvedAt ?? "",
    },
  ];

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="abstract-26" trio={TRIO.slate}
        title={summary ? `${summary.projectName} — Billing History` : "Project Billing Report"}
        description={summary?.clientName ?? "Stage-wise billed vs remaining."}
      />

      {isLoading ? null : !summary ? (
        <BillingEmptyState title="Project not found" />
      ) : (
        <>
          <Box sx={{ display: "grid", gap: 1.25, mb: 2, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
            <BillingStatsCard label="Contract Value" icon="briefcase" trio={TRIO.slate} value={formatCurrencyDecimal(summary.contractValue)} />
            <BillingStatsCard label="Billed Amount" icon="document" trio={TRIO.blue} value={formatCurrencyDecimal(summary.billedAmount)} />
            <BillingStatsCard label="Collected" icon="check-square" trio={TRIO.green} value={formatCurrencyDecimal(summary.collectedAmount)} />
            <BillingStatsCard label="Outstanding" icon="wallet" trio={TRIO.rose} value={formatCurrencyDecimal(summary.outstandingAmount)} />
            <BillingStatsCard label="Remaining Billing" icon="delivery" trio={TRIO.amber} value={formatCurrencyDecimal(summary.remainingBilling)} />
            <BillingStatsCard label="Billing %" icon="chart-pie-simple" trio={TRIO.purple} value={`${summary.billingPercentage.toFixed(1)}%`} />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Billing progress against contract value</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{summary.billingPercentage.toFixed(1)}%</Typography>
            </Stack>
            <LinearProgress
              variant="determinate" value={Math.min(100, summary.billingPercentage)}
              sx={{ height: 8, borderRadius: 4, bgcolor: "action.hover" }}
            />
          </Box>

          <Box sx={{ display: "grid", gap: 1.25, mb: 2, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>
            <ReportChart title="Stage Billing" type="bar" data={data?.stageBilling ?? []} height={260} />
            <ReportChart title="Revenue Timeline" subtitle="Last 12 months" type="area" data={data?.revenueTimeline ?? []} height={260} />
          </Box>
          <Box sx={{ mb: 2 }}>
            <ReportChart title="Payment Timeline" type="line" data={data?.paymentTimeline ?? []} height={240} />
          </Box>

          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1.5 }}>
            <ReportExportToolbar
              data={rows} filename={`project-${summary.projectName}-billing`} title={`${summary.projectName} — Billing History`} showTotals
              columns={[
                { key: "stage", header: "Stage" },
                { key: "operationNumber", header: "Operation" },
                { key: "requestNumber", header: "Billing Request" },
                { key: "proformaNumber", header: "Proforma" },
                { key: "invoiceNumber", header: "Invoice" },
                { key: "totalAmount", header: "Total Amount", type: "currency", showTotal: true },
                { key: "collectedAmount", header: "Collected", type: "currency", showTotal: true },
                { key: "outstandingAmount", header: "Outstanding", type: "currency", showTotal: true },
              ]}
            />
          </Stack>

          <BillingTable
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id}
            loading={isLoading}
            onRowClick={(row) => navigate(`/billing/operations/${row.id}`)}
            emptyTitle="No billing history"
            emptyDescription="This project has no approved billing requests yet."
            minWidth={1100}
            pageSize={25}
          />
        </>
      )}
    </Box>
  );
};

export default ProjectReportPage;
