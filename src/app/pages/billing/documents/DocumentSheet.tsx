import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Box } from "@mui/material";

/**
 * The live A4 document surface.
 *
 * It renders the HTML the SERVER produced from the stored template — the same
 * string the PDF pipeline prints. There is no React re-implementation of the
 * layout here, which is what makes "the preview is identical to the PDF" a
 * structural fact instead of a maintenance promise.
 *
 * Live editing works by patching, not re-rendering: the server wrapped every
 * editable merge field in `<span data-field="…">`, so a keystroke writes
 * `textContent` on those nodes. Two consequences worth stating:
 *
 *   1. No client-side merge engine exists, so it cannot drift from the server's.
 *   2. Typed text is never parsed as markup — `textContent` cannot inject HTML —
 *      so the preview stays safe even though the surrounding document is injected.
 *
 * The sheet is a fixed 210mm wide and scaled to fit its column, so it is the real
 * page geometry at every zoom level rather than a responsive approximation.
 */

/** A4 width in CSS pixels at 96dpi. The sheet itself is sized in mm. */
const A4_PX = 794;

export interface DocumentSheetProps {
  /** Server-rendered HTML for the current version, `<style>` block included. */
  html: string;
  /** Current editable values. Changes are patched into the DOM, not re-rendered. */
  editable: Record<string, string>;
  /** null = fit to the container width. */
  zoom?: number | null;
  /** Fires when a field is patched, so the caller can flash the affected row. */
  onFieldPatched?: (field: string) => void;
}

const DocumentSheet: React.FC<DocumentSheetProps> = ({ html, editable, zoom = null, onFieldPatched }) => {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [height, setHeight] = useState(0);

  const scale = zoom ?? fitScale;

  // Fit-to-width. ResizeObserver rather than a window listener, because the panel
  // resizes when the left drawer opens without the window changing at all.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => setFitScale(Math.min(1, frame.clientWidth / A4_PX));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // The scaled sheet is transform-only, so it does not affect layout height —
  // the wrapper has to carry it or the page cannot scroll to the footer.
  useLayoutEffect(() => {
    const sheet = sheetRef.current?.firstElementChild as HTMLElement | undefined;
    if (sheet) setHeight(sheet.getBoundingClientRect().height * scale);
  }, [html, scale, editable]);

  // Patch editable fields in place.
  useEffect(() => {
    const root = sheetRef.current;
    if (!root) return;
    for (const [field, value] of Object.entries(editable)) {
      const nodes = root.querySelectorAll<HTMLElement>(`[data-field="${CSS.escape(field)}"]`);
      if (!nodes.length) continue;
      nodes.forEach((node) => {
        // textContent, never innerHTML: typed text is text, at every zoom level.
        if (node.textContent !== value) node.textContent = value;
      });
      onFieldPatched?.(field);
    }
  }, [editable, html, onFieldPatched]);

  return (
    <Box
      ref={frameRef}
      sx={{
        width: "100%",
        overflowX: "auto",
        // A neutral desk the white page sits on, in both themes — the sheet itself
        // is always white because that is what prints.
        bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1c2128" : "#e9edf2"),
        borderRadius: 2,
        p: { xs: 1, md: 2.5 },
      }}
    >
      <Box sx={{ height: height || undefined, minWidth: A4_PX * scale }}>
        <Box
          ref={sheetRef}
          // The document's own stylesheet ships inside this HTML and is scoped to
          // `.sheet`, so it cannot reach the surrounding ERP chrome.
          dangerouslySetInnerHTML={{ __html: html }}
          sx={{
            width: A4_PX,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            boxShadow: "0 2px 8px rgba(15,23,42,0.14), 0 12px 32px rgba(15,23,42,0.12)",
            "& .sheet": { margin: 0 },
            // Editable regions get a faint tint so it is obvious which parts of the
            // document this user is allowed to change. Print/PDF never sees it —
            // that render happens server-side from the same HTML without this rule.
            "& .ed": {
              backgroundColor: "rgba(95,168,223,0.13)",
              outline: "1px dashed rgba(95,168,223,0.55)",
              outlineOffset: "1px",
            },
          }}
        />
      </Box>
    </Box>
  );
};

export default DocumentSheet;
