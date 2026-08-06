import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Divider, MenuItem, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassCard, WtButton, TRIO, toast, confirmDialog } from "@app/modules/common/components/ui";
import { formatDateTime } from "@utils/dateFormats";
import { formatCurrencyDecimal } from "@utils/currency";
import {
  getDocument, saveDocumentDraft, publishDocument, reviseDocument,
  generateDocumentPdf, emailDocument, getDocumentVersions, getDocumentEmails,
} from "@services/documents";
import { BillingPageHeader, BillingStatusBadge, BillingLoadingState } from "../components";
import { downloadWord } from "@services/proformas";
import DocumentSheet from "./DocumentSheet";
import DocumentPropertiesPanel from "./DocumentPropertiesPanel";

/**
 * Kinds a published document may be revised. Mirrors `revisable: false` in the
 * backend's `KIND_REGISTRY` (`services/documents/registry.ts`) for the kinds
 * actually reachable today — the server is the enforcement, this only avoids
 * showing a button that would error. Keep the two in sync when a new
 * non-revisable kind (Credit Note, Debit Note, Payment Receipt) goes live.
 */
const NON_REVISABLE_KINDS = new Set(["TAX_INVOICE"]);

/**
 * Template-based document editor — the "edit the actual document" screen.
 *
 * Left: the editable properties this TEMPLATE exposes. Right: the real A4 page,
 * rendered from the server's merged HTML, updating on every keystroke without a
 * round-trip or a re-render.
 *
 * Draft state is local until Save Draft. That is deliberate: the preview is
 * already truthful, so autosaving every keystroke would only add write traffic and
 * a stream of pointless "saved" states — and an accidental edit stays undoable by
 * simply not saving.
 */

const ZOOMS = [
  { label: "Fit", value: 0 },
  { label: "75%", value: 0.75 },
  { label: "100%", value: 1 },
  { label: "125%", value: 1.25 },
];

