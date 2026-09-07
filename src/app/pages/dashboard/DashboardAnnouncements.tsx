/**
 * The dashboard announcements panel.
 *
 * An announcement is a poster, so it is shown as one: the image fills the whole card and the
 * words sit on top of it. Previously the card gave the image a 150px thumbnail slot and spent
 * the rest of the space on a description truncated at 150 characters — the worst of both, a
 * picture too small to read and a text too short to be complete.
 *
 * At rest you see the poster and its title. On hover — or focus, or a tap on touch — a panel
 * slides up over it with a blurred backdrop carrying the whole thing: title, full description,
 * posted date. Several announcements cross-fade as a carousel: auto-advancing, paused while a
 * reader is engaged with the card, with dots and arrows to drive it by hand.
 *
 * Two things are delegated to `announcementPoster.ts`: the card is pinned to `POSTER_ASPECT`, the
 * same ratio the upload guard enforces, so a poster is never cropped or upscaled; and the ink is
 * chosen per region from the image itself, so a white poster gets dark text instead of the white
 * text that would vanish into it.
 *
 * The outer `col-lg-7` is the parent dashboard row's contract (DashboardWrapper is a Bootstrap
 * grid); everything inside it is MUI + kit tokens, per the UI standard.
 */
import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, IconButton, Paper, Stack, Typography } from "@mui/material";
import SVG from "react-inlinesvg";
import { KTIcon } from "@metronic/helpers";
import { miscellaneousIcons } from "../../../_metronic/assets/miscellaneousicons";
import { formatDate } from "@utils/date";
import { getAllAnnouncements } from "@services/company";
import { RootState } from "@redux/store";
import { T, WtButton, hoverLiftSx } from "@app/modules/common/components/ui";
import {
  POSTER_ASPECT,
  usePosterInk,
  type PosterInk,
} from "@pages/company/announcement/announcementPoster";
import PosterFrame from "@pages/company/announcement/PosterFrame";

interface IAnnouncement {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  shareWith: string;
  departmentId?: string | null;
  fromDate: string;
  toDate: string;
  createdAt: string;
  isActive: boolean;
  selectedUsers?: any[];
  department?: any | null;
}

/** How long a slide holds before the carousel moves on. */
const SLIDE_MS = 6000;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * The two palettes for text sitting ON a poster, picked per region by `usePosterInk`.
 *
 * These values are deliberately literal rather than themed. Their job is contrast against a
 * photograph, and the photograph does not change with the app theme — ink that followed the
 * theme would turn white-on-white in light mode, which is the exact bug this fixes.
 */
const ON_IMAGE: Record<PosterInk, {
  text: string; textSoft: string; textFaint: string; hairline: string;
  halo: string; control: string; controlHover: string; buttonBg: string;
  panel: string; topScrim: string; bottomScrim: string;
}> = {
  // A dark region: keep the ink light and deepen the region behind it.
  light: {
    text: "#FFFFFF",
    textSoft: "rgba(255,255,255,0.88)",
    textFaint: "rgba(255,255,255,0.68)",
    hairline: "rgba(255,255,255,0.45)",
    halo: "0 2px 12px rgba(0,0,0,0.55)",
    control: "rgba(10,17,38,0.42)",
    controlHover: "rgba(10,17,38,0.68)",
    buttonBg: "rgba(255,255,255,0.14)",
    panel: "rgba(10,17,38,0.62)",
    topScrim: "linear-gradient(to bottom, rgba(8,15,35,0.66) 0%, rgba(8,15,35,0) 100%)",
    bottomScrim: "linear-gradient(to top, rgba(8,15,35,0.80) 0%, rgba(8,15,35,0) 100%)",
  },
  // A light region: flip the ink to near-black and wash the region white instead of dark, so the
  // poster is still lightened rather than muddied.
  dark: {
    text: "#0B1220",
    textSoft: "rgba(11,18,32,0.82)",
    textFaint: "rgba(11,18,32,0.60)",
    hairline: "rgba(11,18,32,0.24)",
    halo: "0 1px 10px rgba(255,255,255,0.75)",
    control: "rgba(255,255,255,0.70)",
    controlHover: "rgba(255,255,255,0.92)",
    buttonBg: "rgba(255,255,255,0.55)",
    panel: "rgba(246,248,252,0.74)",
    topScrim: "linear-gradient(to bottom, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0) 100%)",
    bottomScrim: "linear-gradient(to top, rgba(255,255,255,0.86) 0%, rgba(255,255,255,0) 100%)",
  },
};

const DashboardAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<IAnnouncement[]>([]);
  const [index, setIndex] = useState(0);
  // One flag, three triggers: pointer hover, keyboard focus, and a tap on touch — where there
  // is no hover at all and the panel would otherwise be unreachable.
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const navigate = useNavigate();

  // Extract userId as a primitive to prevent unnecessary re-renders and API calls
  const employeeUserId = useSelector(
    (state: RootState) => state.employee.currentEmployee?.userId
  );

  // Expired announcements (toDate already past) never reach the carousel.
  const items = useMemo(() => {
    const now = new Date().getTime();
    return announcements.filter((a) => new Date(a.toDate).getTime() >= now);
  }, [announcements]);

  const current = items[index] ?? null;
  const hasPoster = !!current;

  // The ink follows the slide on screen, so a light poster and a dark one in the same carousel
  // each get the treatment they need.
  const ink = usePosterInk(current?.imageUrl);
  const top = ON_IMAGE[hasPoster ? ink.top : "light"];
  const bottom = ON_IMAGE[hasPoster ? ink.bottom : "light"];

  // A shrinking list must never leave the index pointing past its end.
  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [items.length, index]);

  // Auto-advance, paused while the reader is engaged with the card.
  useEffect(() => {
    if (items.length < 2 || expanded) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, [items.length, expanded]);

  useEffect(() => {
    if (!employeeUserId) return;

    async function fetchAnnouncements() {
      try {
        const {
          data: { announcements },
        } = await getAllAnnouncements("me");
        setAnnouncements(announcements ?? []);
      } catch (error) {
        console.error("Error fetching announcements:", error);
        setAnnouncements([]);
      }
    }

    fetchAnnouncements();
  }, [employeeUserId]);

  // On touch there is no hover, so the panel opens on a tap — and must then close on a tap
  // anywhere else, or it would cover the poster with no way back.
  useEffect(() => {
    if (!expanded) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (!cardRef.current?.contains(e.target as Node)) setExpanded(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [expanded]);

  const step = (delta: number) =>
    setIndex((i) => (i + delta + items.length) % items.length);

  const header = (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent={hasPoster ? "flex-end" : "space-between"}
      spacing={1}
      sx={{ position: "relative", zIndex: 4 }}
    >
      {/* The "Announcements" heading is only drawn when there is NO poster. Over one it competed
          with the artwork's own headline — a poster already says what it is, and labelling it was
          costing the top-left corner of every image. */}
      {!hasPoster && (
        <Typography
          component="h5"
          sx={{
            fontFamily: "Barlow",
            fontWeight: 700,
            fontSize: "clamp(16px, 4vw, 20px)",
            letterSpacing: "0.2px",
            color: "text.primary",
          }}
        >
          Announcements
        </Typography>
      )}
      <WtButton
        ghost={!hasPoster}
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          navigate("/company/announcements");
        }}
        // A quiet corner affordance, not a call to action: the kit's CTA metrics (46px tall,
        // 14.5px bold) made it the loudest thing on a card whose subject is the poster.
        //
        // `background`, not `bgcolor`: the CTA recipe paints a gradient through the `background`
        // shorthand, which would sit on top of a `background-color` set here and win.
        sx={{
          minHeight: 0,
          px: 1.5,
          py: 0.5,
          fontSize: 12.5,
          fontWeight: 600,
          borderRadius: "8px",
          ...(hasPoster && {
            background: top.buttonBg,
            color: top.text,
            border: `1px solid ${top.hairline}`,
            backdropFilter: "blur(6px)",
            boxShadow: "none",
            "&:hover": { background: top.controlHover, color: top.text, boxShadow: "none" },
          }),
        }}
      >
        view all
      </WtButton>
    </Stack>
  );

  return (
    <div className="col-lg-7 col-md-12 mb-3 mb-lg-0 d-flex flex-column">
      <Paper
        ref={cardRef}
        elevation={0}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        onFocus={() => setExpanded(true)}
        onClick={() => hasPoster && setExpanded((v) => !v)}
        sx={{
          ...hoverLiftSx("subtle"),
          position: "relative",
          overflow: "hidden",
          // A stable shape for the dashboard row. The poster inside is fitted, not cropped to it
          // (see PosterFrame), so this ratio costs the artwork nothing. `minHeight` takes over on
          // a phone, where the ratio alone would leave a 120px-tall letterbox.
          aspectRatio: POSTER_ASPECT,
          minHeight: 320,
          borderRadius: 2,
          boxShadow: "12px 12px 44px 0px rgba(0,0,0,0.08)",
          cursor: hasPoster ? "pointer" : "default",
        }}
      >
        {!hasPoster ? (
          <Stack sx={{ height: "100%", p: { xs: 2, md: 3 } }}>
            {header}
            <Stack
              direction="row"
              spacing={2}
              flexWrap="wrap"
              alignItems="center"
              justifyContent="center"
              sx={{ flex: 1 }}
            >
              <SVG src={miscellaneousIcons.announcementHorn} className="menu-svg-icon" />
              <Box>
                <Typography sx={{ fontWeight: 600, mb: 0.5 }}>No Announcements Found</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  No announcements have been created yet.
                </Typography>
              </Box>
            </Stack>
          </Stack>
        ) : (
          <>
            {/* ── the posters, cross-fading ── */}
            {items.map((a, i) => (
              <Box
                key={a.id}
                aria-hidden={i !== index}
                sx={{
                  position: "absolute",
                  inset: 0,
                  opacity: i === index ? 1 : 0,
                  transition: `opacity 600ms ${EASE}`,
                  pointerEvents: "none",
                }}
              >
                <PosterFrame
                  src={a.imageUrl}
                  fallback={
                    <Box
                      sx={{
                        width: "100%",
                        height: "100%",
                        display: "grid",
                        placeItems: "center",
                        background: T.color.brandGradientLeftToRight,
                      }}
                    >
                      <SVG src={miscellaneousIcons.announcementHorn} className="menu-svg-icon" />
                    </Box>
                  }
                />
              </Box>
            ))}

            {/* Scrims, one per text region and each in its region's own direction: they lift
                contrast where the words are without touching the middle of the poster. */}
            <Box sx={{ position: "absolute", insetInline: 0, top: 0, height: "42%", background: top.topScrim, pointerEvents: "none", transition: "background 300ms linear" }} />
            <Box sx={{ position: "absolute", insetInline: 0, bottom: 0, height: "55%", background: bottom.bottomScrim, pointerEvents: "none", transition: "background 300ms linear" }} />

            <Stack sx={{ position: "relative", zIndex: 2, height: "100%", p: { xs: 2, md: 3 } }}>
              {header}

              {/* ── at rest: the title only, so the poster stays the subject ── */}
              <Box
                sx={{
                  mt: "auto",
                  opacity: expanded ? 0 : 1,
                  transform: expanded ? "translateY(8px)" : "none",
                  transition: `opacity 220ms ${EASE}, transform 320ms ${EASE}`,
                }}
              >
                <Typography
                  component="h6"
                  sx={{
                    fontFamily: "Barlow",
                    fontWeight: 600,
                    fontSize: "clamp(16px, 3.5vw, 19px)",
                    lineHeight: 1.3,
                    color: bottom.text,
                    textShadow: bottom.halo,
                  }}
                >
                  {current.title}
                </Typography>
              </Box>
            </Stack>

            {/* ── the slide-in panel ── */}
            <Stack
              spacing={1}
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 3,
                maxHeight: "78%",
                px: 2.5,
                pt: 2.25,
                pb: 2.5,
                bgcolor: bottom.panel,
                backdropFilter: "blur(16px) saturate(140%)",
                WebkitBackdropFilter: "blur(16px) saturate(140%)",
                borderTop: `1px solid ${bottom.hairline}`,
                transform: expanded ? "translateY(0)" : "translateY(101%)",
                opacity: expanded ? 1 : 0,
                transition: `transform 420ms ${EASE}, opacity 260ms ${EASE}`,
                pointerEvents: expanded ? "auto" : "none",
                "@media (prefers-reduced-motion: reduce)": { transition: "opacity 120ms linear" },
              }}
            >
              <Typography
                component="h6"
                sx={{
                  fontFamily: "Barlow",
                  fontWeight: 600,
                  fontSize: "clamp(16px, 3.5vw, 19px)",
                  lineHeight: 1.3,
                  color: bottom.text,
                }}
              >
                {current.title}
              </Typography>

              <Typography
                sx={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: bottom.textSoft,
                  whiteSpace: "pre-wrap",
                  overflowY: "auto",
                  maxHeight: 150,
                  scrollbarWidth: "thin",
                }}
              >
                {current.description}
              </Typography>

              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                flexWrap="wrap"
                spacing={1.5}
                sx={{ pt: 0.5 }}
              >
                {current.createdAt && (
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: bottom.textFaint }}>
                    Posted on {formatDate(new Date(current.createdAt))}
                  </Typography>
                )}
                {items.length > 1 && (
                  <Typography sx={{ fontSize: 11, color: bottom.textFaint }}>
                    {index + 1} of {items.length}
                  </Typography>
                )}
              </Stack>
            </Stack>

            {/* ── carousel controls ── */}
            {items.length > 1 && (
              <>
                {([
                  { dir: -1, icon: "arrow-left", edge: { left: 10 }, label: "Previous announcement" },
                  { dir: 1, icon: "arrow-right", edge: { right: 10 }, label: "Next announcement" },
                ] as const).map((btn) => (
                  <IconButton
                    key={btn.icon}
                    aria-label={btn.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      step(btn.dir);
                    }}
                    sx={{
                      position: "absolute",
                      top: "50%",
                      ...btn.edge,
                      transform: "translateY(-50%)",
                      zIndex: 5,
                      width: 34,
                      height: 34,
                      // Mid-height, between the two sampled bands — the top band's answer is the
                      // closer of the two and reads correctly in practice.
                      color: top.text,
                      bgcolor: top.control,
                      border: `1px solid ${top.hairline}`,
                      backdropFilter: "blur(8px)",
                      opacity: expanded ? 1 : 0,
                      transition: `opacity 220ms ${EASE}`,
                      pointerEvents: expanded ? "auto" : "none",
                      "&:hover": { bgcolor: top.controlHover },
                    }}
                  >
                    <KTIcon iconName={btn.icon} className="fs-4" />
                  </IconButton>
                ))}

                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 5 }}
                >
                  {items.map((a, i) => (
                    <Box
                      key={a.id}
                      component="button"
                      type="button"
                      aria-label={`Show announcement ${i + 1}`}
                      aria-current={i === index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIndex(i);
                      }}
                      sx={{
                        width: i === index ? 20 : 7,
                        height: 7,
                        p: 0,
                        border: "none",
                        borderRadius: 999,
                        cursor: "pointer",
                        bgcolor: i === index ? top.text : top.hairline,
                        transition: `width 320ms ${EASE}, background-color 220ms ${EASE}`,
                      }}
                    />
                  ))}
                </Stack>
              </>
            )}
          </>
        )}
      </Paper>
    </div>
  );
};

export default DashboardAnnouncements;
