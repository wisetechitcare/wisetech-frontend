/**
 * The zoom choices for a document page. 0 = Fit: the whole width, floored at a readable size (see `DocumentSheet`), so a
 * narrow screen pans sideways rather than showing a strip nobody can read. 50% is the deliberate whole-page overview.
 */
export const ZOOMS = [
  { label: "Fit", value: 0 },
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "100%", value: 1 },
  { label: "125%", value: 1.25 },
] as const;
