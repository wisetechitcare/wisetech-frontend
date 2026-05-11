import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KTIcon } from '@metronic/helpers';
import { useDMS } from '../store/DmsContext';
import { FolderTree } from './FolderTree';
import { DocumentCard } from './DocumentCard';
import { ExplorerToolbar } from './ExplorerToolbar';
import { BreadcrumbNavigation } from './BreadcrumbNavigation';
import { FileDetailsSidebar } from './FileDetailsSidebar';
import { UploadDropzone } from './UploadDropzone';
import { RevisionTimeline } from './RevisionTimeline';
import { StorageUsageWidget } from './StorageUsageWidget';
import type { DMSFile } from '../types/dms.types';

export const DocumentManagementCenter: React.FC = () => {
  const { state, dispatch, getFilteredFiles, isGlobalMode } = useDMS();
  const [selectedFileForDetails, setSelectedFileForDetails] = useState<DMSFile | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'details' | 'timeline'>('details');
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);

  const filteredFiles = getFilteredFiles();

  return (
    <div style={{
      display: 'flex', height: 'calc(100vh - 180px)',
      background: '#f8fafc', borderRadius: '24px', overflow: 'hidden',
      border: '1px solid #e2e8f0', boxShadow: '0 10px 40px rgba(0,0,0,0.04)'
    }}>
      {/* Left Panel: Navigation */}
      <div style={{
        width: '280px', flexShrink: 0, borderRight: '1px solid #f1f5f9',
        background: 'white', display: 'flex', flexDirection: 'column', padding: '24px 16px'
      }}>
        <FolderTree />
      </div>

      {/* Center Panel: Explorer */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'white' }}>
        <ExplorerToolbar onUploadClick={() => setShowUpload(true)} />
        <BreadcrumbNavigation />

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {filteredFiles.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
              <KTIcon iconName={isGlobalMode ? 'abstract-26' : 'note-2'} className="fs-2 text-primary" />
              <h3 style={{ margin: '16px 0 8px', fontSize: '18px', fontWeight: 700 }}>Empty Folder</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>Upload files or generate proposals to see them here.</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: state.viewMode === 'grid' ? 'repeat(auto-fill, minmax(200px, 1fr))' : '1fr',
                gap: '16px'
              }}
            >
              {filteredFiles.map(file => (
                <DocumentCard
                  key={file.id}
                  file={file}
                  viewMode={state.viewMode}
                  isSelected={state.selectedFiles.includes(file.id)}
                  onSelect={() => dispatch({ type: 'TOGGLE_FILE_SELECTION', payload: file.id })}
                  onPreview={() => setSelectedFileForDetails(file)}
                  onDetails={() => {
                    setSelectedFileForDetails(file);
                    setActiveRightTab('details');
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{
        width: isRightPanelCollapsed ? '48px' : '360px', 
        flexShrink: 0, borderLeft: '1px solid #f1f5f9',
        background: 'white', display: 'flex', flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative'
      }}>
        {isRightPanelCollapsed ? (
          <div style={{ 
            height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0' 
          }}>
            <button
              onClick={() => setIsRightPanelCollapsed(false)}
              style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
                width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#9d4141', fontSize: '16px'
              }}
              title="Expand Details"
            >
              ◀
            </button>
            <div style={{
              writingMode: 'vertical-rl', transform: 'rotate(180deg)',
              marginTop: '20px', fontSize: '11px', fontWeight: 700,
              color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em'
            }}>
              {activeRightTab}
            </div>
          </div>
        ) : (
          <>
            <div style={{
              display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '12px 16px', gap: '16px'
            }}>
          {['details', 'timeline'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveRightTab(tab as any)}
              style={{
                background: 'none', border: 'none', padding: '8px 0',
                fontSize: '12px', fontWeight: 700, color: activeRightTab === tab ? '#9d4141' : '#64748b',
                textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
                position: 'relative'
              }}
            >
              {tab}
              {activeRightTab === tab && (
                <motion.div layoutId="tab-underline" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: '#9d4141' }} />
              )}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <AnimatePresence mode="wait">
            {activeRightTab === 'details' && (
              <FileDetailsSidebar
                key="details"
                file={selectedFileForDetails || filteredFiles[0] || null}
                onClose={() => setIsRightPanelCollapsed(true)}
              />
            )}
            {activeRightTab === 'timeline' && <RevisionTimeline key="timeline" />}
          </AnimatePresence>
        </div>
        </>
        )}
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {showUpload && <UploadDropzone onClose={() => setShowUpload(false)} />}
      </AnimatePresence>
    </div>
  );
};
