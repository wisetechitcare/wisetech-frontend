import React, { useState } from 'react';
import { useRevisions } from '../hooks/useRevisions';
import { Revision } from '../types/revisions.types';
import RevisionDetailModal from './RevisionDetailModal';
import './RevisionTimeline.css';

interface RevisionTimelineProps {
  entityType: string;
  entityId: string;
  compact?: boolean;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getImpactColor = (impact?: string): string => {
  switch (impact) {
    case 'CRITICAL':
      return '#dc3545';
    case 'MAJOR':
      return '#fd7e14';
    case 'MINOR':
      return '#17a2b8';
    default:
      return '#6c757d';
  }
};

const getCategoryBadgeClass = (category: string): string => {
  const classMap: Record<string, string> = {
    STATUS: 'badge-primary',
    FINANCIAL: 'badge-success',
    TEAM: 'badge-info',
    LOCATION: 'badge-secondary',
    DATES: 'badge-warning',
    CONTACT: 'badge-light',
    COMMERCIAL: 'badge-danger',
    RESTORE: 'badge-purple',
    BASIC_INFO: 'badge-muted'
  };
  return classMap[category] || 'badge-secondary';
};

export const RevisionTimeline: React.FC<RevisionTimelineProps> = ({
  entityType,
  entityId,
  compact = false
}) => {
  const { revisions, loading, error, pagination, fetchRevisions } = useRevisions(
    entityType,
    entityId
  );
  const [selectedRevision, setSelectedRevision] = useState<Revision | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (revisions.length === 0) {
    return (
      <div className="alert alert-info" role="alert">
        No revision history available for this {entityType.toLowerCase()}.
      </div>
    );
  }

  const displayRevisions = compact ? revisions.slice(0, 5) : revisions;

  const handleRevisionClick = (revision: Revision) => {
    setSelectedRevision(revision);
    setShowDetail(true);
  };

  return (
    <>
      <div className="revision-timeline">
        <div className="timeline-header">
          <h5 className="mb-0">
            Revision History
            <span className="badge bg-secondary ms-2">{pagination.total}</span>
          </h5>
        </div>

        <div className="timeline-container">
          {displayRevisions.map((revision, index) => (
            <div key={revision.id} className="timeline-item">
              <div className="timeline-dot" style={{ borderColor: getImpactColor() }} />

              <div className="timeline-content">
                <div className="timeline-header-row">
                  <div className="flex-grow-1">
                    <span className={`badge ${getCategoryBadgeClass(revision.category)} me-2`}>
                      {revision.category}
                    </span>
                    <span className="badge bg-light text-dark">R{revision.revisionNumber}</span>
                  </div>
                  <button
                    className="btn btn-sm btn-link p-0"
                    onClick={() => handleRevisionClick(revision)}
                    title="View details"
                  >
                    Details →
                  </button>
                </div>

                <p className="timeline-summary mb-2">{revision.summary}</p>

                <div className="timeline-meta">
                  <span className="meta-item">
                    <i className="ki-duotone ki-profile-user"></i>
                    {revision.changedByFirstName} {revision.changedByLastName}
                  </span>
                  <span className="meta-item">
                    <i className="ki-duotone ki-calendar"></i>
                    {formatDate(revision.changedAt)}
                  </span>
                  {revision.changeSource && (
                    <span className="meta-item">
                      <i className="ki-duotone ki-arrow-from-top-left"></i>
                      {revision.changeSource}
                    </span>
                  )}
                  <span className="meta-item">
                    <i className="ki-duotone ki-element-11"></i>
                    {revision.changes.length} field{revision.changes.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {revision.changes.length > 0 && !compact && (
                  <div className="timeline-changes mt-3">
                    <small className="text-muted mb-2 d-block">Changes:</small>
                    <ul className="list-unstyled ms-3">
                      {revision.changes.slice(0, 3).map((change, idx) => (
                        <li key={idx} className="mb-1">
                          <small>
                            <strong>{change.fieldName}</strong>: {change.oldValueFormatted || change.oldValue}{' '}
                            → {change.newValueFormatted || change.newValue}
                          </small>
                        </li>
                      ))}
                      {revision.changes.length > 3 && (
                        <li className="text-primary small">
                          +{revision.changes.length - 3} more change
                          {revision.changes.length - 3 !== 1 ? 's' : ''}
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {compact && revisions.length > 5 && (
          <div className="timeline-footer text-center mt-3">
            <small className="text-muted">
              Showing 5 of {pagination.total} revisions
            </small>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <nav className="mt-4">
            <ul className="pagination pagination-sm justify-content-center">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <li key={page} className={`page-item ${pagination.page === page ? 'active' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => fetchRevisions(page)}
                  >
                    {page}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      {showDetail && selectedRevision && (
        <RevisionDetailModal
          revision={selectedRevision}
          entityType={entityType}
          entityId={entityId}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  );
};

export default RevisionTimeline;
