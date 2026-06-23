/**
 * DESIGN SANDBOX — self-contained types (copied from auditV2.service).
 * Keeps this folder fully decoupled from the live API layer.
 */

export type ChangeType = 'ADDED' | 'REMOVED' | 'MODIFIED';
export type ChangeImpact = 'MINOR' | 'MAJOR' | 'CRITICAL';

export interface V2FieldChange {
  id?: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  fieldCategory: string;
  changeType: ChangeType;
  oldValue: unknown;
  newValue: unknown;
  oldValueFormatted: string;
  newValueFormatted: string;
  isKeyField: boolean;
  isSensitive: boolean;
  changeImpact: ChangeImpact;
  restorable?: boolean;
}

export interface V2ChangeSet {
  id: string;
  revisionNumber: number;
  changedAt: string;
  changedByEmployeeId: string;
  changedByFirstName?: string | null;
  changedByLastName?: string | null;
  summary: string;
  category: string;
  changeSource: string;
  ipAddress?: string | null;
  browserName?: string | null;
  deviceType?: string | null;
  rowHash?: string | null;
  changes: V2FieldChange[];
}

export interface V2DiffResult {
  from: number;
  to: number;
  summary: string;
  stats: { added: number; removed: number; modified: number; total: number };
  diffs: V2FieldChange[];
}

export interface EntityInsights {
  totalRevisions: number;
  totalChanges: number;
  distinctEditors: number;
  restoreCount: number;
  firstChangedAt: string | null;
  lastChangedAt: string | null;
  categoryMix: Array<{ category: string; count: number }>;
  hotFields: Array<{ field: string; label: string; count: number }>;
  topEditors: Array<{ actorId: string; name: string; count: number }>;
  volume: Array<{ date: string; count: number }>;
}

export interface ResetPreview {
  currentVersion: number;
  targetVersion: number;
  versionsToDelete: number[];
  changes: V2FieldChange[];
  restorableCount: number;
  skippedCount: number;
}

export interface RestorePreview {
  targetRev: number;
  currentRev: number;
  changes: V2FieldChange[];
  restorableCount: number;
  skippedCount: number;
}
