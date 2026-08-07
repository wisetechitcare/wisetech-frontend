import { forwardRef, useId, useMemo } from "react";
import type { EmployeeIdCardPayload } from "@services/employee";
import { formatDate } from "@utils/dateFormats";

/**
 * The printed employee identity card, drawn as a single SVG at CR80 proportions
 * (85.6 × 54 mm — the ISO/IEC 7810 size every badge printer and lanyard holder is
 * cut for). 1000 × 630 user units means 1 unit ≈ 0.0856 mm, so exporting at 3× lands
 * on ~300 DPI without any resampling.
 *
 * **Why SVG and not a styled `<div>`:** the same element is both the on-screen preview
 * and the source the PNG is rasterised from (`utils/svgExport`). One drawing, so the
 * download cannot drift from what the admin approved, and it stays sharp at any export
 * scale. It also means the card must be self-contained: presentation attributes only
 * (page CSS does not reach an SVG loaded as an image) and `data:` URIs for the photo
 * and logo (a cross-origin image would taint the export canvas — which is why the
 * `/api/employee/id-card` endpoint inlines both server-side).
 *
 * **Why the colours are literal hex and not theme tokens:** this is artwork, not app
 * chrome. A physical badge does not invert in dark mode any more than a PDF does, so
 * the card renders identically under both themes and the surrounding dialog carries
 * the theme instead. Brand values are pinned to the kit's navy (#1E3A8A) and accent
 * (#C0392B) so the badge still reads as WiseTech.
 *
 * Every value comes from the employee's onboarding record via the ID-card endpoint —
 * nothing is entered twice, so the badge cannot disagree with the profile.
 */

/* ── Geometry ─────────────────────────────────────────────────────────────────
   Named so the layout can be reasoned about without counting magic numbers. */
const CARD = { w: 1000, h: 630, radius: 36 };
const RAIL = { w: 340, pad: 28 };
const PANEL = { x: RAIL.w, left: 386, right: 956 };
const PHOTO = { cx: RAIL.w / 2, cy: 214, r: 92 };
const FOOTER_Y = 506;
const ROW_Y = [206, 266, 326, 386, 446];
/** Left edge of the "IDENTITY CARD" eyebrow — the wordmark's width budget stops here. */
const EYEBROW_X = 826;
/**
 * The org logo slot. Generous on both axes because sub-organizations ship
 * differently-shaped marks: a wide wordmark is width-constrained here, a stacked
 * icon-over-text mark is height-constrained, and each is scaled until it hits
 * whichever edge binds it first.
 *
 * The mark is pinned to the slot's LEFT edge and vertically centred, so every
 * sub-organization's logo starts on the same line as the detail rows below it
 * regardless of its proportions.
 */
const LOGO = { x: 386, y: 30, w: 340, h: 98 };
/** Vertical centre of the logo slot — the eyebrow and wordmark align to it. */
const HEADER_MID = LOGO.y + LOGO.h / 2;
const HEADER_RULE_Y = 152;

/* ── Palette (artwork ink — see the note above on why these are literal) ───── */
const INK = {
  navy: "#1E3A8A",
  navyDeep: "#111F49",
  accent: "#C0392B",
  cardTop: "#FFFFFF",
  cardBottom: "#F8FAFC",
  border: "#DCE3ED",
  hairline: "#E2E8F0",
  footer: "#F1F5F9",
  tile: "#EEF2FF",
  label: "#94A3B8",
  value: "#0F172A",
  railLabel: "rgba(255,255,255,0.55)",
  railValue: "#DBEAFE",
  railMuted: "#A8C0EC",
};

const FONT = "Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/* ── Text fitting ─────────────────────────────────────────────────────────────
   SVG has no automatic line breaking, so names, job titles and the wordmark are
   laid out here. Widths are estimated at 0.60em per character — measured against
   bold Inter/Segoe, and deliberately on the generous side: over-estimating leaves
   a little whitespace, under-estimating runs text off the edge of the rail. */
const CHAR_EM = 0.6;

const estimateWidth = (text: string, size: number) => text.length * size * CHAR_EM;

