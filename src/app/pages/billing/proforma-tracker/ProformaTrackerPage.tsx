import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, FileDown, FolderOpen, MoreHorizontal, Pencil, Share2 } from "lucide-react";
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
  getProformaTracker, type ProformaState, type ProformaTrackerProject, type ProformaTrackerRow,
} from "@services/billingTrackers";
import { accessDocument } from "@services/billingDocuments";
import { useBillingOrgId } from "../BillingLayout";
import { BillingStatusBadge, ProjectFilterBanner } from "../components";
import {
  DASH, DueCell, Money, NumberDate, StateCounts, StatusChips, TRACKER_TABLE, TotalLabel, TrackerToolbar,
  sumOf, usePoChip, useTrackerParams, type TrackerTile,
} from "../components/trackerKit";

/**
 * The Proforma Tracker — the whole proforma process, at two grains.
 *
 *   PROJECTS  — every project, the Billing Tracker's own list: its contract, how much of it is on a proforma, what is
 *               still to be raised, and where each of its proformas stands (draft → awaiting → paid → invoiced).
 *   PROFORMAS — one row per proforma: the money, the document, the due date.
 *
 * A row of status chips filters the open view, each chip counting the rows it leaves. Everything is read off the bills (stage-level billing: a proforma IS a bill's first document), so these figures agree with each
 * project's own Billing tab by construction. Its sibling is the Tax Invoice Tracker, built from the same parts.
 */

type Focus = "ALL" | "NOT_RAISED" | ProformaState | "OVERDUE";

/** The statuses, in process order — the filter chips, row accents and per-project counts. */
const TILES: TrackerTile<Focus>[] = [
  { key: "ALL", label: "All", icon: "folder", trio: TRIO.blue },
  { key: "NOT_RAISED", label: "Still to raise", icon: "add-files", trio: TRIO.slate },
  { key: "DRAFT", label: "Draft", icon: "pencil", trio: TRIO.purple },
  { key: "AWAITING", label: "Awaiting payment", icon: "time", trio: TRIO.cyan },
  { key: "PARTIAL", label: "Partially paid", icon: "chart-pie-simple", trio: TRIO.amber },
  { key: "OVERDUE", label: "Overdue", icon: "information-5", trio: TRIO.rose },
  { key: "PAID", label: "Paid · invoice due", icon: "check-circle", trio: TRIO.green },
  { key: "INVOICED", label: "Invoiced", icon: "receipt-square", trio: TRIO.green },
];
const FOCUS_KEYS = TILES.map((t) => t.key);
/** The tiles that are proforma stages — the ones a project's counts are broken down by. */
const STAGE_TILES = TILES.filter((t) => t.key !== "ALL" && t.key !== "NOT_RAISED");

const projectMatches = (p: ProformaTrackerProject, focus: Focus) =>
  focus === "ALL" ? true
    : focus === "NOT_RAISED" ? p.inBilling && (p.notRaisedAmount ?? 0) > 0
      : focus === "OVERDUE" ? (p.counts?.overdue ?? 0) > 0
        : (p.counts?.[focus] ?? 0) > 0;

const proformaMatches = (r: ProformaTrackerRow, focus: Focus) =>
  focus === "ALL" || focus === "NOT_RAISED" ? true
    : focus === "OVERDUE" ? r.overdueDays > 0
      : r.state === focus;

/** Where the row opens: the editor while it is a draft, the record (with its revisions) once issued. */
const proformaPath = (r: { documentId: string | null; state: ProformaState }) =>
  r.documentId ? `/billing/documents/${r.documentId}${r.state === "DRAFT" ? "/edit" : ""}` : null;

