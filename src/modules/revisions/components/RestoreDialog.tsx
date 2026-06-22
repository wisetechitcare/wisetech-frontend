import React, { useState } from 'react';
import RevisionsService from '../services/revisions.service';
import './RestoreDialog.css';

interface RestoreDialogProps {
  entityType: string;
  entityId: string;
  revisionNumber: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RestoreDialog: React.FC<RestoreDialogProps> = ({
  entityType,
  entityId,
  revisionNumber,
  onClose,
  onSuccess
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRestore = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for the restore operation');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await RevisionsService.restoreRevision(
        entityType,
        entityId,
        revisionNumber,
        reason
      );
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore revision');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal fade show restore-dialog" style={{ display: 'block' }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header bg-danger bg-opacity-10 border-danger">
              <h5 className="modal-title text-danger">
                <i className="ki-duotone ki-warning-2"></i> Restore Revision
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={loading}
              ></button>
            </div>

            {success ? (
              <div className="modal-body p-4">
                <div className="text-center">
                  <div className="alert alert-success mb-3" role="alert">
                    <i className="ki-duotone ki-check-circle fs-2x mb-2"></i>
                    <h5 className="mb-1">Restore Successful</h5>
                    <p className="mb-0">
                      The {entityType} has been restored to Revision {revisionNumber}.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="modal-body">
                  <div className="alert alert-warning" role="alert">
                    <strong>Warning:</strong> You are about to restore this {entityType.toLowerCase()} to{' '}
                    <strong>Revision #{revisionNumber}</strong>. This action will create a new revision
                    with all changes reverted.
                  </div>

                  {error && (
                    <div className="alert alert-danger" role="alert">
                      {error}
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="restore-reason" className="form-label">
                      Reason for Restore <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="restore-reason"
                      className="form-control"
                      rows={4}
                      placeholder="Please explain why you are restoring to this previous version..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      disabled={loading}
                      maxLength={500}
                    />
                    <small className="form-text text-muted">
                      {reason.length}/500 characters
                    </small>
                  </div>

                  <div className="alert alert-info" role="alert">
                    <strong>Note:</strong> This action is fully auditable. The restore will be logged
                    as a new revision with your reason and timestamp.
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleRestore}
                    disabled={loading || !reason.trim()}
                  >
                    {loading && (
                      <span className="spinner-border spinner-border-sm me-2" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </span>
                    )}
                    Restore to Revision {revisionNumber}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      <div className="modal-backdrop fade show"></div>
    </>
  );
};

export default RestoreDialog;
