import { useState } from "react";
import { PAPER_SIZES, type PaperSize } from "@services/documents";

/**
 * Paper size is a print-time choice, not document data, so it lives in this
 * browser only — whoever prints on an A5 bill book keeps getting A5.
 */
const PAPER_KEY = "wt.document.paper";

const readPaper = (): PaperSize => {
  try {
    const stored = localStorage.getItem(PAPER_KEY);
    return PAPER_SIZES.some((p) => p.key === stored) ? (stored as PaperSize) : "a4";
  } catch {
    return "a4";
  }
};

export const usePaperPreference = () => {
  const [paper, setPaperState] = useState<PaperSize>(readPaper);
  const setPaper = (next: PaperSize) => {
    setPaperState(next);
    try { localStorage.setItem(PAPER_KEY, next); } catch { /* preference only */ }
  };
  return [paper, setPaper] as const;
};
