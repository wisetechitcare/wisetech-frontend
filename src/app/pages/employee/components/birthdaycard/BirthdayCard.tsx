import { forwardRef, useId, useMemo } from "react";
import type { BirthdayCardPayload } from "@services/employee";
import { GREETING } from "./greeting";
import { BALLOONS } from "./balloons";

/**
 * The birthday card, drawn as a single SVG in one of two shapes.
 *
 * Navy and gold, modelled on the approved reference. One column, read top to bottom:
 * the greeting, the date, the portrait in a gilt ring, the name, the role on a gold
 * ribbon, the message, and a sign-off that ends in the organisation's own mark. Balloon
 * clusters flank the portrait and gold confetti falls behind everything.
 *
 * **The mark closes the card rather than opening it.** The reference put it at the head
 * and named the organisation in type at the foot; this sets the greeting at the head and
 * finishes the sentence "With warm wishes from" with the logo itself. One consequence
 * worth knowing before moving anything: the mark is a STACKED lockup and can only be
 * made wider by being made taller, so it now competes for height with the message and
 * the frame instead of with nothing. That is what sizes the whole column above it, and
 * it is why the cake ornament that used to close the card is gone — the two wanted the
 * same 170 units and only one of them says who sent it.
 *
 * The balloons and the greeting are the two things NOT drawn as shapes. The bunches are
 * the supplied studio artwork (`balloons.ts`) and the greeting is calligraphy converted
 * to outlines (`greeting.ts`). Both were vector first, and both were wrong that way: six
 * shaded ellipses do not read as glass and foil, and a script face cannot be a `<text>`
 * on a card that has to survive being rasterised with no fonts available.
 *
 * **Both shapes are centred.** The reference is a centred composition and that is the
 * spec, so the 16:9 card is the same drawing on a wider stage rather than a different
 * layout. Only the geometry table below differs between them, so a change to the artwork
 * cannot land in one shape and miss the other.
 *
 * **No age.** The card prints a name and a face and nothing else about the person. An
 * age is unwelcome on something sent to a client and awkward on something put on a wall
 * at work, so it is carried neither here nor in the share caption — the date of birth
 * decides only THAT it is someone's birthday, never what to say about it.
 *
 * **Why SVG and not a styled `<div>`:** the element on screen IS the source the PNG is
 * rasterised from (`utils/svgExport`), exactly as on the ID card. One drawing, so the
 * download cannot drift from the preview, and it stays sharp at any export scale. That
 * makes the card self-contained by necessity: presentation attributes only (page CSS
 * does not reach an SVG loaded as an image) and `data:` URIs for the photo and logo (a
 * cross-origin image taints the export canvas — which is why the endpoint inlines both
 * server-side).
 */

export type BirthdayCardOrientation = "landscape" | "portrait";

/* ── Palette ──────────────────────────────────────────────────────────────────
   The reference's two families and nothing else: the navies the card is printed on
   and the golds every celebratory mark is made of. A third hue is what turns
   navy-and-gold into a party-supply aisle. */
const INK = {
  navyDeep: "#040A1A",
  navy: "#0A1838",
  navyMid: "#12275E",
  navyLift: "#183472",
  gold: "#D9A93B",
  goldLight: "#F3D882",
  goldPale: "#FFF4D6",
  goldDeep: "#7E5F14",
  white: "#FFFFFF",
  muted: "rgba(255,255,255,0.80)",
};

const FONT = "Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/* ── Geometry ─────────────────────────────────────────────────────────────────
   Everything the two shapes disagree about, in one table. Both are centred, so the
   text column is always the middle of the card. */
interface Layout {
  w: number;
  h: number;
  /**
   * The brand mark's box — in the SIGN-OFF at the foot of the card, not at its head.
   *
   * "With warm wishes from" used to be followed by the organisation's name set as
   * type; it is followed by the mark itself now, which is the same sentence finished
   * with the logo instead of a spelling of it. The head of the card carries the
   * greeting in its place.
   *
   * This is the one slot on the card whose height is a real constraint rather than a
   * preference: the mark is a STACKED lockup, so it can only be made wider by being
   * made taller, and it is competing with the message and the frame for the last
   * 200 units of the card. See the note on `fitLogoRect` for what happens when the
   * file is too small to fill it.
   */
  logoSlot: { cy: number; maxW: number; maxH: number };
  photo: { cy: number; r: number };
  /** Baseline of the calligraphic greeting — now the first thing on the card. */
  eyebrowY: number;
  /**
   * How wide the greeting is drawn. It is a PATH, not text, so this is the real width
   * rather than an estimate — which is also what the flanking rules and sparkles measure
   * off, instead of the character-count guess a letter-spaced `<text>` needed.
   *
   * A script face is much taller than the caps it replaced: `GREETING.ascent` and
   * `.descent` are 0.130 and 0.051 of the width, so the greeting stands 0.181 × this
   * tall — and 0.130 of it sits ABOVE the baseline. That ascent is the number the head
   * of the card is laid out against now that the greeting leads it: it has to clear the
   * bunting's lowest pennant, which is what caps the width in both shapes.
   */
  eyebrowWidth: number;
  /**
   * The date the card is for, under the greeting.
   *
   * Set here rather than at the foot because the foot is spoken for — the sign-off now
   * ends in the mark — and because a date under a greeting reads as the occasion, while
   * a date under a signature reads as paperwork.
   */
  dateY: number;
  dateSize: number;
  /**
   * The band the name is CENTRED in, not a baseline it hangs from.
   *
   * This used to be a single `nameBaselineY` with the block growing upward, which kept
   * everything below it still when a name wrapped. It also meant a one-line name — most
   * of them — sat at the bottom of its space with a visible hole above it, between the
   * greeting and the words. Centring in a fixed band closes that hole and still keeps
   * the ribbon below fixed, because the band is sized for the two-line case and a
   * one-line name simply floats in the middle of it.
   */
  nameBand: { top: number; bottom: number };
  nameSize: number;
  nameMaxWidth: number;
  /** The gold ribbon carrying the role. */
  ribbon: { cy: number; h: number; pad: number; textSize: number };
  /**
   * The message under the ribbon: baseline of its FIRST line, and the box it wraps in.
   *
   * Both shapes set it as two lines. 16:9 has the width for one, but a single line long
   * enough to be worth reading runs straight through the inner balloon bunches, so it
   * uses the same two-line block held to a narrower column.
   */
  paragraph: { y: number; size: number; lead: number; maxWidth: number };
  /**
   * Baseline of "With warm wishes from". The mark sits centred underneath it.
   *
   * 16:9 set the two side by side for a while, to buy the mark height a short card does
   * not have. It bought about 30 units and cost the composition its centre line: the
   * phrase is muted grey and the mark is a bright block, so a pair centred as a BOX
   * reads as off-centre to the eye, which never weighs them equally. The height came out
   * of the portrait ring instead, where 6 units of radius are not missed.
   */
  wishY: number;
  wishSize: number;
  /**
   * Baseline of the organisation's NAME — the fallback for an organisation with no mark
   * on file, in both shapes. Sits where the mark would have.
   */
  orgY: number;
  orgSize: number;
  frameInset: number;
  /**
   * The bunting swagged across the head of the card.
   *
   * `dip` is the quadratic's CONTROL point, not the curve's low point — a quadratic only
   * reaches a quarter of the way to its control, so the string actually bottoms out at
   * `(2 * edgeY + 2 * dip) / 4`. Setting the control as if it were the low point is how
   * the first cut hung the pennants through the portrait.
   *
   * `spans` is how many swags there are and where each is tied off, in absolute x. 16:9
   * hangs TWO with a short break at the centre, because a single swag stretched over 1860
   * units is too shallow to read as hanging at all — it flattens into a line with
   * triangles on it. 4:5 hangs ONE straight across: it broke into two only to clear the
   * brand mark that used to sit up here, and with the greeting there instead — which
   * starts below the lowest pennant — the break was a gap over nothing.
   *
   * Pennant count is derived from `pitch` rather than given, so spans of different
   * lengths keep the SAME spacing. A per-span count is how the two 16:9 swags would
   * drift apart the first time one of them was resized.
   */
  bunting: { spans: [number, number][]; dip: number; pitch: number; size: number };
  /**
   * Balloon bunches, as [cx, bottom, width, mirrored].
   *
   * `cx, bottom` is where the artwork SITS — its bottom-centre — and the height follows
   * from the width and the crop's aspect.
   *
   * `tilt` leans the bunch OUTWARD about that same bottom-centre, and it is what lets the
   * bunches be big without crowding the name. A bunch stands 1.49x as tall as it is wide,
   * so its top is the part that reaches the middle of the card; leaning it out swings that
   * top away while the base stays in the corner. 14 degrees moves the 4:5 bunch's inner
   * top corner from x 333 to x 209 — the difference between a balloon behind the name and
   * one beside it. The outer side then runs off the card edge, which is where the artwork
   * is cropped anyway.
   *
   * The rotation is applied INSIDE the mirror, so one value leans both sides outward.
   */
  clusters: [number, number, number, boolean, number][];
  /**
   * Wrapped gifts, as [cx, bottom, width, mirrored] — 16:9 only.
   *
   * The wide card used to carry FOUR balloon bunches, and the inner pair was the same
   * crop as the outer pair at a smaller size. Two copies of one photograph a few hundred
   * units apart is what made the flanks read as repeated wallpaper rather than as a
   * scene. Gifts fill the same slots with a different object.
   *
   * Drawn rather than photographed, in the same gilt and navy as the cake and the ribbon.
   * That is a deliberate mismatch with the balloons: a second photographic prop would
   * have to match the bunches' lighting and lens or look pasted on, whereas the card
   * already carries drawn ornament and one more sits inside a convention that exists.
   */
  gifts: [number, number, number, boolean][];
}

