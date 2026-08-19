import { useState } from "react";
import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";
import { toast } from "@app/modules/common/components/ui";
import { downloadDocumentFile } from "@services/employee";
import type { VaultDocument } from "@services/employee";
import { resolveFileName } from "../documentKinds";
import { saveBlob } from "../saveBlob";

interface DocumentDownloadButtonProps {
  employeeId: string;
  document: VaultDocument;
  sx?: SxProps<Theme>;
  /** Rendered inside a clickable row/card, so the click must not bubble. */
  stopPropagation?: boolean;
}

/**
 * Downloads one document, everywhere the same way.
 *
 * A single component rather than an `<a download>` per surface, because the download
 * has to go through the API — the files are on S3, a different origin, and browsers
 * ignore the `download` attribute cross-origin and simply open the file instead.
 * Centralising it also means the pending state and the failure message are consistent
 * between the grid, the list and the preview dialog.
 */
const DocumentDownloadButton: React.FC<DocumentDownloadButtonProps> = ({
  employeeId,
  document: doc,
  sx,
  stopPropagation = false,
}) => {
  const [busy, setBusy] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    e.preventDefault();
    if (busy) return;

    setBusy(true);
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
      setBusy(false);
    }
  };

  return (
    <Box
      component="button"
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label={`Download ${doc.title}`}
      title="Download"
      sx={[
        {
          display: "grid",
          placeItems: "center",
          border: 0,
          background: "none",
          p: 0,
          cursor: busy ? "wait" : "pointer",
          // Metronic's unlayered Bootstrap button rules outrank a utility class here.
          borderRadius: "8px",
          transition: "background-color .12s ease, color .12s ease",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ] as SxProps<Theme>}
    >
      <Box
        component="i"
        className={busy ? "bi bi-arrow-repeat" : "bi bi-download"}
        aria-hidden
        sx={{
          fontSize: 14,
          animation: busy ? "wt-doc-spin 0.9s linear infinite" : "none",
          "@keyframes wt-doc-spin": { to: { transform: "rotate(360deg)" } },
        }}
      />
    </Box>
  );
};

export default DocumentDownloadButton;
