import { useCallback, useState, type ReactNode } from 'react';
import { useDropzone } from 'react-dropzone';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { ToneChip, WtButton, toneAlpha } from '@app/modules/common/components/ui';
import { tonePair } from '@app/theme/tokens';
import { formatFileSize } from '@utils/fileValidation';
import { downloadBlob } from '@utils/svgExport';
import { MAX_IMPORT_FILE_BYTES } from '@services/LegacyLeadMigrationService';

/**
 * The file-selection step shared by BOTH lead CSV importers — standard bulk import and
 * legacy migration. They sit behind the same button on the Leads page and used to be two
 * unrelated designs: this one on the MUI kit, the other on Bootstrap markup with
 * light-mode-only hex.
 *
 * Everything that differs between the two is copy, passed in. The layout — info banner,
 * tall drop zone, two pill sections, template download, footer that states what happens
 * next beside the action — is defined once here.
 *
 * The size limit comes from the service constant, which mirrors multer's server-side
 * limit — the two used to disagree (10MB client, 5MB server), so a 7MB file passed
 * the client check and was then rejected by the server.
 */

const SIZE_LIMIT_LABEL = formatFileSize(MAX_IMPORT_FILE_BYTES);

/** The shape this screen needs. `ImportColumn` from the legacy API satisfies it. */
export interface UploadColumn {
  key: string;
  label: string;
  required?: boolean;
  matchSignal?: boolean;
  writable?: boolean;
}

/**
 * Byte-order mark for the template. Without it Excel opens the file as the local ANSI
 * codepage and saves it back the same way, so anything non-ASCII the user types comes
 * back as mojibake. Built from the code point rather than written literally — an
 * invisible U+FEFF sitting in source is a trap for the next editor.
 */
const BOM = String.fromCharCode(0xfeff);

/** RFC 4180: quote a cell only when it contains a delimiter, quote or newline. */
const csvCell = (value: string) =>
  (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/** Small uppercase section caption. Two of them, so it is written once. */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: 11, fontWeight: 700, letterSpacing: '.08em',
        textTransform: 'uppercase', color: 'text.secondary', mb: 1,
      }}
    >
      {children}
    </Typography>
  );
}

/** Full-size pills — the dense chips read as metadata rather than as column names. */
const pillSx = {
  height: 30,
  fontSize: '0.8125rem',
  borderRadius: '8px',
  '& .MuiChip-label': { px: 1.5 },
} as const;

