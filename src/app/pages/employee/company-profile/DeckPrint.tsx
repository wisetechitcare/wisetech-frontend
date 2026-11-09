import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { SlideSpec } from "@app/modules/company-profile/profileBuilder";

/**
 * Export PDF without a server (the backend export is a later phase): the shown slides, one 16:9 page each,
 * drawn into a print window opened by the click (so no pop-up blocker); the browser's "Save as PDF" writes
 * the file, with real text rather than pictures of it. The window borrows the app's stylesheets, prints once
 * every image and font has loaded, and closes after printing, cancelling or being closed.
 */
export function DeckPrint({
  win,
  slides,
  render,
  onDone,
}: {
  win: Window;
  slides: SlideSpec[];
  render: (s: SlideSpec) => ReactNode;
  onDone: () => void;
}) {
  useEffect(() => {
    const doc = win.document;
    doc.title = "Company Profile";
    for (const node of document.querySelectorAll(
      'link[rel="stylesheet"], style',
    ))
      doc.head.appendChild(node.cloneNode(true));
    // The page size has no utility class. This is a print document, not app UI, hence not a JSX <style>.
    const page = doc.createElement("style");
    page.textContent =
      "@page { size: 1600px 900px; margin: 0 } body { margin: 0 }";
    doc.head.appendChild(page);
    const done = () => {
      win.close();
      onDone();
    };
    win.addEventListener("afterprint", done);
    win.addEventListener("pagehide", onDone);
    const images = [...doc.images]
      .filter((i) => !i.complete)
      .map(
        (i) =>
          new Promise((ready) => {
            i.addEventListener("load", ready);
            i.addEventListener("error", ready);
          }),
      );
    void Promise.all([...images, doc.fonts.ready]).then(() => win.print());
    return () => {
      win.removeEventListener("afterprint", done);
      win.removeEventListener("pagehide", onDone);
    };
    // One print run per window: the deck is frozen when Export is clicked.
  }, [win]); // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <div className="[print-color-adjust:exact]">
      {slides.map((s) => (
        <div
          key={s.id}
          className="h-255 w-[1600px] break-after-page overflow-hidden"
        >
          {render(s)}
        </div>
      ))}
    </div>,
    win.document.body,
  );
}
