import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { WtButton, TRIO } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate, formatDateTime } from "@utils/dateFormats";
import { listPayments, type PaymentListItem, type PaymentListParams } from "@services/payments";
import { BillingStatusBadge, ProjectFilterBanner, BillingPageHeader } from "../components";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import PeriodFilter, { type PeriodRange } from "@app/modules/common/components/PeriodFilter";
import { DATE_FORMATS } from "@utils/dateFormats";
import { DueChip } from "../operations/operationUi";
import RecordPaymentDialog from "./RecordPaymentDialog";
import { KTIcon } from "@metronic/helpers";

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

const DUE_OPTIONS = [
  { value: "", label: "Any due state" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "DUE_TODAY", label: "Due Today" },
  { value: "UPCOMING", label: "Upcoming" },
];

const FILTERS = [
  { key: "paymentStatus", label: "Payment Status", options: STATUS_OPTIONS },
  { key: "dueState", label: "Due", options: DUE_OPTIONS },
];

/**
 * The whole (capped) set in one request.
 *
 * `MaterialTable` searches, sorts and pages in the browser, so it can only be
 * right about the totals if it holds every row. The server already caps the merge
 * at 500 rows per source, which is the real ceiling — this just matches it.
 *
 * ponytail: if a tenant ever outgrows that cap, both ends move together —
 * `manualPagination` here and a SQL-side UNION there. Paging one end without the
 * other is how a table starts sorting only the page it can see.
 */
const PAGE_SIZE = 500;

const PaymentCollectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Record<string, string>>({
    paymentStatus: "", dueState: "", readyForInvoice: "",
  });
  const [amounts, setAmounts] = useState({ minAmount: "", maxAmount: "" });
  const [page, setPage] = useState(1);
  const [recordTarget, setRecordTarget] = useState<PaymentListItem | null>(null);
  /**
   * The period the whole screen is scoped to.
   *
   * Applied to the DOCUMENT'S OWN DATE — the date the client was asked for money —
   * because "which proformas are still pending this year" is a question about when
   * they were raised, not when somebody last touched the row.
   *
   * Starts on All Time so the screen opens showing everything outstanding; a
   * collections list that silently hides last year's unpaid proformas is the one
   * failure mode worth avoiding here.
   */
  const [period, setPeriod] = useState<{ from?: string; to?: string }>({});
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
    dueState: (filters.dueState || undefined) as PaymentListParams["dueState"],
    readyForInvoice: filters.readyForInvoice === "true" ? true : undefined,
    ...period,
    sortBy: "lastPaymentAt",
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["payments", params],
    queryFn: () => listPayments(params),
  });



  const payments = data?.payments ?? [];

  /**
   * The settlement chip for ONE component.
   *
   * null is not false: an operation does not track components at all, and saying
   * "Unpaid" about a question it cannot answer would be a claim, not a blank.
   */
  /**
   * The settlement chip for one component.
   *
   * Each component has its OWN pair of codes, configured under its own group in
   * Billing -> Configure. They are not shared: `billing_status_labels` is keyed by
   * code with no group column, so one shared PAID would make recolouring the GST
   * chip silently recolour the TDS one too.
   *
   * null is not false — an operation does not track components at all, and saying
   * "Awaited" about a question it cannot answer would be a claim, not a blank.
   */
  const settlementChip = (component: "BASIC" | "GST" | "TDS", settled: boolean | null) =>
    settled == null ? null : (
      <BillingStatusBadge status={`${component}_${settled ? "PAID" : "UNPAID"}`} />
    );

  const money = (value: number | null | undefined, muted = false) =>
    value == null ? (
      <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>—</Typography>
    ) : (
      <Typography sx={{ fontSize: 12.5, fontWeight: muted ? 500 : 700 }}>
        {formatCurrencyDecimal(value)}
      </Typography>
    );

  /**
   * Columns for the shared `MaterialTable` engine.
   *
   * `accessorFn` rather than `accessorKey` wherever the value lives under
   * `project` — the engine's search, sort and export all read the accessor, so a
   * column that only renders in `Cell` would be invisible to every one of them.
   */
  const columns = useMemo(() => [
    {
      accessorFn: (row: PaymentListItem) => row.documentDate ?? "",
      id: "documentDate",
      header: "Bill Date",
      size: 120,
      Cell: ({ row }: any) => (
        <Typography sx={{ fontSize: 12.5 }}>
          {row.original.documentDate ? formatDate(row.original.documentDate) : "—"}
        </Typography>
      ),
    },
    {
      accessorFn: (row: PaymentListItem) =>
        [row.proformaNumber, row.invoiceNumber].filter(Boolean).join(" → ") || "—",
      id: "billNo",
      header: "Bill No",
      size: 230,
      /**
       * The two numbers the CLIENT holds. The internal record numbers — BR, BO and
       * the per-deliverable BILL — are deliberately not shown: four series on one
       * row is noise, and "BILL/2026/0001" reads as the bill while the actual bill
       * is the tax invoice beside it.
       */
      Cell: ({ row }: any) => {
        const item = row.original as PaymentListItem;
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} noWrap>
              {item.proformaNumber ?? "—"}
            </Typography>
            {item.invoiceNumber && (
              <>
                <Typography sx={{ fontSize: 11, color: "text.disabled" }}>→</Typography>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700 }} noWrap>
                  {item.invoiceNumber}
                </Typography>
              </>
            )}
          </Box>
        );
      },
    },
    {
      // Number and name as separate columns: each is sorted, searched, hidden and
      // exported on its own, which a two-line cell cannot do for either of them.
      accessorFn: (row: PaymentListItem) => row.project?.projectNumber ?? "—",
      id: "projectNumber",
      header: "Project No",
      size: 180,
      Cell: ({ row }: any) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} noWrap>
          {row.original.project?.projectNumber ?? "—"}
        </Typography>
      ),
    },
    {
      accessorFn: (row: PaymentListItem) =>
        row.project?.projectName ?? row.projectName ?? "—",
      id: "projectName",
      header: "Project Name",
      size: 220,
    },
    {
      accessorFn: (row: PaymentListItem) => row.project?.clientName ?? row.clientName ?? "—",
      id: "clientName",
      header: "Client Company",
      size: 180,
    },
    {
      // Who runs the WORK.
      accessorFn: (row: PaymentListItem) => row.project?.managerName ?? "—",
      id: "managerName",
      header: "Project Manager",
      size: 170,
    },
    {
      // Who chases the MONEY. Often not the project manager, which is exactly why
      // it is its own column rather than a fallback.
      accessorFn: (row: PaymentListItem) => row.project?.followUpManagerName ?? "—",
      id: "followUpManagerName",
      header: "Follow-up Manager",
      size: 180,
    },
    {
      accessorFn: (row: PaymentListItem) => row.breakdown.basicPortion,
      id: "basicPortion",
      header: "Bill Amount",
      size: 160,
      /**
       * The basic NET OF THE TDS withheld from it — the part that actually
       * arrives as cash.
       *
       * Not the gross taxable value: the TDS is already broken out in its own
       * column, so showing the gross here would count it twice and the three
       * components would no longer add up to the Bill Value beside them.
       */
      Cell: ({ row }: any) => {
        const b = (row.original as PaymentListItem).breakdown;
        return (
          <Box>
            {money(b.basicPortion)}
            {settlementChip("BASIC", b.basicPaid)}
          </Box>
        );
      },
    },
    {
      accessorFn: (row: PaymentListItem) => row.breakdown.gstAmount,
      id: "gstAmount",
      header: "GST",
      size: 140,
      Cell: ({ row }: any) => {
        const b = (row.original as PaymentListItem).breakdown;
        return (
          <Box>
            {money(b.gstAmount)}
            {b.gstRate ? (
              <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>{b.gstRate}%</Typography>
            ) : null}
            {settlementChip("GST", b.gstPaid)}
          </Box>
        );
      },
    },
    {
      accessorFn: (row: PaymentListItem) => row.breakdown.faceValue,
      id: "faceValue",
      header: "Bill Value",
      size: 140,
      /**
       * Basic + GST, the face value of the document.
       *
       * NOT net of TDS. The TDS is withheld FROM this figure and remitted on our
       * behalf — it is a component of the bill, not a discount on it, so the total
       * stays what the client was billed. Using the net figure here is what made
       * the breakdown line below disagree with the number above it.
       *
       * The second line is the reconciliation somebody actually does, and it adds
       * back to exactly this total: basic-net-of-TDS + TDS + GST.
       */
      Cell: ({ row }: any) => {
        const item = row.original as PaymentListItem;
        const b = item.breakdown;
        return (
          <Box>
            {money(b.faceValue)}
            {b.tdsAmount != null && b.tdsAmount > 0 && (
              <Typography sx={{ fontSize: 10.5, color: "text.secondary" }} noWrap>
                {formatCurrencyDecimal(b.basicPortion)} + {formatCurrencyDecimal(b.tdsAmount)} TDS
                {" + "}{formatCurrencyDecimal(b.gstAmount)} GST
              </Typography>
            )}
            {/*
              Bill Value's status IS the payment status — what the client has
              settled against the whole document. It lives here rather than in a
              column of its own so each amount sits with the status that describes
              it, and so the same fact is not printed twice.
            */}
            <BillingStatusBadge status={item.paymentStatus} />
          </Box>
        );
      },
    },
    {
      accessorFn: (row: PaymentListItem) => row.breakdown.tdsAmount ?? -1,
      id: "tdsAmount",
      header: "TDS",
      size: 150,
      /**
       * Withheld by the client and deposited with the government on our behalf.
       * The DEPOSIT is the part worth watching — a deduction with no deposit is
       * money simply lost, and nothing else on this screen would show it going.
       *
       * An operation reports null rather than zero: that path stores one lump tax
       * and does not track TDS, and "—" is the honest answer to a question it
       * cannot answer.
       */
      Cell: ({ row }: any) => {
        const b = (row.original as PaymentListItem).breakdown;
        if (b.tdsAmount == null) {
          return <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>—</Typography>;
        }
        if (b.tdsAmount <= 0) {
          return <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>No TDS</Typography>;
        }
        return (
          <Box>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
              {formatCurrencyDecimal(b.tdsAmount)}
              {b.tdsRate ? (
                <Typography component="span" sx={{ fontSize: 10.5, color: "text.secondary" }}>
                  {" "}({b.tdsRate}%)
                </Typography>
              ) : null}
            </Typography>
            {settlementChip("TDS", b.tdsDeposited)}
          </Box>
        );
      },
    },
    {
      accessorFn: (row: PaymentListItem) => row.lastPaymentAt ?? "",
      id: "lastPaymentAt",
      header: "Payment Date",
      size: 150,
      Cell: ({ row }: any) => (
        <Box>
          <Typography sx={{ fontSize: 12.5 }}>
            {row.original.lastPaymentAt ? formatDateTime(row.original.lastPaymentAt) : "—"}
          </Typography>
          <DueChip due={row.original.due} />
        </Box>
      ),
    },
    {
      accessorKey: "id",
      header: "Action",
      size: 150,
      enableSorting: false,
      enableColumnFilter: false,
      Cell: ({ row }: any) => (
        <WtButton
          ghost size="small"
          disabled={Number(row.original.outstandingAmount) <= 0 && row.original.paymentStatus !== "PENDING"}
          onClick={(event: React.MouseEvent) => { event.stopPropagation(); setRecordTarget(row.original); }}
          sx={{ minHeight: 28, fontSize: 11.5 }}
        >
          Record Payment
        </WtButton>
      ),
    },
  ], []);

  return (
    <Box sx={{ pb: 4 }}>
      <BillingPageHeader
        icon="wallet"
        trio={TRIO.green}
        title="Payment Collection"
        description="Record, verify and track client payments against every issued proforma."
        action={
          <WtButton
            ghost size="small"
            onClick={() => navigate("/billing/tracker")}
            startIcon={<KTIcon iconName="chart-simple" className="fs-6" />}
            sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
          >
            Billing Tracker
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

      <Box sx={{ my: 3 }}>
        <Alert
          severity="error"
          variant="filled"
          sx={{
            borderRadius: 3,
            backgroundColor: 'error.main',
            color: 'error.contrastText',
            fontSize: '15px',
            fontWeight: 600,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            border: '2px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(8px)',
            '& .MuiAlert-icon': {
              fontSize: '28px',
              marginRight: '8px'
            }
          }}
          icon={<span>🚨</span>}
        >
          <Box>
            <strong style={{ display: 'block', marginBottom: '4px' }}>Development Mode - Data Not Available</strong>
            <span style={{ opacity: 0.95 }}>This page is still in development. The data table will not display any records at this time. This is for testing and development purposes only.</span>
          </Box>
        </Alert>
      </Box>

      {/*
        Period first, because it scopes everything under it — the tiles and the
        rows both narrow to the same slice of time, which is what lets a tile's
        count be checked against the rows it filters to.
      */}
      {/* Tight to the table it scopes — a gap here reads as two unrelated blocks. */}
      <Box sx={{ mb: 0.75 }}>
        <PeriodFilter
          initialMode="allyear"
          storageKey="paymentCollectionPeriod"
          useFiscalYear
          onChange={(range: PeriodRange) => {
            setPeriod({
              from: range.start ? range.start.format(DATE_FORMATS.WIRE) : undefined,
              to: range.end ? range.end.format(DATE_FORMATS.WIRE) : undefined,
            });
            setPage(1);
          }}
        />
      </Box>


      {/*
        The SHARED table engine, as every other list in the app uses. Moving off
        the billing-local table restores what that one never had: per-column
        search, show/hide, reordering, resizing, export and per-user column
        preferences — all of it for free, and all of it behaving the way a reader
        has already learned on Leads.
      */}
      <MaterialTable
        columns={columns}
        data={payments}
        tableName="PaymentCollection"
        isLoading={isLoading}
        enableColumnSpecificSearch
        searchPlaceholder="Search proforma, bill, project, client…"
        defaultSorting={[{ id: "lastPaymentAt", desc: true }]}
        enableColumnResizing
        layoutMode="semantic"
        muiTableContainerProps={{ sx: { maxHeight: "700px", overflowX: "auto" } }}
        muiTableProps={{ sx: { minWidth: "1800px" } }}
        renderTopToolbarRightActions={() => (
          // Every control that narrows the table lives IN the table's toolbar.
          // Two of them floating above it read as page furniture rather than as
          // filters, and nothing tied them to the rows they were changing.
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              size="small" label="Min amount" type="number" value={amounts.minAmount}
              onChange={(event) => setAmounts((p) => ({ ...p, minAmount: event.target.value }))}
              InputLabelProps={{ shrink: true }} sx={{ width: 130 }}
            />
            <TextField
              size="small" label="Max amount" type="number" value={amounts.maxAmount}
              onChange={(event) => setAmounts((p) => ({ ...p, maxAmount: event.target.value }))}
              InputLabelProps={{ shrink: true }} sx={{ width: 130 }}
            />
            {FILTERS.map((filter) => (
              <TextField
                key={filter.key}
                select size="small" label={filter.label}
                value={filters[filter.key] ?? ""}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, [filter.key]: event.target.value }));
                  setPage(1);
                }}
                sx={{ minWidth: 150 }}
              >
                {filter.options.map((option) => (
                  <MenuItem key={option.value} value={option.value} sx={{ fontSize: 13 }}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            ))}
          </Stack>
        )}
        muiTablePaperStyle={{ boxShadow: "none", marginTop: 0 }}
      />

      <RecordPaymentDialog
        open={!!recordTarget}
        onClose={() => setRecordTarget(null)}
        operationId={recordTarget?.id ?? ""}
        operationNumber={recordTarget?.operationNumber ?? ""}
        outstandingAmount={Number(recordTarget?.outstandingAmount ?? 0)}
        source={recordTarget?.source ?? "OPERATION"}
      />
    </Box>
  );
};

export default PaymentCollectionPage;