export function CsvUploadStep({
  columns,
  onSubmit,
  submitting,
  error,
  intro,
  primaryLabel,
  secondaryLabel,
  submitLabel,
  busyLabel = 'Working…',
  readyVerb,
  templateFileName,
  children,
}: {
  columns: UploadColumn[];
  onSubmit: (file: File) => void;
  submitting?: boolean;
  error?: string | null;
  /** One sentence in the tinted banner: what this file is and what happens to it. */
  intro: string;
  /** Caption over the solid pills (the columns flagged `matchSignal`). */
  primaryLabel: string;
  /** Caption over the neutral pills. */
  secondaryLabel: string;
  submitLabel: string;
  busyLabel?: string;
  /** Verb for the footer line: `Ready to ${readyVerb} "file.csv"`. */
  readyVerb: string;
  templateFileName: string;
  /** Extra content below the template row (the standard import's rule cards). */
  children?: ReactNode;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const brand = tonePair('brand').fg;
  const success = tonePair('success').fg;

  const onDrop = useCallback((accepted: File[], rejected: { file: File }[]) => {
    setLocalError(null);
    if (rejected.length) {
      // Derived from the same constant as the hint below, so the two can't contradict.
      setLocalError(`Only a single .csv file up to ${SIZE_LIMIT_LABEL} is accepted.`);
      return;
    }
    const next = accepted[0];
    if (next) setFile(next);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.csv'] },
    maxFiles: 1,
    maxSize: MAX_IMPORT_FILE_BYTES,
    multiple: false,
  });

  const identifiers = columns.filter((column) => column.matchSignal);
  const others = columns.filter((column) => !column.matchSignal && column.writable !== false);

  /**
   * A blank CSV whose header row is every column shown below, in the same order.
   *
   * Built from the same `columns` the pills render, so the template cannot advertise a
   * column the importer does not read, and a column added there appears here without
   * anyone remembering to update a fixture.
   */
  const downloadTemplate = () => {
    const headers = [...identifiers, ...others].map((column) => column.label);
    const csv = `${BOM}${headers.map(csvCell).join(',')}\r\n`;
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), templateFileName);
  };

  return (
    <Stack spacing={2.5}>
      <Stack
        direction="row" spacing={1.25} alignItems="flex-start"
        sx={{
          p: 1.5, borderRadius: '12px',
          bgcolor: toneAlpha(brand, 0.06),
          border: `1px solid ${toneAlpha(brand, 0.2)}`,
        }}
      >
        <Box sx={{ color: brand, mt: '1px', flexShrink: 0 }}>
          <KTIcon iconName="information" className="fs-4" />
        </Box>
        <Typography sx={{ fontSize: 13, lineHeight: 1.55, color: 'text.secondary' }}>
          {intro}
        </Typography>
      </Stack>

      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? brand : 'divider',
          borderRadius: '16px',
          px: 3,
          py: { xs: 5, sm: file ? 5 : 8 },
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: isDragActive ? toneAlpha(brand, 0.06) : 'action.hover',
          transition: 'border-color .2s, background-color .2s',
        }}
      >
        <input {...getInputProps()} />

        {file ? (
          <Stack alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 88, height: 88, borderRadius: '16px', display: 'grid', placeItems: 'center',
                bgcolor: toneAlpha(brand, 0.1), color: brand,
                fontSize: 14, fontWeight: 800, letterSpacing: '.1em',
              }}
            >
              CSV
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 600, color: 'text.primary', mt: 1.5, wordBreak: 'break-all' }}>
              {file.name}
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
              {formatFileSize(file.size)}
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 500, color: success }}>
              ✔ Ready to {readyVerb}
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ pt: 1.5 }}>
              {/* Both stop the click reaching the drop zone, which would open the file
                  dialog on its own and fight whichever button was pressed. */}
              {/* `tone` is ignored on a ghost button, so the danger colour is set directly. */}
              <WtButton
                size="small" ghost
                sx={{ color: tonePair('danger').fg }}
                onClick={(e) => { e.stopPropagation(); setFile(null); setLocalError(null); }}
              >
                Remove
              </WtButton>
              <WtButton size="small" ghost onClick={(e) => { e.stopPropagation(); open(); }}>
                Replace
              </WtButton>
            </Stack>
          </Stack>
        ) : (
          <Stack alignItems="center" spacing={0}>
            <Box
              sx={{
                width: 80, height: 80, borderRadius: '50%', display: 'grid', placeItems: 'center',
                bgcolor: toneAlpha(brand, 0.1), color: brand, mb: 2.5,
              }}
            >
              <KTIcon iconName="file-up" className="fs-3x" />
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'text.primary', mb: 1 }}>
              Drag &amp; drop your CSV here
            </Typography>
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              or <Box component="span" sx={{ color: brand, fontWeight: 700 }}>click to browse</Box>
              {'  ·  CSV only  ·  max '}{SIZE_LIMIT_LABEL}
            </Typography>
          </Stack>
        )}
      </Box>

      {(localError || error) && (
        <Alert severity="error" variant="outlined">
          {localError || error}
        </Alert>
      )}

      <Box>
        <SectionLabel>{primaryLabel}</SectionLabel>
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2.5 }}>
          {identifiers.map((column) => (
            <ToneChip
              key={column.key}
              tone="cyan"
              label={column.required ? `${column.label} ✱` : column.label}
              solid
              sx={pillSx}
            />
          ))}
        </Stack>

        <SectionLabel>{secondaryLabel}</SectionLabel>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {others.map((column) => (
            <ToneChip key={column.key} tone="neutral" label={column.label} sx={pillSx} />
          ))}
        </Stack>

        <Stack direction="row" alignItems="center" gap={1.25} flexWrap="wrap" sx={{ mt: 2 }}>
          <WtButton
            size="small"
            ghost
            disabled={!columns.length}
            onClick={downloadTemplate}
            startIcon={<KTIcon iconName="file-down" className="fs-4" />}
          >
            Download CSV template
          </WtButton>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
            An empty file with every column above as its header row.
          </Typography>
        </Stack>

        {children}
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}
      >
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          {file ? `Ready to ${readyVerb} "${file.name}"` : 'Select a CSV file to continue'}
        </Typography>
        <WtButton
          disabled={!file || submitting}
          onClick={() => file && onSubmit(file)}
          sx={{ minWidth: 170 }}
        >
          {submitting ? busyLabel : submitLabel}
        </WtButton>
      </Stack>
    </Stack>
  );
}

export default CsvUploadStep;
