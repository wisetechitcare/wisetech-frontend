import {
  RevisionHistory,
  FieldChange,
  DiffChange,
  ActivityLogEntry,
  AuditReport,
  RevisionDetail
} from '../types/revisions.types';

const API_BASE = import.meta.env.VITE_APP_WISE_TECH_BACKEND || 'http://localhost:9000';

/**
 * Revisions Service - API client for audit trail endpoints
 * Communicates with backend revision system APIs
 */
export class RevisionsService {
  /**
   * Get revision history for an entity
   */
  static async getRevisionHistory(
    entityType: string,
    entityId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<RevisionHistory> {
    const response = await fetch(
      `${API_BASE}/api/revisions/${entityType}/${entityId}/history?page=${page}&pageSize=${pageSize}`
    );

    if (!response.ok) throw new Error(`Failed to fetch revision history: ${response.statusText}`);

    const data = await response.json();
    return data.data;
  }

  /**
   * Get field change history
   */
  static async getFieldHistory(
    entityType: string,
    entityId: string,
    fieldName: string
  ): Promise<FieldChange[]> {
    const response = await fetch(
      `${API_BASE}/api/revisions/${entityType}/${entityId}/field-history/${fieldName}`
    );

    if (!response.ok) throw new Error(`Failed to fetch field history: ${response.statusText}`);

    const data = await response.json();
    return data.data.changes || [];
  }

  /**
   * Get specific revision details
   */
  static async getRevision(
    entityType: string,
    entityId: string,
    revisionNumber: number
  ): Promise<RevisionDetail> {
    const response = await fetch(
      `${API_BASE}/api/revisions/${entityType}/${entityId}/revision/${revisionNumber}`
    );

    if (!response.ok) throw new Error(`Failed to fetch revision: ${response.statusText}`);

    const data = await response.json();
    return data.data.revision;
  }

  /**
   * Get diff between two revisions
   */
  static async getDiff(
    entityType: string,
    entityId: string,
    fromRevision: number,
    toRevision: number
  ): Promise<DiffChange[]> {
    const response = await fetch(
      `${API_BASE}/api/revisions/${entityType}/${entityId}/diff?from=${fromRevision}&to=${toRevision}`
    );

    if (!response.ok) throw new Error(`Failed to fetch diff: ${response.statusText}`);

    const data = await response.json();
    return data.data.changes || [];
  }

  /**
   * Get activity log for an entity
   */
  static async getActivityLog(
    entityType: string,
    entityId: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ activities: ActivityLogEntry[]; pagination: any }> {
    const response = await fetch(
      `${API_BASE}/api/revisions/activity-log/${entityType}/${entityId}?page=${page}&pageSize=${pageSize}`
    );

    if (!response.ok) throw new Error(`Failed to fetch activity log: ${response.statusText}`);

    const data = await response.json();
    return data.data;
  }

  /**
   * Restore entity to a previous revision
   */
  static async restoreRevision(
    entityType: string,
    entityId: string,
    revisionNumber: number,
    reason?: string
  ): Promise<{ message: string; newRevision: any }> {
    const response = await fetch(
      `${API_BASE}/api/revisions/${entityType}/${entityId}/restore/${revisionNumber}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      }
    );

    if (!response.ok) throw new Error(`Failed to restore revision: ${response.statusText}`);

    const data = await response.json();
    return data.data;
  }

  /**
   * Generate audit report
   */
  static async generateAuditReport(
    complianceType: 'SOX' | 'GDPR' | 'PCI' | 'GENERAL',
    dateFrom: string,
    dateTo: string,
    entityType?: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<AuditReport | Blob> {
    const params = new URLSearchParams({
      complianceType,
      dateFrom,
      dateTo,
      format,
      ...(entityType && { entityType })
    });

    const response = await fetch(
      `${API_BASE}/api/revisions/audit-report?${params}`
    );

    if (!response.ok) throw new Error(`Failed to generate audit report: ${response.statusText}`);

    if (format === 'csv') {
      return response.blob();
    }

    const data = await response.json();
    return data.data;
  }
}

export default RevisionsService;
