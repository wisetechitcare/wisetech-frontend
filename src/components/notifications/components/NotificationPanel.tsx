import {
  forwardRef,
  useMemo,
  useState,
  type KeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { KTIcon } from '@metronic/helpers';
import type { AppNotification, NotificationFilterState } from '../types';
import { useNotificationCenter } from '../NotificationProvider';
import { applyFilters, buildRows } from '../utils';
import { NotificationFilters } from './NotificationFilters';
import { NotificationList } from './NotificationList';
import {
  NotificationEmpty,
  NotificationError,
  NotificationLoading,
} from './NotificationStates';

const INITIAL_FILTERS: NotificationFilterState = {
  search: '',
  readFilter: 'all',
  moduleKey: null,
};

/** The expanded notification center panel. */
export const NotificationPanel = forwardRef<HTMLDivElement>((_props, ref) => {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    close,
    markRead,
    markAllRead,
    dismiss,
    clearAll,
    refresh,
  } = useNotificationCenter();

  const navigate = useNavigate();
  const [filters, setFilters] = useState<NotificationFilterState>(INITIAL_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const patchFilters = (patch: Partial<NotificationFilterState>) =>
    setFilters((f) => ({ ...f, ...patch }));

  const isFiltering =
    filters.search.trim() !== '' ||
    filters.readFilter !== 'all' ||
    filters.moduleKey !== null;

  const filtered = useMemo(
    () => applyFilters(notifications, filters),
    [notifications, filters],
  );
  const rows = useMemo(() => buildRows(filtered), [filtered]);

  const handleActivate = (n: AppNotification) => {
    markRead(n.id);
    if (n.path) {
      close();
      navigate(n.path);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  };

  const resetFilters = () => setFilters(INITIAL_FILTERS);

  return (
    <div
      className="wt-panel"
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-label="Notification center"
      onKeyDown={onKeyDown}
    >
      {/* Slim single-row header: title + inline icon actions */}
      <div className="wt-panel__header">
        <span className="wt-panel__title">Notifications</span>
        {unreadCount > 0 && <span className="wt-panel__hcount">{unreadCount}</span>}
        <span className="wt-toolbar-spacer" />
        <button
          type="button"
          className="wt-iconbtn"
          title="Mark all read"
          aria-label="Mark all read"
          disabled={unreadCount === 0}
          onClick={markAllRead}
        >
          <KTIcon iconName="double-check" className="fs-4" />
        </button>
        <button
          type="button"
          className="wt-iconbtn wt-iconbtn--danger"
          title="Clear all"
          aria-label="Clear all"
          disabled={notifications.length === 0}
          onClick={clearAll}
        >
          <KTIcon iconName="trash" className="fs-5" />
        </button>
        <button
          type="button"
          className={`wt-iconbtn ${showFilters ? 'wt-iconbtn--active' : ''}`}
          title="Filter"
          aria-label="Toggle filters"
          aria-pressed={showFilters}
          onClick={() => setShowFilters((v) => !v)}
        >
          <KTIcon iconName="filter" className="fs-5" />
        </button>
        <button
          type="button"
          className="wt-iconbtn wt-iconbtn--collapse"
          title="Collapse"
          aria-label="Collapse notifications"
          onClick={close}
        >
          <KTIcon iconName="down" className="fs-3" />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <NotificationFilters filters={filters} onChange={patchFilters} />
      )}

      {/* Body */}
      {loading && notifications.length === 0 ? (
        <NotificationLoading />
      ) : error && notifications.length === 0 ? (
        <NotificationError onRetry={refresh} />
      ) : rows.length === 0 ? (
        <NotificationEmpty filtered={isFiltering} onReset={resetFilters} />
      ) : (
        <NotificationList
          rows={rows}
          onActivate={handleActivate}
          onDismiss={dismiss}
          onMarkRead={markRead}
        />
      )}
    </div>
  );
});

NotificationPanel.displayName = 'NotificationPanel';
