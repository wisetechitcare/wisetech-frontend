import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/ds/lib/utils";
import { PAPER_SIZES, type PaperSize } from "@services/documents";
import { EDIT_BLUE } from "./theme";
import type { PreviewToggle } from "./types";

/** The smallest scale "Fit" will shrink the page to. Below it the A4 print (about 7pt) stops being readable. */
const MIN_FIT_SCALE = 0.7;

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


export interface DocumentSheetProps {
  /** Server-rendered HTML for the current version, `<style>` block included. */
  html: string;
  /** Current editable values. Changes are patched into the DOM, not re-rendered. */
  editable: Record<string, string>;
  /** null = fit to the container width. */
  zoom?: number | null;
  /** Fires when a field is patched, so the caller can flash the affected row. */
  onFieldPatched?: (field: string) => void;
  /** Paper the page is laid out on. The server's stylesheet sizes the sheet via `paper-<key>`. */
  paper?: PaperSize;
  /**
   * Set = the tinted fields are typed into directly on the page. Each keystroke
   * reports the field's plain text; the value then flows back through `editable`
   * like any other edit, so every other copy of the field updates too.
   */
  onFieldEdit?: (field: string, value: string) => void;
  /** Fires when the caret leaves a field (blur / Enter) — the moment a linked value is worked out. */
  onFieldCommit?: (field: string) => void;
  /** Fields that may span lines (Enter inserts a line break); the rest stay one line. */
  multilineFields?: readonly string[];
  /** Required fields — painted red while empty, so the page shows what is missing. */
  requiredFields?: readonly string[];
  /**
   * The server's page-layout script (the same one its PDF renderer runs). Cuts the document into A4 pages: content that
   * no longer fits flows on to a new page, with the header and footer repeated.
   */
  paginator?: string;
  /** Parts of the page that follow a Yes/No field at once, before the server re-renders. */
  previewToggles?: readonly PreviewToggle[];
  /** Hover text for a field typed on the page; undefined = "Click to edit". */
  fieldTitle?: (field: string) => string | undefined;
}

const NONE: readonly string[] = [];
const NO_TOGGLES: readonly PreviewToggle[] = [];

/** Focus `node` with the caret `offset` characters into its text (end of the text when it is shorter). */
const placeCaret = (node: HTMLElement, offset: number) => {
  node.focus({ preventScroll: true });
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  let left = offset;
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    const length = text.textContent?.length ?? 0;
    if (left <= length) {
      range.setStart(text, left);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    left -= length;
  }
  range.selectNodeContents(node);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
};

