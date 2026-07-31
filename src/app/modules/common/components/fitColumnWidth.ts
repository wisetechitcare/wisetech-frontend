export const MIN_COLUMN_WIDTH = 110;
export const MAX_COLUMN_WIDTH = 420;

/** Horizontal cell padding (16px each side). */
const CELL_PADDING = 32;
/** Sort arrow + hover action icons that sit beside a header label. */
const HEADER_ICONS = 44;
/** Body text. 14px because ~14 legacy pages override the shared 13px upward — measure the larger. */
const BODY_FONT = '400 14px Inter, system-ui, -apple-system, sans-serif';
/** Header text: 12px, 600, uppercase. */
const HEADER_FONT = '600 12px Inter, system-ui, -apple-system, sans-serif';
/** measureText ignores letter-spacing; headers set 0.03em. */
const HEADER_TRACKING = 12 * 0.03;

let ctx: CanvasRenderingContext2D | null | undefined;

/** Real rendered width of `s`. Falls back to a character estimate outside the browser. */
const textWidth = (s: string, font: string): number => {
  if (ctx === undefined) {
    ctx =
      typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d");
  }
  if (!ctx) return s.length * 7.8;
  ctx.font = font;
  return ctx.measureText(s).width;
};

/**
 * Width a MaterialTable column needs to show its data on ONE line, header as the floor.
 * A flat 150px default clipped real values ("Shashi Prabhu and Associates"), and a
 * per-character estimate came up a few pixels short and wrapped emails onto a second line —
 * so the text is measured for real.
 *
 * ponytail: samples the first 300 rows and reads the raw accessor value, so a column whose
 * custom Cell renders extra chrome (avatar, secondary line, chips) can still come up short.
 * Body cells wrap rather than clip, which is the safety net for those.
 */
export const fitColumnWidth = (col: any, data: any[]): number => {
  const key = col.accessorKey ?? col.id;
  let widest = 0;
  if (key && Array.isArray(data)) {
    for (let i = 0; i < Math.min(data.length, 300); i++) {
      const v = String(key)
        .split(".")
        .reduce((o: any, k: string) => o?.[k], data[i]);
      if (v == null || typeof v === "object" || typeof v === "boolean") continue;
      const s = String(v);
      // Avatar/attachment URLs are never rendered as text — sizing to them blows the column out.
      if (s.length > 60 || /^(https?:|data:|\/\/)/.test(s)) continue;
      const w = textWidth(s, BODY_FONT);
      if (w > widest) widest = w;
    }
  }

  const header = String(col.header ?? "");
  const headerWidth =
    textWidth(header, HEADER_FONT) + header.length * HEADER_TRACKING + HEADER_ICONS + CELL_PADDING;
  // +4px so sub-pixel rounding in the grid layout can't shave the last glyph onto a new line.
  const dataWidth = widest + CELL_PADDING + 4;

  return Math.min(
    MAX_COLUMN_WIDTH,
    Math.max(MIN_COLUMN_WIDTH, Math.ceil(Math.max(dataWidth, headerWidth))),
  );
};
