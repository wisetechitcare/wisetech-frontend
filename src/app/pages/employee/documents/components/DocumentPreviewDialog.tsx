import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { GlassDialog, GlassHeader, WtButton, ToneChip, toast, AppIcon } from "@app/modules/common/components/ui";
import { downloadDocumentFile } from "@services/employee";
import type { VaultDocument } from "@services/employee";
import { DOCUMENT_KINDS, getFileKind, resolveFileName } from "../documentKinds";
import { saveBlob } from "../saveBlob";

interface DocumentPreviewDialogProps {
  /** Whose vault the document belongs to — the download is served per employee. */
  employeeId: string;
  /** The document to show. `null` closes the dialog. */
  document: VaultDocument | null;
  onClose: () => void;
}

/**
 * Full-size preview for one document.
 *
 * Images render inline; PDFs go to a native `<object>`, which uses the browser's own
 * viewer — that is deliberate. The alternative (react-pdf) means shipping a worker
 * bundle and re-implementing zoom, paging and text selection that every browser
 * already has, and it renders nothing at all for a file type it does not recognise.
 * Anything neither image nor PDF gets an honest "open it in a new tab" rather than a
 * broken frame.
 */
const DocumentPreviewDialog: React.FC<DocumentPreviewDialogProps> = ({ employeeId, document: doc, onClose }) => {
  const [failed, setFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // A new document must start optimistic, or one broken file would poison the
  // preview for every document opened afterwards.
  useEffect(() => setFailed(false), [doc?.id]);

  // Routed through the API rather than a direct S3 link: browsers ignore the
  // `download` attribute cross-origin and open the file instead of saving it.
  const handleDownload = async () => {
    if (!doc || downloading) return;
    setDownloading(true);
    try {
      const blob = await downloadDocumentFile(employeeId, doc.id);
      saveBlob(blob, resolveFileName(doc.fileName, doc.title, doc.path));
    } catch {
      toast({
        icon: "error",
        title: "Download failed",
        text: "Could not download this document. Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  };

  if (!doc) return null;

  const kind = DOCUMENT_KINDS[doc.category];
  const fileKind = getFileKind(doc.path);
  const fileName = resolveFileName(doc.fileName, doc.title, doc.path);

  return (
    <GlassDialog open onClose={onClose} maxWidth="md" fullWidth>
      <GlassHeader
        title={doc.title}
        subtitle={doc.subtitle || kind.label}
        onClose={onClose}
      />

      <Box sx={{ p: { xs: 1.5, sm: 2 }, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
          <ToneChip label={kind.label} color={kind.color} dense />
          {doc.identityNumber && <ToneChip label={`No. ${doc.identityNumber}`} tone="neutral" dense />}
          <Box sx={{ flex: 1 }} />
          <WtButton
            ghost
            size="small"
            startIcon={<AppIcon name="bi-box-arrow-up-right" aria-hidden />}
            onClick={() => window.open(doc.path, "_blank", "noopener,noreferrer")}
          >
            Open
          </WtButton>
          <WtButton
            size="small"
            disabled={downloading}
            startIcon={<i className={downloading ? "bi bi-arrow-repeat" : "bi bi-download"} aria-hidden />}
            onClick={handleDownload}
          >
            {downloading ? "Downloading…" : "Download"}
          </WtButton>
        </Box>

        <Box
          sx={{
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "action.hover",
            minHeight: { xs: 280, sm: 420 },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {fileKind === "image" && !failed && (
            <Box
              component="img"
              src={doc.path}
              alt={doc.title}
              onError={() => setFailed(true)}
              sx={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", display: "block" }}
            />
          )}

          {fileKind === "pdf" && !failed && (
            <Box
              component="object"
              data={doc.path}
              type="application/pdf"
              sx={{ width: "100%", height: { xs: 320, sm: "70vh" }, border: 0 }}
            >
              {/* Rendered only when the browser cannot display the PDF itself. */}
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                  This browser cannot preview PDFs inline.
                </Typography>
              </Box>
            </Box>
          )}

          {(fileKind === "other" || failed) && (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Box
                component="i"
                className="bi bi-file-earmark-arrow-down"
                aria-hidden
                sx={{ fontSize: 40, color: "text.disabled", display: "block", mb: 1 }}
              />
              <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "text.primary" }}>
                {failed ? "This file could not be displayed" : "No inline preview for this file type"}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.5 }}>
                {fileName}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </GlassDialog>
  );
};

export default DocumentPreviewDialog;
