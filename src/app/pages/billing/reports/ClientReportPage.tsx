import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Stack, Typography } from "@mui/material";
import { TRIO, ToneChip } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { getClientReport, type ClientProjectRow } from "@services/billingReports";
import { BillingPageHeader, BillingStatsCard, BillingTable, BillingEmptyState, type BillingColumn } from "../components";
import ReportChart from "./shared/ReportChart";
import ReportExportToolbar from "./shared/ReportExportToolbar";

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral" | "indigo"> = {
  COMPLETED: "success", CANCELLED: "danger", PAYMENT_VERIFIED: "success",
  READY_FOR_PROFORMA: "neutral", PROFORMA_SENT: "indigo",
};

/**
 * Client Billing Report — one client's whole financial history, entered via
 * `?clientId=`. Reached by drill-down from any other report's client column,
 * or a bookmarked link — there is no client picker on this page by design,
 * the same reasoning Billing Operations uses for its own detail routes.
 */
const ClientReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("clientId");

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "client", clientId],
    queryFn: () => getClientReport(clientId!),
    enabled: !!clientId,
  });

  if (!clientId) {
    return (
      <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
        <BillingPageHeader icon="profile-user" trio={TRIO.cyan} title="Client Billing Report" description="Everything billed to one client across all their projects." />
        <BillingEmptyState title="No client selected" description="Open this report from a client name in Revenue, Collection or Outstanding." />
      </Box>
    );
  }

  const summary = data?.summary;
  const projects = data?.projects ?? [];

  const columns: BillingColumn<ClientProjectRow>[] = [
    {
      key: "project", header: "Project",
      render: (row) => (
        <Typography
          sx={{ fontSize: 12.5, fontWeight: 600, cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
          onClick={(e) => { e.stopPropagation(); navigate(`/billing/reports/project?projectId=${row.leadId}`); }}
        >
          {row.projectName ?? "—"}
        </Typography>
      ),
      searchValue: (row) => row.projectName,
    },
    { key: "billingRequest", header: "Billing Request", width: 140, render: (row) => row.billingRequestNumber, searchValue: (row) => row.billingRequestNumber },
    { key: "operation", header: "Operation", width: 140, render: (row) => row.operationNumber },
    { key: "invoice", header: "Invoice", width: 110, render: (row) => row.invoiceDocumentId ? "Issued" : "—" },
    {
      key: "payment", header: "Collected", width: 130, align: "right",
      render: (row) => formatCurrencyDecimal(row.collected), sortValue: (row) => row.collected,
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
    { key: "status", header: "Status", width: 150, render: (row) => <ToneChip tone={STATUS_TONE[row.status] ?? "neutral"} label={row.status.replace(/_/g, " ")} dense /> },
  ];

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="profile-user" trio={TRIO.cyan}
        title={summary ? `${summary.companyName} — Billing History` : "Client Billing Report"}
        description="Complete financial history across every project."
      />

      {isLoading ? null : !summary ? (
        <BillingEmptyState title="Client not found" />
      ) : (
        <>
          <Box sx={{ display: "grid", gap: 1.25, mb: 2, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <BillingStatsCard label="Total Projects" icon="abstract-26" trio={TRIO.blue} value={summary.totalProjects} />
            <BillingStatsCard label="Total Revenue" icon="dollar" trio={TRIO.green} value={formatCurrencyDecimal(summary.totalRevenue)} />
            <BillingStatsCard label="Outstanding" icon="wallet" trio={TRIO.rose} value={formatCurrencyDecimal(summary.outstanding)} />
            <BillingStatsCard label="Paid" icon="check-square" trio={TRIO.green} value={formatCurrencyDecimal(summary.paid)} />
            <BillingStatsCard label="Pending" icon="information-5" trio={TRIO.amber} value={formatCurrencyDecimal(summary.pending)} />
          </Box>

          <Box sx={{ display: "grid", gap: 1.25, mb: 2, gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" } }}>
            <ReportChart title="Revenue Timeline" subtitle="Last 12 months" type="area" data={data?.charts.revenueTimeline ?? []} height={260} />
            <ReportChart
              title="Project Revenue" type="donut" height={260}
              data={projects.map((p) => ({ label: p.projectName ?? p.operationNumber, value: p.totalAmount }))}
            />
          </Box>

          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1.5 }}>
            <ReportExportToolbar
              data={projects} filename={`client-${summary.companyName}-billing`} title={`${summary.companyName} — Billing History`} showTotals
              columns={[
                { key: "projectName", header: "Project" },
                { key: "billingRequestNumber", header: "Billing Request" },
                { key: "operationNumber", header: "Operation" },
                { key: "totalAmount", header: "Total Amount", type: "currency", showTotal: true },
                { key: "collected", header: "Collected", type: "currency", showTotal: true },
                { key: "outstanding", header: "Outstanding", type: "currency", showTotal: true },
                { key: "status", header: "Status" },
              ]}
            />
          </Stack>

          <BillingTable
            rows={projects}
            columns={columns}
            getRowId={(row) => row.operationNumber}
            loading={isLoading}
            onRowClick={(row) => navigate(`/billing/reports/project?projectId=${row.leadId}`)}
            emptyTitle="No billing history"
            emptyDescription="This client has no approved billing requests yet."
            minWidth={1000}
            pageSize={25}
          />
        </>
      )}
    </Box>
  );
};

export default ClientReportPage;
