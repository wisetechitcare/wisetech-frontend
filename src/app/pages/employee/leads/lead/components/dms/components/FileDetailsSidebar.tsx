import React from 'react';
import { motion } from 'framer-motion';
import { KTIcon } from '@metronic/helpers';
import { useDMS } from '../store/DmsContext';
import * as dmsService from '../services/dmsService';
import { formatBytes, formatDate, getStatusConfig, getExportTypeConfig } from '../utils/dmsUtils';
import { successConfirmation, errorConfirmation, rejectConfirmation } from '@utils/modal';
import type { DMSFile } from '../types/dms.types';
import { canDo } from '@utils/can';

interface FileDetailsSidebarProps {
  file: DMSFile | null;
  onClose: () => void;
}

export const FileDetailsSidebar: React.FC<FileDetailsSidebarProps> = ({ file, onClose }) => {
  const { dispatch, deleteFiles } = useDMS();
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [newName, setNewName] = React.useState(file?.name || '');

  React.useEffect(() => {
    if (file) {
      setNewName(file.name);
      setIsRenaming(false);
    }
  }, [file]);

  if (!file) return null;

  const handleRename = async () => {
    if (newName.trim() && newName !== file.name) {
      try {
        await dmsService.renameDocument(file.id, newName.trim());
        dispatch({ type: 'UPDATE_FILE', payload: { id: file.id, name: newName.trim() } });
        successConfirmation('File renamed successfully!');
      } catch (err) {
        console.error('Rename failed:', err);
        errorConfirmation('Failed to rename file.');
        setNewName(file.name);
      }
    }
    setIsRenaming(false);
  };

  const handleDelete = async () => {
    try {
      const confirmed = await rejectConfirmation(
        'Are you sure you want to permanently delete this document? This action cannot be undone.'
      );
      
      if (confirmed) {
        await deleteFiles([file.id]);
        successConfirmation('Document deleted successfully!');
        onClose();
      }
    } catch (err) {
      console.error('Delete failed:', err);
      errorConfirmation('Failed to delete document. Please try again.');
    }
  };
  const statusCfg = getStatusConfig(file.status);
  const exportCfg = file.exportType ? getExportTypeConfig(file.exportType) : null;

  const handleDownload = async () => {
    if (file.s3Url) {
      await dmsService.downloadDocument(file.s3Url, file.name);
    } else {
      const dummyContent = new Uint8Array([80, 75, 3, 4, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const blob = new Blob([dummyContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const FileIconWithWatermark: React.FC<{ type: string; exportType?: string }> = ({ type, exportType }) => {
    const isDocx = type === 'docx';
    const isPdf = type === 'pdf';
    const color = isDocx ? '#2563eb' : isPdf ? '#ef4444' : '#64748b';
    const bg = isDocx ? 'rgba(37,99,235,0.06)' : isPdf ? 'rgba(239,68,68,0.06)' : 'rgba(100,116,139,0.06)';
    
    return (
      <div style={{
        width: '80px', height: '80px', borderRadius: '18px',
        background: bg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 16px',
        position: 'relative', overflow: 'hidden',
        border: `1px solid ${color}15`,
      }}>
        <KTIcon 
          iconName={isDocx ? 'file-text' : isPdf ? 'file-pdf' : 'file'} 
          className={`fs-5x text-${isDocx ? 'primary' : isPdf ? 'danger' : 'muted'}`}
        />
        {exportType && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '44px', fontWeight: 900, color,
            opacity: 0.1, pointerEvents: 'none', userSelect: 'none',
            fontFamily: 'Inter',
          }}>
            {exportType === 'revision' ? 'R' : 'T'}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{
        width: '320px', flexShrink: 0,
        background: 'white',
        borderLeft: '1px solid #f1f5f9',
        display: 'flex', flexDirection: 'column',
        height: '100%', overflowY: 'auto',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>File Details</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Minimize">
          <KTIcon iconName="arrow-right" className="fs-2 text-muted" />
        </button>
      </div>

      {/* File Info Section */}
      <div style={{ padding: '24px 20px', textAlign: 'center', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)' }}>
        <FileIconWithWatermark type={file.type} exportType={file.exportType} />
        
        {isRenaming ? (
          <div style={{ padding: '0 4px' }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setIsRenaming(false); }}
              style={{
                width: '100%', border: '2px solid #3b82f6', borderRadius: '8px',
                padding: '8px 12px', fontSize: '13px', outline: 'none',
                fontFamily: 'Inter', textAlign: 'center', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)'
              }}
            />
          </div>
        ) : (
          <div style={{ 
            fontSize: '15px', fontWeight: 700, color: '#0f172a', 
            wordBreak: 'break-word', lineHeight: 1.5,
            padding: '0 10px'
          }}>
            {file.name}
          </div>
        )}

        {/* Badges removed for simplicity, as they are now in the watermark */}
      </div>

      {/* Action Grid */}
      <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        {[
          { icon: 'cloud-download', label: 'Download', action: handleDownload },
          {
            icon: 'eye',
            label: 'Preview',
            action: () => {
              if (file.s3Url) {
                dmsService.previewDocument(file.s3Url, file.name);
              }
            }
          },
          ...(canDo('crm.leads', 'update') ? [
            { icon: 'pencil', label: 'Rename', action: () => setIsRenaming(true) },
            { icon: 'trash', label: 'Delete', action: handleDelete, danger: true },
          ] : []),
        ].map(a => (
          <motion.button 
            key={a.label} 
            whileHover={{ y: -1, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
            whileTap={{ scale: 0.98 }}
            onClick={a.action}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '12px 8px', borderRadius: '12px',
              background: a.danger ? '#fff1f2' : 'white', 
              border: `1px solid ${a.danger ? '#fecaca' : '#e2e8f0'}`,
              fontSize: '12px', fontWeight: 600, cursor: 'pointer', 
              color: a.danger ? '#e11d48' : '#475569',
              transition: 'all 0.15s ease',
            }}
          >
            <KTIcon iconName={a.icon} className={`fs-3 ${a.danger ? 'text-danger' : 'text-primary'}`} />
            {a.label}
          </motion.button>
        ))}
      </div>

      {/* Metadata */}
      <div style={{ padding: '16px' }}>
        <Section title="📋 Document Metadata">
          <Row label="Inquiry No." value={file.metadata.inquiryNumber} />
          <Row label="Client" value={file.metadata.clientName} />
          <Row label="Project" value={file.metadata.projectName} />
          {file.exportType === 'revision' ? (
            <Row label="Revision" value={file.revisionNumber != null ? `REV_${String(file.revisionNumber).padStart(2, '0')}` : '-'} />
          ) : (
            <Row label="Temp Version" value={file.tempNumber != null ? `TEMP_${String(file.tempNumber).padStart(2, '0')}` : '-'} />
          )}
          <Row label="Template" value={file.metadata.templateUsed} />
          {/* <Row label="Exported By" value={file.metadata.exportedBy} /> */}
          <Row label="Pages" value={String(file.metadata.totalPages)} />
          <Row label="Size" value={formatBytes(file.size)} />
        </Section>

        <Section title="🕐 Timeline">
          <Row label="Created" value={formatDate(file.createdAt)} />
          <Row label="Modified" value={formatDate(file.updatedAt)} />
          <Row label="Created By" value={file.createdBy} />
        </Section>

        {file.tags.length > 0 && (
          <Section title="🏷️ Tags">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {file.tags.map(tag => (
                <span key={tag} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>
                  {tag}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Revision Timeline */}
        {file.activityLog.length > 0 && (
          <Section title="📅 Activity Log">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {file.activityLog.map((entry, i) => (
                <div key={entry.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9d4141', flexShrink: 0, marginTop: '4px' }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{entry.action}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{entry.userName} · {formatDate(entry.timestamp)}</div>
                    {entry.details && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{entry.details}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </motion.div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: '20px' }}>
    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>{title}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>{children}</div>
  </div>
);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
    <span style={{ color: '#94a3b8', fontWeight: 500 }}>{label}</span>
    <span style={{ color: '#1e293b', fontWeight: 600, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{value || '-'}</span>
  </div>
);

export default FileDetailsSidebar;
