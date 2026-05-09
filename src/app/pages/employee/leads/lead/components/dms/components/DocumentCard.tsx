import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { KTIcon } from '@metronic/helpers';
import { useDMS } from '../store/DmsContext';
import { formatBytes, getStatusConfig } from '../utils/dmsUtils';
import type { DMSFile } from '../types/dms.types';
import * as dmsService from '../services/dmsService';

interface DocumentCardProps {
  file: DMSFile;
  viewMode: 'grid' | 'list' | 'compact' | 'table';
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onDetails: () => void;
}

const DocumentStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = getStatusConfig(status as any);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '20px',
      background: cfg.bg, color: cfg.color,
      fontSize: '10px', fontWeight: 700,
      fontFamily: 'Inter', letterSpacing: '0.03em',
      border: `1px solid ${cfg.color}22`,
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
};

const FileIcon: React.FC<{ type: string; exportType?: string; size?: number }> = ({ type, exportType, size = 40 }) => {
  const configs: Record<string, { icon: string; color: string; bg: string }> = {
    docx: { icon: 'file-text', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
    pdf: { icon: 'file-pdf', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    image: { icon: 'picture', color: '#265c8b', bg: 'rgba(38,92,139,0.1)' },
    xlsx: { icon: 'file-sheet', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    text: { icon: 'document', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
    unknown: { icon: 'file', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  };
  const cfg = configs[type] || configs.unknown;
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.22,
      background: cfg.bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <KTIcon iconName={cfg.icon} className={`fs-2 text-${cfg.color}`} />
      
      {exportType && (
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: size * 0.6,
          fontWeight: 900,
          color: cfg.color,
          opacity: 0.12,
          pointerEvents: 'none',
          userSelect: 'none',
          fontFamily: 'Inter',
        }}>
          {exportType === 'revision' ? 'R' : 'T'}
        </div>
      )}
    </div>
  );
};

const FileActionsDropdown: React.FC<{ file: DMSFile; onClose: () => void; onPreview: () => void; onDetails: () => void; onRename: () => void }> = ({ file, onClose, onPreview, onDetails, onRename }) => {
  const { dispatch } = useDMS();

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
    onClose();
  };

  const handlePreview = () => {
    if (file.s3Url) {
      dmsService.previewDocument(file.s3Url, file.name);
    } else {
      onPreview(); // Fallback to details sidebar if no URL
    }
  };

  const actions = [
    { icon: 'eye', label: 'Preview', action: () => { handlePreview(); onClose(); } },
    { icon: 'cloud-download', label: 'Download', action: handleDownload },
    { icon: 'pencil', label: 'Rename', action: () => { onRename(); onClose(); } },
    { icon: 'trash', label: 'Delete', action: () => { dispatch({ type: 'DELETE_FILES', payload: [file.id] }); onClose(); }, danger: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -8 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'absolute', top: '32px', right: '0', zIndex: 1000,
        background: 'white', borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.1)',
        border: '1px solid rgba(0,0,0,0.06)',
        minWidth: '180px', overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={action.action}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            width: '100%', padding: '9px 14px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '13px', color: action.danger ? '#ef4444' : '#374151',
            textAlign: 'left', transition: 'background 0.1s',
            borderTop: i > 0 && [3, 7, 9].includes(i) ? '1px solid #f1f5f9' : 'none',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = action.danger ? '#fef2f2' : '#f8fafc';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'none';
          }}
        >
          <KTIcon iconName={action.icon} className={`fs-4 ${action.danger ? 'text-danger' : ''}`} />
          {action.label}
        </button>
      ))}
    </motion.div>
  );
};

