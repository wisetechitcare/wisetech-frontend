/**
 * One policy for what may be uploaded as a document, and one place to change it.
 *
 * ─── WHY THE CLIENT CHECKS AT ALL ────────────────────────────────────────────
 * This is a COURTESY check, not a security boundary. It exists so the user is told
 * "too large" instantly instead of after a 12MB upload crawls to the server and comes
 * back rejected. It is trivially bypassed — devtools, a direct POST — so nothing here
 * is load-bearing.
 *
 * The real enforcement is server-side and stronger than anything a browser can do:
 * `middlewares/multer.ts` caps the stream at the same 10MB (so an oversized body is
 * never buffered into memory), and `services/fileSafety.ts` sniffs the file's MAGIC
 * BYTES, requires the extension to agree with them, and scans for active content — a
 * `.exe` renamed to `.pdf` is caught there, never here.
 *
 * ─── WHY EXTENSION AND NOT MIME ──────────────────────────────────────────────
 * The browser's `File.type` is derived from the extension on most platforms and is
 * frequently empty (Windows has no mapping for some types, and drag-and-drop from an
 * archive often reports ""). Rejecting on it produces false negatives on perfectly
 * good files while catching nothing a renamed file wouldn't defeat anyway. Extension
 * + size is the honest client-side check; content is the server's job.
 */

/** Keep in sync with MAX_UPLOAD_BYTES in the backend's middlewares/multer.ts. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENT_LABEL = '10MB';

/** The document formats the product accepts. Drives the picker filter AND the check. */
export const DOCUMENT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'] as const;

/** For an `<input type="file" accept>` attribute. */
export const DOCUMENT_ACCEPT = DOCUMENT_EXTENSIONS.join(',');

/** The line shown under a picker. Derived, so it can never contradict the rule. */
export const DOCUMENT_HINT = `PDF, JPG or PNG — max ${MAX_DOCUMENT_LABEL}`;

/** Human-readable size, for telling someone exactly how far over they are. */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  // Whole numbers lose the decimal, so the limit reads as "10 MB" and matches the
  // hint rather than appearing as a stray "10.0 MB".
  return Number.isInteger(mb) ? `${mb} MB` : `${mb.toFixed(1)} MB`;
};

export interface FileValidationOptions {
  /** Allowed extensions, each with a leading dot. Defaults to the document set. */
  extensions?: readonly string[];
  /** Size ceiling in bytes. Defaults to the document limit. */
  maxBytes?: number;
}

/**
 * Validate a picked file. Returns an error message to show the user, or `null` when
 * the file is acceptable.
 *
 * A message rather than a boolean because every caller needs to say WHY — "invalid
 * file" is the kind of error that makes people try the same file three times.
 */
export const validateDocumentFile = (
  file: File,
  { extensions = DOCUMENT_EXTENSIONS, maxBytes = MAX_DOCUMENT_BYTES }: FileValidationOptions = {},
): string | null => {
  // A 0-byte file usually means a failed copy or a file still syncing from cloud
  // storage. It uploads "successfully" and is unopenable, so catch it here.
  if (file.size === 0) {
    return 'This file is empty. Please choose a different file.';
  }

  const allowed = extensions.map((ext) => ext.toLowerCase());
  const dot = file.name.lastIndexOf('.');
  const extension = dot > -1 ? file.name.slice(dot).toLowerCase() : '';

  if (!extension) {
    return `This file has no extension. Allowed types: ${allowed.join(', ')}.`;
  }
  if (!allowed.includes(extension)) {
    return `${extension.toUpperCase().slice(1)} files are not supported. Allowed types: ${allowed.join(', ')}.`;
  }

  if (file.size > maxBytes) {
    const actual = formatFileSize(file.size);
    const limit = formatFileSize(maxBytes);
    // Just over the line, both round to the same label, and "This file is 10.0 MB —
    // the limit is 10.0 MB" reads as a bug rather than an explanation.
    return actual === limit
      ? `This file is just over the ${limit} limit. Please upload a smaller file.`
      : `This file is ${actual} — the limit is ${limit}. Please upload a smaller file.`;
  }

  return null;
};
