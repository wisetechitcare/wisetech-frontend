import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND || "";
const base = (companyId: string) => `${API_BASE_URL}/api/lead-project-companies/client-companies/${companyId}/catalogues`;

/** Keep in sync with CATALOGUE_MAX_MB in the backend's utils/catalogueValidation.ts. */
export const CATALOGUE_MAX_MB = 100;

/** What the picker accepts: PDFs, plus JPG/PNG/WebP images. The server re-checks every file from its bytes. */
export const CATALOGUE_ACCEPT = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};
export const CATALOGUE_NAME_MAX = 120;

export interface CompanyCatalogue {
  id: string;
  /** The name the uploader gave it; shown on its card. */
  name: string;
  kind: "pdf" | "image";
  fileName: string;
  sizeBytes: number;
  originalBytes: number;
  pageCount: number;
  uploadedByName: string | null;
  createdAt: string;
  /** Short-lived link (12 hours) to open the file. */
  url: string;
  /** Same file, but the browser saves it as "<name>.<ext>" instead of opening it. */
  downloadUrl: string;
  /** Previews of the leading pages, in order (the hover carousel). Empty when none were generated. */
  previewUrls: string[];
  previewCount: number;
}

/** Keep in sync with MAX_PREVIEW_PAGES in the backend's handlers/companyCatalogues.ts. */
export const MAX_PREVIEW_PAGES = 6;
const previewTarget = (c: CompanyCatalogue) => Math.min(MAX_PREVIEW_PAGES, c.pageCount);
/** Image catalogues are their own preview; only PDFs have pages to draw. */
export const needsPreviews = (c: CompanyCatalogue) => c.kind === "pdf" && c.previewCount < previewTarget(c);

/** The name field's starting value: the file name without its extension. */
export const defaultCatalogueName = (file: File) => file.name.replace(/\.[^.]+$/, "").trim().slice(0, CATALOGUE_NAME_MAX);

export const getCompanyCatalogues = async (companyId: string) =>
  (await axios.get(base(companyId))).data.catalogues as CompanyCatalogue[];

export const uploadCompanyCatalogue = async (companyId: string, file: File, name: string, onProgress: (pct: number) => void) => {
  const form = new FormData();
  form.append("name", name); // before the file, so the server has it when the file part arrives
  form.append("file", file);
  const { data } = await axios.post(base(companyId), form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => e.total && onProgress((e.loaded / e.total) * 100),
  });
  return data.catalogue as CompanyCatalogue;
};

/** The stored PDF, fetched through the API (for drawing a missing preview). */
export const getCompanyCatalogueFile = async (companyId: string, id: string) =>
  (await axios.get(`${base(companyId)}/${id}/file`, { responseType: "blob" })).data as Blob;

const putPreview = async (companyId: string, id: string, page: number, image: Blob) => {
  const form = new FormData();
  form.append("file", image, `page-${page}.jpg`);
  const { data } = await axios.put(`${base(companyId)}/${id}/previews/${page}`, form, { headers: { "Content-Type": "multipart/form-data" } });
  return data.catalogue as CompanyCatalogue;
};

/**
 * Draw each page as a JPEG, 600px wide, and hand it to `onPage` in order. pdf.js is loaded only when this
 * runs. The server re-validates and re-encodes whatever this produces.
 */
export const renderPdfPages = async (pdf: Blob, pages: number[], onPage: (page: number, image: Blob) => Promise<void>) => {
  const [{ pdfjs }, worker] = await Promise.all([import("react-pdf"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")]);
  // Always set: react-pdf assigns its own placeholder ('pdf.worker.mjs') on import, which doesn't resolve under Vite.
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: await pdf.arrayBuffer(), isEvalSupported: false }).promise;
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    for (const n of pages) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: 600 / page.getViewport({ scale: 1 }).width });
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      const image = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
      if (!image) return;
      await onPage(n, image);
    }
  } finally {
    await doc.destroy();
  }
};

/**
 * Store the previews a catalogue is still missing, page by page in order (a failure stops the run, so there
 * is never a gap). `onSaved` gets the updated catalogue after every page, so earlier pages survive a later failure.
 */
export const generatePreviews = async (companyId: string, c: CompanyCatalogue, onSaved: (c: CompanyCatalogue) => void, pdf?: Blob) => {
  if (!needsPreviews(c)) return;
  const pages = Array.from({ length: previewTarget(c) - c.previewCount }, (_, i) => c.previewCount + i + 1);
  await renderPdfPages(pdf ?? (await getCompanyCatalogueFile(companyId, c.id)), pages, async (page, image) => {
    onSaved(await putPreview(companyId, c.id, page, image));
  });
};

export const renameCompanyCatalogue = async (companyId: string, id: string, name: string) =>
  (await axios.patch(`${base(companyId)}/${id}`, { name })).data.catalogue as CompanyCatalogue;

export const deleteCompanyCatalogue = async (companyId: string, id: string) => {
  await axios.delete(`${base(companyId)}/${id}`);
};

/** Courtesy check before upload (does the content match the extension?) — the server re-checks the bytes. */
export const isCatalogueFile = async (file: File) => {
  if (file.size === 0) return false;
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (/\.pdf$/i.test(file.name)) return ascii(0, 5) === "%PDF-";
  if (/\.jpe?g$/i.test(file.name)) return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (/\.png$/i.test(file.name)) return b[0] === 0x89 && ascii(1, 4) === "PNG";
  if (/\.webp$/i.test(file.name)) return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  return false;
};
