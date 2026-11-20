import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useReturnContext } from "@hooks/useReturnContext";
import { useFillViewport } from "@app/hooks/useFillViewport";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  GlassCard, KeyValueRow, SectionDivider, ToneChip, TRIO, toast, confirmDialog,
} from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate, formatDateTime } from "@utils/dateFormats";
import { canDelete } from "@utils/can";
import {
  getBillingDocument, getBillingDocumentTimeline, getVersionPreview, compareVersions,
  createRevision, accessDocument, downloadDocumentWord, setVersionStatus, archiveBillingDocument, restoreBillingDocument,
  shareLinkFor, type AccessIntent, type VersionStatus,
} from "@services/billingDocuments";
import {
  BillingStatusBadge, BillingTimeline, BillingLoadingState,
} from "../components";
import {
  DocumentEditorHeader, DocumentEmailForm, DocumentEmailLog, DocumentSheet, MiniSelect, ZOOMS,
} from "@modules/document-editor";
import {
  Archive, ArchiveRestore, ArrowLeftRight, ChevronDown, CircleCheck, CircleX, Eye, FileDown, Link2, Printer,
} from "lucide-react";
import { cn } from "@/ds/lib/utils";
import { Button } from "@/ds/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/ds/ui/dropdown-menu";
import { DynamicIcon } from "@/ds/ui/dynamic-icon";
import { Field, FieldDescription, FieldLabel } from "@/ds/ui/field";
import { Label } from "@/ds/ui/label";
import { Progress } from "@/ds/ui/progress";
import { Separator } from "@/ds/ui/separator";
import { Switch } from "@/ds/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ds/ui/tabs";
import { Textarea } from "@/ds/ui/textarea";
import VersionCompare from "./VersionCompare";
import { billDocumentProfile } from "./billDocumentProfile";

// ─── small layout parts ──────────────────────────────────────────────────────

/** A labelled figure. Used across the financial summary and the detail header. */
const Figure: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: string;
  strong?: boolean;
  tone?: "default" | "danger" | "success";
}> = ({ label, value, hint, strong, tone = "default" }) => (
  <div className="flex min-w-0 flex-row items-baseline justify-between gap-4">
    <div className="shrink-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      {hint && <p className="text-[10.5px] text-muted-foreground">{hint}</p>}
    </div>
    {/* A long value (a bill over several stages) wraps inside the card instead of running out of it. */}
    <p
      className={cn(
        "min-w-0 text-right [overflow-wrap:anywhere]",
        strong ? "text-[14.5px] font-bold" : "text-[13px] font-semibold",
        tone === "danger" ? "text-destructive" : tone === "success" ? "text-success" : "text-foreground",
      )}
    >
      {value}
    </p>
  </div>
);

/**
 * Side by side (lg+), each column is its own scroll area, as tall as what is left of the window below the header
 * (measured by `useFillViewport` on the grid, never a guessed `100vh - N`): scrolling the sidebar never moves the
 * document and vice versa, and the last thing in each column is always reachable. `overscrollBehavior` stops a pane
 * at its end from handing the scroll to the page. Stacked on smaller screens, the page scrolls as one.
 */
const PANE =
  "flex min-h-0 flex-col gap-4 lg:h-full lg:overflow-y-auto lg:overscroll-contain lg:pb-2 "
  // Room under the last card (lg:pb-2) so its shadow and bottom edge are not clipped by the scroll box.
  // A height-capped flex column SQUEEZES its children to fit instead of scrolling, so every card keeps
  // its own height.
  + "[&>*]:shrink-0";

type Detail = Awaited<ReturnType<typeof getBillingDocument>>;

/** "Advance (To be paid along with the Work Order) + Design Concept (Part 1)" → ["Advance", "Design Concept (Part 1)"]. */
const stageTitles = (stageName: string | null | undefined) =>
  (stageName ?? "").split(" + ").map((s) => s.replace(/\s*\((?!Part \d+\))[^)]*\)/g, "").trim()).filter(Boolean);

