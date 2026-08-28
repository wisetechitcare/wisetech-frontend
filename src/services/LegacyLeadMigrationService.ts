import axios from 'axios';
import type {
  AnalyzeResponse,
  BulkRule,
  ExecuteBatchResult,
  FieldChoice,
  ImportColumn,
  MigrationRecord,
  MigrationRun,
  MigrationSummary,
  RecordDecision,
} from '@/types/legacyMigration';

/**
 * API surface for legacy lead migration. Components never call axios directly.
 *
 * The backend wraps responses as { statusCode, hasError, message?, data? }, so every
 * call here unwraps `.data.data` and turns a failure into a plain Error carrying the
 * server's message.
 */

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND || '';
const BASE = `${API_BASE_URL}/api/lead-import/legacy`;

/** Must match multer's limit in routes/leadImport.ts — the server rejects anything larger. */
export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;

const unwrap = <T>(payload: { data?: T }): T => {
  if (payload?.data === undefined) {
    throw new Error('The server returned an unexpected response.');
  }
  return payload.data;
};

const toError = (error: unknown, fallback: string): Error => {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { detail?: string; message?: string } | undefined;
    return new Error(body?.detail || body?.message || error.message || fallback);
  }
  return error instanceof Error ? error : new Error(fallback);
};

export const fetchLegacyColumns = async (): Promise<ImportColumn[]> => {
  try {
    const response = await axios.get(`${BASE}/columns`);
    return unwrap<{ columns: ImportColumn[] }>(response.data).columns;
  } catch (error) {
    throw toError(error, 'Failed to load import columns');
  }
};

/** Uploads and analyzes. Never modifies a lead. */
export const analyzeLegacyCsv = async (file: File, organizationId: string): Promise<AnalyzeResponse> => {
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new Error(`File is larger than the ${Math.round(MAX_IMPORT_FILE_BYTES / (1024 * 1024))}MB limit.`);
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('organizationId', organizationId);

  try {
    const response = await axios.post(`${BASE}/analyze`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap<AnalyzeResponse>(response.data);
  } catch (error) {
    throw toError(error, 'Failed to analyze the legacy file');
  }
};

export const fetchMigrationRun = async (
  runId: string,
  organizationId: string,
): Promise<{ run: MigrationRun; summary: MigrationSummary }> => {
  try {
    const response = await axios.get(`${BASE}/runs/${runId}`, { params: { organizationId } });
    return unwrap<{ run: MigrationRun; summary: MigrationSummary }>(response.data);
  } catch (error) {
    throw toError(error, 'Failed to load the migration');
  }
};

export interface RecordsQuery {
  filter?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const fetchMigrationRecords = async (
  runId: string,
  organizationId: string,
  query: RecordsQuery = {},
): Promise<{ total: number; page: number; pageSize: number; records: MigrationRecord[] }> => {
  try {
    const response = await axios.get(`${BASE}/runs/${runId}/records`, {
      params: { organizationId, ...query },
    });
    return unwrap(response.data);
  } catch (error) {
    throw toError(error, 'Failed to load migration records');
  }
};

/** Sends CHOICES only — the server re-reads both sides itself. */
export const saveRecordDecision = async (
  runId: string,
  recordId: string,
  decision: RecordDecision,
  organizationId: string,
): Promise<MigrationRecord> => {
  try {
    const response = await axios.patch(`${BASE}/runs/${runId}/records/${recordId}`, {
      ...decision,
      organizationId,
    });
    return unwrap<MigrationRecord>(response.data);
  } catch (error) {
    throw toError(error, 'Failed to save the decision');
  }
};

export const applyBulkDecision = async (
  runId: string,
  organizationId: string,
  input: { filter?: string; rule?: BulkRule; fieldRules?: Record<string, FieldChoice>; approve?: boolean },
): Promise<{ affected: number }> => {
  try {
    const response = await axios.post(`${BASE}/runs/${runId}/decisions/bulk`, { ...input, organizationId });
    return unwrap<{ affected: number }>(response.data);
  } catch (error) {
    throw toError(error, 'Failed to apply the bulk decision');
  }
};

/** One batch. Callers loop until `remaining` is 0 — that is the real progress signal. */
export const executeMigrationBatch = async (
  runId: string,
  organizationId: string,
  batchSize = 25,
): Promise<ExecuteBatchResult> => {
  try {
    const response = await axios.post(`${BASE}/runs/${runId}/execute`, { organizationId, batchSize });
    return unwrap<ExecuteBatchResult>(response.data);
  } catch (error) {
    throw toError(error, 'Migration batch failed');
  }
};

export const cancelMigration = async (runId: string, organizationId: string): Promise<MigrationRun> => {
  try {
    const response = await axios.post(`${BASE}/runs/${runId}/cancel`, { organizationId });
    return unwrap<MigrationRun>(response.data);
  } catch (error) {
    throw toError(error, 'Failed to cancel the migration');
  }
};
