/**
 * How a payment plan's stages print their Sr No: prefix + separator + the stage's position
 * rendered in a style. "Stage" + " " + ARABIC → Stage 1, Stage 2; "STG" + "-" + ARABIC_PAD2
 * → STG-01; "" + "" + ROMAN_UPPER → I, II, III.
 *
 * The ONLY place a Sr No is rendered. The backend stores the rule (`stage_numbering_formats`)
 * and never a rendered label.
 */

export type StageNumberStyle =
  | "ARABIC"
  | "ARABIC_PAD2"
  | "ARABIC_PAD3"
  | "ALPHA_LOWER"
  | "ALPHA_UPPER"
  | "ROMAN_LOWER"
  | "ROMAN_UPPER";

export interface StageNumberingFormat {
  id: string;
  prefix: string;
  separator: string;
  style: StageNumberStyle;
  isDefault?: boolean;
}

/** Labelled by what they print, in the order the picker offers them. */
export const STAGE_NUMBER_STYLE_OPTIONS: { value: StageNumberStyle; label: string }[] = [
  { value: "ARABIC", label: "1, 2, 3" },
  { value: "ARABIC_PAD2", label: "01, 02, 03" },
  { value: "ARABIC_PAD3", label: "001, 002, 003" },
  { value: "ALPHA_LOWER", label: "a, b, c" },
  { value: "ALPHA_UPPER", label: "A, B, C" },
  { value: "ROMAN_LOWER", label: "i, ii, iii" },
  { value: "ROMAN_UPPER", label: "I, II, III" },
];

/** Mirrors the backend's allow-list (`schemas/stageNumberingFormat.ts`). */
export const STAGE_SEPARATOR_OPTIONS: { value: string; label: string }[] = [
  { value: " ", label: "Space" },
  { value: "-", label: "-" },
  { value: "/", label: "/" },
  { value: ".", label: "." },
  { value: "", label: "None" },
];

/** 1 → a, 26 → z, 27 → aa — spreadsheet columns, so a long plan never runs out. */
const alpha = (n: number): string => {
  let out = "";
  for (let k = n; k > 0; k = Math.floor((k - 1) / 26)) out = String.fromCharCode(97 + ((k - 1) % 26)) + out;
  return out;
};

const ROMAN: [number, string][] = [
  [1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"],
  [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"],
];
/** Roman has no numeral past 3999; a plan that long falls back to digits. */
const roman = (n: number): string => {
  if (n > 3999) return String(n);
  let out = "";
  let k = n;
  for (const [v, s] of ROMAN) for (; k >= v; k -= v) out += s;
  return out;
};

/** The number part alone, for a 1-based position. */
export const stageNumber = (position: number, style: StageNumberStyle): string => {
  switch (style) {
    case "ARABIC_PAD2": return String(position).padStart(2, "0");
    case "ARABIC_PAD3": return String(position).padStart(3, "0");
    case "ALPHA_LOWER": return alpha(position);
    case "ALPHA_UPPER": return alpha(position).toUpperCase();
    case "ROMAN_LOWER": return roman(position);
    case "ROMAN_UPPER": return roman(position).toUpperCase();
    default: return String(position);
  }
};

/**
 * The Sr No for the stage at 0-based `index`. No format at all (none configured, or the
 * list failed to load) prints the bare position, so numbering never blanks a stage.
 */
export const formatStageNo = (
  format: Pick<StageNumberingFormat, "prefix" | "separator" | "style"> | null | undefined,
  index: number,
): string => {
  if (!format) return String(index + 1);
  const number = stageNumber(index + 1, format.style);
  const prefix = format.prefix ?? "";
  return prefix ? `${prefix}${format.separator ?? ""}${number}` : number;
};

/** The format a plan prints with: its own choice if it still exists, else the default. */
export const resolveStageFormat = (
  formats: StageNumberingFormat[],
  planFormatId?: string | null,
): StageNumberingFormat | null =>
  (planFormatId && formats.find((f) => f.id === planFormatId)) || formats.find((f) => f.isDefault) || null;
