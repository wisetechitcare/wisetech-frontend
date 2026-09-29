import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Divider, MenuItem, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { WtButton, toast, confirmDialog } from "@app/modules/common/components/ui";
import { formatDateTime } from "@utils/dateFormats";
import { formatCurrencyDecimal } from "@utils/currency";
import {
  getDocument, saveDocumentDraft, publishDocument, reviseDocument,
  generateDocumentPdf, emailDocument, getDocumentVersions, getDocumentEmails,
} from "@services/documents";
import { BillingStatusBadge, BillingLoadingState } from "../components";
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

/** Every control in the command bar shares this, so the rail has one baseline. */
const ACTION_SX = { minHeight: 36, borderRadius: "10px", fontSize: 13, whiteSpace: "nowrap" as const };

const ZOOMS = [
  { label: "Fit", value: 0 },
  { label: "75%", value: 0.75 },
  { label: "100%", value: 1 },
  { label: "125%", value: 1.25 },
];

/**
 * Embeddable: the project's Billing tab hosts this in a dialog so a proforma can
 * be written and finalised without leaving the project. `documentId` overrides
 * the route param and `onBack` replaces the "back to repository" button, which
 * is the only navigation this page does.
 */
export interface DocumentEditorPageProps {
  documentId?: string;
  onBack?: () => void;
}

/**
 * The page's two colours. An MEP practice's own output is stamped, ruled
 * drawings, so the chrome here is built from rules and cells rather than cards —
 * and the one accent is the blue `DocumentSheet` already paints over editable
 * regions, so it means exactly one thing on this screen.
 *
 * The desk the sheet sits on is NOT here: `DocumentSheet` owns it, and a second
 * tone behind it only ever produced two surfaces a few hex values apart.
 */
const RULE = "#CBD5E1";
const EDIT_BLUE = "#5FA8DF";

/**
 * One cell of the title block.
 *
 * A drawing's title block carries its number, revision, date and value in ruled
 * cells, always in the same order — you learn where to look once. That is a
 * better fit for a document header than a middle-dot meta string, where every
 * fact has the same weight and the money is impossible to find.
 */
const Cell: React.FC<{ label: string; value: React.ReactNode; grow?: boolean }> = ({
  label, value, grow,
}) => (
  <Box
    sx={{
      px: 1.75,
      borderLeft: `1px solid ${RULE}`,
      minWidth: 0,
      flex: grow ? "1 1 auto" : "0 0 auto",
    }}
  >
    <Typography sx={{ fontSize: 10, color: "text.disabled", lineHeight: 1.5, letterSpacing: "0.02em" }}>
      {label}
    </Typography>
    <Typography
      noWrap
      sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.45, fontVariantNumeric: "tabular-nums" }}
    >
      {value}
    </Typography>
  </Box>
);

