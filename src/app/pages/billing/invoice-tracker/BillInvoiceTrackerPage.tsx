import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DataTable, type ColumnDef } from "@/ds/patterns/data-table";
import { TRIO } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import { getProformaTracker, type ProformaTrackerRow } from "@services/billingTrackers";
import type { SettlementLine } from "@services/bills";
import { useBillingOrgId } from "../BillingLayout";
import { DASH, DueCell, Money, TRACKER_TABLE, TotalLabel, sumOf } from "../components/trackerKit";
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
  !line ? <span className="text-[length:inherit] text-muted-foreground">No TDS</span> : (
    <BillingStatusTint status={lineStatusOf(line.tone).code!}>
      <div className="flex flex-col items-start gap-0.5">
        <Money value={line.amount} bold />
        {note && <span className="text-[10.5px] text-muted-foreground">{note}</span>}
      </div>
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

  const columns = useMemo<ColumnDef<ProformaTrackerRow, unknown>[]>(() => [
    {
      accessorFn: (r) => r.proformaDate ?? "", id: "billDate", header: "Bill Date", size: 120,
      meta: { wrap: false },
      footer: () => <TotalLabel />,
      cell: ({ row }) => (row.original.proformaDate ? formatDate(row.original.proformaDate) : DASH),
    },
    {
      accessorFn: (r) => [r.proformaNumber, r.invoiceNumber].filter(Boolean).join(" → ") || DASH,
      id: "billNo", header: "Bill No", size: 240,
      meta: { wrap: false },
    },
    { accessorFn: (r) => r.projectNumber ?? DASH, id: "projectNumber", header: "Project No", size: 170, meta: { wrap: false } },
    { accessorFn: (r) => r.projectName ?? DASH, id: "projectName", header: "Project Name", size: 220 },
    { accessorFn: (r) => r.clientName ?? DASH, id: "clientName", header: "Client Company", size: 180 },
    { accessorKey: "stageName", header: "Stage", size: 170 },
    {
      accessorFn: (r) => r.settlement.basic.amount, id: "billAmount", header: "Bill Amount", size: 160,
      meta: { exportType: "currency" },
      cell: ({ row }) => <ComponentCell line={row.original.settlement.basic} />,
      footer: () => <Money value={sumOf(bills, (r) => r.settlement.basic.amount)} bold />,
    },
    {
      accessorFn: (r) => r.settlement.gst.amount, id: "gstAmount", header: "GST", size: 150,
      meta: { exportType: "currency" },
      cell: ({ row }) => (
        <ComponentCell line={row.original.settlement.gst} note={row.original.gstRate ? `${row.original.gstRate}%` : undefined} />
      ),
      footer: () => <Money value={sumOf(bills, (r) => r.settlement.gst.amount)} bold />,
    },
    {
      accessorFn: (r) => r.settlement.tds?.amount ?? 0, id: "tdsAmount", header: "TDS", size: 150,
      meta: { exportType: "currency" },
      cell: ({ row }) => <ComponentCell line={row.original.settlement.tds} />,
      footer: () => <Money value={sumOf(bills, (r) => r.settlement.tds?.amount)} bold />,
    },
    {
      accessorFn: (r) => r.settlement.total, id: "billValue", header: "Bill Value", size: 200,
      meta: { exportType: "currency" },
      cell: ({ row }) => {
        const s = row.original.settlement;
        return (
          <BillingStatusTint status={lineStatusOf(s.overall).code!}>
            <div className="flex flex-col items-start gap-0.5">
              <Money value={s.total} bold />
              {s.tds && (
                <span className="truncate text-[10.5px] text-muted-foreground">
                  {formatCurrencyDecimal(s.basic.amount)} + {formatCurrencyDecimal(s.tds.amount)} TDS + {formatCurrencyDecimal(s.gst.amount)} GST
                </span>
              )}
            </div>
          </BillingStatusTint>
        );
      },
      footer: () => <Money value={sumOf(bills, (r) => r.settlement.total)} bold />,
    },
    {
      accessorFn: (r) => r.settlement.received, id: "received", header: "Received", size: 140,
      meta: { exportType: "currency" },
      cell: ({ row }) => <Money value={row.original.settlement.received} tone="success" muted={!row.original.settlement.received} />,
      footer: () => <Money value={sumOf(bills, (r) => r.settlement.received)} bold tone="success" />,
    },
    {
      accessorFn: (r) => r.settlement.pending, id: "pending", header: "Pending", size: 140,
      meta: { exportType: "currency" },
      cell: ({ row }) => (
        <Money value={row.original.settlement.pending} bold tone={row.original.settlement.pending > 0 ? "danger" : undefined} muted={!row.original.settlement.pending} />
      ),
      footer: () => <Money value={sumOf(bills, (r) => r.settlement.pending)} bold tone="danger" />,
    },
    {
      accessorFn: (r) => r.dueDate ?? "", id: "dueDate", header: "Due Date", size: 140,
      meta: { wrap: false },
      cell: ({ row }) => <DueCell date={row.original.dueDate} overdueDays={row.original.overdueDays ?? 0} />,
    },
    {
      accessorFn: (r) => r.lastPaymentAt ?? "", id: "lastPaymentAt", header: "Last Payment", size: 130,
      meta: { wrap: false },
      cell: ({ row }) => (row.original.lastPaymentAt ? formatDate(row.original.lastPaymentAt) : DASH),
    },
  ], [bills]);

  return (
    <div className="pb-8">
      <DataTable
        {...TRACKER_TABLE}
        caption="Bill Invoice Tracker"
        data={bills}
        columns={columns}
        getRowId={(r) => r.billId}
        stateKey="InvoiceTrackerBills"
        loading={isLoading}
        searchPlaceholder="Search bill, project, client or stage…"
        minWidth={2300}
        onRowClick={(r) => navigate(`/project/${r.leadId}?tab=billing`)}
        rowLabel={(r) => r.proformaNumber ?? r.billNumber ?? "Open bill"}
        rowTone={(r) =>
          r.overdueDays > 0 ? TRIO.rose.c : r.settlement.overall === "received" ? TRIO.green.c : TRIO.cyan.c
        }
      />
    </div>
  );
};

export default BillInvoiceTrackerPage;
