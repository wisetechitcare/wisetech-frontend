import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box, Divider, FormControlLabel, MenuItem, Stack, Tab, Tabs, TextField, Typography,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
  GlassCard, WtButton, WtSwitch, ToneChip, TRIO, toast, confirmDialog,
} from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate, formatDateTime } from "@utils/dateFormats";
import {
  getProforma, getProformaTimeline, getVersionPreview, compareVersions,
  createRevision, accessProforma, setVersionStatus, archiveProforma, restoreProforma,
  type VersionStatus,
} from "@services/proformas";
import {
  BillingPageHeader, BillingStatusBadge, BillingTimeline, BillingLoadingState,
} from "../components";
import DocumentSheet from "../documents/DocumentSheet";
import VersionCompare from "./VersionCompare";
import { Figure, PanelTitle } from "../operations/operationUi";

/**
 * One proforma, every revision.
 *
 * READ-ONLY over its content. Editing a proforma's fields happens in the document
 * editor on a DRAFT version; this page manages the chain — which revision is
 * current, what changed between two of them, and everything that ever happened
 * to the document.
 */

const ProformaDetailPage: React.FC = () => {
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState(0);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [compareFrom, setCompareFrom] = useState<string>("");
  const [compareTo, setCompareTo] = useState<string>("");
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["proforma", id],
    queryFn: () => getProforma(id),
    enabled: !!id,
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["proforma", id, "timeline"],
    queryFn: () => getProformaTimeline(id),
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
    queryKey: ["proforma", id, "preview", activeVersionId],
    queryFn: () => getVersionPreview(id, activeVersionId!),
    // The detail payload already carries the CURRENT version's html; only fetch
    // when the user picked a different one.
    enabled: !!activeVersionId && activeVersionId !== data?.document.currentVersionId,
  });

  const { data: comparison } = useQuery({
    queryKey: ["proforma", id, "compare", compareFrom, compareTo],
    queryFn: () => compareVersions(id, compareTo, compareFrom || undefined),
    enabled: !!compareTo,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["proforma", id] });
    queryClient.invalidateQueries({ queryKey: ["proformas"] });
  };

  const revise = useMutation({
    mutationFn: () => createRevision(id, revisionReason.trim()),
    onSuccess: (detail) => {
      toast({ icon: "success", title: "Revision opened" });
      setRevisionReason("");
      refresh();
      // Straight into the editor — a revision exists to be edited.
      navigate(`/billing/proformas/${detail.document.id}/edit`);
    },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not open a revision" }),
  });

  const access = useMutation({
    mutationFn: (intent: "DOWNLOAD" | "PRINT" | "SHARE") =>
      accessProforma(id, intent, activeVersionId ?? undefined),
    onSuccess: async (result, intent) => {
      if (intent === "SHARE") {
        try {
          await navigator.clipboard.writeText(result.url);
          toast({ icon: "success", title: "Share link copied — valid for 7 days" });
        } catch {
          window.open(result.url, "_blank", "noopener");
        }
      } else {
        window.open(result.url, "_blank", "noopener");
      }
      refresh();
    },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not open the document" }),
  });

  const changeStatus = useMutation({
    mutationFn: ({ versionId, status }: { versionId: string; status: VersionStatus }) =>
      setVersionStatus(id, versionId, status),
    onSuccess: () => { toast({ icon: "success", title: "Status updated" }); refresh(); },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not update the status" }),
  });

  const archive = useMutation({
    mutationFn: (restore: boolean) => (restore ? restoreProforma(id) : archiveProforma(id)),
    onSuccess: (_result, restore) => {
      toast({ icon: "success", title: restore ? "Proforma restored" : "Proforma archived" });
      refresh();
    },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not update the proforma" }),
  });

  if (isLoading || !data) {
    return <Box sx={{ maxWidth: 1800, mx: "auto", pb: 4 }}><BillingLoadingState rows={4} /></Box>;
  }

  const { document, project, client, financial, activity, emails } = data;
  const activeVersion = versions.find((v) => v.id === activeVersionId);
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
    <Box sx={{ maxWidth: 1800, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="folder"
        trio={TRIO.cyan}
        title={document.documentNumber}
        description={`${project?.name ?? "—"} · ${client?.companyName ?? "—"} · ${document.versionCount} revision${document.versionCount === 1 ? "" : "s"}`}
        action={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {document.currentStatus && <BillingStatusBadge status={document.currentStatus} dense={false} />}
            {isArchived && <ToneChip tone="neutral" label="Archived" dense={false} />}
            <WtButton
              ghost size="small"
              onClick={() => navigate("/billing/proformas")}
              startIcon={<KTIcon iconName="arrow-left" className="fs-6" />}
              sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
            >
              Repository
            </WtButton>
            <WtButton
              ghost size="small" disabled={access.isPending}
              onClick={() => access.mutate("DOWNLOAD")}
              startIcon={<KTIcon iconName="file-down" className="fs-6" />}
              sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
            >
              Download
            </WtButton>
            <WtButton
              ghost size="small" disabled={access.isPending}
              onClick={() => access.mutate("SHARE")}
              startIcon={<KTIcon iconName="link" className="fs-6" />}
              sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
            >
              Share
            </WtButton>
            <WtButton
              ghost size="small" onClick={askArchive}
              startIcon={<KTIcon iconName={isArchived ? "arrow-circle-left" : "archive"} className="fs-6" />}
              sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
            >
              {isArchived ? "Restore" : "Archive"}
            </WtButton>
          </Stack>
        }
      />

      <Box
        sx={{
          display: "grid",
          gap: 2,
          alignItems: "start",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(320px, 400px) minmax(0, 1fr)" },
        }}
      >
        {/* ── Left: summaries + versions + tabs ─────────────────────────────── */}
        <Stack spacing={2} sx={{ position: { lg: "sticky" }, top: { lg: 16 } }}>
          <GlassCard sx={{ p: 2 }}>
            <PanelTitle icon="abstract-26" title="Summary" />
            <Stack spacing={0.5}>
              <Figure label="Project" value={project?.name ?? "—"} />
              <Figure label="Client" value={client?.companyName ?? "—"} />
              <Figure label="Billing Request" value={document.billingRequestNumber ?? "—"} />
              <Figure label="Client GSTIN" value={client?.gstNumber ?? "—"} />
              <Figure label="Issued" value={formatDate(document.issueDate)} />
              <Divider sx={{ my: 0.75 }} />
              <Figure label="Taxable" value={formatCurrencyDecimal(financial.subtotal)} />
              <Figure label="GST" value={formatCurrencyDecimal(financial.taxTotal)} />
              <Figure label="Total" value={formatCurrencyDecimal(financial.grandTotal)} strong />
              {financial.contractValue !== null && (
                <>
                  <Divider sx={{ my: 0.75 }} />
                  <Figure label="Contract Value" value={formatCurrencyDecimal(financial.contractValue)} />
                  <Figure
                    label="Remaining"
                    value={formatCurrencyDecimal(financial.remainingContractValue ?? 0)}
                  />
                </>
              )}
            </Stack>
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
                    <BillingStatusBadge status={version.status} />
                  </Stack>
                  <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                    {version.createdByName ?? "—"} · {formatDateTime(version.createdAt)}
                  </Typography>
                  {version.allowedStatuses.length > 0 && !isArchived && (
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                      {version.allowedStatuses.map((option) => (
                        <WtButton
                          key={option.status}
                          ghost size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            changeStatus.mutate({ versionId: version.id, status: option.status });
                          }}
                          sx={{ minHeight: 24, fontSize: 10.5, px: 1 }}
                        >
                          Mark {option.label}
                        </WtButton>
                      ))}
                    </Stack>
                  )}
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
                <WtButton
                  tone="primary" size="small"
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
        <Box sx={{ minWidth: 0 }}>
          <GlassCard sx={{ p: 0, mb: 2 }}>
            <Tabs
              value={tab}
              onChange={(_event, next) => setTab(next)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ minHeight: 42, "& .MuiTab-root": { minHeight: 42, fontSize: 12.5, textTransform: "none" } }}
            >
              <Tab label="Document" />
              <Tab label="Timeline" />
              <Tab label="Compare" />
              <Tab label={`Activity (${activity.length})`} />
              <Tab label={`Email (${emails.length})`} />
            </Tabs>
            <Divider />

            <Box sx={{ p: 2 }}>
              {tab === 0 && (
                <>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <Typography sx={{ fontSize: 12, color: "text.secondary", flex: 1 }}>
                      Version {activeVersion?.versionNumber ?? "—"} as it was issued — the stored
                      snapshot, never re-rendered.
                    </Typography>
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
                    <DocumentSheet html={html} editable={{}} />
                  ) : (
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      This version has no stored preview.
                    </Typography>
                  )}
                </>
              )}

              {tab === 1 && <BillingTimeline steps={timeline} />}

              {tab === 2 && (
                <Stack spacing={1.5}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
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
                      sx={{ flexShrink: 0, ml: 0 }}
                    />
                    {comparison && (
                      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                        {comparison.changedCount} change{comparison.changedCount === 1 ? "" : "s"}
                      </Typography>
                    )}
                  </Stack>
                  <Divider />
                  {comparison ? (
                    <VersionCompare comparison={comparison} showUnchanged={showUnchanged} />
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
                <Stack spacing={1}>
                  {activity.map((entry) => (
                    <Stack
                      key={entry.id}
                      direction="row" spacing={1.25} alignItems="flex-start"
                      sx={{ py: 0.75, borderBottom: (t) => `1px solid ${t.palette.divider}` }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12.5 }}>{entry.message}</Typography>
                        <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                          {entry.actorName ?? "System"} · {formatDateTime(entry.createdAt)}
                        </Typography>
                      </Box>
                      <ToneChip tone="neutral" label={entry.type.replace(/_/g, " ")} dense />
                    </Stack>
                  ))}
                  {!activity.length && (
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      No activity recorded yet.
                    </Typography>
                  )}
                </Stack>
              )}

              {tab === 4 && (
                <Stack spacing={1}>
                  {emails.map((entry) => (
                    <Box key={entry.id} sx={{ py: 0.75, borderBottom: (t) => `1px solid ${t.palette.divider}` }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <BillingStatusBadge status={entry.status} />
                        <Typography sx={{ fontSize: 12.5, flex: 1, minWidth: 0 }} noWrap>
                          {entry.subject}
                        </Typography>
                      </Stack>
                      <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                        {entry.toAddresses} · {formatDateTime(entry.sentAt)}
                      </Typography>
                      {entry.error && (
                        <Typography sx={{ fontSize: 11, color: "error.main" }}>{entry.error}</Typography>
                      )}
                    </Box>
                  ))}
                  {!emails.length && (
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      Nothing sent yet. Emailing happens from the document editor.
                    </Typography>
                  )}
                </Stack>
              )}
            </Box>
          </GlassCard>
        </Box>
      </Box>
    </Box>
  );
};

export default ProformaDetailPage;