const LAYOUTS: Record<BirthdayCardOrientation, Layout> = {
  /** 16:9 for the office TV — the same centred composition on a wider stage. */
  landscape: {
    w: 1920,
    h: 1080,
    // The mark's slot, at the FOOT now. 92 tall draws the 1147 x 673 lockup at 157 x 92
    // — small, and that is the shape's honest ceiling rather than a choice: between the
    // message's second line at 940 and the frame at 1050 there are 110 units, and a
    // stacked lockup can only get wider by getting taller. A horizontal lockup would
    // read at four times the width in the same band; see the note on `fitLogoRect`.
    logoSlot: { cy: 988, maxW: 320, maxH: 100 },
    // Everything above the name moved UP, because the greeting came up to the head of
    // the card and the mark went down to the foot. The portrait lost 12 of radius to
    // pay for the greeting's own band: a script face stands 0.181 x its width tall,
    // which is a great deal more than the 140-unit plate that used to be up here.
    photo: { cy: 471, r: 116 },
    eyebrowY: 251,
    eyebrowWidth: 500,
    dateY: 311,
    dateSize: 22,
    nameBand: { top: 629, bottom: 741 },
    nameSize: 78,
    nameMaxWidth: 1060,
    ribbon: { cy: 778, h: 48, pad: 34, textSize: 30 },
    // ONE line of message on 16:9? No — TWO, and narrower than the card could carry.
    // A single 1860-wide line would run straight through the inner balloon bunches,
    // which start at x 300. 776 keeps it inside 745..1175, clear of both.
    paragraph: { y: 836, size: 22, lead: 30, maxWidth: 776 },
    // The CENTRE of the sign-off line, not a baseline — the phrase and the mark are
    // centred on it together.
    wishY: 916,
    wishSize: 26,
    orgY: 968,
    orgSize: 28,
    frameInset: 30,
    // Two swags with a short break at the centre. The break used to clear the brand mark
    // that hung there; nothing hangs there now, but a single swag stretched over 1860
    // units is too shallow to read as hanging at all — it flattens into a line with
    // triangles on it. Low point 140, pennants to 186, and the greeting's own band
    // starts at 199.
    bunting: { spans: [[30, 930], [990, 1890]], dip: 190, pitch: 68, size: 42 },
    // Four bunches: a tall one in each corner and a shorter one set inward, so the
    // flanks of a 1920-wide card are furnished rather than merely edged. All four sit
    // ON the bottom edge, which is where the artwork's ribbons run out of frame — a
    // bunch floating above the edge shows the cut ends of its own ribbons.
    //
    // The inner pair is mirrored the opposite way to its neighbour, so a side reads as
    // two different bunches rather than one bunch printed twice.
    clusters: [
      [250, 1092, 430, false, -12],
      [1670, 1092, 430, true, -12],
    ],
    // Tucked under the inner shoulder of each bunch. Standing ON the frame at 1046 rather
    // than running off the card edge the way the bunches do: the balloons are a photograph
    // and read as cropped, but a drawn box sliced by a rule just looks unfinished.
    // 265 wide stands 181 tall, so the pile spans x 337..602 — the message beside it never
    // reaches further left than 745.
    gifts: [[470, 1046, 265, false], [1450, 1046, 265, true]],
  },
  /** 4:5 for sending — a phone reads top to bottom, so the stack is the whole design. */
  portrait: {
    w: 1080,
    h: 1350,
    // 168 tall draws the lockup at 287 x 168 — nearly twice the height 16:9 can spare,
    // which is the whole argument for reading the two shapes as different cards below
    // the message rather than one card stretched.
    logoSlot: { cy: 1222, maxW: 330, maxH: 156 },
    photo: { cy: 582, r: 180 },
    // The greeting leads now. Its band is 296 - 0.130 x 520 = 228 at the top, which
    // clears the bunting's lowest pennant at 192; the flanking rules and sparkles sit
    // at y 268, below the swag entirely, so they can run their full ±442 without
    // meeting it. That is why 4:5 hangs ONE swag again — with nothing at the head of
    // the card to break around, two swags left a gap over nothing.
    eyebrowY: 288,
    eyebrowWidth: 515,
    dateY: 358,
    dateSize: 26,
    nameBand: { top: 806, bottom: 930 },
    nameSize: 86,
    nameMaxWidth: 760,
    ribbon: { cy: 970, h: 54, pad: 30, textSize: 30 },
    // 484 wide, not the 760 the name gets: everything below y 963 has a balloon bunch
    // either side of it (x 26..286 and 794..1054), and the message is the only block
    // down there long enough to reach them.
    paragraph: { y: 1038, size: 24, lead: 32, maxWidth: 484 },
    wishY: 1116,
    wishSize: 26,
    orgY: 1176,
    orgSize: 32,
    frameInset: 26,
    bunting: { spans: [[26, 1054]], dip: 258, pitch: 60, size: 42 },
    // Big AND clear of the name, which the tilt is what makes possible — see `clusters`
    // on the Layout. 330 wide leaning 14 degrees out puts the bunch's inner top corner at
    // x 209 against a name that starts at 216, where the same bunch standing upright
    // would have reached 333 and put a balloon behind the first two letters.
    clusters: [[168, 1362, 330, false, -14], [912, 1362, 330, true, -14]],
    // None on 4:5: the bunches already meet the ribbon and there is no slot left that a
    // gift would not be squeezed into.
    gifts: [],
  },
};

