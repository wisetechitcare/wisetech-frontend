import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { GlassCard } from "@app/modules/common/components/ui";
import { formatDate } from "@utils/dateFormats";
import type { VaultDocument } from "@services/employee";
import { DOCUMENT_KINDS, getFileKind } from "../documentKinds";
import DocumentDownloadButton from "./DocumentDownloadButton";

/**
 * Footer actions.
 *
 * Given a filled tint and the brand colour rather than a bare glyph: as plain grey
 * icons on a white footer they read as decoration next to the date, and on a small
 * card the eye and the download arrow are easy to miss entirely. A tinted chip says
 * "press me" without needing a hover to reveal it — which matters on touch, where
 * there is no hover at all.
 */
const ACTION_SX = {
  display: "grid",
  placeItems: "center",
  width: 30,
  height: 30,
  flexShrink: 0,
  border: "1px solid",
  borderColor: "rgba(30, 58, 138, 0.18)",
  bgcolor: "rgba(30, 58, 138, 0.08)",
  color: "#1E3A8A",
  p: 0,
  // Metronic's unlayered Bootstrap button rules outrank a utility class here.
  borderRadius: "8px",
  cursor: "pointer",
  transition: "background-color .12s ease, color .12s ease, border-color .12s ease",
  "&:hover": {
    bgcolor: "#1E3A8A",
    borderColor: "#1E3A8A",
    color: "#fff",
  },
} as const;

interface DocumentCardProps {
  /** Owner of the document — the download is served per employee, not per S3 URL. */
  employeeId: string;
  document: VaultDocument;
  onOpen: (document: VaultDocument) => void;
}

/**
 * One document, as a container with its name and a real preview of what is inside.
 *
 * The preview is the point: a list of file names tells HR nothing about whether the
 * right thing was uploaded. Images render as an actual thumbnail; PDFs and anything
 * else get a typed placeholder in the category's colour, so the card is still
 * scannable rather than falling back to a broken-image icon.
 */
const DocumentCard: React.FC<DocumentCardProps> = ({ employeeId, document: doc, onOpen }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const kind = DOCUMENT_KINDS[doc.category];
  const fileKind = getFileKind(doc.path);
  const showThumbnail = fileKind === "image" && !imageFailed;

  return (
    <GlassCard
      preset="tile"
      interactive
      role="button"
      tabIndex={0}
      onClick={() => onOpen(doc)}
      onKeyDown={(e: React.KeyboardEvent) => {
        // A div playing the part of a button still has to answer the keyboard.
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(doc);
        }
      }}
      sx={{
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        height: "100%",
        // Category keyline — tells the eye which of the five sources this came from
        // before it has read a word.
        borderLeft: "3px solid",
        borderLeftColor: kind.color,
      }}
    >
      {/* Preview pane — fixed aspect so a wall of mixed documents stays on a grid. */}
      <Box
        sx={{
          position: "relative",
          aspectRatio: "16 / 10",
          borderRadius: "10px",
          overflow: "hidden",
          bgcolor: showThumbnail ? "common.black" : kind.tint,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {showThumbnail ? (
          <Box
            component="img"
            src={doc.path}
            alt={doc.title}
            loading="lazy"
            onError={() => setImageFailed(true)}
            sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <Box sx={{ textAlign: "center", px: 1 }}>
            <Box
              component="i"
              className={fileKind === "pdf" ? "bi bi-filetype-pdf" : kind.icon}
              aria-hidden
              sx={{ fontSize: 30, color: kind.color, display: "block", lineHeight: 1 }}
            />
            <Typography
              sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", color: kind.color, mt: 0.75 }}
            >
              {fileKind === "pdf" ? "PDF" : kind.label.toUpperCase()}
            </Typography>
          </Box>
        )}

        {/* A plain tint on hover. The actions used to sit HERE, over the artwork — they
            obscured the very preview they were laid on and were only reachable once
            the pointer was on the image. They now live in the footer, where they are
            always visible and never cover anything. */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            bgcolor: "rgba(15, 23, 42, 0.28)",
            opacity: 0,
            transition: "opacity .15s ease",
            pointerEvents: "none",
            ".MuiPaper-root:hover &": { opacity: 1 },
          }}
        />
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          title={doc.title}
          sx={{
            fontSize: 13.5,
            fontWeight: 700,
            color: "text.primary",
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {doc.title}
        </Typography>

        {(doc.subtitle || doc.identityNumber) && (
          <Typography
            sx={{
              fontSize: 12,
              color: "text.secondary",
              mt: 0.25,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {doc.subtitle || `No. ${doc.identityNumber}`}
          </Typography>
        )}

        {/* Footer: date on the left, actions on the right. Both always visible — a
            control that only appears on hover is invisible on touch. */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.75 }}>
          <Typography sx={{ fontSize: 11.5, color: "text.disabled", flex: 1, minWidth: 0 }}>
            {doc.uploadedAt ? formatDate(doc.uploadedAt) : "Date not recorded"}
          </Typography>

          <Box
            component="button"
            type="button"
            aria-label={`Preview ${doc.title}`}
            title="Preview"
            // The card opens the preview too; this is the explicit affordance for it.
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onOpen(doc);
            }}
            sx={ACTION_SX}
          >
            <Box component="i" className="bi bi-eye" aria-hidden sx={{ fontSize: 14 }} />
          </Box>

          <DocumentDownloadButton
            employeeId={employeeId}
            document={doc}
            stopPropagation
            sx={ACTION_SX}
          />
        </Box>
      </Box>
    </GlassCard>
  );
};

export default DocumentCard;