const DocumentEditorPage: React.FC<DocumentEditorPageProps> = ({ documentId, onBack }) => {
  const params = useParams();
  const id = documentId ?? params.id ?? "";
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

  /** One rail of actions, so the bar has exactly one primary at any moment. */
  const actions = isEditable ? (
    <>
      <WtButton
        ghost size="small"
        disabled={!dirty || save.isPending}
        onClick={() => save.mutate()}
        startIcon={<KTIcon iconName="save-2" className="fs-6" />}
        sx={ACTION_SX}
      >
        {save.isPending ? "Saving…" : "Save draft"}
      </WtButton>
      <WtButton
        tone="primary" size="small"
        disabled={publish.isPending || dirty || missingRequired.length > 0}
        title={
          dirty ? "Save the draft first"
            : missingRequired.length ? `Fill in ${missingRequired.length} required field(s) first`
            : "Freeze this version and render its PDF"
        }
        onClick={() => publish.mutate()}
        startIcon={<KTIcon iconName="check-circle" className="fs-6" />}
        sx={ACTION_SX}
      >
        {publish.isPending ? "Publishing…" : "Publish & generate PDF"}
      </WtButton>
    </>
  ) : (
    <>
      <WtButton
        ghost size="small"
        onClick={() => downloadPdf.mutate(undefined)}
        disabled={downloadPdf.isPending}
        startIcon={<KTIcon iconName="file-down" className="fs-6" />}
        sx={ACTION_SX}
      >
        PDF
      </WtButton>
      <WtButton
        ghost size="small"
        onClick={() => wordDownload.mutate()}
        disabled={wordDownload.isPending}
        startIcon={<KTIcon iconName="file-down" className="fs-6" />}
        sx={ACTION_SX}
      >
        Word
      </WtButton>
      {isRevisable && (
        <WtButton
          ghost size="small" onClick={askRevise}
          startIcon={<KTIcon iconName="pencil" className="fs-6" />}
          sx={ACTION_SX}
        >
          Revise
        </WtButton>
      )}
      <WtButton
        tone="primary" size="small"
        onClick={() => setTab(2)}
        startIcon={<KTIcon iconName="send" className="fs-6" />}
        sx={ACTION_SX}
      >
        Email client
      </WtButton>
    </>
  );

  return (
    <Box sx={{ pb: 3 }}>
      {/*
        THE COMMAND BAR.
        Identity and state on the left, one rail of actions on the right, on a
        single baseline. It sticks, because the thing you scroll is an A4 page
        and "publish" should never be a scroll away from what you are checking.
      */}
      {/*
        THE TITLE BLOCK.
        Identity and state on the left, the document's facts in ruled cells, one
        rail of actions on the right, all on a single baseline. It sticks,
        because the thing you scroll is an A4 page and "publish" should never be
        a scroll away from what you are checking.
      */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          bgcolor: "background.paper",
          borderBottom: `1px solid ${RULE}`,
          px: { xs: 1.5, sm: 2.5 },
          py: 1.25,
          mb: { xs: 1.5, sm: 2 },
        }}
      >
        <Stack
          direction={{ xs: "column", lg: "row" }}
          alignItems={{ xs: "stretch", lg: "center" }}
          spacing={{ xs: 1.25, lg: 2 }}
        >
          <Stack direction="row" alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
            <WtButton
              ghost size="small"
              onClick={() => (onBack ? onBack() : navigate("/billing/proformas"))}
              startIcon={<KTIcon iconName="arrow-left" className="fs-6" />}
              sx={{ ...ACTION_SX, flexShrink: 0, mr: 1.75 }}
            >
              Back
            </WtButton>

            {/* The number is the identity of the sheet, so it is the largest
                thing here and it sits outside the ruled cells. */}
            <Stack direction="row" alignItems="center" spacing={1} sx={{ pr: 1.75, minWidth: 0 }}>
              <Typography
                noWrap
                sx={{
                  fontSize: { xs: 17, sm: 19 },
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {doc.documentNumber}
              </Typography>
              <BillingStatusBadge status={doc.status} />
            </Stack>

            <Stack
              direction="row"
              sx={{ display: { xs: "none", md: "flex" }, minWidth: 0, flex: 1 }}
            >
              <Cell label="Template" value={doc.template?.name ?? doc.templateCode} grow />
              <Cell label="Revision" value={`R${doc.versionCount}`} />
              <Cell
                label="Total incl. tax"
                value={formatCurrencyDecimal(Number(doc.grandTotal))}
              />
            </Stack>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ flexShrink: 0, justifyContent: { xs: "flex-end", lg: "initial" } }}
          >
            {actions}
          </Stack>
        </Stack>
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: { xs: 1.5, sm: 2 },
          alignItems: "start",
          // 400px, because the schedule is now label-beside-value and the value
          // column needs room to breathe before it starts wrapping every line.
          gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "400px minmax(0, 1fr)" },
          px: { xs: 1.5, sm: 2.5 },
          // An A4 page is 794px wide and never renders past 100%, so a workspace
          // that stretches to a 2560px monitor is guaranteed empty desk. Capping
          // it keeps the sheet and the schedule within one eye movement.
          maxWidth: 1480,
          mx: "auto",
        }}
      >
        {/* ── the inspector ─────────────────────────────────────────────────── */}
        <Box
          sx={{
            bgcolor: "background.paper",
            border: `1px solid ${RULE}`,
            borderRadius: "12px",
            overflow: "hidden",
            position: { lg: "sticky" },
            top: { lg: 92 },
          }}
        >
          <Tabs
            value={tab}
            onChange={(_event, next) => setTab(next)}
            variant="fullWidth"
            sx={{
              minHeight: 42,
              borderBottom: `1px solid ${RULE}`,
              "& .MuiTab-root": { minHeight: 42, fontSize: 12.5, textTransform: "none", fontWeight: 600 },
            }}
          >
            <Tab label="Properties" />
            <Tab label={`Versions (${versions.length})`} />
            <Tab label={`Email (${emails.length})`} />
          </Tabs>

          <Box sx={{ p: 2, maxHeight: { lg: "calc(100vh - 168px)" }, overflowY: "auto" }}>
            {tab === 0 && (
              <>
                {!isEditable && (
                  <Box
                    sx={{
                      mb: 2, p: 1.25, borderRadius: "10px",
                      bgcolor: "action.hover",
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      This version is published and frozen. Use <b>Revise</b> to open a new
                      draft — the published PDF stays exactly as it was sent.
                    </Typography>
                  </Box>
                )}
                {isEditable && missingRequired.length > 0 && (
                  <Box
                    sx={{
                      mb: 2, p: 1.25, borderRadius: "10px",
                      bgcolor: "warning.light",
                      border: (theme) => `1px solid ${theme.palette.warning.main}`,
                    }}
                  >
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: "warning.dark" }}>
                      {missingRequired.length} required field
                      {missingRequired.length === 1 ? "" : "s"} still empty
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: "warning.dark" }}>
                      They are marked below. Publishing stays disabled until each is filled.
                    </Typography>
                  </Box>
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
                  sx={ACTION_SX}
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
        </Box>

        {/*
          THE WORK SURFACE.
          A toned panel behind the sheet, so the page reads as paper under light
          rather than a white rectangle on a white page — the sheet is the thing
          being made here, and it should be the brightest object on screen.
        */}
        {/*
          No background and no border here. `DocumentSheet` paints its own desk
          around the page; wrapping that in a second toned panel produced two
          nested surfaces a few hex values apart, which is the card-in-card this
          redesign set out to remove.
        */}
        <Box sx={{ minWidth: 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{ mb: 1, px: 0.5 }}
          >
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: EDIT_BLUE, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 12, color: "text.secondary", minWidth: 0 }}>
                This is the page that prints. Tinted areas match the marked rows on the left.
              </Typography>
            </Stack>
            <TextField
              select size="small" value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              sx={{
                width: 92, flexShrink: 0,
                bgcolor: "background.paper", borderRadius: "8px",
                "& .MuiInputBase-input": { fontSize: 12.5, py: 0.75 },
              }}
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
