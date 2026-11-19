import React, { useRef, useState } from 'react';
import { Box, LinearProgress, Stack, Typography, alpha } from '@mui/material';
import { WtButton } from './buttons';

/**
 * WtVideoField — one video (a splash screen, an intro clip): a looping muted preview in a frame shaped like where it
 * plays, drag-and-drop, Upload/Change and Remove, with type/size checks before anything is sent and real upload
 * progress. The video twin of WtImageField — same shape of API.
 *
 * It does not know where files go: `upload` receives the File and a progress callback and resolves to the stored URL,
 * so it works for a presigned direct-to-S3 upload as well as any API endpoint.
 */
export interface WtVideoFieldProps {
  label: string;
  /** Current video URL. Empty = none. */
  value?: string | null;
  /** Called with the new URL after a successful upload, or '' on remove. */
  onChange: (url: string) => void;
  /** Uploads the file, reporting 0–100, and resolves to the URL to store. */
  upload: (file: File, onProgress: (pct: number) => void) => Promise<string>;
  /** The preview frame's shape: `landscape` (16:9, desktop) or `portrait` (9:16, phones). */
  shape?: 'landscape' | 'portrait';
  hint?: string;
  /** MIME types accepted. Default MP4. */
  accept?: string[];
  maxSizeMB?: number;
  error?: string;
  /** Disabled with a reason shown in place of the hint. */
  disabledReason?: string;
}

const LABELS: Record<string, string> = { 'video/mp4': 'MP4', 'video/webm': 'WebM', 'video/quicktime': 'MOV' };

export function WtVideoField({
  label, value, onChange, upload, shape = 'landscape', hint, accept = ['video/mp4'], maxSizeMB = 25, error, disabledReason,
}: WtVideoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const [localError, setLocalError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const disabled = !!disabledReason;
  const busy = progress !== null;
  const shown = preview || value || '';
  const message = localError || error;
  const types = accept.map((t) => LABELS[t] || t.split('/').pop()?.toUpperCase()).join(' or ');
  const frame = shape === 'portrait' ? { width: 72, height: 128 } : { width: 176, height: 99 };

  const take = async (file?: File | null) => {
    if (!file || disabled || busy) return;
    if (!accept.includes(file.type)) return setLocalError(`Use an ${types} video.`);
    if (file.size > maxSizeMB * 1024 * 1024) return setLocalError(`That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${maxSizeMB} MB.`);
    setLocalError('');
    setProgress(0);
    const local = URL.createObjectURL(file);
    setPreview(local);
    try {
      onChange(await upload(file, (pct) => setProgress(Math.round(pct))));
    } catch (e) {
      setPreview(null);
      setLocalError((e as Error)?.message || "Couldn't upload the video. Try again.");
    } finally {
      setProgress(null);
      // The preview keeps playing from the stored URL once the parent passes it back as `value`.
      setPreview(null);
      URL.revokeObjectURL(local);
    }
  };

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2} sx={{ minWidth: 0 }}>
      <Box
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={shown ? `Change ${label}` : `Upload ${label}`}
        aria-disabled={disabled || undefined}
        onClick={() => !busy && !disabled && inputRef.current?.click()}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !busy && !disabled) { e.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]); }}
        sx={{
          position: 'relative', ...frame, flexShrink: 0, borderRadius: '12px', display: 'grid', placeItems: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer', overflow: 'hidden', opacity: disabled ? 0.6 : 1,
          border: shown ? 1 : '1.5px dashed', borderColor: message ? 'error.main' : over ? 'primary.main' : 'divider',
          bgcolor: shown ? 'common.black' : over ? (t) => alpha(t.palette.primary.main, 0.06) : 'action.hover',
          transition: 'border-color .15s ease, background-color .15s ease',
          '&:hover': disabled ? undefined : { borderColor: 'primary.main' },
          '&:focus-visible': { outline: 2, outlineColor: 'primary.main', outlineOffset: 2 },
        }}
      >
        {shown
          ? <Box component="video" src={shown} muted loop autoPlay playsInline aria-label={label}
              sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Box component="i" className={`bi ${shape === 'portrait' ? 'bi-phone' : 'bi-display'}`} aria-hidden
              sx={{ fontSize: 24, color: over ? 'primary.main' : 'text.disabled' }} />}
        {busy && (
          <Box sx={{ position: 'absolute', inset: 'auto 0 0 0', p: 0.75, bgcolor: (t) => alpha(t.palette.background.paper, 0.85) }}>
            <LinearProgress variant="determinate" value={progress ?? 0} aria-label={`Uploading ${label}`} />
          </Box>
        )}
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{label}</Typography>
        <Typography sx={{ fontSize: 12, color: message ? 'error.main' : 'text.secondary', mt: 0.25 }}>
          {busy ? `Uploading… ${progress}%` : message || disabledReason || hint || `${types}, up to ${maxSizeMB} MB. Drop a file here or click to choose.`}
        </Typography>
        <Stack direction="row" gap={1} sx={{ mt: 1 }}>
          <WtButton size="small" inverted disabled={busy || disabled} onClick={() => inputRef.current?.click()}>
            {shown ? 'Change' : 'Upload'}
          </WtButton>
          {shown && !busy && (
            <WtButton size="small" ghost disabled={disabled} onClick={() => { setPreview(null); setLocalError(''); onChange(''); }}>
              Remove
            </WtButton>
          )}
        </Stack>
      </Box>

      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept.join(',')}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => { take(e.target.files?.[0]); e.target.value = ''; }}
      />
    </Stack>
  );
}

export default WtVideoField;
