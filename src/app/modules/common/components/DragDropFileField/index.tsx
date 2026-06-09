import { useRef, useState } from 'react';

interface Props {
  label: string;
  required?: boolean;
  currentFileUrl?: string;
  currentFileName?: string;
  uploadFn: (formData: FormData) => Promise<{ data: { path: string } }>;
  onChange: (url: string, fileName: string) => void;
  accept?: string;
}

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png';

const TYPE_ICON: Record<string, string> = {
  pdf: '📄', doc: '📝', docx: '📝',
  xls: '📊', xlsx: '📊', jpg: '🖼', jpeg: '🖼', png: '🖼',
};

function getExt(name: string) { return name.split('.').pop()?.toLowerCase() ?? ''; }
function getIcon(name: string) { return TYPE_ICON[getExt(name)] ?? '📎'; }
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DragDropFileField({
  label, required, currentFileUrl, currentFileName, uploadFn, onChange, accept = ACCEPTED_TYPES
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
    setUploading(true);
    setProgress(30);
    try {
      const fd = new FormData();
      fd.append('file', file);
      setProgress(60);
      const res = await uploadFn(fd);
      setProgress(100);
      setLocalFile({ name: file.name, size: file.size });
      onChange(res.data.path, file.name);
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
    <div className="mb-2">
      <label className={`${required ? 'required' : ''} col-form-label fw-bold fs-6`}>{label}</label>

      {hasFile ? (
        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px 16px', background: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>{getIcon(displayName)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
            {localFile && <div style={{ fontSize: '12px', color: '#888' }}>{formatSize(localFile.size)}</div>}
          </div>
          {currentFileUrl && (
            <a href={currentFileUrl} target="_blank" rel="noreferrer"
              style={{ fontSize: '12px', color: '#9D4141', fontWeight: 600, whiteSpace: 'nowrap' }}>
              View
            </a>
          )}
          <button type="button"
            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '0 4px' }}
            onClick={() => { setLocalFile(null); onChange('', ''); }}>
            Remove
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${dragging ? '#9D4141' : '#c0c0c0'}`,
            borderRadius: '8px',
            padding: '28px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? '#fdf4f4' : '#fafafa',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📁</div>
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#444', marginBottom: '4px' }}>
            Drag & drop file here
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
            or click to browse
          </div>
          <div style={{ display: 'inline-block', background: '#9D4141', color: '#fff', borderRadius: '6px', padding: '5px 16px', fontSize: '13px', fontWeight: 600 }}>
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
          <div style={{ height: '100%', width: `${progress}%`, background: '#9D4141', transition: 'width 0.3s ease' }} />
        </div>
      )}
      {uploading && <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Uploading…</div>}
      {error && <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>{error}</div>}

      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={onInputChange} />
    </div>
  );
}
