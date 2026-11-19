import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Stack, Typography } from "@mui/material";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { TRIO } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import { getProformaTracker, type ProformaTrackerRow } from "@services/billingTrackers";
import type { SettlementLine } from "@services/bills";
import { useBillingOrgId } from "../BillingLayout";
import { DASH, DueCell, Money, TRACKER_TABLE, TotalLabel, sumOf, trackerRowSx } from "../components/trackerKit";
import { BillingStatusTint } from "../components";
import { lineStatusOf } from "../project/projectBillingRules";

/**
 * The Invoice Tracker — one row per issued bill, its money split the way finance reconciles it:
 * Bill Amount (basic − TDS), GST and TDS, each with where it stands, adding up to the Bill Value.
 *
 * Reads the Proforma Tracker's bill rows (a proforma IS a bill's first document), so every figure agrees with the
 * project's Billing tab by construction. Drafts are left out — nothing is owed on a bill the client has not been sent.
 */

const ComponentCell: React.FC<{ line: SettlementLine | null; note?: string }> = ({ line, note }) =>
  !line ? <Typography sx={{ fontSize: "inherit", color: "text.disabled" }}>No TDS</Typography> : (
    <BillingStatusTint status={lineStatusOf(line.tone).code!}>
      <Stack spacing={0.25} alignItems="flex-start">
        <Money value={line.amount} bold />
        {note && <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>{note}</Typography>}
      </Stack>
    </BillingStatusTint>
  );

const BillInvoiceTrackerPage: React.FC = () => {
  const navigate = useNavigate();
  const organizationId = useBillingOrgId();
  const { data, isLoading } = useQuery({
    queryKey: ["proforma-tracker", organizationId],
    queryFn: () => getProformaTracker({ organizationId }),
  });
  const bills = useMemo(() => (data?.proformas ?? []).filter((r) => r.state !== "DRAFT"), [data?.proformas]);

  const columns = useMemo(() => [
    {
      accessorFn: (r: ProformaTrackerRow) => r.proformaDate ?? "", id: "billDate", header: "Bill Date", size: 120,
      Footer: TotalLabel,
      Cell: ({ row }: any) => (row.original.proformaDate ? formatDate(row.original.proformaDate) : DASH),
    },
    {
      accessorFn: (r: ProformaTrackerRow) => [r.proformaNumber, r.invoiceNumber].filter(Boolean).join(" → ") || DASH,
      id: "billNo", header: "Bill No", size: 240,
    },
    { accessorFn: (r: ProformaTrackerRow) => r.projectNumber ?? DASH, id: "projectNumber", header: "Project No", size: 170 },
    { accessorFn: (r: ProformaTrackerRow) => r.projectName ?? DASH, id: "projectName", header: "Project Name", size: 220 },
    { accessorFn: (r: ProformaTrackerRow) => r.clientName ?? DASH, id: "clientName", header: "Client Company", size: 180 },
    { accessorKey: "stageName", header: "Stage", size: 170 },
    {
      accessorFn: (r: ProformaTrackerRow) => r.settlement.basic.amount, id: "billAmount", header: "Bill Amount", size: 160,
      Cell: ({ row }: any) => <ComponentCell line={row.original.settlement.basic} />,
      Footer: () => <Money value={sumOf(bills, (r) => r.settlement.basic.amount)} bold />,
    },
    {
      accessorFn: (r: ProformaTrackerRow) => r.settlement.gst.amount, id: "gstAmount", header: "GST", size: 150,
      Cell: ({ row }: any) => (
        <ComponentCell line={row.original.settlement.gst} note={row.original.gstRate ? `${row.original.gstRate}%` : undefined} />
      ),
      Footer: () => <Money value={sumOf(bills, (r) => r.settlement.gst.amount)} bold />,
    },
    {
      accessorFn: (r: ProformaTrackerRow) => r.settlement.tds?.amount ?? 0, id: "tdsAmount", header: "TDS", size: 150,
      Cell: ({ row }: any) => <ComponentCell line={row.original.settlement.tds} />,
      Footer: () => <Money value={sumOf(bills, (r) => r.settlement.tds?.amount)} bold />,
    },
    {
      accessorFn: (r: ProformaTrackerRow) => r.settlement.total, id: "billValue", header: "Bill Value", size: 200,
      Cell: ({ row }: any) => {
        const s = (row.original as ProformaTrackerRow).settlement;
        return (
          <BillingStatusTint status={lineStatusOf(s.overall).code!}>
            <Stack spacing={0.25} alignItems="flex-start">
              <Money value={s.total} bold />
              {s.tds && (
                <Typography sx={{ fontSize: 10.5, color: "text.secondary" }} noWrap>
                  {formatCurrencyDecimal(s.basic.amount)} + {formatCurrencyDecimal(s.tds.amount)} TDS + {formatCurrencyDecimal(s.gst.amount)} GST
                </Typography>
              )}
            </Stack>
          </BillingStatusTint>
        );
      },
      Footer: () => <Money value={sumOf(bills, (r) => r.settlement.total)} bold />,
    },
    {
      accessorFn: (r: ProformaTrackerRow) => r.settlement.received, id: "received", header: "Received", size: 140,
      Cell: ({ row }: any) => <Money value={row.original.settlement.received} tone="success.main" muted={!row.original.settlement.received} />,
      Footer: () => <Money value={sumOf(bills, (r) => r.settlement.received)} bold tone="success.main" />,
    },
    {
      accessorFn: (r: ProformaTrackerRow) => r.settlement.pending, id: "pending", header: "Pending", size: 140,
      Cell: ({ row }: any) => (
        <Money value={row.original.settlement.pending} bold tone={row.original.settlement.pending > 0 ? "error.main" : undefined} muted={!row.original.settlement.pending} />
      ),
      Footer: () => <Money value={sumOf(bills, (r) => r.settlement.pending)} bold tone="error.main" />,
    },
    {
      accessorFn: (r: ProformaTrackerRow) => r.dueDate ?? "", id: "dueDate", header: "Due Date", size: 140,
      Cell: ({ row }: any) => <DueCell date={row.original.dueDate} overdueDays={row.original.overdueDays ?? 0} />,
    },
    {
      accessorFn: (r: ProformaTrackerRow) => r.lastPaymentAt ?? "", id: "lastPaymentAt", header: "Last Payment", size: 130,
      Cell: ({ row }: any) => (row.original.lastPaymentAt ? formatDate(row.original.lastPaymentAt) : DASH),
    },
  ], [bills]);

  return (
    <Box sx={{ pb: 4 }}>
      <MaterialTable
        {...TRACKER_TABLE}
        data={bills}
        columns={columns}
        tableName="InvoiceTrackerBills"
        isLoading={isLoading}
        searchPlaceholder="Search bill, project, client or stage…"
        muiTableProps={{
          sx: { minWidth: "2300px" },
          muiTableBodyRowProps: ({ row }: any) => {
            const r: ProformaTrackerRow = row.original;
            const accent = r.overdueDays > 0 ? TRIO.rose.c : r.settlement.overall === "received" ? TRIO.green.c : TRIO.cyan.c;
            return { onClick: () => navigate(`/project/${r.leadId}?tab=billing`), sx: trackerRowSx(accent) };
          },
        }}
      />
    </Box>
  );
};

export default BillInvoiceTrackerPage;
