import React, { useRef, useState } from 'react';
import { Box, CircularProgress, Stack, Typography, alpha } from '@mui/material';
import { WtButton } from './buttons';

/**
 * WtImageField — one image (a logo, a stamp, a signature, a photo): preview, drag-and-drop,
 * Upload/Change and Remove, with type/size checks before anything is sent.
 *
 * It does not know where files go: `upload` receives the File and resolves to the stored
 * URL/path, so the same field works for any uploader endpoint.
 */
export interface WtImageFieldProps {
  label: string;
  /** Current image URL/path. Empty = none. */
  value?: string | null;
  /** Called with the new URL after a successful upload, or '' on remove. */
  onChange: (url: string) => void;
  /** Uploads the file and resolves to the URL/path to store. */
  upload: (file: File) => Promise<string>;
  hint?: string;
  /** MIME types accepted. Default PNG and JPEG. */
  accept?: string[];
  maxSizeMB?: number;
  required?: boolean;
  /** Server-side/validation message from the surrounding form. */
  error?: string;
  disabled?: boolean;
}

const LABELS: Record<string, string> = { 'image/png': 'PNG', 'image/jpeg': 'JPG', 'image/webp': 'WebP', 'image/svg+xml': 'SVG' };

export function WtImageField({
  label, value, onChange, upload, hint, accept = ['image/png', 'image/jpeg'], maxSizeMB = 5, required, error, disabled,
}: WtImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [localError, setLocalError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const shown = preview || value || '';
  const message = localError || error;
  const types = accept.map((t) => LABELS[t] || t.split('/').pop()?.toUpperCase()).join(' or ');

  const take = async (file?: File | null) => {
    if (!file || disabled) return;
    if (!accept.includes(file.type)) return setLocalError(`Use a ${types} image.`);
    if (file.size > maxSizeMB * 1024 * 1024) return setLocalError(`That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${maxSizeMB} MB.`);
    setLocalError('');
    setBusy(true);
    const local = URL.createObjectURL(file);
    setPreview(local);
    try {
      onChange(await upload(file));
    } catch {
      setPreview(null);
      setLocalError("Couldn't upload the image. Try again.");
    } finally {
      setBusy(false);
      URL.revokeObjectURL(local);
    }
  };

  return (
    <Stack direction="row" alignItems="center" gap={2} sx={{ minWidth: 0 }}>
      <Box
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={shown ? `Change ${label}` : `Upload ${label}`}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !busy) { e.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]); }}
        sx={{
          position: 'relative', width: 96, height: 96, flexShrink: 0, borderRadius: '14px', display: 'grid', placeItems: 'center',
          cursor: disabled ? 'default' : 'pointer', overflow: 'hidden',
          border: shown ? 1 : '1.5px dashed', borderColor: message ? 'error.main' : over ? 'primary.main' : 'divider',
          bgcolor: over ? (t) => alpha(t.palette.primary.main, 0.06) : 'action.hover',
          transition: 'border-color .15s ease, background-color .15s ease',
          '&:hover': disabled ? undefined : { borderColor: 'primary.main' },
          '&:focus-visible': { outline: 2, outlineColor: 'primary.main', outlineOffset: 2 },
        }}
      >
        {shown
          ? <Box component="img" src={shown} alt={label} sx={{ display: 'block', maxWidth: 80, maxHeight: 80, width: 'auto', height: 'auto', objectFit: 'contain' }} />
          : <Box component="i" className="bi bi-cloud-arrow-up" aria-hidden sx={{ fontSize: 26, color: over ? 'primary.main' : 'text.disabled' }} />}
        {busy && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', bgcolor: (t) => alpha(t.palette.background.paper, 0.7) }}>
            <CircularProgress size={22} />
          </Box>
        )}
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
          {label}{required && <Box component="span" sx={{ color: 'error.main', ml: 0.25 }}>*</Box>}
        </Typography>
        <Typography sx={{ fontSize: 12, color: message ? 'error.main' : 'text.secondary', mt: 0.25 }}>
          {message || hint || `${types}, up to ${maxSizeMB} MB. Drop a file here or click to choose.`}
        </Typography>
        <Stack direction="row" gap={1} sx={{ mt: 1 }}>
          <WtButton size="small" inverted disabled={busy || disabled} onClick={() => inputRef.current?.click()}>
            {shown ? 'Change' : 'Upload'}
          </WtButton>
          {shown && (
            <WtButton size="small" ghost disabled={busy || disabled} onClick={() => { setPreview(null); setLocalError(''); onChange(''); }}>
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

export default WtImageField;
