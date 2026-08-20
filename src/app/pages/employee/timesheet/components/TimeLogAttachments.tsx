/**
 * Attachments on a time log — what the logged work actually produced.
 *
 * A description says what you did; an attachment shows it. A drawing, a photograph of site, a
 * signed sheet: the evidence that turns "3h, revisions" into something a manager can check and a
 * client can be billed for.
 *
 * ─── ONE VALIDATION POLICY, NOT A SECOND ONE ─────────────────────────────────
 * Every check here comes from `utils/fileValidation` — the SAME module the onboarding document
 * uploads use. Not a copy of its rules: the module itself. Extensions, the 10MB ceiling and the
 * wording of every rejection are therefore identical wherever a document is attached, and
 * changing the policy stays a one-file job.
 *
 * That check is a COURTESY, not a boundary. The real enforcement is the upload endpoint, which
 * sniffs magic bytes, scans for active content, caps the stream at the same 10MB before it is
 * ever buffered, and re-encodes images to WebP. A `.exe` renamed to `.pdf` is caught there.
 *
 * ─── WHY IMAGES COME BACK SMALLER THAN THEY WENT ─────────────────────────────
 * The pipeline converts images to WebP on the way in, so a 4MB phone photograph is stored as a
 * few hundred kilobytes and the row records the POST-conversion size. Site photographs are the
 * common case for this field, and storing them as shot would make the timesheet the largest
 * thing in the database within a month.
 */
