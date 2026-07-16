// ============================================================
// DMS Utility Helpers
// ============================================================

import type { FileType, DocumentStatus, ExportType } from '../types/dms.types';

export const formatBytes = (bytes: number, decimals = 1): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const getFileTypeFromName = (name: string): FileType => {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'docx': case 'doc': return 'docx';
    case 'pdf': return 'pdf';
    case 'png': case 'jpg': case 'jpeg': case 'gif': case 'webp': case 'svg': return 'image';
    case 'txt': case 'md': return 'text';
    case 'xlsx': case 'xls': case 'csv': return 'xlsx';
    default: return 'unknown';
  }
};

export const getFileIcon = (type: FileType): string => {
  switch (type) {
    case 'docx': return '📄';
    case 'pdf': return '📕';
    case 'image': return '🖼️';
    case 'text': return '📃';
    case 'xlsx': return '📊';
    case 'folder': return '📁';
    default: return '📎';
  }
};

export const getFileIconColor = (type: FileType): string => {
  switch (type) {
    case 'docx': return '#2563eb';
    case 'pdf': return '#ef4444';
    case 'image': return '#265c8b';
    case 'text': return '#64748b';
    case 'xlsx': return '#10b981';
    case 'folder': return '#f59e0b';
    default: return '#64748b';
  }
};

export const getStatusConfig = (status: DocumentStatus) => {
  const configs: Record<DocumentStatus, { label: string; color: string; bg: string; dot: string }> = {
    draft: { label: 'Draft', color: '#64748b', bg: 'rgba(100,116,139,0.12)', dot: '#64748b' },
    temporary: { label: 'Temporary', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', dot: '#f59e0b' },
    under_review: { label: 'Under Review', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', dot: '#3b82f6' },
    revision: { label: 'Revision', color: '#265c8b', bg: 'rgba(38,92,139,0.12)', dot: '#265c8b' },
    approved: { label: 'Approved', color: '#10b981', bg: 'rgba(16,185,129,0.12)', dot: '#10b981' },
    final: { label: 'Final', color: '#1E3A8A', bg: 'rgba(30, 58, 138,0.12)', dot: '#1E3A8A' },
    archived: { label: 'Archived', color: '#64748b', bg: 'rgba(100,116,139,0.08)', dot: '#64748b' },
    shared_with_client: { label: 'Shared', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', dot: '#0ea5e9' },
  };
  return configs[status] || configs.draft;
};
export const getExportTypeConfig = (type: ExportType) => {
  const configs: Record<ExportType, { label: string; icon: string; iconName: string; color: string; description: string }> = {
    temporary: { label: 'Temporary Export', icon: '⚡', iconName: 'flash-circle', color: '#f59e0b', description: 'Quick draft for internal review only' },
    revision: { label: 'Revision Export', icon: '🔄', iconName: 'arrows-loop', color: '#265c8b', description: 'Official revision with version tracking' },
    final_approved: { label: 'Final Approved', icon: '✅', iconName: 'check-circle', color: '#10b981', description: 'Final approved version for submission' },
    client_share: { label: 'Client Share', icon: '🤝', iconName: 'share', color: '#0ea5e9', description: 'Ready to share with the client' },
    internal_draft: { label: 'Internal Draft', icon: '📝', iconName: 'notepad-edit', color: '#265c8b', description: 'Internal working copy, not for client' },
  };
  return configs[type] || configs.temporary;
};

export const generateRevisionFileName = (
  inquiryNumber: string,
  revisionNumber: number,
  type: ExportType,
  clientName?: string,
  overrideName?: string,
): string => {
  if (overrideName) return overrideName.endsWith('.docx') ? overrideName : `${overrideName}.docx`;
  const prefix = inquiryNumber || 'INQ';
  const client = clientName?.replace(/\s+/g, '') || '';
  const rev = String(revisionNumber).padStart(2, '0');

  switch (type) {
    case 'temporary':
      return `${prefix}_TEMP_${rev}.docx`;
    case 'revision':
      return `${prefix}_REV_${rev}.docx`;
    case 'final_approved':
      return `${prefix}_FINAL.docx`;
    case 'client_share':
      return `${prefix}_CLIENT_SHARE_${rev}.docx`;
    case 'internal_draft':
      return `${prefix}_DRAFT_${rev}.docx`;
    default:
      return `${prefix}_EXPORT_${rev}.docx`;
  }
};

export const validateFileName = (name: string): string | null => {
  if (!name || name.trim().length === 0) return 'File name cannot be empty';
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(name)) return 'File name contains invalid characters';
  if (name.length > 255) return 'File name is too long (max 255 characters)';
  return null;
};

export const clampProgress = (value: number): number => Math.min(100, Math.max(0, value));
