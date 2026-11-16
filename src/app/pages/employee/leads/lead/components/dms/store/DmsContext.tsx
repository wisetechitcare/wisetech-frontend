// ============================================================
// Enterprise DMS Context — Consolidated Provider
// ============================================================

import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect } from 'react';
import type {
  DMSFile, DMSFolder, DMSState, SearchFilters, ViewMode,
  SortField, SortOrder, UploadItem, DocumentStatus, ExportType
} from '../types/dms.types';

const buildDefaultFolders = (leadId?: string, inquiryNumber?: string): DMSFolder[] => {
  const rootId = leadId ? `root-${leadId}` : 'root-global';
  const rootName = leadId ? (inquiryNumber || leadId) : 'All Projects';
  
  if (!leadId) {
    return [{
      id: rootId,
      name: rootName,
      parentId: null,
      children: [],
      fileCount: 0,
      totalSize: 0,
      isPinned: true,
      isExpanded: true,
      createdAt: new Date().toISOString(),
      icon: '📁',
      isSystem: true,
      color: '#1E3A8A',
    }];
  }

  const systemFolders: DMSFolder[] = [
    { id: 'f-temp', name: 'Temporary', parentId: rootId, children: [], fileCount: 0, totalSize: 0, isPinned: false, isExpanded: false, createdAt: new Date().toISOString(), icon: '🕐', isSystem: true, color: '#f59e0b' },
    { id: 'f-rev', name: 'Revisions', parentId: rootId, children: [], fileCount: 0, totalSize: 0, isPinned: false, isExpanded: false, createdAt: new Date().toISOString(), icon: '🔄', isSystem: true, color: '#3b82f6' },
  ];

  const root: DMSFolder = {
    id: rootId,
    name: rootName,
    parentId: null,
    children: systemFolders,
    fileCount: 0,
    totalSize: 0,
    isPinned: true,
    isExpanded: true,
    createdAt: new Date().toISOString(),
    icon: '📁',
    isSystem: true,
    color: '#1E3A8A',
  };

  return [root, ...systemFolders];
};

