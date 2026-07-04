import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { getSocket } from '@utils/socketClient';
import {
  fetchNotificationsByEmployeeId,
  markAllAsRead as apiMarkAllAsRead,
  updateNotificationStatus,
} from '@services/employee';
import type { AppNotification, RawNotification } from './types';
import {
  extractRawList,
  isDemoEnabled,
  isImportant,
  loadPinnedIds,
  makeDemoNotifications,
  normalize,
  savePinnedIds,
  sortNotifications,
} from './utils';
import { SNACKBAR_AUTOHIDE_MS } from './constants';

// ── Reducer ──────────────────────────────────────────────────────────────────

interface State {
  items: AppNotification[];
  loading: boolean;
  error: boolean;
  pinnedIds: Set<string>;
}

type Action =
  | { type: 'LOADING' }
  | { type: 'ERROR' }
  | { type: 'SET'; raw: RawNotification[] }
  | { type: 'RECEIVE'; raw: RawNotification }
  | { type: 'MARK_READ'; id: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'DISMISS'; id: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'TOGGLE_PIN'; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: false };

    case 'ERROR':
      return { ...state, loading: false, error: true };

    case 'SET': {
      const fresh = action.raw.map((r) => normalize(r, state.pinnedIds));
      const freshIds = new Set(fresh.map((n) => n.id));
      // Preserve already-read items from this session so history survives a
      // refresh (the backend list endpoint returns unread rows only).
      const carriedRead = state.items.filter((n) => n.isRead && !freshIds.has(n.id));
      return {
        ...state,
        loading: false,
        error: false,
        items: sortNotifications([...fresh, ...carriedRead]),
      };
    }

    case 'RECEIVE': {
      if (state.items.some((n) => n.id === action.raw.id)) return state;
      const incoming = normalize(action.raw, state.pinnedIds);
      return { ...state, items: sortNotifications([incoming, ...state.items]) };
    }

    case 'MARK_READ':
      return {
        ...state,
        items: sortNotifications(
          state.items.map((n) => (n.id === action.id ? { ...n, isRead: true } : n)),
        ),
      };

    case 'MARK_ALL_READ':
      return {
        ...state,
        items: sortNotifications(state.items.map((n) => ({ ...n, isRead: true }))),
      };

    case 'DISMISS':
      return { ...state, items: state.items.filter((n) => n.id !== action.id) };

    case 'CLEAR_ALL':
      // Keep pinned items; clear the rest.
      return { ...state, items: state.items.filter((n) => n.pinned) };

    case 'TOGGLE_PIN': {
      const pinnedIds = new Set(state.pinnedIds);
      if (pinnedIds.has(action.id)) pinnedIds.delete(action.id);
      else pinnedIds.add(action.id);
      savePinnedIds(pinnedIds);
      return {
        ...state,
        pinnedIds,
        items: sortNotifications(
          state.items.map((n) =>
            n.id === action.id ? { ...n, pinned: pinnedIds.has(n.id) } : n,
          ),
        ),
      };
    }

    default:
      return state;
  }
}

// ── Context ──────────────────────────────────────────────────────────────────

export interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  /** Unread items at critical priority (for the collapsed summary hint). */
  criticalCount: number;
  loading: boolean;
  error: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  snackbarItem: AppNotification | null;
  /** The most urgent unread important notification (drives the resting pill). */
  topImportant: AppNotification | null;
  dismissSnackbar: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
  togglePin: (id: string) => void;
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotificationCenter(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotificationCenter must be used within a NotificationProvider');
  }
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: ReactNode }) {
  // The app's canonical employee id lives on the `employee` slice (same source
  // the notifications page + header bell use); fall back to the auth slice.
  const employeeId = useSelector(
    (s: RootState) =>
      s.employee?.currentEmployee?.id || s.auth?.currentUser?.id || '',
  );

  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    items: [],
    loading: false,
    error: false,
    pinnedIds: loadPinnedIds(),
  }));

  const [isOpen, setIsOpen] = useState(false);
  const [snackbarItem, setSnackbarItem] = useState<AppNotification | null>(null);
  const autohideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const clearAutohide = useCallback(() => {
    if (autohideRef.current) {
      clearTimeout(autohideRef.current);
      autohideRef.current = null;
    }
  }, []);

  const dismissSnackbar = useCallback(() => {
    clearAutohide();
    setSnackbarItem(null);
  }, [clearAutohide]);

  const refresh = useCallback(async () => {
    // Dev-only preview: `localStorage.wt_noti_demo = '1'` seeds sample data so
    // the UI can be exercised without a live backend push.
    if (import.meta.env.DEV && isDemoEnabled()) {
      dispatch({ type: 'SET', raw: makeDemoNotifications() });
      return;
    }
    if (!employeeId) return;
    dispatch({ type: 'LOADING' });
    try {
      const payload = await fetchNotificationsByEmployeeId(employeeId);
      dispatch({ type: 'SET', raw: extractRawList(payload) });
    } catch {
      dispatch({ type: 'ERROR' });
    }
  }, [employeeId]);

  // Initial load + reload when the user changes. In demo mode we load even
  // without an employeeId so the preview always works.
  useEffect(() => {
    if (!employeeId && !(import.meta.env.DEV && isDemoEnabled())) return;
    refresh();
  }, [employeeId, refresh]);

  // Realtime socket subscription.
  useEffect(() => {
    if (!employeeId) return;
    const socket = getSocket();

    const onNotification = (raw: RawNotification) => {
      dispatch({ type: 'RECEIVE', raw });
      const preview = normalize(raw, loadPinnedIds());
      // Only important notifications pop the snackbar; the rest live only in the
      // header bell. Preview shows only when the panel is closed.
      if (!isOpenRef.current && isImportant(preview)) {
        setSnackbarItem(preview);
        clearAutohide();
        // Critical / high priority stays until dismissed; others auto-hide.
        if (preview.priority !== 'critical' && preview.priority !== 'high') {
          autohideRef.current = setTimeout(() => setSnackbarItem(null), SNACKBAR_AUTOHIDE_MS);
        }
      }
    };

    socket.on('newNotification', onNotification);
    return () => {
      socket.off('newNotification', onNotification);
    };
  }, [employeeId, clearAutohide]);

  useEffect(() => clearAutohide, [clearAutohide]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const open = useCallback(() => {
    setIsOpen(true);
    dismissSnackbar();
  }, [dismissSnackbar]);

  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const markRead = useCallback(
    (id: string) => {
      dispatch({ type: 'MARK_READ', id });
      if (employeeId) updateNotificationStatus(employeeId, id, true).catch(() => {});
    },
    [employeeId],
  );

  const markAllRead = useCallback(() => {
    dispatch({ type: 'MARK_ALL_READ' });
    if (employeeId) apiMarkAllAsRead(employeeId).catch(() => {});
  }, [employeeId]);

  const dismiss = useCallback(
    (id: string) => {
      dispatch({ type: 'DISMISS', id });
      if (employeeId) updateNotificationStatus(employeeId, id, true).catch(() => {});
    },
    [employeeId],
  );

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
    if (employeeId) apiMarkAllAsRead(employeeId).catch(() => {});
  }, [employeeId]);

  const togglePin = useCallback((id: string) => dispatch({ type: 'TOGGLE_PIN', id }), []);

  // The floating center surfaces ONLY important notifications; everything else
  // remains in the header notification bell.
  const importantItems = useMemo(
    () => state.items.filter(isImportant),
    [state.items],
  );

  const unreadCount = useMemo(
    () => importantItems.reduce((acc, n) => (n.isRead ? acc : acc + 1), 0),
    [importantItems],
  );

  // Most urgent unread important item (list is already sorted by urgency).
  const topImportant = useMemo(
    () => importantItems.find((n) => !n.isRead) ?? null,
    [importantItems],
  );

  const criticalCount = useMemo(
    () => importantItems.reduce(
      (acc, n) => (!n.isRead && n.priority === 'critical' ? acc + 1 : acc),
      0,
    ),
    [importantItems],
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications: importantItems,
      unreadCount,
      criticalCount,
      topImportant,
      loading: state.loading,
      error: state.error,
      isOpen,
      open,
      close,
      toggle,
      snackbarItem,
      dismissSnackbar,
      markRead,
      markAllRead,
      dismiss,
      clearAll,
      togglePin,
      refresh,
    }),
    [
      importantItems, state.loading, state.error, unreadCount, criticalCount,
      topImportant, isOpen, open, close, toggle, snackbarItem, dismissSnackbar,
      markRead, markAllRead, dismiss, clearAll, togglePin, refresh,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