export const DocumentCard: React.FC<DocumentCardProps> = ({
  file, viewMode, isSelected, onSelect, onPreview, onDetails,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(file.name);
  const { dispatch } = useDMS();

  const handleRename = async () => {
    if (newName.trim() && newName !== file.name) {
      try {
        await dmsService.renameDocument(file.id, newName.trim());
        dispatch({ type: 'UPDATE_FILE', payload: { id: file.id, name: newName.trim() } });
      } catch (err) {
        console.error('Rename failed:', err);
        setNewName(file.name);
      }
    }
    setIsRenaming(false);
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

 if (viewMode === 'grid') {
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowMenu(false);
      }}
      style={{
        borderRadius: '18px',
        background: '#ffffff',
        border: isSelected
          ? '2px solid #9d4141'
          : isHovered
          ? '1px solid rgba(157,65,65,0.25)'
          : '1px solid #e2e8f0',
        boxShadow: isHovered
          ? '0 12px 32px rgba(0,0,0,0.08)'
          : '0 2px 10px rgba(0,0,0,0.04)',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        position: 'relative',
        overflow: 'visible',
        minHeight: '280px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Checkbox */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          width: '18px',
          height: '18px',
          border: isSelected
            ? '2px solid #9d4141'
            : '2px solid #cbd5e1',
          borderRadius: '5px',
          background: isSelected ? '#9d4141' : 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isSelected || isHovered ? 1 : 0,
          transition: 'all 0.15s',
          zIndex: 2,
          cursor: 'pointer',
        }}
      >
        {isSelected && (
          <span
            style={{
              color: 'white',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            ✓
          </span>
        )}
      </div>

      {/* Menu */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 2,
        }}
      >
        <button
          onClick={handleMenuToggle}
          style={{
            background: showMenu
              ? '#f1f5f9'
              : isHovered
              ? '#f8fafc'
              : 'transparent',
            border:
              '1px solid ' +
              (showMenu ? '#e2e8f0' : 'transparent'),
            borderRadius: '8px',
            padding: '3px 7px',
            cursor: 'pointer',
            fontSize: '16px',
            opacity: isHovered || showMenu ? 1 : 0,
            transition: 'all 0.15s',
          }}
        >
          ⋯
        </button>

        {showMenu && (
          <FileActionsDropdown
            file={file}
            onClose={() => setShowMenu(false)}
            onPreview={onPreview}
            onDetails={onDetails}
            onRename={() => setIsRenaming(true)}
          />
        )}
      </div>

      {/* Main Content */}
      <div
        onClick={onPreview}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: '100%',
          flex: 1,
        }}
      >
        {/* Icon */}
        <div
          style={{
            minHeight: '72px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '10px',
            marginBottom: '16px',
          }}
        >
          <FileIcon
            type={file.type}
            exportType={file.exportType}
            size={52}
          />
        </div>

        {/* File Name */}
        {isRenaming ? (
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              border: '1px solid #9d4141',
              borderRadius: '6px',
              padding: '6px 8px',
              fontSize: '12px',
              outline: 'none',
              fontFamily: 'Inter',
              marginBottom: '14px',
            }}
          />
        ) : (
          <div
            style={{
              minHeight: '42px',
              maxHeight: '42px',
              width: '100%',
              padding: '0 4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              textAlign: 'center',
              fontSize: '13px',
              fontWeight: 700,
              lineHeight: '1.45',
              color: '#0f172a',
              fontFamily: 'Inter',
              marginBottom: '14px',
              wordBreak: 'break-word',
            }}
          >
            {file.name}
          </div>
        )}

        {/* Status Badge */}
        <div
          style={{
            minHeight: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '10px',
          }}
        >
          <DocumentStatusBadge status={file.status} />
        </div>

        {/* Revision / Temp Badge */}
        <div
          style={{
            minHeight: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {file.exportType === 'revision' &&
            file.revisionNumber != null && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#2563eb',
                  background: 'rgba(37,99,235,0.10)',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontFamily: 'Inter',
                  letterSpacing: '0.03em',
                  minWidth: '76px',
                  textAlign: 'center',
                }}
              >
                REV_{String(file.revisionNumber).padStart(2, '0')}
              </span>
            )}

          {file.exportType === 'temporary' &&
            file.tempNumber != null && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#d97706',
                  background: 'rgba(245,158,11,0.10)',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontFamily: 'Inter',
                  letterSpacing: '0.03em',
                  minWidth: '76px',
                  textAlign: 'center',
                }}
              >
                TEMP_{String(file.tempNumber).padStart(2, '0')}
              </span>
            )}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Bottom Meta */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '18px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(148,163,184,0.14)',
            fontSize: '10px',
            color: '#94a3b8',
            fontFamily: 'Inter',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontWeight: 500,
            }}
          >
            {formatBytes(file.size)}
          </span>

          <span
            style={{
              fontWeight: 500,
            }}
          >
            {new Date(file.createdAt).toLocaleDateString(
              'en-IN',
              {
                day: '2-digit',
                month: 'short',
              }
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

  // List / Compact / Table view
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowMenu(false); }}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: viewMode === 'compact' ? '8px 12px' : '12px 16px',
        borderRadius: '10px',
        background: isSelected ? 'rgba(157,65,65,0.04)' : isHovered ? '#f8fafc' : 'white',
        border: isSelected ? '1px solid rgba(157,65,65,0.2)' : '1px solid transparent',
        cursor: 'pointer',
        transition: 'all 0.15s',
        position: 'relative',
      }}
    >
      {/* Checkbox */}
      <div
        onClick={e => { e.stopPropagation(); onSelect(); }}
        style={{
          width: '16px', height: '16px', flexShrink: 0,
          border: isSelected ? '2px solid #9d4141' : '2px solid #cbd5e1',
          borderRadius: '4px',
          background: isSelected ? '#9d4141' : 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: isSelected || isHovered ? 1 : 0,
          transition: 'all 0.15s',
          cursor: 'pointer',
        }}
      >
        {isSelected && <span style={{ color: 'white', fontSize: '10px', fontWeight: 700 }}>✓</span>}
      </div>

      <div onClick={onPreview} style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
        <FileIcon type={file.type} exportType={file.exportType} size={viewMode === 'compact' ? 28 : 36} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {isRenaming ? (
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setIsRenaming(false); }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', border: '1px solid #9d4141', borderRadius: '4px',
                padding: '1px 6px', fontSize: '13px', outline: 'none',
                fontFamily: 'Inter',
              }}
            />
          ) : (
            <div style={{
              fontSize: viewMode === 'compact' ? '12px' : '13px',
              fontWeight: 600, color: '#1e293b',
              fontFamily: 'Inter',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {file.name}
            </div>
          )}
          {viewMode !== 'compact' && (
            <div style={{ marginTop: '2px' }}>
              <span style={{ 
                fontSize: '10px', 
                fontWeight: 700, 
                color: file.exportType === 'revision' ? '#265c8b' : '#f59e0b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontFamily: 'Inter'
              }}>
                {file.exportType === 'revision' ? 'Revision' : (file.metadata.templateUsed || 'Temporary')}
              </span>
            </div>
          )}
          {viewMode !== 'compact' && file.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px', flexWrap: 'wrap' }}>
              {file.tags.slice(0, 2).map(tag => (
                <span key={tag} style={{
                  fontSize: '10px', color: '#64748b',
                  background: '#f1f5f9', padding: '1px 6px',
                  borderRadius: '4px', fontFamily: 'Inter',
                }}>{tag}</span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
          {viewMode !== 'compact' && (
            <>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'Inter', width: '60px', textAlign: 'right' }}>
                {formatBytes(file.size)}
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'Inter', width: '80px', textAlign: 'right' }}>
                {new Date(file.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </span>
            </>
          )}

        </div>
      </div>

      {/* Actions */}
      <div style={{ flexShrink: 0, position: 'relative' }}>
        <button
          onClick={handleMenuToggle}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px',
            opacity: isHovered || showMenu ? 1 : 0, transition: 'opacity 0.15s',
            padding: '2px 6px',
          }}
        >
          ⋯
        </button>
        {showMenu && (
          <FileActionsDropdown
            file={file}
            onClose={() => setShowMenu(false)}
            onPreview={onPreview}
            onDetails={onDetails}
            onRename={() => setIsRenaming(true)}
          />
        )}
      </div>
    </div>
  );
};

export { DocumentStatusBadge };
export default DocumentCard;
