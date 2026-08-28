import type { VaultDocumentCategory } from "@services/employee";

/**
 * Presentation for the five places a document can come from.
 *
 * The vault flattens five tables into one shape, so the ONLY thing distinguishing a
 * bank proof from a degree certificate on screen is this map. Kept as data rather
 * than branching in the card so a new source is one entry, not a new code path.
 */
export interface DocumentKind {
  label: string;
  /** Bootstrap icon class, matching the rest of the employee module. */
  icon: string;
  /** Accent used for the icon tile, the chip and the card keyline. */
  color: string;
  tint: string;
}

export const DOCUMENT_KINDS: Record<VaultDocumentCategory, DocumentKind> = {
  photo: { label: "Profile Photo", icon: "bi-person-badge", color: "#0369A1", tint: "rgba(3, 105, 161, 0.10)" },
  onboarding: { label: "Onboarding", icon: "bi-file-earmark-text", color: "#1E3A8A", tint: "rgba(30, 58, 138, 0.10)" },
  identity: { label: "Identity", icon: "bi-person-vcard", color: "#7C3AED", tint: "rgba(124, 58, 237, 0.10)" },
  signature: { label: "Signature", icon: "bi-vector-pen", color: "#0F766E", tint: "rgba(15, 118, 110, 0.10)" },
  bank: { label: "Bank", icon: "bi-bank", color: "#B45309", tint: "rgba(180, 83, 9, 0.10)" },
  education: { label: "Education", icon: "bi-mortarboard", color: "#BE185D", tint: "rgba(190, 24, 93, 0.10)" },
};

/** Display order — the order HR reads them in, not the order the tables were joined. */
export const CATEGORY_ORDER: VaultDocumentCategory[] = [
  // The photo leads: it is the first thing onboarding collects, and the fastest
  // way to confirm you are looking at the right person's file.
  "photo",
  "identity",
  "onboarding",
  "education",
  "bank",
  "signature",
];

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg", "avif"];

/**
 * What kind of file is behind this URL?
 *
 * Stored paths carry no MIME type, so the extension is all there is. Query strings
 * are stripped first — S3 links routinely arrive with one, and a path ending
 * `.pdf?X-Amz-...` would otherwise read as an unknown type and lose its preview.
 */
export const getFileKind = (path: string): "image" | "pdf" | "other" => {
  const clean = String(path || "").split("?")[0].split("#")[0].toLowerCase();
  const extension = clean.slice(clean.lastIndexOf(".") + 1);
  if (IMAGE_EXTENSIONS.includes(extension)) return "image";
  if (extension === "pdf") return "pdf";
  return "other";
};

/** Filename for a download, falling back to the document's own title. */
export const resolveFileName = (fileName: string | null, title: string, path: string) => {
  if (fileName) return fileName;
  const clean = String(path || "").split("?")[0];
  const last = clean.slice(clean.lastIndexOf("/") + 1);
  return last || title;
};
