import { useCallback, useEffect, useState } from "react";
import { Box, CircularProgress, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { KTIcon } from "@metronic/helpers";
import { GlassDialog, GlassHeader, WhatsAppIcon, WtButton, toast } from "@app/modules/common/components/ui";
import {
  fetchBirthdayCard,
  fetchBirthdayCardImage,
  type BirthdayCardKind,
  type BirthdayCardOrientation,
} from "@services/employee";
import { downloadBlob, toFileNameStem } from "@utils/svgExport";
import { canShareFileType, shareFile, whatsAppShareUrl } from "@utils/webShare";

/**
 * "Birthday Card" — preview someone's card, download it, or send it.
 *
 * The card is DRAWN ON THE SERVER and this dialog shows the finished PNG. It used to be
 * a React SVG rasterised here through a `<canvas>`; that component is gone, along with
 * the copy of the artwork it carried in the bundle.
 *
 * The reason is not tidiness. The same card has to go out by email from a cron job,
 * which has no browser to run a component in, so the drawing had to exist on the server
 * regardless. A second copy here would only have bought a preview that could disagree
 * with what was actually sent — different fonts, a different rasteriser, and no way to
 * notice. What is on screen now is the exact image the recipient gets.
 *
 * The orientation switch stays, because the card still has two jobs: 16:9 for the office
 * TV, 4:5 for sending to the person. Switching now costs a request rather than a
 * re-render, which react-query caches per shape.
 */

/** Portrait downloads at 2× → 2160 × 2700. Landscape's artboard is already a TV's grid. */
const DOWNLOAD_SCALE_PORTRAIT = 2;
const DOWNLOAD_SCALE_LANDSCAPE = 1;

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
  const [orientation, setOrientation] = useState<BirthdayCardOrientation>("portrait");
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  /** Name and organisation — what titles the dialog and captions a share. */
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["birthday-card", kind, personId],
    queryFn: () => fetchBirthdayCard(kind, personId),
    enabled: open && Boolean(personId),
    staleTime: 5 * 60 * 1000,
  });

  /**
   * The card itself, at 1×.
   *
   * Held in hand rather than fetched on demand, and that is what makes sharing work:
   * `navigator.share` requires the click's transient user activation, and a round trip
   * to the server inside the handler spends it. The preview has already paid that cost.
   */
  const {
    data: cardBlob,
    isLoading: imageLoading,
    isError: imageError,
    refetch: refetchImage,
  } = useQuery({
    queryKey: ["birthday-card-image", kind, personId, orientation],
    queryFn: () => fetchBirthdayCardImage(kind, personId, orientation, 1),
    enabled: open && Boolean(personId),
    staleTime: 5 * 60 * 1000,
  });

  /** An object URL lives as long as the blob it wraps; revoke it or the tab keeps the bytes. */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!cardBlob) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(cardBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [cardBlob]);

  const fileName = useCallback(
    (who: string) => `${toFileNameStem(who, "birthday")}-Birthday-${orientation === "landscape" ? "TV" : "Card"}.png`,
    [orientation],
  );

  const handleDownload = useCallback(async () => {
    if (!data) return;
    setDownloading(true);
    try {
      // Fetched fresh rather than reusing the preview: a download is the one place the
      // extra resolution is worth the wait.
      const blob = await fetchBirthdayCardImage(
        kind,
        personId,
        orientation,
        orientation === "landscape" ? DOWNLOAD_SCALE_LANDSCAPE : DOWNLOAD_SCALE_PORTRAIT,
      );
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
  }, [data, kind, personId, orientation, fileName]);

  /**
   * Share the card as an image.
   *
   * Where the platform supports it, the PNG goes to the OS share sheet already attached —
   * the user picks WhatsApp and it arrives as a normal image. A page cannot post into a
   * chat without that pick; the sheet is the platform's consent step and no browser lets
   * a site skip it.
   *
   * Where it isn't supported (desktop Firefox, older browsers) the card downloads and
   * WhatsApp Web opens with the caption prefilled, for the user to attach. That window is
   * opened BEFORE any await: once the click's user activation has been spent, popup
   * blockers reject it.
   */
  const handleWhatsAppShare = useCallback(async () => {
    if (!data || !cardBlob) return;

    const { name } = data.person;
    // No age in the caption either — the card carries none, and neither does this.
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
      if (canShare) {
        const outcome = await shareFile({
          file: new File([cardBlob], fileName(name), { type: "image/png" }),
          title: "Birthday Card",
          text: caption,
        });
        // 'dismissed' is the user closing the sheet — say nothing, they know.
        if (outcome === "shared" || outcome === "dismissed") return;
      }

      downloadBlob(cardBlob, fileName(name));
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
  }, [data, cardBlob, fileName]);

  const title = data?.person.name || personName || "Birthday";
  const busy = downloading || sharing;
  const cardReady = Boolean(previewUrl) && !imageLoading;

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
                1080 × 1350 artboard would push the buttons off the bottom. The box holds
                the artboard's own ratio so switching shape does not make the dialog jump. */}
            <Box
              sx={{
                maxWidth: orientation === "landscape" ? 760 : 430,
                width: "100%",
                mx: "auto",
                aspectRatio: orientation === "landscape" ? "16 / 9" : "1080 / 1350",
                borderRadius: 3,
                overflow: "hidden",
                boxShadow: "0 18px 44px -18px rgba(15, 23, 42, 0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "action.hover",
              }}
            >
              {imageError ? (
                <Stack alignItems="center" spacing={1.25} sx={{ textAlign: "center", p: 2 }}>
                  <KTIcon iconName="information-5" className="fs-2x text-danger" />
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    The card could not be drawn.
                  </Typography>
                  <WtButton ghost onClick={() => refetchImage()}>Try Again</WtButton>
                </Stack>
              ) : previewUrl ? (
                <Box
                  component="img"
                  src={previewUrl}
                  alt={`Birthday card for ${data.person.name}`}
                  sx={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }}
                />
              ) : (
                <CircularProgress size={26} />
              )}
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
                disabled={busy || !cardReady}
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
                disabled={busy || !cardReady}
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
