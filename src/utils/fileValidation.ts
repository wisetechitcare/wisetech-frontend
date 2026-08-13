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

/* ═══════════════════════════════════════════════════════════════════════════
   PROFILE PHOTO
   ═══════════════════════════════════════════════════════════════════════════ */

/** Formats the photo picker accepts. The hint below is derived from this list, so
 *  the dropzone can never advertise a type the validator then rejects — which is
 *  exactly what it used to do. */
export const PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;

/** MIME allowlist for the dropzone. Kept beside the extensions it mirrors. */
export const PHOTO_ACCEPT_MAP: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTO_LABEL = '5MB';

/** Derived, so the label always states what is actually accepted. */
export const PHOTO_HINT = `JPG · PNG · WEBP · Max ${MAX_PHOTO_LABEL}`;

/** A portrait below this is too soft to print on an ID card. */
const MIN_PHOTO_DIMENSION = 200;
/** Guard against a decompression bomb: a 20000×20000 PNG is a few KB zipped. */
const MAX_PHOTO_DIMENSION = 12000;

/** Magic bytes per accepted format. The browser's `File.type` is attacker-supplied
 *  and derived from the extension, so it proves nothing on its own. */
const IMAGE_SIGNATURES: Array<{ ext: string; test: (b: Uint8Array) => boolean }> = [
  { ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  {
    ext: 'webp',
    test: (b) =>
      String.fromCharCode(b[0], b[1], b[2], b[3]) === 'RIFF' &&
      String.fromCharCode(b[8], b[9], b[10], b[11]) === 'WEBP',
  },
];

const readHeader = (file: File, bytes = 16): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file.slice(0, bytes));
  });

export interface PhotoValidationResult {
  ok: boolean;
  /** Why it was rejected — written to be shown to the user verbatim. */
  reason?: string;
  /** Decoded dimensions, once the file is known to be a real image. */
  width?: number;
  height?: number;
}

/**
 * Validate a profile photo, thoroughly and BEFORE the form is saved.
 *
 * Four gates, cheapest first, each answering a different question:
 *   1. extension + size — is this even the right kind of file?
 *   2. magic bytes      — are the CONTENTS that kind of file? A `.png` holding a
 *                         script passes step 1 and dies here.
 *   3. decode           — will a browser actually render it? Catches truncated and
 *                         corrupt files that have a valid header but no usable body.
 *   4. dimensions       — too small to print, or large enough to be a decompression
 *                         bomb that would hang the canvas.
 *
 * This is still a courtesy check, not the security boundary — `services/fileSafety.ts`
 * re-sniffs every upload server-side and is the thing that actually enforces. The
 * point of doing it here is that the user finds out NOW, with a reason, rather than
 * at save time after filling in nineteen sections.
 */
export const validatePhotoFile = async (file: File): Promise<PhotoValidationResult> => {
  const basic = validateDocumentFile(file, {
    extensions: PHOTO_EXTENSIONS,
    maxBytes: MAX_PHOTO_BYTES,
  });
  if (basic) return { ok: false, reason: basic };

  let header: Uint8Array;
  try {
    header = await readHeader(file);
  } catch {
    return { ok: false, reason: 'This file could not be read. It may still be syncing or downloading.' };
  }

  const signature = IMAGE_SIGNATURES.find((s) => s.test(header));
  if (!signature) {
    return {
      ok: false,
      reason: 'This file is not a real image — its contents do not match a JPG, PNG or WEBP. Please upload the original photo.',
    };
  }

  const named = file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase();
  const namedAsJpeg = named === 'jpg' || named === 'jpeg';
  const matches = signature.ext === 'jpg' ? namedAsJpeg : signature.ext === named;
  if (!matches) {
    return {
      ok: false,
      reason: `This file is named .${named} but its contents are ${signature.ext.toUpperCase()}. Please upload the original photo.`,
    };
  }

  // Only a real decode proves the body is intact — a valid header is not enough.
  const url = URL.createObjectURL(file);
  try {
    const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('decode failed'));
      img.src = url;
    });

    if (size.width < MIN_PHOTO_DIMENSION || size.height < MIN_PHOTO_DIMENSION) {
      return {
        ok: false,
        reason: `This image is ${size.width}×${size.height}. Please upload one at least ${MIN_PHOTO_DIMENSION}×${MIN_PHOTO_DIMENSION} so it stays sharp on an ID card.`,
      };
    }
    if (size.width > MAX_PHOTO_DIMENSION || size.height > MAX_PHOTO_DIMENSION) {
      return {
        ok: false,
        reason: `This image is ${size.width}×${size.height}, which is too large to process. Please resize it first.`,
      };
    }

    return { ok: true, ...size };
  } catch {
    return { ok: false, reason: 'This image appears to be corrupted and could not be opened.' };
  } finally {
    URL.revokeObjectURL(url);
  }
};
