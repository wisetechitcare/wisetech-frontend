import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { useDMS } from '../store/DmsContext';
import { getFileTypeFromName } from '../utils/dmsUtils';
import type { DMSFile } from '../types/dms.types';

interface UploadDropzoneProps {
  folderId?: string;
  onClose: () => void;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({ folderId, onClose }) => {
  const { state, dispatch } = useDMS();
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number; status: 'done' | 'error' }[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      const newFile: DMSFile = {
        id: `file-upload-${Date.now()}-${Math.random()}`,
        name: file.name,
        type: getFileTypeFromName(file.name),
        size: file.size,
        folderId: folderId || 'f-temp',
        folderPath: [],
        status: 'draft',
        tags: [],
        notes: '',
        isPinned: false,
        isLocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'Current User',
        updatedBy: 'Current User',
        cloudSynced: false,
        metadata: {
          inquiryNumber: '', clientName: '', projectName: '',
          revisionNumber: '-', exportDate: new Date().toISOString(),
          templateUsed: '', exportedBy: 'Current User',
          totalPages: 0, fileSizeEstimate: '',
        },
        activityLog: [{ id: Date.now().toString(), action: 'Uploaded', userId: 'user', userName: 'Current User', timestamp: new Date().toISOString() }],
      };
      dispatch({ type: 'ADD_FILE', payload: newFile });
      setUploadedFiles(prev => [...prev, { name: file.name, size: file.size, status: 'done' }]);
    });
  }, [folderId, dispatch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(6px)', zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '20px', padding: '32px',
          width: '520px', maxWidth: '90vw',
          boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>Upload Files</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Uploading to: {state.folders.find(f => f.id === folderId)?.name || 'All Files'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#94a3b8' }}>✕</button>
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          style={{
            border: `2px dashed ${isDragActive ? '#1E3A8A' : '#e2e8f0'}`,
            borderRadius: '16px', padding: '40px 20px',
            textAlign: 'center', cursor: 'pointer',
            background: isDragActive ? 'rgba(30, 58, 138,0.04)' : '#f8fafc',
            transition: 'all 0.2s ease',
            marginBottom: '16px',
          }}
        >
          <input {...getInputProps()} />
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>{isDragActive ? '📂' : '📁'}</div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
            {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
          </div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>or click to browse your computer</div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#cbd5e1' }}>
            Supports DOCX, PDF, Images, Excel, and more
          </div>
        </div>

        {/* Uploaded files list */}
        {uploadedFiles.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
              UPLOADED ({uploadedFiles.length})
            </div>
            {uploadedFiles.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 12px', borderRadius: '8px',
                background: '#f0fdf4', border: '1px solid #bbf7d0',
              }}>
                <span style={{ fontSize: '16px' }}>✅</span>
                <span style={{ flex: 1, fontSize: '12px', fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{(f.size / 1024).toFixed(0)} KB</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: '9px', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
            {uploadedFiles.length > 0 ? 'Done' : 'Cancel'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UploadDropzone;