const wrapIntoLines = (text: string, lineCount: number): string[] => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (lineCount <= 1 || words.length < lineCount) return [text.trim()];

  // Balanced greedy fill: aim for equal-length lines rather than a long first
  // line and an orphan, which is what a naive wrap produces on two-word names.
  const target = Math.ceil(words.join(" ").length / lineCount);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) { current = word; continue; }
    const isLastLine = lines.length === lineCount - 1;
    if (isLastLine || `${current} ${word}`.length <= target) current = `${current} ${word}`;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines;
};

const truncate = (text: string, maxChars: number) =>
  text.length > maxChars ? `${text.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…` : text;

interface FittedText { lines: string[]; size: number }

/** Largest font size at which `text` fits `maxWidth`, using as few lines as possible. */
const fitText = (
  text: string,
  { maxLines, maxSize, minSize, maxWidth }: { maxLines: number; maxSize: number; minSize: number; maxWidth: number },
): FittedText => {
  const clean = text.trim();
  if (!clean) return { lines: [], size: maxSize };

  for (let count = 1; count <= maxLines; count++) {
    const lines = wrapIntoLines(clean, count);
    if (lines.length !== count) continue;
    const longest = Math.max(...lines.map((line) => line.length));
    const size = Math.min(maxSize, maxWidth / (longest * CHAR_EM));
    if (size >= minSize) return { lines, size: Math.round(size) };
  }

  // Nothing fits even at the floor (one very long unbroken word): wrap as far as
  // allowed and clip the rest, so the rail never overflows.
  const maxChars = Math.floor(maxWidth / (minSize * CHAR_EM));
  return {
    lines: wrapIntoLines(clean, maxLines).slice(0, maxLines).map((line) => truncate(line, maxChars)),
    size: minSize,
  };
};

/**
 * The exact rect to draw the logo in: scaled to fit the slot, pinned left, centred
 * vertically.
 *
 * Why compute this rather than hand the whole slot to `preserveAspectRatio`: when the
 * logo is an **SVG with its own viewBox**, browsers honour the inner document's
 * `preserveAspectRatio` (default `xMidYMid`) over the `<image>` element's — so
 * `xMinYMid` left-aligns a PNG logo but silently centres an SVG one, and two sub-orgs
 * whose marks happen to be in different formats end up on different left edges.
 * Sizing the box to the logo's own aspect ratio removes the ambiguity entirely:
 * there is no leftover space for either alignment rule to distribute.
 *
 * Returns null when the server could not read the logo's header, in which case the
 * caller falls back to the whole slot and lets the browser fit it.
 */
const fitLogoRect = (
  intrinsicWidth: number | null,
  intrinsicHeight: number | null,
): { x: number; y: number; width: number; height: number } | null => {
  if (!intrinsicWidth || !intrinsicHeight || intrinsicWidth <= 0 || intrinsicHeight <= 0) return null;
  const scale = Math.min(LOGO.w / intrinsicWidth, LOGO.h / intrinsicHeight);
  const width = intrinsicWidth * scale;
  const height = intrinsicHeight * scale;
  return { x: LOGO.x, y: LOGO.y + (LOGO.h - height) / 2, width, height };
};

const initialsOf = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
};

/* ── Icons ────────────────────────────────────────────────────────────────────
   Feather geometry on a 24×24 grid, drawn as strokes so one `stroke` on the parent
   group recolours the whole set. Inline rather than KTIcon because an icon font
   does not survive rasterisation — the glyph would export as a blank box. */
const ICONS = {
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2.5" />
      <path d="M8 2v4M16 2v4M3 10h18" />
    </>
  ),
  briefcase: (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2.5" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </>
  ),
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  ),
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2.5" />
      <path d="M2.5 6.5 12 13l9.5-6.5" />
    </>
  ),
  pin: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
} as const;

type IconName = keyof typeof ICONS;

interface DetailRow { icon: IconName; label: string; value: string }

export interface EmployeeIdCardProps {
  data: EmployeeIdCardPayload;
  /** Rendered width. The card keeps its CR80 aspect ratio at any size. */
  className?: string;
}

