import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Slider, Typography } from '@mui/material';
import Cropper from 'react-easy-crop';
import {
  GlassDialog,
  GlassHeader,
  SegmentedControl,
  WtButton,
} from '@app/modules/common/components/ui';

/**
 * Profile photo editor — crop, rotate, flip, filter and adjust.
 *
 * ─── WHY THE OUTPUT IS ALWAYS JPEG ───────────────────────────────────────────
 * The previous version cropped to a JPEG blob and then wrapped it in
 * `new File([blob], currentFile.name, { type: currentFile.type })` — so a PNG
 * upload produced a file NAMED `.png`, TYPED `image/png`, containing JPEG bytes.
 * The server sniffs magic bytes and rejects a file whose extension disagrees with
 * its contents, so that combination is refused outright. Canvas re-encodes whatever
 * comes in, so the name and type are set from what is actually written.
 *
 * ─── WHY FILTERS ARE APPLIED TWICE ───────────────────────────────────────────
 * Once as a CSS `filter` for the live preview, and again as `ctx.filter` when the
 * canvas renders the final image. Both read the same string, so what you see is what
 * is saved — the alternative is a preview that lies.
 *
 * ─── COLOUR ──────────────────────────────────────────────────────────────────
 * Every surface, border and accent comes from the MUI theme. The one deliberate
 * exception is the crop stage, which is a fixed near-black in both themes: it is a
 * photo viewport, and a stage that changes tone with the theme changes how the
 * photo itself reads.
 */

export interface PhotoEdits {
  rotation: number;
  flipH: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
}

const NEUTRAL: PhotoEdits = {
  rotation: 0,
  flipH: false,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
};

/** Named looks, expressed in the same adjustment vocabulary the sliders use — so a
 *  preset is a starting point the user can then tune, not a separate mode. */
const FILTERS: Array<{ id: string; label: string; edits: Partial<PhotoEdits> }> = [
  { id: 'original', label: 'Original', edits: {} },
  { id: 'studio', label: 'Studio', edits: { brightness: 108, contrast: 108, saturation: 104 } },
  { id: 'soft', label: 'Soft', edits: { brightness: 106, contrast: 94, saturation: 96 } },
  { id: 'sharp', label: 'Sharp', edits: { brightness: 100, contrast: 122, saturation: 108 } },
  { id: 'warm', label: 'Warm', edits: { brightness: 104, saturation: 112, warmth: 18 } },
  { id: 'cool', label: 'Cool', edits: { brightness: 102, saturation: 96, warmth: -16 } },
  { id: 'mono', label: 'Mono', edits: { saturation: 0, contrast: 110 } },
];

/** One filter string for both the preview and the canvas. `sepia` stands in for
 *  warmth: it is the only filter primitive that shifts hue without a colour matrix,
 *  and a negative warmth becomes a hue rotation towards blue. */
const filterString = (e: PhotoEdits) => {
  const parts = [
    `brightness(${e.brightness}%)`,
    `contrast(${e.contrast}%)`,
    `saturate(${e.saturation}%)`,
  ];
  if (e.warmth > 0) parts.push(`sepia(${e.warmth}%)`);
  if (e.warmth < 0) parts.push(`hue-rotate(${e.warmth * 1.6}deg)`);
  return parts.join(' ');
};

/**
 * A horizontally mirrored copy of the source.
 *
 * Flip is applied to the IMAGE rather than passed as a transform, because
 * react-easy-crop owns its own transform: it carries the base scale that fits the
 * media to the crop area (`objectFit: contain`). Overriding `transform` to add
 * `scaleX(-1)` dropped that base scale, so the photo rendered at its natural size
 * and spilled far outside the circle — which is why so little of it fitted.
 *
 * Flipping the source instead keeps the library's maths intact AND means the crop
 * coordinates already describe the mirrored image, so the canvas needs no flip of
 * its own and the preview cannot disagree with the output.
 */
