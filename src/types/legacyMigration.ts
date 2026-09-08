/**
 * Wire types for the Legacy Lead Migration / reconciliation flow.
 *
 * Mirrors the backend's staged shapes (LeadMigrationRun / LeadMigrationRecord).
 * The column list itself is NOT declared here — it is fetched from
 * GET /api/lead-import/legacy/columns so the frontend can never drift from the
 * backend's definition again.
 */

export type MatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'AMBIGUOUS' | 'NO_MATCH';

export type RecordStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'SKIPPED'
  | 'EXECUTED'
  | 'FAILED'
  | 'STALE'
  | 'DUPLICATE_IN_CSV'
  | 'INVALID';

export type DifferenceStatus = 'SAME' | 'DIFFERENT' | 'OLD_ONLY' | 'CURRENT_ONLY' | 'CONFLICT' | 'INVALID';

export type FieldChoice = 'KEEP_CURRENT' | 'USE_OLD' | 'CUSTOM';

export type EntityChoice = 'USE_EXISTING' | 'CREATE_NEW' | 'KEEP_CURRENT';

export type BulkRule = 'KEEP_ALL_CURRENT' | 'USE_ALL_OLD' | 'USE_OLD_WHERE_CURRENT_EMPTY';

export interface ImportColumn {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'date';
  aliases: string[];
  comparisonStrategy: string;
  legacyOnly?: boolean;
  writable?: boolean;
  matchSignal?: boolean;
}

/** Original value alongside its comparison form — the original is what we display. */
export interface NormalizedValue {
  original: string | null;
  normalized: string | null;
}

export interface EntityResolution {
  kind: string;
  matchedId: string | null;
  matchedName: string | null;
  exact: boolean;
  similarity: number | null;
  requiresCreate: boolean;
}

export interface FieldDifference {
  field: string;
  label: string;
  status: DifferenceStatus;
  oldValue: string | null;
  currentValue: string | null;
  similarity: number | null;
  recommended: FieldChoice;
  writable: boolean;
  entity?: EntityResolution;
  note?: string;
}

export interface MatchCandidate {
  leadId: string;
  score: number;
  matchType: string;
  reasons: string[];
  lead: {
    id: string;
    title: string | null;
    prefix: string | null;
    projectNumber: string | null;
    companyName: string | null;
    contactName: string | null;
    contactPhone: string | null;
  };
}

export interface MigrationRecord {
  id: string;
  runId: string;
  csvRowNumber: number;
  sourceData: Record<string, NormalizedValue>;
  matchedLeadId: string | null;
  matchScore: number | null;
  confidence: MatchConfidence | null;
  matchType: string | null;
  matchReasons: string[] | null;
  candidates: MatchCandidate[] | null;
  differences: FieldDifference[] | null;
  decision: RecordDecision | null;
  status: RecordStatus;
  error: string | null;
  executionResult: {
    leadId?: string;
    action?: string;
    appliedFields?: string[];
    notes?: string[];
  } | null;
  executedAt: string | null;
}

export interface RecordDecision {
  action: 'UPDATE' | 'CREATE' | 'SKIP' | 'MATCH_TO';
  targetLeadId?: string | null;
  fieldDecisions?: Record<string, { choice: FieldChoice; value?: string | null }>;
  entityDecisions?: Record<string, { choice: EntityChoice; entityId?: string | null }>;
}

export interface MigrationRun {
  id: string;
  migrationCode: string;
  fileName: string;
  status: 'ANALYZING' | 'READY_FOR_REVIEW' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  totalRows: number;
  updatedRows: number;
  createdRows: number;
  skippedRows: number;
  failedRows: number;
  createdAt: string;
  completedAt: string | null;
}

/** A saved upload on the picker: a run plus how far through it the admin is. */
export interface SavedMigrationRun extends MigrationRun {
  /** Rows already approved, skipped or executed — the "12 of 340 reviewed" figure. */
  decidedRows: number;
  /** Rows still to decide, queued, or failed. Zero means the run is genuinely done. */
  openRows: number;
  /** Work remains and the run wasn't cancelled — reopening continues the review. */
  resumable: boolean;
}

export interface MigrationSummary {
  totalRows: number;
  high: number;
  medium: number;
  low: number;
  ambiguous: number;
  noMatch: number;
  duplicateInCsv: number;
  invalid: number;
  withChanges: number;
  withoutChanges: number;
  willUpdate: number;
  willCreate: number;
  needsReview?: number;
  approved?: number;
  executed?: number;
  failed?: number;
  stale?: number;
  skipped?: number;
  /** Every difference in the run — the review-stage number. */
  fieldChangeCounts: Record<string, number>;
  /** Only what the approved decisions would write — the confirmation-stage number. */
  approvedFieldChangeCounts?: Record<string, number>;
  detectedHeaders?: string[];
  unmappedHeaders?: string[];
}

export interface AnalyzeResponse {
  runId: string;
  migrationCode: string;
  summary: MigrationSummary;
}

export interface ExecuteBatchResult {
  processed: number;
  remaining: number;
  updated: number;
  created: number;
  skipped: number;
  failed: number;
  stale: number;
}

/** Running totals accumulated across the execute loop. */
export interface ExecuteProgress {
  processed: number;
  remaining: number;
  updated: number;
  created: number;
  skipped: number;
  failed: number;
  stale: number;
  done: boolean;
}