const ProformaTrackerPage: React.FC = () => {
  const navigate = useNavigate();
  const organizationId = useBillingOrgId();
  const poChip = usePoChip();
  const { view, focus, projectId, setParam } = useTrackerParams<Focus>(["proformas"], FOCUS_KEYS, "ALL");
  const pickStatus = (key: Focus) => setParam({ focus: key === "ALL" ? null : key });

  const { data, isLoading } = useQuery({
    queryKey: ["proforma-tracker", organizationId],
    queryFn: () => getProformaTracker({ organizationId }),
  });

  const allProjects = useMemo(
    () => (data?.projects ?? []).filter((p) => !projectId || p.leadId === projectId),
    [data?.projects, projectId],
  );
  const allProformas = useMemo(
    () => (data?.proformas ?? []).filter((r) => !projectId || r.leadId === projectId),
    [data?.proformas, projectId],
  );

  // Each chip counts exactly the rows it leaves in the open view, so the number always matches the table.
  const statusOptions = useMemo(
    () => TILES
      .filter((t) => view === "projects" || t.key !== "NOT_RAISED")
      .map((t) => ({
        key: t.key,
        label: t.label,
        trio: t.key === "ALL" ? undefined : t.trio,
        count: view === "projects"
          ? allProjects.filter((p) => projectMatches(p, t.key)).length
          : allProformas.filter((r) => proformaMatches(r, t.key)).length,
      })),
    [view, allProjects, allProformas],
  );

  // Projects with proformas first (newest proforma first), then the rest by what is left to raise.
  const projects = useMemo(
    () => allProjects
      .filter((p) => projectMatches(p, focus))
      .sort((a, b) =>
        (b.lastProforma?.date ?? "").localeCompare(a.lastProforma?.date ?? "")
        || (b.notRaisedAmount ?? 0) - (a.notRaisedAmount ?? 0)),
    [allProjects, focus],
  );
  const proformas = useMemo(() => allProformas.filter((r) => proformaMatches(r, focus)), [allProformas, focus]);

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
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.detail ?? error?.response?.data?.message ?? "Could not open the proforma" }),
  });

  // ── Projects view ─────────────────────────────────────────────────────────
  const projectColumns = useMemo<ColumnDef<ProformaTrackerProject, unknown>[]>(() => [
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
      accessorFn: (p) => p.contractValue ?? -1, id: "contractValue", header: "Contract Value", size: 150,
      meta: { exportType: "currency" },
      cell: ({ row }) => <Money value={row.original.contractValue} bold />,
      // Totals count projects in billing only (PO approved or a proforma raised) — see `inBilling`.
      footer: () => <Money value={sumOf(projects, (p) => (p.inBilling ? p.contractValue : 0))} bold />,
    },
    {
      accessorFn: (p) => p.raisedAmount ?? 0, id: "raisedAmount", header: "Raised on Proformas", size: 190,
      meta: { exportType: "currency" },
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="min-w-[150px]">
            <div className="mb-[3px] flex flex-row justify-between">
              <Money value={p.raisedAmount} bold muted={!p.raisedAmount} />
              {p.raisedPercent != null && (
                <span className="text-[11px] text-muted-foreground">{p.raisedPercent}%</span>
              )}
            </div>
            {p.raisedPercent != null && <Progress value={p.raisedPercent} aria-label="Share of the contract on proformas" />}
          </div>
        );
      },
      footer: () => <Money value={sumOf(projects, (p) => p.raisedAmount)} bold />,
    },
    {
      accessorFn: (p) => p.notRaisedAmount ?? -1, id: "notRaisedAmount", header: "Still to Raise", size: 150,
      meta: { exportType: "currency" },
      cell: ({ row }) => <Money value={row.original.notRaisedAmount} bold tone={(row.original.notRaisedAmount ?? 0) > 0 ? TRIO.slate.c : undefined} />,
      footer: () => <Money value={sumOf(projects, (p) => (p.inBilling ? p.notRaisedAmount : 0))} bold />,
    },
    {
      // `?.`: the table also runs accessors over its own placeholder rows (loading skeletons), which carry no `counts`.
      accessorFn: (p) => p.counts?.total ?? 0, id: "proformas", header: "Proformas", size: 270,
      cell: ({ row }) => (row.original.counts ? <StateCounts counts={row.original.counts} tiles={STAGE_TILES} /> : null),
    },
    {
      accessorFn: (p) => p.draftAmount ?? 0, id: "draftAmount", header: "In Draft", size: 140,
      meta: { exportType: "currency" },
      cell: ({ row }) => <Money value={row.original.draftAmount} muted={!row.original.draftAmount} />,
      footer: () => <Money value={sumOf(projects, (p) => p.draftAmount)} bold />,
    },
    {
      accessorFn: (p) => p.issuedAmount ?? 0, id: "issuedAmount", header: "Issued", size: 140,
      meta: { exportType: "currency" },
      cell: ({ row }) => <Money value={row.original.issuedAmount} muted={!row.original.issuedAmount} />,
      footer: () => <Money value={sumOf(projects, (p) => p.issuedAmount)} bold />,
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
      accessorFn: (p) => p.nextDueDate ?? "", id: "nextDueDate", header: "Next Due", size: 130,
      meta: { wrap: false },
      cell: ({ row }) => (row.original.nextDueDate ? formatDate(row.original.nextDueDate) : DASH),
    },
    {
      accessorFn: (p) => p.lastProforma?.date ?? "", id: "lastProforma", header: "Latest Proforma", size: 200,
      meta: { wrap: false },
      cell: ({ row }) => {
        const last = row.original.lastProforma;
        return last ? <NumberDate number={last.number} date={last.date} /> : DASH;
      },
    },
    { accessorFn: (p) => p.followUpManagerName ?? DASH, id: "followUpManagerName", header: "Follow-up Manager", size: 170 },
    { accessorFn: (p) => p.organizationName ?? DASH, id: "organizationName", header: "Organization", size: 220 },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [projects, poChip]);

  // ── Proformas view ────────────────────────────────────────────────────────
  const proformaColumns = useMemo<ColumnDef<ProformaTrackerRow, unknown>[]>(() => [
    {
      accessorFn: (r) => r.proformaNumber ?? r.billNumber ?? "", id: "proformaNumber", header: "Proforma No", size: 220,
      meta: { wrap: false },
      footer: () => <TotalLabel />,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div>
            <p className="text-[length:inherit] font-bold">{r.proformaNumber ?? DASH}</p>
            <p className={cn("text-[11px]", r.revising ? "font-bold text-warning-foreground" : "font-normal text-muted-foreground")}>
              {r.revising ? "Revision in progress" : r.revisions > 1 ? `Revised · v${r.revisions}` : r.billNumber}
            </p>
          </div>
        );
      },
    },
    {
      accessorFn: (r) => r.proformaDate ?? "", id: "proformaDate", header: "Date", size: 120,
      meta: { wrap: false },
      cell: ({ row }) => (row.original.proformaDate ? formatDate(row.original.proformaDate) : DASH),
    },
    { accessorFn: (r) => r.projectNumber ?? DASH, id: "projectNumber", header: "Project No", size: 170, meta: { wrap: false } },
    { accessorFn: (r) => r.projectName ?? DASH, id: "projectName", header: "Project Name", size: 220 },
    { accessorFn: (r) => r.clientName ?? DASH, id: "clientName", header: "Client Company", size: 170 },
    { accessorFn: (r) => r.stageName ?? DASH, id: "stageName", header: "Stage", size: 160 },
    {
      accessorFn: (r) => r.billStatus ?? "", id: "status", header: "Status", size: 160,
      meta: { align: "center", wrap: false },
      cell: ({ row }) => <BillingStatusBadge status={row.original.billStatus} />,
    },
    {
      accessorFn: (r) => r.amount ?? 0, id: "amount", header: "Taxable", size: 140,
      meta: { exportType: "currency" },
      cell: ({ row }) => <Money value={row.original.amount} />,
      footer: () => <Money value={sumOf(proformas, (r) => r.amount)} bold />,
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
      footer: () => <Money value={sumOf(proformas, (r) => r.gstAmount)} bold />,
    },
    {
      accessorFn: (r) => r.totalAmount ?? 0, id: "totalAmount", header: "Proforma Value", size: 150,
      meta: { exportType: "currency" },
      cell: ({ row }) => <Money value={row.original.totalAmount} bold />,
      footer: () => <Money value={sumOf(proformas, (r) => r.totalAmount)} bold />,
    },
    {
      accessorFn: (r) => r.tdsAmount ?? 0, id: "tdsAmount", header: "TDS", size: 120,
      meta: { exportType: "currency" },
      cell: ({ row }) => <Money value={row.original.tdsAmount} muted={!row.original.tdsAmount} />,
      footer: () => <Money value={sumOf(proformas, (r) => r.tdsAmount)} bold />,
    },
    {
      accessorFn: (r) => r.receivedAmount ?? 0, id: "receivedAmount", header: "Received", size: 140,
      meta: { exportType: "currency" },
      cell: ({ row }) => <Money value={row.original.receivedAmount} tone="success" muted={!row.original.receivedAmount} />,
      footer: () => <Money value={sumOf(proformas, (r) => r.receivedAmount)} bold tone="success" />,
    },
    {
      accessorFn: (r) => r.outstandingAmount ?? 0, id: "outstandingAmount", header: "Outstanding", size: 140,
      meta: { exportType: "currency" },
      cell: ({ row }) => (
        <Money value={row.original.outstandingAmount} bold tone={row.original.outstandingAmount > 0 ? "danger" : undefined} muted={!row.original.outstandingAmount} />
      ),
      footer: () => <Money value={sumOf(proformas, (r) => r.outstandingAmount)} bold tone="danger" />,
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
    { accessorFn: (r) => r.invoiceNumber ?? DASH, id: "invoiceNumber", header: "Tax Invoice", size: 170, meta: { wrap: false } },
    {
      accessorKey: "billId", header: "", size: 64, enableSorting: false, enableColumnFilter: false,
      enableHiding: false,
      meta: { wrap: false },
      cell: ({ row }) => {
        const r = row.original;
        if (!r.billId) return null;
        const path = proformaPath(r);
        return (
          /* Not a control: it exists only to keep the row's own click from firing when the
             actions menu is used. Nothing here is tabbable — the menu trigger below is. */
          <div data-wt-control="container" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${r.proformaNumber ?? r.billNumber}`} />}>
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                {path && (
                  <DropdownMenuItem onClick={() => navigate(path)}>
                    {r.state === "DRAFT" ? <><Pencil /> Edit draft</> : <><FolderOpen /> Open proforma</>}
                  </DropdownMenuItem>
                )}
                {r.documentId && r.state !== "DRAFT" && (
                  <>
                    <DropdownMenuItem onClick={() => access.mutate({ id: r.documentId!, intent: "DOWNLOAD" })}>
                      <FileDown /> Download PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => access.mutate({ id: r.documentId!, intent: "SHARE" })}>
                      <Share2 /> Copy share link
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/project/${r.leadId}?tab=billing`)}>
                  <ExternalLink /> Open project billing
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [proformas]);

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
          { value: "proformas", label: `Proformas · ${allProformas.length}` },
        ]}
        // "Still to raise" is a fact about projects, so it doesn't carry over to the proformas view.
        onView={(next) => setParam({
          view: next === "proformas" ? "proformas" : null,
          ...(next === "proformas" && focus === "NOT_RAISED" ? { focus: null } : {}),
        })}
        shown={view === "projects" ? projects.length : proformas.length}
        shownNoun={view === "projects" ? "projects" : "proformas"}
        onClear={() => setParam({ focus: null })}
      >
        <StatusChips options={statusOptions} value={focus} onChange={pickStatus} />
      </TrackerToolbar>

      {view === "projects" ? (
        <DataTable
          key="projects"
          {...TRACKER_TABLE}
          caption="Proforma Tracker · Projects"
          data={projects}
          columns={projectColumns}
          getRowId={(p) => p.leadId}
          stateKey="ProformaTrackerProjects"
          loading={isLoading}
          searchPlaceholder="Search project, client or manager…"
          minWidth={2600}
          onRowClick={(p) => { if (p.leadId) navigate(`/project/${p.leadId}?tab=billing`); }}
          rowLabel={(p) => p.projectNumber ?? p.projectName ?? "Open project"}
          rowTone={(p) => (p.counts?.overdue ? TRIO.rose.c : p.counts?.total ? TRIO.cyan.c : undefined)}
        />
      ) : (
        <DataTable
          key="proformas"
          {...TRACKER_TABLE}
          caption="Proforma Tracker · Proformas"
          data={proformas}
          columns={proformaColumns}
          getRowId={(r) => r.billId}
          stateKey="ProformaTrackerProformas"
          loading={isLoading}
          searchPlaceholder="Search proforma, project, client or stage…"
          minWidth={2500}
          onRowClick={(r) => {
            if (!r.billId) return;
            navigate(proformaPath(r) ?? `/project/${r.leadId}?tab=billing`);
          }}
          rowLabel={(r) => r.proformaNumber ?? r.billNumber ?? "Open proforma"}
          rowTone={(r) => {
            if (!r.billId) return undefined;
            const tile = TILES.find((t) => t.key === (r.overdueDays > 0 ? "OVERDUE" : r.state));
            return tile?.trio.c;
          }}
        />
      )}
    </div>
  );
};

export default ProformaTrackerPage;
