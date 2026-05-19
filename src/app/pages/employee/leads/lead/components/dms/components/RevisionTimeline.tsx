import React from 'react';
import { motion } from 'framer-motion';
import { useDMS } from '../store/DmsContext';
import { formatBytes, formatDate, getStatusConfig } from '../utils/dmsUtils';
import { KTIcon } from '@metronic/helpers';
import { downloadDocument } from '../services/dmsService';

export const RevisionTimeline: React.FC = () => {
  const { state } = useDMS();
  const revisionFiles = state.files
    .filter(f => f.exportType === 'revision' || f.revisionNumber != null)
    .sort((a, b) => (b.revisionNumber || 0) - (a.revisionNumber || 0)); // Descending order (latest first)

  if (revisionFiles.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ 
          width: '80px', height: '80px', borderRadius: '50%', 
          background: '#f8fafc', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', margin: '0 auto 20px' 
        }}>
          <KTIcon iconName="time" className="fs-3x text-gray-300" />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '8px', fontFamily: 'Barlow' }}>
          No Revisions Found
        </h3>
        <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '240px', margin: '0 auto', fontFamily: 'Inter' }}>
          When you export revisions of this lead, they will appear here in a structured timeline.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
        marginBottom: '28px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            width: '32px', height: '32px', borderRadius: '8px', 
            background: 'rgba(157,65,65,0.1)', display: 'flex', 
            alignItems: 'center', justifyContent: 'center' 
          }}>
            <KTIcon iconName="time" className="fs-3 text-primary" />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0, fontFamily: 'Barlow' }}>
            Revision History
          </h2>
        </div>
        <span style={{ 
          fontSize: '12px', fontWeight: 600, color: '#64748b', 
          background: '#f1f5f9', padding: '4px 12px', borderRadius: '20px' 
        }}>
          {revisionFiles.length} {revisionFiles.length === 1 ? 'Entry' : 'Entries'}
        </span>
      </div>

      <div style={{ position: 'relative', paddingLeft: '40px' }}>
        {/* Vertical line with gradient */}
        <div style={{ 
          position: 'absolute', left: '16px', top: '10px', bottom: '10px', 
          width: '2px', background: 'linear-gradient(180deg, #9d4141 0%, #e2e8f0 100%)',
          borderRadius: '1px'
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {revisionFiles.map((file, i) => {
            const cfg = getStatusConfig(file.status);
            const isLatest = i === 0; // Since sorted descending
            
            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                style={{ position: 'relative' }}
              >
                {/* Node Point */}
                <div style={{
                  position: 'absolute', left: '-32px', top: '12px',
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: isLatest ? '#9d4141' : 'white',
                  border: `3px solid ${isLatest ? '#fef2f2' : '#cbd5e1'}`,
                  boxShadow: isLatest ? '0 0 0 4px rgba(157,65,65,0.1)' : '0 2px 4px rgba(0,0,0,0.05)',
                  zIndex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {isLatest && (
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{ 
                        position: 'absolute', width: '100%', height: '100%', 
                        borderRadius: '50%', background: '#9d4141' 
                      }}
                    />
                  )}
                </div>

                <div 
                  style={{
                    background: 'white',
                    border: isLatest ? '1px solid rgba(157,65,65,0.2)' : '1px solid #e2e8f0',
                    borderRadius: '12px', padding: '14px 16px',
                    boxShadow: isLatest ? '0 8px 20px -6px rgba(157,65,65,0.06)' : '0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Highlight bar for latest */}
                  {isLatest && (
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: '#9d4141' }} />
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '10px', fontWeight: 800,
                        color: '#9d4141', background: 'rgba(157,65,65,0.08)',
                        padding: '2px 8px', borderRadius: '4px',
                        textTransform: 'uppercase'
                      }}>
                        REV {String(file.revisionNumber || 0).padStart(2, '0')}
                      </span>
                      
                      <span style={{ 
                        fontSize: '10px', fontWeight: 700, padding: '2px 8px', 
                        borderRadius: '4px', background: cfg.bg, color: cfg.color,
                        textTransform: 'uppercase'
                      }}>
                        {cfg.label}
                      </span>
                    </div>

                    <button 
                      onClick={() => downloadDocument(file.s3Url || '', file.name)}
                      style={{
                        background: 'transparent', border: 'none', borderRadius: '6px',
                        padding: '4px', cursor: 'pointer', color: '#9d4141', 
                        display: 'flex', alignItems: 'center', transition: 'all 0.15s'
                      }}
                      title="Download"
                    >
                      <KTIcon iconName="cloud-download" className="fs-2" />
                    </button>
                  </div>

                  <h4 style={{ 
                    fontSize: '13px', fontWeight: 700, color: '#0f172a', 
                    marginBottom: '8px', wordBreak: 'break-word', lineHeight: 1.4,
                    fontFamily: 'Inter'
                  }}>
                    {file.name}
                  </h4>

                  <div style={{ 
                    display: 'flex', gap: '16px', alignItems: 'center',
                    borderTop: '1px solid #f1f5f9', paddingTop: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#64748b' }}>
                      <KTIcon iconName="calendar" className="fs-7" />
                      {formatDate(file.createdAt).split(',')[0]}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#64748b' }}>
                      <KTIcon iconName="profile-circle" className="fs-7" />
                      {file.createdBy.split(' ')[0]}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#64748b' }}>
                      <KTIcon iconName="package" className="fs-7" />
                      {formatBytes(file.size)}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RevisionTimeline;