/* ── Text fitting ─────────────────────────────────────────────────────────────
   SVG has no automatic line breaking. Widths are estimated at 0.58em per character,
   measured against bold Inter/Segoe and rounded up — over-estimating leaves a little
   air, under-estimating runs a name off the edge. */
const CHAR_EM = 0.58;

const widthOf = (text: string, size: number) => text.length * size * CHAR_EM;

/** Split into two balanced lines — a long first line with an orphan reads as a mistake. */
const splitTwo = (text: string): string[] => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return [text.trim()];
  const target = Math.ceil(text.trim().length / 2);
  let first = words[0];
  let i = 1;
  while (i < words.length - 1 && `${first} ${words[i]}`.length <= target) {
    first = `${first} ${words[i]}`;
    i += 1;
  }
  return [first, words.slice(i).join(" ")];
};

/**
 * One line if it fits, two if it must, shrinking until the widest line is inside `maxWidth`.
 *
 * A name that WRAPS also drops to 78% before any width fitting starts. That is a height
 * decision, not a width one: the name is centred in a fixed band now, and two lines at
 * full size stand 158 tall against a band of 124 — it would grow straight through the
 * greeting above and the ribbon below. 62% is the largest that fits both shapes' bands
 * once a text box's REAL height is counted: a box runs from 1.05em above the baseline to
 * 0.27em below it, not the 0.72em cap the block is centred on.
 */
const WRAPPED_SCALE = 0.62;

/**
 * Line spacing, as a multiple of the fitted size.
 *
 * A multiple rather than a number of units, because a wrapped name is set SMALLER than
 * the table's size and fixed leading then leaves a gash between two short lines. 1.3 is
 * also the floor that keeps the two lines' boxes apart: a text box stands about 1.2em
 * tall once the ascenders and descenders are counted, so leading below that overlaps
 * even when the glyphs visibly do not.
 */
const NAME_LEAD = 1.45;

const fitLines = (text: string, maxWidth: number, startSize: number): { lines: string[]; size: number } => {
  const clean = text.trim() || "—";
  if (widthOf(clean, startSize) <= maxWidth) return { lines: [clean], size: startSize };

  const lines = splitTwo(clean);
  let size = Math.round(startSize * WRAPPED_SCALE);
  // Floor at 46% rather than looping to nothing: past that the name is smaller than the
  // line under it and the hierarchy inverts. A name long enough to hit the floor is
  // already an outlier, and slight overhang beats illegible.
  const min = startSize * 0.46;
  while (size > min && Math.max(...lines.map((l) => widthOf(l, size))) > maxWidth) size -= 2;
  return { lines, size };
};

/**
 * The message under the ribbon.
 *
 * Fixed, and deliberately says nothing about work. The same card goes to employees and to
 * CLIENT CONTACTS — the endpoint serves both kinds — so anything about the team or the
 * office is wrong for half of them. It carries no name either: the name is already set
 * three times its size directly above it.
 *
 * Not on the payload because nothing sends one. When a per-person or per-organisation
 * message is actually wanted, it belongs on `BirthdayCardPayload` with this as the
 * fallback, not as a prop threaded through from the dialog.
 */
const MESSAGE = "Wishing you good health, happiness and a year full of success.";

const initialsOf = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
};

/**
 * How much bigger than the circle the photo is drawn — i.e. how hard it is cropped.
 *
 * ponytail: a fixed zoom, not face detection. Onboarding photos are ID-style headshots
 * with a lot of room above the head, and 1.22 pulls that back without reaching the face.
 * The box stays anchored to the TOP of the circle, so the extra crop always comes off the
 * bottom (torso) and never the forehead. Raise it if photos still read as landscapes; the
 * real fix is a face-aware crop at upload time, not here.
 */
const PHOTO_ZOOM = 1.0;

/**
 * The date the card is FOR, as `DD.MM.YYYY`.
 *
 * Deliberately not `utils/dateFormats` and its house `YYYY.MM.DD`: that standard exists
 * so a date a person has to READ — in a field, a table, an export — is unambiguous
 * everywhere in the product. This is not one of those. It is a line of artwork on a
 * greeting card, and it is set the way the card was asked for.
 *
 * The day and month come from the date of birth; **the year is always the current one**.
 * Printing the year on file would print the age, and the card does not carry an age
 * anywhere — see the note at the top. A person with no date of birth on file (the
 * generic contact card) gets today's date, which is the only honest thing left to say.
 *
 * Parsed off the string rather than through `new Date('YYYY-MM-DD')`: that constructor
 * reads a bare date as UTC and then renders it local, which moves the 1st to the 31st
 * for everyone west of Greenwich.
 */
