/**
 * Revisions Module - TypeScript Type Definitions
 */

export interface RevisionChange {
  fieldName: string;
  fieldLabel?: string;
  fieldType: string;
  oldValue: any;
  newValue: any;
  oldValueFormatted?: string;
  newValueFormatted?: string;
  changeType: 'MODIFIED' | 'ADDED' | 'REMOVED';
  isKeyField?: boolean;
  isSensitive?: boolean;
  changeImpact?: 'MAJOR' | 'MINOR' | 'CRITICAL';
}

export interface Revision {
  id: string;
  revisionNumber: number;
  entityType: string;
  entityId: string;
  summary: string;
  category: string;
  changedByEmployeeId: string;
  changedByFirstName: string;
  changedByLastName: string;
  changedAt: string;
  changedAtTz?: string;
  changeSource?: string;
  changeReason?: string;
  approvalRequired: boolean;
  sensitivityLevel: string;
  complianceFlag?: string;
  changes: RevisionChange[];
}

export interface RevisionDetail extends Revision {
  changedByFullName: string;
  approvalRecord?: {
    approvedBy: string;
    approvedAt: string;
    approvalStatus: string;
  };
  comments?: Array<{
    id: string;
    content: string;
    createdBy: string;
    createdAt: string;
  }>;
}

export interface RevisionHistory {
  revisions: Revision[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface FieldChange {
  revisionNumber: number;
  oldValue: any;
  newValue: any;
  oldValueFormatted?: string;
  newValueFormatted?: string;
  changeType: 'MODIFIED' | 'ADDED' | 'REMOVED';
  changedBy: string;
  changedAt: string;
  summary: string;
  reason?: string;
}

export interface DiffChange {
  fieldName: string;
  fieldLabel?: string;
  oldValue: any;
  newValue: any;
  oldValueFormatted?: string;
  newValueFormatted?: string;
  changeType: 'MODIFIED' | 'ADDED' | 'REMOVED';
  lastChangedInRevision: number;
}

export interface ActivityLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  activityType: string;
  summary: string;
  actor: string;
  createdAt: string;
  revisionId?: string;
}

export interface AuditReportSummary {
  totalChanges: number;
  totalUsers: number;
  totalEntities: number;
  changesRequiringApproval: number;
  sensitiveChanges: number;
}

export interface AuditReportChange {
  revisionNumber: number;
  entity: string;
  changedBy: string;
  changedAt: string;
  summary: string;
  category: string;
  fieldCount: number;
  sensitivity: string;
  approvalRequired: boolean;
}

export interface AuditReport {
  reportType: 'SOX' | 'GDPR' | 'PCI' | 'GENERAL';
  period: {
    from: string;
    to: string;
  };
  summary: AuditReportSummary;
  changes: AuditReportChange[];
}

export interface RestoreOptions {
  entityType: string;
  entityId: string;
  revisionNumber: number;
  reason?: string;
}

export interface RevisionFilterOptions {
  page?: number;
  pageSize?: number;
  entityType?: string;
  entityId?: string;
  sortBy?: 'revisionNumber' | 'changedAt';
  sortOrder?: 'asc' | 'desc';
}
