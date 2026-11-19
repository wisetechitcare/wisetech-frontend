import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useReturnContext } from "@hooks/useReturnContext";
import { useFillViewport } from "@app/hooks/useFillViewport";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box, Divider, FormControlLabel, LinearProgress, MenuItem, Stack, Tab, Tabs, TextField, Typography,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
  GlassCard, KeyValueRow, SectionDivider, WtButton, WtIconButton, WtSwitch, ToneChip, TRIO, toast, confirmDialog,
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
import { Archive, ArchiveRestore, ChevronDown, CircleCheck, CircleX, Eye, FileDown, Link2 } from "lucide-react";
import { Button } from "@/ds/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/ds/ui/dropdown-menu";
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
  <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ gap: 2, minWidth: 0 }}>
    <Box sx={{ flexShrink: 0 }}>
      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{label}</Typography>
      {hint && <Typography sx={{ fontSize: 10.5, color: "text.disabled" }}>{hint}</Typography>}
    </Box>
    {/* A long value (a bill over several stages) wraps inside the card instead of running out of it. */}
    <Typography
      sx={{
        fontSize: strong ? 14.5 : 13,
        fontWeight: strong ? 700 : 600,
        minWidth: 0,
        textAlign: "right",
        overflowWrap: "anywhere",
        color:
          tone === "danger" ? "error.main" : tone === "success" ? "success.main" : "text.primary",
      }}
    >
      {value}
    </Typography>
  </Stack>
);

/**
 * Side by side (lg+), each column is its own scroll area, as tall as what is left of the window below the header
 * (measured by `useFillViewport` on the grid, never a guessed `100vh - N`): scrolling the sidebar never moves the
 * document and vice versa, and the last thing in each column is always reachable. `overscrollBehavior` stops a pane
 * at its end from handing the scroll to the page. Stacked on smaller screens, the page scrolls as one.
 */
