/**
 * Rasterise a live `<svg>` element to a PNG, client-side and dependency-free.
 *
 * Why an SVG source rather than a DOM screenshot: html2canvas-style libraries
 * re-implement the CSS box model and get shadows, gradients and clipping subtly
 * wrong. An SVG already IS the drawing, so `new Image(svg)` → `drawImage` → `toBlob`
 * reproduces it exactly, at whatever DPI the caller asks for. Same source renders
 * the on-screen preview, so what downloads is literally what was shown.
 *
 * Three rules the caller must honour for this to work:
 *   1. **No external stylesheet.** An SVG loaded as an image is an isolated document
 *      — page CSS does not reach it. Style with presentation attributes / inline
 *      `style`, which is also what the repo's `<style>`-block lint ban pushes you to.
 *   2. **No cross-origin `<image href>`.** A remote image taints the canvas and
 *      `toBlob()` throws a SecurityError. Embed pixels as `data:` URIs (the ID-card
 *      endpoint inlines the photo and logo server-side for exactly this reason).
 *   3. **An explicit `viewBox`.** It is the only reliable source for the intrinsic
 *      aspect ratio once the element is detached from the page.
 */

/** Print-grade by default: a 1000px-wide card comes out 3000px, ~300 DPI at 10cm. */
const DEFAULT_SCALE = 3;

const parseViewBox = (svg: SVGSVGElement): { width: number; height: number } => {
  const raw = svg.getAttribute('viewBox');
  const parts = raw?.split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n));
  if (parts && parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
    return { width: parts[2], height: parts[3] };
  }
  // Fall back to the laid-out size — correct for an SVG that is on screen, and the
  // only thing left to try for one that is not.
  const box = svg.getBoundingClientRect();
  return { width: box.width || 1000, height: box.height || 630 };
};

/**
 * Serialise an `<svg>` element to standalone SVG markup.
 *
 * Namespaces are re-asserted because `XMLSerializer` only emits them when they are
 * present on the node, and React does not always set `xmlns` — without it the
 * browser refuses to decode the result as an image.
 */
export const serializeSvg = (svg: SVGSVGElement): string => {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const { width, height } = parseViewBox(svg);

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  // Intrinsic size, so the image decodes at a known resolution instead of
  // whatever the browser guesses for a `width="100%"` SVG.
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The card could not be rendered to an image.'));
    img.src = src;
  });

export interface SvgToPngOptions {
  /** Output pixels per SVG unit. 3 ≈ 300 DPI for a credit-card-sized artwork. */
  scale?: number;
  /** Painted behind the artwork — PNG is transparent otherwise, which prints badly. */
  background?: string | null;
}

/** Rasterise to a PNG blob. Rejects rather than resolving null so callers surface a real error. */
export const svgToPngBlob = async (
  svg: SVGSVGElement,
  { scale = DEFAULT_SCALE, background = '#FFFFFF' }: SvgToPngOptions = {},
): Promise<Blob> => {
  const { width, height } = parseViewBox(svg);
  const markup = serializeSvg(svg);

  // A data: URI (not an object URL) keeps the image same-origin, so the canvas the
  // SVG is drawn onto stays untainted and `toBlob` is allowed to read it back.
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  const image = await loadImage(source);

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('The card could not be rendered to an image.');

  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The card could not be rendered to an image.'))),
      'image/png',
    );
  });
};

/** Hand a blob to the browser as a download. Revokes the object URL once the click is dispatched. */
export const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Deferred: revoking synchronously can cancel the download in Safari.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

/** Turn arbitrary text into a filesystem-safe file-name stem. */
export const toFileNameStem = (value: string, fallback = 'download'): string => {
  const clean = value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return clean || fallback;
};
