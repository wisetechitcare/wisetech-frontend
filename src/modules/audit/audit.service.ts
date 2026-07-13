import { api } from '@/lib/apiClient';

/**
 * Audit API client.
 *
 * Uses the shared `api` helper (JWT auth + 401 handling) — the audit endpoints are
 * behind `protect`, unlike the legacy raw-fetch revisions service. The backend
 * wraps every response as { statusCode, message, data }, so each call unwraps `.data`.
 */

export type AuditEntityType =
  | 'LEAD'
  | 'PROJECT'
  | 'PROPOSAL'
  | 'INVOICE'
  | 'CONTACT'
  | 'COMPANY';

export type ChangeType = 'ADDED' | 'REMOVED' | 'MODIFIED';
export type ChangeImpact = 'MINOR' | 'MAJOR' | 'CRITICAL';

export interface AuditFieldChange {
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
}

export interface AuditChangeSet {
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
  changes: AuditFieldChange[];
}

export interface AuditTimelinePage {
  changeSets: AuditChangeSet[];
  nextCursor: number | null;
  hasMore: boolean;
}

export interface AuditDiffResult {
  entityType: AuditEntityType;
  entityId: string;
  from: number;
  to: number;
  summary: string;
  stats: { added: number; removed: number; modified: number; total: number };
  diffs: AuditFieldChange[];
}

export interface EntityInsights {
  totalRevisions: number;
  totalChanges: number;
  distinctEditors: number;
  sensitiveChanges: number;
  firstChangedAt: string | null;
  lastChangedAt: string | null;
  categoryMix: Array<{ category: string; count: number }>;
  hotFields: Array<{ field: string; label: string; count: number }>;
  topEditors: Array<{ actorId: string; name: string; count: number }>;
  volume: Array<{ date: string; count: number }>;
  changeTypeMix: Array<{ type: string; count: number }>;
  impactMix: Array<{ impact: string; count: number }>;
  sourceMix: Array<{ source: string; count: number }>;
}

export interface AuditViewerInfo {
  id: string;
  isAdmin: boolean;
}

export interface ResetPreviewChange extends AuditFieldChange {
  restorable: boolean;
}

export interface ResetPreview {
  currentVersion: number;
  targetVersion: number;
  versionsToDelete: number[];
  changes: ResetPreviewChange[];
  restorableCount: number;
  skippedCount: number;
}

export interface ResetResult {
  newCurrentVersion: number;
  deletedVersions: number[];
}

interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
}

const BASE = '/api/audit';

export const AuditApi = {
  timeline(
    type: AuditEntityType,
    id: string,
    opts: { cursor?: number; limit?: number; category?: string; actorId?: string; fresh?: number } = {},
  ): Promise<AuditTimelinePage> {
    return api
      .get<ApiEnvelope<AuditTimelinePage>>(`${BASE}/${type}/${id}/timeline`, opts)
      .then((r) => r.data);
  },

  diff(type: AuditEntityType, id: string, from: number, to: number): Promise<AuditDiffResult> {
    return api
      .get<ApiEnvelope<AuditDiffResult>>(`${BASE}/${type}/${id}/diff`, { from, to })
      .then((r) => r.data);
  },

  fieldHistory(
    type: AuditEntityType,
    id: string,
    fieldName: string,
    limit = 200,
  ): Promise<{ fieldName: string; history: unknown[] }> {
    return api
      .get<ApiEnvelope<{ fieldName: string; history: unknown[] }>>(
        `${BASE}/${type}/${id}/field/${fieldName}/history`,
        { limit },
      )
      .then((r) => r.data);
  },

  insights(type: AuditEntityType, id: string): Promise<EntityInsights> {
    return api
      .get<ApiEnvelope<EntityInsights>>(`${BASE}/${type}/${id}/insights`)
      .then((r) => r.data);
  },

  me(): Promise<AuditViewerInfo> {
    return api.get<ApiEnvelope<AuditViewerInfo>>(`${BASE}/me`).then((r) => r.data);
  },

  resetPreview(type: AuditEntityType, id: string, targetVersion: number): Promise<ResetPreview> {
    return api
      .post<ApiEnvelope<ResetPreview>>(`${BASE}/${type}/${id}/reset/preview`, { targetVersion })
      .then((r) => r.data);
  },

  reset(type: AuditEntityType, id: string, targetVersion: number): Promise<ResetResult> {
    return api
      .post<ApiEnvelope<ResetResult>>(`${BASE}/${type}/${id}/reset`, { targetVersion })
      .then((r) => r.data);
  },
};

export default AuditApi;
