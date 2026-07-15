import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KTIcon } from '@metronic/helpers';
import { useDMS } from '../store/DmsContext';
import type { DMSFolder } from '../types/dms.types';

interface FolderTreeProps {
  onFolderSelect?: (folderId: string | null) => void;
}

const FolderNode: React.FC<{
  folder: DMSFolder;
  depth: number;
  onSelect: (id: string | null) => void;
  activeFolderId: string | null;
}> = ({ folder, depth, onSelect, activeFolderId }) => {
  const { state, dispatch } = useDMS();
  const folderState = state.folders.find(f => f.id === folder.id) || folder;
  const children = state.folders.filter(f => f.parentId === folder.id);
  const isActive = activeFolderId === folder.id;
  const getRecursiveFileCount = (fld: DMSFolder): number => {
    let count = state.files.filter(f => f.folderId === fld.id).length;
    const directChildren = state.folders.filter(f => f.parentId === fld.id);
    directChildren.forEach(child => {
      count += getRecursiveFileCount(child);
    });
    return count;
  };
  const fileCount = getRecursiveFileCount(folderState);
  const hasChildren = children.length > 0;
  
  const [showActions, setShowActions] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState(folderState.name);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_FOLDER_EXPAND', payload: folder.id });
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(folder.id);
    if (hasChildren) {
      dispatch({ type: 'TOGGLE_FOLDER_EXPAND', payload: folder.id });
    }
  };

  const handleRename = () => {
    if (renameName.trim() && renameName !== folder.name) {
      dispatch({ type: 'RENAME_FOLDER', payload: { id: folder.id, name: renameName.trim() } });
    }
    setIsRenaming(false);
  };

  return (
    <div>
      <motion.div
        className="folder-node"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: `6px ${8 + depth * 16}px 6px 8px`,
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          background: isActive
            ? 'linear-gradient(135deg, rgba(30, 58, 138,0.12), rgba(30, 58, 138,0.06))'
            : 'transparent',
          border: isActive ? '1px solid rgba(30, 58, 138,0.2)' : '1px solid transparent',
          marginBottom: '2px',
          position: 'relative',
        }}
        onClick={handleSelect}
        whileHover={{ backgroundColor: isActive ? undefined : 'rgba(0,0,0,0.04)' }}
      >
        {/* Expand toggle */}
        <button
          onClick={handleToggle}
          style={{
            background: 'none', border: 'none', padding: '0 4px 0 0',
            cursor: hasChildren ? 'pointer' : 'default',
            opacity: hasChildren ? 1 : 0,
            width: '20px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <motion.div
            animate={{ rotate: folderState.isExpanded ? 90 : 0 }}
            transition={{ duration: 0.15 }}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <KTIcon iconName="right" className="fs-8 text-muted" />
          </motion.div>
        </button>

        {/* Folder icon */}
        <div style={{ marginRight: '8px', display: 'flex', alignItems: 'center' }}>
          <KTIcon iconName="folder" className="fs-3 text-primary" />
        </div>

        {/* Name */}
        {isRenaming ? (
          <input
            autoFocus
            value={renameName}
            onChange={e => setRenameName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setIsRenaming(false); }}
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1, border: '1px solid #1E3A8A', borderRadius: '4px',
              padding: '1px 4px', fontSize: '13px', outline: 'none',
              fontFamily: 'Inter, sans-serif',
            }}
          />
        ) : (
          <span style={{
            flex: 1, fontSize: '13px', fontWeight: isActive ? 600 : 500,
            color: isActive ? '#1E3A8A' : '#1e293b',
            fontFamily: 'Inter, sans-serif',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {folderState.name}
          </span>
        )}

        {/* File count badge */}
        {fileCount > 0 && (
          <span style={{
            fontSize: '10px', fontWeight: 700,
            color: isActive ? '#1E3A8A' : '#64748b',
            background: isActive ? 'rgba(30, 58, 138,0.12)' : 'rgba(0,0,0,0.06)',
            borderRadius: '10px', padding: '1px 6px',
            flexShrink: 0, marginLeft: '4px',
          }}>
            {fileCount}
          </span>
        )}


        {/* Actions */}
        <AnimatePresence>
          {showActions && !folderState.isSystem && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.1 }}
              style={{
                position: 'absolute', right: '8px',
                display: 'flex', gap: '2px',
                background: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                borderRadius: '6px', padding: '2px',
              }}
              onClick={e => e.stopPropagation()}
            >
              {[
                { icon: 'pencil', label: 'Rename', action: () => setIsRenaming(true) },
                { icon: 'trash', label: 'Delete', action: () => { if (confirm('Delete this folder?')) dispatch({ type: 'DELETE_FOLDER', payload: folder.id }); }, danger: true },
              ].map((a, i) => (
                <button
                  key={i}
                  title={a.label}
                  onClick={e => { e.stopPropagation(); a.action(); }}
                  style={{ 
                    ...actionBtnStyle, 
                    color: a.danger ? '#ef4444' : '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <KTIcon iconName={a.icon} className="fs-6" />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {folderState.isExpanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            {children.map(child => (
              <FolderNode
                key={child.id}
                folder={child}
                depth={depth + 1}
                onSelect={onSelect}
                activeFolderId={activeFolderId}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const actionBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: '12px', padding: '4px', borderRadius: '4px',
  transition: 'background 0.15s',
};

export const FolderTree: React.FC<FolderTreeProps> = ({ onFolderSelect }) => {
  const { state, dispatch, isGlobalMode } = useDMS();
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const rootFolder = state.folders.find(f => f.parentId === null);
  const recentFiles = state.files.slice(0, 5);

  const handleFolderSelect = (id: string | null) => {
    onFolderSelect?.(id);
    dispatch({ type: 'SET_CURRENT_FOLDER', payload: id });
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: DMSFolder = {
      id: `f-custom-${Date.now()}`,
      name: newFolderName.trim(),
      parentId: rootFolder?.id || null,
      children: [],
      fileCount: 0,
      totalSize: 0,
      isPinned: false,
      isExpanded: false,
      createdAt: new Date().toISOString(),
      icon: '📁',
    };
    dispatch({ type: 'ADD_FOLDER', payload: newFolder });
    setNewFolderName('');
    setShowCreateInput(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: '4px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Inter' }}>
          {isGlobalMode ? 'Global Repository' : 'Project Structure'}
        </span>
      </div>

      {/* New folder input */}
      <AnimatePresence>
        {showCreateInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
              <input
                autoFocus
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowCreateInput(false); }}
                placeholder="Folder name..."
                style={{
                  flex: 1, border: '1px solid #1E3A8A', borderRadius: '6px',
                  padding: '4px 8px', fontSize: '12px', outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
              <button onClick={handleCreateFolder} style={{ background: '#1E3A8A', border: 'none', borderRadius: '6px', padding: '4px 8px', color: 'white', cursor: 'pointer', fontSize: '12px' }}>
                ✓
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All Files / This Project */}
      <motion.div
        onClick={() => handleFolderSelect(null)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px', borderRadius: '8px', cursor: 'pointer',
          background: !state.currentFolderId ? 'linear-gradient(135deg, rgba(30, 58, 138,0.12), rgba(30, 58, 138,0.06))' : 'transparent',
          border: !state.currentFolderId ? '1px solid rgba(30, 58, 138,0.2)' : '1px solid transparent',
          marginBottom: '4px',
        }}
        whileHover={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
      >
        <KTIcon iconName={isGlobalMode ? 'abstract-26' : 'note-2'} className="fs-2 text-primary" />
        <span style={{ fontSize: '13px', fontWeight: !state.currentFolderId ? 700 : 500, color: !state.currentFolderId ? '#1E3A8A' : '#1e293b', fontFamily: 'Inter' }}>
          {isGlobalMode ? 'All Files' : (rootFolder?.name || 'Lead Documents')}
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: '10px', fontWeight: 700,
          color: '#64748b', background: 'rgba(0,0,0,0.06)',
          borderRadius: '10px', padding: '1px 6px',
        }}>
          {state.files.length}
        </span>
      </motion.div>

      {/* Folder Tree */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {rootFolder && (
          <FolderNode
            folder={rootFolder}
            depth={0}
            onSelect={handleFolderSelect}
            activeFolderId={state.currentFolderId}
          />
        )}
      </div>


      {/* Recent */}
      {recentFiles.length > 0 && (
        <>
          <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />
          <div style={{ 
            fontSize: '11px', fontWeight: 700, color: '#64748b', 
            textTransform: 'uppercase', letterSpacing: '0.08em', 
            padding: '0 4px', fontFamily: 'Inter',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <KTIcon iconName="time" className="fs-6 text-muted" /> Recent
          </div>
          {recentFiles.map(file => (
            <div key={file.id} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 8px', borderRadius: '8px', cursor: 'pointer',
              transition: 'background 0.1s'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <KTIcon iconName="file" className="fs-7 text-muted" />
              <span style={{
                fontSize: '11px', color: '#64748b', fontFamily: 'Inter',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                flex: 1,
              }}>{file.name}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default FolderTree;
