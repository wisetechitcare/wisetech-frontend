import { useRef, useState } from 'react';
import { IconUpload } from '@app/modules/common/components/icons/OrgIcons';

interface Props {
  label: string;
  required?: boolean;
  currentFileUrl?: string;
  currentFileName?: string;
  uploadFn?: (formData: FormData) => Promise<{ data: { path: string } }>;
  onChange?: (url: string, fileName: string) => void;
  accept?: string;
  // Compact renders a small single-row drop zone (for per-field attachments like GST/PAN).
  compact?: boolean;
  // Override the label classes so it can line up with sibling inputs (e.g. TextInput).
  labelClassName?: string;
  // Raw-file mode: when provided, the picked File is handed back as-is (no S3 upload).
  // Useful for callers that process the file locally (e.g. base64 .docx templates).
  onFile?: (file: File) => void;
}

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png';

const TYPE_ICON: Record<string, string> = {
  pdf: '📄', doc: '📝', docx: '📝',
  xls: '📊', xlsx: '📊', jpg: '🖼', jpeg: '🖼', png: '🖼',
};

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

function getExt(name: string) { return name.split('.').pop()?.toLowerCase() ?? ''; }
function getIcon(name: string) { return TYPE_ICON[getExt(name)] ?? '📎'; }
function isImage(name: string) { return IMAGE_EXTS.includes(getExt(name)); }
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DragDropFileField({
  label, required, currentFileUrl, currentFileName, uploadFn, onChange, accept = ACCEPTED_TYPES, compact = false,
  labelClassName = 'col-form-label fw-bold fs-6', onFile
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [localFile, setLocalFile] = useState<{ name: string; size: number } | null>(null);

  const displayName = localFile?.name ?? currentFileName ?? '';
  const hasFile = !!(currentFileUrl || localFile);

  async function handleFile(file: File) {
    setError('');
    // Raw-file mode: hand the File to the caller, no upload.
    if (onFile) {
      setLocalFile({ name: file.name, size: file.size });
      onFile(file);
      return;
    }
    if (!uploadFn) return;
    setUploading(true);
    setProgress(30);
    try {
      const fd = new FormData();
      fd.append('file', file);
      setProgress(60);
      const res = await uploadFn(fd);
      setProgress(100);
      setLocalFile({ name: file.name, size: file.size });
      onChange?.(res.data.path, file.name);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 600);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  return (
    <div className="mb-2 d-flex flex-column">
      {label && <label className={`${required ? 'required' : ''} ${labelClassName}`}>{label}</label>}

      {hasFile ? (
        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: compact ? '8px 12px' : '12px 16px', background: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Preview: image thumbnail when the file is an image, otherwise a type icon. */}
          {currentFileUrl && isImage(displayName) ? (
            <a href={currentFileUrl} target="_blank" rel="noreferrer" style={{ flexShrink: 0, lineHeight: 0 }}>
              <img src={currentFileUrl} alt={displayName}
                style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }} />
            </a>
          ) : (
            <span style={{ fontSize: '22px' }}>{getIcon(displayName)}</span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
            {localFile && <div style={{ fontSize: '12px', color: '#888' }}>{formatSize(localFile.size)}</div>}
          </div>
          {currentFileUrl && (
            <a href={currentFileUrl} target="_blank" rel="noreferrer"
              style={{ fontSize: '12px', color: '#1E3A8A', fontWeight: 600, whiteSpace: 'nowrap' }}>
              View
            </a>
          )}
          <button type="button"
            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '0 4px' }}
            onClick={() => { setLocalFile(null); onChange?.('', ''); }}>
            Remove
          </button>
        </div>
      ) : compact ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{
            border: `1.5px dashed ${dragging ? '#1E3A8A' : '#c0c0c0'}`,
            borderRadius: '8px',
            padding: '0 12px',
            minHeight: 44,
            cursor: 'pointer',
            background: dragging ? '#fdf4f4' : '#fafafa',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <IconUpload size={18} color="#1E3A8A" />
          <span style={{ fontSize: '13px', color: '#666', flex: 1 }}>Drag &amp; drop or click to attach</span>
          <span style={{ background: '#1E3A8A', color: '#fff', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Browse
          </span>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${dragging ? '#1E3A8A' : '#c0c0c0'}`,
            borderRadius: '8px',
            padding: '28px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? '#fdf4f4' : '#fafafa',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <IconUpload size={30} color="#1E3A8A" />
          </div>
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#444', marginBottom: '4px' }}>
            Drag & drop file here
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
            or click to browse
          </div>
          <div style={{ display: 'inline-block', background: '#1E3A8A', color: '#fff', borderRadius: '6px', padding: '5px 16px', fontSize: '13px', fontWeight: 600 }}>
            Browse Files
          </div>
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '10px' }}>
            PDF, DOC, DOCX, XLS, XLSX, JPG, PNG
          </div>
        </div>
      )}

      {/* Progress bar */}
      {uploading && progress > 0 && (
        <div style={{ marginTop: '6px', height: '4px', background: '#f0f0f0', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: '#1E3A8A', transition: 'width 0.3s ease' }} />
        </div>
      )}
      {uploading && <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Uploading…</div>}
      {error && <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>{error}</div>}

      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={onInputChange} />
    </div>
  );
}