/**
 * The Summary card as three sections a reader scans top to bottom: who it bills, what this bill is worth, and where
 * the contract stands. The contract is before GST, so it is compared with the amount before GST, never the total.
 */
const SummarySections: React.FC<Pick<Detail, "document" | "project" | "client" | "financial">> = ({
  document, project, client, financial,
}) => {
  const stages = stageTitles(document.stageName);
  const contract = financial.contractValue;
  const left = financial.remainingContractValue ?? 0;
  const billed = contract !== null ? contract - left : 0;
  const billedPct = contract ? Math.min(100, Math.round((billed / contract) * 100)) : 0;

  return (
    <div>
      <SectionDivider tone={TRIO.blue} icon="profile-user" label="Billed to" />
      <div className="mb-4">
        <KeyValueRow label="Client" value={client?.companyName} />
        <KeyValueRow label="GSTIN" value={client?.gstNumber} emptyText="Not on file" />
        <KeyValueRow label="Project" value={project?.name} last />
      </div>

      <SectionDivider tone={TRIO.purple} icon="bill" label="This bill" />
      <div className="mb-4">
        <KeyValueRow label="Bill no." value={document.billNumber} />
        <KeyValueRow
          label={stages.length > 1 ? "Stages" : "Stage"}
          value={stages.length ? (
            <div className="flex flex-row flex-wrap justify-end gap-1">
              {stages.map((s) => <ToneChip key={s} tone="brand" dense label={s} title={document.stageName ?? s} />)}
            </div>
          ) : null}
        />
        <KeyValueRow label="Issued" value={formatDate(document.issueDate)} />
        <KeyValueRow label="Amount" value={formatCurrencyDecimal(financial.subtotal)} />
        <KeyValueRow label="GST" value={formatCurrencyDecimal(financial.taxTotal)} />
        {/* The figure the client pays — set apart so it reads first. */}
        <div className="mt-2 flex items-baseline justify-between gap-4 rounded-[10px] bg-accent px-3 py-2.5">
          <p className="text-[13px] font-semibold text-muted-foreground">Total incl. GST</p>
          <p className="tabular text-[18px] font-extrabold">{formatCurrencyDecimal(financial.grandTotal)}</p>
        </div>
      </div>

      {contract !== null && (
        <>
          <SectionDivider tone={TRIO.green} icon="chart-simple" label="Contract" />
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-baseline justify-between gap-4">
              <p className="text-[13px] text-muted-foreground">
                {billedPct}% billed <span className="text-muted-foreground">· before GST</span>
              </p>
              <p className="tabular text-[13px] font-semibold">of {formatCurrencyDecimal(contract)}</p>
            </div>
            {/* The bar stays green because the section is: `success` is the token, and the indicator is
                addressed through its own data-slot rather than a hardcoded colour. */}
            <Progress
              value={billedPct}
              aria-label={`${billedPct}% of the contract billed`}
              className="[&_[data-slot=progress-indicator]]:bg-success"
            />
            <div className="flex flex-row justify-between gap-4">
              <div>
                <p className="text-[11.5px] text-muted-foreground">Billed so far</p>
                <p className="tabular text-sm font-bold">{formatCurrencyDecimal(billed)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11.5px] text-muted-foreground">Left to bill</p>
                <p className="tabular text-sm font-bold">{formatCurrencyDecimal(left)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/** Section title with an icon, matching the rest of the Billing module. */
const PanelTitle: React.FC<{ icon: string; title: string; action?: React.ReactNode }> = ({
  icon, title, action,
}) => (
  <div className="mb-3 flex flex-row items-center gap-2">
    {/* The icon name is a prop (data), so DynamicIcon resolves it through the kit's registry. */}
    <DynamicIcon name={icon} className="size-4" />
    <p className="min-w-0 flex-1 text-[13.5px] font-bold">{title}</p>
    {action}
  </div>
);

/**
 * One billing document (a proforma or a tax invoice), every revision.
 *
 * READ-ONLY over its content. Editing a document's fields happens in the document
 * editor on a DRAFT version; this page manages the chain — which revision is
 * current, what changed between two of them, and everything that ever happened
 * to the document.
 */

/**
 * Embeddable, for the same reason as the editor: one project's documents are
 * managed from that project's Billing tab, not from the module-wide repository.
 * `onEdit` lets the host open its own editor instead of routing away.
 */
export interface DocumentDetailPageProps {
  documentId?: string;
  onBack?: () => void;
  onEdit?: (documentId: string) => void;
}

const DocumentDetailPage: React.FC<DocumentDetailPageProps> = ({ documentId, onBack, onEdit }) => {
  const params = useParams();
  const id = documentId ?? params.id ?? "";
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  // Falls back to this page\'s own parent when nobody handed us an origin,
  // so arriving from the Billing list behaves exactly as it always did.
  const back = useReturnContext({ pathname: "/billing/proformas", label: "Repository" });
  const queryClient = useQueryClient();
  // The two columns end at the bottom of the window and scroll inside it (see PANE_SX).
  const fillRef = useFillViewport<HTMLDivElement>({ bottomGap: 16, minHeight: 360 });
  const [zoom, setZoom] = useState(0);

  const [tab, setTab] = useState("document");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [compareFrom, setCompareFrom] = useState<string>("");
  const [compareTo, setCompareTo] = useState<string>("");
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["billing-document", id],
    queryFn: () => getBillingDocument(id),
    enabled: !!id,
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["billing-document", id, "timeline"],
    queryFn: () => getBillingDocumentTimeline(id),
    enabled: !!id,
  });

  // Deep links from the tree: ?version=… opens that preview, ?compare=… opens the
  // diff against its predecessor.
  useEffect(() => {
    const version = searchParams.get("version");
    const compare = searchParams.get("compare");
    if (version) { setSelectedVersionId(version); setTab("document"); }
    if (compare && data) {
      const versions = data.document.versions;
      const index = versions.findIndex((v) => v.id === compare);
      setCompareTo(compare);
      setCompareFrom(versions[index + 1]?.id ?? "");
      setTab("compare");
    }
  }, [searchParams, data]);

  const versions = data?.document.versions ?? [];
  const activeVersionId = selectedVersionId ?? data?.document.currentVersionId ?? null;

  const { data: preview } = useQuery({
    queryKey: ["billing-document", id, "preview", activeVersionId],
    queryFn: () => getVersionPreview(id, activeVersionId!),
    // The detail payload already carries the CURRENT version's html; only fetch
    // when the user picked a different one.
    enabled: !!activeVersionId && activeVersionId !== data?.document.currentVersionId,
  });

  const { data: comparison } = useQuery({
    queryKey: ["billing-document", id, "compare", compareFrom, compareTo],
    queryFn: () => compareVersions(id, compareTo, compareFrom || undefined),
    enabled: !!compareTo,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["billing-document", id] });
    queryClient.invalidateQueries({ queryKey: ["proforma-tracker"] });
    queryClient.invalidateQueries({ queryKey: ["invoice-tracker"] });
    // Archiving or restoring changes which proforma / invoice the bill holds.
    queryClient.invalidateQueries({ queryKey: ["billing"] });
    queryClient.invalidateQueries({ queryKey: ["project-billing"] });
  };

  const revise = useMutation({
    mutationFn: () => createRevision(id, revisionReason.trim()),
    onSuccess: (detail) => {
      toast({ icon: "success", title: "Revision opened" });
      setRevisionReason("");
      refresh();
      // Straight into the editor — a revision exists to be edited.
      if (onEdit) onEdit(detail.document.id);
      else navigate(`/billing/documents/${detail.document.id}/edit`);
    },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not open a revision" }),
  });

  const access = useMutation({
    mutationFn: (intent: AccessIntent) => accessDocument(id, intent, activeVersionId ?? undefined),
    onSuccess: async (result) => {
      window.open(result.url, "_blank", "noopener");
      refresh();
    },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not open the document" }),
  });

  // Share copies one of two links: a PREVIEW that opens the PDF in the recipient's browser (the default — they can
  // still download it from there), or a direct DOWNLOAD.
  const share = useMutation({
    mutationFn: (_kind: "preview" | "download") => accessDocument(id, "SHARE", activeVersionId ?? undefined),
    onSuccess: async (result, kind) => {
      // The short `<this app>/s/<code>` link, built from the address the app is open on; the long signed storage URL
      // only as a fallback for a server that does not issue codes yet.
      const code = kind === "download" ? result.downloadCode : result.previewCode;
      const link = code
        ? shareLinkFor(code)
        : kind === "download" ? result.downloadUrl ?? result.url : result.url;
      try {
        await navigator.clipboard.writeText(link);
        toast({
          icon: "success",
          title: kind === "download" ? "Download link copied" : "Preview link copied",
          text: kind === "download"
            ? "Opening it saves the PDF straight away. Valid for 7 days."
            : "Opening it shows the PDF in the browser, with a download button. Valid for 7 days.",
        });
      } catch {
        window.open(link, "_blank", "noopener");
      }
      refresh();
    },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not create the link" }),
  });

  const wordDownload = useMutation({
    mutationFn: () => downloadDocumentWord(id, activeVersionId ?? undefined),
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not download the Word file" }),
  });

  const changeStatus = useMutation({
    mutationFn: ({ versionId, status }: { versionId: string; status: VersionStatus }) =>
      setVersionStatus(id, versionId, status),
    onSuccess: () => { toast({ icon: "success", title: "Status updated" }); refresh(); },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not update the status" }),
  });

  const archive = useMutation({
    mutationFn: (restore: boolean) => (restore ? restoreBillingDocument(id) : archiveBillingDocument(id)),
    onSuccess: (_result, restore) => {
      toast({ icon: "success", title: restore ? "Document restored" : "Archived — you can raise a fresh one from the bill." });
      refresh();
    },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not update the document" }),
  });

  if (isLoading || !data) {
    return <div className="mx-auto max-w-[1800px] pb-8"><BillingLoadingState rows={4} /></div>;
  }

  const { document, project, client, financial, activity, emails, recipients, emailDefaults } = data;
  const currentVersion = document.versions.find((v) => v.id === document.currentVersionId);
  // History = the version chain with each version's activity under it. An entry with no version (a document-level
  // action) goes under whichever version was current when it happened.
  const history = timeline.map((step, index) => {
    const nextAt = timeline[index + 1]?.at;
    const inWindow = (at: string) => (!step.at || at >= step.at || index === 0) && (!nextAt || at < nextAt);
    return {
      ...step,
      events: activity
        .filter((entry) => (entry.versionId ? entry.versionId === step.key : inWindow(entry.createdAt)))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((entry) => ({ key: entry.id, message: entry.message, actor: entry.actorName, at: entry.createdAt })),
    };
  });
  const activeVersion = versions.find((v) => v.id === activeVersionId);
  // "Sent" is not marked by hand — emailing the document does it. What is left for a person to record is the client's
  // answer on the version they hold.
  const clientResponses = currentVersion?.allowedStatuses.filter((o) => o.status === "CLIENT_ACCEPTED" || o.status === "CLIENT_REJECTED") ?? [];
  const recordResponse = async (option: (typeof clientResponses)[number]) => {
    if (!currentVersion) return;
    if (option.status === "CLIENT_REJECTED") {
      const confirmed = await confirmDialog({
        title: "Record that the client rejected this?",
        text: "The project's Bill Stage moves to rejected. Open a revision to send a corrected version.",
        confirmText: "Mark rejected",
      });
      if (!confirmed) return;
    }
    changeStatus.mutate({ versionId: currentVersion.id, status: option.status });
  };
  const html = preview?.html ?? data.preview?.html ?? "";
  const isArchived = !!document.archivedAt;

  const askArchive = async () => {
    const confirmed = await confirmDialog({
      title: isArchived ? "Restore this proforma?" : "Archive this proforma?",
      text: isArchived
        ? "It returns to the live repository with its revision chain intact."
        : "Every version becomes read-only. Nothing is deleted and it can be restored.",
      confirmText: isArchived ? "Restore" : "Archive",
    });
    if (confirmed) archive.mutate(isArchived);
  };

  return (
    <div className="mx-auto max-w-[1800px] pb-8 lg:pb-0">
      <DocumentEditorHeader
        documentNumber={document.documentNumber}
        status={
          <>
            {document.currentStatus && <BillingStatusBadge status={document.currentStageCode ?? document.currentStatus} />}
          </>
        }
        templateName={document.templateName ?? document.templateCode}
        versionCount={document.versionCount}
        backLabel={onBack ? "Back" : back.label}
        onBack={onBack ?? back.goBack}
        // This page's body has no side padding of its own, so the header's content has none either: same edges.
        contentClassName="max-w-[1800px]"
        actions={
          <>
            {!isArchived && clientResponses.map((option) => (
              <Button
                key={option.status}
                variant="outline" size="sm" disabled={changeStatus.isPending}
                onClick={() => recordResponse(option)}
              >
                {option.status === "CLIENT_ACCEPTED" ? <CircleCheck data-icon="inline-start" /> : <CircleX data-icon="inline-start" />}
                {option.label}
              </Button>
            ))}
            <Button variant="outline" size="sm" disabled={access.isPending} onClick={() => access.mutate("DOWNLOAD")}>
              <FileDown data-icon="inline-start" />
              Download PDF
            </Button>
            <Button variant="outline" size="sm" disabled={wordDownload.isPending} onClick={() => wordDownload.mutate()}>
              <FileDown data-icon="inline-start" />
              Download Word
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={share.isPending} />}>
                <Link2 data-icon="inline-start" />
                Share
                <ChevronDown data-icon="inline-end" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-60">
                <DropdownMenuItem onClick={() => share.mutate("preview")}>
                  <Eye />
                  <span className="flex flex-col">
                    <span>Copy preview link</span>
                    <span className="text-xs text-muted-foreground">Opens the PDF in the browser</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => share.mutate("download")}>
                  <FileDown />
                  <span className="flex flex-col">
                    <span>Copy download link</span>
                    <span className="text-xs text-muted-foreground">Saves the PDF directly</span>
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {(isArchived || canDelete("billing.proformas")) && (
              <Button variant="outline" size="sm" onClick={askArchive}>
                {isArchived ? <ArchiveRestore data-icon="inline-start" /> : <Archive data-icon="inline-start" />}
                {isArchived ? "Restore" : "Archive"}
              </Button>
            )}
          </>
        }
      />

      {/* `lg:grid-rows-[minmax(0,1fr)]`: one row exactly as tall as the grid. With the default auto row
          it grows to fit the taller column, so neither pane ever overflows and neither scrolls.
          `lg:h-(--wt-fill-h)` is what is left of the window below the header (useFillViewport sets it);
          height is auto when stacked. */}
      <div
        ref={fillRef}
        className="grid grid-cols-1 items-start gap-4 lg:h-(--wt-fill-h) lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:items-stretch"
      >
        {/* ── Left: summaries + versions + tabs ─────────────────────────────── */}
        <div className={PANE}>
          <GlassCard sx={{ p: 2 }}>
            <PanelTitle icon="abstract-26" title="Summary" />
            <SummarySections document={document} project={project} client={client} financial={financial} />
          </GlassCard>

          <GlassCard sx={{ p: 2 }}>
            <PanelTitle icon="time" title="Version History" />
            <div className="flex flex-col gap-1.5">
              {versions.map((version) => (
                // Selecting a version is an action, so each row is a button: tab stop and Enter/Space free.
                <button
                  key={version.id}
                  type="button"
                  aria-pressed={version.id === activeVersionId}
                  onClick={() => { setSelectedVersionId(version.id); setSearchParams({}); }}
                  className={cn(
                    "w-full cursor-pointer rounded-[10px] border p-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    version.id === activeVersionId ? "border-primary" : "border-border",
                    version.isCurrent ? "bg-accent" : "bg-transparent",
                  )}
                >
                  <span className="flex flex-row flex-wrap items-center gap-1.5">
                    <span className={cn("text-[12.5px]", version.isCurrent ? "font-bold" : "font-medium")}>
                      Version {version.versionNumber}
                    </span>
                    {version.isCurrent && <ToneChip tone="brand" label="Current" dense />}
                    {/* The Bill Stage this version means — Configure's wording and colour, same as the Billing Tracker. */}
                    <BillingStatusBadge status={version.stageCode ?? version.status} />
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {version.createdByName ?? "—"} · {formatDateTime(version.createdAt)}
                  </span>
                </button>
              ))}
            </div>

            {!isArchived && (
              <div className="mt-3 flex flex-col gap-2">
                <Separator />
                {/* Field carries the floating label the kit makes standard, so no shrink flag is needed. */}
                <Field>
                  <FieldLabel htmlFor="revision-reason">Reason for a New Revision</FieldLabel>
                  <Textarea
                    id="revision-reason"
                    rows={2}
                    value={revisionReason}
                    onChange={(event) => setRevisionReason(event.target.value)}
                  />
                  <FieldDescription>
                    The current version becomes Superseded — never edited, never removed.
                  </FieldDescription>
                </Field>
                <Button
                  size="sm"
                  disabled={revisionReason.trim().length < 3 || revise.isPending}
                  loading={revise.isPending}
                  onClick={() => revise.mutate()}
                >
                  {revise.isPending ? "Opening…" : "Create Revision"}
                </Button>
              </div>
            )}
          </GlassCard>
        </div>

        {/* ── Right: preview / timeline / compare / activity ─────────────────── */}
        {/* On lg the card fills the column: the tabs stay put and only the tab's content scrolls. */}
        {/* Stacked (below lg) the document comes first: it is what the page is for, not the summary above it. */}
        <div className="order-first min-w-0 flex-col lg:order-none lg:flex lg:h-full">
          <GlassCard sx={{ p: 0, mb: { xs: 2, lg: 0 }, flex: { lg: 1 }, minHeight: 0, display: { lg: "flex" }, flexDirection: "column" }}>
            {/* The kit Tabs key their panels by value, which is why `tab` is a string here rather than
                MUI's numeric index. `line` is the KitMap's variant for underline tabs. */}
            <Tabs value={tab} onValueChange={(next) => setTab(String(next))} className="flex min-h-0 flex-col lg:flex-1">
              <TabsList variant="line" className="shrink-0 overflow-x-auto">
                <TabsTrigger value="document">Document</TabsTrigger>
                <TabsTrigger value="history">History ({activity.length})</TabsTrigger>
                <TabsTrigger value="compare">Compare</TabsTrigger>
                <TabsTrigger value="email">Email ({emails.length})</TabsTrigger>
              </TabsList>
              <Separator />

              <TabsContent value="document" className="min-h-0 p-4 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
                <>
                  <div className="mb-3 flex flex-row flex-wrap items-center gap-2">
                    <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                      Version {activeVersion?.versionNumber ?? "—"}
                      <span className="hidden sm:inline">
                        {" "}as it was issued — the stored snapshot, never re-rendered.
                      </span>
                    </p>
                    <MiniSelect
                      ariaLabel="Zoom"
                      className="w-23"
                      value={String(zoom)}
                      options={ZOOMS.map((option) => ({ value: String(option.value), label: option.label }))}
                      onChange={(next) => setZoom(Number(next))}
                    />
                    <Button variant="ghost" size="sm" disabled={access.isPending} onClick={() => access.mutate("PRINT")}>
                      <Printer data-icon="inline-start" aria-hidden />
                      Print
                    </Button>
                  </div>
                  {html ? (
                    <DocumentSheet html={html} editable={{}} zoom={zoom || null} />
                  ) : (
                    <p className="text-xs text-muted-foreground">This version has no stored preview.</p>
                  )}
                </>
              </TabsContent>

              <TabsContent value="history" className="min-h-0 p-4 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
                <BillingTimeline steps={history} />
              </TabsContent>

              <TabsContent value="compare" className="min-h-0 p-4 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col flex-wrap gap-2 sm:flex-row sm:items-center">
                    {/* MiniSelect already wraps the kit Select for this module — reused rather than a
                        second select built here. The labels sit above because these are two of a pair. */}
                    <div className="flex min-w-[150px] flex-col gap-1">
                      <Label htmlFor="compare-from">From</Label>
                      <MiniSelect
                        ariaLabel="Compare from version"
                        className="w-full"
                        value={compareFrom}
                        options={versions.map((version) => ({ value: version.id, label: `Version ${version.versionNumber}` }))}
                        onChange={setCompareFrom}
                      />
                    </div>
                    <Button
                      variant="ghost" size="icon-sm" className="self-center"
                      aria-label="Swap versions"
                      disabled={!compareFrom || !compareTo}
                      onClick={() => { setCompareFrom(compareTo); setCompareTo(compareFrom); }}
                    >
                      <ArrowLeftRight aria-hidden />
                    </Button>
                    <div className="flex min-w-[150px] flex-col gap-1">
                      <Label htmlFor="compare-to">To</Label>
                      <MiniSelect
                        ariaLabel="Compare to version"
                        className="w-full"
                        value={compareTo}
                        options={versions.map((version) => ({ value: version.id, label: `Version ${version.versionNumber}` }))}
                        onChange={setCompareTo}
                      />
                    </div>
                    {/* Base UI's Switch reports through onCheckedChange, not MUI's (event, value). */}
                    <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
                      <Switch
                        id="show-unchanged"
                        checked={showUnchanged}
                        onCheckedChange={(next) => setShowUnchanged(next)}
                      />
                      <Label htmlFor="show-unchanged">Show unchanged</Label>
                    </div>
                  </div>
                  {comparison ? (
                    <VersionCompare
                      comparison={comparison}
                      showUnchanged={showUnchanged}
                      onShowUnchanged={setShowUnchanged}
                      profile={billDocumentProfile}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {versions.length < 2
                        ? "There is only one version — nothing to compare yet."
                        : "Pick two versions to compare."}
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="email" className="min-h-0 p-4 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
                {/* Compose beside its log on wide screens; stacked (compose first) below that. */}
                <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
                  <div className="rounded-xl border border-border p-4">
                    <PanelTitle icon="sms" title="New email" />
                    <DocumentEmailForm
                      documentId={document.id}
                      // The server's own default — exactly what an untyped send goes out with.
                      defaultSubject={emailDefaults?.subject || `${document.kind === "TAX_INVOICE" ? "Tax Invoice" : "Proforma Invoice"} ${document.documentNumber}`}
                      recipient="client"
                      suggestions={recipients ?? (client?.email ? [{ email: client.email, name: client.companyName ?? client.email, kind: "Billed company" }] : [])}
                      attachmentName={document.documentNumber}
                      attachmentMeta={currentVersion ? `Version ${currentVersion.versionNumber} · as published` : undefined}
                      canSend={!!currentVersion?.isPublished}
                      // Sending moves the version to Sent and the project's Bill Stage with it, so the trackers refresh too.
                      onSent={refresh}
                    />
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <PanelTitle icon="time" title={`Sent (${emails.length})`} />
                    <DocumentEmailLog entries={emails} renderStatus={(status) => <BillingStatusBadge status={status} />} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetailPage;
