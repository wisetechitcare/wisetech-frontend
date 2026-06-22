import React, { useState, useEffect } from 'react';
import { useDiff } from '../hooks/useRevisions';
import { DiffChange } from '../types/revisions.types';
import './DiffViewer.css';

interface DiffViewerProps {
  entityType: string;
  entityId: string;
  fromRevision: number;
  toRevision: number;
  compact?: boolean;
}

const getChangeTypeIcon = (changeType: string): string => {
  switch (changeType) {
    case 'ADDED':
      return '➕';
    case 'REMOVED':
      return '➖';
    case 'MODIFIED':
      return '✏️';
    default:
      return '•';
  }
};

const getChangeTypeBadgeClass = (changeType: string): string => {
  switch (changeType) {
    case 'ADDED':
      return 'badge-success';
    case 'REMOVED':
      return 'badge-danger';
    case 'MODIFIED':
      return 'badge-warning';
    default:
      return 'badge-secondary';
  }
};

export const DiffViewer: React.FC<DiffViewerProps> = ({
  entityType,
  entityId,
  fromRevision,
  toRevision,
  compact = false
}) => {
  const { changes, loading, error, fetchDiff } = useDiff(
    entityType,
    entityId,
    fromRevision,
    toRevision
  );
  const [viewMode, setViewMode] = useState<'unified' | 'side-by-side'>('unified');

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border spinner-border-sm text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger alert-sm mb-0">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (changes.length === 0) {
    return (
      <div className="alert alert-info alert-sm mb-0">
        No differences between Revision {fromRevision} and {toRevision}.
      </div>
    );
  }

  return (
    <div className="diff-viewer">
      <div className="diff-header">
        <div className="diff-title">
          <strong>Comparing</strong> Revision {fromRevision} → Revision {toRevision}
          <span className="badge bg-secondary ms-2">{changes.length} change{changes.length !== 1 ? 's' : ''}</span>
        </div>
        {!compact && (
          <div className="view-mode-toggle">
            <button
              className={`btn btn-sm ${viewMode === 'unified' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('unified')}
            >
              Unified
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'side-by-side' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('side-by-side')}
            >
              Side by Side
            </button>
          </div>
        )}
      </div>

      <div className="diff-content">
        {viewMode === 'unified' && (
          <div className="unified-diff">
            {changes.map((change, idx) => (
              <div key={idx} className="diff-block">
                <div className="diff-field-name">
                  <span className={`badge ${getChangeTypeBadgeClass(change.changeType)}`}>
                    {getChangeTypeIcon(change.changeType)} {change.changeType}
                  </span>
                  <strong>{change.fieldName}</strong>
                  {change.fieldLabel && <span className="text-muted ms-2">({change.fieldLabel})</span>}
                </div>

                <div className="diff-values">
                  <div className="diff-row old-value">
                    <span className="label">Old Value:</span>
                    <code>{change.oldValueFormatted || String(change.oldValue) || '(empty)'}</code>
                  </div>
                  <div className="diff-arrow">→</div>
                  <div className="diff-row new-value">
                    <span className="label">New Value:</span>
                    <code>{change.newValueFormatted || String(change.newValue) || '(empty)'}</code>
                  </div>
                </div>

                {change.lastChangedInRevision && (
                  <div className="diff-meta">
                    <small className="text-muted">
                      Last changed in Revision {change.lastChangedInRevision}
                    </small>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {viewMode === 'side-by-side' && (
          <div className="side-by-side-diff table-responsive">
            <table className="table table-sm table-bordered">
              <thead className="table-light">
                <tr>
                  <th width="25%">Field</th>
                  <th width="35%">Revision {fromRevision}</th>
                  <th width="35%">Revision {toRevision}</th>
                  <th width="5%">Type</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((change, idx) => (
                  <tr key={idx}>
                    <td className="field-column">
                      <strong>{change.fieldName}</strong>
                      {change.fieldLabel && (
                        <div className="text-muted small">{change.fieldLabel}</div>
                      )}
                    </td>
                    <td className="old-column">
                      <code>{change.oldValueFormatted || String(change.oldValue) || '—'}</code>
                    </td>
                    <td className="new-column">
                      <code>{change.newValueFormatted || String(change.newValue) || '—'}</code>
                    </td>
                    <td className="type-column">
                      <span className={`badge ${getChangeTypeBadgeClass(change.changeType)} small`}>
                        {change.changeType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiffViewer;
