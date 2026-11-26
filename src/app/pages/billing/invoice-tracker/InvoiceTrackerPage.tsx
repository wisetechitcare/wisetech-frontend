import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, FileDown, FileText, FolderOpen, MoreHorizontal, Pencil, Share2 } from "lucide-react";
import { cn } from "@/ds/lib/utils";
import { Button } from "@/ds/ui/button";
import { Progress } from "@/ds/ui/progress";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/ds/ui/dropdown-menu";
import { DataTable, type ColumnDef } from "@/ds/patterns/data-table";
import { TRIO, toast } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import {
  getInvoiceTracker, type InvoiceState, type InvoiceTrackerProject, type InvoiceTrackerRow, type UninvoicedBill,
} from "@services/billingTrackers";
import { accessDocument, downloadDocumentWord } from "@services/billingDocuments";
import { useBillingOrgId } from "../BillingLayout";
import { BillingStatusBadge, ProjectFilterBanner } from "../components";
import {
  DASH, DueCell, Money, NumberDate, StateCounts, StatusChips, TRACKER_TABLE, TotalLabel, TrackerToolbar,
  sumOf, usePoChip, useTrackerParams, type TrackerTile,
} from "../components/trackerKit";

/**
 * The Tax Invoice Tracker — the Proforma Tracker's sibling, built from the same parts.
 *
 *   PROJECTS   — every project: billed, invoiced (with a % bar), bills still to invoice, where each invoice stands,
 *                received, outstanding, TDS not yet deposited.
 *   INVOICES   — one row per tax invoice: the money, the document, the due date, the TDS.
 *   TO INVOICE — the queue: bills the client has been sent (a proforma, usually) that have no tax invoice yet. A paid
 *                one is "invoice due" — the GST return needs it now.
 *
 * A tax invoice is the SAME bill's second document, raised from the project's Billing tab (independently of payment),
 * so every figure here is read off the bill and agrees with that tab by construction.
 */

type Focus = "ALL" | "TO_INVOICE" | "INVOICE_DUE" | InvoiceState | "OVERDUE";

const inProject = <T extends { leadId: string }>(rows: T[] | undefined, projectId: string | null | undefined) =>
  (rows ?? []).filter((r) => !projectId || r.leadId === projectId);

const TILES: TrackerTile<Focus>[] = [
  { key: "ALL", label: "All", icon: "receipt-square", trio: TRIO.blue },
  { key: "TO_INVOICE", label: "Not invoiced yet", icon: "add-files", trio: TRIO.slate },
  { key: "INVOICE_DUE", label: "Invoice due · paid", icon: "notification-status", trio: TRIO.amber },
  { key: "DRAFT", label: "Draft", icon: "pencil", trio: TRIO.purple },
  { key: "AWAITING", label: "Awaiting payment", icon: "time", trio: TRIO.cyan },
  { key: "PARTIAL", label: "Partially paid", icon: "chart-pie-simple", trio: TRIO.amber },
  { key: "OVERDUE", label: "Overdue", icon: "information-5", trio: TRIO.rose },
  { key: "SETTLED", label: "Settled", icon: "check-circle", trio: TRIO.green },
];
const FOCUS_KEYS = TILES.map((t) => t.key);
/** The tiles that are invoice stages — the ones a project's counts are broken down by. */
const STAGE_TILES = TILES.filter((t) => ["DRAFT", "AWAITING", "PARTIAL", "SETTLED"].includes(t.key));
/** Tiles about bills with no invoice yet: they belong to the To-invoice view. */
const QUEUE_FOCUS: Focus[] = ["TO_INVOICE", "INVOICE_DUE"];

const projectMatches = (p: InvoiceTrackerProject, focus: Focus) =>
  focus === "ALL" ? true
    : focus === "TO_INVOICE" ? (p.notInvoicedCount ?? 0) > 0
      : focus === "INVOICE_DUE" ? (p.invoiceDueCount ?? 0) > 0
        : focus === "OVERDUE" ? (p.counts?.overdue ?? 0) > 0
          : (p.counts?.[focus] ?? 0) > 0;

