import { useCallback, useRef, useState } from "react";
import { Box, CircularProgress, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { KTIcon } from "@metronic/helpers";
import { GlassDialog, GlassHeader, WhatsAppIcon, WtButton, toast } from "@app/modules/common/components/ui";
import { fetchBirthdayCard, type BirthdayCardKind } from "@services/employee";
import { downloadBlob, svgToPngBlob, toFileNameStem } from "@utils/svgExport";
import { canShareFileType, shareFile, whatsAppShareUrl } from "@utils/webShare";
import BirthdayCard, { type BirthdayCardOrientation } from "./BirthdayCard";

/**
 * "Birthday Card" — preview someone's card, download it, or send it.
 *
 * Deliberately the ID-card dialog's twin: same fetch-don't-compose shape, same
 * client-side rasterisation of the exact SVG on screen, same share path. The card is
 * fetched from `/api/employee/birthday-card/:kind/:id`, which returns the name, the
 * photo and the org logo as `data:` URIs so the export canvas stays untainted.
 *
 * The one thing this dialog has that the badge does not is the orientation switch,
 * because the card has two jobs: 16:9 for the office TV, 4:5 for sending to the
 * person. Both are the same drawing (see `BirthdayCard`), so switching is instant and
 * the download always matches what is on screen.
 */

/** Landscape exports at 1× — the artboard IS 1920 × 1080, already a TV's native grid. */
const EXPORT_SCALE_LANDSCAPE = 1;
/** Portrait at 2× → 2160 × 2700, comfortably past what any phone will render. */
const EXPORT_SCALE_PORTRAIT = 2;
/**
 * Sharing renders at 1× in both shapes. Messaging apps re-compress whatever they are
 * given, so extra pixels buy nothing — and the smaller canvas rasterises fast enough
 * to stay inside the click's transient user activation window, which `navigator.share`
 * requires.
 */
const SHARE_SCALE = 1;

export interface BirthdayCardDialogProps {
  open: boolean;
  onClose: () => void;
  /** Which table the id belongs to. */
  kind: BirthdayCardKind;
  /** The USER's id for an employee (where the date of birth lives), the contact's own for a contact. */
  personId: string;
  /** Shown in the header while the card loads, so the dialog is never anonymous. */
  personName?: string;
}

export default function BirthdayCardDialog({ open, onClose, kind, personId, personName }: BirthdayCardDialogProps) {
  const cardRef = useRef<SVGSVGElement>(null);
  const [orientation, setOrientation] = useState<BirthdayCardOrientation>("portrait");
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["birthday-card", kind, personId],
    queryFn: () => fetchBirthdayCard(kind, personId),
    enabled: open && Boolean(personId),
    staleTime: 5 * 60 * 1000,
  });

  const fileName = useCallback(
    (who: string) => `${toFileNameStem(who, "birthday")}-Birthday-${orientation === "landscape" ? "TV" : "Card"}.png`,
    [orientation],
  );

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || !data) return;
    setDownloading(true);
    try {
      const blob = await svgToPngBlob(cardRef.current, {
        scale: orientation === "landscape" ? EXPORT_SCALE_LANDSCAPE : EXPORT_SCALE_PORTRAIT,
      });
      downloadBlob(blob, fileName(data.person.name));
      toast({
        icon: "success",
        title: "Birthday card downloaded",
        text: `${data.person.name}'s card was saved to your device.`,
      });
    } catch (err) {
      toast({
        icon: "error",
        title: "Download failed",
        text: (err as Error)?.message || "The card could not be saved. Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  }, [data, orientation, fileName]);

  /**
   * Share the card as an image.
   *
   * Where the platform supports it, the rendered PNG goes to the OS share sheet
   * already attached — the user picks WhatsApp and it arrives as a normal image. A
   * page cannot post into a chat without that pick; the sheet is the platform's
   * consent step and no browser lets a site skip it.
   *
   * Where it isn't supported (desktop Firefox, older browsers) the card downloads and
   * WhatsApp Web opens with the caption prefilled, for the user to attach. That window
   * is opened BEFORE the first `await`: once the click's user activation has been spent
   * rasterising, popup blockers reject it.
   */
  const handleWhatsAppShare = useCallback(async () => {
    if (!cardRef.current || !data) return;

    const { name } = data.person;
    // No age here either — see the note on `BirthdayCard`. The caption says who it is
    // from, not how old they are.
    const caption = [
      `Happy Birthday, ${name}!`,
      data.organization.name ? `— ${data.organization.name}` : null,
    ]
      .filter(Boolean)
      .join(" ");

    const canShare = canShareFileType("image/png");
    // `noopener` means Chrome hands back null even on success, so the tab's fate is not
    // observable — the fallback toast is worded to hold either way.
    if (!canShare) window.open(whatsAppShareUrl(caption), "_blank", "noopener,noreferrer");

    setSharing(true);
    try {
      const blob = await svgToPngBlob(cardRef.current, { scale: SHARE_SCALE });

      if (canShare) {
        const outcome = await shareFile({
          file: new File([blob], fileName(name), { type: "image/png" }),
          title: "Birthday Card",
          text: caption,
        });
        // 'dismissed' is the user closing the sheet — say nothing, they know.
        if (outcome === "shared" || outcome === "dismissed") return;
      }

      downloadBlob(blob, fileName(name));
      toast({
        icon: "info",
        title: "Card ready to attach",
        text: "This browser can't hand files to WhatsApp directly, so the card was saved to your device — attach it in WhatsApp to send it.",
        timer: 4600,
      });
    } catch (err) {
      toast({
        icon: "error",
        title: "Share failed",
        text: (err as Error)?.message || "The card could not be shared. Please try again.",
      });
    } finally {
      setSharing(false);
    }
  }, [data, fileName]);

  const title = data?.person.name || personName || "Birthday";
  const busy = downloading || sharing;

  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      header={
        <GlassHeader
          title="Birthday Card"
          subtitle={title}
          icon={<KTIcon iconName="gift" className="fs-1" />}
          onClose={onClose}
        />
      }
    >
      <Box sx={{ p: { xs: 2, sm: 2.75 }, display: "flex", flexDirection: "column", gap: 2.25 }}>
        {isLoading ? (
          <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: 320 }}>
            <CircularProgress size={30} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Generating the birthday card…
            </Typography>
          </Stack>
        ) : isError ? (
          <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: 320, textAlign: "center" }}>
            <KTIcon iconName="information-5" className="fs-3x text-danger" />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              The birthday card could not be generated
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 420 }}>
              {(error as Error)?.message || "Something went wrong while loading this person's details."}
            </Typography>
            <WtButton inverted onClick={() => refetch()}>Try Again</WtButton>
          </Stack>
        ) : data ? (
          <>
            <ToggleButtonGroup
              value={orientation}
              exclusive
              size="small"
              onChange={(_, next) => next && setOrientation(next)}
              sx={{ alignSelf: "center" }}
            >
              <ToggleButton value="portrait" sx={{ textTransform: "none", px: 2 }}>
                <KTIcon iconName="phone" className="fs-5 me-2" />
                To send · 4:5
              </ToggleButton>
              <ToggleButton value="landscape" sx={{ textTransform: "none", px: 2 }}>
                <KTIcon iconName="screen" className="fs-5 me-2" />
                For the TV · 16:9
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Capped so the portrait card cannot outgrow the dialog: at full width its
                1080 × 1350 artboard would push the buttons off the bottom. */}
            <Box
              sx={{
                maxWidth: orientation === "landscape" ? 760 : 430,
                width: "100%",
                mx: "auto",
                borderRadius: 3,
                overflow: "hidden",
                boxShadow: "0 18px 44px -18px rgba(15, 23, 42, 0.45)",
              }}
            >
              <BirthdayCard ref={cardRef} data={data} orientation={orientation} />
            </Box>

            <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center" }}>
              Name and photo come from this person's record. Downloads as a PNG —
              {orientation === "landscape" ? " 1920 × 1080, sized for a TV" : " 2160 × 2700, sized for sharing"}.
            </Typography>

            {/* Both CTAs are `flat`: the kit's coloured glow is tuned for ONE hero button
                on a surface, and side by side the green and navy halos bloom into each
                other. */}
            <Stack
              direction={{ xs: "column-reverse", sm: "row" }}
              spacing={1.25}
              justifyContent="flex-end"
              sx={{ pt: 0.5 }}
            >
              <WtButton ghost onClick={onClose} sx={{ width: { xs: "100%", sm: "auto" } }}>
                Close
              </WtButton>
              <WtButton
                tone="success"
                flat
                onClick={handleWhatsAppShare}
                disabled={busy}
                startIcon={
                  sharing
                    ? <CircularProgress size={16} sx={{ color: "inherit" }} />
                    // Inline SVG, not the KTIcon font: the duotone glyph paints its main
                    // layer at 40% opacity, barely visible on the green button.
                    : <WhatsAppIcon size={19} />
                }
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                {sharing ? "Preparing…" : "Share on WhatsApp"}
              </WtButton>
              <WtButton
                flat
                onClick={handleDownload}
                disabled={busy}
                startIcon={
                  downloading
                    ? <CircularProgress size={16} sx={{ color: "inherit" }} />
                    : <KTIcon iconName="cloud-download" className="fs-4" />
                }
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                {downloading ? "Preparing…" : "Download Card"}
              </WtButton>
            </Stack>
          </>
        ) : null}
      </Box>
    </GlassDialog>
  );
}