const EmployeeIdCard = forwardRef<SVGSVGElement, EmployeeIdCardProps>(function EmployeeIdCard(
  { data, className },
  ref,
) {
  const { employee, organization } = data;

  // useId is unique per instance; the colons it contains are not valid in a
  // `url(#…)` reference inside serialised SVG, so they are stripped.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ids = {
    card: `wtc-card-${uid}`,
    rail: `wtc-rail-${uid}`,
    bar: `wtc-bar-${uid}`,
    clip: `wtc-clip-${uid}`,
    photo: `wtc-photo-${uid}`,
  };

  const railTextWidth = RAIL.w - RAIL.pad * 2;

  // A long name shrinks rather than being cropped — a badge whose holder's name is
  // cut off has failed at the one job it has.
  const name = useMemo(
    () => fitText(employee.fullName || "Unnamed Employee", { maxLines: 2, maxSize: 38, minSize: 17, maxWidth: railTextWidth }),
    [employee.fullName, railTextWidth],
  );

  const designation = useMemo(
    () => fitText(employee.designation || "", { maxLines: 2, maxSize: 19, minSize: 13, maxWidth: railTextWidth }),
    [employee.designation, railTextWidth],
  );

  const rows: DetailRow[] = useMemo(() => [
    { icon: "calendar", label: "Joining Date", value: employee.dateOfJoining ? formatDate(employee.dateOfJoining) : "—" },
    { icon: "briefcase", label: "Department", value: truncate(employee.department || "—", 34) },
    { icon: "phone", label: "Phone Number", value: truncate(employee.phone || "—", 30) },
    { icon: "mail", label: "Email ID", value: truncate(employee.email || "—", 38) },
    { icon: "pin", label: "Branch", value: truncate(employee.branch || organization.name || "—", 34) },
  ], [employee, organization.name]);

  // The footer carries the two facts a badge exists to make findable in an
  // emergency. With neither on file it falls back to the ownership line every
  // corporate ID card carries, so the band is never an empty grey strip.
  const footerCells = useMemo(() => {
    const cells: DetailRow[] = [];
    if (employee.bloodGroup) cells.push({ icon: "pin", label: "Blood Group", value: employee.bloodGroup });
    const emergency = [employee.emergencyContactName, employee.emergencyContactNumber].filter(Boolean).join(" · ");
    // Capped to what fits between this cell's left edge and the card's right margin.
    if (emergency) cells.push({ icon: "phone", label: "Emergency Contact", value: truncate(emergency, 38) });
    return cells;
  }, [employee.bloodGroup, employee.emergencyContactName, employee.emergencyContactNumber]);

  const logoRect = useMemo(
    () => fitLogoRect(organization.logoWidth, organization.logoHeight),
    [organization.logoWidth, organization.logoHeight],
  );

  const orgName = organization.name || "WiseTech";
  // Shrink the wordmark to whatever room the "IDENTITY CARD" eyebrow leaves rather
  // than clipping it — a truncated company name on a company badge reads as a bug.
  const wordmark = useMemo(
    () => fitText(orgName, { maxLines: 1, maxSize: 30, minSize: 15, maxWidth: EYEBROW_X - PANEL.left - 24 }),
    [orgName],
  );

  // Rail stack: name, then designation, laid out from a fixed top so a one-line
  // name and a two-line name both sit visually under the photo.
  const nameTop = 366;
  const nameLeading = name.size * 1.16;
  const designationTop = nameTop + (name.lines.length - 1) * nameLeading + 34;
  const designationLeading = designation.size * 1.3;

  const codeText = employee.employeeCode || "—";
  const codeWidth = Math.max(150, Math.min(railTextWidth, estimateWidth(codeText, 18) + 2.4 * codeText.length + 44));

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${CARD.w} ${CARD.h}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={`Employee identity card for ${employee.fullName}${employee.designation ? `, ${employee.designation}` : ""}`}
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <defs>
        <linearGradient id={ids.card} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={INK.cardTop} />
          <stop offset="100%" stopColor={INK.cardBottom} />
        </linearGradient>
        <linearGradient id={ids.rail} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2C56C4" />
          <stop offset="55%" stopColor={INK.navy} />
          <stop offset="100%" stopColor={INK.navyDeep} />
        </linearGradient>
        <linearGradient id={ids.bar} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2C56C4" />
          <stop offset="62%" stopColor={INK.navy} />
          <stop offset="100%" stopColor={INK.accent} />
        </linearGradient>
        <clipPath id={ids.clip}>
          <rect x="0" y="0" width={CARD.w} height={CARD.h} rx={CARD.radius} />
        </clipPath>
        <clipPath id={ids.photo}>
          <circle cx={PHOTO.cx} cy={PHOTO.cy} r={PHOTO.r} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${ids.clip})`}>
        <rect x="0" y="0" width={CARD.w} height={CARD.h} fill={`url(#${ids.card})`} />

        {/* Left rail — the identity block */}
        <rect x="0" y="0" width={RAIL.w} height={CARD.h} fill={`url(#${ids.rail})`} />
        {/* Depth without a filter: filters are the least reliable part of SVG
            rasterisation, so the rail's dimension comes from flat translucent discs. */}
        <circle cx="24" cy={CARD.h - 30} r="168" fill="#FFFFFF" opacity="0.045" />
        <circle cx={RAIL.w - 18} cy="46" r="120" fill="#FFFFFF" opacity="0.055" />

        {/* Photo */}
        <circle cx={PHOTO.cx} cy={PHOTO.cy} r={PHOTO.r + 20} fill="#FFFFFF" opacity="0.07" />
        <circle cx={PHOTO.cx} cy={PHOTO.cy} r={PHOTO.r + 8} fill="#FFFFFF" opacity="0.18" />
        {employee.photo ? (
          // `yMin`, not `yMid`: a portrait photo is taller than the square the circle
          // sits in, and centring the crop trims the top and bottom equally — which
          // takes the top of the head off. Anchoring to the top keeps the face whole
          // and trims from the torso instead. A square photo (what the onboarding
          // cropper now produces) is unaffected either way.
          <image
            href={employee.photo}
            x={PHOTO.cx - PHOTO.r}
            y={PHOTO.cy - PHOTO.r}
            width={PHOTO.r * 2}
            height={PHOTO.r * 2}
            preserveAspectRatio="xMidYMin slice"
            clipPath={`url(#${ids.photo})`}
          />
        ) : (
          <>
            <circle cx={PHOTO.cx} cy={PHOTO.cy} r={PHOTO.r} fill="#FFFFFF" opacity="0.16" />
            <text
              x={PHOTO.cx}
              y={PHOTO.cy + 24}
              textAnchor="middle"
              fontFamily={FONT}
              fontSize="66"
              fontWeight="700"
              fill="#FFFFFF"
              opacity="0.92"
            >
              {initialsOf(employee.fullName)}
            </text>
          </>
        )}
        <circle cx={PHOTO.cx} cy={PHOTO.cy} r={PHOTO.r} fill="none" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="3" />

        {/* Name */}
        {name.lines.map((line, index) => (
          <text
            key={`name-${index}`}
            x={RAIL.w / 2}
            y={nameTop + index * nameLeading}
            textAnchor="middle"
            fontFamily={FONT}
            fontSize={name.size}
            fontWeight="700"
            fill="#FFFFFF"
            letterSpacing="0.2"
          >
            {line}
          </text>
        ))}

        {/* Designation */}
        {designation.lines.map((line, index) => (
          <text
            key={`designation-${index}`}
            x={RAIL.w / 2}
            y={designationTop + index * designationLeading}
            textAnchor="middle"
            fontFamily={FONT}
            fontSize={designation.size}
            fontWeight="500"
            fill={INK.railMuted}
            letterSpacing="0.6"
          >
            {line}
          </text>
        ))}

        {/* Employee code — the badge's primary identifier, so it gets the rail's
            anchor position rather than competing with the detail rows. */}
        <text
          x={RAIL.w / 2}
          y="512"
          textAnchor="middle"
          fontFamily={FONT}
          fontSize="10.5"
          fontWeight="600"
          fill={INK.railLabel}
          letterSpacing="2.6"
        >
          EMPLOYEE ID
        </text>
        <rect
          x={(RAIL.w - codeWidth) / 2}
          y="528"
          width={codeWidth}
          height="46"
          rx="14"
          fill="#FFFFFF"
          opacity="0.14"
        />
        <text
          x={RAIL.w / 2}
          y="559"
          textAnchor="middle"
          fontFamily={FONT}
          fontSize="18"
          fontWeight="700"
          fill={INK.railValue}
          letterSpacing="2.4"
        >
          {codeText}
        </text>

        {/* Right panel — the identity of the sub-organization this employee sits in */}
        {organization.logo ? (
          <image
            href={organization.logo}
            x={logoRect ? logoRect.x : LOGO.x}
            y={logoRect ? logoRect.y : LOGO.y}
            width={logoRect ? logoRect.width : LOGO.w}
            height={logoRect ? logoRect.height : LOGO.h}
            preserveAspectRatio="xMidYMid meet"
          />
        ) : (
          <text
            x={PANEL.left}
            y={HEADER_MID + wordmark.size * 0.35}
            fontFamily={FONT}
            fontSize={wordmark.size}
            fontWeight="800"
            fill={INK.navy}
            letterSpacing="0.4"
          >
            {wordmark.lines[0]}
          </text>
        )}
        <text
          x={PANEL.right}
          y={HEADER_MID + 4}
          textAnchor="end"
          fontFamily={FONT}
          fontSize="11.5"
          fontWeight="700"
          fill={INK.label}
          letterSpacing="3.2"
        >
          IDENTITY CARD
        </text>
        <line x1={PANEL.left} y1={HEADER_RULE_Y} x2={PANEL.right} y2={HEADER_RULE_Y} stroke={INK.hairline} strokeWidth="1.5" />

        {/* Detail rows — every field straight off the onboarding record */}
        {rows.map((row, index) => {
          const y = ROW_Y[index];
          return (
            <g key={row.label}>
              <rect x={PANEL.left} y={y - 15} width="36" height="36" rx="11" fill={INK.tile} />
              <g
                transform={`translate(${PANEL.left + 6}, ${y - 9})`}
                fill="none"
                stroke={INK.navy}
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {ICONS[row.icon]}
              </g>
              <text x={PANEL.left + 54} y={y - 3} fontFamily={FONT} fontSize="11" fontWeight="600" fill={INK.label} letterSpacing="1.8">
                {row.label.toUpperCase()}
              </text>
              <text x={PANEL.left + 54} y={y + 19} fontFamily={FONT} fontSize="20" fontWeight="600" fill={INK.value}>
                {row.value}
              </text>
            </g>
          );
        })}

        {/* Footer band */}
        <rect x={PANEL.x} y={FOOTER_Y} width={CARD.w - PANEL.x} height={CARD.h - FOOTER_Y} fill={INK.footer} />
        <line x1={PANEL.x} y1={FOOTER_Y} x2={CARD.w} y2={FOOTER_Y} stroke={INK.hairline} strokeWidth="1.5" />
        {footerCells.length ? (
          footerCells.map((cell, index) => {
            const x = PANEL.left + index * 172;
            return (
              <g key={cell.label}>
                <text x={x} y="552" fontFamily={FONT} fontSize="10.5" fontWeight="600" fill={INK.label} letterSpacing="1.8">
                  {cell.label.toUpperCase()}
                </text>
                <text x={x} y="580" fontFamily={FONT} fontSize="17" fontWeight="600" fill={INK.value}>
                  {cell.value}
                </text>
              </g>
            );
          })
        ) : (
          <text x={PANEL.left} y="572" fontFamily={FONT} fontSize="14" fontWeight="500" fill={INK.label}>
            {/* Org names routinely end in "Pvt. Ltd." — don't double the full stop. */}
            {`This card remains the property of ${truncate(orgName, 34).replace(/\.$/, "")}.`}
          </text>
        )}

        {/* Brand bar, painted last so it sits above the rail's top edge */}
        <rect x="0" y="0" width={CARD.w} height="9" fill={`url(#${ids.bar})`} />
      </g>

      <rect
        x="0.75"
        y="0.75"
        width={CARD.w - 1.5}
        height={CARD.h - 1.5}
        rx={CARD.radius}
        fill="none"
        stroke={INK.border}
        strokeWidth="1.5"
      />
    </svg>
  );
});

export default EmployeeIdCard;
