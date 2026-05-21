// ============================================================
// Enterprise Document Management System - Core Types
// ============================================================

export type DocumentStatus =
  | 'draft'
  | 'temporary'
  | 'under_review'
  | 'revision'
  | 'approved'
  | 'final'
  | 'archived'
  | 'shared_with_client';

export type ExportType =
  | 'temporary'
  | 'revision'
  | 'final_approved'
  | 'client_share'
  | 'internal_draft';

export type ExportDestination = 'device' | 'cloud' | 'both' | 'preview';

export type FileType = 'docx' | 'pdf' | 'image' | 'text' | 'xlsx' | 'folder' | 'unknown';

export type ViewMode = 'grid' | 'list' | 'compact' | 'table';

export type SortField = 'name' | 'date' | 'size' | 'type' | 'status' | 'revision';
export type SortOrder = 'asc' | 'desc';

// ─── Document & File Models ───────────────────────────────────
export interface DMSFile {
  id: string;
  name: string;
  type: FileType;
  size: number; // bytes
  folderId: string;
  folderPath: string[];
  status: DocumentStatus;
  exportType?: ExportType;
  templateId?: string;
  revisionNumber?: number;
  tempNumber?: number;
  tags: string[];
  notes: string;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  downloadUrl?: string;
  previewUrl?: string;
  cloudUrl?: string;
  cloudSynced: boolean;
  uploadProgress?: number;
  thumbnailUrl?: string;
  s3Url?: string;
  metadata: FileMetadata;
  activityLog: ActivityEntry[];
}

export interface FileMetadata {
  inquiryNumber: string;
  clientName: string;
  projectName: string;
  revisionNumber: string;
  exportDate: string;
  templateUsed: string;
  exportedBy: string;
  totalPages: number;
  fileSizeEstimate: string;
  watermark?: boolean;
  passwordProtected?: boolean;
  hasDigitalSignature?: boolean;
}

export interface ActivityEntry {
  id: string;
  action: string;
  userId: string;
  userName: string;
  timestamp: string;
  details?: string;
}

export interface RevisionEntry {
  id: string;
  fileId: string;
  revisionNumber: number;
  label: string;
  reason: string;
  status: DocumentStatus;
  exportType: ExportType;
  createdAt: string;
  createdBy: string;
  size: number;
  downloadUrl?: string;
}

// ─── Folder Model ─────────────────────────────────────────────
export interface DMSFolder {
  id: string;
  name: string;
  parentId: string | null;
  children: DMSFolder[];
  fileCount: number;
  totalSize: number;
  isPinned: boolean;
  isExpanded: boolean;
  createdAt: string;
  color?: string;
  icon?: string;
  isSystem?: boolean; // Root system folders like Temporary, Revisions, etc.
}

// ─── Export Center Models ──────────────────────────────────────
export interface ExportConfig {
  destination: ExportDestination;
  exportType: ExportType;
  fileName: string;
  fileNameOverride?: string;
  includeWatermark: boolean;
  passwordProtect: boolean;
  password?: string;
  generatePdfCopy: boolean;
  uploadAfterExport: boolean;
  notifyTeam: boolean;
  markAsOfficialRevision: boolean;
  lockAfterExport: boolean;
  enableCompression: boolean;
  injectMetadata: boolean;
  digitalSignaturePlaceholder: boolean;
  ocrEnabled: boolean;
  autoBackup: boolean;
  autoSync: boolean;
  cloudRedundancy: boolean;
}

export interface ExportStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'error';
  detail?: string;
}

export interface ExportProgress {
  steps: ExportStep[];
  uploadProgress: number;
  exportProgress: number;
  isComplete: boolean;
  hasError: boolean;
  errorMessage?: string;
}

// ─── Search & Filter Models ────────────────────────────────────
export interface SearchFilters {
  query: string;
  fileTypes: FileType[];
  statuses: DocumentStatus[];
  exportTypes: ExportType[];
  tags: string[];
  dateFrom?: string;
  dateTo?: string;
  uploadedBy?: string;
  revisionFilter?: number;
  folderIds?: string[];
}

// ─── Storage Stats ─────────────────────────────────────────────
export interface StorageStats {
  totalUsed: number; // bytes
  totalLimit: number; // bytes
  byType: Record<FileType, number>;
  byStatus: Record<DocumentStatus, number>;
  recentExports: number;
  totalRevisions: number;
  cloudSynced: number;
}

// ─── DMS State ─────────────────────────────────────────────────
export interface DMSState {
  folders: DMSFolder[];
  files: DMSFile[];
  selectedFiles: string[];
  currentFolderId: string | null;
  breadcrumbs: { id: string; name: string }[];
  viewMode: ViewMode;
  sortField: SortField;
  sortOrder: SortOrder;
  searchFilters: SearchFilters;
  storageStats: StorageStats;
  isLoading: boolean;
  error: string | null;
  uploadQueue: UploadItem[];
  recentFiles: DMSFile[];
  pinnedFiles: DMSFile[];
}

export interface UploadItem {
  id: string;
  file: File;
  folderId: string;
  progress: number;
  status: 'queued' | 'uploading' | 'success' | 'error';
  error?: string;
}
