import React, { useState } from 'react';
import { useRevisionDetail } from '../hooks/useRevisions';
import { Revision } from '../types/revisions.types';
import DiffViewer from './DiffViewer';
import RestoreDialog from './RestoreDialog';
import './RevisionDetailModal.css';

interface RevisionDetailModalProps {
  revision: Revision;
  entityType: string;
  entityId: string;
  onClose: () => void;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

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

export const RevisionDetailModal: React.FC<RevisionDetailModalProps> = ({
  revision,
  entityType,
  entityId,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'diff' | 'compare'>('details');
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [compareRevisionNumber, setCompareRevisionNumber] = useState<number | undefined>();

  const handleRestore = async () => {
    setShowRestoreDialog(true);
  };

  return (
    <>
      <div className="modal fade show revision-detail-modal" style={{ display: 'block' }}>
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h5 className="modal-title mb-1">
                  Revision #{revision.revisionNumber} - {revision.summary}
                </h5>
                <small className="text-muted">{entityType} • {formatDate(revision.changedAt)}</small>
              </div>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>

            <div className="modal-body">
              {/* Summary Section */}
              <div className="revision-summary mb-4 p-3 bg-light rounded">
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <strong>Changed By:</strong>
                      <p className="mb-0">
                        {revision.changedByFirstName} {revision.changedByLastName}
                      </p>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <strong>Source:</strong>
                      <p className="mb-0">{revision.changeSource || 'UI_FORM'}</p>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <strong>Category:</strong>
                      <p className="mb-0">
                        <span className="badge bg-primary">{revision.category}</span>
                      </p>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <strong>Fields Changed:</strong>
                      <p className="mb-0">{revision.changes.length}</p>
                    </div>
                  </div>
                  {revision.changeReason && (
                    <div className="col-12">
                      <div className="mb-3">
                        <strong>Reason:</strong>
                        <p className="mb-0">{revision.changeReason}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <ul className="nav nav-tabs mb-3" role="tablist">
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'details' ? 'active' : ''}`}
                    onClick={() => setActiveTab('details')}
                    role="tab"
                  >
                    Changes ({revision.changes.length})
                  </button>
                </li>
              </ul>

              {/* Changes Table */}
              {activeTab === 'details' && (
                <div className="revision-changes">
                  {revision.changes.length === 0 ? (
                    <div className="alert alert-info mb-0">No changes in this revision.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>Field</th>
                            <th>Old Value</th>
                            <th>New Value</th>
                            <th>Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {revision.changes.map((change, idx) => (
                            <tr key={idx} className="align-middle">
                              <td>
                                <span>{change.fieldName}</span>
                                {change.isSensitive && (
                                  <span className="badge bg-warning ms-2">Sensitive</span>
                                )}
                              </td>
                              <td>
                                <code className="small bg-light px-2 py-1 rounded">
                                  {change.oldValueFormatted || String(change.oldValue)?.substring(0, 50) || 'N/A'}
                                </code>
                              </td>
                              <td>
                                <code className="small bg-light px-2 py-1 rounded">
                                  {change.newValueFormatted || String(change.newValue)?.substring(0, 50) || 'N/A'}
                                </code>
                              </td>
                              <td>
                                <span className={`badge ${getChangeTypeBadgeClass(change.changeType)}`}>
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
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onClose}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleRestore}
              >
                <i className="ki-duotone ki-arrow-back"></i> Restore This Version
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      <div className="modal-backdrop fade show"></div>

      {/* Restore Dialog */}
      {showRestoreDialog && (
        <RestoreDialog
          entityType={entityType}
          entityId={entityId}
          revisionNumber={revision.revisionNumber}
          onClose={() => setShowRestoreDialog(false)}
          onSuccess={() => {
            setShowRestoreDialog(false);
            onClose();
          }}
        />
      )}
    </>
  );
};

export default RevisionDetailModal;