const createInitialState = (leadId?: string, inquiryNumber?: string, leadTitle?: string): DMSState => ({
  folders: buildDefaultFolders(leadId, inquiryNumber),
  files: [],
  selectedFiles: [],
  currentFolderId: null,
  breadcrumbs: [],
  viewMode: 'grid',
  sortField: 'date',
  sortOrder: 'desc',
  searchFilters: { query: '', fileTypes: [], statuses: [], exportTypes: [], tags: [] },
  storageStats: {
    totalUsed: 0, totalLimit: 5368709120, byType: { docx: 0, pdf: 0, image: 0, text: 0, xlsx: 0, folder: 0, unknown: 0 },
    byStatus: { draft: 0, temporary: 0, under_review: 0, revision: 0, approved: 0, final: 0, archived: 0, shared_with_client: 0 },
    recentExports: 0, totalRevisions: 0, cloudSynced: 0,
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
  | { type: 'TOGGLE_FILE_SELECTION'; payload: string }
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
  | { type: 'ADD_UPLOAD'; payload: UploadItem }
  | { type: 'UPDATE_UPLOAD'; payload: Partial<UploadItem> & { id: string } }
  | { type: 'SET_BREADCRUMBS'; payload: { id: string; name: string }[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILES'; payload: DMSFile[] }
  | { type: 'SET_FILES_AND_FOLDERS'; payload: { files: DMSFile[]; folders: DMSFolder[] } };

// ─── Reducer ───────────────────────────────────────────────────
function dmsReducer(state: DMSState, action: DMSAction): DMSState {
  switch (action.type) {
    case 'SET_CURRENT_FOLDER': return { ...state, currentFolderId: action.payload, selectedFiles: [] };
    case 'SET_VIEW_MODE': return { ...state, viewMode: action.payload };
    case 'SET_SORT': return { ...state, sortField: action.payload.field, sortOrder: action.payload.order };
    case 'SET_SEARCH_FILTERS': return { ...state, searchFilters: { ...state.searchFilters, ...action.payload } };
    case 'SELECT_FILE': return { ...state, selectedFiles: [...new Set([...state.selectedFiles, action.payload])] };
    case 'DESELECT_FILE': return { ...state, selectedFiles: state.selectedFiles.filter(id => id !== action.payload) };
    case 'TOGGLE_FILE_SELECTION': 
      return { 
        ...state, 
        selectedFiles: state.selectedFiles.includes(action.payload)
          ? state.selectedFiles.filter(id => id !== action.payload)
          : [...state.selectedFiles, action.payload]
      };
    case 'SELECT_ALL_FILES': return { ...state, selectedFiles: action.payload };
    case 'CLEAR_SELECTION': return { ...state, selectedFiles: [] };
    case 'TOGGLE_FOLDER_EXPAND': return { ...state, folders: state.folders.map(f => f.id === action.payload ? { ...f, isExpanded: !f.isExpanded } : f) };
    case 'ADD_FILE': return { ...state, files: [action.payload, ...state.files] };
    case 'UPDATE_FILE': return { ...state, files: state.files.map(f => f.id === action.payload.id ? { ...f, ...action.payload } : f) };
    case 'DELETE_FILES': return { ...state, files: state.files.filter(f => !action.payload.includes(f.id)), selectedFiles: [] };
    case 'SET_LOADING': return { ...state, isLoading: action.payload };
    case 'SET_ERROR': return { ...state, error: action.payload };
    case 'SET_FILES': return { ...state, files: action.payload };
    case 'SET_FILES_AND_FOLDERS': return { ...state, files: action.payload.files, folders: action.payload.folders };
    default: return state;
  }
}

// ─── Context ───────────────────────────────────────────────────
interface DMSContextValue {
  state: DMSState;
  dispatch: React.Dispatch<DMSAction>;
  getFilesInFolder: (folderId: string | null) => DMSFile[];
  getFilteredFiles: () => DMSFile[];
  getFolder: (folderId: string) => DMSFolder | undefined;
  getTotalFilesCount: () => number;
  isGlobalMode: boolean;
  deleteFiles: (fileIds: string[]) => Promise<void>;
}

const DMSContext = createContext<DMSContextValue | null>(null);

interface DMSProviderProps {
  children: React.ReactNode;
  leadId?: string;
  inquiryNumber?: string;
  leadTitle?: string;
}

export const DMSProvider: React.FC<DMSProviderProps> = ({ children, leadId, inquiryNumber, leadTitle }) => {
  const [state, dispatch] = useReducer(dmsReducer, undefined, () =>
    createInitialState(leadId, inquiryNumber, leadTitle)
  );

  const isGlobalMode = !leadId;

  // ─── Breadcrumb Synchronization ──────────────────────────────
  useEffect(() => {
    if (!state.currentFolderId) {
      dispatch({ type: 'SET_BREADCRUMBS', payload: [] });
      return;
    }

    const crumbs: { id: string; name: string }[] = [];
    let currentId: string | null = state.currentFolderId;
    while (currentId) {
      const f = state.folders.find(fld => fld.id === currentId);
      if (!f) break;
      crumbs.unshift({ id: f.id, name: f.name });
      currentId = f.parentId;
    }
    dispatch({ type: 'SET_BREADCRUMBS', payload: crumbs });
  }, [state.currentFolderId, state.folders]);

  const getFilesInFolder = useCallback((folderId: string | null): DMSFile[] => {
    if (!folderId) return state.files;
    return state.files.filter(f => f.folderId === folderId);
  }, [state.files]);

  const getFilteredFiles = useCallback((): DMSFile[] => {
    const { query, fileTypes, statuses, exportTypes, tags, dateFrom, dateTo } = state.searchFilters;
    let files = query ? state.files : getFilesInFolder(state.currentFolderId);

    if (query) {
      const q = query.toLowerCase();
      files = files.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.tags.some(t => t.toLowerCase().includes(q)) ||
        f.metadata.clientName?.toLowerCase().includes(q) ||
        f.metadata.inquiryNumber?.toLowerCase().includes(q)
      );
    }
    if (fileTypes.length > 0) files = files.filter(f => fileTypes.includes(f.type));
    if (statuses.length > 0) files = files.filter(f => statuses.includes(f.status));
    if (exportTypes.length > 0) files = files.filter(f => f.exportType && exportTypes.includes(f.exportType));
    
    // Sort
    files = [...files].sort((a, b) => {
      let cmp = 0;
      switch (state.sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'date': cmp = a.createdAt.localeCompare(b.createdAt); break;
        case 'size': cmp = a.size - b.size; break;
      }
      return state.sortOrder === 'asc' ? cmp : -cmp;
    });

    return files;
  }, [state, getFilesInFolder]);

  const getFolder = useCallback((folderId: string) => state.folders.find(f => f.id === folderId), [state.folders]);
  const getTotalFilesCount = useCallback(() => state.files.length, [state.files]);

  const deleteFiles = useCallback(async (fileIds: string[]) => {
    dispatch({ type: 'DELETE_FILES', payload: fileIds });
  }, []);

  const value = useMemo(() => ({
    state, dispatch, getFilesInFolder, getFilteredFiles, getFolder, getTotalFilesCount, isGlobalMode, deleteFiles
  }), [state, getFilesInFolder, getFilteredFiles, getFolder, getTotalFilesCount, isGlobalMode, deleteFiles]);

  return (
    <DMSContext.Provider value={value}>
      {children}
    </DMSContext.Provider>
  );
};

export const useDMS = () => {
  const ctx = useContext(DMSContext);
  if (!ctx) throw new Error('useDMS must be used inside DMSProvider');
  return ctx;
};