const mirrorImage = (imageSrc: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No 2D context'));
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.translate(image.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(image, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    image.onerror = () => reject(new Error('Image could not be loaded'));
    image.src = imageSrc;
  });

/**
 * The most pixels any surface asks of this photo: the birthday card's portrait circle
 * is 400 user units and that card exports at 2× (`BirthdayCardDialog`), so 800 square.
 * Crops below it are upscaled at render time and go soft.
 */
const CARD_PHOTO_PIXELS = 800;

/**
 * Render the cropped region with every edit baked in.
 *
 * Rotation makes this more than a `drawImage` of a rectangle: the crop box is in
 * the ROTATED image's coordinates, so the source is first drawn into a canvas large
 * enough to hold it at any angle, and the crop is taken from that.
 */
const renderEditedImage = (
  imageSrc: string,
  crop: { x: number; y: number; width: number; height: number },
  edits: PhotoEdits,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No 2D context'));

      const radians = (edits.rotation * Math.PI) / 180;
      const sin = Math.abs(Math.sin(radians));
      const cos = Math.abs(Math.cos(radians));
      // The bounding box the rotated image needs, so no corner is clipped.
      const boxW = image.width * cos + image.height * sin;
      const boxH = image.width * sin + image.height * cos;

      canvas.width = boxW;
      canvas.height = boxH;

      ctx.filter = filterString(edits);
      ctx.translate(boxW / 2, boxH / 2);
      ctx.rotate(radians);
      ctx.drawImage(image, -image.width / 2, -image.height / 2);

      // Composite rather than getImageData.
      //
      // Zooming out below 1 lets the crop circle extend PAST the edges of the photo,
      // so the crop rect can start at a negative offset or run beyond the canvas —
      // getImageData either throws or returns transparent pixels there, and
      // transparency becomes black once JPEG drops the alpha channel. Drawing the
      // rotated canvas into a white output canvas treats the overhang as padding,
      // which is what a portrait on a white ID card should look like anyway.
      const out = document.createElement('canvas');
      const outCtx = out.getContext('2d');
      if (!outCtx) return reject(new Error('No 2D context'));
      out.width = crop.width;
      out.height = crop.height;
      outCtx.fillStyle = '#ffffff';
      outCtx.fillRect(0, 0, crop.width, crop.height);
      outCtx.drawImage(canvas, -crop.x, -crop.y);

      out.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Canvas is empty'))),
        'image/jpeg',
        0.92,
      );
    };
    image.onerror = () => reject(new Error('Image could not be loaded'));
    image.src = imageSrc;
  });

/**
 * Labelled slider with a live readout and single-step nudges.
 *
 * MUI's Slider already answers the arrow keys once the thumb has focus, but nothing
 * on screen said so, and reaching a precise value — one degree of straighten — meant
 * dragging a handle across a few hundred pixels and hoping. The minus / plus buttons
 * expose that same single step to the mouse, and being real buttons they sit in the
 * tab order, so the control is fully usable without a pointer.
 *
 * PageUp/PageDown move by ten steps, which MUI gives for free once `step` is set.
 */
const EditSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step = 1, suffix = '', onChange }) => {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const nudge = (delta: number) => onChange(clamp(Number((value + delta).toFixed(2))));

  const nudgeSx = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    p: 0,
    border: '1px solid',
    borderColor: 'divider',
    // Metronic's unlayered Bootstrap button rules outrank a utility class here.
    borderRadius: '6px',
    bgcolor: 'background.paper',
    color: 'text.secondary',
    cursor: 'pointer',
    lineHeight: 1,
    '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
    '&:disabled': { opacity: 0.4, cursor: 'not-allowed' },
  } as const;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            component="button"
            type="button"
            sx={nudgeSx}
            onClick={() => nudge(-step)}
            disabled={value <= min}
            aria-label={'Decrease ' + label}
            title={'Decrease ' + label}
          >
            <Box component="i" className="bi bi-dash" aria-hidden sx={{ fontSize: 12 }} />
          </Box>
          <Typography
            sx={{
              fontSize: 11.5,
              fontWeight: 600,
              color: 'text.disabled',
              fontVariantNumeric: 'tabular-nums',
              minWidth: 38,
              textAlign: 'center',
            }}
          >
            {value}{suffix}
          </Typography>
          <Box
            component="button"
            type="button"
            sx={nudgeSx}
            onClick={() => nudge(step)}
            disabled={value >= max}
            aria-label={'Increase ' + label}
            title={'Increase ' + label}
          >
            <Box component="i" className="bi bi-plus" aria-hidden sx={{ fontSize: 12 }} />
          </Box>
        </Box>
      </Box>
      <Slider
        size="small"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(_, v) => onChange(v as number)}
        aria-label={label}
        // Shown on hover/focus, which is where the keyboard affordance becomes
        // discoverable at the moment it is useful.
        title={label + ' — focus the handle, then use the arrow keys for fine steps'}
        sx={{ py: 1 }}
      />
    </Box>
  );
};