const PANE_SX = {
  height: { lg: "100%" },
  minHeight: 0,
  overflowY: { lg: "auto" },
  overscrollBehavior: { lg: "contain" },
  // Room under the last card so its shadow and bottom edge are not clipped by the scroll box.
  pb: { lg: 1 },
  // A height-capped flex column SQUEEZES its children to fit instead of scrolling: every card keeps its own height.
  "& > *": { flexShrink: 0 },
} as const;

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
    <Box>
      <SectionDivider tone={TRIO.blue} icon="profile-user" label="Billed to" />
      <Box sx={{ mb: 2 }}>
        <KeyValueRow label="Client" value={client?.companyName} />
        <KeyValueRow label="GSTIN" value={client?.gstNumber} emptyText="Not on file" />
        <KeyValueRow label="Project" value={project?.name} last />
      </Box>

      <SectionDivider tone={TRIO.purple} icon="bill" label="This bill" />
      <Box sx={{ mb: 2 }}>
        <KeyValueRow label="Bill no." value={document.billNumber} />
        <KeyValueRow
          label={stages.length > 1 ? "Stages" : "Stage"}
          value={stages.length ? (
            <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
              {stages.map((s) => <ToneChip key={s} tone="brand" dense label={s} title={document.stageName ?? s} />)}
            </Stack>
          ) : null}
        />
        <KeyValueRow label="Issued" value={formatDate(document.issueDate)} />
        <KeyValueRow label="Amount" value={formatCurrencyDecimal(financial.subtotal)} />
        <KeyValueRow label="GST" value={formatCurrencyDecimal(financial.taxTotal)} />
        {/* The figure the client pays — set apart so it reads first. */}
        <Box
          sx={{
            mt: 1, px: 1.5, py: 1.25, borderRadius: "10px", bgcolor: "action.hover",
            display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 2,
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.secondary" }}>Total incl. GST</Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
            {formatCurrencyDecimal(financial.grandTotal)}
          </Typography>
        </Box>
      </Box>

      {contract !== null && (
        <>
          <SectionDivider tone={TRIO.green} icon="chart-simple" label="Contract" />
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={2}>
              <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                {billedPct}% billed <Box component="span" sx={{ color: "text.disabled" }}>· before GST</Box>
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                of {formatCurrencyDecimal(contract)}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={billedPct}
              aria-label={`${billedPct}% of the contract billed`}
              sx={{ height: 8, borderRadius: 4, bgcolor: "action.hover", "& .MuiLinearProgress-bar": { borderRadius: 4, bgcolor: TRIO.green.c } }}
            />
            <Stack direction="row" justifyContent="space-between" gap={2}>
              <Box>
                <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>Billed so far</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {formatCurrencyDecimal(billed)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>Left to bill</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {formatCurrencyDecimal(left)}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </>
      )}
    </Box>
  );
};

/** Section title with an icon, matching the rest of the Billing module. */
const PanelTitle: React.FC<{ icon: string; title: string; action?: React.ReactNode }> = ({
  icon, title, action,
}) => (
  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
    <KTIcon iconName={icon} className="fs-5" />
    <Typography sx={{ fontWeight: 700, fontSize: 13.5, flex: 1, minWidth: 0 }}>{title}</Typography>
    {action}
  </Stack>
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

  const [tab, setTab] = useState(0);
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
    if (version) { setSelectedVersionId(version); setTab(0); }
    if (compare && data) {
      const versions = data.document.versions;
      const index = versions.findIndex((v) => v.id === compare);
      setCompareTo(compare);
      setCompareFrom(versions[index + 1]?.id ?? "");
      setTab(2);
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
    return <Box sx={{ maxWidth: 1800, mx: "auto", pb: 4 }}><BillingLoadingState rows={4} /></Box>;
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
    <Box sx={{ maxWidth: 1800, mx: "auto", pb: { xs: 4, lg: 0 } }}>
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

      <Box
        ref={fillRef}
        sx={{
          display: "grid",
          gap: 2,
          alignItems: { xs: "start", lg: "stretch" },
          gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(320px, 400px) minmax(0, 1fr)" },
          // One row exactly as tall as the grid. With the default auto row it grows to fit the taller column, so
          // neither pane ever overflows and neither scrolls.
          gridTemplateRows: { lg: "minmax(0, 1fr)" },
          // What is left of the window below the header — see PANE_SX. "auto" when stacked.
          height: { lg: "var(--wt-fill-h)" },
        }}
      >
        {/* ── Left: summaries + versions + tabs ─────────────────────────────── */}
        <Stack spacing={2} sx={PANE_SX}>
          <GlassCard sx={{ p: 2 }}>
            <PanelTitle icon="abstract-26" title="Summary" />
            <SummarySections document={document} project={project} client={client} financial={financial} />
          </GlassCard>

          <GlassCard sx={{ p: 2 }}>
            <PanelTitle icon="time" title="Version History" />
            <Stack spacing={0.75}>
              {versions.map((version) => (
                <Box
                  key={version.id}
                  onClick={() => { setSelectedVersionId(version.id); setSearchParams({}); }}
                  sx={{
                    p: 1, borderRadius: "10px", cursor: "pointer",
                    border: (t) => `1px solid ${version.id === activeVersionId ? t.palette.primary.main : t.palette.divider}`,
                    bgcolor: version.isCurrent ? "action.selected" : "transparent",
                  }}
                >
                  <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography sx={{ fontSize: 12.5, fontWeight: version.isCurrent ? 700 : 500 }}>
                      Version {version.versionNumber}
                    </Typography>
                    {version.isCurrent && <ToneChip tone="brand" label="Current" dense />}
                    {/* The Bill Stage this version means — Configure's wording and colour, same as the Billing Tracker. */}
                    <BillingStatusBadge status={version.stageCode ?? version.status} />
                  </Stack>
                  <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                    {version.createdByName ?? "—"} · {formatDateTime(version.createdAt)}
                  </Typography>
                </Box>
              ))}
            </Stack>

            {!isArchived && (
              <Stack spacing={1} sx={{ mt: 1.5 }}>
                <Divider />
                <TextField
                  size="small" fullWidth multiline minRows={2}
                  label="Reason for a new revision"
                  value={revisionReason}
                  onChange={(event) => setRevisionReason(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  helperText="The current version becomes Superseded — never edited, never removed."
                />
                <WtButton size="small"
                  disabled={revisionReason.trim().length < 3 || revise.isPending}
                  onClick={() => revise.mutate()}
                  sx={{ minHeight: 34, borderRadius: "10px", fontSize: 12.5 }}
                >
                  {revise.isPending ? "Opening…" : "Create Revision"}
                </WtButton>
              </Stack>
            )}
          </GlassCard>
        </Stack>

        {/* ── Right: preview / timeline / compare / activity ─────────────────── */}
        {/* On lg the card fills the column: the tabs stay put and only the tab's content scrolls. */}
        {/* Stacked (below lg) the document comes first: it is what the page is for, not the summary above it. */}
        <Box sx={{ minWidth: 0, height: { lg: "100%" }, display: { lg: "flex" }, flexDirection: "column", order: { xs: -1, lg: 0 } }}>
          <GlassCard sx={{ p: 0, mb: { xs: 2, lg: 0 }, flex: { lg: 1 }, minHeight: 0, display: { lg: "flex" }, flexDirection: "column" }}>
            <Tabs
              value={tab}
              onChange={(_event, next) => setTab(next)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ flexShrink: 0, minHeight: 42, "& .MuiTab-root": { minHeight: 42, fontSize: 12.5, textTransform: "none" } }}
            >
              <Tab label="Document" />
              <Tab label={`History (${activity.length})`} />
              <Tab label="Compare" />
              <Tab label={`Email (${emails.length})`} />
            </Tabs>
            <Divider />

            <Box sx={{ p: 2, flex: { lg: 1 }, minHeight: 0, overflowY: { lg: "auto" }, overscrollBehavior: { lg: "contain" } }}>
              {tab === 0 && (
                <>
                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                    <Typography sx={{ fontSize: 12, color: "text.secondary", flex: 1, minWidth: 0 }}>
                      Version {activeVersion?.versionNumber ?? "—"}
                      <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                        {" "}as it was issued — the stored snapshot, never re-rendered.
                      </Box>
                    </Typography>
                    <MiniSelect
                      ariaLabel="Zoom"
                      className="w-23"
                      value={String(zoom)}
                      options={ZOOMS.map((option) => ({ value: String(option.value), label: option.label }))}
                      onChange={(next) => setZoom(Number(next))}
                    />
                    <WtButton
                      ghost size="small" disabled={access.isPending}
                      onClick={() => access.mutate("PRINT")}
                      startIcon={<KTIcon iconName="printer" className="fs-6" />}
                      sx={{ minHeight: 30, fontSize: 12 }}
                    >
                      Print
                    </WtButton>
                  </Stack>
                  {html ? (
                    <DocumentSheet html={html} editable={{}} zoom={zoom || null} />
                  ) : (
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      This version has no stored preview.
                    </Typography>
                  )}
                </>
              )}

              {tab === 1 && <BillingTimeline steps={history} />}

              {tab === 2 && (
                <Stack spacing={2}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} useFlexGap flexWrap="wrap">
                    <TextField
                      select size="small" label="From" value={compareFrom}
                      onChange={(event) => setCompareFrom(event.target.value)}
                      InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }}
                    >
                      {versions.map((version) => (
                        <MenuItem key={version.id} value={version.id} sx={{ fontSize: 12.5 }}>
                          Version {version.versionNumber}
                        </MenuItem>
                      ))}
                    </TextField>
                    <WtIconButton
                      size="small" title="Swap versions"
                      disabled={!compareFrom || !compareTo}
                      onClick={() => { setCompareFrom(compareTo); setCompareTo(compareFrom); }}
                      sx={{ alignSelf: "center" }}
                    >
                      <KTIcon iconName="arrow-right-left" className="fs-4" />
                    </WtIconButton>
                    <TextField
                      select size="small" label="To" value={compareTo}
                      onChange={(event) => setCompareTo(event.target.value)}
                      InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }}
                    >
                      {versions.map((version) => (
                        <MenuItem key={version.id} value={version.id} sx={{ fontSize: 12.5 }}>
                          Version {version.versionNumber}
                        </MenuItem>
                      ))}
                    </TextField>
                    <FormControlLabel
                      label={<Typography sx={{ fontSize: 12.5 }}>Show unchanged</Typography>}
                      control={
                        <WtSwitch
                          checked={showUnchanged}
                          onChange={(_event, next) => setShowUnchanged(next)}
                        />
                      }
                      sx={{ flexShrink: 0, ml: { sm: "auto" } }}
                    />
                  </Stack>
                  {comparison ? (
                    <VersionCompare
                      comparison={comparison}
                      showUnchanged={showUnchanged}
                      onShowUnchanged={setShowUnchanged}
                      profile={billDocumentProfile}
                    />
                  ) : (
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      {versions.length < 2
                        ? "There is only one version — nothing to compare yet."
                        : "Pick two versions to compare."}
                    </Typography>
                  )}
                </Stack>
              )}

              {tab === 3 && (
                // Compose beside its log on wide screens; stacked (compose first) below that.
                <Box
                  sx={{
                    display: "grid", gap: 2, alignItems: "start",
                    gridTemplateColumns: { xs: "minmax(0, 1fr)", xl: "minmax(0, 1.25fr) minmax(0, 1fr)" },
                  }}
                >
                  <Box sx={{ p: 2, borderRadius: "12px", border: (t) => `1px solid ${t.palette.divider}` }}>
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
                  </Box>
                  <Box sx={{ p: 2, borderRadius: "12px", border: (t) => `1px solid ${t.palette.divider}` }}>
                    <PanelTitle icon="time" title={`Sent (${emails.length})`} />
                    <DocumentEmailLog entries={emails} renderStatus={(status) => <BillingStatusBadge status={status} />} />
                  </Box>
                </Box>
              )}
            </Box>
          </GlassCard>
        </Box>
      </Box>
    </Box>
  );
};

export default DocumentDetailPage;