import { useRef, useState } from 'react';
import { Box, CircularProgress, Stack, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { toast } from '@app/modules/common/components/ui';
import {
    DOCUMENT_ACCEPT,
    DOCUMENT_HINT,
    formatFileSize,
    validateDocumentFile,
} from '@utils/fileValidation';
import { uploadUserAsset } from '@services/uploader';

/** An attachment as the API stores and returns it. */
export interface TimeLogAttachment {
    url: string;
    fileName: string;
    contentType?: string | null;
    sizeBytes?: number | null;
}

/** Files land beside the other employee documents, under their own category. */
const UPLOAD_CATEGORY = 'timesheet-docs';

/** Matches the server's own per-entry cap, so the UI refuses before the API has to. */
const MAX_FILES = 10;

const isImage = (a: TimeLogAttachment) =>
    (a.contentType || '').startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(a.fileName);

export const TimeLogAttachments = ({
    value,
    onChange,
    userId,
    disabled = false,
}: {
    value: TimeLogAttachment[];
    onChange: (next: TimeLogAttachment[]) => void;
    /** Whose folder the file is filed under — the same id the rest of the app uploads with. */
    userId?: string;
    disabled?: boolean;
}) => {
    const theme = useTheme();
    const dark = theme.palette.mode === 'dark';
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const addFiles = async (files: FileList | null) => {
        if (!files?.length || disabled) return;

        const room = MAX_FILES - value.length;
        if (room <= 0) {
            void toast({ icon: 'error', title: `Up to ${MAX_FILES} files per entry`, timer: 3000 });
            return;
        }

        // Validate EVERY file before uploading any of them: a batch that fails halfway leaves the
        // user guessing which ones landed.
        const chosen = Array.from(files).slice(0, room);
        for (const file of chosen) {
            const error = validateDocumentFile(file);
            if (error) {
                void toast({ icon: 'error', title: file.name, text: error, timer: 4200 });
                return;
            }
        }

        setUploading(true);
        try {
            const uploaded: TimeLogAttachment[] = [];
            for (const file of chosen) {
                const form = new FormData();
                form.append('file', file);
                const result = await uploadUserAsset(form, userId || '', undefined, UPLOAD_CATEGORY);
                const url = result?.data?.path || result?.path || '';
                if (!url) throw new Error('The upload did not return a location');
                uploaded.push({
                    url,
                    fileName: file.name,
                    // What the SERVER stored, when it says so — an image comes back as WebP, and
                    // recording the original type would describe a file that no longer exists.
                    contentType: result?.data?.contentType || file.type || null,
                    sizeBytes: result?.data?.size ?? file.size,
                });
            }
            onChange([...value, ...uploaded]);
        } catch (error: any) {
            void toast({
                icon: 'error',
                title: 'Could not attach that',
                text: error?.response?.data?.message || error?.message || 'The file was not uploaded.',
                timer: 4200,
            });
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    return (
        <Box>
            <input
                ref={inputRef}
                type="file"
                multiple
                accept={DOCUMENT_ACCEPT}
                hidden
                onChange={(e) => void addFiles(e.target.files)}
            />

            {/* A drop target, because the files being attached here have usually just been saved
                out of another program and are sitting in a folder next to the browser. */}
            <Box
                onClick={() => !disabled && !uploading && inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    void addFiles(e.dataTransfer.files);
                }}
                sx={{
                    display: 'flex', alignItems: 'center', gap: 1.25,
                    px: 1.5, py: 1.25, borderRadius: 1.5,
                    border: '1.5px dashed',
                    borderColor: dragOver ? 'primary.main' : 'divider',
                    bgcolor: dragOver ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
                    cursor: disabled || uploading ? 'default' : 'pointer',
                    opacity: disabled ? 0.6 : 1,
                    transition: 'border-color .15s, background-color .15s',
                    '&:hover': disabled || uploading ? undefined : { borderColor: 'primary.main' },
                }}
            >
                <Box sx={{ color: uploading ? 'text.disabled' : 'primary.main', lineHeight: 0 }}>
                    {uploading ? <CircularProgress size={18} /> : <KTIcon iconName="paper-clip" className="fs-4" />}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: 'text.primary' }}>
                        {uploading ? 'Uploading…' : 'Attach files'}
                    </Typography>
                    {/* The hint is DERIVED from the same list the validator enforces, so this can
                        never advertise a type that is then rejected. */}
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {DOCUMENT_HINT} · images are stored as WebP
                    </Typography>
                </Box>
            </Box>

            {value.length > 0 && (
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {value.map((file) => (
                        <Stack
                            key={file.url}
                            direction="row" spacing={1} alignItems="center"
                            sx={{
                                px: 1, py: 0.6, borderRadius: 1.25,
                                border: '1px solid', borderColor: 'divider',
                                bgcolor: alpha(theme.palette.text.primary, dark ? 0.05 : 0.028),
                            }}
                        >
                            <Box sx={{ color: 'text.secondary', lineHeight: 0, flexShrink: 0 }}>
                                <KTIcon iconName={isImage(file) ? 'picture' : 'document'} className="fs-5" />
                            </Box>

                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                    component="a"
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    variant="caption"
                                    noWrap
                                    onClick={(e) => e.stopPropagation()}
                                    sx={{ display: 'block', fontWeight: 600, color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                                >
                                    {file.fileName}
                                </Typography>
                                {!!file.sizeBytes && (
                                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>
                                        {formatFileSize(file.sizeBytes)}
                                    </Typography>
                                )}
                            </Box>

                            {!disabled && (
                                <Tooltip title={`Remove ${file.fileName}`}>
                                    <Box
                                        component="button"
                                        type="button"
                                        aria-label={`Remove ${file.fileName}`}
                                        onClick={() => onChange(value.filter((f) => f.url !== file.url))}
                                        sx={{
                                            flexShrink: 0, border: 0, bgcolor: 'transparent', lineHeight: 0,
                                            p: 0.4, borderRadius: 1, cursor: 'pointer', color: 'text.disabled',
                                            '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.1) },
                                        }}
                                    >
                                        <KTIcon iconName="cross" className="fs-5" />
                                    </Box>
                                </Tooltip>
                            )}
                        </Stack>
                    ))}
                </Stack>
            )}
        </Box>
    );
};

export default TimeLogAttachments;
