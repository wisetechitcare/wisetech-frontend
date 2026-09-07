import { memo } from "react";
import { Link } from "react-router-dom";
import { Avatar, Box, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";
import { GlassCard } from "@app/modules/common/components/ui";
import { initialsOf } from "@app/modules/common/components/EmployeeIdentityCell";
import { toSortableTime } from "@app/modules/common/components/table/dateSort";
import { formatDate } from "@utils/dateFormats";
import { formatBloodGroup, formatPhoneWithCode } from "@utils/employeeFormat";

/**
 * One employee as a card — the tile the roster renders instead of a table row
 * when the view switch is on "Cards".
 *
 * It is the printed badge (`components/idcard/EmployeeIdCard`) at roster scale:
 * navy rail carrying the photo and identity, pale panel carrying labelled detail
 * rows, and the SAME formatters (`formatBloodGroup`, `formatPhoneWithCode`,
 * `formatDate`) so a card and the badge it previews can never disagree.
 *
 * **Two layouts, not one reflowed layout.** They carry different fields in a
 * different reading order, which no amount of breakpoint CSS on a single tree
 * gets to honestly:
 *
 *   desktop — portrait. Rail on top (photo · name · designation · code), then a
 *             2x2 detail grid: blood group / email over phone / joined.
 *   mobile  — landscape, one band three lines tall. The rail narrows to a photo
 *             column; the panel runs identity down the left and code, blood group
 *             and joining date down the right. Phone is dropped: at 360px a
 *             fourth field costs the layout more than it gives, and the number is
 *             one tap away on the employee's page.
 *
 * Colours on the rail are literal hex for the reason the badge's are — brand
 * artwork does not invert in dark mode. The panel IS app chrome, so it runs on
 * theme tokens.
 */

/** Pinned to the badge's navy (#1E3A8A) so a card and a printed card match. */
const RAIL = "linear-gradient(135deg, #1E3A8A 0%, #111F49 100%)";

/** The badge's `railValue` — readable on navy down to 12px. */
const RAIL_MUTED = "#C7D6F5";

const LABEL_SX = {
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "text.disabled",
  lineHeight: 1.6,
} as const;

/** A label/value pair, styled after the badge's detail rows. */
const Detail = ({
  label,
  value,
  align = "left",
}: {
  label: string;
  value?: string | null;
  align?: "left" | "right";
}) => (
  <Box sx={{ minWidth: 0, textAlign: align }}>
    <Typography component="div" sx={LABEL_SX}>
      {label}
    </Typography>
    <Typography
      component="div"
      noWrap
      title={value || undefined}
      sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", fontVariantNumeric: "tabular-nums" }}
    >
      {value || "—"}
    </Typography>
  </Box>
);

/** The employee code, as the badge sets it: a pill, not a plain line. */
const CodeChip = ({ code, onRail }: { code?: string | null; onRail?: boolean }) => (
  <Box
    component="span"
    sx={{
      display: "inline-block",
      px: 0.75,
      py: 0.1,
      borderRadius: "6px",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.03em",
      fontVariantNumeric: "tabular-nums",
      whiteSpace: "nowrap",
      ...(onRail
        ? { color: "#FFFFFF", bgcolor: "rgba(255,255,255,0.18)" }
        : { color: "text.secondary", bgcolor: "action.hover", border: 1, borderColor: "divider" }),
    }}
  >
    {code || "—"}
  </Box>
);

/** Blood group reads as medical, so it keeps the badge's accent rather than the
 *  neutral chip the employee code uses. */
const BloodChip = ({ value }: { value: string }) => (
  <Box
    component="span"
    title="Blood group"
    sx={{
      px: 0.75,
      py: 0.1,
      borderRadius: "6px",
      fontSize: 11,
      fontWeight: 700,
      whiteSpace: "nowrap",
      color: "#B91C1C",
      bgcolor: "rgba(185, 28, 28, 0.08)",
      border: 1,
      borderColor: "rgba(185, 28, 28, 0.22)",
    }}
  >
    {value}
  </Box>
);

const Photo = ({
  src,
  name,
  size,
  active,
}: {
  src?: string;
  name: string;
  size: number;
  active: boolean;
}) => (
  <Box sx={{ position: "relative", flexShrink: 0, display: "inline-flex" }}>
    <Avatar
      src={src || undefined}
      alt={name}
      sx={{
        width: size,
        height: size,
        fontSize: size > 60 ? "1.25rem" : "1rem",
        fontWeight: 700,
        bgcolor: "rgba(255,255,255,0.16)",
        color: "#FFFFFF",
        border: "3px solid rgba(255,255,255,0.9)",
      }}
    >
      {initialsOf(name)}
    </Avatar>
    {/* Colour alone would fail WCAG 1.4.1, so the dot carries a name. */}
    <Box
      component="span"
      role="img"
      aria-label={active ? "Active" : "Inactive"}
      title={active ? "Active" : "Inactive"}
      sx={{
        position: "absolute",
        right: 0,
        bottom: 0,
        width: 12,
        height: 12,
        borderRadius: "50%",
        border: "2px solid #FFFFFF",
        bgcolor: active ? "#22C55E" : "#94A3B8",
      }}
    />
  </Box>
);

export interface EmployeeCardProps {
  /** A mapped employee list row (see `mapEmployeeRow` in EmployeeListContent). */
  employee: any;
  /** Opens the employee. Receives the event so it can honour ctrl/middle-click. */
  onOpen: (event: React.MouseEvent<HTMLElement>) => void;
  /** Row actions — the same buttons the table's Actions column renders. */
  actions?: React.ReactNode;
}

const EmployeeCard = ({ employee, onOpen, actions }: EmployeeCardProps) => {
  // Viewport, not container width: the two layouts differ by what a PHONE can
  // hold, and a narrow tile in a desktop grid is still a desktop reading context.
  // `noSsr` — without it MUI v5 returns `defaultMatches` (false) on the FIRST render
  // and only corrects itself in an effect, so every card paints the desktop layout
  // and then visibly flips to the mobile one. There is no SSR here to be safe for;
  // matchMedia is available on the first pass, so read it then.
  const isPhone = useMediaQuery(useTheme().breakpoints.down("sm"), { noSsr: true });

  const name = (employee.users || "").trim() || "Unknown";
  const active = employee.employeeStatus === "Active";
  const designation =
    employee.designations && employee.designations !== "N/A" ? employee.designations : "—";
  const email = employee.companyEmailId || null;
  // The row carries a pre-formatted "DD/MM/YYYY"; parse it back through the table's
  // own date parser so the card renders the company format (YYYY.MM.DD) instead of
  // a second, contradicting one.
  const joinedAt = toSortableTime(employee.dateOfJoining);
  const joined = joinedAt ? formatDate(joinedAt) : null;
  const bloodGroup = formatBloodGroup(employee.bloodGroup, "—");

  const cardProps = {
    preset: "tile" as const,
    interactive: true,
    onClick: onOpen,
    onAuxClick: (event: React.MouseEvent<HTMLElement>) => {
      if (event.button === 1) onOpen(event);
    },
  };

  const shell = { p: 0, overflow: "hidden", display: "flex", cursor: "pointer" } as const;

  /* A real anchor, not just the card's click handler: it is what makes the card
     reachable by keyboard and openable in a new tab. The card-wide click is a
     convenience on top of it, and its own guard skips anchors so the two never
     both fire. */
  const nameLink = (onNavy: boolean) => (
    <Tooltip title={name} enterDelay={600} placement="top-start">
      <Typography
        component={Link}
        to={`/employees/${employee.id}`}
        noWrap
        sx={{
          display: "block",
          fontSize: onNavy ? 16 : 14.5,
          fontWeight: 700,
          letterSpacing: "0.01em",
          textDecoration: "none",
          ...(onNavy
            ? { color: "#FFFFFF", "&:hover": { color: "#FFFFFF", textDecoration: "underline" } }
            : { color: "text.primary", "&:hover": { textDecoration: "underline" } }),
        }}
      >
        {name}
      </Typography>
    </Tooltip>
  );

  // ── Mobile: landscape band, rail reduced to a photo column ──────────────────
  if (isPhone) {
    return (
      <GlassCard {...cardProps} sx={{ ...shell, flexDirection: "row", alignItems: "stretch" }}>
        <Box sx={{ display: "grid", placeItems: "center", px: 1.5, background: RAIL, flexShrink: 0 }}>
          <Photo src={employee.avatar} name={name} size={52} active={active} />
        </Box>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            px: 1.5,
            py: 1.25,
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            {/* Left: who they are. */}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              {nameLink(false)}
              <Typography noWrap title={designation} sx={{ fontSize: 12, color: "text.secondary", mt: 0.1 }}>
                {designation}
              </Typography>
              <Typography
                noWrap
                title={email || undefined}
                sx={{ fontSize: 11.5, color: "text.secondary", mt: 0.35 }}
              >
                {email || "—"}
              </Typography>
            </Box>

            {/* Right: the badge facts, right-aligned so they read as one column. */}
            <Box
              sx={{
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 0.5,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <CodeChip code={employee.employeeCode} />
                <BloodChip value={bloodGroup} />
              </Box>
              <Detail label="Joined" value={joined} align="right" />
            </Box>
          </Box>

          {/* Its own line, not the trailing edge: the buttons beside these two
              columns would leave under 200px for both at 360px. Most viewers get no
              row at all — `renderRowActions` returns null on a colleague's card
              unless you manage employees — so the common phone card stays the
              three-line band the layout is for. */}
          {actions ? (
            <Box sx={{ display: "flex", pt: 1.25, mt: 1.25, borderTop: 1, borderColor: "divider" }}>
              {actions}
            </Box>
          ) : null}
        </Box>
      </GlassCard>
    );
  }

  // ── Desktop: portrait badge — rail on top, 2x2 details below ────────────────
  return (
    <GlassCard {...cardProps} sx={{ ...shell, flexDirection: "column" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.75,
          px: 2,
          py: 2,
          background: RAIL,
          minWidth: 0,
        }}
      >
        <Photo src={employee.avatar} name={name} size={68} active={active} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {nameLink(true)}
          <Typography
            noWrap
            title={designation}
            sx={{ fontSize: 12.5, fontWeight: 500, color: RAIL_MUTED, mt: 0.25 }}
          >
            {designation}
          </Typography>
          <Box sx={{ mt: 0.75 }}>
            <CodeChip code={employee.employeeCode} onRail />
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          px: 2,
          py: 1.75,
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            display: "grid",
            // NOT two equal columns. Blood group is three characters and joining
            // date is ten, so an even split spent half the card on a value that
            // could never use it while the email beside it truncated to
            // "aabidpatel096@gm…". The left track is sized to its content
            // (`max-content`, capped) and the right one takes everything left over.
            // minmax(0, …) on the wide track so a long address ellipsizes instead of
            // forcing the tile past its grid cell.
            gridTemplateColumns: "minmax(0, max-content) minmax(0, 1fr)",
            rowGap: 1.5,
            columnGap: 2,
          }}
        >
          <Detail label="Blood Group" value={bloodGroup} />
          <Detail label="Email" value={email} />
          <Detail
            label="Phone"
            value={formatPhoneWithCode(employee.companyPhoneNumber, employee.companyPhoneExtension, "—")}
          />
          <Detail label="Joined" value={joined} />
        </Box>

        {/* Full width, above a hairline: the buttons carry names now, and three
            named buttons pushed into a corner leave the rest of the row visibly
            empty. `mt: auto` pins the row to the bottom so tiles of unequal height
            still line their actions up. No stopPropagation needed — each is a real
            <button>, and the card's open handler already skips those. */}
        {actions ? (
          <Box
            sx={{
              display: "flex",
              mt: "auto",
              pt: 1.5,
              borderTop: 1,
              borderColor: "divider",
            }}
          >
            {actions}
          </Box>
        ) : null}
      </Box>
    </GlassCard>
  );
};

export default memo(EmployeeCard);