const cardDate = (dateOfBirth: string | null): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dob = dateOfBirth?.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return dob
    ? `${dob[2]}.${dob[1]}.${now.getFullYear()}`
    : `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
};

/** Trim a string that would otherwise run past its box. */
const truncate = (text: string, maxChars: number) =>
  text.length > maxChars ? `${text.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…` : text;

/**
 * What the DIALOG rasterises this card at — 2× for portrait, 1× for landscape. The card
 * is drawn in user units, so a bitmap inside it needs `EXPORT_SCALE` source pixels per
 * unit to stay sharp in the download, which is what caps the mark's size below.
 *
 * Not `svgExport`'s own default of 3: that is the ID card's scale, and this card
 * overrides it (see `BirthdayCardDialog`). Sized for 3 here, the cap shrank every small
 * mark by a third to buy resolution nothing ever asked for — a 400px lockup drew at 133
 * units instead of 200. Track the larger of the two shapes; the 1× landscape export then
 * has pixels to spare.
 */
const EXPORT_SCALE = 2;

/**
 * The mark's drawn rect: scaled to fit the slot and centred on `cx`.
 *
 * Computed rather than left to `preserveAspectRatio` for the reason the ID card
 * documents: a logo that is itself an SVG honours its OWN aspect rule over the
 * `<image>` element's, so two marks in different formats would sit differently in the
 * same slot. Sizing the box to the mark's own ratio leaves no spare space for either
 * rule to distribute. Falls back to the whole slot when the header was unreadable.
 *
 */
const fitLogoRect = (cx: number, slot: Layout["logoSlot"], w: number | null, h: number | null) => {
  const fallback = { x: cx - slot.maxW / 2, y: slot.cy - slot.maxH / 2, width: slot.maxW, height: slot.maxH };
  if (!w || !h || w <= 0 || h <= 0) return fallback;
  // Fill the slot -- but never past what the file's own pixels can pay for.
  //
  // The mark is a BITMAP an organisation uploaded. A 1147px-wide lockup carries a
  // 287-unit slot at export resolution; a 400px one does not, and stretching it there is
  // exactly the soft, choppy mark that showed up on screen. So the scale is capped at
  // native and the mark simply sits smaller when the file is small. A blurry logo is a
  // bigger blemish than a modest one, and the only real fix for a small file is a bigger
  // file.
  const scale = Math.min(slot.maxW / w, slot.maxH / h, 1 / EXPORT_SCALE);
  const width = w * scale;
  const height = h * scale;
  return { x: cx - width / 2, y: slot.cy - height / 2, width, height };
};

/* ── Balloons ─────────────────────────────────────────────────────────────────
   The supplied studio artwork, drawn once per corner. See `balloons.ts` for the crop
   and why the pixels are inlined rather than imported.

   These used to be drawn — six shaded ellipses on strings, in five finishes. They were
   honest vector balloons and they read as vector balloons: flat next to the glassy,
   confetti-filled, chrome-and-foil bunch the artwork actually is. A raster costs 188 KB
   inline and cannot be recoloured, and both are worth it here.

   Anchored BOTTOM-CENTRE, not at a knot. A drawn cluster had one point every string tied
   off at; a photographed bunch has ribbons trailing loose out of the bottom of its own
   frame, so the meaningful anchor is where the artwork sits on the card. */

const BalloonCluster = ({
  cx,
  bottom,
  width,
  mirrored,
  tilt,
}: { cx: number; bottom: number; width: number; mirrored: boolean; tilt: number }) => {
  const height = (width * BALLOONS.height) / BALLOONS.width;
  return (
    <image
      href={BALLOONS.href}
      x={cx - width / 2}
      y={bottom - height}
      width={width}
      height={height}
      preserveAspectRatio="xMidYMid meet"
      // Mirrored about the bunch's own centre line, so `cx` means the same thing on
      // both sides and the two corners are the same bunch seen the other way round —
      // and the lean is applied INSIDE that mirror, so the one tilt value leans the
      // left bunch left and the right bunch right.
      transform={`${mirrored ? `translate(${2 * cx} 0) scale(-1 1) ` : ""}rotate(${tilt} ${cx} ${bottom})`}
      data-decor="balloons"
    />
  );
};

/**
 * One wrapped gift, anchored bottom-centre on a grid 108 wide and 124 tall.
 *
 * Built the way a real one is: body, lid, ribbon crossing both, bow on top. The ribbon is
 * navy on gold rather than gold on navy — the card's ground is navy, so a gold box with
 * dark bands keeps the silhouette readable against it, where the reverse would dissolve.
 */
const Gift = ({ scale, tilt, ids }: { scale: number; tilt: number; ids: Record<string, string> }) => (
  <g transform={`rotate(${tilt}) scale(${scale})`}>
    <rect x="-48" y="-66" width="96" height="66" rx="4" fill={`url(#${ids.gRibbon})`} />
    {/* Bands, drawn across the body and the lid so the ribbon reads as one length that
        was tied round the box rather than as stripes painted on it. */}
    <rect x="-48" y="-43" width="96" height="13" fill={INK.navyMid} opacity="0.9" />
    <rect x="-9" y="-66" width="18" height="66" fill={INK.navyMid} opacity="0.9" />
    <rect x="-54" y="-85" width="108" height="20" rx="3" fill={`url(#${ids.gRibbon})`} />
    <rect x="-9" y="-85" width="18" height="20" fill={INK.navyMid} opacity="0.9" />
    {/* Bow: two loops springing from the knot, each with a gold rim so they read as
        separate volumes instead of one blob. */}
    <path
      d="M0 -85C-30 -97 -43 -122 -20 -125-6 -126-3 -105 0 -85Z"
      fill={`url(#${ids.gRibbon})`}
      stroke={INK.goldDeep}
      strokeWidth="1.4"
    />
    <path
      d="M0 -85C30 -97 43 -122 20 -125 6 -126 3 -105 0 -85Z"
      fill={`url(#${ids.gRibbon})`}
      stroke={INK.goldDeep}
      strokeWidth="1.4"
    />
    <ellipse cx="0" cy="-87" rx="8" ry="7" fill={INK.goldPale} />
  </g>
);

/**
 * A pile of two, on a grid 190 wide — a smaller box leaning one way behind a larger one
 * leaning the other. A single gift centred in the slot reads as a clip-art icon; two at
 * different sizes and angles read as presents someone put down.
 */
const GiftPile = ({
  cx,
  bottom,
  width,
  mirrored,
  ids,
}: { cx: number; bottom: number; width: number; mirrored: boolean; ids: Record<string, string> }) => {
  const s = width / 190;
  return (
    <g transform={`translate(${cx} ${bottom}) scale(${mirrored ? -s : s} ${s})`}>
      <g transform="translate(-52 0)">
        <Gift scale={0.72} tilt={-7} ids={ids} />
      </g>
      <g transform="translate(46 0)">
        <Gift scale={1} tilt={5} ids={ids} />
      </g>
    </g>
  );
};

/* ── Ornaments ────────────────────────────────────────────────────────────────── */

/**
 * The bunting swagged across the head of the card, tied off at the gold frame.
 *
 * Pennants hang VERTICALLY, not square to the string. That is what gravity does, and it
 * is also what makes one component serve a swag of any depth — a rotated pennant has to
 * be told the tangent at its own point, a hanging one only needs the point.
 *
 * They are spaced at `(i + 0.5) / count` rather than `i / count`, so no pennant is
 * stapled to the frame at either end and the two sides stay symmetric.
 *
 * Alternating gilt and navy, and nothing else — the same two families the rest of the
 * card is made of. Every pennant is outlined in gold so the navy ones do not read as
 * holes in the string when they sit against the navy ground.
 */
const Bunting = ({
  x0,
  x1,
  edgeY,
  dip,
  pitch,
  size,
  ids,
}: {
  x0: number;
  x1: number;
  edgeY: number;
  dip: number;
  pitch: number;
  size: number;
  ids: Record<string, string>;
}) => {
  const cxCtl = (x0 + x1) / 2;
  const count = Math.max(2, Math.round((x1 - x0) / pitch));
  const at = (t: number) => ({
    x: (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cxCtl + t ** 2 * x1,
    y: (1 - t) ** 2 * edgeY + 2 * (1 - t) * t * dip + t ** 2 * edgeY,
  });

  return (
    <g>
      <path
        d={`M${x0} ${edgeY}Q${cxCtl} ${dip} ${x1} ${edgeY}`}
        fill="none"
        stroke={INK.gold}
        strokeOpacity="0.8"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {Array.from({ length: count }, (_, i) => {
        const { x, y } = at((i + 0.5) / count);
        const half = size * 0.4;
        return (
          <path
            key={i}
            d={`M${x - half} ${y}L${x + half} ${y}L${x} ${y + size}Z`}
            // navyDEEP for the alternate, not navyMid: navyMid is literally the colour
            // the background gradient is passing through up here, so those pennants came
            // out invisible and the swag read as gapped rather than alternating.
            fill={i % 2 ? INK.navyDeep : `url(#${ids.gRibbon})`}
            stroke={INK.gold}
            strokeOpacity={i % 2 ? 0.95 : 0.5}
            strokeWidth={i % 2 ? 2.2 : 1.8}
          />
        );
      })}
    </g>
  );
};

/** A four-point sparkle — the shape foil confetti actually catches the light as. */
const Star = ({ cx, cy, r, fill, opacity }: { cx: number; cy: number; r: number; fill: string; opacity: number }) => (
  <path
    d={`M${cx} ${cy - r}Q${cx + r * 0.18} ${cy - r * 0.18} ${cx + r} ${cy}Q${cx + r * 0.18} ${cy + r * 0.18} ${cx} ${cy + r}Q${cx - r * 0.18} ${cy + r * 0.18} ${cx - r} ${cy}Q${cx - r * 0.18} ${cy - r * 0.18} ${cx} ${cy - r}Z`}
    fill={fill}
    opacity={opacity}
  />
);

/**
 * Gold accents, as fractions of the canvas so one table serves both shapes.
 *
 * Two motifs, and this is the whole set: a sparkle (`s`) or a plain dot. The sweeping
 * arcs are the second. Anything else — tumbling streamers, squiggles — made the ground
 * read as busy rather than decorated, so there is deliberately no third shape here.
 */
const ACCENTS: { x: number; y: number; r: number; o: number; s?: boolean }[] = [
  { x: 0.2, y: 0.06, r: 7, o: 0.72, s: true },
  { x: 0.29, y: 0.12, r: 4, o: 0.42 },
  { x: 0.35, y: 0.05, r: 4, o: 0.5 },
  { x: 0.65, y: 0.05, r: 4, o: 0.5 },
  { x: 0.71, y: 0.12, r: 4, o: 0.42 },
  { x: 0.8, y: 0.06, r: 7, o: 0.7, s: true },
  { x: 0.13, y: 0.24, r: 6, o: 0.48, s: true },
  { x: 0.87, y: 0.26, r: 6, o: 0.48, s: true },
  { x: 0.08, y: 0.45, r: 4, o: 0.4 },
  { x: 0.92, y: 0.47, r: 4, o: 0.4 },
  { x: 0.15, y: 0.63, r: 6, o: 0.44, s: true },
  { x: 0.86, y: 0.65, r: 6, o: 0.44, s: true },
  { x: 0.5, y: 0.965, r: 4, o: 0.32 },
];

export interface BirthdayCardProps {
  data: BirthdayCardPayload;
  orientation: BirthdayCardOrientation;
}

const BirthdayCard = forwardRef<SVGSVGElement, BirthdayCardProps>(({ data, orientation }, ref) => {
  const rawId = useId();
  // `useId` emits colons, which are not valid in an SVG fragment identifier.
  const uid = rawId.replace(/:/g, "");
  const ids = {
    bg: `bg-${uid}`,
    glow: `glow-${uid}`,
    goldGlow: `goldglow-${uid}`,
    dropShadow: `shadow-${uid}`,
    lift: `lift-${uid}`,
    flameGlow: `flame-${uid}`,
    photo: `photo-${uid}`,
    ring: `ring-${uid}`,
    gRibbon: `gr-${uid}`,
    gScript: `gsc-${uid}`,
  };

  const L = LAYOUTS[orientation];
  const { person, organization } = data;
  const isLandscape = orientation === "landscape";
  const cx = L.w / 2;

  const name = useMemo(
    () => fitLines(person.name, L.nameMaxWidth, L.nameSize),
    [person.name, L.nameMaxWidth, L.nameSize],
  );
  const logo = fitLogoRect(cx, L.logoSlot, organization.logoWidth, organization.logoHeight);

  // The name block, centred in its band.
  const nameLead = name.size * NAME_LEAD;
  // Cap height at 0.72em — what the block actually OCCUPIES. Using the full em would
  // centre the name against space its glyphs never reach and leave it sitting low.
  const nameCap = name.size * 0.72;
  const nameBlockH = (name.lines.length - 1) * nameLead + nameCap;
  const nameTop =
    L.nameBand.top + (L.nameBand.bottom - L.nameBand.top - nameBlockH) / 2 + nameCap;

  const message = useMemo(
    () => splitTwo(MESSAGE).map((line) => line.trim()),
    [],
  );
  const fi = L.frameInset;

  // Job titles carry grade markers the banner does not need — "MEP Co-Ordinator (D) (L1)"
  // reads as a filing code at a glance. Strip every parenthetical, then trim.
  const role = person.subtitle
    ? truncate(person.subtitle.replace(/\s*\([^)]*\)/g, "").replace(/\s{2,}/g, " ").trim(), isLandscape ? 46 : 38)
    : null;
  const roleWidth = role ? widthOf(role, L.ribbon.textSize) + L.ribbon.pad * 2 : 0;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${L.w} ${L.h}`}
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Birthday card for ${person.name}`}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={ids.bg} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor={INK.navy} />
          <stop offset="45%" stopColor={INK.navyMid} />
          <stop offset="100%" stopColor={INK.navyDeep} />
        </linearGradient>
        {/* A pool of lift behind the portrait, so the middle of the card is not as dead
            as the corners. Barely visible alone; the card looks flat without it. */}
        <radialGradient id={ids.glow}>
          <stop offset="0%" stopColor={INK.navyLift} stopOpacity="0.95" />
          <stop offset="100%" stopColor={INK.navyLift} stopOpacity="0" />
        </radialGradient>

        <linearGradient id={ids.gRibbon} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={INK.goldLight} />
          <stop offset="45%" stopColor={INK.gold} />
          <stop offset="100%" stopColor={INK.goldDeep} />
        </linearGradient>
        {/* The greeting's own gilt, and it is NOT the ribbon's.
            A ribbon is a solid block, so it can afford to fall away to `goldDeep` at the
            bottom; a script face is hairline thin at the exits of every stroke, and that
            same fall-off swallowed the descenders against the navy. This one bottoms out
            at `gold` and stays legible. */}
        <linearGradient id={ids.gScript} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={INK.goldPale} />
          <stop offset="45%" stopColor={INK.goldLight} />
          <stop offset="100%" stopColor={INK.gold} />
        </linearGradient>
        <linearGradient id={ids.ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={INK.goldPale} />
          <stop offset="34%" stopColor={INK.gold} />
          <stop offset="66%" stopColor={INK.goldDeep} />
          <stop offset="100%" stopColor={INK.goldLight} />
        </linearGradient>

        {/* The greeting's own gilt, and it is NOT the ribbon's.
            A ribbon is a solid block, so it can afford to fall away to `goldDeep` at the
            bottom; a script face is hairline thin at the exits of every stroke, and that
            same fall-off swallowed the descenders against the navy. This one bottoms out
            at `gold` and stays legible. */}
        <linearGradient id={ids.gScript} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={INK.goldPale} />
          <stop offset="45%" stopColor={INK.goldLight} />
          <stop offset="100%" stopColor={INK.gold} />
        </linearGradient>
        <linearGradient id={ids.ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={INK.goldPale} />
          <stop offset="34%" stopColor={INK.gold} />
          <stop offset="66%" stopColor={INK.goldDeep} />
          <stop offset="100%" stopColor={INK.goldLight} />
        </linearGradient>

        {/*
          The mark, off its white ground and lit so it survives navy.

          The file is dark ink on an opaque white background, and its dominant inks are
          #304070 and #903020 — a navy barely lighter than the card itself. Keying the
          white out and drawing what is left is therefore NOT enough: "WISE" would come
          out navy on navy and disappear. Two earlier cuts each got half of this right —
          one repainted every surviving pixel white, which threw away the brand and read
          as grey; the other kept the colours by putting the whole mark on a white plate,
          which is the sticker this design exists to avoid.

          Three stages, each doing one job:

          1. `A = A_in - luminance`, RGB untouched. White ink lands at alpha 0 and goes;
             dark ink keeps the alpha it came with. Subtracting from `A_in` rather than
             from 1 is what makes this safe for a mark that ALREADY has transparency —
             those pixels start at 0 and stay there instead of being painted in as solid.
          2. `saturate 1.45` pushes each ink to its own hue rather than to a common one.
             This is the step that keeps the brand: #903020 goes vivid red, #304070 goes
             clearly blue, and the grey rule — having no hue to push — stays grey.
          3. A LINEAR gain of 1.75 lifts what is left into the light half of the range.
             Linear, not a gamma: a gamma curve pulls every channel toward 1 at different
             rates, which is a move toward WHITE, and the mark came out with a pale wash
             over it — the blue nearly lavender. Multiplying keeps the ratios between the
             channels, so the hue survives the brightening. The alpha ramp on the same
             pass undoes the translucency stage 1 leaves on mid-tones: without it the grey
             sub-line sits at 56% opacity and the anti-aliased edge of every letter keeps
             a halo of half-transparent white, which is the other half of that same wash.

             That ramp is a TABLE, not a gain. It was `slope="3"` — a straight
             multiply — and a multiply cannot tell the ground from an edge: it lifts
             BOTH. The white in the file is not #FFFFFF but a scan-white around 97%
             luminance, so stage 1 leaves the ground at alpha 0.03 and a gain of 3 turns
             that into a 9% white veil over the mark's whole rectangle — a pale haze that
             reads as an out-of-focus logo, which is exactly what it was reported as. The
             table pins the top of the range flat at 0 (the ground goes, at any
             scan-white), holds the bottom flat at 1 (ink stays solid), and puts the
             steep part in the middle where the anti-aliased edges actually live. Same
             halo fix, without painting the paper back on.

          The cost is that the mark is no longer its exact Pantone — it is a brightened
          version of it. A real reversed lockup, uploaded per organisation, is the only
          thing that removes the compromise, and this filter can go the day one exists.
        */}
        <filter id={ids.lift} colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    -0.2126 -0.7152 -0.0722 1 0"
          />
          <feColorMatrix type="saturate" values="1.45" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.75" intercept="0" />
            <feFuncG type="linear" slope="1.75" intercept="0" />
            <feFuncB type="linear" slope="1.75" intercept="0" />
            {/* alpha in →  0    0.25  0.5   0.75   1
                alpha out →  0     0    0.55   1     1     (input is 1 − luminance) */}
            <feFuncA type="table" tableValues="0 0 0.55 1 1" />
          </feComponentTransfer>
        </filter>

        <radialGradient id={ids.goldGlow}>
          <stop offset="0%" stopColor={INK.gold} stopOpacity="0.4" />
          <stop offset="55%" stopColor={INK.gold} stopOpacity="0.1" />
          <stop offset="100%" stopColor={INK.gold} stopOpacity="0" />
        </radialGradient>

        <filter id={ids.dropShadow} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000000" floodOpacity="0.45" />
        </filter>

        <radialGradient id={ids.flameGlow}>
          <stop offset="0%" stopColor={INK.goldPale} stopOpacity="1" />
          <stop offset="30%" stopColor={INK.goldLight} stopOpacity="0.85" />
          <stop offset="70%" stopColor={INK.gold} stopOpacity="0.3" />
          <stop offset="100%" stopColor={INK.gold} stopOpacity="0" />
        </radialGradient>

        <clipPath id={ids.photo}>
          <circle cx={cx} cy={L.photo.cy} r={L.photo.r} />
        </clipPath>
      </defs>

      <rect width={L.w} height={L.h} fill={`url(#${ids.bg})`} />
      <ellipse cx={cx} cy={L.photo.cy} rx={L.w * 0.42} ry={L.h * 0.34} fill={`url(#${ids.glow})`} />

      {/* The reference's sweeping arcs: a lifted navy curve out of the bottom left and a
          thin gold one across the top right. They are what stop the ground reading as a
          flat rectangle of colour. */}
      <path
        d={`M0 ${L.h * 0.62}Q${L.w * 0.3} ${L.h * 0.96} ${L.w * 0.46} ${L.h}L0 ${L.h}Z`}
        fill={INK.navyLift}
        opacity="0.5"
      />
      <path
        d={`M0 ${L.h * 0.66}Q${L.w * 0.3} ${L.h * 0.99} ${L.w * 0.44} ${L.h}`}
        fill="none"
        stroke={INK.gold}
        strokeOpacity="0.5"
        strokeWidth="2.5"
      />
      <path
        d={`M${L.w * 0.58} 0Q${L.w * 0.86} ${L.h * 0.06} ${L.w} ${L.h * 0.3}`}
        fill="none"
        stroke={INK.gold}
        strokeOpacity="0.45"
        strokeWidth="2.5"
      />
      <path
        d={`M${L.w * 0.68} 0Q${L.w * 0.92} ${L.h * 0.05} ${L.w} ${L.h * 0.22}`}
        fill="none"
        stroke={INK.goldLight}
        strokeOpacity="0.22"
        strokeWidth="1.4"
      />
      {/* The same three sweeps mirrored — 16:9 ONLY. The reference is a portrait card and
          its off-centre sweep is what keeps 4:5 from looking stencilled, so portrait keeps
          exactly what was approved. A 1920-wide card has twice the ground and reads the
          single sweep as a corner that was decorated and an opposite corner that was
          forgotten, so the wide shape answers it. */}
      {isLandscape && (
        <>
          <path
            d={`M${L.w} ${L.h * 0.62}Q${L.w * 0.7} ${L.h * 0.96} ${L.w * 0.54} ${L.h}L${L.w} ${L.h}Z`}
            fill={INK.navyLift}
            opacity="0.5"
          />
          <path
            d={`M${L.w} ${L.h * 0.66}Q${L.w * 0.7} ${L.h * 0.99} ${L.w * 0.56} ${L.h}`}
            fill="none"
            stroke={INK.gold}
            strokeOpacity="0.5"
            strokeWidth="2.5"
          />
          <path
            d={`M${L.w * 0.42} 0Q${L.w * 0.14} ${L.h * 0.06} 0 ${L.h * 0.3}`}
            fill="none"
            stroke={INK.gold}
            strokeOpacity="0.45"
            strokeWidth="2.5"
          />
          <path
            d={`M${L.w * 0.32} 0Q${L.w * 0.08} ${L.h * 0.05} 0 ${L.h * 0.22}`}
            fill="none"
            stroke={INK.goldLight}
            strokeOpacity="0.22"
            strokeWidth="1.4"
          />
        </>
      )}

      {/* One thin gold outline. A second inner rule read as a bracket ornament and left
          the margin ambiguous — with a single line, "the edge" is one measurable place. */}
      <rect x={fi} y={fi} width={L.w - fi * 2} height={L.h - fi * 2} rx="8" fill="none" stroke={INK.gold} strokeOpacity="0.66" strokeWidth="2.4" />

      {/* Tied off ON the frame's own line, so the garland reads as strung across the card
          rather than as floating near the top of it. Drawn here — before the mark — so
          the plate covers the swag's low point. */}
      {L.bunting.spans.map(([x0, x1], i) => (
        <Bunting
          key={i}
          x0={x0}
          x1={x1}
          edgeY={fi + 16}
          dip={L.bunting.dip}
          pitch={L.bunting.pitch}
          size={L.bunting.size}
          ids={ids}
        />
      ))}

      {ACCENTS.map((c, i) =>
        c.s ? (
          <Star key={i} cx={c.x * L.w} cy={c.y * L.h} r={c.r * 1.5} fill={INK.goldLight} opacity={c.o} />
        ) : (
          <circle key={i} cx={c.x * L.w} cy={c.y * L.h} r={c.r} fill={INK.gold} opacity={c.o} />
        ),
      )}

      {L.clusters.map(([bcx, bottom, width, mirrored, tilt], i) => (
        <BalloonCluster key={i} cx={bcx} bottom={bottom} width={width} mirrored={mirrored} tilt={tilt} />
      ))}

      {L.gifts.map(([gcx, bottom, width, mirrored], i) => (
        <GiftPile key={i} cx={gcx} bottom={bottom} width={width} mirrored={mirrored} ids={ids} />
      ))}

      {/* ── Greeting, at the head ──────────────────────────────────────────── */}
      <g>
        {/*
          As outlines rather than as `<text>` — see `greeting.ts` for why a webfont
          cannot survive the export.

          `data-hit` is not decoration: the harness's collision sweep only measures
          `text`, `image` and tagged nodes, and turning the greeting from a `<text>` into
          a `<path>` would otherwise have quietly dropped it out of the check that keeps
          it clear of the date and the portrait below.
        */}
        <g
          transform={`translate(${cx - L.eyebrowWidth / 2} ${L.eyebrowY}) scale(${L.eyebrowWidth / GREETING.width})`}
          role="img"
          aria-label="Happy Birthday"
          data-hit="greeting"
        >
          <path d={GREETING.d} fill={`url(#${ids.gScript})`} />
        </g>
        {/* The reference sets a rule and a diamond either side of the greeting. With
            outlines the half-width is EXACT — the old estimate multiplied a character
            count by the size and the letter-spacing, and an early cut of it put the
            sparkle through the final Y. */}
        {(() => {
          const half = L.eyebrowWidth / 2;
          // Optically centred on the letterforms, not on the baseline: a script face
          // hangs most of its mass above the line.
          const y = L.eyebrowY - (GREETING.ascent * L.eyebrowWidth) / GREETING.width / 2.4;
          return [-1, 1].map((side) => (
            <g key={side}>
              <path
                d={`M${cx + side * (half + 34)} ${y}L${cx + side * (half + 150)} ${y}`}
                stroke={INK.gold}
                strokeOpacity="0.75"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <Star cx={cx + side * (half + 182)} cy={y} r={12} fill={INK.goldLight} opacity={0.95} />
            </g>
          ));
        })()}
      </g>

      {/* ── The date, under the greeting ───────────────────────────────────── */}
      <text
        x={cx}
        y={L.dateY}
        textAnchor="middle"
        fontFamily={FONT}
        fontSize={L.dateSize}
        fontWeight="600"
        letterSpacing="4"
        fill={INK.goldLight}
        fillOpacity="0.92"
      >
        {cardDate(person.dateOfBirth)}
      </text>

      {/* ── Portrait ───────────────────────────────────────────────────────── */}
      <circle cx={cx} cy={L.photo.cy} r={L.photo.r + 40} fill={`url(#${ids.goldGlow})`} />

      <g filter={`url(#${ids.dropShadow})`}>
        <circle cx={cx} cy={L.photo.cy} r={L.photo.r + 26} fill={INK.navyDeep} opacity="0.55" />
        {person.photo ? (
          // `yMin`, not `yMid`: a portrait photo is taller than the square the circle sits
          // in, and centring the crop trims the top and bottom equally — which
          // takes the top of the head off. Anchoring to the top keeps the face whole
          // and trims from the torso instead. A square photo (what the onboarding
          // cropper now produces) is unaffected either way.
          <image
            href={person.photo}
            x={cx - L.photo.r * PHOTO_ZOOM}
            y={L.photo.cy - L.photo.r}
            width={L.photo.r * 2 * PHOTO_ZOOM}
            height={L.photo.r * 2 * PHOTO_ZOOM}
            preserveAspectRatio="xMidYMin slice"
            clipPath={`url(#${ids.photo})`}
            data-hit="photo"
          />
        ) : (
          <>
            <circle cx={cx} cy={L.photo.cy} r={L.photo.r} fill={INK.navyMid} />
            <text
              x={cx}
              y={L.photo.cy + L.photo.r * 0.28}
              textAnchor="middle"
              fontFamily={FONT}
              fontSize={L.photo.r * 0.78}
              fontWeight="700"
              fill={INK.goldLight}
              opacity="0.9"
              data-hit="photo"
            >
              {initialsOf(person.name)}
            </text>
          </>
        )}
        {/* Two rings: a thick gilt band and a hairline outside it, which is what stops the
            gold reading as a flat stroke. */}
        <circle cx={cx} cy={L.photo.cy} r={L.photo.r + 6} fill="none" stroke={`url(#${ids.ring})`} strokeWidth="12" />
        <circle
        cx={cx}
        cy={L.photo.cy}
        r={L.photo.r + 20}
        fill="none"
        stroke={INK.gold}
        strokeOpacity="0.55"
        strokeWidth="2.4"
        data-hit="photo"
      />
        {/* Sparkles on the ring, where the reference catches the light. */}
        <Star cx={cx - L.photo.r * 0.95} cy={L.photo.cy - L.photo.r * 0.62} r={13} fill={INK.goldPale} opacity={0.95} />
        <Star cx={cx + L.photo.r * 0.98} cy={L.photo.cy + L.photo.r * 0.5} r={11} fill={INK.goldPale} opacity={0.9} />
      </g>

      {/* ── Name ──────────────────────────────────────────────────────────── */}
      {/* Name Drop Shadow (Behind) */}
      {name.lines.map((line, i) => (
        <text
          key={`shadow-${i}`}
          x={cx + 3}
          y={nameTop + i * nameLead + 3.5}
          textAnchor="middle"
          fontFamily={FONT}
          fontSize={name.size}
          fontWeight="800"
          fill={INK.navyDeep}
          opacity="0.68"
        >
          {line}
        </text>
      ))}

      {/* Name Text (Front) */}
      {name.lines.map((line, i) => (
        <text
          key={i}
          x={cx}
          y={nameTop + i * nameLead}
          textAnchor="middle"
          fontFamily={FONT}
          fontSize={name.size}
          fontWeight="800"
          fill={INK.white}
        >
          {line}
        </text>
      ))}

      {/* ── Role, on the gold ribbon ───────────────────────────────────────── */}
      {role && (
        <g filter={`url(#${ids.dropShadow})`}>
          {/* Tails first, tucked behind the body so the fold reads as depth. */}
          {[-1, 1].map((side) => {
            const edge = cx + (side * roleWidth) / 2;
            const tip = edge + side * 44;
            const top = L.ribbon.cy - L.ribbon.h / 2 + 7;
            const bot = L.ribbon.cy + L.ribbon.h / 2 - 7;
            return (
              <g key={side}>
                {/* Ribbon Tail */}
                <path
                  d={`M${edge} ${top}L${tip} ${top}L${tip - side * 15} ${(top + bot) / 2}L${tip} ${bot}L${edge} ${bot}Z`}
                  fill={INK.goldDeep}
                />
                {/* Fold crease shadow triangle */}
                <path
                  d={`M${edge} ${L.ribbon.cy + L.ribbon.h / 2}L${edge} ${bot}L${edge + side * 14} ${bot}Z`}
                  fill="#4C3503"
                />
              </g>
            );
          })}
          <rect
            x={cx - roleWidth / 2}
            y={L.ribbon.cy - L.ribbon.h / 2}
            width={roleWidth}
            height={L.ribbon.h}
            rx="3"
            fill={`url(#${ids.gRibbon})`}
          />
          {/* Elegant inner border rule */}
          <rect
            x={cx - roleWidth / 2 + 3}
            y={L.ribbon.cy - L.ribbon.h / 2 + 3}
            width={roleWidth - 6}
            height={L.ribbon.h - 6}
            rx="2"
            fill="none"
            stroke={INK.goldPale}
            strokeWidth="1.2"
            strokeOpacity="0.45"
          />
          <text
            x={cx}
            y={L.ribbon.cy + L.ribbon.textSize * 0.36}
            textAnchor="middle"
            fontFamily={FONT}
            fontSize={L.ribbon.textSize}
            fontWeight="700"
            fill={INK.navyDeep}
          >
            {role}
          </text>
        </g>
      )}

      {/* ── Message ────────────────────────────────────────────────────────── */}
      {message.map((line, i) => (
        <text
          key={i}
          x={cx}
          y={L.paragraph.y + i * L.paragraph.lead}
          textAnchor="middle"
          fontFamily={FONT}
          fontSize={L.paragraph.size}
          fontWeight="400"
          fill={INK.muted}
        >
          {line}
        </text>
      ))}

      {/* ── Sign-off: the phrase, then the mark ────────────────────────────── */}
      <text
        x={cx}
        y={L.wishY}
        textAnchor="middle"
        fontFamily={FONT}
        fontSize={L.wishSize}
        fontWeight="500"
        fill={INK.muted}
      >
        With warm wishes from
      </text>

      {organization.logo ? (
        <>
          {/* A pool of warm light under the mark. Not decoration: the ink is lifted but
              still darker than the greeting, and a little glow behind it is what keeps
              the foot of the card from reading as merely occupied. */}
          <ellipse
            cx={cx}
            cy={L.logoSlot.cy}
            rx={logo.width * 0.78}
            ry={logo.height * 0.82}
            fill={`url(#${ids.goldGlow})`}
            opacity="0.55"
          />
          <image
            href={organization.logo}
            x={logo.x}
            y={logo.y}
            width={logo.width}
            height={logo.height}
            preserveAspectRatio="xMidYMid meet"
            filter={`url(#${ids.lift})`}
            data-hit="mark"
          />
        </>
      ) : organization.name ? (
        // No mark on file: the name IS the mark, so the sentence still finishes.
        <text
          x={cx}
          y={L.orgY}
          textAnchor="middle"
          fontFamily={FONT}
          fontSize={L.orgSize}
          fontWeight="800"
          letterSpacing="0.5"
          fill={INK.goldLight}
        >
          {organization.name}
        </text>
      ) : null}
    </svg>
  );
});

BirthdayCard.displayName = "BirthdayCard";

export default BirthdayCard;