const invoiceMatches = (r: InvoiceTrackerRow, focus: Focus) =>
  focus === "ALL" || QUEUE_FOCUS.includes(focus) ? true
    : focus === "OVERDUE" ? r.overdueDays > 0
      : r.state === focus;

const queueMatches = (b: UninvoicedBill, focus: Focus) => (focus === "INVOICE_DUE" ? b.paid : true);

/**
 * Which statuses filter which view: Projects takes them all; Tax Invoices the invoice stages; the To-invoice queue
 * only "invoice due" (every queued bill is "not invoiced yet", so that chip would equal All there).
 */
const viewHas = (view: string, key: Focus) =>
  view === "projects" ? true
    : view === "queue" ? key === "INVOICE_DUE"
      : !QUEUE_FOCUS.includes(key);

/** The editor while it is a draft, the record (with its revisions) once issued. */
const invoicePath = (r: { documentId: string; state: InvoiceState }) =>
  `/billing/documents/${r.documentId}${r.state === "DRAFT" ? "/edit" : ""}`;

const InvoiceTrackerPage: React.FC = () => {
  const navigate = useNavigate();
  const organizationId = useBillingOrgId();
  const poChip = usePoChip();
  const { view, focus, projectId, setParam } = useTrackerParams<Focus>(["invoices", "queue"], FOCUS_KEYS, "ALL");
  const pickStatus = (key: Focus) => setParam({ focus: key === "ALL" ? null : key });

  const { data, isLoading } = useQuery({
    queryKey: ["invoice-tracker", organizationId],
    queryFn: () => getInvoiceTracker({ organizationId }),
  });

  const allProjects = useMemo(() => inProject(data?.projects, projectId), [data?.projects, projectId]);
  const allInvoices = useMemo(() => inProject(data?.invoices, projectId), [data?.invoices, projectId]);
  const allQueue = useMemo(() => inProject(data?.uninvoiced, projectId), [data?.uninvoiced, projectId]);

  // Each chip counts exactly the rows it leaves in the open view, so the number always matches the table.
  const statusOptions = useMemo(
    () => TILES
      .filter((t) => t.key === "ALL" || viewHas(view, t.key))
      .map((t) => ({
        key: t.key,
        label: t.label,
        trio: t.key === "ALL" ? undefined : t.trio,
        count: view === "projects" ? allProjects.filter((p) => projectMatches(p, t.key)).length
          : view === "invoices" ? allInvoices.filter((r) => invoiceMatches(r, t.key)).length
            : allQueue.filter((b) => queueMatches(b, t.key)).length,
      })),
    [view, allProjects, allInvoices, allQueue],
  );

  // Projects with invoice work first (an invoice due, then bills to invoice, then the newest invoice).
  const projects = useMemo(
    () => allProjects
      .filter((p) => projectMatches(p, focus))
      .sort((a, b) =>
        (b.invoiceDueCount ?? 0) - (a.invoiceDueCount ?? 0)
        || (b.notInvoicedCount ?? 0) - (a.notInvoicedCount ?? 0)
        || (b.lastInvoice?.date ?? "").localeCompare(a.lastInvoice?.date ?? "")
        || (b.billedAmount ?? 0) - (a.billedAmount ?? 0)),
    [allProjects, focus],
  );
  const invoices = useMemo(() => allInvoices.filter((r) => invoiceMatches(r, focus)), [allInvoices, focus]);
  const queue = useMemo(
    () => allQueue.filter((b) => queueMatches(b, focus)).sort((a, b) => Number(b.paid) - Number(a.paid)),
    [allQueue, focus],
  );

  const errorText = (error: any) => error?.response?.data?.detail ?? error?.response?.data?.message;
  const access = useMutation({
    mutationFn: ({ id, intent }: { id: string; intent: "DOWNLOAD" | "SHARE" }) => accessDocument(id, intent),
    onSuccess: async (result, variables) => {
      if (variables.intent === "SHARE") {
        try {
          await navigator.clipboard.writeText(result.url);
          toast({ icon: "success", title: "Share link copied — valid for 7 days" });
          return;
        } catch { /* fall through and open it */ }
      }
      window.open(result.url, "_blank", "noopener");
    },
    onError: (error: any) => toast({ icon: "error", title: errorText(error) ?? "Could not open the invoice" }),
  });
  const word = useMutation({
    mutationFn: (id: string) => downloadDocumentWord(id),
    onError: (error: any) => toast({ icon: "error", title: errorText(error) ?? "Could not download the Word file" }),
  });

  const projectBilling = (leadId: string) => navigate(`/project/${leadId}?tab=billing`);

  // ── Projects view ─────────────────────────────────────────────────────────
  const projectColumns = useMemo<ColumnDef<InvoiceTrackerProject, unknown>[]>(() => [
    {
      accessorFn: (p) => p.projectNumber ?? "", id: "projectNumber", header: "Project No", size: 170,
      meta: { wrap: false },
      footer: () => <TotalLabel />,
      cell: ({ row }) => <span className="text-[length:inherit] font-bold">{row.original.projectNumber ?? DASH}</span>,
    },
    { accessorFn: (p) => p.projectName ?? DASH, id: "projectName", header: "Project Name", size: 240 },
    { accessorFn: (p) => p.clientName ?? DASH, id: "clientName", header: "Client Company", size: 180 },
    { accessorFn: (p) => p.managerName ?? DASH, id: "managerName", header: "Project Manager", size: 160 },
    {
      accessorFn: (p) => p.poStatus ?? "", id: "poStatus", header: "PO", size: 140,
      meta: { wrap: false },
      cell: ({ row }) => poChip(row.original.poStatus),
    },
    {
      accessorFn: (p) => p.billedAmount ?? 0, id: "billedAmount", header: "Billed", size: 150,
      meta: { exportType: "currency" },
      cell: ({ row }) => <Money value={row.original.billedAmount} bold muted={!row.original.billedAmount} />,
      footer: () => <Money value={sumOf(projects, (p) => p.billedAmount)} bold />,
    },
    {
      accessorFn: (p) => p.invoicedAmount ?? 0, id: "invoicedAmount", header: "Invoiced", size: 190,
      meta: { exportType: "currency" },
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="min-w-[150px]">
            <div className="mb-[3px] flex flex-row justify-between">
              <Money value={p.invoicedAmount} bold muted={!p.invoicedAmount} />
              {p.invoicedPercent != null && (
                <span className="text-[11px] text-muted-foreground">{p.invoicedPercent}%</span>
              )}
            </div>
            {p.invoicedPercent != null && <Progress value={p.invoicedPercent} aria-label="Share of the billed value invoiced" />}
          </div>
        );
      },
      footer: () => <Money value={sumOf(projects, (p) => p.invoicedAmount)} bold />,
    },
    {
      accessorFn: (p) => p.notInvoicedAmount ?? 0, id: "notInvoicedAmount", header: "To Invoice", size: 170,
      meta: { exportType: "currency" },
      cell: ({ row }) => {
        const p = row.original;
        if (!p.notInvoicedCount) return <Money value={0} muted />;
        return (
          <div>
            <Money value={p.notInvoicedAmount} bold tone={TRIO.slate.c} />
            {/* Amber only when an invoice is actually due; the colour is a runtime trio value. */}
            <p
              className={cn("text-[11px]", p.invoiceDueCount ? "font-bold text-(--due-tone)" : "font-normal text-muted-foreground")}
              style={p.invoiceDueCount ? ({ "--due-tone": TRIO.amber.c } as React.CSSProperties) : undefined}
            >
              {p.notInvoicedCount} bill{p.notInvoicedCount === 1 ? "" : "s"}
              {p.invoiceDueCount ? ` · ${p.invoiceDueCount} paid, invoice due` : ""}
            </p>
          </div>
        );
      },
      footer: () => <Money value={sumOf(projects, (p) => p.notInvoicedAmount)} bold />,
    },
    {
      accessorFn: (p) => p.counts?.total ?? 0, id: "invoices", header: "Tax Invoices", size: 260,
      cell: ({ row }) => (row.original.counts ? <StateCounts counts={row.original.counts} tiles={STAGE_TILES} /> : null),
    },
    {
      accessorFn: (p) => p.receivedAmount ?? 0, id: "receivedAmount", header: "Received", size: 140,
      meta: { exportType: "currency" },
      cell: ({ row }) => <Money value={row.original.receivedAmount} tone="success" muted={!row.original.receivedAmount} />,
      footer: () => <Money value={sumOf(projects, (p) => p.receivedAmount)} bold tone="success" />,
    },
    {
      accessorFn: (p) => p.outstandingAmount ?? 0, id: "outstandingAmount", header: "Outstanding", size: 160,
      meta: { exportType: "currency" },
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div>
            <Money value={p.outstandingAmount} bold tone={p.outstandingAmount > 0 ? "danger" : undefined} muted={!p.outstandingAmount} />
            {p.overdueAmount > 0 && (
              <p className="text-[11px] font-bold text-destructive">
                {formatCurrencyDecimal(p.overdueAmount)} overdue
              </p>
            )}
          </div>
        );
      },
      footer: () => <Money value={sumOf(projects, (p) => p.outstandingAmount)} bold tone="danger" />,
    },
    {
      accessorFn: (p) => p.tdsPendingAmount ?? 0, id: "tdsPendingAmount", header: "TDS Not Deposited", size: 160,
      meta: { exportType: "currency" },
      cell: ({ row }) => <Money value={row.original.tdsPendingAmount} tone={row.original.tdsPendingAmount > 0 ? TRIO.amber.c : undefined} muted={!row.original.tdsPendingAmount} />,
      footer: () => <Money value={sumOf(projects, (p) => p.tdsPendingAmount)} bold />,
    },
    {
      accessorFn: (p) => p.nextDueDate ?? "", id: "nextDueDate", header: "Next Due", size: 130,
      meta: { wrap: false },
      cell: ({ row }) => (row.original.nextDueDate ? formatDate(row.original.nextDueDate) : DASH),
    },
    {
      accessorFn: (p) => p.lastInvoice?.date ?? "", id: "lastInvoice", header: "Latest Invoice", size: 190,
      meta: { wrap: false },
      cell: ({ row }) => {
        const last = row.original.lastInvoice;
        return last ? <NumberDate number={last.number} date={last.date} /> : DASH;
      },
    },
    {
      accessorFn: (p) => p.contractValue ?? -1, id: "contractValue", header: "Contract Value", size: 150,
      meta: { exportType: "currency" },
      cell: ({ row }) => <Money value={row.original.contractValue} />,
      // Totals count projects in billing only — see `inBilling`.
      footer: () => <Money value={sumOf(projects, (p) => (p.inBilling ? p.contractValue : 0))} bold />,
    },
    { accessorFn: (p) => p.followUpManagerName ?? DASH, id: "followUpManagerName", header: "Follow-up Manager", size: 170 },
    { accessorFn: (p) => p.organizationName ?? DASH, id: "organizationName", header: "Organization", size: 220 },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [projects, poChip]);

  // ── Invoices view ─────────────────────────────────────────────────────────
  const invoiceColumns = useMemo<ColumnDef<InvoiceTrackerRow, unknown>[]>(() => [
    {
      accessorFn: (r) => r.invoiceNumber ?? "", id: "invoiceNumber", header: "Invoice No", size: 200,
      meta: { wrap: false },
      footer: () => <TotalLabel />,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div>
            <p className="text-[length:inherit] font-bold">{r.invoiceNumber ?? DASH}</p>
            <p className="text-[11px] text-muted-foreground">
              {r.revisions > 1 ? `Revised · v${r.revisions}` : r.proformaNumber ? `from ${r.proformaNumber}` : r.billNumber}
            </p>
          </div>
        );
      },
    },
    {
      accessorFn: (r) => r.invoiceDate ?? "", id: "invoiceDate", header: "Date", size: 120,
      meta: { wrap: false },
      cell: ({ row }) => (row.original.invoiceDate ? formatDate(row.original.invoiceDate) : DASH),
    },
    { accessorFn: (r) => r.projectNumber ?? DASH, id: "projectNumber", header: "Project No", size: 170, meta: { wrap: false } },
    { accessorFn: (r) => r.projectName ?? DASH, id: "projectName", header: "Project Name", size: 220 },
    { accessorFn: (r) => r.clientName ?? DASH, id: "clientName", header: "Client Company", size: 170 },
    { accessorFn: (r) => r.stageName ?? DASH, id: "stageName", header: "Stage", size: 160 },
    {
      accessorFn: (r) => r.state ?? "", id: "state", header: "Status", size: 150,
      meta: { align: "center", wrap: false },
      cell: ({ row }) => {
        const tile = TILES.find((t) => t.key === row.original.state);
        return tile ? <StateCounts counts={{ total: 1, [tile.key]: 1 }} tiles={[tile]} /> : null;
      },
    },
    {
      accessorFn: (r) => r.amount ?? 0, id: "amount", header: "Taxable", size: 140,
      meta: { exportType: "currency" },
      cell: ({ row }) => <Money value={row.original.amount} />,
      footer: () => <Money value={sumOf(invoices, (r) => r.amount)} bold />,
    },
    {
      accessorFn: (r) => r.gstAmount ?? 0, id: "gstAmount", header: "GST", size: 130,
      meta: { exportType: "currency" },
      cell: ({ row }) => (
        <div>
          <Money value={row.original.gstAmount} />
          {row.original.gstRate > 0 && <p className="text-[11px] text-muted-foreground">{row.original.gstRate}%</p>}
        </div>
      ),
      footer: () => <Money value={sumOf(invoices, (r) => r.gstAmount)} bold />,
    },
    {
      accessorFn: (r) => r.totalAmount ?? 0, id: "totalAmount", header: "Invoice Value", size: 150,
      meta: { exportType: "currency" },
      cell: ({ row }) => <Money value={row.original.totalAmount} bold />,
      footer: () => <Money value={sumOf(invoices, (r) => r.totalAmount)} bold />,
    },
    {
      accessorFn: (r) => r.tdsAmount ?? 0, id: "tdsAmount", header: "TDS", size: 140,
      meta: { exportType: "currency" },
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div>
            <Money value={r.tdsAmount} muted={!r.tdsAmount} />
            {r.tdsPending && (
              <p className="text-[11px] font-bold text-(--tds-tone)" style={{ "--tds-tone": TRIO.amber.c } as React.CSSProperties}>
                Not deposited
              </p>
            )}
          </div>
        );
      },
      footer: () => <Money value={sumOf(invoices, (r) => r.tdsAmount)} bold />,
    },
    {
      accessorFn: (r) => r.receivedAmount ?? 0, id: "receivedAmount", header: "Received", size: 140,
      meta: { exportType: "currency" },
      cell: ({ row }) => <Money value={row.original.receivedAmount} tone="success" muted={!row.original.receivedAmount} />,
      footer: () => <Money value={sumOf(invoices, (r) => r.receivedAmount)} bold tone="success" />,
    },
    {
      accessorFn: (r) => r.outstandingAmount ?? 0, id: "outstandingAmount", header: "Outstanding", size: 140,
      meta: { exportType: "currency" },
      cell: ({ row }) => (
        <Money value={row.original.outstandingAmount} bold tone={row.original.outstandingAmount > 0 ? "danger" : undefined} muted={!row.original.outstandingAmount} />
      ),
      footer: () => <Money value={sumOf(invoices, (r) => r.outstandingAmount)} bold tone="danger" />,
    },
    {
      accessorFn: (r) => r.dueDate ?? "", id: "dueDate", header: "Due Date", size: 140,
      meta: { wrap: false },
      cell: ({ row }) => <DueCell date={row.original.state === "DRAFT" ? null : row.original.dueDate} overdueDays={row.original.overdueDays ?? 0} />,
    },
    {
      accessorFn: (r) => r.lastPaymentAt ?? "", id: "lastPaymentAt", header: "Last Payment", size: 130,
      meta: { wrap: false },
      cell: ({ row }) => (row.original.lastPaymentAt ? formatDate(row.original.lastPaymentAt) : DASH),
    },
    {
      accessorFn: (r) => r.stageCode ?? r.documentStatus ?? "", id: "documentStatus", header: "Document", size: 130,
      meta: { align: "center", wrap: false },
      cell: ({ row }) => <BillingStatusBadge status={row.original.stageCode ?? row.original.documentStatus} />,
    },
    {
      accessorKey: "billId", header: "", size: 64, enableSorting: false, enableColumnFilter: false,
      enableHiding: false,
      meta: { wrap: false },
      cell: ({ row }) => {
        const r = row.original;
        if (!r.billId) return null;
        return (
          /* Not a control: it exists only to keep the row's own click from firing when the
             actions menu is used. Nothing here is tabbable — the menu trigger below is. */
          <div data-wt-control="container" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${r.invoiceNumber ?? r.billNumber}`} />}>
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuItem onClick={() => navigate(invoicePath(r))}>
                  {r.state === "DRAFT" ? <><Pencil /> Edit draft</> : <><FolderOpen /> Open invoice</>}
                </DropdownMenuItem>
                {r.state !== "DRAFT" && (
                  <>
                    <DropdownMenuItem onClick={() => access.mutate({ id: r.documentId, intent: "DOWNLOAD" })}>
                      <FileDown /> Download PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => word.mutate(r.documentId)}>
                      <FileText /> Download Word
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => access.mutate({ id: r.documentId, intent: "SHARE" })}>
                      <Share2 /> Copy share link
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => projectBilling(r.leadId)}>
                  <ExternalLink /> Open project billing
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [invoices]);

  // ── To-invoice view: the queue ────────────────────────────────────────────
  const queueColumns = useMemo<ColumnDef<UninvoicedBill, unknown>[]>(() => [
    {
      accessorFn: (b) => b.proformaNumber ?? "", id: "proformaNumber", header: "Billed On", size: 200,
      meta: { wrap: false },
      footer: () => <TotalLabel />,
      cell: ({ row }) => (
        <div>
          <p className="text-[length:inherit] font-bold">{row.original.proformaNumber ?? DASH}</p>
          <p className="text-[11px] text-muted-foreground">Proforma</p>
        </div>
      ),
    },
    { accessorFn: (b) => b.projectNumber ?? DASH, id: "projectNumber", header: "Project No", size: 170, meta: { wrap: false } },
    { accessorFn: (b) => b.projectName ?? DASH, id: "projectName", header: "Project Name", size: 240 },
    { accessorFn: (b) => b.clientName ?? DASH, id: "clientName", header: "Client Company", size: 180 },
    { accessorFn: (b) => b.stageName ?? DASH, id: "stageName", header: "Stage", size: 180 },
    {
      accessorFn: (b) => (b.paid ? 1 : 0), id: "paid", header: "Invoice", size: 170,
      cell: ({ row }) => {
        if (row.original.billId === undefined) return null;
        const tile = TILES.find((t) => t.key === (row.original.paid ? "INVOICE_DUE" : "TO_INVOICE"))!;
        return (
          <p className="text-xs font-bold text-(--tile-tone)" style={{ "--tile-tone": tile.trio.c } as React.CSSProperties}>
            {row.original.paid ? "Due now — fully paid" : "When paid, or on request"}
          </p>
        );
      },
    },
    {
      accessorFn: (b) => b.totalAmount ?? 0, id: "totalAmount", header: "Bill Value", size: 150,
      meta: { exportType: "currency" },
      cell: ({ row }) => <Money value={row.original.totalAmount} bold />,
      footer: () => <Money value={sumOf(queue, (b) => b.totalAmount)} bold />,
    },
    {
      accessorFn: (b) => b.receivedAmount ?? 0, id: "receivedAmount", header: "Received", size: 150,
      meta: { exportType: "currency" },
      cell: ({ row }) => <Money value={row.original.receivedAmount} tone="success" muted={!row.original.receivedAmount} />,
      footer: () => <Money value={sumOf(queue, (b) => b.receivedAmount)} bold tone="success" />,
    },
  ], [queue]);

  const shown = view === "projects" ? projects.length : view === "invoices" ? invoices.length : queue.length;
  const shownNoun = view === "projects" ? "projects" : view === "invoices" ? "invoices" : "bills";

  return (
    <div className="pb-8">
      {projectId && (
        <ProjectFilterBanner
          projectName={allProjects[0]?.projectName ?? undefined}
          onClear={() => setParam({ projectId: null })}
          onBackToProject={() => navigate(`/project/${projectId}?tab=billing`)}
        />
      )}

      <TrackerToolbar
        view={view}
        views={[
          { value: "projects", label: `Projects · ${allProjects.length}` },
          { value: "invoices", label: `Tax Invoices · ${allInvoices.length}` },
          { value: "queue", label: `To Invoice · ${allQueue.length}` },
        ]}
        // A status that doesn't apply to the new view is dropped rather than left hidden.
        onView={(next) => setParam({ view: next === "projects" ? null : next, ...(viewHas(next, focus) ? {} : { focus: null }) })}
        shown={shown}
        shownNoun={shownNoun}
        onClear={() => setParam({ focus: null })}
      >
        <StatusChips options={statusOptions} value={focus} onChange={pickStatus} />
      </TrackerToolbar>

      {view === "projects" && (
        <DataTable
          key="projects"
          {...TRACKER_TABLE}
          caption="Tax Invoice Tracker · Projects"
          data={projects}
          columns={projectColumns}
          getRowId={(p) => p.leadId}
          stateKey="InvoiceTrackerProjects"
          loading={isLoading}
          searchPlaceholder="Search project, client or manager…"
          minWidth={2600}
          onRowClick={(p) => { if (p.leadId) projectBilling(p.leadId); }}
          rowLabel={(p) => p.projectNumber ?? p.projectName ?? "Open project"}
          rowTone={(p) =>
            p.counts?.overdue ? TRIO.rose.c
              : p.invoiceDueCount ? TRIO.amber.c
                : p.counts?.total ? TRIO.purple.c : undefined
          }
        />
      )}
      {view === "invoices" && (
        <DataTable
          key="invoices"
          {...TRACKER_TABLE}
          caption="Tax Invoice Tracker · Invoices"
          data={invoices}
          columns={invoiceColumns}
          getRowId={(r) => r.billId}
          stateKey="InvoiceTrackerInvoices"
          loading={isLoading}
          searchPlaceholder="Search invoice, project, client or stage…"
          minWidth={2500}
          onRowClick={(r) => { if (r.billId) navigate(invoicePath(r)); }}
          rowLabel={(r) => r.invoiceNumber ?? r.billNumber ?? "Open invoice"}
          rowTone={(r) => {
            if (!r.billId) return undefined;
            const tile = TILES.find((t) => t.key === (r.overdueDays > 0 ? "OVERDUE" : r.state));
            return tile?.trio.c;
          }}
        />
      )}
      {view === "queue" && (
        <DataTable
          key="queue"
          {...TRACKER_TABLE}
          caption="Tax Invoice Tracker · To Invoice"
          data={queue}
          columns={queueColumns}
          getRowId={(b) => b.billId}
          stateKey="InvoiceTrackerQueue"
          loading={isLoading}
          searchPlaceholder="Search proforma, project, client or stage…"
          minWidth={1400}
          // The invoice is raised from the project's Billing tab, so that is where the row goes.
          onRowClick={(b) => { if (b.leadId) projectBilling(b.leadId); }}
          rowLabel={(b) => b.proformaNumber ?? b.projectNumber ?? "Open bill"}
          rowTone={(b) => (b.paid ? TRIO.amber.c : TRIO.slate.c)}
        />
      )}
    </div>
  );
};

export default InvoiceTrackerPage;
