import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { formatDate } from "@utils/dateFormats";
import type { VaultDocument } from "@services/employee";
import { DOCUMENT_KINDS, getFileKind, resolveFileName } from "../documentKinds";
import DocumentDownloadButton from "./DocumentDownloadButton";

interface DocumentListRowProps {
  employeeId: string;
  document: VaultDocument;
  onOpen: (document: VaultDocument) => void;
}

/**
 * One document as a file-explorer row.
 *
 * The list view exists for a different question than the grid: not "does this look
 * like the right document" but "what exactly is on file, and when". So it leads with
 * a small thumbnail (enough to recognise, not to read), then the name, and gives the
 * columns the grid has to leave out — category, file type, and date — their own
 * space. Columns collapse from the right on narrow screens rather than wrapping.
 */
const DocumentListRow: React.FC<DocumentListRowProps> = ({ employeeId, document: doc, onOpen }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const kind = DOCUMENT_KINDS[doc.category];
  const fileKind = getFileKind(doc.path);
  const showThumbnail = fileKind === "image" && !imageFailed;
  const fileName = resolveFileName(doc.fileName, doc.title, doc.path);

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onOpen(doc)}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(doc);
        }
      }}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 1.5,
        py: 1,
        cursor: "pointer",
        borderBottom: "1px solid",
        borderColor: "divider",
        transition: "background-color .12s ease",
        "&:last-of-type": { borderBottom: 0 },
        "&:hover, &:focus-visible": { bgcolor: "action.hover" },
      }}
    >
      {/* Thumbnail — small enough that a long list stays scannable. */}
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "8px",
          overflow: "hidden",
          flexShrink: 0,
          bgcolor: showThumbnail ? "common.black" : kind.tint,
          display: "grid",
          placeItems: "center",
        }}
      >
        {showThumbnail ? (
          <Box
            component="img"
            src={doc.path}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Box
            component="i"
            className={fileKind === "pdf" ? "bi bi-filetype-pdf" : kind.icon}
            aria-hidden
            sx={{ fontSize: 17, color: kind.color }}
          />
        )}
      </Box>

      {/* Name + the detail that would otherwise need its own column on mobile. */}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          title={doc.title}
          sx={{
            fontSize: 13.5,
            fontWeight: 600,
            color: "text.primary",
            lineHeight: 1.35,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {doc.title}
        </Typography>
        <Typography
          sx={{
            fontSize: 11.5,
            color: "text.secondary",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {doc.subtitle || (doc.identityNumber ? `No. ${doc.identityNumber}` : fileName)}
        </Typography>
      </Box>

      {/* Category — first to go on a narrow screen; the icon tile already carries it. */}
      <Box sx={{ display: { xs: "none", md: "block" }, width: 120, flexShrink: 0 }}>
        <Box
          component="span"
          sx={{
            display: "inline-block",
            px: 1,
            py: 0.25,
            borderRadius: "6px",
            bgcolor: kind.tint,
            color: kind.color,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {kind.label}
        </Box>
      </Box>

      <Typography
        sx={{
          display: { xs: "none", sm: "block" },
          width: 64,
          flexShrink: 0,
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: "0.04em",
          color: "text.disabled",
        }}
      >
        {fileKind === "pdf" ? "PDF" : fileKind === "image" ? "IMAGE" : "FILE"}
      </Typography>

      <Typography
        sx={{
          display: { xs: "none", sm: "block" },
          width: 108,
          flexShrink: 0,
          fontSize: 12,
          color: doc.uploadedAt ? "text.secondary" : "text.disabled",
        }}
      >
        {doc.uploadedAt ? formatDate(doc.uploadedAt) : "—"}
      </Typography>

      {/* Download, not a chevron: the row already reads as clickable, and this is the
          action HR reaches for without wanting the preview first. */}
      {/* Same tinted treatment as the grid card, so the action is recognisable
          whichever layout the user is in. */}
      <DocumentDownloadButton
        employeeId={employeeId}
        document={doc}
        stopPropagation
        sx={{
          width: 30,
          height: 30,
          flexShrink: 0,
          border: "1px solid",
          borderColor: "rgba(30, 58, 138, 0.18)",
          bgcolor: "rgba(30, 58, 138, 0.08)",
          color: "#1E3A8A",
          "&:hover": { bgcolor: "#1E3A8A", borderColor: "#1E3A8A", color: "#fff" },
        }}
      />
    </Box>
  );
};

export default DocumentListRow;
