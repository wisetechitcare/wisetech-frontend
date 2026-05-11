// ============================================================
// Enterprise DMS Store — React Context + useReducer
// (No extra libraries needed — uses existing redux patterns)
// ============================================================

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type {
  DMSFile, DMSFolder, DMSState, SearchFilters, ViewMode,
  SortField, SortOrder, UploadItem, DocumentStatus, ExportType
} from '../types/dms.types';

// ─── Initial Demo Data ─────────────────────────────────────────
const buildDefaultFolders = (leadId: string, inquiryNumber: string): DMSFolder[] => {
  const rootId = `root-${leadId}`;
  const systemFolders: DMSFolder[] = [
    { id: 'f-temp', name: 'Temporary', parentId: rootId, children: [], fileCount: 0, totalSize: 0, isPinned: false, isExpanded: false, createdAt: new Date().toISOString(), icon: '🕐', isSystem: true, color: '#f59e0b' },
    { id: 'f-rev', name: 'Revisions', parentId: rootId, children: [], fileCount: 0, totalSize: 0, isPinned: true, isExpanded: false, createdAt: new Date().toISOString(), icon: '🔄', isSystem: true, color: '#3b82f6' },
    { id: 'f-pdf', name: 'PDFs', parentId: rootId, children: [], fileCount: 0, totalSize: 0, isPinned: false, isExpanded: false, createdAt: new Date().toISOString(), icon: '📄', isSystem: true, color: '#ef4444' },
    ];

  const root: DMSFolder = {
    id: rootId,
    name: inquiryNumber || leadId,
    parentId: null,
    children: systemFolders,
    fileCount: 0,
    totalSize: 0,
    isPinned: true,
    isExpanded: true,
    createdAt: new Date().toISOString(),
    icon: '📁',
    isSystem: true,
    color: '#9d4141',
  };

  return [root, ...systemFolders];
};

