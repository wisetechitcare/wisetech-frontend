import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Stack, Typography } from "@mui/material";
import { TRIO } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { getMonthlyReport, type MonthlyRow } from "@services/billingReports";
import { BillingPageHeader, BillingStatsCard, BillingTable, type BillingColumn } from "../components";
import ReportChart from "./shared/ReportChart";
import ReportExportToolbar from "./shared/ReportExportToolbar";

/**
 * Monthly Billing Report — billing activity month by month.
 *
 * No client-side pagination story here: 12 months is the whole table, so
 * there is nothing for a page-size control to do.
 */
const MonthlyReportPage: React.FC = () => {
  const [months, setMonths] = useState(12);

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "monthly", months],
    queryFn: () => getMonthlyReport({ months }),
  });

  const rows = data?.rows ?? [];
  const totals = data?.totals;

  const columns: BillingColumn<MonthlyRow>[] = [
    { key: "label", header: "Month", width: 120, render: (row) => <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{row.label}</Typography> },
    { key: "billingRequests", header: "Billing Requests", align: "right", render: (row) => row.billingRequests, sortValue: (row) => row.billingRequests },
    { key: "proformas", header: "Proformas", align: "right", render: (row) => row.proformas, sortValue: (row) => row.proformas },
    { key: "payments", header: "Payments", align: "right", render: (row) => row.payments, sortValue: (row) => row.payments },
    { key: "invoices", header: "Invoices", align: "right", render: (row) => row.invoices, sortValue: (row) => row.invoices },
    {
      key: "revenue", header: "Revenue", align: "right",
      render: (row) => <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{formatCurrencyDecimal(row.revenue)}</Typography>,
      sortValue: (row) => row.revenue,
    },
    { key: "collected", header: "Collected", align: "right", render: (row) => formatCurrencyDecimal(row.collected), sortValue: (row) => row.collected },
  ];

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="calendar" trio={TRIO.purple} title="Monthly Billing Report"
        description="Requests raised, approved, proforma'd and invoiced per month."
        action={
          <Stack direction="row" spacing={0.5}>
            {[6, 12, 24].map((m) => (
              <Typography
                key={m}
                onClick={() => setMonths(m)}
                sx={{
                  fontSize: 12.5, fontWeight: 700, px: 1.5, py: 0.6, borderRadius: "8px", cursor: "pointer",
                  bgcolor: months === m ? "primary.main" : "transparent",
                  color: months === m ? "primary.contrastText" : "text.secondary",
                  border: "1px solid", borderColor: months === m ? "primary.main" : "divider",
                }}
              >
                {m}M
              </Typography>
            ))}
          </Stack>
        }
      />

      <Box sx={{ display: "grid", gap: 1.25, mb: 2, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <BillingStatsCard label="Billing Requests" icon="document" trio={TRIO.blue} value={totals?.billingRequests ?? 0} />
        <BillingStatsCard label="Proformas" icon="send" trio={TRIO.purple} value={totals?.proformas ?? 0} />
        <BillingStatsCard label="Payments" icon="wallet" trio={TRIO.amber} value={totals?.payments ?? 0} />
        <BillingStatsCard label="Invoices" icon="receipt-cutoff" trio={TRIO.cyan} value={totals?.invoices ?? 0} />
        <BillingStatsCard label="Revenue" icon="dollar" trio={TRIO.green} value={formatCurrencyDecimal(totals?.revenue ?? 0)} />
      </Box>

      <Box sx={{ display: "grid", gap: 1.25, mb: 2, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>
        <ReportChart
          title="Billing Trend" type="line" height={280}
          data={rows} unit="number"
          series={[
            { key: "billingRequests", label: "Requests", color: TRIO.blue.c },
            { key: "proformas", label: "Proformas", color: TRIO.purple.c },
            { key: "invoices", label: "Invoices", color: TRIO.cyan.c },
          ]}
        />
        <ReportChart title="Revenue vs Collection" type="bar" height={280} data={rows} series={[
          { key: "revenue", label: "Revenue", color: TRIO.green.c },
          { key: "collected", label: "Collected", color: TRIO.blue.c },
        ]} />
      </Box>
      <Box sx={{ mb: 2 }}>
        <ReportChart title="Monthly Comparison" type="stackedBar" height={260} data={rows} unit="number" series={[
          { key: "billingRequests", label: "Requests", color: TRIO.blue.c },
          { key: "proformas", label: "Proformas", color: TRIO.purple.c },
          { key: "payments", label: "Payments", color: TRIO.amber.c },
          { key: "invoices", label: "Invoices", color: TRIO.cyan.c },
        ]} />
      </Box>

      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1.5 }}>
        <ReportExportToolbar
          data={rows} filename="monthly-billing-report" title="Monthly Billing Report" showTotals
          columns={[
            { key: "label", header: "Month" },
            { key: "billingRequests", header: "Billing Requests", type: "number", showTotal: true },
            { key: "proformas", header: "Proformas", type: "number", showTotal: true },
            { key: "payments", header: "Payments", type: "number", showTotal: true },
            { key: "invoices", header: "Invoices", type: "number", showTotal: true },
            { key: "revenue", header: "Revenue", type: "currency", showTotal: true },
            { key: "collected", header: "Collected", type: "currency", showTotal: true },
          ]}
        />
      </Stack>

      <BillingTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.period}
        loading={isLoading}
        emptyTitle="No billing activity"
        minWidth={900}
        pageSize={24}
      />
    </Box>
  );
};

export default MonthlyReportPage;