const DocumentSheet: React.FC<DocumentSheetProps> = ({
  html, editable, zoom = null, onFieldPatched, paper = "a4", onFieldEdit, onFieldCommit, multilineFields = NONE, requiredFields = NONE, paginator,
  previewToggles = NO_TOGGLES, fieldTitle,
}) => {
  const commitRef = useRef(onFieldCommit);
  commitRef.current = onFieldCommit;
  const frameRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [height, setHeight] = useState(0);
  // Bumped to lay the page out again from scratch (the caret left a field, web fonts arrived).
  const [relayout, setRelayout] = useState(0);

  // Page width in CSS pixels at 96dpi. The sheet itself is sized in mm/in.
  const pagePx = PAPER_SIZES.find((p) => p.key === paper)?.px ?? 794;
  // Fit = the whole width, but never smaller than the smallest scale the print stays readable at: on a phone the page
  // then pans sideways instead of shrinking to a strip. (50% in the zoom list is the deliberate whole-page overview.)
  const scale = zoom ?? Math.max(fitScale, MIN_FIT_SCALE);

  // Fit-to-width. ResizeObserver rather than a window listener, because the panel
  // resizes when the left drawer opens without the window changing at all.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    // The room INSIDE the frame's padding: measuring the whole frame left the page a few pixels too wide at Fit.
    const measure = () => {
      const style = getComputedStyle(frame);
      const room = frame.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      setFitScale(Math.min(1, room / pagePx));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [pagePx]);

  // The server's page-layout script (the one its PDF renderer runs too), compiled once.
  const paginate = useMemo(
    () => (paginator ? (new Function("root", paginator) as (root: HTMLElement) => void) : null),
    [paginator],
  );

  const editRef = useRef(onFieldEdit);
  editRef.current = onFieldEdit;
  const enabled = !!onFieldEdit;

  /** The editable values, written into the page's tinted fields. */
  const patchValues = (root: HTMLElement) => {
    for (const toggle of previewToggles) {
      const off = editable[toggle.field] === "No";
      root.querySelectorAll<HTMLElement>(toggle.selector).forEach((node) => {
        if (toggle.hide === "display") node.style.display = off ? "none" : "";
        else node.style.visibility = off ? "hidden" : "";
      });
    }
    for (const [field, value] of Object.entries(editable)) {
      const nodes = root.querySelectorAll<HTMLElement>(`[data-field="${CSS.escape(field)}"]`);
      if (!nodes.length) continue;
      nodes.forEach((node) => {
        // textContent, never innerHTML: typed text is text, at every zoom level.
        // The node being typed into already shows its text — rewriting it would
        // throw the caret back to the start.
        if (node === document.activeElement) return;
        if (node.textContent !== value) node.textContent = value;
      });
      onFieldPatched?.(field);
    }
    // Empty required fields: flagged red on the page itself.
    root.querySelectorAll<HTMLElement>("[data-field]").forEach((node) => {
      const field = node.dataset.field ?? "";
      node.classList.toggle("ed-missing", requiredFields.includes(field) && !String(editable[field] ?? "").trim());
    });
  };

  // In-place editing. `plaintext-only` keeps pasted formatting out, and the value is
  // read back as text — the server re-escapes it on render either way.
  const arm = (root: HTMLElement) => {
    root.querySelectorAll<HTMLElement>("[data-field]").forEach((node) => {
      node.contentEditable = enabled ? "plaintext-only" : "false";
      // No spell-check squiggles: names, addresses and codes are not dictionary words, and the marks print over the page.
      node.spellcheck = false;
      if (enabled) node.title = fieldTitle?.(node.dataset.field ?? "") ?? "Click to edit";
      else node.removeAttribute("title");
    });
  };

  // Lay the document out: fresh HTML, the values written in, then cut into A4 pages (page-fitting content flows on to
  // the next page with the header and footer repeated). The layout depends on the text, so it is redone whenever the
  // values change — except while the caret is inside the page, where only the text is patched (rebuilding the page
  // would take the caret away) and the layout is redone when it leaves.
  const laidOut = useRef<{ html: string; paper: string; paginate: unknown; enabled: boolean; relayout: number } | null>(null);
  const rebuilding = useRef(false);
  // The parent passes a fresh array each render; compare by content so a re-render alone never rebuilds the page.
  const requiredKey = requiredFields.join("|");
  useLayoutEffect(() => {
    const root = sheetRef.current;
    if (!root) return;
    const last = laidOut.current;
    const sameShape = !!last && last.html === html && last.paper === paper && last.paginate === paginate
      && last.enabled === enabled && last.relayout === relayout;
    if (sameShape && root.contains(document.activeElement)) {
      patchValues(root);
    } else {
      // Typing: remember which field (and which copy of it) holds the caret and where, so the rebuilt page gives it back.
      const active = document.activeElement as HTMLElement | null;
      const field = active && root.contains(active) ? active.dataset.field : undefined;
      let copy = 0;
      let caret = 0;
      if (field && active) {
        copy = [...root.querySelectorAll(`[data-field="${CSS.escape(field)}"]`)].indexOf(active);
        const selection = window.getSelection();
        if (selection?.rangeCount) {
          const range = selection.getRangeAt(0);
          const before = range.cloneRange();
          before.selectNodeContents(active);
          before.setEnd(range.endContainer, range.endOffset);
          caret = before.toString().length;
        }
      }
      // Replacing the page drops the field that has the caret; the browser reports that as the field losing focus.
      // That is OUR rebuild, not the user leaving — `rebuilding` tells the focus-out handler to ignore it (otherwise
      // it would ask for another layout, which drops the field again: an endless loop that froze the tab).
      rebuilding.current = true;
      try {
        root.innerHTML = html;
        patchValues(root);
        arm(root);
        try { paginate?.(root); } catch { /* an unpaginated page is still a readable page */ }
        laidOut.current = { html, paper, paginate, enabled, relayout };
        if (field) {
          const copies = root.querySelectorAll<HTMLElement>(`[data-field="${CSS.escape(field)}"]`);
          const target = copies[Math.max(0, copy)] ?? copies[copies.length - 1];
          if (target) placeCaret(target, caret);
        }
      } finally {
        rebuilding.current = false;
      }
    }
    // A document can be several sheets: the wrapper carries first top to last bottom.
    // getBoundingClientRect is the VISUAL box — it already includes the outer transform and any `zoom`.
    const sheets = [...root.querySelectorAll<HTMLElement>(".sheet")].filter((el) => el.style.display !== "none");
    if (!sheets.length) return;
    const top = sheets[0].getBoundingClientRect().top;
    setHeight(sheets[sheets.length - 1].getBoundingClientRect().bottom - top);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, paper, paginate, enabled, relayout, scale, editable, onFieldPatched, requiredKey]);

  // Web fonts arrive after the first layout and change every text height: lay out again once they are in.
  useEffect(() => {
    let live = true;
    (document as any).fonts?.ready?.then(() => { if (live) setRelayout((n) => n + 1); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const root = sheetRef.current;
    if (!root || !enabled) return;
    const fieldOf = (target: EventTarget | null) =>
      (target as HTMLElement | null)?.closest?.<HTMLElement>("[data-field]") ?? null;
    // The page is laid out again a moment after typing pauses, so text that grows past the page flows on to the next
    // one while it is typed (the caret stays where it is) — the signature is never pushed into the footer.
    let pause: ReturnType<typeof setTimeout> | undefined;
    const onInput = (event: Event) => {
      const node = fieldOf(event.target);
      if (node?.dataset.field) editRef.current?.(node.dataset.field, node.innerText.replace(/\n$/, ""));
      clearTimeout(pause);
      pause = setTimeout(() => setRelayout((n) => n + 1), 350);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const node = fieldOf(event.target);
      if (event.key === "Enter" && node && !multilineFields.includes(node.dataset.field ?? "")) {
        event.preventDefault();
        node.blur();
      }
    };
    const onFocusOut = (event: FocusEvent) => {
      // A field removed by our own rebuild (now or reported a moment later) is not the user leaving it.
      if (rebuilding.current || !(event.target instanceof Node && event.target.isConnected)) return;
      const field = fieldOf(event.target)?.dataset.field;
      if (field) commitRef.current?.(field);
      // Moving to another field of the page keeps the page as it is (rebuilding it would drop that click);
      // leaving the page altogether is the moment to lay it out again, now that the text may have grown.
      if (!(event.relatedTarget instanceof Node && root.contains(event.relatedTarget))) setRelayout((n) => n + 1);
    };
    root.addEventListener("input", onInput);
    root.addEventListener("keydown", onKeyDown);
    root.addEventListener("focusout", onFocusOut);
    return () => {
      root.removeEventListener("input", onInput);
      root.removeEventListener("keydown", onKeyDown);
      root.removeEventListener("focusout", onFocusOut);
      clearTimeout(pause);
    };
  }, [enabled, multilineFields]);

  return (
    <div
      ref={frameRef}
      // The page can be wider than the screen: this is the area you pan across, by swipe, trackpad or arrow keys.
      tabIndex={0}
      role="region"
      aria-label="Document page — scroll sideways to see all of it"
      // `overscroll-x-contain`: a sideways swipe at the edge pans the page, it does not trigger the
      // browser's back gesture.
      // The desk colours stay literal rather than becoming tokens. They are not themed UI surface —
      // they are the neutral desk a sheet of white PRINTED paper sits on, chosen per theme so the
      // page's edge stays visible against it. A token would track the tenant's brand and could land
      // on white, erasing that edge.
      className="w-full overflow-x-auto overscroll-x-contain rounded-lg bg-[#e9edf2] p-1 [-webkit-overflow-scrolling:touch] sm:p-3 md:p-5 dark:bg-[#1c2128]"
    >
      {/*
        Centred, not pinned left. The scaled sheet is narrower than the desk at
        every zoom below Fit, and left-aligning it left a dead column the width of
        a second page. `mx: auto` is safe inside the scrolling frame: margin auto
        only claims space that is actually free, so at 125% on a narrow panel it
        resolves to zero and the sheet scrolls instead of being clipped.
      */}
      {/* Runtime geometry (the scaled page box) stays in `style`: these are computed pixel values,
          not design decisions a utility class could carry. */}
      <div className="mx-auto" style={{ height: height || undefined, width: pagePx * scale }}>
        <div
          ref={sheetRef}
          className={cn(
            `paper-${paper}`,
            "origin-top-left shadow-[0_2px_8px_rgba(15,23,42,0.14),0_12px_32px_rgba(15,23,42,0.12)]",
            // These target the server-injected HTML (`.sheet`, `.ed`), so they are descendant rules.
            "[&_.sheet]:m-0 [&_.sheet+.sheet]:mt-4",
            "[&_.ed]:max-w-full [&_.ed]:bg-[rgba(95,168,223,0.13)] [&_.ed]:outline-1 [&_.ed]:outline-offset-1 [&_.ed]:outline-dashed [&_.ed]:outline-[rgba(95,168,223,0.55)] [&_.ed]:[overflow-wrap:anywhere] [&_.ed]:[word-break:break-word]",
            enabled && [
              "[&_.ed]:cursor-text [&_.ed]:rounded-[2px] [&_.ed]:transition-[background-color,outline-color] [&_.ed]:duration-[120ms]",
              "[&_.ed:hover]:bg-[rgba(95,168,223,0.24)]",
              // The printed page is white paper in both themes, so the focused field is literally white.
              "[&_.ed:focus]:bg-white [&_.ed:focus]:outline-2 [&_.ed:focus]:outline-(--edit-blue)",
              // An empty field still needs something to click.
              "[&_.ed:empty]:inline-block [&_.ed:empty]:min-w-[4em]",
              "[&_.ed:empty]:before:font-normal [&_.ed:empty]:before:text-[#9AA7B5] [&_.ed:empty]:before:content-['Click_to_add']",
            ],
            "[&_.ed.ed-missing]:bg-[rgba(229,62,62,0.10)] [&_.ed.ed-missing]:outline-1 [&_.ed.ed-missing]:outline-dashed [&_.ed.ed-missing]:outline-[rgba(229,62,62,0.7)]",
            "[&_.ed.ed-missing:empty]:before:text-[#E53E3E] [&_.ed.ed-missing:empty]:before:content-['Required']",
          )}
          style={{ width: pagePx, transform: `scale(${scale})`, "--edit-blue": EDIT_BLUE } as React.CSSProperties}
          // The document's HTML is written in by the layout effect above (the document's own stylesheet ships inside
          // it and is scoped to `.sheet`, so it cannot reach the surrounding ERP chrome). The editable tint above
          // marks which parts this user may change; print/PDF never sees it, because that render happens
          // server-side from the same HTML without these rules.
        />
      </div>
    </div>
  );
};

export default DocumentSheet;