const buildDemoFiles = (leadId: string, inquiryNumber: string, leadTitle: string): DMSFile[] => {
  const prefix = inquiryNumber || leadId.slice(0, 8).toUpperCase();
  const client = leadTitle?.replace(/\s+/g, '') || 'Project';
  const now = new Date();
  const ago = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();

  return [
    {
      id: `file-temp-1`,
      name: `${client}_TEMP_01.docx`,
      type: 'docx',
      size: 243712,
      folderId: 'f-temp',
      folderPath: [prefix, 'Temporary'],
      status: 'temporary',
      exportType: 'temporary',
      tempNumber: 1,
      tags: ['draft', 'initial'],
      notes: '',
      isPinned: false,
      isLocked: false,
      createdAt: ago(7),
      updatedAt: ago(7),
      createdBy: 'System',
      updatedBy: 'System',
      cloudSynced: false,
      metadata: { inquiryNumber: prefix, clientName: leadTitle, projectName: leadTitle, revisionNumber: '-', exportDate: ago(7), templateUsed: 'Default', exportedBy: 'System', totalPages: 8, fileSizeEstimate: '238 KB' },
      activityLog: [{ id: '1', action: 'Created', userId: 'sys', userName: 'System', timestamp: ago(7) }],
    },
    {
      id: `file-temp-2`,
      name: `${client}_TEMP_02.docx`,
      type: 'docx',
      size: 267264,
      folderId: 'f-temp',
      folderPath: [prefix, 'Temporary'],
      status: 'temporary',
      exportType: 'temporary',
      tempNumber: 2,
      tags: ['draft'],
      notes: '',
      isPinned: false,
      isLocked: false,
      createdAt: ago(5),
      updatedAt: ago(5),
      createdBy: 'System',
      updatedBy: 'System',
      cloudSynced: false,
      metadata: { inquiryNumber: prefix, clientName: leadTitle, projectName: leadTitle, revisionNumber: '-', exportDate: ago(5), templateUsed: 'Default', exportedBy: 'System', totalPages: 9, fileSizeEstimate: '261 KB' },
      activityLog: [{ id: '1', action: 'Created', userId: 'sys', userName: 'System', timestamp: ago(5) }],
    },
    {
      id: `file-rev-1`,
      name: `${prefix}_REV_01.docx`,
      type: 'docx',
      size: 312320,
      folderId: 'f-rev',
      folderPath: [prefix, 'Revisions'],
      status: 'revision',
      exportType: 'revision',
      revisionNumber: 1,
      tags: ['revision', 'initial-proposal'],
      notes: 'Initial client proposal',
      isPinned: true,
      isLocked: true,
      createdAt: ago(4),
      updatedAt: ago(4),
      createdBy: 'System',
      updatedBy: 'System',
      cloudSynced: true,
      metadata: { inquiryNumber: prefix, clientName: leadTitle, projectName: leadTitle, revisionNumber: 'REV_01', exportDate: ago(4), templateUsed: 'Standard Template', exportedBy: 'System', totalPages: 12, fileSizeEstimate: '305 KB' },
      activityLog: [
        { id: '1', action: 'Created', userId: 'sys', userName: 'System', timestamp: ago(4) },
        { id: '2', action: 'Locked', userId: 'sys', userName: 'System', timestamp: ago(4), details: 'Locked after official revision' },
      ],
    },
    {
      id: `file-rev-2`,
      name: `${prefix}_REV_02.docx`,
      type: 'docx',
      size: 328192,
      folderId: 'f-rev',
      folderPath: [prefix, 'Revisions'],
      status: 'under_review',
      exportType: 'revision',
      revisionNumber: 2,
      tags: ['revision', 'pricing-update'],
      notes: 'Client pricing update incorporated',
      isPinned: false,
      isLocked: false,
      createdAt: ago(2),
      updatedAt: ago(1),
      createdBy: 'System',
      updatedBy: 'System',
      cloudSynced: true,
      metadata: { inquiryNumber: prefix, clientName: leadTitle, projectName: leadTitle, revisionNumber: 'REV_02', exportDate: ago(2), templateUsed: 'Standard Template', exportedBy: 'System', totalPages: 14, fileSizeEstimate: '320 KB' },
      activityLog: [
        { id: '1', action: 'Created', userId: 'sys', userName: 'System', timestamp: ago(2) },
        { id: '2', action: 'Modified', userId: 'sys', userName: 'System', timestamp: ago(1), details: 'Updated pricing details' },
      ],
    },
    {
      id: `file-rev-3`,
      name: `${prefix}_REV_03.docx`,
      type: 'docx',
      size: 356352,
      folderId: 'f-rev',
      folderPath: [prefix, 'Revisions'],
      status: 'draft',
      exportType: 'revision',
      revisionNumber: 3,
      tags: ['revision', 'material-changes'],
      notes: 'Material specification changes',
      isPinned: false,
      isLocked: false,
      createdAt: ago(0),
      updatedAt: ago(0),
      createdBy: 'System',
      updatedBy: 'System',
      cloudSynced: false,
      metadata: { inquiryNumber: prefix, clientName: leadTitle, projectName: leadTitle, revisionNumber: 'REV_03', exportDate: new Date().toISOString(), templateUsed: 'Standard Template', exportedBy: 'System', totalPages: 15, fileSizeEstimate: '348 KB' },
      activityLog: [{ id: '1', action: 'Created', userId: 'sys', userName: 'System', timestamp: ago(0) }],
    },
  ];
};

// ─── Initial State ─────────────────────────────────────────────
const createInitialState = (leadId: string, inquiryNumber: string, leadTitle: string): DMSState => ({
  folders: buildDefaultFolders(leadId, inquiryNumber),
  files: buildDemoFiles(leadId, inquiryNumber, leadTitle),
  selectedFiles: [],
  currentFolderId: null,
  breadcrumbs: [],
  viewMode: 'grid',
  sortField: 'date',
  sortOrder: 'desc',
  searchFilters: {
    query: '',
    fileTypes: [],
    statuses: [],
    exportTypes: [],
    tags: [],
  },
  storageStats: {
    totalUsed: 1507328,
    totalLimit: 5368709120, // 5 GB
    byType: { docx: 1507328, pdf: 0, image: 0, text: 0, xlsx: 0, folder: 0, unknown: 0 },
    byStatus: { draft: 1, temporary: 2, under_review: 1, revision: 1, approved: 0, final: 0, archived: 0, shared_with_client: 0 },
    recentExports: 5,
    totalRevisions: 3,
    cloudSynced: 2,
  },
  isLoading: false,
  error: null,
  uploadQueue: [],
  recentFiles: [],
  pinnedFiles: [],
});

