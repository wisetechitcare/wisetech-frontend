import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KTIcon } from '@metronic/helpers';
import { useDMS } from '../store/DmsContext';
import type { ViewMode, SortField, SortOrder } from '../types/dms.types';
import { successConfirmation, errorConfirmation, genericConfirmation } from '@utils/modal';
import * as dmsService from '../services/dmsService';

interface ExplorerToolbarProps {
  onUploadClick: () => void;
}

export const ExplorerToolbar: React.FC<ExplorerToolbarProps> = ({ onUploadClick }) => {
  const { state, dispatch, deleteFiles } = useDMS();
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const views: { mode: ViewMode; icon: string; label: string }[] = [
    { mode: 'grid', icon: 'element-11', label: 'Grid' },
    { mode: 'list', icon: 'row-horizontal', label: 'List' },
    { mode: 'compact', icon: 'burger-menu', label: 'Compact' },
    { mode: 'table', icon: 'grid', label: 'Table' },
  ];

  const sortOptions: { field: SortField; label: string }[] = [
    { field: 'name', label: 'Name' },
    { field: 'date', label: 'Date Modified' },
    { field: 'type', label: 'File Type' },
  ];

  const hasSelection = state.selectedFiles.length > 0;

  const handleSelectAll = () => {
    const filtered = state.files.filter(f => !state.currentFolderId || f.folderId === state.currentFolderId);
    if (state.selectedFiles.length === filtered.length) {
      dispatch({ type: 'CLEAR_SELECTION' });
    } else {
      dispatch({ type: 'SELECT_ALL_FILES', payload: filtered.map(f => f.id) });
    }
  };

  const handleBulkDelete = async () => {
    try {
      const confirmed = await genericConfirmation(
        "Confirm Bulk Deletion",
        `Are you sure you want to delete ${state.selectedFiles.length} file(s)? This action cannot be undone.`,
        "Delete Files"
      );
      
      if (confirmed) {
        await deleteFiles(state.selectedFiles);
        successConfirmation(`${state.selectedFiles.length} file(s) deleted successfully!`);
      }
    } catch (error) {
      errorConfirmation('Failed to delete files. Please try again.');
    }
  };

  const handleBulkArchive = () => {
    dispatch({ type: 'ARCHIVE_FILES', payload: state.selectedFiles });
  };
  
  const handleBulkDownload = async () => {
    const selectedFileData = state.files
      .filter(f => state.selectedFiles.includes(f.id) && f.s3Url)
      .map(f => ({ url: f.s3Url!, name: f.name, metadata: f.metadata }));
    
    if (selectedFileData.length === 0) {
      errorConfirmation('No files with valid URLs selected for download.');
      return;
    }

    try {
      successConfirmation(`Preparing ZIP for ${selectedFileData.length} file(s)...`);
      
      // Determine meaningful ZIP filename
      // 1. Get all unique inquiry numbers from selected files (excluding placeholders like '-')
      const inquiryNumbers = [...new Set(selectedFileData.map(f => f.metadata?.inquiryNumber))].filter(n => n && n !== '-');
      
      let zipName = "Proposals"; // Default for multiple leads
      if (inquiryNumbers.length === 1) {
        zipName = inquiryNumbers[0] as string; // Use the specific inquiry number if only one lead is involved
      } else if (inquiryNumbers.length === 0) {
        zipName = "DMS_Export"; // Fallback for manual uploads without metadata
      }

      await dmsService.downloadDocumentsAsZip(selectedFileData, `${zipName}.zip`);
    } catch (error) {
      errorConfirmation('Failed to generate ZIP file.');
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
      padding: '12px 16px',
      background: 'white',
      borderBottom: '1px solid #f1f5f9',
      flexWrap: 'nowrap',
      position: 'sticky', top: 0, zIndex: 10,
      overflowX: 'auto',
    }}>
      {/* LEFT GROUP: Search & File Type Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 auto', minWidth: 0 }}>
        <div style={{ position: 'relative', flex: '0 1 300px', minWidth: '150px' }}>
          <div style={{
            position: 'absolute', left: '12px', top: '50%',
            transform: 'translateY(-50%)', display: 'flex', alignItems: 'center'
          }}>
            <KTIcon iconName="magnifier" className="fs-3 text-muted" />
          </div>
          <input
            value={state.searchFilters.query}
            onChange={e => dispatch({ type: 'SET_SEARCH_FILTERS', payload: { query: e.target.value } })}
            placeholder="Search files..."
            style={{
              width: '100%', padding: '8px 12px 8px 38px',
              border: '1px solid #e2e8f0', borderRadius: '10px',
              fontSize: '13px', outline: 'none',
              fontFamily: 'Inter', color: '#1e293b',
              background: '#f8fafc',
              transition: 'all 0.2s ease',
            }}
            onFocus={e => { e.target.style.borderColor = '#1E3A8A'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 138,0.1)'; }}
            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
          />
          {state.searchFilters.query && (
            <button
              onClick={() => dispatch({ type: 'SET_SEARCH_FILTERS', payload: { query: '' } })}
              style={{
                position: 'absolute', right: '10px', top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center'
              }}
            >
              <KTIcon iconName="cross" className="fs-3 text-muted" />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '10px', flexShrink: 0 }}>
          {['pdf', 'docx'].map(type => {
            const isActive = state.searchFilters.fileTypes.includes(type as any);
            return (
              <button
                key={type}
                onClick={() => {
                  const newTypes = isActive
                    ? state.searchFilters.fileTypes.filter(t => t !== type)
                    : [...state.searchFilters.fileTypes, type as any];
                  dispatch({ type: 'SET_SEARCH_FILTERS', payload: { fileTypes: newTypes } });
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? 'white' : 'transparent',
                  color: isActive ? '#1E3A8A' : '#64748b',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <KTIcon 
                  iconName={type === 'pdf' ? 'pdf' : 'word'} 
                  className={`fs-5 ${isActive ? 'text-primary' : 'text-muted'}`} 
                />
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT GROUP: Actions, Sort, View Modes */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {/* Bulk actions */}
        <AnimatePresence>
          {hasSelection && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid #e2e8f0', paddingRight: '10px', marginRight: '2px' }}
            >
              <span style={{
                fontSize: '12px', fontWeight: 700, color: '#1E3A8A',
                background: 'rgba(30, 58, 138,0.08)', padding: '5px 12px',
                borderRadius: '8px', fontFamily: 'Inter',
              }}>
                {state.selectedFiles.length} selected
              </span>
              <ToolbarButton icon="cloud-download" label="Download" onClick={handleBulkDownload} />
              <ToolbarButton icon="trash" label="Delete" onClick={handleBulkDelete} danger />
            </motion.div>
          )}
        </AnimatePresence>

        <ToolbarButton 
          icon={state.selectedFiles.length > 0 && state.selectedFiles.length === state.files.filter(f => !state.currentFolderId || f.folderId === state.currentFolderId).length ? "cross-circle" : "check-square"} 
          label={state.selectedFiles.length > 0 && state.selectedFiles.length === state.files.filter(f => !state.currentFolderId || f.folderId === state.currentFolderId).length ? "Unselect All" : "Select All"} 
          onClick={handleSelectAll} 
        />

        <div style={{ position: 'relative' }}>
          <ToolbarButton
            icon="filter"
            label={sortOptions.find(s => s.field === state.sortField)?.label || 'Date'}
            onClick={() => setShowSortMenu(!showSortMenu)}
          />
          <AnimatePresence>
            {showSortMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                  background: 'white', borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                  border: '1px solid #e2e8f0', minWidth: '180px', overflow: 'hidden',
                  zIndex: 100,
                }}
              >
                {sortOptions.map(opt => (
                  <button
                    key={opt.field}
                    onClick={() => {
                      const newOrder: SortOrder = state.sortField === opt.field && state.sortOrder === 'asc' ? 'desc' : 'asc';
                      dispatch({ type: 'SET_SORT', payload: { field: opt.field, order: newOrder } });
                      setShowSortMenu(false);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '10px 16px',
                      background: state.sortField === opt.field ? 'rgba(30, 58, 138,0.06)' : 'none',
                      border: 'none', cursor: 'pointer',
                      fontSize: '13px',
                      color: state.sortField === opt.field ? '#1E3A8A' : '#374151',
                      fontFamily: 'Inter', fontWeight: state.sortField === opt.field ? 600 : 400,
                    }}
                  >
                    {opt.label}
                    {state.sortField === opt.field && (
                      <span className="ms-2">{state.sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{
          display: 'flex', gap: '2px',
          background: '#f1f5f9', borderRadius: '10px', padding: '3px',
        }}>
          {views.map(view => (
            <button
              key={view.mode}
              title={view.label}
              onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: view.mode })}
              style={{
                background: state.viewMode === view.mode ? 'white' : 'none',
                border: 'none', borderRadius: '8px',
                padding: '5px 10px', cursor: 'pointer',
                fontSize: '14px', color: state.viewMode === view.mode ? '#1E3A8A' : '#64748b',
                boxShadow: state.viewMode === view.mode ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <KTIcon 
                iconName={view.icon} 
                className={`fs-3 ${state.viewMode === view.mode ? 'text-primary' : 'text-muted'}`} 
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const ToolbarButton: React.FC<{ icon: string; label: string; onClick: () => void; danger?: boolean }> = ({ icon, label, onClick, danger }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '6px 12px', borderRadius: '8px',
      background: danger ? '#fef2f2' : 'white',
      border: danger ? '1px solid #fee2e2' : '1px solid #e2e8f0',
      color: danger ? '#ef4444' : '#475569',
      fontSize: '12px', fontWeight: 600,
      cursor: 'pointer', fontFamily: 'Inter',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    }}
  >
    <KTIcon iconName={icon} className={`fs-5 ${danger ? 'text-danger' : 'text-muted'}`} />
    {label}
  </motion.button>
);

export default ExplorerToolbar;