interface PhotoEditorModalProps {
  /** Data URL of the picked image. */
  src: string;
  onCancel: () => void;
  onApply: (file: File) => void;
}

const TABS = [
  { value: 'crop' as const, label: 'Crop' },
  { value: 'filter' as const, label: 'Filter' },
  { value: 'adjust' as const, label: 'Adjust' },
];

const PhotoEditorModal: React.FC<PhotoEditorModalProps> = ({ src, onCancel, onApply }) => {
  const [tab, setTab] = useState<'crop' | 'filter' | 'adjust'>('crop');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [edits, setEdits] = useState<PhotoEdits>(NEUTRAL);
  const [activeFilter, setActiveFilter] = useState('original');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * What the cropper and the canvas both read. Mirroring re-encodes once per
   * toggle rather than on every render, and both consumers use this same value —
   * so what is cropped is what is saved.
   */
  const [mirrored, setMirrored] = useState<string | null>(null);
  const displaySrc = edits.flipH ? mirrored ?? src : src;

  /**
   * The zoom at which the ENTIRE photo sits inside the crop circle.
   *
   * A portrait's top and bottom always fall outside the square crop at 1x, and no
   * amount of panning brings them in — fitting the whole picture needs zoom BELOW 1,
   * which `minZoom`'s default of 1 forbids.
   *
   * It must be measured against the CROP BOX, not the image's own aspect ratio. The
   * media is laid out to fill the container while the crop square is inscribed in
   * that container, so the two have different aspects: a first attempt using
   * shorter/longer of the image alone under-shrank a portrait in a tall viewport and
   * the photo still overflowed. `cropSize / longest displayed side` is the honest
   * measure, and both numbers arrive from the cropper itself.
   */
  const [mediaSize, setMediaSize] = useState<{ width: number; height: number } | null>(null);
  const [cropSize, setCropSize] = useState<{ width: number; height: number } | null>(null);

  const fitZoom = useMemo(() => {
    if (!mediaSize || !cropSize) return 1;
    const longest = Math.max(mediaSize.width, mediaSize.height);
    if (!longest) return 1;
    // Never above 1: a small image should not be blown up just to "fit".
    return Math.min(1, cropSize.width / longest);
  }, [mediaSize, cropSize]);

  useEffect(() => {
    if (!edits.flipH || mirrored) return;
    let cancelled = false;
    mirrorImage(src)
      .then((url) => { if (!cancelled) setMirrored(url); })
      .catch(() => { if (!cancelled) setError('This image could not be flipped.'); });
    return () => { cancelled = true; };
  }, [edits.flipH, mirrored, src]);

  const set = <K extends keyof PhotoEdits>(key: K, value: PhotoEdits[K]) =>
    setEdits((prev) => ({ ...prev, [key]: value }));

  const applyFilter = (id: string) => {
    const preset = FILTERS.find((f) => f.id === id);
    if (!preset) return;
    setActiveFilter(id);
    // Keep the geometry — a filter should not undo a rotation.
    setEdits((prev) => ({ ...NEUTRAL, rotation: prev.rotation, flipH: prev.flipH, ...preset.edits }));
  };

  const css = useMemo(() => filterString(edits), [edits]);

  const onCropComplete = useCallback((_area: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  }, []);

  /**
   * The crop is written at its own NATURAL pixel size — `renderEditedImage` sets the
   * output canvas to `crop.width × crop.height` and nothing downstream resamples it up.
   * So whatever comes out of here is the entire pixel budget every surface that shows
   * this face will ever have, and the largest of them is the birthday card: a 400-unit
   * circle exported at 2×, i.e. 800 × 800. Crop tighter than that and the card has to
   * invent the difference, which is the soft, smeared portrait people report.
   *
   * A warning, not a block. Someone whose only photo is a 300px avatar still needs one
   * on file, and a modal that refuses to save is worse than a face that is slightly
   * soft — this just makes the trade visible while there is still a bigger file to
   * re-crop from.
   */
  const cropPixels = croppedAreaPixels ? Math.min(croppedAreaPixels.width, croppedAreaPixels.height) : null;
  const lowRes = cropPixels !== null && cropPixels < CARD_PHOTO_PIXELS;

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    setError(null);
    try {
      const blob = await renderEditedImage(displaySrc, croppedAreaPixels, edits);
      // Name and type follow the BYTES — see the note at the top of this file.
      onApply(new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' }));
    } catch {
      setError('This image could not be processed. Please try a different photo.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Fold an angle into (-180, 180] — the range the Straighten slider spans.
   *
   * The quarter-turn buttons stepped the raw value, so four taps of Rotate left
   * read -360 on a slider that stops at -180: the thumb pinned itself to the end
   * and would not move. -360 and 0 are the same picture, and only one of them is a
   * value the control can represent.
   */
  const normalizeRotation = (deg: number) => {
    const wrapped = ((deg + 180) % 360 + 360) % 360 - 180;
    // -180 and 180 are the same angle; prefer the positive end so a half turn
    // reads 180, not -180.
    return wrapped === -180 ? 180 : wrapped;
  };

  const toolSx = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    border: '1px solid',
    borderColor: 'divider',
    // Metronic's unlayered Bootstrap button rules outrank a utility class here.
    borderRadius: '9px',
    bgcolor: 'background.paper',
    color: 'text.secondary',
    cursor: 'pointer',
    transition: 'all .15s ease',
    '&:hover': { borderColor: 'primary.main', color: 'primary.main', bgcolor: 'action.hover' },
  } as const;

  return (
    <GlassDialog
      open
      onClose={onCancel}
      maxWidth="md"
      fullWidth
      header={<GlassHeader title="Edit photo" subtitle="Crop, filter and adjust before saving" onClose={onCancel} />}
    >
      {/**
        * Fixed height, not intrinsic. Each tab holds a different amount — two sliders,
        * a grid of eight filter swatches, four sliders and a reset — so an
        * auto-sized dialog resized itself on every tab change, which moved the Apply
        * button out from under the cursor. The body is pinned instead and the tool
        * panel scrolls inside it, so only the panel contents change.
        */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          minHeight: 0,
          height: { xs: 'auto', md: 468 },
        }}
      >
        {/* Stage. Deliberately a fixed dark ground in both themes — it is a photo
            viewport, and a surface that changes tone changes how the photo reads. */}
        <Box
          sx={{
            position: 'relative',
            flex: 1,
            minWidth: 0,
            minHeight: { xs: 260, md: 0 },
            bgcolor: 'grey.900',
          }}
        >
          {/* The filter sits on the wrapper so it colours the image without tinting
              the crop overlay (grid, circle) along with it. */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              filter: css,
              /**
               * The saved image is the SQUARE crop; the circle is only how an avatar
               * is displayed. Showing the circle alone implied the corners were being
               * thrown away, so a portrait looked impossible to keep whole no matter
               * how far it was zoomed out — the hair and collar sat outside the ring.
               *
               * Both are drawn now: the square is the boundary of what is kept, the
               * dashed ring shows how it will be masked in the app. Nothing outside
               * the ring is lost, it is simply not visible on a round avatar.
               */
              '& .reactEasyCrop_CropArea::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '1px dashed rgba(255, 255, 255, 0.85)',
                pointerEvents: 'none',
              },
            }}
          >
            {/* No `transform` override: react-easy-crop's own transform carries the
                base scale that fits the media to the crop area. `objectFit="contain"`
                is the default, stated here because it is the thing that makes the
                whole photo sit inside the circle at 1x. */}
            <Cropper
              image={displaySrc}
              crop={crop}
              zoom={zoom}
              rotation={edits.rotation}
              aspect={1}
              cropShape="rect"
              objectFit="contain"
              showGrid={tab === 'crop'}
              minZoom={fitZoom}
              maxZoom={4}
              // Default `true` keeps the media covering the crop area, which silently
              // cancels any zoom below 1 — the image would snap straight back.
              restrictPosition={false}
              onMediaLoaded={(m) => setMediaSize({ width: m.width, height: m.height })}
              onCropSizeChange={(c) => setCropSize({ width: c.width, height: c.height })}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </Box>
        </Box>

        <Box
          sx={{
            width: { xs: '100%', md: 300 },
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            p: 2,
            borderLeft: { md: '1px solid' },
            borderTop: { xs: '1px solid', md: 0 },
            borderColor: { xs: 'divider', md: 'divider' },
            minHeight: 0,
          }}
        >
          <SegmentedControl
            options={TABS}
            value={tab}
            onChange={setTab}
            ariaLabel="Photo editing tools"
            fullWidth
          />

          {/* Only this region scrolls: the tab switcher and the keyboard tip stay
              anchored, so they do not drift as the tab contents change size. */}
          {/**
            * A slider's thumb overhangs the rail by half its width at each end, so at
            * the minimum it sits partly outside the content box. Setting overflow-y
            * makes the other axis compute to a non-visible value as well, which was
            * slicing that overhang off. Pad the scroll region and pull the padding
            * back out with a negative margin: the thumb gets room, the contents stay
            * aligned with the rest of the panel.
            */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              px: 1,
              mx: -1,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {tab === 'crop' && (
              <Typography sx={{ fontSize: 11.5, lineHeight: 1.45, color: 'text.secondary' }}>
                The square is saved. The dashed circle shows how it appears on a round
                avatar — use <strong>Fit</strong> to keep the whole photo.
              </Typography>
            )}

            {tab === 'crop' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Box component="button" type="button" sx={toolSx} onClick={() => set('rotation', normalizeRotation(edits.rotation - 90))} title="Rotate left" aria-label="Rotate left">
                    <Box component="i" className="bi bi-arrow-counterclockwise" aria-hidden sx={{ fontSize: 15 }} />
                  </Box>
                  <Box component="button" type="button" sx={toolSx} onClick={() => set('rotation', normalizeRotation(edits.rotation + 90))} title="Rotate right" aria-label="Rotate right">
                    <Box component="i" className="bi bi-arrow-clockwise" aria-hidden sx={{ fontSize: 15 }} />
                  </Box>
                  <Box
                    component="button"
                    type="button"
                    aria-pressed={edits.flipH}
                    sx={[toolSx, edits.flipH && { borderColor: 'primary.main', color: 'primary.main', bgcolor: 'action.selected' }]}
                    onClick={() => set('flipH', !edits.flipH)}
                    title="Flip horizontally"
                    aria-label="Flip horizontally"
                  >
                    <Box component="i" className="bi bi-symmetry-vertical" aria-hidden sx={{ fontSize: 15 }} />
                  </Box>
                  {/* Dragging the slider to an exact ratio is fiddly, and this is the one
                      zoom value worth a single tap. Hidden for a square image, where it
                      would do nothing. */}
                  {fitZoom < 0.999 && (
                    <Box
                      component="button"
                      type="button"
                      sx={[toolSx, { width: 'auto', px: 1.25, fontSize: 12, fontWeight: 600, gap: 0.5 }]}
                      onClick={() => { setZoom(fitZoom); setCrop({ x: 0, y: 0 }); }}
                      title="Fit the whole photo inside the circle"
                    >
                      <Box component="i" className="bi bi-aspect-ratio" aria-hidden sx={{ fontSize: 14 }} />
                      Fit
                    </Box>
                  )}
                </Box>
                <EditSlider label="Zoom" value={Math.round(zoom * 100)} min={Math.round(fitZoom * 100)} max={400} suffix="%" onChange={(v) => setZoom(v / 100)} />
                {/* Half-degree steps: a whole degree visibly over-shoots when levelling a
                    horizon, which is exactly the adjustment this slider exists for. */}
                <EditSlider label="Straighten" value={edits.rotation} min={-180} max={180} step={0.5} suffix="°" onChange={(v) => set('rotation', v)} />
              </Box>
            )}

            {tab === 'filter' && (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                {FILTERS.map((f) => {
                  const active = activeFilter === f.id;
                  return (
                    <Box
                      key={f.id}
                      component="button"
                      type="button"
                      aria-pressed={active}
                      onClick={() => applyFilter(f.id)}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.5,
                        p: 0.5,
                        border: 0,
                        background: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        color: active ? 'primary.main' : 'text.secondary',
                      }}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          aspectRatio: '1',
                          borderRadius: '9px',
                          backgroundImage: `url(${displaySrc})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          filter: filterString({ ...NEUTRAL, ...f.edits }),
                          // The selection ring is drawn OUTSIDE the swatch, so it can
                          // never be tinted by the filter it is marking.
                          outline: active ? '2px solid' : '1px solid',
                          outlineColor: active ? 'primary.main' : 'divider',
                          outlineOffset: active ? '2px' : 0,
                          transition: 'outline-offset .12s ease',
                        }}
                        aria-hidden
                      />
                      <Typography sx={{ fontSize: 11, fontWeight: active ? 700 : 600 }}>{f.label}</Typography>
                    </Box>
                  );
                })}
              </Box>
            )}

            {tab === 'adjust' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <EditSlider label="Brightness" value={edits.brightness} min={50} max={150} onChange={(v) => set('brightness', v)} />
                <EditSlider label="Contrast" value={edits.contrast} min={50} max={150} onChange={(v) => set('contrast', v)} />
                <EditSlider label="Saturation" value={edits.saturation} min={0} max={200} onChange={(v) => set('saturation', v)} />
                <EditSlider label="Warmth" value={edits.warmth} min={-50} max={50} onChange={(v) => set('warmth', v)} />
                <WtButton
                  ghost
                  size="small"
                  sx={{ alignSelf: 'flex-start' }}
                  onClick={() => {
                    setEdits((prev) => ({ ...NEUTRAL, rotation: prev.rotation, flipH: prev.flipH }));
                    setActiveFilter('original');
                  }}
                >
                  Reset Adjustments
                </WtButton>
              </Box>
            )}
          </Box>

          {/* Stated once for the whole panel rather than under each slider — the
              behaviour is identical everywhere, and repeating it four times would be
              noise. */}
          <Typography sx={{ fontSize: 11, lineHeight: 1.4, color: 'text.disabled', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            Tip: click a slider handle, then use <strong>←</strong> / <strong>→</strong> for
            fine steps, or <strong>Page&nbsp;Up</strong> / <strong>Page&nbsp;Down</strong> for larger ones.
          </Typography>
        </Box>
      </Box>

      {error && (
        <Box sx={{ px: 2, py: 1.25, bgcolor: 'error.light', borderTop: '1px solid', borderColor: 'error.main' }} role="alert">
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'error.dark' }}>{error}</Typography>
        </Box>
      )}

      {!error && lowRes && (
        <Box sx={{ px: 2, py: 1.25, bgcolor: 'warning.light', borderTop: '1px solid', borderColor: 'warning.main' }} role="status">
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'warning.dark' }}>
            This crop is {cropPixels}&nbsp;px — under the {CARD_PHOTO_PIXELS}&nbsp;px a printed
            card needs, so the photo will look soft there. Zoom out, or start from a larger
            picture, if you have one.
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <WtButton ghost onClick={onCancel}>Cancel</WtButton>
        <WtButton onClick={handleApply} disabled={saving || !croppedAreaPixels}>
          {saving ? 'Applying…' : 'Apply'}
        </WtButton>
      </Box>
    </GlassDialog>
  );
};

export default PhotoEditorModal;
