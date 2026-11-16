import { useEffect } from "react";

/**
 * Anything that legitimately holds the page still. Bootstrap modals (`.modal.show`), every MUI
 * modal surface — Dialog, Drawer, Menu, Select, Popover all render a `.MuiModal-root` while open
 * — and hand-rolled overlays, which mark themselves `aria-modal="true"`.
 */
const OPEN_OVERLAY = '.modal.show, .MuiModal-root:not(.MuiModal-hidden), [aria-modal="true"]';

/** Long enough for open / close transitions (Bootstrap fade 300ms, MUI ~225ms) to settle. */
const SETTLE_MS = 400;

/** Exported for the test: undo a scroll lock that no open overlay is holding. */
export function releaseStrandedScrollLock(doc: Document = document): boolean {
  const { body, documentElement: html } = doc;
  const locked =
    body.style.overflow === "hidden" || html.style.overflow === "hidden" || body.classList.contains("modal-open");
  if (!locked || doc.querySelector(OPEN_OVERLAY)) return false;
  body.style.overflow = "";
  body.style.paddingRight = "";
  html.style.overflow = "";
  body.classList.remove("modal-open");
  // A Bootstrap backdrop left behind also blocks every click on the page.
  doc.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
  return true;
}

/**
 * Scrolling freezing app-wide until a refresh is a STRANDED scroll lock.
 *
 * Bootstrap modals, MUI modals and ~10 hand-rolled overlays each lock `<body>` themselves
 * ("remember overflow, set hidden, put it back on close"). When two overlap — a dialog opened
 * from inside a modal, which this app does a lot — and close in the other order, the last one
 * puts back the "hidden" it remembered, and nothing ever clears it. Rather than chase every
 * pairing, this watches `<body>` and, once things settle, drops a lock nothing is holding.
 */
export function useScrollLockGuard() {
  useEffect(() => {
    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => releaseStrandedScrollLock(), SETTLE_MS);
    };
    const observer = new MutationObserver(schedule);
    // Overlays portal into <body>: their removal (childList) and the lock itself (style/class).
    observer.observe(document.body, { attributes: true, attributeFilter: ["style", "class"], childList: true });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);
}