const DocumentEditorPage: React.FC = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState(0);
  const [zoom, setZoom] = useState(0);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [email, setEmail] = useState({ to: "", cc: "", subject: "", body: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["document", id],
    queryFn: () => getDocument(id),
    enabled: !!id,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["document", id, "versions"],
    queryFn: () => getDocumentVersions(id),
    enabled: !!id,
  });

  const { data: emails = [] } = useQuery({
    queryKey: ["document", id, "emails"],
    queryFn: () => getDocumentEmails(id),
    enabled: !!id,
  });

  // Seed the local draft from the server once, and re-seed whenever the server's
  // own copy changes (save, publish, revise) so the panel never shows stale text.
  useEffect(() => {
    if (data) setDraft(data.editable);
  }, [data?.version.id, data?.version.createdAt, data?.document.status]);

  const values = draft ?? data?.editable ?? {};
  const dirty = useMemo(
    () => !!data && Object.entries(values).some(([key, value]) => (data.editable[key] ?? "") !== value),
    [data, values],
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["document", id] });
    queryClient.invalidateQueries({ queryKey: ["billing"] });
  }, [queryClient, id]);

  const save = useMutation({
    mutationFn: () => saveDocumentDraft(id, values),
    onSuccess: () => { toast({ icon: "success", title: "Draft saved" }); refresh(); },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not save the draft" }),
  });

  const publish = useMutation({
    mutationFn: () => publishDocument(id),
    onSuccess: () => {
      toast({ icon: "success", title: "Published — PDF generated" });
      refresh();
    },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not publish" }),
  });

  const revise = useMutation({
    mutationFn: (reason: string) => reviseDocument(id, reason),
    onSuccess: () => { toast({ icon: "success", title: "New draft version opened" }); refresh(); },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not open a revision" }),
  });

  const downloadPdf = useMutation({
    mutationFn: (versionId?: string) => generateDocumentPdf(id, versionId),
    onSuccess: (result) => window.open(result.url, "_blank", "noopener"),
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not generate the PDF" }),
  });

  const wordDownload = useMutation({
    mutationFn: () => downloadWord(id),
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not download the Word file" }),
  });

  const send = useMutation({
    mutationFn: () => emailDocument(id, email),
    onSuccess: () => {
      toast({ icon: "success", title: "Sent to the client" });
      queryClient.invalidateQueries({ queryKey: ["document", id] });
    },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not send the email" }),
  });

  if (isLoading || !data) {
    return <Box sx={{ maxWidth: 1800, mx: "auto", pb: 4 }}><BillingLoadingState rows={4} /></Box>;
  }

  const { document: doc, policy, html, isEditable } = data;
  const isRevisable = !NON_REVISABLE_KINDS.has(doc.kind);
  const missingRequired = policy.required.filter((key) => !String(values[key] ?? "").trim());

  const askRevise = async () => {
    const confirmed = await confirmDialog({
      title: "Revise this document?",
      text: "The published version and its PDF are kept. A new draft version is opened from it.",
      confirmText: "Open revision",
    });
    if (confirmed) revise.mutate("Revised by Accounts");
  };

  return (
    <Box sx={{ maxWidth: 1800, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="receipt-square"
        trio={TRIO.cyan}
        title={doc.documentNumber}
        description={`${doc.template?.name ?? doc.templateCode} · v${doc.versionCount} · ${formatCurrencyDecimal(Number(doc.grandTotal))} incl. tax`}
        action={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <BillingStatusBadge status={doc.status} dense={false} />
            <WtButton
              ghost size="small"
              onClick={() => navigate("/billing/proformas")}
              startIcon={<KTIcon iconName="arrow-left" className="fs-6" />}
              sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
            >
              {/* Kind-agnostic: this editor opens for any registered document
                  kind, not only Proforma. */}
              All Documents
            </WtButton>
            {isEditable ? (
              <>
                <WtButton
                  ghost size="small"
                  disabled={!dirty || save.isPending}
                  onClick={() => save.mutate()}
                  startIcon={<KTIcon iconName="save-2" className="fs-6" />}
                  sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
                >
                  {save.isPending ? "Saving…" : "Save Draft"}
                </WtButton>
                <WtButton
                  tone="primary" size="small"
                  disabled={publish.isPending || dirty || missingRequired.length > 0}
                  title={
                    dirty ? "Save the draft first"
                      : missingRequired.length ? "Fill in every required field first"
                      : "Freeze this version and render its PDF"
                  }
                  onClick={() => publish.mutate()}
                  startIcon={<KTIcon iconName="check-circle" className="fs-6" />}
                  sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
                >
                  {publish.isPending ? "Publishing…" : "Publish & Generate PDF"}
                </WtButton>
              </>
            ) : (
              <>
                <WtButton
                  ghost size="small"
                  onClick={() => downloadPdf.mutate(undefined)}
                  disabled={downloadPdf.isPending}
                  startIcon={<KTIcon iconName="file-down" className="fs-6" />}
                  sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
                >
                  Download PDF
                </WtButton>
                <WtButton
                  ghost size="small"
                  onClick={() => wordDownload.mutate()}
                  disabled={wordDownload.isPending}
                  startIcon={<KTIcon iconName="file-down" className="fs-6" />}
                  sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
                >
                  Download Word
                </WtButton>
                {isRevisable && (
                  <WtButton
                    ghost size="small" onClick={askRevise}
                    startIcon={<KTIcon iconName="pencil" className="fs-6" />}
                    sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
                  >
                    Revise
                  </WtButton>
                )}
                <WtButton
                  tone="primary" size="small"
                  onClick={() => setTab(2)}
                  startIcon={<KTIcon iconName="send" className="fs-6" />}
                  sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
                >
                  Email Client
                </WtButton>
              </>
            )}
          </Stack>
        }
      />

      <Box
        sx={{
          display: "grid",
          gap: 2,
          alignItems: "start",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(320px, 380px) minmax(0, 1fr)" },
        }}
      >
        {/* ── Left: properties / versions / email ───────────────────────────── */}
        <GlassCard sx={{ p: 0, position: { lg: "sticky" }, top: { lg: 16 } }}>
          <Tabs
            value={tab}
            onChange={(_event, next) => setTab(next)}
            variant="fullWidth"
            sx={{ minHeight: 40, "& .MuiTab-root": { minHeight: 40, fontSize: 12.5, textTransform: "none" } }}
          >
            <Tab label="Properties" />
            <Tab label={`Versions (${versions.length})`} />
            <Tab label={`Email (${emails.length})`} />
          </Tabs>
          <Divider />

          <Box sx={{ p: 2, maxHeight: { lg: "calc(100vh - 190px)" }, overflowY: "auto" }}>
            {tab === 0 && (
              <>
                {!isEditable && (
                  <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 2 }}>
                    This version is published and frozen. Use <b>Revise</b> to open a new
                    draft — the published PDF stays exactly as it was sent.
                  </Typography>
                )}
                <DocumentPropertiesPanel
                  policy={policy}
                  values={values}
                  disabled={!isEditable}
                  onChange={(field, value) => setDraft((prev) => ({ ...(prev ?? {}), [field]: value }))}
                />
              </>
            )}

            {tab === 1 && (
              <Stack spacing={1}>
                {versions.map((version) => (
                  <Box
                    key={version.id}
                    sx={{
                      p: 1.25, borderRadius: "10px",
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                      bgcolor: version.id === doc.currentVersionId ? "action.hover" : "transparent",
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                        v{version.versionNumber}
                        {version.isPublished ? " · Published" : " · Draft"}
                      </Typography>
                      <WtButton
                        ghost size="small"
                        disabled={!version.isPublished || downloadPdf.isPending}
                        onClick={() => downloadPdf.mutate(version.id)}
                        sx={{ minHeight: 28, fontSize: 11.5 }}
                      >
                        PDF
                      </WtButton>
                    </Stack>
                    <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
                      {version.changeNote ?? "—"} · {formatDateTime(version.createdAt)}
                    </Typography>
                  </Box>
                ))}
                {!versions.length && (
                  <Typography sx={{ fontSize: 12, color: "text.secondary" }}>No versions yet.</Typography>
                )}
              </Stack>
            )}

            {tab === 2 && (
              <Stack spacing={1.5}>
                <TextField
                  size="small" fullWidth label="To" required
                  placeholder="accounts@client.com"
                  value={email.to}
                  onChange={(event) => setEmail((prev) => ({ ...prev, to: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  helperText="Comma-separate several addresses."
                />
                <TextField
                  size="small" fullWidth label="Cc"
                  value={email.cc}
                  onChange={(event) => setEmail((prev) => ({ ...prev, cc: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  size="small" fullWidth label="Subject"
                  placeholder={`${doc.template?.name ?? "Document"} ${doc.documentNumber}`}
                  value={email.subject}
                  onChange={(event) => setEmail((prev) => ({ ...prev, subject: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  size="small" fullWidth multiline minRows={4} label="Message"
                  value={email.body}
                  onChange={(event) => setEmail((prev) => ({ ...prev, body: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  helperText="Leave blank to use the standard covering note. The PDF is attached automatically."
                />
                <WtButton
                  tone="primary" size="small"
                  disabled={!email.to.trim() || send.isPending || isEditable}
                  title={isEditable ? "Publish the document before emailing it" : undefined}
                  onClick={() => send.mutate()}
                  sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
                >
                  {send.isPending ? "Sending…" : "Send with PDF"}
                </WtButton>

                {emails.length > 0 && <Divider sx={{ my: 0.5 }} />}
                {emails.map((entry) => (
                  <Box key={entry.id} sx={{ fontSize: 11.5, color: "text.secondary" }}>
                    <b>{entry.status}</b> · {entry.toAddresses} · {formatDateTime(entry.sentAt)}
                    {entry.error && <Typography sx={{ fontSize: 11, color: "error.main" }}>{entry.error}</Typography>}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </GlassCard>

        {/* ── Right: the document itself ─────────────────────────────────────── */}
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: 12, color: "text.secondary", flex: 1 }}>
              Live preview — this is the page that prints. Tinted areas are the parts you can edit.
            </Typography>
            <TextField
              select size="small" value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              sx={{ width: 96, "& .MuiInputBase-input": { fontSize: 12.5, py: 0.75 } }}
            >
              {ZOOMS.map((option) => (
                <MenuItem key={option.label} value={option.value} sx={{ fontSize: 12.5 }}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <DocumentSheet html={html} editable={values} zoom={zoom || null} />
        </Box>
      </Box>
    </Box>
  );
};

export default DocumentEditorPage;
