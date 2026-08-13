import React, { useCallback, useMemo, useState } from 'react';
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
      ctx.scale(edits.flipH ? -1 : 1, 1);
      ctx.drawImage(image, -image.width / 2, -image.height / 2);

      // Lift the crop out of the rotated canvas.
      const data = ctx.getImageData(crop.x, crop.y, crop.width, crop.height);
      canvas.width = crop.width;
      canvas.height = crop.height;
      ctx.putImageData(data, 0, 0);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Canvas is empty'))),
        'image/jpeg',
        0.92,
      );
    };
    image.onerror = () => reject(new Error('Image could not be loaded'));
    image.src = imageSrc;
  });

/** Labelled slider with a live readout, so a value is never a mystery position. */
const EditSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, suffix = '', onChange }) => (
  <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.25 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
        {value}{suffix}
      </Typography>
    </Box>
    <Slider
      size="small"
      value={value}
      min={min}
      max={max}
      onChange={(_, v) => onChange(v as number)}
      aria-label={label}
      sx={{ py: 1 }}
    />
  </Box>
);

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

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    setError(null);
    try {
      const blob = await renderEditedImage(src, croppedAreaPixels, edits);
      // Name and type follow the BYTES — see the note at the top of this file.
      onApply(new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' }));
    } catch {
      setError('This image could not be processed. Please try a different photo.');
    } finally {
      setSaving(false);
    }
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
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, minHeight: 0 }}>
        {/* Stage. Deliberately a fixed dark ground in both themes — it is a photo
            viewport, and a surface that changes tone changes how the photo reads. */}
        <Box
          sx={{
            position: 'relative',
            flex: 1,
            minWidth: 0,
            minHeight: { xs: 260, md: 380 },
            bgcolor: 'grey.900',
          }}
        >
          {/* The filter sits on the wrapper so it colours the image without tinting
              the crop overlay (grid, circle) along with it. */}
          <Box sx={{ position: 'absolute', inset: 0, filter: css }}>
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              rotation={edits.rotation}
              aspect={1}
              cropShape="round"
              showGrid={tab === 'crop'}
              transform={`translate(${crop.x}px, ${crop.y}px) rotate(${edits.rotation}deg) scale(${zoom}) scaleX(${edits.flipH ? -1 : 1})`}
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
            overflowY: 'auto',
          }}
        >
          <SegmentedControl
            options={TABS}
            value={tab}
            onChange={setTab}
            ariaLabel="Photo editing tools"
            fullWidth
          />

          {tab === 'crop' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Box component="button" type="button" sx={toolSx} onClick={() => set('rotation', edits.rotation - 90)} title="Rotate left" aria-label="Rotate left">
                  <Box component="i" className="bi bi-arrow-counterclockwise" aria-hidden sx={{ fontSize: 15 }} />
                </Box>
                <Box component="button" type="button" sx={toolSx} onClick={() => set('rotation', edits.rotation + 90)} title="Rotate right" aria-label="Rotate right">
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
              </Box>
              <EditSlider label="Zoom" value={Math.round(zoom * 100)} min={100} max={300} suffix="%" onChange={(v) => setZoom(v / 100)} />
              <EditSlider label="Straighten" value={edits.rotation} min={-180} max={180} suffix="°" onChange={(v) => set('rotation', v)} />
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
                        backgroundImage: `url(${src})`,
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
      </Box>

      {error && (
        <Box sx={{ px: 2, py: 1.25, bgcolor: 'error.light', borderTop: '1px solid', borderColor: 'error.main' }} role="alert">
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'error.dark' }}>{error}</Typography>
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