// ─── Actions ───────────────────────────────────────────────────
type DMSAction =
  | { type: 'SET_CURRENT_FOLDER'; payload: string | null }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_SORT'; payload: { field: SortField; order: SortOrder } }
  | { type: 'SET_SEARCH_FILTERS'; payload: Partial<SearchFilters> }
  | { type: 'SELECT_FILE'; payload: string }
  | { type: 'DESELECT_FILE'; payload: string }
  | { type: 'SELECT_ALL_FILES'; payload: string[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'TOGGLE_FOLDER_EXPAND'; payload: string }
  | { type: 'ADD_FILE'; payload: DMSFile }
  | { type: 'UPDATE_FILE'; payload: Partial<DMSFile> & { id: string } }
  | { type: 'DELETE_FILES'; payload: string[] }
  | { type: 'MOVE_FILES'; payload: { fileIds: string[]; targetFolderId: string } }
  | { type: 'TOGGLE_PIN_FILE'; payload: string }
  | { type: 'TOGGLE_LOCK_FILE'; payload: string }
  | { type: 'ARCHIVE_FILES'; payload: string[] }
  | { type: 'ADD_FOLDER'; payload: DMSFolder }
  | { type: 'DELETE_FOLDER'; payload: string }
  | { type: 'RENAME_FOLDER'; payload: { id: string; name: string } }
  | { type: 'TOGGLE_PIN_FOLDER'; payload: string }
  | { type: 'ADD_UPLOAD'; payload: UploadItem }
  | { type: 'UPDATE_UPLOAD'; payload: Partial<UploadItem> & { id: string } }
  | { type: 'SET_BREADCRUMBS'; payload: { id: string; name: string }[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// ─── Reducer ───────────────────────────────────────────────────
function dmsReducer(state: DMSState, action: DMSAction): DMSState {
  switch (action.type) {
    case 'SET_CURRENT_FOLDER':
      return { ...state, currentFolderId: action.payload, selectedFiles: [] };

    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };

    case 'SET_SORT':
      return { ...state, sortField: action.payload.field, sortOrder: action.payload.order };

    case 'SET_SEARCH_FILTERS':
      return { ...state, searchFilters: { ...state.searchFilters, ...action.payload } };

    case 'SELECT_FILE':
      return { ...state, selectedFiles: [...new Set([...state.selectedFiles, action.payload])] };

    case 'DESELECT_FILE':
      return { ...state, selectedFiles: state.selectedFiles.filter(id => id !== action.payload) };

    case 'SELECT_ALL_FILES':
      return { ...state, selectedFiles: action.payload };

    case 'CLEAR_SELECTION':
      return { ...state, selectedFiles: [] };

    case 'TOGGLE_FOLDER_EXPAND':
      return {
        ...state,
        folders: state.folders.map(f =>
          f.id === action.payload ? { ...f, isExpanded: !f.isExpanded } : f
        ),
      };

    case 'ADD_FILE':
      return { ...state, files: [action.payload, ...state.files] };

    case 'UPDATE_FILE':
      return {
        ...state,
        files: state.files.map(f => f.id === action.payload.id ? { ...f, ...action.payload } : f),
      };

    case 'DELETE_FILES':
      return { ...state, files: state.files.filter(f => !action.payload.includes(f.id)), selectedFiles: [] };

    case 'MOVE_FILES':
      return {
        ...state,
        files: state.files.map(f =>
          action.payload.fileIds.includes(f.id)
            ? { ...f, folderId: action.payload.targetFolderId }
            : f
        ),
        selectedFiles: [],
      };

    case 'TOGGLE_PIN_FILE':
      return {
        ...state,
        files: state.files.map(f => f.id === action.payload ? { ...f, isPinned: !f.isPinned } : f),
      };

    case 'TOGGLE_LOCK_FILE':
      return {
        ...state,
        files: state.files.map(f => f.id === action.payload ? { ...f, isLocked: !f.isLocked } : f),
      };

    case 'ARCHIVE_FILES':
      return {
        ...state,
        files: state.files.map(f =>
          action.payload.includes(f.id) ? { ...f, status: 'archived' as DocumentStatus, folderId: 'f-arch' } : f
        ),
        selectedFiles: [],
      };

    case 'ADD_FOLDER':
      return { ...state, folders: [...state.folders, action.payload] };

    case 'DELETE_FOLDER':
      return { ...state, folders: state.folders.filter(f => f.id !== action.payload) };

    case 'RENAME_FOLDER':
      return {
        ...state,
        folders: state.folders.map(f => f.id === action.payload.id ? { ...f, name: action.payload.name } : f),
      };

    case 'TOGGLE_PIN_FOLDER':
      return {
        ...state,
        folders: state.folders.map(f => f.id === action.payload ? { ...f, isPinned: !f.isPinned } : f),
      };

    case 'ADD_UPLOAD':
      return { ...state, uploadQueue: [...state.uploadQueue, action.payload] };

    case 'UPDATE_UPLOAD':
      return {
        ...state,
        uploadQueue: state.uploadQueue.map(u => u.id === action.payload.id ? { ...u, ...action.payload } : u),
      };

    case 'SET_BREADCRUMBS':
      return { ...state, breadcrumbs: action.payload };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    default:
      return state;
  }
}

// ─── Context ───────────────────────────────────────────────────
interface DMSContextValue {
  state: DMSState;
  dispatch: React.Dispatch<DMSAction>;
  // Computed selectors
  getFilesInFolder: (folderId: string | null) => DMSFile[];
  getFilteredFiles: () => DMSFile[];
  getFolder: (folderId: string) => DMSFolder | undefined;
  getRevisionFiles: () => DMSFile[];
  getLatestRevisionNumber: () => number;
  getLatestTempNumber: () => number;
  getTotalFilesCount: () => number;
}

const DMSContext = createContext<DMSContextValue | null>(null);

interface DMSProviderProps {
  children: React.ReactNode;
  leadId: string;
  inquiryNumber: string;
  leadTitle: string;
}

export const DMSProvider: React.FC<DMSProviderProps> = ({ children, leadId, inquiryNumber, leadTitle }) => {
  const [state, dispatch] = useReducer(dmsReducer, undefined, () =>
    createInitialState(leadId, inquiryNumber, leadTitle)
  );

  const getFilesInFolder = useCallback((folderId: string | null): DMSFile[] => {
    if (!folderId) return state.files;
    return state.files.filter(f => f.folderId === folderId);
  }, [state.files]);

  const getFilteredFiles = useCallback((): DMSFile[] => {
    let files = getFilesInFolder(state.currentFolderId);
    const { query, fileTypes, statuses, exportTypes, tags, dateFrom, dateTo } = state.searchFilters;

    if (query) {
      const q = query.toLowerCase();
      files = files.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.tags.some(t => t.toLowerCase().includes(q)) ||
        f.notes.toLowerCase().includes(q)
      );
    }
    if (fileTypes.length > 0) files = files.filter(f => fileTypes.includes(f.type));
    if (statuses.length > 0) files = files.filter(f => statuses.includes(f.status));
    if (exportTypes.length > 0) files = files.filter(f => f.exportType && exportTypes.includes(f.exportType));
    if (tags.length > 0) files = files.filter(f => tags.some(t => f.tags.includes(t)));
    if (dateFrom) files = files.filter(f => f.createdAt >= dateFrom);
    if (dateTo) files = files.filter(f => f.createdAt <= dateTo);

    // Sort
    files = [...files].sort((a, b) => {
      let cmp = 0;
      switch (state.sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'date': cmp = a.createdAt.localeCompare(b.createdAt); break;
        case 'size': cmp = a.size - b.size; break;
        case 'type': cmp = a.type.localeCompare(b.type); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'revision': cmp = (a.revisionNumber || 0) - (b.revisionNumber || 0); break;
      }
      return state.sortOrder === 'asc' ? cmp : -cmp;
    });

    return files;
  }, [state, getFilesInFolder]);

  const getFolder = useCallback((folderId: string) =>
    state.folders.find(f => f.id === folderId), [state.folders]);

  const getRevisionFiles = useCallback(() =>
    state.files.filter(f => f.exportType === 'revision'), [state.files]);

  const getLatestRevisionNumber = useCallback(() => {
    const revs = getRevisionFiles();
    if (revs.length === 0) return 0;
    return Math.max(...revs.map(f => f.revisionNumber || 0));
  }, [getRevisionFiles]);

  const getLatestTempNumber = useCallback(() => {
    const temps = state.files.filter(f => f.exportType === 'temporary');
    if (temps.length === 0) return 0;
    return Math.max(...temps.map(f => f.tempNumber || 0));
  }, [state.files]);

  const getTotalFilesCount = useCallback(() => state.files.length, [state.files]);

  return (
    <DMSContext.Provider value={{
      state, dispatch,
      getFilesInFolder, getFilteredFiles, getFolder,
      getRevisionFiles, getLatestRevisionNumber, getLatestTempNumber,
      getTotalFilesCount,
    }}>
      {children}
    </DMSContext.Provider>
  );
};

export const useDMS = () => {
  const ctx = useContext(DMSContext);
  if (!ctx) throw new Error('useDMS must be used inside DMSProvider');
  return ctx;
};
