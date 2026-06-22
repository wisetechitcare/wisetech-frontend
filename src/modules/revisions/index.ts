/**
 * Revisions Module - Enterprise Audit Trail System
 *
 * Provides components, hooks, and services for viewing and managing
 * revision history, change tracking, and audit trails in the application.
 */

// Components
export { RevisionTimeline } from './components/RevisionTimeline';
export { RevisionDetailModal } from './components/RevisionDetailModal';
export { DiffViewer } from './components/DiffViewer';
export { RestoreDialog } from './components/RestoreDialog';

// Hooks
export {
  useRevisions,
  useFieldHistory,
  useDiff,
  useActivityLog,
  useRevisionDetail
} from './hooks/useRevisions';

// Services
export { default as RevisionsService } from './services/revisions.service';

// Types
export type {
  Revision,
  RevisionChange,
  RevisionDetail,
  RevisionHistory,
  FieldChange,
  DiffChange,
  ActivityLogEntry,
  AuditReport,
  AuditReportSummary,
  AuditReportChange,
  RestoreOptions,
  RevisionFilterOptions
} from './types/revisions.types';
