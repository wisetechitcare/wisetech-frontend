import React from 'react';
import { motion } from 'framer-motion';
import { useDMS } from '../store/DmsContext';
import { formatBytes } from '../utils/dmsUtils';

export const StorageUsageWidget: React.FC = () => {
  const { state } = useDMS();
  const { storageStats, files } = state;
  const usedPct = Math.min(100, (storageStats.totalUsed / storageStats.totalLimit) * 100);

  const typeColors: Record<string, string> = {
    docx: '#2563eb', pdf: '#ef4444', image: '#265c8b',
    xlsx: '#10b981', text: '#64748b', unknown: '#94a3b8',
  };

  const stats = [
    { label: 'Total Files', value: files.length, icon: '📄' },
    { label: 'Revisions', value: storageStats.totalRevisions, icon: '🔄' },
    { label: 'Cloud Synced', value: storageStats.cloudSynced, icon: '☁️' },
    { label: 'Recent Exports', value: storageStats.recentExports, icon: '📤' },
  ];

  return (
    <div style={{ padding: '16px', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Storage bar */}
      <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>☁️ Storage</span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>{formatBytes(storageStats.totalUsed)} / {formatBytes(storageStats.totalLimit)}</span>
        </div>
        <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${usedPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              height: '100%', borderRadius: '4px',
              background: usedPct > 80 ? '#ef4444' : usedPct > 60 ? '#f59e0b' : '#1E3A8A',
            }}
          />
        </div>
        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>{usedPct.toFixed(1)}% used</div>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>{s.value}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* By type */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>By Type</div>
        {Object.entries(storageStats.byType)
          .filter(([, v]) => v > 0)
          .map(([type, bytes]) => {
            const pct = (bytes / storageStats.totalUsed) * 100;
            return (
              <div key={type} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>{type}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formatBytes(bytes)}</span>
                </div>
                <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    style={{ height: '100%', background: typeColors[type] || '#94a3b8', borderRadius: '3px' }}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default StorageUsageWidget;
