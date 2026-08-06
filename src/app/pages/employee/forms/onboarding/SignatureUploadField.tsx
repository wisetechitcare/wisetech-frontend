import React, { useEffect, useState } from 'react';
import { useFormikContext } from 'formik';
import { useParams } from 'react-router-dom';
import { fetchEmployeeSignature } from '@services/employee';

/**
 * Key the pending signature is filed under in the wizard's `files` map. The wizard
 * uploads it with the other documents and then persists the resulting path against
 * the employee — see `persistSignature` in NewEmployeeWizard.
 */
export const SIGNATURE_DOC_ID = 'signatureDocument';

interface SignatureUploadFieldProps {
  formikProps: any;
  setFile?: (key: string, file: File) => void;
}

const ALLOWED_FORMATS = ['image/png', 'image/jpeg', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export const SignatureUploadField: React.FC<SignatureUploadFieldProps> = ({ setFile }) => {
  const { values, setFieldValue } = useFormikContext<any>();
  const { employeeId } = useParams();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [savedUrl, setSavedUrl] = useState<string>('');

  const signatureFile: File | null = values?.[SIGNATURE_DOC_ID] || null;

  // Show what is already on file when editing, so a saved signature is visibly
  // saved rather than looking like the upload never took.
  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    fetchEmployeeSignature(employeeId)
      .then((sig: any) => { if (!cancelled) setSavedUrl(sig?.signatureUrl || ''); })
      .catch(() => { /* no signature on file yet */ });
    return () => { cancelled = true; };
  }, [employeeId]);

  const processFile = (file: File) => {
    if (!ALLOWED_FORMATS.includes(file.type)) {
      setError('Only PNG, JPG, or PDF files are allowed');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('File size must be less than 5MB');
      return;
    }
    setError('');
    setFieldValue(SIGNATURE_DOC_ID, file);
    // Hand it to the wizard's pending-upload map — this is what actually gets
    // uploaded and persisted on save.
    setFile?.(SIGNATURE_DOC_ID, file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFile(e.target.files[0]);
  };

  const removeFile = () => {
    setFieldValue(SIGNATURE_DOC_ID, null);
    setError('');
  };

  if (signatureFile) {
    return (
      <div
        style={{
          background: '#f0f4ff',
          border: '1px solid #c7d2fe',
          borderRadius: '8px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div style={{ fontSize: '24px' }}>✓</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>{signatureFile.name}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              {(signatureFile.size / 1024).toFixed(2)} KB — uploads when you save
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={removeFile}
          style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '18px', padding: '8px' }}
          title="Remove signature"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div>
      {savedUrl && (
        <div style={{ marginBottom: '12px', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Signature on file</div>
          <img src={savedUrl} alt="Saved signature" style={{ maxHeight: '64px', maxWidth: '100%', objectFit: 'contain' }} />
        </div>
      )}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        style={{
          border: isDragging ? '2px solid #1e3a8a' : '2px dashed #cbd5e1',
          borderRadius: '8px',
          padding: '32px',
          textAlign: 'center',
          backgroundColor: isDragging ? '#f0f4ff' : '#f9fafb',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <input type="file" id="signatureUpload" onChange={handleFileSelect} accept=".png,.jpg,.jpeg,.pdf" style={{ display: 'none' }} />
        <label htmlFor="signatureUpload" style={{ cursor: 'pointer', display: 'block' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>✍️</div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#1f2937', marginBottom: '8px' }}>
            {savedUrl ? 'Drop a new signature here or click to replace' : 'Drop your signature here or click to browse'}
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>PNG, JPG, or PDF (max 5MB)</div>
        </label>
      </div>
      {error && <div style={{ marginTop: '8px', fontSize: '13px', color: '#b91c1c' }}>{error}</div>}
    </div>
  );
};

export default SignatureUploadField;
